import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';
import { OrderStatus } from '../../types';
import { downloadCsv, formatIndianDateTime, formatINR, formatINRCompact } from '../../utils/formatters';
import { QuickOrderModal } from '../../components/common/QuickOrderModal';

const STATUS_TABS: Array<'ALL' | OrderStatus> = [
  'ALL',
  'Placed',
  'Confirmed',
  'Processing',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

const STATUS_BADGE: Record<OrderStatus, string> = {
  Placed: 'bg-surface-container-high text-on-surface',
  Confirmed: 'bg-primary-fixed text-on-primary-fixed',
  Processing: 'bg-secondary-container text-on-secondary-container',
  Packed: 'bg-tertiary-fixed text-on-tertiary-fixed',
  Shipped: 'bg-primary-fixed text-primary',
  'Out for Delivery': 'bg-tertiary-fixed-dim/50 text-on-tertiary-fixed',
  Delivered: 'bg-primary-container text-on-primary',
  Cancelled: 'bg-error-container text-on-error-container',
};

export function OrdersPage() {
  const navigate = useNavigate();
  const pushToast = useToastStore((s) => s.pushToast);

  const orders = usePharmacyStore((s) => s.orders);
  const customers = usePharmacyStore((s) => s.customers);
  const warehouses = usePharmacyStore((s) => s.warehouses);
  const activeHubId = usePharmacyStore((s) => s.activeHubId);
  const can = usePharmacyStore((s) => s.can);

  const [statusTab, setStatusTab] = useState<'ALL' | OrderStatus>('ALL');
  const [hubFilter, setHubFilter] = useState(activeHubId === 'ALL' ? 'ALL' : activeHubId);
  const [rxFilter, setRxFilter] = useState<'ALL' | 'RX_HOLD' | 'RX_APPROVED' | 'OTC'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [quickOrderOpen, setQuickOrderOpen] = useState(false);

  useEffect(() => {
    setHubFilter(activeHubId === 'ALL' ? 'ALL' : activeHubId);
  }, [activeHubId]);

  const enrichedOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders
      .map((ord) => {
        const customer = customers.find((c) => c.id === ord.customerId);
        const warehouse = warehouses.find((w) => w.id === ord.warehouseId);
        return { ord, customer, warehouse };
      })
      .filter(({ ord, customer, warehouse }) => {
        if (statusTab !== 'ALL' && ord.status !== statusTab) return false;
        if (hubFilter !== 'ALL' && ord.warehouseId !== hubFilter) return false;
        if (rxFilter === 'RX_HOLD' && (!ord.prescriptionRequired || ord.prescriptionStatus === 'Approved')) return false;
        if (rxFilter === 'RX_APPROVED' && (!ord.prescriptionRequired || ord.prescriptionStatus !== 'Approved')) return false;
        if (rxFilter === 'OTC' && ord.prescriptionRequired) return false;
        if (q) {
          const hay = `${ord.orderNumber} ${customer?.name || ''} ${ord.shippingAddress.city} ${ord.trackingNumber || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.ord.createdAt).getTime() - new Date(a.ord.createdAt).getTime());
  }, [orders, customers, warehouses, statusTab, hubFilter, rxFilter, search]);

  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(enrichedOrders.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedOrders = useMemo(
    () => enrichedOrders.slice((safePage - 1) * pageSize, safePage * pageSize),
    [enrichedOrders, safePage]
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: orders.length };
    for (const s of STATUS_TABS) {
      if (s !== 'ALL') map[s] = orders.filter((o) => o.status === s).length;
    }
    return map;
  }, [orders]);

  const kpis = useMemo(() => {
    const activeFulfillment = orders.filter((o) => !['Delivered', 'Cancelled'].includes(o.status)).length;
    const rxHold = orders.filter(
      (o) => o.prescriptionRequired && o.prescriptionStatus !== 'Approved' && o.status !== 'Cancelled'
    ).length;
    const totalGmv = orders.filter((o) => o.status !== 'Cancelled').reduce((s, o) => s + o.totalAmount, 0);
    const codPending = orders.filter((o) => o.paymentMethod === 'COD' && o.paymentStatus === 'Pending' && o.status !== 'Cancelled').length;
    return { activeFulfillment, rxHold, totalGmv, codPending };
  }, [orders]);

  const handleExport = () => {
    downloadCsv(
      'healthy-ghar-orders-ledger.csv',
      ['Order #', 'Patient', 'City', 'Hub', 'Items', 'Total (INR)', 'Payment Mode', 'Payment Status', 'Rx Status', 'Order Status', 'Created At'],
      enrichedOrders.map(({ ord, customer, warehouse }) => [
        ord.orderNumber,
        customer?.name,
        ord.shippingAddress.city,
        warehouse?.code,
        ord.items.length,
        ord.totalAmount,
        ord.paymentMethod,
        ord.paymentStatus,
        ord.prescriptionStatus,
        ord.status,
        ord.createdAt,
      ])
    );
    pushToast({ type: 'success', title: 'Orders CSV Exported', description: `Exported ${enrichedOrders.length} orders.` });
  };

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <span className="font-label-sm text-primary uppercase tracking-wider">Fulfillment Control Tower</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Order Management</h1>
          <p className="font-body-md text-on-surface-variant">
            7-stage pharmacy fulfillment pipeline with FEFO batch reservation & Schedule H Rx gating
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {can('orders', 'export') && (
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container-lowest text-on-surface shadow-sm font-title-md text-body-sm hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Export Orders CSV</span>
            </button>
          )}
          {can('orders', 'create') && (
            <button
              type="button"
              onClick={() => setQuickOrderOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary shadow-sm font-title-md text-body-sm hover:bg-primary"
            >
              <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
              <span>Create Assisted Order</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm">
          <span className="font-label-sm text-on-surface-variant uppercase">Total Orders</span>
          <div className="font-metric-num text-on-surface mt-1 tabular-nums">{orders.length}</div>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm">
          <span className="font-label-sm text-primary uppercase">Active Fulfillment</span>
          <div className="font-metric-num text-primary mt-1 tabular-nums">{kpis.activeFulfillment}</div>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm">
          <span className="font-label-sm text-tertiary uppercase">Pending Rx Clinical Gate</span>
          <div className="font-metric-num text-tertiary mt-1 tabular-nums">{kpis.rxHold}</div>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm">
          <span className="font-label-sm text-on-surface-variant uppercase">Gross Merchandise Value</span>
          <div className="font-metric-num text-on-surface mt-1 tabular-nums">{formatINRCompact(kpis.totalGmv)}</div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {STATUS_TABS.map((tab) => {
          const active = statusTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusTab(tab)}
              className={`px-3 py-1.5 rounded-lg font-label-md whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                active
                  ? 'bg-primary-container text-on-primary shadow-xs'
                  : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <span>{tab === 'ALL' ? 'All Orders' : tab}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] tabular-nums ${
                  active ? 'bg-on-primary/20 text-on-primary' : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                {counts[tab] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order # (MED-...), patient name, city, or AWB..."
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-low border border-outline-variant/60 text-body-sm text-on-surface"
          />
        </div>
        <select
          value={hubFilter}
          onChange={(e) => setHubFilter(e.target.value)}
          className="h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/60 text-body-sm text-on-surface"
        >
          <option value="ALL">All Dispatch Hubs</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>{w.code} — {w.city}</option>
          ))}
        </select>
        <select
          value={rxFilter}
          onChange={(e) => setRxFilter(e.target.value as typeof rxFilter)}
          className="h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/60 text-body-sm text-on-surface"
        >
          <option value="ALL">All Rx Types</option>
          <option value="RX_HOLD">Blocked / Pending Rx</option>
          <option value="RX_APPROVED">Rx Approved</option>
          <option value="OTC">OTC Only</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant/40 font-label-sm text-on-surface-variant uppercase">
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Patient & Destination</th>
                <th className="py-3 px-4">Hub & Items</th>
                <th className="py-3 px-4">Rx Gate</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 font-body-sm">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-on-surface-variant">
                    No orders match your current filters.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map(({ ord, customer, warehouse }) => (
                  <tr
                    key={ord.id}
                    onClick={() => navigate(`/orders/${ord.id}`)}
                    className="hover:bg-surface-container-low/60 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-title-md text-primary">{ord.orderNumber}</div>
                      <div className="text-[11px] text-on-surface-variant">{formatIndianDateTime(ord.createdAt)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-title-md text-on-surface">{customer?.name || 'Patient'}</div>
                      <div className="text-[11px] text-on-surface-variant">
                        {ord.shippingAddress.city} — {ord.shippingAddress.pincode}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-label-md text-on-surface">{warehouse?.code || ord.warehouseId}</div>
                      <div className="text-[11px] text-on-surface-variant">
                        {ord.items.reduce((s, i) => s + i.quantity, 0)} unit(s) • Inv: {ord.inventoryState}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {!ord.prescriptionRequired ? (
                        <span className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant font-label-sm">
                          OTC
                        </span>
                      ) : ord.prescriptionStatus === 'Approved' ? (
                        <span className="px-2 py-0.5 rounded-md bg-primary-fixed text-on-primary-fixed font-label-sm">
                          Rx Approved
                        </span>
                      ) : ord.prescriptionStatus === 'Rejected' ? (
                        <span className="px-2 py-0.5 rounded-md bg-error-container text-on-error-container font-label-sm">
                          Rx Rejected
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-tertiary-fixed text-on-tertiary-fixed font-label-sm">
                          {ord.prescriptionStatus}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-label-md text-on-surface">{ord.paymentMethod}</div>
                      <div className="text-[11px] text-on-surface-variant">{ord.paymentStatus}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-title-md text-on-surface tabular-nums">
                      {formatINR(ord.totalAmount)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-md font-label-sm ${STATUS_BADGE[ord.status]}`}>
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => navigate(`/orders/${ord.id}`)}
                        className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-primary-fixed text-primary font-label-md whitespace-nowrap"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {enrichedOrders.length > 0 && (
          <div className="px-4 py-3 border-t border-outline-variant/30 flex flex-wrap items-center justify-between gap-2 text-body-sm">
            <span className="text-on-surface-variant">
              Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, enrichedOrders.length)} of{' '}
              {enrichedOrders.length} orders
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg bg-surface-container disabled:opacity-40 font-label-md"
              >
                Prev
              </button>
              <span className="font-label-md px-2">
                Page {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded-lg bg-surface-container disabled:opacity-40 font-label-md"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <QuickOrderModal open={quickOrderOpen} onClose={() => setQuickOrderOpen(false)} />
    </div>
  );
}
