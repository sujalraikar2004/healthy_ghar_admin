import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';
import { DrugSchedule, ProductVariant, StorageCondition } from '../../types';
import { formatINR, slugify } from '../../utils/formatters';
import { productFormSchema } from '../../utils/validation';

export function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const pushToast = useToastStore((s) => s.pushToast);

  const products = usePharmacyStore((s) => s.products);
  const categories = usePharmacyStore((s) => s.categories);
  const brands = usePharmacyStore((s) => s.brands);
  const saveProduct = usePharmacyStore((s) => s.saveProduct);

  const existing = id ? products.find((p) => p.id === id) : undefined;
  const isEdit = Boolean(existing);

  const [name, setName] = useState(existing?.name || '');
  const [sku, setSku] = useState(existing?.sku || '');
  const [barcode, setBarcode] = useState(existing?.barcode || `89012345${Math.floor(10000 + Math.random() * 89999)}`);
  const [genericName, setGenericName] = useState(existing?.genericName || '');
  const [composition, setComposition] = useState(existing?.composition || '');
  const [strength, setStrength] = useState(existing?.strength || '');
  const [dosageForm, setDosageForm] = useState(existing?.dosageForm || 'Tablet');
  const [packSize, setPackSize] = useState(existing?.packSize || 'Strip of 15 Tablets');
  const [shortDescription, setShortDescription] = useState(existing?.shortDescription || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [categoryId, setCategoryId] = useState(existing?.categoryId || categories[0]?.id || 'CAT-01');
  const [brandId, setBrandId] = useState(existing?.brandId || brands[0]?.id || 'BRD-01');
  const [mrp, setMrp] = useState(existing?.mrp || 120);
  const [sellingPrice, setSellingPrice] = useState(existing?.sellingPrice || 102);
  const [costPrice, setCostPrice] = useState(existing?.costPrice || 74);
  const [gstRate, setGstRate] = useState<0 | 5 | 12 | 18>(existing?.gstRate || 12);
  const [hsnCode, setHsnCode] = useState(existing?.hsnCode || '30049099');
  const [schedule, setSchedule] = useState<DrugSchedule>(existing?.schedule || 'OTC');
  const [storageCondition, setStorageCondition] = useState<StorageCondition>(existing?.storageCondition || 'Room Temp (<25°C)');
  const [reorderLevel, setReorderLevel] = useState(existing?.reorderLevel ?? 150);
  const [dpcoCapped, setDpcoCapped] = useState(existing?.dpcoCapped ?? false);
  const [isReturnable, setIsReturnable] = useState(existing?.isReturnable ?? true);
  const [status, setStatus] = useState<'Active' | 'Draft' | 'Archived'>(existing?.status || 'Active');
  const [variants, setVariants] = useState<ProductVariant[]>(
    existing?.variants || [{ id: 'VAR-1', label: 'Strip of 15 Tablets', skuSuffix: 'S15', mrp: 120, sellingPrice: 102, costPrice: 74, packSize: '15s' }]
  );
  const [images, setImages] = useState<string[]>(existing?.images || []);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleAddImageUrl = () => {
    const trimmed = newImageUrl.trim();
    if (!trimmed) return;
    setImages((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setNewImageUrl('');
  };

  const handleUploadImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      pushToast({ type: 'error', title: 'Image Too Large', description: 'Please upload an image under 1 MB for local browser persistence.' });
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (dataUrl) {
        setImages((prev) => [...prev, dataUrl]);
        pushToast({ type: 'success', title: 'Packaging Image Added', description: file.name });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleGeneratePackPreview = () => {
    const label = (name || sku || 'Healthy Ghar Rx').replace(/[<>&"]/g, '');
    const sub = (packSize || dosageForm).replace(/[<>&"]/g, '');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e6f5f3"/><stop offset="100%" stop-color="#c9ebe6"/></linearGradient></defs><rect width="400" height="260" rx="18" fill="url(#g)"/><rect x="28" y="28" width="344" height="204" rx="12" fill="#ffffff" stroke="#0f766e" stroke-width="2"/><rect x="28" y="28" width="14" height="204" rx="4" fill="#005c55"/><text x="60" y="76" font-family="sans-serif" font-size="13" font-weight="700" fill="#0f766e">HEALTHY GHAR VERIFIED FORMULATION</text><text x="60" y="120" font-family="sans-serif" font-size="22" font-weight="700" fill="#0f172a">${label.slice(0, 26)}</text><text x="60" y="152" font-family="sans-serif" font-size="14" fill="#475569">${sub.slice(0, 34)}</text><rect x="60" y="176" width="110" height="28" rx="6" fill="#005c55"/><text x="74" y="195" font-family="sans-serif" font-size="12" font-weight="700" fill="#ffffff">${schedule}</text></svg>`;
    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    setImages((prev) => [...prev, dataUrl]);
  };

  useEffect(() => {
    if (schedule === 'Schedule H' || schedule === 'Schedule H1' || schedule === 'Schedule X') {
      if (schedule === 'Schedule X') setIsReturnable(false);
    }
  }, [schedule]);

  const selectedBrand = brands.find((b) => b.id === brandId);
  const prescriptionRequired = schedule === 'Schedule H' || schedule === 'Schedule H1' || schedule === 'Schedule X';
  const discountPct = mrp > 0 ? Math.max(0, Math.round(((mrp - sellingPrice) / mrp) * 100)) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const parsed = productFormSchema.safeParse({
      name,
      sku,
      genericName,
      composition,
      strength,
      dosageForm,
      packSize,
      categoryId,
      brandId,
      mrp: Number(mrp),
      sellingPrice: Number(sellingPrice),
      costPrice: Number(costPrice),
      hsnCode,
      reorderLevel: Number(reorderLevel),
    });

    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const key = String(issue.path[0] || 'form');
        if (!errs[key]) errs[key] = issue.message;
      });
      setFieldErrors(errs);
      pushToast({ type: 'error', title: 'Validation Failed', description: Object.values(errs)[0] });
      return;
    }

    setSubmitting(true);
    const res = saveProduct(
      {
        name: name.trim(),
        slug: slugify(name),
        sku: sku.trim().toUpperCase(),
        barcode: barcode.trim(),
        shortDescription: shortDescription.trim() || `${genericName} (${strength}) — ${packSize}`,
        description: description.trim() || `${name} contains ${composition}. Storage: ${storageCondition}.`,
        categoryId,
        brandId,
        manufacturer: selectedBrand?.manufacturerName || 'Verified Pharma Labs',
        genericName: genericName.trim(),
        composition: composition.trim(),
        strength: strength.trim(),
        dosageForm: dosageForm.trim(),
        packSize: packSize.trim(),
        mrp: Number(mrp),
        sellingPrice: Number(sellingPrice),
        costPrice: Number(costPrice),
        gstRate,
        hsnCode: hsnCode.trim(),
        images,
        prescriptionRequired,
        schedule,
        storageCondition,
        isReturnable: storageCondition === 'Cold Chain (2-8°C)' ? false : isReturnable,
        dpcoCapped,
        reorderLevel: Number(reorderLevel),
        status,
        variants,
      },
      existing?.id
    );
    setSubmitting(false);

    if (!res.ok) {
      setFieldErrors({ form: res.message });
      pushToast({ type: 'error', title: 'Could Not Save Product', description: res.message });
      return;
    }

    pushToast({ type: 'success', title: isEdit ? 'Medicine Updated' : 'Medicine Added', description: res.message });
    navigate(res.data ? `/products/${res.data.id}` : '/products');
  };

  if (id && !existing) {
    return (
      <div className="p-space-xl text-center space-y-3">
        <span className="material-symbols-outlined text-[42px] text-error">medication</span>
        <h2 className="font-headline-md text-on-surface">Product SKU Not Found</h2>
        <p className="font-body-md text-on-surface-variant">The formulation you requested to edit does not exist or has been removed.</p>
        <button
          type="button"
          onClick={() => navigate('/products')}
          className="px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md text-body-sm"
        >
          Back to Catalogue
        </button>
      </div>
    );
  }

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="inline-flex items-center gap-1 font-label-md text-primary hover:underline mb-1"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Catalogue
          </button>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">
            {isEdit ? `Edit Formulation: ${existing?.name}` : 'Add New Medicine / Healthcare SKU'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="px-4 py-2 rounded-lg bg-surface-container text-on-surface font-title-md text-body-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="product-master-form"
            disabled={submitting}
            className="px-5 py-2 rounded-lg bg-primary-container text-on-primary font-title-md text-body-sm hover:bg-primary transition-colors disabled:opacity-60"
          >
            {submitting ? 'Saving...' : isEdit ? 'Save Formulation Changes' : 'Publish Medicine SKU'}
          </button>
        </div>
      </div>

      {fieldErrors.form && (
        <div className="p-3.5 rounded-xl bg-error-container text-on-error-container font-body-md">
          {fieldErrors.form}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-space-lg items-start">
        <form id="product-master-form" onSubmit={handleSubmit} className="xl:col-span-2 space-y-space-lg">
          {/* 1. Basic & Clinical Composition */}
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm space-y-4">
            <h2 className="font-headline-sm text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">medication</span>
              1. Basic Information & Salt Composition
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-label-md text-on-surface mb-1">Brand / Display Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dolo 650mg Tablet"
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
                />
                {fieldErrors.name && <p className="text-error text-body-sm mt-1">{fieldErrors.name}</p>}
              </div>
              <div>
                <label className="block font-label-md text-on-surface mb-1">Unique SKU Code *</label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="MED-DOLO-650"
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant font-mono text-on-surface"
                />
                {fieldErrors.sku && <p className="text-error text-body-sm mt-1">{fieldErrors.sku}</p>}
              </div>
              <div>
                <label className="block font-label-md text-on-surface mb-1">Generic Salt / Molecule *</label>
                <input
                  type="text"
                  value={genericName}
                  onChange={(e) => setGenericName(e.target.value)}
                  placeholder="Paracetamol"
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
                />
                {fieldErrors.genericName && <p className="text-error text-body-sm mt-1">{fieldErrors.genericName}</p>}
              </div>
              <div>
                <label className="block font-label-md text-on-surface mb-1">Full Composition *</label>
                <input
                  type="text"
                  value={composition}
                  onChange={(e) => setComposition(e.target.value)}
                  placeholder="Paracetamol IP 650mg"
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
                />
                {fieldErrors.composition && <p className="text-error text-body-sm mt-1">{fieldErrors.composition}</p>}
              </div>
              <div>
                <label className="block font-label-md text-on-surface mb-1">Strength *</label>
                <input
                  type="text"
                  value={strength}
                  onChange={(e) => setStrength(e.target.value)}
                  placeholder="650mg"
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
                />
              </div>
              <div>
                <label className="block font-label-md text-on-surface mb-1">Dosage Form *</label>
                <select
                  value={dosageForm}
                  onChange={(e) => setDosageForm(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
                >
                  {['Tablet', 'Tablet SR', 'Capsule', 'Capsule PR', 'Syrup', 'Suspension', 'Injection Pen', 'Inhaler', 'Topical Cream', 'Topical Spray', 'Medical Device', 'Diagnostic Strip', 'Powder Sachet'].map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-label-md text-on-surface mb-1">Pack Size *</label>
                <input
                  type="text"
                  value={packSize}
                  onChange={(e) => setPackSize(e.target.value)}
                  placeholder="Strip of 15 Tablets"
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
                />
              </div>
              <div>
                <label className="block font-label-md text-on-surface mb-1">EAN / Barcode</label>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant font-mono text-on-surface"
                />
              </div>
            </div>
            <div>
              <label className="block font-label-md text-on-surface mb-1">Clinical Description & Indications</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Therapeutic indications, mechanism, and patient administration guidance..."
                className="w-full p-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              />
            </div>
          </div>

          {/* 2. Classification, Pricing & GST */}
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm space-y-4">
            <h2 className="font-headline-sm text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">currency_rupee</span>
              2. Classification, Pricing & GST Compliance
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-label-md text-on-surface mb-1">Therapeutic Category *</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
                >
                  {categories.filter((c) => c.status === 'Active').map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-label-md text-on-surface mb-1">Brand / Manufacturer *</label>
                <select
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
                >
                  {brands.filter((b) => b.status === 'Active').map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.manufacturerName})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-label-md text-on-surface mb-1">Printed MRP (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={mrp}
                  onChange={(e) => setMrp(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface tabular-nums"
                />
                {fieldErrors.mrp && <p className="text-error text-body-sm mt-1">{fieldErrors.mrp}</p>}
              </div>
              <div>
                <label className="block font-label-md text-on-surface mb-1">Selling Price (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface tabular-nums"
                />
                {fieldErrors.sellingPrice && <p className="text-error text-body-sm mt-1">{fieldErrors.sellingPrice}</p>}
              </div>
              <div>
                <label className="block font-label-md text-on-surface mb-1">Procurement Cost (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={costPrice}
                  onChange={(e) => setCostPrice(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface tabular-nums"
                />
              </div>
              <div>
                <label className="block font-label-md text-on-surface mb-1">HSN Code *</label>
                <input
                  type="text"
                  value={hsnCode}
                  onChange={(e) => setHsnCode(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant font-mono text-on-surface"
                />
                {fieldErrors.hsnCode && <p className="text-error text-body-sm mt-1">{fieldErrors.hsnCode}</p>}
              </div>
              <div>
                <label className="block font-label-md text-on-surface mb-1">GST Slab (%)</label>
                <select
                  value={gstRate}
                  onChange={(e) => setGstRate(Number(e.target.value) as 0 | 5 | 12 | 18)}
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
                >
                  <option value={0}>0% (Exempt)</option>
                  <option value={5}>5% (Life-saving / Insulin)</option>
                  <option value={12}>12% (Standard Medicines)</option>
                  <option value={18}>18% (Devices / Nutraceuticals)</option>
                </select>
              </div>
              <div>
                <label className="block font-label-md text-on-surface mb-1">Hub Reorder Level</label>
                <input
                  type="number"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
                />
              </div>
            </div>
          </div>

          {/* 3. Statutory Schedule & Storage */}
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm space-y-4">
            <h2 className="font-headline-sm text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary">policy</span>
              3. Statutory CDSCO Schedule, Storage & Publishing
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-label-md text-on-surface mb-1">Drug Schedule</label>
                <select
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value as DrugSchedule)}
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
                >
                  <option value="OTC">OTC (No Rx Required)</option>
                  <option value="Schedule H">Schedule H (Rx Mandatory)</option>
                  <option value="Schedule H1">Schedule H1 (Register + Rx)</option>
                  <option value="Schedule X">Schedule X (Narcotic Control)</option>
                  <option value="Medical Device">Medical Device</option>
                </select>
              </div>
              <div>
                <label className="block font-label-md text-on-surface mb-1">Storage Condition</label>
                <select
                  value={storageCondition}
                  onChange={(e) => setStorageCondition(e.target.value as StorageCondition)}
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
                >
                  <option value="Room Temp (<25°C)">Room Temp (&lt;25°C)</option>
                  <option value="Cool & Dry (<20°C)">Cool & Dry (&lt;20°C)</option>
                  <option value="Cold Chain (2-8°C)">Cold Chain (2-8°C)</option>
                  <option value="Protect from Light">Protect from Light</option>
                </select>
              </div>
              <div>
                <label className="block font-label-md text-on-surface mb-1">Publishing Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as typeof status)}
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
                >
                  <option value="Active">Active (Live in Catalogue)</option>
                  <option value="Draft">Draft (Internal Only)</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dpcoCapped}
                  onChange={(e) => setDpcoCapped(e.target.checked)}
                  className="w-4 h-4 accent-[#0f766e]"
                />
                <span className="font-body-md text-on-surface">DPCO / NLEM Price Controlled</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={storageCondition === 'Cold Chain (2-8°C)' ? false : isReturnable}
                  disabled={storageCondition === 'Cold Chain (2-8°C)'}
                  onChange={(e) => setIsReturnable(e.target.checked)}
                  className="w-4 h-4 accent-[#0f766e]"
                />
                <span className="font-body-md text-on-surface">Eligible for 7-Day Sealed Return</span>
              </label>
            </div>
          </div>

          {/* 4. Pack Variants */}
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-sm text-on-surface">4. Pack Size Variants</h2>
              <button
                type="button"
                onClick={() =>
                  setVariants((prev) => [
                    ...prev,
                    {
                      id: `VAR-${Date.now()}`,
                      label: 'Box of 10 Strips',
                      skuSuffix: `V${prev.length + 1}`,
                      mrp: mrp * 10,
                      sellingPrice: sellingPrice * 10,
                      costPrice: costPrice * 10,
                      packSize: '10 Strips',
                    },
                  ])
                }
                className="font-label-md text-primary hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">add</span> Add Variant
              </button>
            </div>
            {variants.map((v, idx) => (
              <div key={v.id} className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-3 rounded-lg bg-surface-container-low items-center">
                <input
                  type="text"
                  value={v.label}
                  onChange={(e) =>
                    setVariants((prev) => prev.map((it, i) => (i === idx ? { ...it, label: e.target.value } : it)))
                  }
                  placeholder="Variant Label"
                  className="h-9 px-2.5 rounded bg-surface-container-lowest border border-outline-variant text-body-sm"
                />
                <input
                  type="text"
                  value={v.packSize}
                  onChange={(e) =>
                    setVariants((prev) => prev.map((it, i) => (i === idx ? { ...it, packSize: e.target.value } : it)))
                  }
                  placeholder="Pack size"
                  className="h-9 px-2.5 rounded bg-surface-container-lowest border border-outline-variant text-body-sm"
                />
                <input
                  type="number"
                  value={v.sellingPrice}
                  onChange={(e) =>
                    setVariants((prev) => prev.map((it, i) => (i === idx ? { ...it, sellingPrice: Number(e.target.value) } : it)))
                  }
                  placeholder="Price"
                  className="h-9 px-2.5 rounded bg-surface-container-lowest border border-outline-variant text-body-sm"
                />
                <div className="flex justify-end">
                  {variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setVariants((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-error font-label-sm hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 5. Product Packaging Images */}
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-headline-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">photo_library</span>
                5. Packaging & Strip Gallery ({images.length})
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleGeneratePackPreview}
                  className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface font-label-md hover:bg-primary-fixed"
                >
                  + Generate Pack Artwork
                </button>
                <label className="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary font-label-md cursor-pointer hover:bg-primary">
                  Upload Image
                  <input type="file" accept="image/*" onChange={handleUploadImageFile} className="hidden" />
                </label>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Paste HTTPS image URL (e.g. https://...)"
                className="flex-1 min-w-0 h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-body-sm"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="px-4 h-9 rounded-lg bg-surface-container text-on-surface font-title-md text-body-sm hover:bg-surface-container-high shrink-0"
              >
                Add URL
              </button>
            </div>

            {images.length === 0 ? (
              <div className="p-4 rounded-xl bg-surface-container-low text-body-sm text-on-surface-variant text-center">
                No packaging images added yet. Upload a photo, paste a URL, or generate clinical pack artwork.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {images.map((src, idx) => (
                  <div key={idx} className="p-2 rounded-xl bg-surface-container-low space-y-2 relative">
                    <img
                      src={src}
                      alt={`Pack ${idx + 1}`}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.opacity = '0.35';
                      }}
                      className="w-full h-24 object-cover rounded-lg bg-surface-container-lowest"
                    />
                    <div className="flex items-center justify-between gap-1 text-[11px]">
                      {idx === 0 ? (
                        <span className="px-1.5 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-label-sm">Primary</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setImages((prev) => [src, ...prev.filter((_, i) => i !== idx)])
                          }
                          className="text-primary font-label-sm hover:underline"
                        >
                          Make Primary
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-error font-label-sm hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Right Sticky Live Storefront Preview & CDSCO Compliance Card */}
        <div className="space-y-space-md xl:sticky xl:top-20">
          <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-outline uppercase tracking-wider">Storefront Card Preview</span>
              <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm">
                {status}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-surface-container-low flex items-center justify-center h-40 overflow-hidden">
              {images[0] ? (
                <img
                  src={images[0]}
                  alt={name || 'Preview'}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.opacity = '0.35';
                  }}
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : (
                <div className="text-center">
                  <span className="material-symbols-outlined text-[42px] text-primary">
                    {dosageForm.includes('Device') ? 'monitor_heart' : 'medication'}
                  </span>
                  <div className="font-label-sm text-on-surface-variant mt-1">{dosageForm} • {packSize}</div>
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className="px-2 py-0.5 rounded-full bg-surface-container text-primary font-label-sm">{schedule}</span>
                {prescriptionRequired && (
                  <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm">
                    Rx Required
                  </span>
                )}
              </div>
              <h3 className="font-headline-sm text-on-surface">{name || 'Medicine Formulation Name'}</h3>
              <p className="font-body-sm text-on-surface-variant">{selectedBrand?.manufacturerName || 'Manufacturer'}</p>
              <p className="font-body-sm text-primary mt-1">{composition || 'Active Molecule Composition'}</p>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-headline-md text-on-surface tabular-nums">{formatINR(sellingPrice)}</span>
                <span className="font-body-sm text-outline line-through tabular-nums">{formatINR(mrp)}</span>
                {discountPct > 0 && (
                  <span className="font-label-sm text-primary font-bold">{discountPct}% OFF</span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm space-y-2.5">
            <h3 className="font-title-md text-on-surface">CDSCO Rule 65 Gate Checklist</h3>
            {[
              { ok: sellingPrice <= mrp && mrp > 0, label: 'Selling price within printed MRP' },
              { ok: hsnCode.length >= 4, label: `Valid HSN ${hsnCode || '—'} & ${gstRate}% GST slab` },
              { ok: !prescriptionRequired || String(schedule) !== 'OTC', label: prescriptionRequired ? 'Enforces Pharmacist Rx Approval before dispatch' : 'OTC Direct Dispatch Permitted' },
              { ok: storageCondition !== 'Cold Chain (2-8°C)' || !isReturnable, label: storageCondition === 'Cold Chain (2-8°C)' ? 'Cold-chain bio-safety non-returnable enforced' : 'Standard storage policy active' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-body-sm">
                <span className={`material-symbols-outlined text-[18px] ${item.ok ? 'text-primary' : 'text-error'}`}>
                  {item.ok ? 'check_circle' : 'error'}
                </span>
                <span className="text-on-surface-variant">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
