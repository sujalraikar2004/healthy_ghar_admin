import { BusinessSettings, Coupon, Order, Product, Shipment } from '../types';

export function computePincodeZone(pincode?: string): Shipment['zone'] {
  const firstDigit = (pincode || '5').trim()[0] || '5';
  if (firstDigit === '1' || firstDigit === '4' || firstDigit === '5' || firstDigit === '6') {
    return 'Zone A (Metro)';
  }
  if (firstDigit === '7' || firstDigit === '8') {
    return 'Zone C (Remote)';
  }
  return 'Zone B (Tier-2)';
}

export function isDpcoOrRestrictedForCoupon(product: Product): boolean {
  return (
    product.dpcoCapped ||
    product.schedule === 'Schedule H1' ||
    product.schedule === 'Schedule X'
  );
}

export interface CouponValidationInput {
  couponCode?: string;
  customerId: string;
  items: { productId: string; quantity: number }[];
  products: Product[];
  orders: Order[];
  coupons: Coupon[];
  nowMs?: number;
}

export interface CouponValidationResult {
  valid: boolean;
  coupon?: Coupon;
  discountAmount: number;
  eligibleSubtotal: number;
  error?: string;
}

export function validateAndCalculateCoupon({
  couponCode,
  customerId,
  items,
  products,
  orders,
  coupons,
  nowMs = Date.now(),
}: CouponValidationInput): CouponValidationResult {
  const normalized = couponCode?.trim().toUpperCase();
  if (!normalized) {
    return { valid: true, discountAmount: 0, eligibleSubtotal: 0 };
  }

  const coupon = coupons.find((c) => c.code.toUpperCase() === normalized);
  if (!coupon) {
    return {
      valid: false,
      discountAmount: 0,
      eligibleSubtotal: 0,
      error: `Coupon "${normalized}" does not exist.`,
    };
  }
  if (!coupon.active) {
    return {
      valid: false,
      coupon,
      discountAmount: 0,
      eligibleSubtotal: 0,
      error: `Coupon "${coupon.code}" is currently paused.`,
    };
  }

  const startMs = Date.parse(coupon.startDate);
  const expiryMs = Date.parse(coupon.expiryDate);
  if (!Number.isNaN(startMs) && nowMs < startMs) {
    return {
      valid: false,
      coupon,
      discountAmount: 0,
      eligibleSubtotal: 0,
      error: `Coupon "${coupon.code}" is not active yet.`,
    };
  }
  if (!Number.isNaN(expiryMs) && nowMs > expiryMs) {
    return {
      valid: false,
      coupon,
      discountAmount: 0,
      eligibleSubtotal: 0,
      error: `Coupon "${coupon.code}" has expired.`,
    };
  }

  if (coupon.usedCount >= coupon.usageLimit) {
    return {
      valid: false,
      coupon,
      discountAmount: 0,
      eligibleSubtotal: 0,
      error: `Coupon "${coupon.code}" has reached its global redemption limit.`,
    };
  }

  const customerRedemptions = orders.filter(
    (o) =>
      o.customerId === customerId &&
      o.status !== 'Cancelled' &&
      o.couponCode?.toUpperCase() === coupon.code.toUpperCase()
  ).length;

  if (customerRedemptions >= coupon.perCustomerLimit) {
    return {
      valid: false,
      coupon,
      discountAmount: 0,
      eligibleSubtotal: 0,
      error: `Customer has already used "${coupon.code}" ${customerRedemptions}/${coupon.perCustomerLimit} times.`,
    };
  }

  let cartSubtotal = 0;
  let eligibleSubtotal = 0;
  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product || item.quantity <= 0) continue;
    const lineTotal = product.sellingPrice * item.quantity;
    cartSubtotal += lineTotal;

    if (coupon.excludeDpcoScheduled && isDpcoOrRestrictedForCoupon(product)) {
      continue;
    }
    if (coupon.categoryIds && coupon.categoryIds.length > 0) {
      const catMatch =
        coupon.categoryIds.includes(product.categoryId) ||
        (product.subcategoryId ? coupon.categoryIds.includes(product.subcategoryId) : false);
      if (!catMatch) continue;
    }
    eligibleSubtotal += lineTotal;
  }

  if (cartSubtotal < coupon.minOrderAmount) {
    return {
      valid: false,
      coupon,
      discountAmount: 0,
      eligibleSubtotal,
      error: `Coupon "${coupon.code}" requires a minimum cart subtotal of ₹${coupon.minOrderAmount}.`,
    };
  }

  if (eligibleSubtotal <= 0) {
    return {
      valid: false,
      coupon,
      discountAmount: 0,
      eligibleSubtotal: 0,
      error: `No items in cart qualify for "${coupon.code}" (DPCO / Schedule H1/X or category restriction).`,
    };
  }

  const rawDiscount =
    coupon.discountType === 'Percentage'
      ? Math.min(coupon.maxDiscountAmount, Math.round((eligibleSubtotal * coupon.discountValue) / 100))
      : Math.min(coupon.discountValue, eligibleSubtotal);

  return {
    valid: true,
    coupon,
    discountAmount: Math.max(0, rawDiscount),
    eligibleSubtotal,
  };
}

export interface OrderTotalsInput {
  items: { productId: string; quantity: number }[];
  products: Product[];
  settings: BusinessSettings;
  discountAmount: number;
}

export interface OrderTotalsResult {
  subtotal: number;
  taxAmount: number;
  coldChainRequired: boolean;
  shippingFee: number;
  totalAmount: number;
}

export function calculateOrderTotals({
  items,
  products,
  settings,
  discountAmount,
}: OrderTotalsInput): OrderTotalsResult {
  let subtotal = 0;
  let rawTax = 0;
  let coldChainRequired = false;

  for (const item of items) {
    const prod = products.find((p) => p.id === item.productId);
    if (!prod || item.quantity <= 0) continue;
    const lineTotal = prod.sellingPrice * item.quantity;
    subtotal += lineTotal;
    rawTax += (lineTotal * prod.gstRate) / (100 + prod.gstRate);
    if (prod.storageCondition === 'Cold Chain (2-8°C)') {
      coldChainRequired = true;
    }
  }

  const taxAmount = Math.round(rawTax);
  const baseShipping = subtotal === 0 || subtotal >= settings.freeDeliveryThreshold ? 0 : settings.standardShippingFee;
  const shippingFee = subtotal === 0 ? 0 : baseShipping + (coldChainRequired ? settings.coldChainSurcharge : 0);
  const totalAmount = Math.max(0, subtotal - discountAmount + shippingFee);

  return {
    subtotal,
    taxAmount,
    coldChainRequired,
    shippingFee,
    totalAmount,
  };
}
