import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';
import { Order } from '../../types';
import { formatINR } from '../../utils/formatters';
import { calculateOrderTotals, validateAndCalculateCoupon } from '../../utils/calculations';

interface QuickOrderModalProps {
  open: boolean;
  onClose: () => void;
}

export function QuickOrderModal({ open, onClose }: QuickOrderModalProps) {
  const navigate = useNavigate();
  const customers = usePharmacyStore((s) => s.customers);
  const warehouses = usePharmacyStore((s) => s.warehouses);
  const products = usePharmacyStore((s) => s.products);
  const inventory = usePharmacyStore((s) => s.inventory);
  const orders = usePharmacyStore((s) => s.orders);
  const coupons = usePharmacyStore((s) => s.coupons);
  const settings = usePharmacyStore((s) => s.settings);
  const createOrder = usePharmacyStore((s) => s.createOrder);
  const pushToast = useToastStore((s) => s.pushToast);

  const activeCustomers = useMemo(() => customers.filter((c) => c.status === 'Active'), [customers]);
  const activeWarehouses = useMemo(() => warehouses.filter((w) => w.status === 'Active'), [warehouses]);
  const activeProducts = useMemo(() => products.filter((p) => p.status === 'Active'), [products]);

  const [customerId, setCustomerId] = useState(activeCustomers[0]?.id || '');
  const [warehouseId, setWarehouseId] = useState(activeWarehouses[0]?.id || 'WH-BLR-01');
  const [paymentMethod, setPaymentMethod] = useState<Order['paymentMethod']>('UPI');
  const [couponCode, setCouponCode] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ productId: string; quantity: number }[]>([
    { productId: activeProducts[0]?.id || 'PRD-001', quantity: 1 },
  ]);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setErrorMsg('');
      if (!customerId && activeCustomers[0]?.id) setCustomerId(activeCustomers[0].id);
      if (!warehouseId && activeWarehouses[0]?.id) setWarehouseId(activeWarehouses[0].id);
    }
  }, [open, customerId, warehouseId, activeCustomers, activeWarehouses]);

  const couponEval = useMemo(
    () =>
      validateAndCalculateCoupon({
        couponCode: couponCode || undefined,
        customerId,
        items: selectedItems,
        products,
        orders,
        coupons,
      }),
    [couponCode, customerId, selectedItems, products, orders, coupons]
  );

  const totals = useMemo(
    () =>
      calculateOrderTotals({
        items: selectedItems,
        products,
        settings,
        discountAmount: couponEval.valid ? couponEval.discountAmount : 0,
      }),
    [selectedItems, products, settings, couponEval]
  );

  if (!open) return null;

  const getAvailAtHub = (productId: string) =>
    inventory
      .filter((i) => i.productId === productId && i.warehouseId === warehouseId)
      .reduce((s, i) => s + i.availableQty, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg('');
    if (couponCode && !couponEval.valid) {
      setErrorMsg(couponEval.error || 'Selected coupon is not eligible for this order.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = createOrder({
        customerId,
        warehouseId,
        paymentMethod,
        couponCode: couponCode || undefined,
        items: selectedItems,
        notes,
      });
      if (!res.ok) {
        setErrorMsg(res.message);
        return;
      }
      pushToast({
        type: 'success',
        title: `Order ${res.data?.orderNumber} Created`,
        description: res.data?.prescriptionRequired
          ? 'FEFO stock reserved. Linked Rx queued for Pharmacist verification.'
          : 'FEFO stock reserved and payment logged in Demo Mode.',
      });
      onClose();
      if (res.data) {
        navigate(`/orders/${res.data.id}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[85] bg-on-surface/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-outline-variant/40">
        <div className="px-6 py-4 border-b border-outline-variant/30 flex items-center justify-between">
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Create Manual / Assisted Order</h2>
            <p className="font-body-sm text-on-surface-variant">Allocates earliest valid FEFO batch & reserves stock atomically</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-container">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-error-container text-on-error-container font-body-sm">{errorMsg}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-label-md text-on-surface mb-1">Patient / Customer</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface font-body-md"
              >
                {activeCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.city})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-label-md text-on-surface mb-1">Fulfillment Hub</label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface font-body-md"
              >
                {activeWarehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} — {w.city}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-label-md text-on-surface">Order Line Items (FEFO Checked)</label>
              <button
                type="button"
                onClick={() =>
                  setSelectedItems((prev) => [
                    ...prev,
                    { productId: activeProducts[prev.length % activeProducts.length]?.id || '', quantity: 1 },
                  ])
                }
                className="font-label-md text-primary hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">add</span> Add SKU
              </button>
            </div>
            {selectedItems.map((line, idx) => {
              const avail = getAvailAtHub(line.productId);
              return (
                <div key={idx} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center bg-surface-container-low p-2.5 rounded-xl">
                  <select
                    value={line.productId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedItems((prev) => prev.map((it, i) => (i === idx ? { ...it, productId: val } : it)));
                    }}
                    className="flex-1 min-w-0 w-full h-9 px-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant text-body-sm text-on-surface"
                  >
                    {activeProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatINR(p.sellingPrice)}) • {p.schedule}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <span className={`font-label-sm px-2 py-0.5 rounded-full ${avail > 0 ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-error-container text-on-error-container'}`}>
                      Hub Stock: {avail}
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, avail)}
                      value={line.quantity}
                      onChange={(e) => {
                        const qty = Math.max(1, Math.floor(Number(e.target.value) || 1));
                        setSelectedItems((prev) => prev.map((it, i) => (i === idx ? { ...it, quantity: qty } : it)));
                      }}
                      className="w-20 h-9 px-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant text-body-sm text-on-surface"
                    />
                    {selectedItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSelectedItems((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1 text-error hover:bg-error-container/50 rounded"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-label-md text-on-surface mb-1">Payment Mode (Demo)</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as Order['paymentMethod'])}
                className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface font-body-md"
              >
                {(['UPI', 'Card', 'Net Banking', 'Wallet', 'COD'] as const).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-label-md text-on-surface mb-1">Apply Promo Coupon</label>
              <select
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface font-body-md"
              >
                <option value="">None</option>
                {coupons.filter((c) => c.active).map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.code} — {c.title} (Min {formatINR(c.minOrderAmount)})
                  </option>
                ))}
              </select>
              {couponCode && !couponEval.valid && (
                <p className="font-label-sm text-error mt-1">{couponEval.error}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block font-label-md text-on-surface mb-1">Dispatch / Clinical Note</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional delivery instructions or pharmacist note..."
              className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface font-body-md"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container space-y-1.5 text-body-sm">
            <div className="flex items-center justify-between text-on-surface-variant">
              <span>Subtotal (Incl. {formatINR(totals.taxAmount)} GST)</span>
              <span className="tabular-nums">{formatINR(totals.subtotal)}</span>
            </div>
            {couponEval.valid && couponEval.discountAmount > 0 && (
              <div className="flex items-center justify-between text-primary">
                <span>Promo Discount ({couponEval.coupon?.code})</span>
                <span className="tabular-nums">-{formatINR(couponEval.discountAmount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-on-surface-variant">
              <span>
                Delivery Fee{totals.coldChainRequired ? ' (Incl. 2–8°C Cold Chain)' : ''}
              </span>
              <span className="tabular-nums">{totals.shippingFee === 0 ? 'Free' : formatINR(totals.shippingFee)}</span>
            </div>
            <div className="flex items-center justify-between pt-1.5 border-t border-outline-variant/40">
              <span className="font-title-md text-on-surface">Grand Payable Total</span>
              <span className="font-headline-sm text-primary tabular-nums">{formatINR(totals.totalAmount)}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-surface-container text-on-surface font-title-md text-body-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-primary-container text-on-primary font-title-md text-body-md hover:bg-primary transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Reserving FEFO Stock...' : 'Place Order & Reserve FEFO Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
