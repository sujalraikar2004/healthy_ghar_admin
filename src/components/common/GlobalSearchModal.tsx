import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { formatINR } from '../../utils/formatters';

interface GlobalSearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ open, onClose }: GlobalSearchModalProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const products = usePharmacyStore((s) => s.products);
  const orders = usePharmacyStore((s) => s.orders);
  const prescriptions = usePharmacyStore((s) => s.prescriptions);
  const customers = usePharmacyStore((s) => s.customers);
  const suppliers = usePharmacyStore((s) => s.suppliers);
  const can = usePharmacyStore((s) => s.can);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return {
        products: products.slice(0, 4),
        orders: can('orders') ? orders.slice(0, 3) : [],
        prescriptions: can('prescriptions') ? prescriptions.slice(0, 3) : [],
        customers: [],
        suppliers: [],
      };
    }
    return {
      products: can('products')
        ? products.filter(
            (p) =>
              p.name.toLowerCase().includes(q) ||
              p.sku.toLowerCase().includes(q) ||
              p.genericName.toLowerCase().includes(q)
          ).slice(0, 5)
        : [],
      orders: can('orders')
        ? orders.filter((o) => o.orderNumber.toLowerCase().includes(q)).slice(0, 4)
        : [],
      prescriptions: can('prescriptions')
        ? prescriptions.filter(
            (r) => r.rxNumber.toLowerCase().includes(q) || r.doctorName.toLowerCase().includes(q)
          ).slice(0, 4)
        : [],
      customers: can('customers')
        ? customers.filter(
            (c) => c.name.toLowerCase().includes(q) || c.customerCode.toLowerCase().includes(q)
          ).slice(0, 3)
        : [],
      suppliers: can('suppliers')
        ? suppliers.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 3)
        : [],
    };
  }, [query, products, orders, prescriptions, customers, suppliers, can]);

  if (!open) return null;

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <div
      className="fixed inset-0 z-[85] bg-on-surface/40 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/40 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant/30 bg-surface-container-low">
          <span className="material-symbols-outlined text-primary text-[20px]">search</span>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search medicines, SKUs, orders (MED-...), RX numbers, patients, suppliers..."
            className="flex-1 bg-transparent text-on-surface font-body-lg focus:outline-none placeholder:text-outline"
          />
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm hover:bg-surface-container-high"
          >
            ESC
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-3 space-y-4">
          {results.products.length > 0 && (
            <div>
              <div className="px-2 pb-1 font-label-sm text-outline uppercase tracking-wider">Medicines & Devices</div>
              {results.products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => go(`/products/${p.id}`)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface-container-low text-left transition-colors"
                >
                  <div>
                    <div className="font-title-md text-body-md text-on-surface">{p.name}</div>
                    <div className="font-body-sm text-on-surface-variant">{p.sku} • {p.genericName}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-title-md text-primary text-body-sm">{formatINR(p.sellingPrice)}</span>
                    <span className="block font-label-sm text-[10px] text-outline">{p.schedule}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {results.orders.length > 0 && (
            <div>
              <div className="px-2 pb-1 font-label-sm text-outline uppercase tracking-wider">Orders</div>
              {results.orders.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => go(`/orders/${o.id}`)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface-container-low text-left transition-colors"
                >
                  <div>
                    <div className="font-title-md text-body-md text-on-surface">{o.orderNumber}</div>
                    <div className="font-body-sm text-on-surface-variant">{o.shippingAddress.city} • {o.paymentMethod}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-title-md text-body-sm text-on-surface">{formatINR(o.totalAmount)}</span>
                    <span className="block font-label-sm text-[10px] text-primary">{o.status}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {results.prescriptions.length > 0 && (
            <div>
              <div className="px-2 pb-1 font-label-sm text-outline uppercase tracking-wider">Prescriptions</div>
              {results.prescriptions.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => go(`/prescriptions/${r.id}`)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface-container-low text-left transition-colors"
                >
                  <div>
                    <div className="font-title-md text-body-md text-on-surface">{r.rxNumber}</div>
                    <div className="font-body-sm text-on-surface-variant">{r.doctorName} • {r.clinicName}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm">
                    {r.status}
                  </span>
                </button>
              ))}
            </div>
          )}

          {results.customers.length > 0 && (
            <div>
              <div className="px-2 pb-1 font-label-sm text-outline uppercase tracking-wider">Customers</div>
              {results.customers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => go(`/customers?selected=${c.id}`)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface-container-low text-left transition-colors"
                >
                  <div>
                    <div className="font-title-md text-body-md text-on-surface">{c.name}</div>
                    <div className="font-body-sm text-on-surface-variant">{c.customerCode} • {c.city}</div>
                  </div>
                  <span className="font-label-sm text-primary">{c.orderCount} Orders</span>
                </button>
              ))}
            </div>
          )}

          {results.suppliers.length > 0 && (
            <div>
              <div className="px-2 pb-1 font-label-sm text-outline uppercase tracking-wider">Suppliers</div>
              {results.suppliers.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => go(`/suppliers?selected=${s.id}`)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface-container-low text-left transition-colors"
                >
                  <div>
                    <div className="font-title-md text-body-md text-on-surface">{s.name}</div>
                    <div className="font-body-sm text-on-surface-variant">{s.city} • GSTIN: {s.gstin}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {results.products.length === 0 &&
            results.orders.length === 0 &&
            results.prescriptions.length === 0 &&
            results.customers.length === 0 &&
            results.suppliers.length === 0 && (
              <div className="py-8 text-center text-on-surface-variant font-body-md">
                No matching records found for "{query}".
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
