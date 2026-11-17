import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { daysUntil, formatIndianDate, formatINR } from '../../utils/formatters';

export function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const products = usePharmacyStore((s) => s.products);
  const categories = usePharmacyStore((s) => s.categories);
  const brands = usePharmacyStore((s) => s.brands);
  const batches = usePharmacyStore((s) => s.batches);
  const warehouses = usePharmacyStore((s) => s.warehouses);
  const orders = usePharmacyStore((s) => s.orders);
  const reviews = usePharmacyStore((s) => s.reviews);
  const can = usePharmacyStore((s) => s.can);

  const [tab, setTab] = useState<'overview' | 'batches' | 'orders' | 'reviews'>('overview');

  const product = products.find((p) => p.id === id);

  if (!product) {
    return (
      <div className="p-space-xl text-center">
        <h2 className="font-headline-md text-on-surface">Product SKU Not Found</h2>
        <button
          type="button"
          onClick={() => navigate('/products')}
          className="mt-4 px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md"
        >
          Back to Catalogue
        </button>
      </div>
    );
  }

  const category = categories.find((c) => c.id === product.categoryId);
  const brand = brands.find((b) => b.id === product.brandId);
  const productBatches = batches
    .filter((b) => b.productId === product.id)
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  const totalAvail = productBatches
    .filter((b) => b.status !== 'Quarantined')
    .reduce((s, b) => s + b.availableQty, 0);
  const totalReserved = productBatches.reduce((s, b) => s + b.reservedQty, 0);
  const relatedOrders = orders.filter((o) => o.items.some((i) => i.productId === product.id)).slice(0, 10);
  const productReviews = reviews.filter((r) => r.productId === product.id);
  const marginPct = product.sellingPrice > 0 ? Math.round(((product.sellingPrice - product.costPrice) / product.sellingPrice) * 100) : 0;

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="inline-flex items-center gap-1 font-label-md text-primary hover:underline mb-1"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Medicine Catalogue
          </button>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-headline-lg text-headline-lg text-on-surface">{product.name}</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm">
              {product.schedule}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface font-label-sm">
              {product.status}
            </span>
          </div>
          <p className="font-body-md text-on-surface-variant mt-0.5">
            {product.composition} • {brand?.manufacturerName || product.manufacturer} • SKU {product.sku}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {can('inventory', 'edit') && (
            <button
              type="button"
              onClick={() => navigate('/stock-management')}
              className="px-4 py-2 rounded-lg bg-surface-container-lowest text-on-surface shadow-sm font-title-md text-body-sm hover:bg-surface-container"
            >
              Adjust Hub Stock
            </button>
          )}
          {can('products', 'edit') && (
            <button
              type="button"
              onClick={() => navigate(`/products/${product.id}/edit`)}
              className="px-4 py-2 rounded-lg bg-primary-container text-on-primary shadow-sm font-title-md text-body-sm hover:bg-primary"
            >
              Edit Formulation
            </button>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-space-md">
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm">
          <span className="font-label-sm text-on-surface-variant uppercase">Selling / MRP</span>
          <div className="font-headline-md text-on-surface mt-1 tabular-nums">
            {formatINR(product.sellingPrice)}{' '}
            <span className="text-body-sm text-outline line-through">{formatINR(product.mrp)}</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm">
          <span className="font-label-sm text-on-surface-variant uppercase">Gross Margin</span>
          <div className="font-headline-md text-primary mt-1 tabular-nums">{marginPct}%</div>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm">
          <span className="font-label-sm text-on-surface-variant uppercase">Available (FEFO)</span>
          <div className="font-headline-md text-on-surface mt-1 tabular-nums">{totalAvail} units</div>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm">
          <span className="font-label-sm text-on-surface-variant uppercase">Reserved in Orders</span>
          <div className="font-headline-md text-tertiary mt-1 tabular-nums">{totalReserved} units</div>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm">
          <span className="font-label-sm text-on-surface-variant uppercase">HSN / GST Slab</span>
          <div className="font-headline-md text-on-surface mt-1 font-mono">
            {product.hsnCode} ({product.gstRate}%)
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/40 overflow-x-auto custom-scrollbar">
        {(
          [
            { id: 'overview', label: 'Clinical & Regulatory Dossier' },
            { id: 'batches', label: `FEFO Batch Stock (${productBatches.length})` },
            { id: 'orders', label: `Linked Orders (${relatedOrders.length})` },
            { id: 'reviews', label: `Patient Reviews (${productReviews.length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 font-title-md text-body-md border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              tab === t.id
                ? 'border-primary-container text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
          <div className="lg:col-span-2 bg-surface-container-lowest p-6 rounded-xl shadow-sm space-y-4">
            <h2 className="font-headline-sm text-on-surface">Pharmacology & Formulation Dossier</h2>
            {product.images.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {product.images.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`${product.name} ${i + 1}`}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                    className="h-28 w-40 object-contain rounded-xl bg-surface-container-low p-1.5 border border-outline-variant/40"
                  />
                ))}
              </div>
            )}
            <p className="font-body-md text-on-surface-variant">{product.description}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
              {[
                ['Generic Molecule', product.genericName],
                ['Strength', product.strength],
                ['Dosage Form', product.dosageForm],
                ['Pack Size', product.packSize],
                ['Category', category?.name || '—'],
                ['Brand Principal', brand?.name || '—'],
                ['Storage Condition', product.storageCondition],
                ['DPCO Price Capped', product.dpcoCapped ? 'Yes (NPPA Ceiling)' : 'No'],
                ['Return Policy', product.isReturnable ? '7-Day Sealed Return' : 'Non-Returnable'],
              ].map(([k, v]) => (
                <div key={k} className="p-3 rounded-lg bg-surface-container-low">
                  <div className="font-label-sm text-outline uppercase">{k}</div>
                  <div className="font-title-md text-body-md text-on-surface mt-0.5">{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm space-y-3">
            <h2 className="font-headline-sm text-on-surface">Configured Variants</h2>
            {product.variants.map((v) => (
              <div key={v.id} className="p-3 rounded-lg bg-surface-container-low flex items-center justify-between">
                <div>
                  <div className="font-title-md text-body-md text-on-surface">{v.label}</div>
                  <div className="font-body-sm text-on-surface-variant">SKU: {product.sku}-{v.skuSuffix}</div>
                </div>
                <div className="text-right tabular-nums">
                  <div className="font-title-md text-primary">{formatINR(v.sellingPrice)}</div>
                  <div className="font-body-sm text-outline">MRP {formatINR(v.mrp)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'batches' && (
        <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant font-label-sm uppercase h-10">
                <th className="px-4 py-2">Batch No. (FEFO Order)</th>
                <th className="px-3 py-2">Hub</th>
                <th className="px-3 py-2">Rack</th>
                <th className="px-3 py-2">Expiry Date</th>
                <th className="px-3 py-2">Available</th>
                <th className="px-3 py-2">Reserved</th>
                <th className="px-3 py-2">Cost / Unit</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="text-table-data">
              {productBatches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-on-surface-variant font-body-md">
                    No batches currently stocked for this formulation.
                  </td>
                </tr>
              ) : (
                productBatches.map((b, idx) => {
                const wh = warehouses.find((w) => w.id === b.warehouseId);
                const dLeft = daysUntil(b.expiryDate);
                return (
                  <tr key={b.id} className="border-b border-outline-variant/20">
                    <td className="px-4 py-3 font-mono font-semibold text-on-surface">
                      {b.batchNumber}{' '}
                      {idx === 0 && b.status !== 'Quarantined' && (
                        <span className="ml-1 px-1.5 py-0.5 rounded bg-primary-container text-on-primary font-sans text-[10px]">
                          FEFO #1
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">{wh?.code || b.warehouseId}</td>
                    <td className="px-3 py-3 font-mono text-body-sm">{b.rackLocation}</td>
                    <td className="px-3 py-3">
                      <span>{formatIndianDate(b.expiryDate)}</span>
                      <span className={`block font-label-sm ${dLeft <= 30 ? 'text-error' : 'text-outline'}`}>
                        {dLeft < 0 ? `Expired ${Math.abs(dLeft)}d ago` : `${dLeft}d remaining`}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-title-md tabular-nums">{b.availableQty}</td>
                    <td className="px-3 py-3 tabular-nums">{b.reservedQty}</td>
                    <td className="px-3 py-3 tabular-nums">{formatINR(b.costPrice)}</td>
                    <td className="px-4 py-3">
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
                  </tr>
                );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'orders' && (
        <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant font-label-sm uppercase h-10">
                <th className="px-4 py-2">Order Number</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Order Total</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="text-table-data">
              {relatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-on-surface-variant font-body-md">
                    No customer orders linked to this SKU yet.
                  </td>
                </tr>
              ) : (
                relatedOrders.map((o) => {
                  const line = o.items.find((i) => i.productId === product.id);
                  return (
                    <tr key={o.id} className="border-b border-outline-variant/20 hover:bg-surface-container-low">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => navigate(`/orders/${o.id}`)}
                          className="font-title-md text-primary hover:underline"
                        >
                          {o.orderNumber}
                        </button>
                      </td>
                      <td className="px-3 py-3">{formatIndianDate(o.createdAt)}</td>
                      <td className="px-3 py-3">{line?.quantity || 1}</td>
                      <td className="px-3 py-3 tabular-nums">{formatINR(o.totalAmount)}</td>
                      <td className="px-4 py-3">{o.status}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'reviews' && (
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm space-y-3">
          {productReviews.length === 0 ? (
            <p className="text-on-surface-variant font-body-md">No patient reviews recorded yet for this formulation.</p>
          ) : (
            productReviews.map((rev) => (
              <div key={rev.id} className="p-4 rounded-xl bg-surface-container-low">
                <div className="flex items-center justify-between">
                  <div className="font-title-md text-on-surface">{rev.title} ({rev.rating}/5 ★)</div>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container text-primary font-label-sm">{rev.status}</span>
                </div>
                <p className="font-body-md text-on-surface-variant mt-1">{rev.comment}</p>
                <div className="font-label-sm text-outline mt-1">By {rev.customerName} • {formatIndianDate(rev.createdAt)}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
