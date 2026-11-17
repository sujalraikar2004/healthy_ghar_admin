import { useNavigate } from 'react-router-dom';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { formatINRCompact } from '../../utils/formatters';

export function WarehousesPage() {
  const navigate = useNavigate();
  const warehouses = usePharmacyStore((s) => s.warehouses);
  const inventory = usePharmacyStore((s) => s.inventory);
  const products = usePharmacyStore((s) => s.products);
  const batches = usePharmacyStore((s) => s.batches);
  const setActiveHub = usePharmacyStore((s) => s.setActiveHub);

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="font-label-sm text-primary uppercase tracking-wider">Pan-India Distribution Network</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Warehouses & Cold-Chain Hubs</h1>
          <p className="font-body-md text-on-surface-variant">
            Monitor hub capacity utilization, Form 20B/21B drug licenses, and cold-room temperature telemetry
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/stock-transfers')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md text-body-sm hover:bg-primary"
        >
          <span className="material-symbols-outlined text-[18px]">sync_alt</span>
          <span>Inter-Hub Transfers</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
        {warehouses.map((wh) => {
          const whInv = inventory.filter((i) => i.warehouseId === wh.id);
          const totalUnits = whInv.reduce((s, i) => s + i.availableQty, 0);
          const utilPct = Math.min(100, Math.round((totalUnits / wh.capacityUnits) * 100));
          const stockValue = whInv.reduce((s, i) => {
            const p = products.find((pr) => pr.id === i.productId);
            return s + i.availableQty * (p?.costPrice || 0);
          }, 0);
          const activeBatches = batches.filter((b) => b.warehouseId === wh.id && b.status !== 'Quarantined').length;

          return (
            <div key={wh.id} className="bg-surface-container-lowest p-6 rounded-xl shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary font-label-sm">
                      {wh.code}
                    </span>
                    <h2 className="font-headline-sm text-on-surface mt-2">{wh.name}</h2>
                    <p className="font-body-sm text-on-surface-variant">{wh.address}, {wh.city} — {wh.pincode}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm">
                      <span className="material-symbols-outlined text-[14px]">ac_unit</span>
                      {wh.temperatureCelsius}°C
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-lg bg-surface-container-low">
                    <span className="font-label-sm text-outline uppercase">Stock Units</span>
                    <div className="font-headline-sm text-on-surface tabular-nums">{totalUnits.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-container-low">
                    <span className="font-label-sm text-outline uppercase">Hub Valuation</span>
                    <div className="font-headline-sm text-primary tabular-nums">{formatINRCompact(stockValue)}</div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-label-sm text-on-surface-variant mb-1">
                    <span>Capacity Utilization ({activeBatches} active batches)</span>
                    <span>{utilPct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                    <div className="h-full bg-primary-container" style={{ width: `${utilPct}%` }} />
                  </div>
                </div>

                <div className="text-body-sm text-on-surface-variant space-y-1 pt-1">
                  <div><strong>Hub Lead:</strong> {wh.managerName} ({wh.phone})</div>
                  <div className="font-mono text-[11px]"><strong>DL:</strong> {wh.drugLicenseNo}</div>
                  <div className="font-mono text-[11px]"><strong>GSTIN:</strong> {wh.gstin}</div>
                </div>
              </div>

              <div className="pt-3 border-t border-outline-variant/25 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveHub(wh.id);
                    navigate('/inventory-overview');
                  }}
                  className="flex-1 py-2 rounded-lg bg-primary-container text-on-primary font-title-md text-body-sm hover:bg-primary"
                >
                  Inspect Hub Stock
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/stock-transfers')}
                  className="px-3 py-2 rounded-lg bg-surface-container text-on-surface font-title-md text-body-sm hover:bg-surface-container-high"
                >
                  Transfer
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
