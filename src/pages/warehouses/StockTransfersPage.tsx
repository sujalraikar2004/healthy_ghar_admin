import React, { useMemo, useState } from 'react';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';
import { StockTransfer } from '../../types';
import { formatIndianDateTime } from '../../utils/formatters';

export function StockTransfersPage() {
  const pushToast = useToastStore((s) => s.pushToast);

  const transfers = usePharmacyStore((s) => s.transfers);
  const warehouses = usePharmacyStore((s) => s.warehouses);
  const products = usePharmacyStore((s) => s.products);
  const batches = usePharmacyStore((s) => s.batches);
  const createTransfer = usePharmacyStore((s) => s.createTransfer);
  const advanceTransfer = usePharmacyStore((s) => s.advanceTransfer);
  const can = usePharmacyStore((s) => s.can);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [telemetryTransfer, setTelemetryTransfer] = useState<StockTransfer | null>(null);

  const [sourceWarehouseId, setSourceWarehouseId] = useState('WH-BLR-01');
  const [destinationWarehouseId, setDestinationWarehouseId] = useState('WH-BOM-02');
  const [productId, setProductId] = useState(products[0]?.id || 'PRD-001');
  const [batchId, setBatchId] = useState('');
  const [quantity, setQuantity] = useState(50);
  const [coldChainMonitor, setColdChainMonitor] = useState(false);
  const [notes, setNotes] = useState('');

  const eligibleBatches = useMemo(
    () =>
      batches.filter(
        (b) =>
          b.warehouseId === sourceWarehouseId &&
          b.productId === productId &&
          b.status !== 'Quarantined' &&
          b.availableQty > 0 &&
          new Date(b.expiryDate) > new Date()
      ),
    [batches, sourceWarehouseId, productId]
  );

  const activeBatch = eligibleBatches.find((b) => b.id === batchId) || eligibleBatches[0];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBatch) {
      pushToast({ type: 'error', title: 'No Valid Source Batch', description: 'Select a hub & SKU with available non-expired stock.' });
      return;
    }
    const res = createTransfer({
      sourceWarehouseId,
      destinationWarehouseId,
      productId,
      batchId: activeBatch.id,
      quantity: Number(quantity),
      coldChainMonitor,
      notes,
    });
    pushToast({ type: res.ok ? 'success' : 'error', title: res.ok ? 'Transfer Created' : 'Blocked', description: res.message });
    if (res.ok) setDrawerOpen(false);
  };

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="font-label-sm text-primary uppercase tracking-wider">Inter-Hub Balancing</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Stock Transfers & Reefer Logistics</h1>
          <p className="font-body-md text-on-surface-variant">
            Move FEFO batches between Bengaluru, Mumbai, and Hyderabad hubs with full movement accounting
          </p>
        </div>
        {can('transfers', 'create') && (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md text-body-sm hover:bg-primary"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Initiate Transfer</span>
          </button>
        )}
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low text-on-surface-variant font-label-sm uppercase h-10">
              <th className="px-4 py-2">Transfer Code</th>
              <th className="px-3 py-2">Route (Source → Dest)</th>
              <th className="px-3 py-2">Medicine & Qty</th>
              <th className="px-3 py-2">Cold-Chain</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-4 py-2 text-right">Workflow Actions</th>
            </tr>
          </thead>
          <tbody className="text-table-data">
            {transfers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-on-surface-variant font-body-md">
                  No inter-hub stock transfers logged yet.
                </td>
              </tr>
            ) : (
              transfers.map((trf) => {
                const prod = products.find((p) => p.id === trf.productId);
                const src = warehouses.find((w) => w.id === trf.sourceWarehouseId);
                const dst = warehouses.find((w) => w.id === trf.destinationWarehouseId);
              return (
                <tr key={trf.id} className="border-b border-outline-variant/20 hover:bg-surface-container-low/60">
                  <td className="px-4 py-3">
                    <div className="font-mono font-semibold text-primary">{trf.transferCode}</div>
                    <div className="font-label-sm text-outline">{formatIndianDateTime(trf.createdAt).split(',')[0]}</div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-title-md text-on-surface">
                      {src?.code} → {dst?.code}
                    </div>
                    <div className="font-body-sm text-on-surface-variant">{trf.vehicleInfo || 'Standard Manifest'}</div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-title-md text-on-surface">{prod?.name}</div>
                    <div className="font-body-sm text-primary font-semibold">{trf.quantity} units</div>
                  </td>
                  <td className="px-3 py-3">
                    {trf.coldChainMonitor ? (
                      <button
                        type="button"
                        onClick={() => setTelemetryTransfer(trf)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm"
                      >
                        <span className="material-symbols-outlined text-[14px]">thermostat</span>
                        {trf.currentTemp || 4.2}°C Telemetry
                      </button>
                    ) : (
                      <span className="font-label-sm text-outline">Ambient</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-label-sm ${
                        trf.status === 'Received'
                          ? 'bg-primary-container text-on-primary'
                          : trf.status === 'In Transit'
                          ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                          : trf.status === 'Cancelled'
                          ? 'bg-error-container text-on-error-container'
                          : 'bg-surface-container text-on-surface'
                      }`}
                    >
                      {trf.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap space-x-1.5">
                    {can('transfers', 'edit') && trf.status === 'Requested' && (
                      <button
                        type="button"
                        onClick={() => {
                          const r = advanceTransfer(trf.id, 'Approved');
                          pushToast({ type: r.ok ? 'success' : 'error', title: r.ok ? 'Approved' : 'Blocked', description: r.message });
                        }}
                        className="px-2.5 py-1 rounded bg-primary-container text-on-primary font-label-sm"
                      >
                        Approve
                      </button>
                    )}
                    {can('transfers', 'edit') && trf.status === 'Approved' && (
                      <button
                        type="button"
                        onClick={() => {
                          const r = advanceTransfer(trf.id, 'In Transit');
                          pushToast({ type: r.ok ? 'success' : 'error', title: r.ok ? 'Dispatched' : 'Blocked', description: r.message });
                        }}
                        className="px-2.5 py-1 rounded bg-tertiary-container text-on-tertiary font-label-sm"
                      >
                        Dispatch (Deduct Src)
                      </button>
                    )}
                    {can('transfers', 'edit') && trf.status === 'In Transit' && (
                      <button
                        type="button"
                        onClick={() => {
                          const r = advanceTransfer(trf.id, 'Received');
                          pushToast({ type: r.ok ? 'success' : 'error', title: r.ok ? 'Received at Hub' : 'Blocked', description: r.message });
                        }}
                        className="px-2.5 py-1 rounded bg-primary-container text-on-primary font-label-sm"
                      >
                        Confirm Receipt
                      </button>
                    )}
                  </td>
                </tr>
              );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Initiate Transfer Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[85] flex justify-end">
          <div className="fixed inset-0 bg-on-surface/35 backdrop-blur-xs" onClick={() => setDrawerOpen(false)} />
          <form onSubmit={handleCreate} className="relative w-full max-w-md bg-surface-container-lowest h-full shadow-2xl z-10 flex flex-col p-6 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
              <h2 className="font-headline-sm text-on-surface">Initiate Inter-Hub Stock Transfer</h2>
              <button type="button" onClick={() => setDrawerOpen(false)} className="p-1 rounded-lg hover:bg-surface-container">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-label-md text-on-surface mb-1">Source Hub</label>
                <select value={sourceWarehouseId} onChange={(e) => { setSourceWarehouseId(e.target.value); setBatchId(''); }} className="w-full min-w-0 h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant">
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} ({w.city})</option>)}
                </select>
              </div>
              <div>
                <label className="block font-label-md text-on-surface mb-1">Destination Hub</label>
                <select value={destinationWarehouseId} onChange={(e) => setDestinationWarehouseId(e.target.value)} className="w-full min-w-0 h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant">
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} ({w.city})</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-label-md text-on-surface mb-1">Product Formulation</label>
              <select value={productId} onChange={(e) => { setProductId(e.target.value); setBatchId(''); }} className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant">
                {products.filter((p) => p.status === 'Active').map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>
            </div>

            <div>
              <label className="block font-label-md text-on-surface mb-1">Source Batch (Non-Expired)</label>
              <select value={activeBatch?.id || ''} onChange={(e) => setBatchId(e.target.value)} className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant">
                {eligibleBatches.length === 0 ? (
                  <option value="">No available stock at selected source hub</option>
                ) : (
                  eligibleBatches.map((b) => <option key={b.id} value={b.id}>{b.batchNumber} • Avail: {b.availableQty}</option>)
                )}
              </select>
            </div>

            <div>
              <label className="block font-label-md text-on-surface mb-1">Transfer Quantity</label>
              <input type="number" min={1} max={activeBatch?.availableQty || 9999} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={coldChainMonitor} onChange={(e) => setColdChainMonitor(e.target.checked)} className="w-4 h-4 accent-[#0f766e]" />
              <span className="font-body-md text-on-surface">Enable 2–8°C Cold-Chain IoT Logger (Demo)</span>
            </label>

            <div>
              <label className="block font-label-md text-on-surface mb-1">Manifest Notes</label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full p-3 rounded-lg bg-surface-container-low border border-outline-variant" />
            </div>

            <div className="pt-4 mt-auto flex justify-end gap-2">
              <button type="button" onClick={() => setDrawerOpen(false)} className="px-4 py-2 rounded-lg bg-surface-container text-on-surface font-title-md">Cancel</button>
              <button type="submit" className="px-5 py-2 rounded-lg bg-primary-container text-on-primary font-title-md hover:bg-primary">Create Transfer Request</button>
            </div>
          </form>
        </div>
      )}

      {/* Telemetry Modal */}
      {telemetryTransfer && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-on-surface/40 backdrop-blur-xs p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-on-surface">Cold-Chain Logger (Demo Telemetry)</h3>
              <button type="button" onClick={() => setTelemetryTransfer(null)} className="p-1 rounded hover:bg-surface-container">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4 rounded-xl bg-surface-container-low space-y-2">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Manifest:</span>
                <span className="font-mono font-bold text-primary">{telemetryTransfer.transferCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Vehicle:</span>
                <span className="font-title-md">{telemetryTransfer.vehicleInfo || 'Cold Reefer Van'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Chamber Temp:</span>
                <span className="font-title-md text-primary">{telemetryTransfer.currentTemp || 4.1}°C (Nominal 2–8°C)</span>
              </div>
            </div>
            <p className="font-body-sm text-outline">Simulated IoT telemetry view in Demo Mode.</p>
          </div>
        </div>
      )}
    </div>
  );
}
