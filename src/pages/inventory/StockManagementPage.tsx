import React, { useMemo, useState } from 'react';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';
import { formatIndianDate, formatIndianDateTime } from '../../utils/formatters';

export function StockManagementPage() {
  const pushToast = useToastStore((s) => s.pushToast);

  const products = usePharmacyStore((s) => s.products);
  const batches = usePharmacyStore((s) => s.batches);
  const warehouses = usePharmacyStore((s) => s.warehouses);
  const stockMovements = usePharmacyStore((s) => s.stockMovements);
  const adjustStock = usePharmacyStore((s) => s.adjustStock);
  const can = usePharmacyStore((s) => s.can);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Adjustment Drawer State
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'Received' | 'Damaged' | 'Expired' | 'Correction' | 'Returned'>('Correction');
  const [direction, setDirection] = useState<'add' | 'deduct'>('add');
  const [quantity, setQuantity] = useState(10);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const availableBatchesForProduct = useMemo(
    () => batches.filter((b) => b.productId === selectedProductId && b.status !== 'Quarantined'),
    [batches, selectedProductId]
  );

  const activeBatch =
    availableBatchesForProduct.find((b) => b.id === selectedBatchId) || availableBatchesForProduct[0];

  const openAdjustForBatch = (productId: string, batchId: string) => {
    setSelectedProductId(productId);
    setSelectedBatchId(batchId);
    setAdjustmentType('Correction');
    setDirection('add');
    setQuantity(10);
    setReason('');
    setNotes('');
    setDrawerOpen(true);
  };

  const handleApplyAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBatch) {
      pushToast({ type: 'error', title: 'No Active Batch', description: 'Select a valid non-quarantined batch.' });
      return;
    }
    if (quantity <= 0) {
      pushToast({ type: 'error', title: 'Invalid Quantity', description: 'Enter a quantity greater than 0.' });
      return;
    }
    const isDeduct = adjustmentType === 'Damaged' || adjustmentType === 'Expired' || (adjustmentType === 'Correction' && direction === 'deduct');
    const delta = isDeduct ? -Math.abs(quantity) : Math.abs(quantity);

    const res = adjustStock({
      productId: activeBatch.productId,
      batchId: activeBatch.id,
      warehouseId: activeBatch.warehouseId,
      adjustmentType,
      quantityDelta: delta,
      reason,
      notes,
    });

    pushToast({
      type: res.ok ? 'success' : 'error',
      title: res.ok ? 'Stock Movement Recorded' : 'Adjustment Rejected',
      description: res.message,
    });
    if (res.ok) setDrawerOpen(false);
  };

  const filteredBatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return batches.filter((b) => {
      const prod = products.find((p) => p.id === b.productId);
      if (!q) return true;
      return `${prod?.name} ${prod?.sku} ${b.batchNumber} ${b.warehouseId}`.toLowerCase().includes(q);
    });
  }, [batches, products, search]);

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(filteredBatches.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedBatches = filteredBatches.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="font-label-sm text-primary uppercase tracking-wider">Inventory Control Desk</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Stock Management & Statutory Adjustments</h1>
          <p className="font-body-md text-on-surface-variant">
            Every stock modification enforces non-negative balances and writes an immutable StockMovement ledger record
          </p>
        </div>
        {can('inventory', 'edit') && (
          <button
            type="button"
            onClick={() => openAdjustForBatch(products[0]?.id || '', '')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md text-body-sm hover:bg-primary self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[18px]">edit_square</span>
            <span>New Stock Adjustment</span>
          </button>
        )}
      </div>

      <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search medicine name, SKU, batch number, or hub..."
          className="w-full max-w-md h-9 px-3 rounded-lg bg-surface-container-low text-body-sm text-on-surface focus:outline-none"
        />
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low text-on-surface-variant font-label-sm uppercase h-10">
              <th className="px-4 py-2">Medicine & SKU</th>
              <th className="px-3 py-2">Batch No.</th>
              <th className="px-3 py-2">Hub / Rack</th>
              <th className="px-3 py-2">Expiry</th>
              <th className="px-3 py-2">Available</th>
              <th className="px-3 py-2">Reserved</th>
              <th className="px-3 py-2">Damaged</th>
              <th className="px-4 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="text-table-data">
            {pagedBatches.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-on-surface-variant font-body-md">
                  No batches match "{search}".
                </td>
              </tr>
            ) : (
              pagedBatches.map((b) => {
                const prod = products.find((p) => p.id === b.productId);
                const wh = warehouses.find((w) => w.id === b.warehouseId);
                return (
                  <tr key={b.id} className="border-b border-outline-variant/20 hover:bg-surface-container-low/60">
                    <td className="px-4 py-3">
                      <div className="font-title-md text-on-surface">{prod?.name}</div>
                      <div className="font-mono text-[11px] text-outline">{prod?.sku}</div>
                    </td>
                    <td className="px-3 py-3 font-mono text-body-sm">{b.batchNumber}</td>
                    <td className="px-3 py-3">
                      <span className="font-label-md">{wh?.code}</span>
                      <span className="block font-mono text-[11px] text-outline">{b.rackLocation}</span>
                    </td>
                    <td className="px-3 py-3">{formatIndianDate(b.expiryDate)}</td>
                    <td className="px-3 py-3 font-title-md tabular-nums">{b.availableQty}</td>
                    <td className="px-3 py-3 tabular-nums text-on-surface-variant">{b.reservedQty}</td>
                    <td className="px-3 py-3 tabular-nums text-error">{b.damagedQty}</td>
                    <td className="px-4 py-3 text-right">
                      {can('inventory', 'edit') && b.status !== 'Quarantined' && (
                        <button
                          type="button"
                          onClick={() => openAdjustForBatch(b.productId, b.id)}
                          className="px-3 py-1 rounded-lg bg-surface-container text-on-surface font-label-md hover:bg-primary-container hover:text-on-primary transition-colors"
                        >
                          Adjust
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-body-sm text-on-surface-variant">
          <span>Showing {pagedBatches.length} of {filteredBatches.length} batch(es)</span>
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

      {/* Audit History Strip */}
      <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm space-y-3">
        <h2 className="font-headline-sm text-on-surface">Recent Stock Adjustment & Movement Trail</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant font-label-sm uppercase h-9">
                <th className="px-3 py-2">Timestamp</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Delta</th>
                <th className="px-3 py-2">Balance Shift</th>
                <th className="px-3 py-2">Staff & Reason</th>
              </tr>
            </thead>
            <tbody className="text-body-sm">
              {stockMovements.slice(0, 12).map((m) => {
                const prod = products.find((p) => p.id === m.productId);
                return (
                  <tr key={m.id} className="border-b border-outline-variant/20">
                    <td className="px-3 py-2 text-outline">{formatIndianDateTime(m.createdAt)}</td>
                    <td className="px-3 py-2 font-label-sm">{m.type}</td>
                    <td className="px-3 py-2 font-title-md text-on-surface">{prod?.name}</td>
                    <td className={`px-3 py-2 font-bold tabular-nums ${m.quantityDelta >= 0 ? 'text-primary' : 'text-error'}`}>
                      {m.quantityDelta >= 0 ? `+${m.quantityDelta}` : m.quantityDelta}
                    </td>
                    <td className="px-3 py-2 font-mono">{m.previousQty} → {m.newQty}</td>
                    <td className="px-3 py-2">{m.staffName}: {m.reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statutory Stock Adjustment Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[85] flex justify-end">
          <div className="fixed inset-0 bg-on-surface/35 backdrop-blur-xs" onClick={() => setDrawerOpen(false)} />
          <form
            onSubmit={handleApplyAdjustment}
            className="relative w-full max-w-md bg-surface-container-lowest h-full shadow-2xl z-10 flex flex-col p-6 space-y-4 overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
              <div>
                <h2 className="font-headline-sm text-on-surface">Statutory Stock Adjustment</h2>
                <p className="font-body-sm text-on-surface-variant">Prevents negative inventory & creates movement log</p>
              </div>
              <button type="button" onClick={() => setDrawerOpen(false)} className="p-1 rounded-lg hover:bg-surface-container">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div>
              <label className="block font-label-md text-on-surface mb-1">Medicine SKU</label>
              <select
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  setSelectedBatchId('');
                }}
                className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-label-md text-on-surface mb-1">Target Batch & Warehouse</label>
              <select
                value={activeBatch?.id || ''}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              >
                {availableBatchesForProduct.length === 0 ? (
                  <option value="">No active non-quarantined batch available</option>
                ) : (
                  availableBatchesForProduct.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batchNumber} ({b.warehouseId.replace('WH-', '')}) • Avail: {b.availableQty}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-label-md text-on-surface mb-1">Adjustment Category</label>
                <select
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value as typeof adjustmentType)}
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
                >
                  <option value="Correction">Physical Count Correction</option>
                  <option value="Received">Opening / Extra Received</option>
                  <option value="Damaged">Damaged in Hub</option>
                  <option value="Expired">Expired Write-off</option>
                  <option value="Returned">Customer Sealed Restock</option>
                </select>
              </div>
              {adjustmentType === 'Correction' && (
                <div>
                  <label className="block font-label-md text-on-surface mb-1">Direction</label>
                  <select
                    value={direction}
                    onChange={(e) => setDirection(e.target.value as 'add' | 'deduct')}
                    className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
                  >
                    <option value="add">+ Add Units</option>
                    <option value="deduct">- Deduct Units</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block font-label-md text-on-surface mb-1">Quantity Units *</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              />
            </div>

            <div>
              <label className="block font-label-md text-on-surface mb-1">Statutory Reason *</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Cycle count reconciliation Bay 2"
                className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              />
            </div>

            <div>
              <label className="block font-label-md text-on-surface mb-1">Audit Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              />
            </div>

            <div className="pt-4 mt-auto flex justify-end gap-2">
              <button type="button" onClick={() => setDrawerOpen(false)} className="px-4 py-2 rounded-lg bg-surface-container text-on-surface font-title-md">Cancel</button>
              <button type="submit" className="px-5 py-2 rounded-lg bg-primary-container text-on-primary font-title-md hover:bg-primary">
                Apply Stock Adjustment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
