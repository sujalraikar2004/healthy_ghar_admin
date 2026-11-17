import { useMemo, useState } from 'react';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { daysUntil, downloadCsv, formatIndianDate, formatINR } from '../../utils/formatters';

export function BatchesExpiryPage() {
  const pushToast = useToastStore((s) => s.pushToast);

  const batches = usePharmacyStore((s) => s.batches);
  const products = usePharmacyStore((s) => s.products);
  const warehouses = usePharmacyStore((s) => s.warehouses);
  const suppliers = usePharmacyStore((s) => s.suppliers);
  const activeHubId = usePharmacyStore((s) => s.activeHubId);
  const quarantineBatch = usePharmacyStore((s) => s.quarantineBatch);
  const can = usePharmacyStore((s) => s.can);

  const [bucket, setBucket] = useState<'ALL' | 'CRITICAL' | 'WATCH' | 'HEALTHY' | 'QUARANTINED'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [quarantineTargetId, setQuarantineTargetId] = useState<string | null>(null);

  const enriched = useMemo(() => {
    const q = search.trim().toLowerCase();
    return batches
      .filter((b) => activeHubId === 'ALL' || b.warehouseId === activeHubId)
      .map((b) => {
        const prod = products.find((p) => p.id === b.productId);
        const wh = warehouses.find((w) => w.id === b.warehouseId);
        const sup = suppliers.find((s) => s.id === b.supplierId);
        const dLeft = daysUntil(b.expiryDate);
        return { batch: b, prod, wh, sup, dLeft };
      })
      .filter((r) => {
        if (bucket === 'QUARANTINED' && r.batch.status !== 'Quarantined' && r.dLeft > 0) return false;
        if (bucket === 'CRITICAL' && (r.batch.status === 'Quarantined' || r.dLeft < 0 || r.dLeft > 30)) return false;
        if (bucket === 'WATCH' && (r.batch.status === 'Quarantined' || r.dLeft <= 30 || r.dLeft > 90)) return false;
        if (bucket === 'HEALTHY' && (r.batch.status === 'Quarantined' || r.dLeft <= 90)) return false;
        if (q && !`${r.batch.batchNumber} ${r.prod?.name} ${r.prod?.sku}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => a.dLeft - b.dLeft);
  }, [batches, products, warehouses, suppliers, activeHubId, bucket, search]);

  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(enriched.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedBatches = enriched.slice((safePage - 1) * pageSize, safePage * pageSize);

  const counts = useMemo(() => {
    const all = batches.filter((b) => activeHubId === 'ALL' || b.warehouseId === activeHubId);
    return {
      critical: all.filter((b) => b.status !== 'Quarantined' && daysUntil(b.expiryDate) >= 0 && daysUntil(b.expiryDate) <= 30).length,
      watch: all.filter((b) => b.status !== 'Quarantined' && daysUntil(b.expiryDate) > 30 && daysUntil(b.expiryDate) <= 90).length,
      quarantined: all.filter((b) => b.status === 'Quarantined' || daysUntil(b.expiryDate) < 0).length,
      coldChain: all.filter((b) => b.coldChainTemp !== undefined).length,
    };
  }, [batches, activeHubId]);

  const handleExport = () => {
    downloadCsv(
      'healthy-ghar-fefo-batches.csv',
      ['Batch Number', 'Product', 'Hub', 'Mfg Date', 'Expiry Date', 'Days Left', 'Available', 'Status'],
      enriched.map((r) => [
        r.batch.batchNumber,
        r.prod?.name,
        r.wh?.code,
        formatIndianDate(r.batch.mfgDate),
        formatIndianDate(r.batch.expiryDate),
        r.dLeft,
        r.batch.availableQty,
        r.batch.status,
      ])
    );
    pushToast({ type: 'success', title: 'FEFO Report Exported', description: `Exported ${enriched.length} batch records.` });
  };

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="font-label-sm text-primary uppercase tracking-wider">FEFO & Rule 65 Bio-Safety</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Batch Lifecycle & Expiry Governance</h1>
          <p className="font-body-md text-on-surface-variant">
            First Expiry, First Out (FEFO) dispatch sequencing; expired or quarantined batches are automatically blocked from order allocation
          </p>
        </div>
        {can('batches', 'export') && (
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-container-lowest text-on-surface shadow-sm font-title-md text-body-sm hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Export FEFO Ledger</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm">
          <span className="font-label-sm text-error uppercase">Critical Expiry (&le;30d)</span>
          <div className="font-metric-num text-error mt-1 tabular-nums">{counts.critical}</div>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm">
          <span className="font-label-sm text-tertiary uppercase">Watch Window (31–90d)</span>
          <div className="font-metric-num text-tertiary mt-1 tabular-nums">{counts.watch}</div>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm">
          <span className="font-label-sm text-error uppercase">Quarantined / Expired</span>
          <div className="font-metric-num text-error mt-1 tabular-nums">{counts.quarantined}</div>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm">
          <span className="font-label-sm text-primary uppercase">2–8°C Cold-Chain Batches</span>
          <div className="font-metric-num text-primary mt-1 tabular-nums">{counts.coldChain}</div>
        </div>
      </div>

      <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ['ALL', 'All Batches'],
              ['CRITICAL', 'Critical (≤30d)'],
              ['WATCH', 'Watch (31–90d)'],
              ['HEALTHY', 'Healthy (>90d)'],
              ['QUARANTINED', 'Quarantined / Expired'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setBucket(k);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-full font-label-md text-label-md ${
                bucket === k ? 'bg-primary-container text-on-primary' : 'bg-surface-container-low text-on-surface-variant'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search batch no. or medicine..."
          className="h-9 px-3 rounded-lg bg-surface-container-low text-body-sm w-full sm:w-64"
        />
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low text-on-surface-variant font-label-sm uppercase h-10">
              <th className="px-4 py-2">Batch Number</th>
              <th className="px-3 py-2">Medicine</th>
              <th className="px-3 py-2">Hub & Supplier</th>
              <th className="px-3 py-2">Expiry & FEFO Window</th>
              <th className="px-3 py-2">Available</th>
              <th className="px-3 py-2">Cost Value</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-4 py-2 text-right">Governance</th>
            </tr>
          </thead>
          <tbody className="text-table-data">
            {pagedBatches.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-on-surface-variant font-body-md">
                  No batches match your active expiry bucket or search criteria.
                </td>
              </tr>
            ) : (
              pagedBatches.map(({ batch: b, prod, wh, sup, dLeft }) => (
              <tr key={b.id} className="border-b border-outline-variant/20 hover:bg-surface-container-low/60">
                <td className="px-4 py-3">
                  <div className="font-mono font-semibold text-on-surface">{b.batchNumber}</div>
                  <div className="font-label-sm text-outline">{b.rackLocation}</div>
                </td>
                <td className="px-3 py-3">
                  <div className="font-title-md text-on-surface">{prod?.name}</div>
                  {b.coldChainTemp !== undefined && (
                    <span className="inline-flex items-center gap-1 font-label-sm text-primary">
                      <span className="material-symbols-outlined text-[14px]">ac_unit</span>
                      {b.coldChainTemp}°C
                    </span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <div className="font-label-md">{wh?.code}</div>
                  <div className="font-body-sm text-on-surface-variant truncate max-w-[180px]">{sup?.name}</div>
                </td>
                <td className="px-3 py-3">
                  <div>{formatIndianDate(b.expiryDate)}</div>
                  <span
                    className={`font-label-sm ${
                      dLeft < 0 || dLeft <= 30 ? 'text-error font-bold' : dLeft <= 90 ? 'text-tertiary' : 'text-primary'
                    }`}
                  >
                    {dLeft < 0 ? `EXPIRED (${Math.abs(dLeft)}d ago)` : `${dLeft} days left`}
                  </span>
                </td>
                <td className="px-3 py-3 font-title-md tabular-nums">{b.availableQty}</td>
                <td className="px-3 py-3 tabular-nums">{formatINR(b.availableQty * b.costPrice)}</td>
                <td className="px-3 py-3">
                  <span
                    className={`px-2 py-0.5 rounded-full font-label-sm ${
                      b.status === 'Quarantined' || b.status === 'Expired'
                        ? 'bg-error-container text-on-error-container'
                        : b.status === 'Expiring Soon'
                        ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                        : 'bg-primary-fixed text-on-primary-fixed'
                    }`}
                  >
                    {b.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {can('batches', 'edit') && b.status !== 'Quarantined' && (
                    <button
                      type="button"
                      onClick={() => setQuarantineTargetId(b.id)}
                      className="px-2.5 py-1 rounded-lg bg-error-container/70 text-on-error-container font-label-sm hover:bg-error-container whitespace-nowrap"
                    >
                      Quarantine
                    </button>
                  )}
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-body-sm text-on-surface-variant">
          <span>Showing {pagedBatches.length} of {enriched.length} batch(es)</span>
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

      <ConfirmDialog
        open={Boolean(quarantineTargetId)}
        title="Quarantine Batch Under CDSCO Rule 65?"
        description="Quarantining immediately removes this batch from FEFO order allocation and moves remaining stock to Quarantine Bay for Form 46 inspection."
        confirmLabel="Quarantine Batch"
        variant="danger"
        requireReason
        reasonPlaceholder="e.g. Near expiry (<30d), damaged seal, or temperature excursion..."
        onCancel={() => setQuarantineTargetId(null)}
        onConfirm={(reason) => {
          if (quarantineTargetId) {
            const res = quarantineBatch(quarantineTargetId, reason);
            pushToast({ type: res.ok ? 'warning' : 'error', title: res.ok ? 'Batch Quarantined' : 'Error', description: res.message });
          }
          setQuarantineTargetId(null);
        }}
      />
    </div>
  );
}
