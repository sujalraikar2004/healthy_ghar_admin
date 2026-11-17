import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { downloadCsv, formatINR } from '../../utils/formatters';

export function ProductsPage() {
  const navigate = useNavigate();
  const pushToast = useToastStore((s) => s.pushToast);

  const products = usePharmacyStore((s) => s.products);
  const categories = usePharmacyStore((s) => s.categories);
  const brands = usePharmacyStore((s) => s.brands);
  const inventory = usePharmacyStore((s) => s.inventory);
  const activeHubId = usePharmacyStore((s) => s.activeHubId);
  const can = usePharmacyStore((s) => s.can);
  const archiveProduct = usePharmacyStore((s) => s.archiveProduct);
  const bulkUpdateProductStatus = usePharmacyStore((s) => s.bulkUpdateProductStatus);
  const saveProduct = usePharmacyStore((s) => s.saveProduct);

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('ALL');
  const [brandFilter, setBrandFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Draft' | 'Archived'>('Active');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'In Stock' | 'Low Stock' | 'Out of Stock'>('ALL');
  const [scheduleFilter, setScheduleFilter] = useState('ALL');
  const [priceFilter, setPriceFilter] = useState<'ALL' | 'UNDER_200' | '200_1000' | 'OVER_1000'>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'price_asc' | 'price_desc' | 'stock_asc'>('name');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [archiveTargetId, setArchiveTargetId] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<{
    fileName: string;
    imported: number;
    errors: string[];
  } | null>(null);

  const getProductStock = (productId: string) =>
    inventory
      .filter((i) => i.productId === productId && (activeHubId === 'ALL' || i.warehouseId === activeHubId))
      .reduce((s, i) => s + i.availableQty, 0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .map((p) => ({ product: p, stock: getProductStock(p.id) }))
      .filter(({ product: p, stock }) => {
        if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
        if (catFilter !== 'ALL' && p.categoryId !== catFilter) return false;
        if (brandFilter !== 'ALL' && p.brandId !== brandFilter) return false;
        if (scheduleFilter !== 'ALL' && p.schedule !== scheduleFilter) return false;
        if (stockFilter === 'In Stock' && stock <= p.reorderLevel) return false;
        if (stockFilter === 'Low Stock' && (stock === 0 || stock > p.reorderLevel)) return false;
        if (stockFilter === 'Out of Stock' && stock > 0) return false;
        if (priceFilter === 'UNDER_200' && p.sellingPrice >= 200) return false;
        if (priceFilter === '200_1000' && (p.sellingPrice < 200 || p.sellingPrice > 1000)) return false;
        if (priceFilter === 'OVER_1000' && p.sellingPrice <= 1000) return false;
        if (q) {
          const hay = `${p.name} ${p.sku} ${p.genericName} ${p.composition} ${p.barcode}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.product.sellingPrice - b.product.sellingPrice;
        if (sortBy === 'price_desc') return b.product.sellingPrice - a.product.sellingPrice;
        if (sortBy === 'stock_asc') return a.stock - b.stock;
        return a.product.name.localeCompare(b.product.name);
      });
  }, [products, inventory, activeHubId, search, catFilter, brandFilter, statusFilter, stockFilter, scheduleFilter, priceFilter, sortBy]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const stats = useMemo(() => {
    const active = products.filter((p) => p.status === 'Active');
    const rxCount = active.filter((p) => p.prescriptionRequired).length;
    const coldChain = active.filter((p) => p.storageCondition === 'Cold Chain (2-8°C)').length;
    const lowStock = active.filter((p) => getProductStock(p.id) <= p.reorderLevel).length;
    return { total: active.length, rxCount, coldChain, lowStock };
  }, [products, inventory, activeHubId]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAllPage = () => {
    const pageIds = paged.map((r) => r.product.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleBulkStatus = (status: 'Active' | 'Draft' | 'Archived') => {
    const res = bulkUpdateProductStatus(selectedIds, status);
    pushToast({ type: res.ok ? 'success' : 'error', title: res.ok ? 'Bulk Update Applied' : 'Blocked', description: res.message });
    if (res.ok) setSelectedIds([]);
  };

  const handleExportCsv = () => {
    downloadCsv(
      'healthy-ghar-product-catalogue.csv',
      ['ID', 'Name', 'SKU', 'Generic', 'Schedule', 'MRP', 'Selling Price', 'GST %', 'HSN', 'Hub Stock', 'Status'],
      filtered.map(({ product: p, stock }) => [
        p.id,
        p.name,
        p.sku,
        p.genericName,
        p.schedule,
        p.mrp,
        p.sellingPrice,
        p.gstRate,
        p.hsnCode,
        stock,
        p.status,
      ])
    );
    pushToast({ type: 'success', title: 'Catalogue Exported', description: `Exported ${filtered.length} SKUs to CSV.` });
  };

  const parseCsvLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        out.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };

  const handleDownloadTemplate = () => {
    downloadCsv(
      'healthy-ghar-import-template.csv',
      ['Name', 'SKU', 'GenericName', 'Composition', 'Strength', 'DosageForm', 'PackSize', 'CategoryId', 'BrandId', 'MRP', 'SellingPrice', 'CostPrice', 'GST', 'HSN', 'Schedule', 'StorageCondition', 'ReorderLevel'],
      [
        ['Azithral 500mg Tablet', 'MED-AZI-500-NEW', 'Azithromycin', 'Azithromycin IP 500mg', '500mg', 'Tablet', 'Strip of 5 Tablets', categories[0]?.id || 'CAT-01', brands[0]?.id || 'BRD-01', 132, 118, 84, 12, '30042019', 'Schedule H', 'Room Temp (<25°C)', 120],
      ]
    );
    pushToast({ type: 'info', title: 'CSV Template Downloaded', description: 'Fill rows following the header order and upload via Import CSV.' });
  };

  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || '').replace(/\r\n/g, '\n').trim();
      const lines = raw.split('\n').filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        pushToast({ type: 'error', title: 'Empty CSV', description: 'CSV file must contain a header row and at least one product row.' });
        return;
      }

      const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
      const col = (row: string[], ...names: string[]) => {
        for (const n of names) {
          const idx = headers.indexOf(n.toLowerCase().replace(/[^a-z0-9]/g, ''));
          if (idx !== -1) return row[idx] || '';
        }
        return '';
      };

      let imported = 0;
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const vals = parseCsvLine(lines[i]);
        const name = col(vals, 'Name', 'ProductName');
        const sku = col(vals, 'SKU').toUpperCase();
        const genericName = col(vals, 'GenericName', 'Generic') || name;
        const composition = col(vals, 'Composition') || genericName;
        const strength = col(vals, 'Strength') || 'Standard';
        const dosageForm = col(vals, 'DosageForm') || 'Tablet';
        const packSize = col(vals, 'PackSize') || 'Pack of 1';
        const categoryId = categories.some((c) => c.id === col(vals, 'CategoryId'))
          ? col(vals, 'CategoryId')
          : categories[0]?.id || 'CAT-01';
        const brandId = brands.some((b) => b.id === col(vals, 'BrandId'))
          ? col(vals, 'BrandId')
          : brands[0]?.id || 'BRD-01';
        const mrp = Number(col(vals, 'MRP'));
        const sellingPrice = Number(col(vals, 'SellingPrice', 'Price'));
        const costPrice = Number(col(vals, 'CostPrice')) || Math.round(sellingPrice * 0.7 * 100) / 100;
        const gstRaw = Number(col(vals, 'GST', 'GSTRate'));
        const gstRate: 0 | 5 | 12 | 18 = gstRaw === 0 || gstRaw === 5 || gstRaw === 18 ? gstRaw : 12;
        const hsnCode = col(vals, 'HSN', 'HSNCode') || '30049099';
        const schedRaw = col(vals, 'Schedule');
        const schedule =
          schedRaw === 'Schedule H' || schedRaw === 'Schedule H1' || schedRaw === 'Schedule X' || schedRaw === 'Medical Device'
            ? schedRaw
            : 'OTC';
        const storageRaw = col(vals, 'StorageCondition');
        const storageCondition =
          storageRaw === 'Cold Chain (2-8°C)' || storageRaw === 'Cool & Dry (<20°C)' || storageRaw === 'Protect from Light'
            ? storageRaw
            : 'Room Temp (<25°C)';
        const reorderLevel = Math.max(0, Number(col(vals, 'ReorderLevel')) || 100);

        if (!name || !sku) {
          errors.push(`Row ${i + 1}: Missing required Name or SKU.`);
          continue;
        }
        if (!Number.isFinite(mrp) || mrp <= 0 || !Number.isFinite(sellingPrice) || sellingPrice <= 0) {
          errors.push(`Row ${i + 1} (${sku}): MRP and SellingPrice must be valid positive numbers.`);
          continue;
        }
        if (sellingPrice > mrp) {
          errors.push(`Row ${i + 1} (${sku}): SellingPrice (₹${sellingPrice}) cannot exceed MRP (₹${mrp}).`);
          continue;
        }

        const brand = brands.find((b) => b.id === brandId);
        const res = saveProduct({
          name,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          sku,
          barcode: `89012345${Math.floor(10000 + Math.random() * 89999)}`,
          shortDescription: `${genericName} (${strength}) — ${packSize}`,
          description: `${name} contains ${composition}. Storage: ${storageCondition}.`,
          categoryId,
          brandId,
          manufacturer: brand?.manufacturerName || 'Verified Pharma Labs',
          genericName,
          composition,
          strength,
          dosageForm,
          packSize,
          mrp,
          sellingPrice,
          costPrice,
          gstRate,
          hsnCode,
          images: [],
          prescriptionRequired: schedule === 'Schedule H' || schedule === 'Schedule H1' || schedule === 'Schedule X',
          schedule,
          storageCondition,
          isReturnable: storageCondition !== 'Cold Chain (2-8°C)' && schedule !== 'Schedule X',
          dpcoCapped: false,
          reorderLevel,
          status: 'Active',
          variants: [
            {
              id: `VAR-CSV-${i}`,
              label: packSize,
              skuSuffix: 'STD',
              mrp,
              sellingPrice,
              costPrice,
              packSize,
            },
          ],
        });

        if (res.ok) imported++;
        else errors.push(`Row ${i + 1} (${sku}): ${res.message}`);
      }

      setImportSummary({ fileName: file.name, imported, errors });
      pushToast({
        type: imported > 0 ? 'success' : 'error',
        title: imported > 0 ? `Imported ${imported} SKU(s)` : 'CSV Import Failed',
        description: errors.length > 0 ? `${errors.length} row(s) had validation issues.` : `${file.name} processed cleanly.`,
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div>
          <span className="font-label-sm text-primary uppercase tracking-wider">CDSCO Master Formulary</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Medicine & Healthcare Catalogue</h1>
          <p className="font-body-md text-on-surface-variant">
            Manage formulations, generic salts, DPCO price caps, HSN/GST slabs, and Schedule H/H1/X flags
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {can('products', 'export') && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container-lowest text-on-surface shadow-sm font-title-md text-body-sm hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Export CSV</span>
            </button>
          )}
          {can('products', 'create') && (
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-lowest text-on-surface shadow-sm font-title-md text-body-sm hover:bg-surface-container"
              title="Download CSV Import Template"
            >
              <span className="material-symbols-outlined text-[18px]">description</span>
              <span>CSV Template</span>
            </button>
          )}
          {can('products', 'create') && (
            <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container-lowest text-on-surface shadow-sm font-title-md text-body-sm hover:bg-surface-container cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              <span>Import CSV</span>
              <input type="file" accept=".csv" onChange={handleImportCsv} className="hidden" />
            </label>
          )}
          {can('products', 'create') && (
            <button
              type="button"
              onClick={() => navigate('/products/new')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary shadow-sm font-title-md text-body-sm hover:bg-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Add Medicine</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm">
          <span className="font-label-sm text-on-surface-variant uppercase">Active Catalogue SKUs</span>
          <div className="font-metric-num text-on-surface mt-1 tabular-nums">{stats.total}</div>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm">
          <span className="font-label-sm text-tertiary uppercase">Rx Required (H / H1 / X)</span>
          <div className="font-metric-num text-tertiary mt-1 tabular-nums">{stats.rxCount}</div>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm">
          <span className="font-label-sm text-primary uppercase">Cold-Chain (2–8°C)</span>
          <div className="font-metric-num text-primary mt-1 tabular-nums">{stats.coldChain}</div>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm">
          <span className="font-label-sm text-error uppercase">Low / Reorder Alert</span>
          <div className="font-metric-num text-error mt-1 tabular-nums">{stats.lowStock}</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
          <div className="xl:col-span-2 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, SKU, generic molecule, composition..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary-container"
            />
          </div>

          <select
            value={catFilter}
            onChange={(e) => {
              setCatFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 px-2.5 rounded-lg bg-surface-container-low text-body-sm text-on-surface"
          >
            <option value="ALL">All Categories</option>
            {categories.filter((c) => c.status === 'Active').map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={brandFilter}
            onChange={(e) => {
              setBrandFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 px-2.5 rounded-lg bg-surface-container-low text-body-sm text-on-surface"
          >
            <option value="ALL">All Brands</option>
            {brands.filter((b) => b.status === 'Active').map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <select
            value={scheduleFilter}
            onChange={(e) => {
              setScheduleFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 px-2.5 rounded-lg bg-surface-container-low text-body-sm text-on-surface"
          >
            <option value="ALL">All Schedules</option>
            <option value="OTC">OTC</option>
            <option value="Schedule H">Schedule H</option>
            <option value="Schedule H1">Schedule H1</option>
            <option value="Schedule X">Schedule X</option>
            <option value="Medical Device">Medical Device</option>
          </select>

          <select
            value={stockFilter}
            onChange={(e) => {
              setStockFilter(e.target.value as typeof stockFilter);
              setPage(1);
            }}
            className="h-9 px-2.5 rounded-lg bg-surface-container-low text-body-sm text-on-surface"
          >
            <option value="ALL">All Stock Levels</option>
            <option value="In Stock">Healthy Stock</option>
            <option value="Low Stock">Low Stock (&le; Reorder)</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {(['Active', 'Draft', 'Archived', 'ALL'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-full font-label-md text-label-md transition-colors ${
                  statusFilter === st
                    ? 'bg-primary-container text-on-primary'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {st === 'ALL' ? 'All Statuses' : st}
              </button>
            ))}
            <select
              value={priceFilter}
              onChange={(e) => {
                setPriceFilter(e.target.value as typeof priceFilter);
                setPage(1);
              }}
              className="h-8 px-2.5 rounded-lg bg-surface-container-low text-body-sm text-on-surface"
            >
              <option value="ALL">All Price Ranges</option>
              <option value="UNDER_200">Under ₹200</option>
              <option value="200_1000">₹200 – ₹1,000</option>
              <option value="OVER_1000">Above ₹1,000</option>
            </select>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setCatFilter('ALL');
                setBrandFilter('ALL');
                setScheduleFilter('ALL');
                setStockFilter('ALL');
                setPriceFilter('ALL');
                setStatusFilter('Active');
                setPage(1);
              }}
              className="px-2.5 py-1 rounded-lg text-primary font-label-md hover:underline"
            >
              Reset Filters
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-label-sm text-on-surface-variant">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="h-8 px-2 rounded bg-surface-container-low text-body-sm text-on-surface"
            >
              <option value="name">Name (A-Z)</option>
              <option value="price_asc">Price (Low → High)</option>
              <option value="price_desc">Price (High → Low)</option>
              <option value="stock_asc">Stock (Lowest First)</option>
            </select>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-primary-fixed/40 border border-primary-container/25">
            <span className="font-title-md text-body-sm text-on-primary-fixed">
              {selectedIds.length} SKU(s) selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleBulkStatus('Active')}
                className="px-3 py-1 rounded-lg bg-primary-container text-on-primary font-label-md"
              >
                Set Active
              </button>
              <button
                type="button"
                onClick={() => handleBulkStatus('Draft')}
                className="px-3 py-1 rounded-lg bg-surface-container-lowest text-on-surface font-label-md"
              >
                Move to Draft
              </button>
              <button
                type="button"
                onClick={() => handleBulkStatus('Archived')}
                className="px-3 py-1 rounded-lg bg-error text-on-error font-label-md"
              >
                Archive Selected
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Product Data Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant font-label-sm uppercase tracking-wider h-10">
                <th className="px-4 py-2 w-10">
                  <input
                    type="checkbox"
                    checked={paged.length > 0 && paged.every((r) => selectedIds.includes(r.product.id))}
                    onChange={toggleSelectAllPage}
                    className="w-4 h-4 accent-[#0f766e]"
                  />
                </th>
                <th className="px-3 py-2">Product & Salt Composition</th>
                <th className="px-3 py-2">SKU / HSN</th>
                <th className="px-3 py-2">Category & Brand</th>
                <th className="px-3 py-2">Schedule / Rx</th>
                <th className="px-3 py-2">Pricing (MRP / Sale)</th>
                <th className="px-3 py-2">Available Stock</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-table-data">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-on-surface-variant font-body-md">
                    No medicines match your current filter criteria.
                  </td>
                </tr>
              ) : (
                paged.map(({ product: p, stock }) => {
                  const cat = categories.find((c) => c.id === p.categoryId);
                  const brand = brands.find((b) => b.id === p.brandId);
                  const low = stock <= p.reorderLevel;
                  return (
                    <tr key={p.id} className="border-b border-outline-variant/20 hover:bg-surface-container-low/70 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(p.id)}
                          onChange={() => toggleSelect(p.id)}
                          className="w-4 h-4 accent-[#0f766e]"
                        />
                      </td>
                      <td className="px-3 py-3 max-w-[280px]">
                        <div className="flex items-center gap-2.5">
                          {p.images?.[0] ? (
                            <img
                              src={p.images[0]}
                              alt={p.name}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                              className="w-9 h-9 rounded-lg object-cover bg-surface-container-low shrink-0 border border-outline-variant/40"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-surface-container-low flex items-center justify-center shrink-0 text-primary">
                              <span className="material-symbols-outlined text-[18px]">medication</span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => navigate(`/products/${p.id}`)}
                              className="font-title-md text-primary hover:underline text-left block truncate w-full"
                            >
                              {p.name}
                            </button>
                            <div className="font-body-sm text-on-surface-variant truncate">
                              {p.genericName} • {p.packSize}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-mono text-[12px] text-on-surface">{p.sku}</div>
                        <div className="font-label-sm text-outline">HSN {p.hsnCode} • {p.gstRate}% GST</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-body-sm text-on-surface font-medium">{cat?.name || 'General'}</div>
                        <div className="font-body-sm text-on-surface-variant">{brand?.name || p.manufacturer}</div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full font-label-sm ${
                            p.schedule === 'Schedule H1' || p.schedule === 'Schedule X'
                              ? 'bg-error-container text-on-error-container'
                              : p.schedule === 'Schedule H'
                              ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                              : 'bg-surface-container-high text-primary'
                          }`}
                        >
                          {p.schedule}
                        </span>
                        {p.storageCondition === 'Cold Chain (2-8°C)' && (
                          <span className="block font-label-sm text-primary mt-0.5">2–8°C Cold Chain</span>
                        )}
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        <div className="font-title-md text-on-surface">{formatINR(p.sellingPrice)}</div>
                        <div className="font-body-sm text-outline line-through">{formatINR(p.mrp)}</div>
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full font-label-sm ${
                            stock === 0
                              ? 'bg-error-container text-on-error-container'
                              : low
                              ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                              : 'bg-primary-fixed/60 text-on-primary-fixed'
                          }`}
                        >
                          {stock} units
                        </span>
                        <span className="block font-label-sm text-outline mt-0.5">Min: {p.reorderLevel}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full font-label-sm ${
                            p.status === 'Active'
                              ? 'bg-surface-container-high text-primary'
                              : p.status === 'Draft'
                              ? 'bg-surface-container text-on-surface-variant'
                              : 'bg-error-container/60 text-on-error-container'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => navigate(`/products/${p.id}`)}
                            className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-primary"
                            title="View Dossier"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>
                          {can('products', 'edit') && (
                            <button
                              type="button"
                              onClick={() => navigate(`/products/${p.id}/edit`)}
                              className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-primary"
                              title="Edit Medicine"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                          )}
                          {can('products', 'delete') && p.status !== 'Archived' && (
                            <button
                              type="button"
                              onClick={() => setArchiveTargetId(p.id)}
                              className="p-1.5 rounded hover:bg-error-container/50 text-on-surface-variant hover:text-error"
                              title="Archive Medicine"
                            >
                              <span className="material-symbols-outlined text-[18px]">archive</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-body-sm text-on-surface-variant">
          <span>
            Showing {paged.length} of {filtered.length} product(s)
          </span>
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
        open={Boolean(archiveTargetId)}
        title="Archive Medicine Formulation?"
        description="Archiving removes this SKU from active customer ordering while preserving historical orders, batches, and GST invoices."
        confirmLabel="Archive SKU"
        variant="danger"
        onCancel={() => setArchiveTargetId(null)}
        onConfirm={() => {
          if (archiveTargetId) {
            const res = archiveProduct(archiveTargetId);
            pushToast({ type: res.ok ? 'success' : 'error', title: res.ok ? 'SKU Archived' : 'Error', description: res.message });
          }
          setArchiveTargetId(null);
        }}
      />

      {importSummary && (
        <div className="fixed inset-0 z-[85] bg-on-surface/40 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-title-lg text-on-surface">CSV Import Summary</h3>
                <p className="font-body-sm text-on-surface-variant">{importSummary.fileName}</p>
              </div>
              <button
                type="button"
                onClick={() => setImportSummary(null)}
                className="p-1 rounded-lg hover:bg-surface-container"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-primary-fixed/50 text-on-primary-fixed">
                <div className="font-label-sm uppercase">SKUs Imported</div>
                <div className="font-headline-md tabular-nums">{importSummary.imported}</div>
              </div>
              <div className="p-3 rounded-xl bg-error-container/60 text-on-error-container">
                <div className="font-label-sm uppercase">Rows Rejected</div>
                <div className="font-headline-md tabular-nums">{importSummary.errors.length}</div>
              </div>
            </div>
            {importSummary.errors.length > 0 && (
              <div className="max-h-44 overflow-y-auto custom-scrollbar space-y-1.5 bg-surface-container-low p-3 rounded-xl text-body-sm text-error">
                {importSummary.errors.map((err, idx) => (
                  <div key={idx}>• {err}</div>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setImportSummary(null)}
                className="px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md text-body-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
