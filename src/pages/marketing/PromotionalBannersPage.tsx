import React, { useState } from 'react';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';
import { Banner } from '../../types';
import { formatIndianDate } from '../../utils/formatters';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export function PromotionalBannersPage() {
  const pushToast = useToastStore((s) => s.pushToast);
  const banners = usePharmacyStore((s) => s.banners);
  const saveBanner = usePharmacyStore((s) => s.saveBanner);
  const toggleBanner = usePharmacyStore((s) => s.toggleBanner);
  const deleteBanner = usePharmacyStore((s) => s.deleteBanner);
  const can = usePharmacyStore((s) => s.can);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  const defaultForm = () => ({
    heading: '',
    subtitle: '',
    ctaText: 'Shop Now',
    destinationUrl: '/categories/chronic-care',
    desktopImageUrl: '',
    mobileImageUrl: '',
    placement: 'Hero Top' as Banner['placement'],
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    active: true,
  });

  const [form, setForm] = useState(defaultForm);

  const openNew = () => {
    setEditingBannerId(undefined);
    setForm(defaultForm());
    setModalOpen(true);
  };

  const openEdit = (b: Banner) => {
    setEditingBannerId(b.id);
    setForm({
      heading: b.heading,
      subtitle: b.subtitle,
      ctaText: b.ctaText,
      destinationUrl: b.destinationUrl,
      desktopImageUrl: b.desktopImageUrl.startsWith('data:') || b.desktopImageUrl.startsWith('http') ? b.desktopImageUrl : '',
      mobileImageUrl: b.mobileImageUrl.startsWith('data:') || b.mobileImageUrl.startsWith('http') ? b.mobileImageUrl : '',
      placement: b.placement,
      startDate: b.startDate.slice(0, 10),
      endDate: b.endDate.slice(0, 10),
      active: b.active,
    });
    setModalOpen(true);
  };

  const handleUploadImage = (field: 'desktopImageUrl' | 'mobileImageUrl') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      pushToast({ type: 'error', title: 'File Too Large', description: 'Please upload banner artwork under 1 MB.' });
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (dataUrl) setForm((prev) => ({ ...prev, [field]: dataUrl }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(form.endDate) < new Date(form.startDate)) {
      pushToast({ type: 'error', title: 'Invalid Schedule', description: 'End date must be on or after start date.' });
      return;
    }
    const res = saveBanner(
      {
        ...form,
        desktopImageUrl: form.desktopImageUrl.trim() || 'banner-hero-mint.svg',
        mobileImageUrl: form.mobileImageUrl.trim() || 'banner-mobile-mint.svg',
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
      },
      editingBannerId
    );
    pushToast({
      type: res.ok ? 'success' : 'error',
      title: res.ok ? (editingBannerId ? 'Banner Updated' : 'Banner Published') : 'Error',
      description: res.message,
    });
    if (res.ok) setModalOpen(false);
  };

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <span className="font-label-sm text-primary uppercase tracking-wider">Storefront Merchandising</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Promotional Banners</h1>
          <p className="font-body-md text-on-surface-variant">
            Manage storefront hero banners, chronic care strips, and cart upsell placements
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-surface-container-lowest p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setPreviewMode('desktop')}
              className={`px-3 py-1 rounded-md font-label-md flex items-center gap-1 ${
                previewMode === 'desktop' ? 'bg-primary-container text-on-primary' : 'text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">desktop_windows</span>
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('mobile')}
              className={`px-3 py-1 rounded-md font-label-md flex items-center gap-1 ${
                previewMode === 'mobile' ? 'bg-primary-container text-on-primary' : 'text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">smartphone</span>
              Mobile
            </button>
          </div>

          {can('banners', 'create') && (
            <button
              type="button"
              onClick={openNew}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md text-body-sm"
            >
              <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
              <span>Add Banner</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
        {banners.length === 0 ? (
          <div className="lg:col-span-2 bg-surface-container-lowest p-10 rounded-xl shadow-sm text-center text-on-surface-variant font-body-sm">
            No promotional banners configured. Click Add Banner to create a storefront placement.
          </div>
        ) : (
          banners.map((b) => {
            const customImg =
              previewMode === 'mobile'
                ? b.mobileImageUrl.startsWith('data:') || b.mobileImageUrl.startsWith('http')
                  ? b.mobileImageUrl
                  : null
                : b.desktopImageUrl.startsWith('data:') || b.desktopImageUrl.startsWith('http')
                ? b.desktopImageUrl
                : null;

            return (
              <div key={b.id} className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 bg-surface-container-low flex justify-center">
                  <div
                    className={`relative rounded-xl overflow-hidden bg-gradient-to-r from-primary-container to-primary p-6 text-on-primary transition-all ${
                      previewMode === 'mobile' ? 'w-full max-w-[300px]' : 'w-full'
                    }`}
                  >
                    {customImg && (
                      <img
                        src={customImg}
                        alt={b.heading}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                        className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none"
                      />
                    )}
                  <div className="relative z-10">
                    <span className="px-2 py-0.5 rounded bg-on-primary/20 text-[10px] font-label-sm uppercase">
                      {b.placement} • {previewMode}
                    </span>
                    <h3 className="font-headline-md mt-2">{b.heading}</h3>
                    <p className="font-body-sm opacity-90 mt-1">{b.subtitle}</p>
                    <span className="inline-block mt-3 px-3 py-1 rounded-lg bg-on-primary text-primary font-label-md">
                      {b.ctaText}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-4 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[12px] text-on-surface-variant">
                  {formatIndianDate(b.startDate)} – {formatIndianDate(b.endDate)} • Target: {b.destinationUrl}
                </div>
                <div className="flex items-center gap-2">
                  {can('banners', 'edit') && (
                    <button
                      type="button"
                      onClick={() => openEdit(b)}
                      className="px-2.5 py-1 rounded-lg bg-surface-container text-on-surface font-label-sm hover:bg-surface-container-high"
                    >
                      Edit
                    </button>
                  )}
                  {can('banners', 'edit') && (
                    <button
                      type="button"
                        onClick={() => {
                          const res = toggleBanner(b.id);
                          pushToast({
                            type: res.ok ? 'info' : 'error',
                            title: res.ok ? 'Banner Updated' : 'Update Failed',
                            description: res.message,
                          });
                        }}
                        className={`px-3 py-1 rounded-lg font-label-md ${
                          b.active ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {b.active ? 'Live' : 'Hidden'}
                      </button>
                    )}
                    {can('banners', 'delete') && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(b)}
                        className="px-2.5 py-1 rounded-lg bg-error-container text-on-error-container font-label-sm"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[85] bg-on-surface/40 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-5 space-y-3 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-title-lg text-on-surface">
                {editingBannerId ? 'Edit Storefront Banner' : 'Create Storefront Banner'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-surface-container">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div>
              <label className="block font-label-sm mb-1">Banner Headline *</label>
              <input required value={form.heading} onChange={(e) => setForm({ ...form, heading: e.target.value })} placeholder="Banner Headline" className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
            </div>
            <div>
              <label className="block font-label-sm mb-1">Subtitle *</label>
              <input required value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Subtitle" className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-label-sm mb-1">CTA Label *</label>
                <input required value={form.ctaText} onChange={(e) => setForm({ ...form, ctaText: e.target.value })} placeholder="CTA Label" className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
              <div>
                <label className="block font-label-sm mb-1">Placement</label>
                <select value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value as Banner['placement'] })} className="w-full min-w-0 h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant">
                  <option value="Hero Top">Hero Top</option>
                  <option value="Mid Chronic Strip">Mid Chronic Strip</option>
                  <option value="Cart Upsell">Cart Upsell</option>
                </select>
              </div>
              <div>
                <label className="block font-label-sm mb-1">Schedule Start *</label>
                <input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
              <div>
                <label className="block font-label-sm mb-1">Schedule End *</label>
                <input type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
            </div>
            <div>
              <label className="block font-label-sm mb-1">Destination Link *</label>
              <input required value={form.destinationUrl} onChange={(e) => setForm({ ...form, destinationUrl: e.target.value })} placeholder="/categories/..." className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-label-sm mb-1">Desktop Artwork (URL or Upload)</label>
                <div className="flex gap-1.5">
                  <input value={form.desktopImageUrl} onChange={(e) => setForm({ ...form, desktopImageUrl: e.target.value })} placeholder="https://... or upload" className="flex-1 min-w-0 h-9 px-2.5 rounded-lg bg-surface-container-low border border-outline-variant text-body-sm" />
                  <label className="px-2.5 h-9 flex items-center rounded-lg bg-surface-container cursor-pointer font-label-sm shrink-0">
                    Upload
                    <input type="file" accept="image/*" onChange={handleUploadImage('desktopImageUrl')} className="hidden" />
                  </label>
                </div>
              </div>
              <div>
                <label className="block font-label-sm mb-1">Mobile Artwork (URL or Upload)</label>
                <div className="flex gap-1.5">
                  <input value={form.mobileImageUrl} onChange={(e) => setForm({ ...form, mobileImageUrl: e.target.value })} placeholder="https://... or upload" className="flex-1 min-w-0 h-9 px-2.5 rounded-lg bg-surface-container-low border border-outline-variant text-body-sm" />
                  <label className="px-2.5 h-9 flex items-center rounded-lg bg-surface-container cursor-pointer font-label-sm shrink-0">
                    Upload
                    <input type="file" accept="image/*" onChange={handleUploadImage('mobileImageUrl')} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg bg-surface-container">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md">
                {editingBannerId ? 'Save Banner' : 'Publish'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete Banner "${deleteTarget?.heading || ''}"?`}
        description="This removes the promotional banner from active storefront merchandising placements."
        confirmLabel="Delete Banner"
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) {
            const res = deleteBanner(deleteTarget.id);
            pushToast({ type: res.ok ? 'success' : 'error', title: res.ok ? 'Banner Deleted' : 'Error', description: res.message });
          }
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
