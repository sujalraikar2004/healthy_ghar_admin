import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';
import { downloadCsv, formatIndianDateTime, formatINR, formatINRCompact } from '../../utils/formatters';

export function InventoryOverviewPage() {
  const navigate = useNavigate();
  const pushToast = useToastStore((s) => s.pushToast);

  const inventory = usePharmacyStore((s) => s.inventory);
  const products = usePharmacyStore((s) => s.products);
  const batches = usePharmacyStore((s) => s.batches);
  const warehouses = usePharmacyStore((s) => s.warehouses);
  const stockMovements = usePharmacyStore((s) => s.stockMovements);
  const activeHubId = usePharmacyStore((s) => s.activeHubId);
  const can = usePharmacyStore((s) => s.can);

  const [hubFilter, setHubFilter] = useState(activeHubId === 'ALL' ? 'ALL' : activeHubId);
  const [alertFilter, setAlertFilter] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setHubFilter(activeHubId);
    setPage(1);
  }, [activeHubId]);

  const scopedRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inventory
      .filter((inv) => hubFilter === 'ALL' || inv.warehouseId === hubFilter)
      .map((inv) => {
        const prod = products.find((p) => p.id === inv.productId);
        const wh = warehouses.find((w) => w.id === inv.warehouseId);
        const stockValue = inv.availableQty * (prod?.costPrice || 0);
        return { inv, prod, wh, stockValue };
      })
      .filter((r) => Boolean(r.prod))
      .filter((r) => {
        if (alertFilter === 'LOW' && (r.inv.availableQty === 0 || r.inv.availableQty > r.inv.reorderLevel)) return false;
        if (alertFilter === 'OUT' && r.inv.availableQty > 0) return false;
        if (q && !`${r.prod?.name} ${r.inv.sku} ${r.wh?.code}`.toLowerCase().includes(q)) return false;
        return true;
      });
  }, [inventory, products, warehouses, hubFilter, alertFilter, search]);

  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(scopedRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = scopedRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const summary = useMemo(() => {
    const totalUnits = scopedRows.reduce((s, r) => s + r.inv.availableQty, 0);
    const totalReserved = scopedRows.reduce((s, r) => s + r.inv.reservedQty, 0);
    const totalValue = scopedRows.reduce((s, r) => s + r.stockValue, 0);
    const lowStock = scopedRows.filter((r) => r.inv.availableQty <= r.inv.reorderLevel).length;
    const quarantinedUnits = batches
      .filter((b) => (hubFilter === 'ALL' || b.warehouseId === hubFilter) && b.status === 'Quarantined')
      .reduce((s, b) => s + b.damagedQty, 0);
    return { totalUnits, totalReserved, totalValue, lowStock, quarantinedUnits };
  }, [scopedRows, batches, hubFilter]);

  const handleExport = () => {
    downloadCsv(
      'healthy-ghar-inventory-valuation.csv',
      ['SKU', 'Product', 'Hub', 'Available', 'Reserved', 'Damaged', 'Reorder Level', 'Valuation (INR)'],
      scopedRows.map((r) => [
        r.inv.sku,
        r.prod?.name,
        r.wh?.code,
        r.inv.availableQty,
        r.inv.reservedQty,
        r.inv.damagedQty,
        r.inv.reorderLevel,
        r.stockValue,
      ])
    );
    pushToast({ type: 'success', title: 'Inventory Valuation Exported', description: `Downloaded ${scopedRows.length} SKU hub records.` });
  };

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <span className="font-label-sm text-primary uppercase tracking-wider">Multi-Hub Supply Chain</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Inventory Overview & Valuation</h1>
          <p className="font-body-md text-on-surface-variant">
            Real-time stock balances synchronized with FEFO batch allocations, GRNs, transfers, and adjustments
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {can('inventory', 'export') && (
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container-lowest text-on-surface shadow-sm font-title-md text-body-sm hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Export Stock CSV</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/stock-management')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary shadow-sm font-title-md text-body-sm hover:bg-primary"
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
            <span>Stock Adjustment Desk</span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-space-md">
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm">
          <span className="font-label-sm text-on-surface-variant uppercase">Available Stock Units</span>
          <div className="font-metric-num text-on-surface mt-1 tabular-nums">{summary.totalUnits.toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm">
          <span className="font-label-sm text-primary uppercase">Inventory Cost Value</span>
          <div className="font-metric-num text-primary mt-1 tabular-nums">{formatINRCompact(summary.totalValue)}</div>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm">
          <span className="font-label-sm text-on-surface-variant uppercase">Reserved for Orders</span>
          <div className="font-metric-num text-on-surface mt-1 tabular-nums">{summary.totalReserved}</div>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm">
          <span className="font-label-sm text-tertiary uppercase">Low / Reorder SKUs</span>
          <div className="font-metric-num text-tertiary mt-1 tabular-nums">{summary.lowStock}</div>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm">
          <span className="font-label-sm text-error uppercase">Quarantined / Damaged</span>
          <div className="font-metric-num text-error mt-1 tabular-nums">{summary.quarantinedUnits}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-space-lg items-start">
        <div className="xl:col-span-2 bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-outline-variant/25 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Filter by SKU or product name..."
                className="h-9 px-3 rounded-lg bg-surface-container-low text-body-sm w-full sm:w-auto sm:min-w-[200px] flex-1"
              />
              <select
                value={hubFilter}
                onChange={(e) => {
                  setHubFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 px-2.5 rounded-lg bg-surface-container-low text-body-sm"
              >
                <option value="ALL">All Hubs</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.code} — {w.city}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {(['ALL', 'LOW', 'OUT'] as const).map((af) => (
                <button
                  key={af}
                  type="button"
                  onClick={() => {
                    setAlertFilter(af);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-full font-label-sm ${
                    alertFilter === af ? 'bg-primary-container text-on-primary' : 'bg-surface-container-low text-on-surface-variant'
                  }`}
                >
                  {af === 'ALL' ? 'All' : af === 'LOW' ? 'Low Stock' : 'Out of Stock'}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto max-h-[540px] custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-surface-container-low z-10">
                <tr className="text-on-surface-variant font-label-sm uppercase h-9">
                  <th className="px-4 py-2">Medicine & SKU</th>
                  <th className="px-3 py-2">Hub</th>
                  <th className="px-3 py-2">Available</th>
                  <th className="px-3 py-2">Reserved</th>
                  <th className="px-3 py-2">Reorder Pt</th>
                  <th className="px-4 py-2 text-right">Stock Value</th>
                </tr>
              </thead>
              <tbody className="text-table-data">
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-on-surface-variant font-body-md">
                      No hub inventory balances match your current filters.
                    </td>
                  </tr>
                ) : (
                  pagedRows.map(({ inv, prod, wh, stockValue }) => {
                    const isLow = inv.availableQty <= inv.reorderLevel;
                    return (
                      <tr key={inv.id} className="border-b border-outline-variant/20 hover:bg-surface-container-low/60">
                        <td className="px-4 py-2.5">
                          <button
                            type="button"
                            onClick={() => navigate(`/products/${inv.productId}`)}
                            className="font-title-md text-primary hover:underline text-left"
                          >
                            {prod?.name}
                          </button>
                          <div className="font-mono text-[11px] text-outline">{inv.sku}</div>
                        </td>
                        <td className="px-3 py-2.5 font-label-md">{wh?.code}</td>
                        <td className="px-3 py-2.5 tabular-nums">
                          <span
                            className={`px-2 py-0.5 rounded-full font-label-sm ${
                              inv.availableQty === 0
                                ? 'bg-error-container text-on-error-container'
                                : isLow
                                ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                                : 'bg-primary-fixed/60 text-on-primary-fixed'
                            }`}
                          >
                            {inv.availableQty}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-on-surface-variant">{inv.reservedQty}</td>
                        <td className="px-3 py-2.5 tabular-nums text-outline">{inv.reorderLevel}</td>
                        <td className="px-4 py-2.5 text-right font-title-md tabular-nums">{formatINR(stockValue)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-body-sm text-on-surface-variant">
            <span>Showing {pagedRows.length} of {scopedRows.length} hub SKU balance(s)</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage(Math.max(1, safePage - 1))}
                className="px-3 py-1 rounded bg-surface-container-low hover:bg-surface-container disabled:opacity-50"
              >
                Previous
              </button>
              <span className="font-title-md text-on-surface">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                className="px-3 py-1 rounded bg-surface-container-low hover:bg-surface-container disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Stock Movement Ledger */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-sm text-on-surface">Stock Movement Ledger</h2>
            <span className="font-label-sm text-outline">{stockMovements.length} logs</span>
          </div>
          <div className="space-y-2.5 max-h-[540px] overflow-y-auto custom-scrollbar pr-1">
            {stockMovements.length === 0 ? (
              <div className="py-8 text-center text-body-sm text-on-surface-variant">
                No stock movements recorded yet.
              </div>
            ) : (
              stockMovements.slice(0, 20).map((mov) => {
                const prod = products.find((p) => p.id === mov.productId);
                const positive = mov.quantityDelta > 0;
                return (
                  <div key={mov.id} className="p-3 rounded-xl bg-surface-container-low space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-label-sm px-2 py-0.5 rounded bg-surface-container text-on-surface">
                        {mov.type.replace(/_/g, ' ')}
                      </span>
                      <span className={`font-title-md tabular-nums ${positive ? 'text-primary' : 'text-error'}`}>
                        {positive ? `+${mov.quantityDelta}` : mov.quantityDelta}
                      </span>
                    </div>
                    <div className="font-title-md text-body-sm text-on-surface truncate">{prod?.name || mov.productId}</div>
                    <div className="font-body-sm text-on-surface-variant">{mov.reason}</div>
                    <div className="flex items-center justify-between font-label-sm text-outline pt-1">
                      <span>{mov.staffName} • {mov.warehouseId.replace('WH-', '')}</span>
                      <span>{formatIndianDateTime(mov.createdAt).split(',')[0]}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
