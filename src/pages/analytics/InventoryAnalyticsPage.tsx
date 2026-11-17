import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';
import { daysUntil, downloadCsv, formatIndianDateTime, formatINR, formatINRCompact } from '../../utils/formatters';

export function InventoryAnalyticsPage() {
  const pushToast = useToastStore((s) => s.pushToast);

  const warehouses = usePharmacyStore((s) => s.warehouses);
  const batches = usePharmacyStore((s) => s.batches);
  const products = usePharmacyStore((s) => s.products);
  const stockMovements = usePharmacyStore((s) => s.stockMovements);
  const can = usePharmacyStore((s) => s.can);

  const hubValuation = useMemo(() => {
    return warehouses.map((wh) => {
      const whBatches = batches.filter((b) => b.warehouseId === wh.id && b.status !== 'Quarantined');
      const costValue = whBatches.reduce((s, b) => s + b.availableQty * b.costPrice, 0);
      const units = whBatches.reduce((s, b) => s + b.availableQty, 0);
      return { hub: wh.code, city: wh.city, costValue, units };
    });
  }, [warehouses, batches]);

  const expiryRisk = useMemo(() => {
    let critical = 0;
    let warning = 0;
    let safe = 0;
    let quarantined = 0;
    for (const b of batches) {
      if (b.status === 'Quarantined' || b.status === 'Expired') {
        quarantined += b.damagedQty || b.availableQty;
        continue;
      }
      const d = daysUntil(b.expiryDate);
      if (d <= 30) critical += b.availableQty;
      else if (d <= 90) warning += b.availableQty;
      else safe += b.availableQty;
    }
    return [
      { bucket: '< 30 Days (Critical)', units: critical },
      { bucket: '30–90 Days (FEFO Priority)', units: warning },
      { bucket: '> 90 Days (Healthy)', units: safe },
      { bucket: 'Quarantined / Expired', units: quarantined },
    ];
  }, [batches]);

  const handleExport = () => {
    downloadCsv(
      'healthy-ghar-inventory-analytics.csv',
      ['Hub', 'City', 'Available Units', 'Cost Valuation (INR)'],
      hubValuation.map((h) => [h.hub, h.city, h.units, h.costValue])
    );
    pushToast({ type: 'success', title: 'Inventory Analytics Exported' });
  };

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <span className="font-label-sm text-primary uppercase tracking-wider">FEFO Velocity & Capital Locked</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Inventory & Expiry Analytics</h1>
          <p className="font-body-md text-on-surface-variant">
            Multi-hub stock valuation, near-expiry exposure & real-time ledger velocity
          </p>
        </div>
        {can('analytics', 'export') && (
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md text-body-sm self-start"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Export Hub Valuation CSV</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm">
          <h3 className="font-title-lg text-on-surface mb-4">Stock Cost Valuation by Hub</h3>
          {hubValuation.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-body-sm text-on-surface-variant">
              No active hubs or inventory valuation records found.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hubValuation}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="hub" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val) => formatINR(Number(val) || 0)} />
                  <Bar dataKey="costValue" fill="#0f766e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm space-y-3">
          <h3 className="font-title-lg text-on-surface">Batch Expiry Risk Exposure</h3>
          <div className="space-y-2.5 pt-2">
            {expiryRisk.map((row) => (
              <div key={row.bucket} className="p-3 rounded-xl bg-surface-container-low flex flex-wrap items-center justify-between gap-2">
                <span className="font-title-md text-on-surface">{row.bucket}</span>
                <span className="font-headline-sm text-primary tabular-nums">{row.units.toLocaleString('en-IN')} units</span>
              </div>
            ))}
          </div>
          <div className="pt-2 text-body-sm text-on-surface-variant">
            Total Active SKUs Tracked: <strong>{products.filter((p) => p.status === 'Active').length}</strong> • Total Valuation:{' '}
            <strong>{formatINRCompact(hubValuation.reduce((s, h) => s + h.costValue, 0))}</strong>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-outline-variant/30">
          <h3 className="font-title-lg text-on-surface">Recent Stock Movement Velocity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low font-label-sm text-on-surface-variant uppercase">
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Hub</th>
                <th className="py-2.5 px-4 text-right">Delta</th>
                <th className="py-2.5 px-4">Reason</th>
                <th className="py-2.5 px-4">Actor</th>
                <th className="py-2.5 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 font-body-sm">
              {stockMovements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-on-surface-variant">
                    No stock movements have been recorded yet.
                  </td>
                </tr>
              ) : (
                stockMovements.slice(0, 12).map((m) => (
                  <tr key={m.id}>
                    <td className="py-2.5 px-4 font-label-md text-primary">{m.type}</td>
                    <td className="py-2.5 px-4">{m.warehouseId}</td>
                    <td className={`py-2.5 px-4 text-right font-title-md tabular-nums ${m.quantityDelta >= 0 ? 'text-primary' : 'text-error'}`}>
                      {m.quantityDelta >= 0 ? `+${m.quantityDelta}` : m.quantityDelta}
                    </td>
                    <td className="py-2.5 px-4">{m.reason}</td>
                    <td className="py-2.5 px-4">{m.staffName}</td>
                    <td className="py-2.5 px-4 text-on-surface-variant whitespace-nowrap">{formatIndianDateTime(m.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
