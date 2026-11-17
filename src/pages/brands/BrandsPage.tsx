import React, { useMemo, useState } from 'react';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';
import { Brand } from '../../types';
import { slugify } from '../../utils/formatters';

export function BrandsPage() {
  const pushToast = useToastStore((s) => s.pushToast);
  const brands = usePharmacyStore((s) => s.brands);
  const products = usePharmacyStore((s) => s.products);
  const can = usePharmacyStore((s) => s.can);
  const saveBrand = usePharmacyStore((s) => s.saveBrand);
  const archiveBrand = usePharmacyStore((s) => s.archiveBrand);

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  const [name, setName] = useState('');
  const [manufacturerName, setManufacturerName] = useState('');
  const [country, setCountry] = useState('India');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [description, setDescription] = useState('');
  const [featured, setFeatured] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return brands.filter((b) => {
      if (b.status === 'Archived') return false;
      if (featuredOnly && !b.featured) return false;
      if (q && !`${b.name} ${b.manufacturerName} ${b.licenseNumber}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [brands, search, featuredOnly]);

  const openAdd = () => {
    setEditingBrand(null);
    setName('');
    setManufacturerName('');
    setCountry('India');
    setLicenseNumber('MFG/IN/2026/');
    setDescription('');
    setFeatured(false);
    setDrawerOpen(true);
  };

  const openEdit = (b: Brand) => {
    setEditingBrand(b);
    setName(b.name);
    setManufacturerName(b.manufacturerName);
    setCountry(b.country);
    setLicenseNumber(b.licenseNumber);
    setDescription(b.description);
    setFeatured(b.featured);
    setDrawerOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !manufacturerName.trim()) {
      pushToast({ type: 'error', title: 'Required Fields', description: 'Brand name and legal manufacturer name are required.' });
      return;
    }
    const res = saveBrand(
      {
        name: name.trim(),
        slug: slugify(name),
        manufacturerName: manufacturerName.trim(),
        country: country.trim(),
        licenseNumber: licenseNumber.trim(),
        description: description.trim(),
        featured,
        status: 'Active',
      },
      editingBrand?.id
    );
    pushToast({ type: res.ok ? 'success' : 'error', title: res.ok ? 'Brand Saved' : 'Error', description: res.message });
    if (res.ok) setDrawerOpen(false);
  };

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="font-label-sm text-primary uppercase tracking-wider">Pharmaceutical Principals</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Brands & Manufacturers</h1>
          <p className="font-body-md text-on-surface-variant">
            Manage licensed GMP drug manufacturers and diagnostic device principals
          </p>
        </div>
        {can('brands', 'create') && (
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md text-body-sm hover:bg-primary"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Add Principal Brand</span>
          </button>
        )}
      </div>

      <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative w-full sm:w-auto sm:min-w-[220px] flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search brand, manufacturer, license..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-surface-container-low text-body-sm text-on-surface focus:outline-none"
            />
          </div>
          <label className="flex items-center gap-2 text-body-sm cursor-pointer">
            <input
              type="checkbox"
              checked={featuredOnly}
              onChange={(e) => setFeaturedOnly(e.target.checked)}
              className="w-4 h-4 accent-[#0f766e]"
            />
            <span>Featured Principals Only</span>
          </label>
        </div>

        <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`px-2.5 py-1 rounded text-body-sm font-title-md ${viewMode === 'grid' ? 'bg-surface-container-lowest shadow-sm text-on-surface' : 'text-on-surface-variant'}`}
          >
            Grid
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-2.5 py-1 rounded text-body-sm font-title-md ${viewMode === 'table' ? 'bg-surface-container-lowest shadow-sm text-on-surface' : 'text-on-surface-variant'}`}
          >
            Table
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        filtered.length === 0 ? (
          <div className="bg-surface-container-lowest p-10 rounded-xl shadow-sm text-center text-on-surface-variant font-body-md">
            No brands match your current search or filter criteria.
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
          {filtered.map((b) => {
            const skuCount = products.filter((p) => p.brandId === b.id && p.status === 'Active').length;
            return (
              <div key={b.id} className="bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed font-bold flex items-center justify-center">
                        {b.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-headline-sm text-on-surface">{b.name}</h3>
                        <p className="font-body-sm text-on-surface-variant">{b.manufacturerName}</p>
                      </div>
                    </div>
                    {b.featured && (
                      <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm">
                        Featured
                      </span>
                    )}
                  </div>
                  <p className="font-body-sm text-on-surface-variant mt-3 line-clamp-2">{b.description}</p>
                </div>

                <div className="pt-3 border-t border-outline-variant/25 flex items-center justify-between">
                  <div>
                    <span className="font-mono text-[11px] text-outline block">{b.licenseNumber}</span>
                    <span className="font-label-sm text-primary">{skuCount} Active SKUs</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {can('brands', 'edit') && (
                      <button
                        type="button"
                        onClick={() => openEdit(b)}
                        className="px-2.5 py-1 rounded bg-surface-container text-on-surface font-label-md hover:bg-surface-container-high"
                      >
                        Edit
                      </button>
                    )}
                    {can('brands', 'delete') && (
                      <button
                        type="button"
                        onClick={() => {
                          const res = archiveBrand(b.id);
                          pushToast({ type: res.ok ? 'success' : 'error', title: res.ok ? 'Archived' : 'Blocked', description: res.message });
                        }}
                        className="px-2.5 py-1 rounded bg-error-container/70 text-on-error-container font-label-md"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )
      ) : (
        <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant font-label-sm uppercase h-10">
                <th className="px-4 py-2">Brand</th>
                <th className="px-3 py-2">Legal Manufacturer</th>
                <th className="px-3 py-2">GMP License</th>
                <th className="px-3 py-2">Active SKUs</th>
                <th className="px-3 py-2">Featured</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-table-data">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-on-surface-variant font-body-md">
                    No brands match your current search or filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => {
                  const skuCount = products.filter((p) => p.brandId === b.id && p.status === 'Active').length;
                  return (
                    <tr key={b.id} className="border-b border-outline-variant/20">
                      <td className="px-4 py-3 font-title-md text-on-surface">{b.name}</td>
                      <td className="px-3 py-3">{b.manufacturerName}</td>
                      <td className="px-3 py-3 font-mono text-body-sm">{b.licenseNumber}</td>
                      <td className="px-3 py-3 text-primary font-semibold">{skuCount}</td>
                      <td className="px-3 py-3">{b.featured ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                        {can('brands', 'edit') && (
                          <button type="button" onClick={() => openEdit(b)} className="text-primary font-label-md hover:underline">
                            Edit
                          </button>
                        )}
                        {can('brands', 'delete') && (
                          <button
                            type="button"
                            onClick={() => {
                              const res = archiveBrand(b.id);
                              pushToast({ type: res.ok ? 'success' : 'error', title: res.ok ? 'Archived' : 'Blocked', description: res.message });
                            }}
                            className="text-error font-label-md hover:underline"
                          >
                            Archive
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
      )}

      {drawerOpen && (
        <div className="fixed inset-0 z-[85] flex justify-end">
          <div className="fixed inset-0 bg-on-surface/35 backdrop-blur-xs" onClick={() => setDrawerOpen(false)} />
          <form
            onSubmit={handleSave}
            className="relative w-full max-w-md bg-surface-container-lowest h-full shadow-2xl z-10 flex flex-col p-6 space-y-4 overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
              <h2 className="font-headline-sm text-on-surface">{editingBrand ? `Edit ${editingBrand.name}` : 'Onboard Brand Principal'}</h2>
              <button type="button" onClick={() => setDrawerOpen(false)} className="p-1 rounded-lg hover:bg-surface-container">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div>
              <label className="block font-label-md text-on-surface mb-1">Brand Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
            </div>
            <div>
              <label className="block font-label-md text-on-surface mb-1">Legal Manufacturer Name *</label>
              <input type="text" value={manufacturerName} onChange={(e) => setManufacturerName(e.target.value)} className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-label-md text-on-surface mb-1">Country</label>
                <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
              <div>
                <label className="block font-label-md text-on-surface mb-1">Mfg License No.</label>
                <input type="text" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant font-mono" />
              </div>
            </div>
            <div>
              <label className="block font-label-md text-on-surface mb-1">Description</label>
              <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-3 rounded-lg bg-surface-container-low border border-outline-variant" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="w-4 h-4 accent-[#0f766e]" />
              <span className="font-body-md text-on-surface">Feature on storefront directory</span>
            </label>
            <div className="pt-4 mt-auto flex justify-end gap-2">
              <button type="button" onClick={() => setDrawerOpen(false)} className="px-4 py-2 rounded-lg bg-surface-container text-on-surface font-title-md">Cancel</button>
              <button type="submit" className="px-5 py-2 rounded-lg bg-primary-container text-on-primary font-title-md hover:bg-primary">Save Brand</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
