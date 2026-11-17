import {
  SEED_BATCHES,
  SEED_BRANDS,
  SEED_CATEGORIES,
  SEED_CUSTOMER_GROUPS,
  SEED_DELIVERY_PARTNERS,
  SEED_PRODUCTS,
  SEED_SETTINGS,
  SEED_STAFF,
  SEED_WAREHOUSES,
  deriveInventoryFromBatches,
} from './seedCatalog';
import {
  SEED_ACTIVITY_LOGS,
  SEED_BANNERS,
  SEED_CAMPAIGNS,
  SEED_CONSULTATIONS,
  SEED_COUPONS,
  SEED_CUSTOMERS,
  SEED_DOCTORS,
  SEED_GOODS_RECEIPTS,
  SEED_NOTIFICATIONS,
  SEED_NOTIFICATION_TEMPLATES,
  SEED_ORDERS,
  SEED_PAYMENTS,
  SEED_PRESCRIPTIONS,
  SEED_PURCHASE_ORDERS,
  SEED_REFUNDS,
  SEED_RETURNS,
  SEED_REVIEWS,
  SEED_SHIPMENTS,
  SEED_STOCK_MOVEMENTS,
  SEED_SUPPLIERS,
  SEED_TICKETS,
  SEED_TRANSFERS,
} from './seedOperations';
import { INITIAL_ROLES } from '../utils/permissions';

export function buildInitialSeedState() {
  const nowMs = Date.now();
  // 1. Auto-quarantine any expired batches if setting is enabled & ensure reservedQty covers Reserved seed orders
  const reservedByBatch = new Map<string, number>();
  for (const ord of SEED_ORDERS) {
    if (ord.inventoryState !== 'Reserved') continue;
    for (const item of ord.items) {
      const allocs = item.batchAllocations?.length
        ? item.batchAllocations
        : item.batchId
        ? [{ batchId: item.batchId, quantity: item.quantity }]
        : [];
      for (const al of allocs) {
        reservedByBatch.set(al.batchId, (reservedByBatch.get(al.batchId) || 0) + al.quantity);
      }
    }
  }

  const batches = SEED_BATCHES.map((b) => {
    const isExpired = new Date(b.expiryDate).getTime() <= nowMs;
    const minReserved = reservedByBatch.get(b.id) || 0;
    const reservedQty = Math.max(b.reservedQty, minReserved);
    if (SEED_SETTINGS.autoQuarantineExpiredBatches && isExpired && b.status !== 'Quarantined') {
      return {
        ...b,
        status: 'Quarantined' as const,
        damagedQty: b.damagedQty + b.availableQty,
        availableQty: 0,
        reservedQty,
        quarantineReason: b.quarantineReason || 'Auto-quarantined on expiry under Rule 65',
        rackLocation: 'QUARANTINE-BAY-01',
      };
    }
    return { ...b, reservedQty };
  });

  // 2. Reconcile customer metrics strictly from non-cancelled orders
  const customers = SEED_CUSTOMERS.map((cust) => {
    const custOrders = SEED_ORDERS.filter((o) => o.customerId === cust.id && o.status !== 'Cancelled');
    const orderCount = custOrders.length;
    const totalSpent = custOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const lastOrderAt = custOrders
      .map((o) => o.createdAt)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
    return {
      ...cust,
      orderCount,
      totalSpent,
      lastOrderAt: lastOrderAt || cust.lastOrderAt,
    };
  });

  // 3. Reconcile delivery partner activeShipments strictly from active shipments
  const deliveryPartners = SEED_DELIVERY_PARTNERS.map((dp) => ({
    ...dp,
    activeShipments: SEED_SHIPMENTS.filter((sh) => sh.partnerId === dp.id && sh.status !== 'Delivered').length,
  }));

  // 4. Reconcile supplier suppliedProductIds from batches & POs
  const suppliers = SEED_SUPPLIERS.map((sup) => {
    const fromBatches = batches.filter((b) => b.supplierId === sup.id).map((b) => b.productId);
    const fromPOs = SEED_PURCHASE_ORDERS.filter((po) => po.supplierId === sup.id).flatMap((po) =>
      po.items.map((it) => it.productId)
    );
    return {
      ...sup,
      suppliedProductIds: Array.from(new Set([...sup.suppliedProductIds, ...fromBatches, ...fromPOs])),
    };
  });

  return {
    roles: INITIAL_ROLES,
    staff: SEED_STAFF,
    warehouses: SEED_WAREHOUSES,
    categories: SEED_CATEGORIES,
    brands: SEED_BRANDS,
    products: SEED_PRODUCTS,
    batches,
    inventory: deriveInventoryFromBatches(SEED_PRODUCTS, batches),
    stockMovements: SEED_STOCK_MOVEMENTS,
    transfers: SEED_TRANSFERS,
    suppliers,
    purchaseOrders: SEED_PURCHASE_ORDERS,
    goodsReceipts: SEED_GOODS_RECEIPTS,
    customerGroups: SEED_CUSTOMER_GROUPS,
    customers,
    orders: SEED_ORDERS,
    prescriptions: SEED_PRESCRIPTIONS,
    payments: SEED_PAYMENTS,
    refunds: SEED_REFUNDS,
    returns: SEED_RETURNS,
    deliveryPartners,
    shipments: SEED_SHIPMENTS,
    doctors: SEED_DOCTORS,
    consultations: SEED_CONSULTATIONS,
    coupons: SEED_COUPONS,
    campaigns: SEED_CAMPAIGNS,
    banners: SEED_BANNERS,
    reviews: SEED_REVIEWS,
    tickets: SEED_TICKETS,
    notifications: SEED_NOTIFICATIONS,
    notificationTemplates: SEED_NOTIFICATION_TEMPLATES,
    activityLogs: SEED_ACTIVITY_LOGS,
    settings: SEED_SETTINGS,
  };
}
