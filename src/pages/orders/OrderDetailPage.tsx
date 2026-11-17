import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';
import { OrderStatus } from '../../types';
import { formatIndianDate, formatIndianDateTime, formatINR, maskPhone } from '../../utils/formatters';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

const FULFILLMENT_STAGES: OrderStatus[] = [
  'Placed',
  'Confirmed',
  'Processing',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
];

const NEXT_STAGE_MAP: Partial<Record<OrderStatus, OrderStatus>> = {
  Placed: 'Confirmed',
  Confirmed: 'Processing',
  Processing: 'Packed',
  Packed: 'Shipped',
  Shipped: 'Out for Delivery',
  'Out for Delivery': 'Delivered',
};

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const pushToast = useToastStore((s) => s.pushToast);

  const orders = usePharmacyStore((s) => s.orders);
  const customers = usePharmacyStore((s) => s.customers);
  const warehouses = usePharmacyStore((s) => s.warehouses);
  const prescriptions = usePharmacyStore((s) => s.prescriptions);
  const payments = usePharmacyStore((s) => s.payments);
  const settings = usePharmacyStore((s) => s.settings);
  const transitionOrderStatus = usePharmacyStore((s) => s.transitionOrderStatus);
  const can = usePharmacyStore((s) => s.can);

  const [activeTab, setActiveTab] = useState<'overview' | 'invoice' | 'packing' | 'timeline'>('overview');
  const [pendingTransition, setPendingTransition] = useState<{
    nextStatus: OrderStatus;
    requireReason: boolean;
    variant: 'primary' | 'danger' | 'warning';
  } | null>(null);

  const order = useMemo(() => orders.find((o) => o.id === id), [orders, id]);
  const customer = useMemo(() => customers.find((c) => c.id === order?.customerId), [customers, order]);
  const warehouse = useMemo(() => warehouses.find((w) => w.id === order?.warehouseId), [warehouses, order]);
  const rx = useMemo(
    () => prescriptions.find((r) => r.id === order?.prescriptionId || r.orderId === order?.id),
    [prescriptions, order]
  );
  const payment = useMemo(() => payments.find((p) => p.orderId === order?.id), [payments, order]);

  if (!order) {
    return (
      <div className="p-space-xl text-center space-y-4">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant">receipt_long</span>
        <h2 className="font-headline-md text-on-surface">Order Record Not Found</h2>
        <button
          type="button"
          onClick={() => navigate('/orders')}
          className="px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  const currentStageIdx = FULFILLMENT_STAGES.indexOf(order.status);
  const nextStage = NEXT_STAGE_MAP[order.status];
  const canCancel = ['Placed', 'Confirmed', 'Processing', 'Packed'].includes(order.status);
  const rxBlocked =
    settings.blockOrderDispatchWithoutRxApproval &&
    order.prescriptionRequired &&
    order.prescriptionStatus !== 'Approved';

  const unmaskedPhone = can('customers', 'edit') || can('orders', 'manage');

  const handleConfirmTransition = (reason: string) => {
    if (!pendingTransition) return;
    const res = transitionOrderStatus(order.id, pendingTransition.nextStatus, reason);
    setPendingTransition(null);
    if (!res.ok) {
      pushToast({ type: 'error', title: 'Transition Blocked', description: res.message });
      return;
    }
    pushToast({ type: 'success', title: 'Order Updated', description: res.message });
  };

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 no-print">
        <div>
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="flex items-center gap-1 font-label-md text-primary hover:underline mb-1"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Back to Order Queue</span>
          </button>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-headline-lg text-headline-lg text-on-surface">{order.orderNumber}</h1>
            <span className="px-2.5 py-1 rounded-md bg-primary-fixed text-on-primary-fixed font-label-sm">
              {order.status}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-surface-container text-on-surface-variant font-label-sm">
              Stock: {order.inventoryState}
            </span>
            {order.prescriptionRequired && (
              <span
                className={`px-2.5 py-1 rounded-md font-label-sm ${
                  order.prescriptionStatus === 'Approved'
                    ? 'bg-primary-container text-on-primary'
                    : 'bg-tertiary-fixed text-on-tertiary-fixed'
                }`}
              >
                Rx: {order.prescriptionStatus}
              </span>
            )}
          </div>
          <p className="font-body-sm text-on-surface-variant mt-0.5">
            Placed {formatIndianDateTime(order.createdAt)} • Dispatch Hub: {warehouse?.name || order.warehouseId}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {rx && (
            <button
              type="button"
              onClick={() => navigate(`/prescriptions/${rx.id}`)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed font-title-md text-body-sm hover:opacity-90"
            >
              <span className="material-symbols-outlined text-[18px]">clinical_notes</span>
              <span>Inspect Rx ({rx.rxNumber})</span>
            </button>
          )}
          {can('orders', 'edit') && nextStage && (
            <button
              type="button"
              onClick={() =>
                setPendingTransition({
                  nextStatus: nextStage,
                  requireReason: false,
                  variant: 'primary',
                })
              }
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md text-body-sm hover:bg-primary"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              <span>Advance to {nextStage}</span>
            </button>
          )}
          {can('orders', 'edit') && canCancel && (
            <button
              type="button"
              onClick={() =>
                setPendingTransition({
                  nextStatus: 'Cancelled',
                  requireReason: true,
                  variant: 'danger',
                })
              }
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-error-container text-on-error-container font-title-md text-body-sm hover:opacity-90"
            >
              <span className="material-symbols-outlined text-[18px]">cancel</span>
              <span>Cancel Order</span>
            </button>
          )}
        </div>
      </div>

      {/* Rx Clinical Gate Banner */}
      {rxBlocked && order.status !== 'Cancelled' && (
        <div className="no-print p-4 rounded-xl bg-tertiary-fixed/70 border border-tertiary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-tertiary">verified_user</span>
            <div>
              <h3 className="font-title-md text-on-tertiary-fixed">Schedule H / Clinical Gate Active</h3>
              <p className="font-body-sm text-on-tertiary-fixed/90">
                Order cannot advance to Packed or Shipped until a licensed Pharmacist approves prescription{' '}
                <strong>{rx?.rxNumber || 'pending upload'}</strong>.
              </p>
            </div>
          </div>
          {rx && (
            <button
              type="button"
              onClick={() => navigate(`/prescriptions/${rx.id}`)}
              className="px-3.5 py-1.5 rounded-lg bg-tertiary text-on-tertiary font-label-md shrink-0"
            >
              Open Pharmacist Desk
            </button>
          )}
        </div>
      )}

      {/* 7-Stage Fulfillment Stepper */}
      <div className="no-print bg-surface-container-lowest p-5 rounded-xl shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-title-md text-on-surface">7-Stage Fulfillment Pipeline</h2>
          {order.trackingNumber && (
            <span className="font-label-md text-primary bg-primary-fixed px-2.5 py-0.5 rounded-md">
              AWB: {order.trackingNumber}
            </span>
          )}
        </div>
        {order.status === 'Cancelled' ? (
          <div className="p-3 rounded-lg bg-error-container text-on-error-container font-body-md flex items-center gap-2">
            <span className="material-symbols-outlined">cancel</span>
            <span>Order Cancelled — FEFO reserved stock released back to hub inventory.</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {FULFILLMENT_STAGES.map((stage, idx) => {
              const completed = currentStageIdx >= idx;
              const isCurrent = currentStageIdx === idx;
              return (
                <div
                  key={stage}
                  className={`p-3 rounded-xl border transition-colors ${
                    isCurrent
                      ? 'bg-primary-fixed border-primary text-on-primary-fixed'
                      : completed
                      ? 'bg-primary-container/10 border-primary/30 text-primary'
                      : 'bg-surface-container-low border-transparent text-on-surface-variant'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-label-sm">Stage {idx + 1}</span>
                    <span className="material-symbols-outlined text-[16px]">
                      {completed ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                  </div>
                  <div className="font-title-md text-body-sm">{stage}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="no-print flex items-center gap-2 border-b border-outline-variant/40 overflow-x-auto custom-scrollbar">
        {(
          [
            { id: 'overview', label: 'Overview & Items', icon: 'medication' },
            { id: 'invoice', label: 'GST Tax Invoice', icon: 'receipt_long' },
            { id: 'packing', label: 'Warehouse Packing Slip', icon: 'inventory_2' },
            { id: 'timeline', label: 'Audit Timeline', icon: 'history' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 font-title-md text-body-sm border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
          <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-outline-variant/30 flex items-center justify-between">
              <h3 className="font-title-lg text-on-surface">Medicine Line Items (FEFO Batch Allocated)</h3>
              <span className="font-label-sm text-on-surface-variant">{order.items.length} SKU(s)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low font-label-sm text-on-surface-variant uppercase">
                    <th className="py-2.5 px-4">Medicine & HSN</th>
                    <th className="py-2.5 px-4">Batch #</th>
                    <th className="py-2.5 px-4 text-right">Qty</th>
                    <th className="py-2.5 px-4 text-right">Unit Price</th>
                    <th className="py-2.5 px-4 text-right">GST</th>
                    <th className="py-2.5 px-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30 font-body-sm">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 px-4">
                        <div className="font-title-md text-on-surface">{item.productName}</div>
                        <div className="text-[11px] text-on-surface-variant">
                          SKU: {item.sku} • HSN: {item.hsnCode} {item.prescriptionRequired ? '• Rx Required' : '• OTC'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-surface-container font-label-sm text-on-surface">
                          {item.batchNumber || 'FEFO-AUTO'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">{item.quantity}</td>
                      <td className="py-3 px-4 text-right tabular-nums">{formatINR(item.unitPrice)}</td>
                      <td className="py-3 px-4 text-right tabular-nums">{item.gstRate}%</td>
                      <td className="py-3 px-4 text-right font-title-md tabular-nums">{formatINR(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-surface-container-low/50 border-t border-outline-variant/30 flex flex-col items-end space-y-1 font-body-sm">
              <div className="flex justify-between w-full sm:w-64">
                <span className="text-on-surface-variant">Subtotal (Incl. GST)</span>
                <span className="tabular-nums">{formatINR(order.subtotal)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between w-full sm:w-64 text-primary">
                  <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
                  <span className="tabular-nums">-{formatINR(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between w-full sm:w-64">
                <span className="text-on-surface-variant">GST Component</span>
                <span className="tabular-nums">{formatINR(order.taxAmount)}</span>
              </div>
              <div className="flex justify-between w-full sm:w-64">
                <span className="text-on-surface-variant">Delivery Fee</span>
                <span className="tabular-nums">{order.shippingFee === 0 ? 'Free' : formatINR(order.shippingFee)}</span>
              </div>
              <div className="flex justify-between w-full sm:w-64 pt-1.5 border-t border-outline-variant font-title-lg text-on-surface">
                <span>Grand Total</span>
                <span className="tabular-nums text-primary">{formatINR(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-space-md">
            <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm space-y-2">
              <h3 className="font-title-md text-on-surface">Patient & Shipping Address</h3>
              <p className="font-title-md text-primary">{customer?.name || order.shippingAddress.recipientName}</p>
              <p className="font-body-sm text-on-surface-variant">
                {maskPhone(order.shippingAddress.phone, unmaskedPhone)}
              </p>
              <p className="font-body-sm text-on-surface">
                {order.shippingAddress.line1}
                {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}
                <br />
                {order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.pincode}
              </p>
              {customer && (
                <button
                  type="button"
                  onClick={() => navigate('/customers')}
                  className="text-primary font-label-md hover:underline"
                >
                  View Patient Health Dossier →
                </button>
              )}
            </div>

            <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm space-y-2">
              <h3 className="font-title-md text-on-surface">Payment Reconciliation</h3>
              <div className="flex justify-between font-body-sm">
                <span className="text-on-surface-variant">Mode</span>
                <span className="font-title-md">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between font-body-sm">
                <span className="text-on-surface-variant">Status</span>
                <span className="font-title-md text-primary">{order.paymentStatus}</span>
              </div>
              {payment && (
                <div className="flex justify-between font-body-sm">
                  <span className="text-on-surface-variant">Txn Ref (Demo)</span>
                  <span className="font-label-sm">{payment.transactionId}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => navigate('/payments')}
                className="text-primary font-label-md hover:underline"
              >
                Open Payments & Refunds Ledger →
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'invoice' && (
        <div className="space-y-3">
          <div className="no-print flex justify-end">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md text-body-sm"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              <span>Print GST Tax Invoice</span>
            </button>
          </div>
          <div className="bg-white text-slate-900 p-4 sm:p-8 rounded-xl shadow-sm border border-slate-200 max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-3 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-bold text-teal-800">{settings.pharmacyName}</h2>
                <p className="text-xs text-slate-600">{settings.legalEntityName}</p>
                <p className="text-xs text-slate-600 mt-1">{settings.registeredAddress}</p>
                <p className="text-xs text-slate-700 font-medium mt-1">
                  GSTIN: {settings.gstin} • DL 20B: {settings.drugLicenseNumber20B} • DL 21B: {settings.drugLicenseNumber21B}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-sm font-bold uppercase tracking-wider text-slate-800">Tax Invoice</div>
                <div className="text-xs text-slate-600 mt-1">Invoice #: INV-{order.orderNumber}</div>
                <div className="text-xs text-slate-600">Date: {formatIndianDate(order.createdAt)}</div>
                <div className="text-xs text-slate-600">Dispatch Hub: {warehouse?.code} ({warehouse?.gstin})</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs">
              <div>
                <div className="font-bold text-slate-700 uppercase mb-1">Billed & Shipped To</div>
                <div className="font-semibold">{customer?.name || order.shippingAddress.recipientName}</div>
                <div>{order.shippingAddress.line1}</div>
                <div>
                  {order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.pincode}
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="font-bold text-slate-700 uppercase mb-1">Statutory Declaration</div>
                <div>Payment Mode: {order.paymentMethod} ({order.paymentStatus})</div>
                <div>Rx Compliance: {order.prescriptionRequired ? `${order.prescriptionStatus} (${rx?.rxNumber || 'Verified'})` : 'OTC Supply'}</div>
              </div>
            </div>

            <div className="overflow-x-auto my-4 custom-scrollbar">
              <table className="w-full min-w-[580px] text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-600 uppercase">
                    <th className="py-2 pr-2">Description / SKU</th>
                    <th className="py-2 px-2">HSN</th>
                    <th className="py-2 px-2">Batch #</th>
                    <th className="py-2 px-2 text-right">Qty</th>
                    <th className="py-2 px-2 text-right">MRP</th>
                    <th className="py-2 px-2 text-right">Rate</th>
                    <th className="py-2 px-2 text-right">CGST+SGST</th>
                    <th className="py-2 pl-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2 pr-2 font-medium">{item.productName}</td>
                      <td className="py-2 px-2">{item.hsnCode}</td>
                      <td className="py-2 px-2">{item.batchNumber || 'FEFO'}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{item.quantity}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{formatINR(item.mrp)}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{formatINR(item.unitPrice)}</td>
                      <td className="py-2 px-2 text-right tabular-nums">
                        {item.gstRate / 2}% + {item.gstRate / 2}%
                      </td>
                      <td className="py-2 pl-2 text-right font-semibold tabular-nums">{formatINR(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end border-t border-slate-200 pt-3 text-xs">
              <div className="w-full sm:w-64 space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatINR(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>-{formatINR(order.discountAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Included GST Tax</span>
                  <span>{formatINR(order.taxAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>{formatINR(order.shippingFee)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm border-t border-slate-300 pt-1">
                  <span>Invoice Total</span>
                  <span>{formatINR(order.totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'packing' && (
        <div className="space-y-3">
          <div className="no-print flex justify-end">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md text-body-sm"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              <span>Print Warehouse Packing Slip</span>
            </button>
          </div>
          <div className="bg-white text-slate-900 p-4 sm:p-8 rounded-xl shadow-sm border border-slate-200 max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b-2 border-slate-800 pb-3">
              <div>
                <h2 className="text-lg font-bold">WAREHOUSE PICK & PACK SLIP</h2>
                <p className="text-xs text-slate-600">Hub: {warehouse?.name} ({warehouse?.code})</p>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-base font-bold">{order.orderNumber}</div>
                <div className="text-xs">AWB: {order.trackingNumber || 'Pending Label'}</div>
              </div>
            </div>
            <div className="overflow-x-auto my-4 custom-scrollbar">
              <table className="w-full min-w-[480px] text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-300 uppercase text-slate-600">
                    <th className="py-2 pr-2">Pick</th>
                    <th className="py-2 px-2">SKU</th>
                    <th className="py-2 px-2">Medicine</th>
                    <th className="py-2 px-2">FEFO Batch</th>
                    <th className="py-2 pl-2 text-right">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 pr-2">[ &nbsp; ]</td>
                      <td className="py-2.5 px-2 font-mono">{item.sku}</td>
                      <td className="py-2.5 px-2 font-medium">{item.productName}</td>
                      <td className="py-2.5 px-2 font-semibold">{item.batchNumber || 'FEFO-AUTO'}</td>
                      <td className="py-2.5 pl-2 text-right font-bold">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-8 text-xs text-slate-600">
              <div className="border-t border-slate-400 pt-2">Picked & Verified By (Hub Associate)</div>
              <div className="border-t border-slate-400 pt-2">Pharmacist Seal & Sign-Off (If Rx)</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm space-y-4">
          <h3 className="font-title-lg text-on-surface">Fulfillment & Audit History</h3>
          <div className="space-y-3">
            {order.timeline.map((ev, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low">
                <span className="material-symbols-outlined text-primary mt-0.5">timeline</span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-title-md text-on-surface">
                      {ev.previousStatus ? `${ev.previousStatus} → ${ev.newStatus}` : `Order ${ev.newStatus}`}
                    </span>
                    <span className="font-label-sm text-on-surface-variant">{formatIndianDateTime(ev.timestamp)}</span>
                  </div>
                  <p className="font-body-sm text-on-surface-variant mt-0.5">{ev.reason}</p>
                  <span className="font-label-sm text-primary">By {ev.staffName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingTransition)}
        title={`Transition Order to ${pendingTransition?.nextStatus || ''}?`}
        description={
          pendingTransition?.nextStatus === 'Cancelled'
            ? `Cancelling ${order.orderNumber} will immediately release reserved FEFO stock back to hub inventory.`
            : pendingTransition?.nextStatus === 'Shipped'
            ? `Shipping ${order.orderNumber} will finalize FEFO inventory deduction and create a simulated 3PL tracking shipment.`
            : `Confirm updating ${order.orderNumber} status to ${pendingTransition?.nextStatus}.`
        }
        confirmLabel={`Confirm ${pendingTransition?.nextStatus || ''}`}
        variant={pendingTransition?.variant || 'primary'}
        requireReason={pendingTransition?.requireReason}
        onConfirm={handleConfirmTransition}
        onCancel={() => setPendingTransition(null)}
      />
    </div>
  );
}
