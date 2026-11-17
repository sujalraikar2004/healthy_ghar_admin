import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';
import { downloadCsv, formatINR, formatINRCompact } from '../../utils/formatters';

const COLORS = ['#005c55', '#0f766e', '#2dd4bf', '#944a00', '#64748b'];

type DateRangeKey = '7d' | '30d' | '90d' | '365d' | 'ALL';

export function SalesAnalyticsPage() {
  const pushToast = useToastStore((s) => s.pushToast);

  const orders = usePharmacyStore((s) => s.orders);
  const products = usePharmacyStore((s) => s.products);
  const categories = usePharmacyStore((s) => s.categories);
  const brands = usePharmacyStore((s) => s.brands);
  const prescriptions = usePharmacyStore((s) => s.prescriptions);
  const purchaseOrders = usePharmacyStore((s) => s.purchaseOrders);
  const suppliers = usePharmacyStore((s) => s.suppliers);
  const can = usePharmacyStore((s) => s.can);

  const [range, setRange] = useState<DateRangeKey>('30d');

  const { periodOrders, prevOrders } = useMemo(() => {
    const nonCancelled = orders.filter((o) => o.status !== 'Cancelled');
    if (range === 'ALL') {
      return { periodOrders: nonCancelled, prevOrders: [] as typeof nonCancelled };
    }
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
    const now = Date.now();
    const start = now - days * 86400000;
    const prevStart = start - days * 86400000;
    return {
      periodOrders: nonCancelled.filter((o) => new Date(o.createdAt).getTime() >= start),
      prevOrders: nonCancelled.filter((o) => {
        const t = new Date(o.createdAt).getTime();
        return t >= prevStart && t < start;
      }),
    };
  }, [orders, range]);

  const metrics = useMemo(() => {
    const gmv = periodOrders.reduce((s, o) => s + o.totalAmount, 0);
    const prevGmv = prevOrders.reduce((s, o) => s + o.totalAmount, 0);
    const gmvDeltaPct =
      prevGmv > 0 ? Math.round(((gmv - prevGmv) / prevGmv) * 100) : range === 'ALL' ? null : gmv > 0 ? 100 : 0;

    const taxTotal = periodOrders.reduce((s, o) => s + o.taxAmount, 0);
    const aov = periodOrders.length > 0 ? Math.round(gmv / periodOrders.length) : 0;
    const prevAov = prevOrders.length > 0 ? Math.round(prevGmv / prevOrders.length) : 0;
    const aovDeltaPct = prevAov > 0 ? Math.round(((aov - prevAov) / prevAov) * 100) : null;

    const rxShare =
      periodOrders.length > 0
        ? Math.round((periodOrders.filter((o) => o.prescriptionRequired).length / periodOrders.length) * 100)
        : 0;
    return { gmv, gmvDeltaPct, taxTotal, aov, aovDeltaPct, rxShare, count: periodOrders.length };
  }, [periodOrders, prevOrders, range]);

  const categoryRevenue = useMemo(() => {
    const map: Record<string, number> = {};
    for (const o of periodOrders) {
      for (const item of o.items) {
        const prod = products.find((p) => p.id === item.productId);
        const cat = categories.find((c) => c.id === prod?.categoryId)?.name || 'Other';
        map[cat] = (map[cat] || 0) + item.lineTotal;
      }
    }
    return Object.entries(map)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [periodOrders, products, categories]);

  const paymentMix = useMemo(() => {
    const map: Record<string, number> = {};
    for (const o of periodOrders) {
      map[o.paymentMethod] = (map[o.paymentMethod] || 0) + o.totalAmount;
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [periodOrders]);

  const topProducts = useMemo(() => {
    const map: Record<string, { id: string; name: string; sku: string; units: number; revenue: number }> = {};
    for (const o of periodOrders) {
      for (const it of o.items) {
        if (!map[it.productId]) {
          map[it.productId] = { id: it.productId, name: it.productName, sku: it.sku, units: 0, revenue: 0 };
        }
        map[it.productId].units += it.quantity;
        map[it.productId].revenue += it.lineTotal;
      }
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [periodOrders]);

  const brandPerformance = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; units: number }> = {};
    for (const o of periodOrders) {
      for (const it of o.items) {
        const prod = products.find((p) => p.id === it.productId);
        const brand = brands.find((b) => b.id === prod?.brandId)?.name || prod?.manufacturer || 'Other';
        if (!map[brand]) map[brand] = { name: brand, revenue: 0, units: 0 };
        map[brand].revenue += it.lineTotal;
        map[brand].units += it.quantity;
      }
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  }, [periodOrders, products, brands]);

  const rxAnalytics = useMemo(() => {
    const total = prescriptions.length;
    const approved = prescriptions.filter((r) => r.status === 'Approved').length;
    const rejected = prescriptions.filter((r) => r.status === 'Rejected').length;
    const pending = prescriptions.filter(
      (r) => r.status === 'Pending Review' || r.status === 'Under Review' || r.status === 'Uploaded' || r.status === 'Clarification Requested'
    ).length;
    const h1Count = prescriptions.filter((r) => r.containsScheduleH1).length;
    return {
      total,
      approved,
      rejected,
      pending,
      h1Count,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
    };
  }, [prescriptions]);

  const supplierProcurement = useMemo(() => {
    const map: Record<string, { name: string; poCount: number; totalSpend: number }> = {};
    for (const po of purchaseOrders) {
      if (po.status === 'Rejected') continue;
      const supName = suppliers.find((s) => s.id === po.supplierId)?.name || po.supplierId;
      if (!map[po.supplierId]) map[po.supplierId] = { name: supName, poCount: 0, totalSpend: 0 };
      map[po.supplierId].poCount += 1;
      map[po.supplierId].totalSpend += po.totalAmount;
    }
    return Object.values(map).sort((a, b) => b.totalSpend - a.totalSpend);
  }, [purchaseOrders, suppliers]);

  const handleExportCategory = () => {
    downloadCsv(
      `healthy-ghar-category-sales-${range}.csv`,
      ['Category', 'Revenue (INR)'],
      categoryRevenue.map((r) => [r.name, r.revenue])
    );
    pushToast({ type: 'success', title: 'Category Sales CSV Exported' });
  };

  const handleExportProducts = () => {
    downloadCsv(
      `healthy-ghar-product-performance-${range}.csv`,
      ['SKU', 'Product', 'Units Sold', 'Revenue (INR)'],
      topProducts.map((p) => [p.sku, p.name, p.units, p.revenue])
    );
    pushToast({ type: 'success', title: 'Product Performance CSV Exported' });
  };

  const handleExportProcurement = () => {
    downloadCsv(
      'healthy-ghar-supplier-procurement.csv',
      ['Supplier', 'Purchase Orders', 'Total Spend (INR)'],
      supplierProcurement.map((s) => [s.name, s.poCount, s.totalSpend])
    );
    pushToast({ type: 'success', title: 'Supplier Procurement CSV Exported' });
  };

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <span className="font-label-sm text-primary uppercase tracking-wider">Revenue, Rx & Procurement Intelligence</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Sales & Financial Analytics</h1>
          <p className="font-body-md text-on-surface-variant">
            Period comparisons, product & brand revenue, prescription SLA & supplier procurement analytics
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <div className="flex flex-wrap rounded-lg bg-surface-container-lowest p-1 shadow-sm gap-0.5">
            {(['7d', '30d', '90d', '365d', 'ALL'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setRange(k)}
                className={`px-3 py-1 rounded-md font-label-md whitespace-nowrap ${
                  range === k ? 'bg-primary-container text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {k === 'ALL' ? 'All Time' : k.toUpperCase()}
              </button>
            ))}
          </div>
          {can('analytics', 'export') && (
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container-lowest text-on-surface shadow-sm font-title-md text-body-sm hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              <span>Print Report</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Strip with Period Comparisons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm">
          <span className="font-label-sm text-primary uppercase">Net GMV ({range === 'ALL' ? 'All' : range})</span>
          <div className="font-metric-num text-primary mt-1 tabular-nums">{formatINRCompact(metrics.gmv)}</div>
          <div className="text-[11px] text-on-surface-variant mt-1">
            {metrics.count} orders
            {metrics.gmvDeltaPct !== null && (
              <span className={`ml-1.5 font-semibold ${metrics.gmvDeltaPct >= 0 ? 'text-primary' : 'text-error'}`}>
                ({metrics.gmvDeltaPct >= 0 ? '+' : ''}{metrics.gmvDeltaPct}% vs prev)
              </span>
            )}
          </div>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm">
          <span className="font-label-sm text-on-surface-variant uppercase">Average Order Value</span>
          <div className="font-metric-num text-on-surface mt-1 tabular-nums">{formatINR(metrics.aov)}</div>
          {metrics.aovDeltaPct !== null && (
            <div className={`text-[11px] mt-1 font-semibold ${metrics.aovDeltaPct >= 0 ? 'text-primary' : 'text-error'}`}>
              {metrics.aovDeltaPct >= 0 ? '+' : ''}{metrics.aovDeltaPct}% vs prior window
            </div>
          )}
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm">
          <span className="font-label-sm text-on-surface-variant uppercase">Included GST Collected</span>
          <div className="font-metric-num text-on-surface mt-1 tabular-nums">{formatINRCompact(metrics.taxTotal)}</div>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm">
          <span className="font-label-sm text-tertiary uppercase">Rx Order Share</span>
          <div className="font-metric-num text-tertiary mt-1 tabular-nums">{metrics.rxShare}%</div>
        </div>
      </div>

      {/* Category & Payment Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        <div className="lg:col-span-7 bg-surface-container-lowest p-5 rounded-xl shadow-sm">
          <h3 className="font-title-lg text-on-surface mb-4">Revenue by Therapeutic Category</h3>
          {categoryRevenue.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-body-sm text-on-surface-variant">
              No category revenue data in the selected date window.
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val) => formatINR(Number(val) || 0)} />
                  <Bar dataKey="revenue" fill="#005c55" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-surface-container-lowest p-5 rounded-xl shadow-sm">
          <h3 className="font-title-lg text-on-surface mb-4">Payment Mode Distribution</h3>
          {paymentMix.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-body-sm text-on-surface-variant">
              No payment mix data in the selected date window.
            </div>
          ) : (
            <>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={paymentMix} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                      {paymentMix.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => formatINR(Number(val) || 0)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-2 text-xs">
                {paymentMix.map((m, idx) => (
                  <div key={m.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span>{m.name}: {formatINRCompact(m.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Product & Brand Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        <div className="lg:col-span-7 bg-surface-container-lowest p-5 rounded-xl shadow-sm space-y-3">
          <h3 className="font-title-lg text-on-surface">Top Performing Formulations</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant font-label-sm uppercase h-9">
                  <th className="px-3 py-2">Medicine & SKU</th>
                  <th className="px-3 py-2 text-right">Units</th>
                  <th className="px-3 py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-body-sm">
                {topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-on-surface-variant">
                      No product sales recorded in this date window.
                    </td>
                  </tr>
                ) : (
                  topProducts.map((p) => (
                    <tr key={p.id}>
                      <td className="px-3 py-2.5">
                        <div className="font-title-md text-on-surface">{p.name}</div>
                        <div className="font-mono text-[11px] text-outline">{p.sku}</div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{p.units}</td>
                      <td className="px-3 py-2.5 text-right font-title-md text-primary tabular-nums">{formatINR(p.revenue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-5 bg-surface-container-lowest p-5 rounded-xl shadow-sm space-y-3">
          <h3 className="font-title-lg text-on-surface">Brand Principal Performance</h3>
          <div className="space-y-2.5">
            {brandPerformance.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">No brand sales recorded in this window.</p>
            ) : (
              brandPerformance.map((b) => (
                <div key={b.name} className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between">
                  <div>
                    <div className="font-title-md text-on-surface">{b.name}</div>
                    <div className="text-[11px] text-on-surface-variant">{b.units} pack(s) dispensed</div>
                  </div>
                  <div className="font-title-md text-primary tabular-nums">{formatINR(b.revenue)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Rx Clinical & Supplier Procurement Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        <div className="lg:col-span-5 bg-surface-container-lowest p-5 rounded-xl shadow-sm space-y-3">
          <h3 className="font-title-lg text-on-surface">Prescription Clinical Governance</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-surface-container-low">
              <div className="font-label-sm text-on-surface-variant">Approval Rate</div>
              <div className="font-headline-sm text-primary tabular-nums">{rxAnalytics.approvalRate}%</div>
            </div>
            <div className="p-3 rounded-xl bg-surface-container-low">
              <div className="font-label-sm text-on-surface-variant">Pending / Clarification</div>
              <div className="font-headline-sm text-tertiary tabular-nums">{rxAnalytics.pending}</div>
            </div>
            <div className="p-3 rounded-xl bg-surface-container-low">
              <div className="font-label-sm text-on-surface-variant">Schedule H1 Prescriptions</div>
              <div className="font-headline-sm text-on-surface tabular-nums">{rxAnalytics.h1Count}</div>
            </div>
            <div className="p-3 rounded-xl bg-surface-container-low">
              <div className="font-label-sm text-on-surface-variant">Rejected Rx</div>
              <div className="font-headline-sm text-error tabular-nums">{rxAnalytics.rejected}</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-surface-container-lowest p-5 rounded-xl shadow-sm space-y-3">
          <h3 className="font-title-lg text-on-surface">Supplier Procurement Spend</h3>
          <div className="space-y-2">
            {supplierProcurement.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">No approved or received purchase orders logged yet.</p>
            ) : (
              supplierProcurement.map((s) => (
                <div key={s.name} className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between gap-2">
                  <div>
                    <div className="font-title-md text-on-surface">{s.name}</div>
                    <div className="text-[11px] text-on-surface-variant">{s.poCount} approved / received PO(s)</div>
                  </div>
                  <div className="font-title-md text-primary tabular-nums shrink-0">{formatINR(s.totalSpend)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Report Export Center */}
      {can('analytics', 'export') && (
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div>
            <h3 className="font-title-lg text-on-surface">Report Export Center</h3>
            <p className="font-body-sm text-on-surface-variant">
              Download filtered CSV ledgers for GST reconciliation, merchandising & vendor procurement
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCategory}
              className="px-3.5 py-2 rounded-lg bg-surface-container text-on-surface font-label-md hover:bg-surface-container-high"
            >
              Category Sales CSV
            </button>
            <button
              type="button"
              onClick={handleExportProducts}
              className="px-3.5 py-2 rounded-lg bg-surface-container text-on-surface font-label-md hover:bg-surface-container-high"
            >
              Top Products CSV
            </button>
            <button
              type="button"
              onClick={handleExportProcurement}
              className="px-3.5 py-2 rounded-lg bg-primary-container text-on-primary font-label-md hover:bg-primary"
            >
              Supplier Spend CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
