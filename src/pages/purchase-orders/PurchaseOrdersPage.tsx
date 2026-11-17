import React, { useMemo, useState } from 'react';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';
import { GoodsReceiptItem, PurchaseOrder } from '../../types';
import { formatIndianDate, formatINR } from '../../utils/formatters';

export function PurchaseOrdersPage() {
  const pushToast = useToastStore((s) => s.pushToast);

  const purchaseOrders = usePharmacyStore((s) => s.purchaseOrders);
  const goodsReceipts = usePharmacyStore((s) => s.goodsReceipts);
  const suppliers = usePharmacyStore((s) => s.suppliers);
  const warehouses = usePharmacyStore((s) => s.warehouses);
  const products = usePharmacyStore((s) => s.products);
  const createPurchaseOrder = usePharmacyStore((s) => s.createPurchaseOrder);
  const decidePurchaseOrder = usePharmacyStore((s) => s.decidePurchaseOrder);
  const receiveGoodsNote = usePharmacyStore((s) => s.receiveGoodsNote);
  const can = usePharmacyStore((s) => s.can);

  const [tab, setTab] = useState<'pos' | 'grns'>('pos');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [grnTargetPo, setGrnTargetPo] = useState<PurchaseOrder | null>(null);

  // Create PO form
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || 'SUP-001');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || 'WH-BLR-01');
  const [expectedDate, setExpectedDate] = useState(new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10));
  const [poNotes, setPoNotes] = useState('');
  const [poLines, setPoLines] = useState<{ productId: string; qty: number }[]>([
    { productId: products[0]?.id || 'PRD-001', qty: 200 },
  ]);

  // GRN Dock Receiving form
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [grnNotes, setGrnNotes] = useState('');
  const [grnItems, setGrnItems] = useState<GoodsReceiptItem[]>([]);

  const filteredPOs = useMemo(
    () => purchaseOrders.filter((po) => statusFilter === 'ALL' || po.status === statusFilter),
    [purchaseOrders, statusFilter]
  );

  const openGrnDrawer = (po: PurchaseOrder) => {
    setGrnTargetPo(po);
    setInvoiceNumber(`INV-${Math.floor(10000 + Math.random() * 89999)}`);
    setGrnNotes('Dock QC seal & batch expiry verified.');
    const remainingItems: GoodsReceiptItem[] = po.items
      .filter((it) => it.orderedQty - it.receivedQty > 0)
      .map((it, idx) => ({
        productId: it.productId,
        sku: it.sku,
        batchNumber: `GRN${new Date().getFullYear()}-${it.sku.slice(-4)}-${10 + idx}`,
        mfgDate: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
        expiryDate: new Date(Date.now() + 540 * 86400000).toISOString().slice(0, 10),
        receivedQty: it.orderedQty - it.receivedQty,
        damagedQty: 0,
        unitCost: it.unitCost,
        rackLocation: `${po.warehouseId.slice(3, 6)}-R1-B${idx + 1}`,
      }));
    setGrnItems(remainingItems);
  };

  const handleCreatePO = (submitForApproval: boolean) => {
    const items = poLines
      .map((l) => {
        const prod = products.find((p) => p.id === l.productId);
        if (!prod) return null;
        return {
          productId: prod.id,
          sku: prod.sku,
          productName: prod.name,
          orderedQty: Math.max(1, l.qty),
          unitCost: prod.costPrice,
          gstRate: prod.gstRate,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
    if (items.length === 0) {
      pushToast({ type: 'error', title: 'No Line Items', description: 'Select at least one valid product line.' });
      return;
    }
    const res = createPurchaseOrder({
      supplierId,
      warehouseId,
      expectedDeliveryDate: expectedDate,
      notes: poNotes,
      items,
      submitForApproval,
    });
    pushToast({ type: res.ok ? 'success' : 'error', title: res.ok ? 'Purchase Order Created' : 'Error', description: res.message });
    if (res.ok) setPoModalOpen(false);
  };

  const handleSubmitGRN = (e: React.FormEvent) => {
    e.preventDefault();
    if (!grnTargetPo) return;
    if (!invoiceNumber.trim()) {
      pushToast({ type: 'error', title: 'Invoice Required', description: 'Enter the supplier GST invoice number.' });
      return;
    }
    const res = receiveGoodsNote({
      purchaseOrderId: grnTargetPo.id,
      invoiceNumber: invoiceNumber.trim(),
      notes: grnNotes,
      items: grnItems,
    });
    pushToast({ type: res.ok ? 'success' : 'error', title: res.ok ? 'GRN Recorded & Stock Updated' : 'GRN Rejected', description: res.message });
    if (res.ok) setGrnTargetPo(null);
  };

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="font-label-sm text-primary uppercase tracking-wider">Procurement & Dock Receiving</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Purchase Orders & Goods Received Notes</h1>
          <p className="font-body-md text-on-surface-variant">
            Inventory updates strictly upon Goods Received Note (GRN) dock inspection — never upon PO creation
          </p>
        </div>
        {can('purchase_orders', 'create') && (
          <button
            type="button"
            onClick={() => setPoModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md text-body-sm hover:bg-primary"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Create Purchase Order</span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/40 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('pos')}
            className={`px-4 py-2 rounded-lg font-title-md text-body-sm ${
              tab === 'pos' ? 'bg-primary-container text-on-primary' : 'bg-surface-container-lowest text-on-surface'
            }`}
          >
            Purchase Orders ({purchaseOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('grns')}
            className={`px-4 py-2 rounded-lg font-title-md text-body-sm ${
              tab === 'grns' ? 'bg-primary-container text-on-primary' : 'bg-surface-container-lowest text-on-surface'
            }`}
          >
            Goods Received Notes ({goodsReceipts.length})
          </button>
        </div>

        {tab === 'pos' && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-lg bg-surface-container-lowest text-body-sm shadow-sm"
          >
            <option value="ALL">All PO Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Approved">Approved</option>
            <option value="Partially Received">Partially Received</option>
            <option value="Received">Received</option>
            <option value="Rejected">Rejected</option>
          </select>
        )}
      </div>

      {tab === 'pos' ? (
        <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant font-label-sm uppercase h-10">
                <th className="px-4 py-2">PO Number</th>
                <th className="px-3 py-2">Supplier & Hub</th>
                <th className="px-3 py-2">Ordered / Received</th>
                <th className="px-3 py-2">Total (Incl. GST)</th>
                <th className="px-3 py-2">Expected Delivery</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-table-data">
              {filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-on-surface-variant font-body-md">
                    No purchase orders match the selected status filter.
                  </td>
                </tr>
              ) : (
                filteredPOs.map((po) => {
                const sup = suppliers.find((s) => s.id === po.supplierId);
                const wh = warehouses.find((w) => w.id === po.warehouseId);
                const ordQty = po.items.reduce((s, i) => s + i.orderedQty, 0);
                const recQty = po.items.reduce((s, i) => s + i.receivedQty, 0);
                return (
                  <tr key={po.id} className="border-b border-outline-variant/20 hover:bg-surface-container-low/60">
                    <td className="px-4 py-3 font-mono font-semibold text-primary">{po.poNumber}</td>
                    <td className="px-3 py-3">
                      <div className="font-title-md text-on-surface">{sup?.name}</div>
                      <div className="font-label-sm text-outline">Hub: {wh?.code}</div>
                    </td>
                    <td className="px-3 py-3 tabular-nums">
                      <span className="font-title-md">{recQty}</span> / {ordQty} units
                    </td>
                    <td className="px-3 py-3 font-title-md tabular-nums">{formatINR(po.totalAmount)}</td>
                    <td className="px-3 py-3">{formatIndianDate(po.expectedDeliveryDate)}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-label-sm ${
                          po.status === 'Received'
                            ? 'bg-primary-container text-on-primary'
                            : po.status === 'Approved' || po.status === 'Partially Received'
                            ? 'bg-primary-fixed text-on-primary-fixed'
                            : po.status === 'Pending Approval'
                            ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                            : po.status === 'Rejected'
                            ? 'bg-error-container text-on-error-container'
                            : 'bg-surface-container text-on-surface'
                        }`}
                      >
                        {po.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap space-x-1.5">
                      {can('purchase_orders', 'approve') && (po.status === 'Pending Approval' || po.status === 'Draft') && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              const r = decidePurchaseOrder(po.id, 'Approved');
                              pushToast({ type: r.ok ? 'success' : 'error', title: r.ok ? 'PO Approved' : 'Blocked', description: r.message });
                            }}
                            className="px-2.5 py-1 rounded bg-primary-container text-on-primary font-label-sm"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const r = decidePurchaseOrder(po.id, 'Rejected', 'Rate discrepancy');
                              pushToast({ type: r.ok ? 'warning' : 'error', title: r.ok ? 'PO Rejected' : 'Blocked', description: r.message });
                            }}
                            className="px-2.5 py-1 rounded bg-error-container text-on-error-container font-label-sm"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {can('purchase_orders', 'edit') && (po.status === 'Approved' || po.status === 'Partially Received') && (
                        <button
                          type="button"
                          onClick={() => openGrnDrawer(po)}
                          className="px-3 py-1 rounded bg-tertiary-container text-on-tertiary font-label-sm"
                        >
                          Receive Goods (GRN)
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
      ) : (
        <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant font-label-sm uppercase h-10">
                <th className="px-4 py-2">GRN Number</th>
                <th className="px-3 py-2">Supplier Invoice</th>
                <th className="px-3 py-2">Hub</th>
                <th className="px-3 py-2">Batches Created</th>
                <th className="px-3 py-2">Received Value</th>
                <th className="px-4 py-2">Inspected By</th>
              </tr>
            </thead>
            <tbody className="text-table-data">
              {goodsReceipts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-on-surface-variant font-body-md">
                    No Goods Received Notes recorded yet.
                  </td>
                </tr>
              ) : (
                goodsReceipts.map((g) => {
                  const wh = warehouses.find((w) => w.id === g.warehouseId);
                  return (
                    <tr key={g.id} className="border-b border-outline-variant/20">
                      <td className="px-4 py-3 font-mono font-semibold text-primary">{g.grnNumber}</td>
                      <td className="px-3 py-3 font-mono">{g.invoiceNumber}</td>
                      <td className="px-3 py-3">{wh?.code}</td>
                      <td className="px-3 py-3">{g.items.map((i) => `${i.batchNumber} (${i.receivedQty})`).join(', ')}</td>
                      <td className="px-3 py-3 font-title-md tabular-nums">{formatINR(g.totalReceivedValue)}</td>
                      <td className="px-4 py-3">{g.inspectedBy} • {formatIndianDate(g.receivedAt)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create PO Modal */}
      {poModalOpen && (
        <div className="fixed inset-0 z-[85] bg-on-surface/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <h2 className="font-headline-sm text-on-surface">Create Supplier Purchase Order</h2>
              <button type="button" onClick={() => setPoModalOpen(false)} className="p-1 rounded hover:bg-surface-container">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-label-md text-on-surface mb-1">Supplier</label>
                <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full min-w-0 h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant">
                  {suppliers.filter((s) => s.status === 'Active').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-label-md text-on-surface mb-1">Receiving Hub</label>
                <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="w-full min-w-0 h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant">
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.city}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block font-label-md text-on-surface mb-1">Expected Delivery Date</label>
              <input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-label-md">Order Line Items</span>
                <button
                  type="button"
                  onClick={() => setPoLines((prev) => [...prev, { productId: products[prev.length % products.length]?.id || '', qty: 100 }])}
                  className="text-primary font-label-md hover:underline"
                >
                  + Add SKU
                </button>
              </div>
              {poLines.map((line, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                  <select
                    value={line.productId}
                    onChange={(e) => setPoLines((prev) => prev.map((it, i) => (i === idx ? { ...it, productId: e.target.value } : it)))}
                    className="flex-1 min-w-0 w-full h-9 px-2.5 rounded-lg bg-surface-container-low border border-outline-variant text-body-sm"
                  >
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name} (Cost {formatINR(p.costPrice)})</option>)}
                  </select>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={line.qty}
                      onChange={(e) => setPoLines((prev) => prev.map((it, i) => (i === idx ? { ...it, qty: Number(e.target.value) } : it)))}
                      className="w-24 h-9 px-2.5 rounded-lg bg-surface-container-low border border-outline-variant text-body-sm"
                    />
                    {poLines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setPoLines((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1.5 rounded text-error hover:bg-error-container/50"
                        aria-label="Remove line item"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div>
              <label className="block font-label-md text-on-surface mb-1">Notes</label>
              <input type="text" value={poNotes} onChange={(e) => setPoNotes(e.target.value)} className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => handleCreatePO(false)} className="px-4 py-2 rounded-lg bg-surface-container text-on-surface font-title-md">Save Draft</button>
              <button type="button" onClick={() => handleCreatePO(true)} className="px-5 py-2 rounded-lg bg-primary-container text-on-primary font-title-md hover:bg-primary">Submit for Approval</button>
            </div>
          </div>
        </div>
      )}

      {/* GRN Dock Receiving Drawer */}
      {grnTargetPo && (
        <div className="fixed inset-0 z-[85] flex justify-end">
          <div className="fixed inset-0 bg-on-surface/35 backdrop-blur-xs" onClick={() => setGrnTargetPo(null)} />
          <form onSubmit={handleSubmitGRN} className="relative w-full max-w-xl bg-surface-container-lowest h-full shadow-2xl z-10 flex flex-col p-6 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
              <div>
                <h2 className="font-headline-sm text-on-surface">Dock Inspection & GRN ({grnTargetPo.poNumber})</h2>
                <p className="font-body-sm text-on-surface-variant">Creates batches & increments hub stock atomically</p>
              </div>
              <button type="button" onClick={() => setGrnTargetPo(null)} className="p-1 rounded hover:bg-surface-container">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div>
              <label className="block font-label-md text-on-surface mb-1">Supplier GST Invoice Number *</label>
              <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant font-mono" />
            </div>

            <div className="space-y-3">
              {grnItems.map((it, idx) => (
                <div key={`${it.productId}-${idx}`} className="p-3.5 rounded-xl bg-surface-container-low space-y-2">
                  <div className="font-title-md text-body-md text-on-surface">{it.sku}</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="font-label-sm text-outline block">Batch No.</label>
                      <input
                        type="text"
                        value={it.batchNumber}
                        onChange={(e) => setGrnItems((prev) => prev.map((x, i) => (i === idx ? { ...x, batchNumber: e.target.value } : x)))}
                        className="w-full h-8 px-2 rounded bg-surface-container-lowest border border-outline-variant font-mono text-body-sm"
                      />
                    </div>
                    <div>
                      <label className="font-label-sm text-outline block">Receive Qty</label>
                      <input
                        type="number"
                        min={1}
                        value={it.receivedQty}
                        onChange={(e) => setGrnItems((prev) => prev.map((x, i) => (i === idx ? { ...x, receivedQty: Number(e.target.value) } : x)))}
                        className="w-full h-8 px-2 rounded bg-surface-container-lowest border border-outline-variant text-body-sm"
                      />
                    </div>
                    <div>
                      <label className="font-label-sm text-outline block">Damaged</label>
                      <input
                        type="number"
                        min={0}
                        value={it.damagedQty}
                        onChange={(e) => setGrnItems((prev) => prev.map((x, i) => (i === idx ? { ...x, damagedQty: Number(e.target.value) } : x)))}
                        className="w-full h-8 px-2 rounded bg-surface-container-lowest border border-outline-variant text-body-sm"
                      />
                    </div>
                    <div>
                      <label className="font-label-sm text-outline block">Expiry Date</label>
                      <input
                        type="date"
                        value={it.expiryDate}
                        onChange={(e) => setGrnItems((prev) => prev.map((x, i) => (i === idx ? { ...x, expiryDate: e.target.value } : x)))}
                        className="w-full h-8 px-2 rounded bg-surface-container-lowest border border-outline-variant text-body-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="block font-label-md text-on-surface mb-1">QC Inspection Notes</label>
              <textarea rows={2} value={grnNotes} onChange={(e) => setGrnNotes(e.target.value)} className="w-full p-3 rounded-lg bg-surface-container-low border border-outline-variant" />
            </div>

            <div className="pt-4 mt-auto flex justify-end gap-2">
              <button type="button" onClick={() => setGrnTargetPo(null)} className="px-4 py-2 rounded-lg bg-surface-container text-on-surface font-title-md">Cancel</button>
              <button type="submit" className="px-5 py-2 rounded-lg bg-primary-container text-on-primary font-title-md hover:bg-primary">Post GRN & Increment Stock</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
