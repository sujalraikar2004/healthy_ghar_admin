import React, { useState } from 'react';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';
import { Campaign, Coupon } from '../../types';
import { formatIndianDate, formatINR } from '../../utils/formatters';
import { couponFormSchema } from '../../utils/validation';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export function CouponsCampaignsPage() {
  const pushToast = useToastStore((s) => s.pushToast);

  const coupons = usePharmacyStore((s) => s.coupons);
  const campaigns = usePharmacyStore((s) => s.campaigns);
  const categories = usePharmacyStore((s) => s.categories);
  const saveCoupon = usePharmacyStore((s) => s.saveCoupon);
  const toggleCoupon = usePharmacyStore((s) => s.toggleCoupon);
  const deleteCoupon = usePharmacyStore((s) => s.deleteCoupon);
  const saveCampaign = usePharmacyStore((s) => s.saveCampaign);
  const can = usePharmacyStore((s) => s.can);

  const [tab, setTab] = useState<'coupons' | 'campaigns'>('coupons');
  const [couponModal, setCouponModal] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState<string | undefined>(undefined);
  const [campaignModal, setCampaignModal] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);

  const defaultCouponForm = () => ({
    code: '',
    title: '',
    discountType: 'Percentage' as Coupon['discountType'],
    discountValue: 15,
    maxDiscountAmount: 250,
    minOrderAmount: 499,
    usageLimit: 500,
    perCustomerLimit: 2,
    excludeDpcoScheduled: true,
    categoryIds: [] as string[],
    startDate: new Date().toISOString().slice(0, 10),
    expiryDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    active: true,
  });

  const defaultCampaignForm = () => ({
    name: '',
    channel: 'In-App & Web' as Campaign['channel'],
    targetGroup: 'Chronic Care Members',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    budget: 25000,
    attributedRevenue: 0,
    conversions: 0,
    status: 'Scheduled' as Campaign['status'],
  });

  const [cForm, setCForm] = useState(defaultCouponForm);
  const [cmpForm, setCmpForm] = useState(defaultCampaignForm);

  const openNewCoupon = () => {
    setEditingCouponId(undefined);
    setCForm(defaultCouponForm());
    setCouponModal(true);
  };

  const openEditCoupon = (c: Coupon) => {
    setEditingCouponId(c.id);
    setCForm({
      code: c.code,
      title: c.title,
      discountType: c.discountType,
      discountValue: c.discountValue,
      maxDiscountAmount: c.maxDiscountAmount,
      minOrderAmount: c.minOrderAmount,
      usageLimit: c.usageLimit,
      perCustomerLimit: c.perCustomerLimit,
      excludeDpcoScheduled: c.excludeDpcoScheduled,
      categoryIds: c.categoryIds || [],
      startDate: c.startDate.slice(0, 10),
      expiryDate: c.expiryDate.slice(0, 10),
      active: c.active,
    });
    setCouponModal(true);
  };

  const openNewCampaign = () => {
    setEditingCampaignId(undefined);
    setCmpForm(defaultCampaignForm());
    setCampaignModal(true);
  };

  const openEditCampaign = (cmp: Campaign) => {
    setEditingCampaignId(cmp.id);
    setCmpForm({
      name: cmp.name,
      channel: cmp.channel,
      targetGroup: cmp.targetGroup,
      startDate: cmp.startDate.slice(0, 10),
      endDate: cmp.endDate.slice(0, 10),
      budget: cmp.budget,
      attributedRevenue: cmp.attributedRevenue,
      conversions: cmp.conversions,
      status: cmp.status,
    });
    setCampaignModal(true);
  };

  const toggleCategoryRestriction = (catId: string) => {
    setCForm((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(catId)
        ? prev.categoryIds.filter((x) => x !== catId)
        : [...prev.categoryIds, catId],
    }));
  };

  const handleSaveCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = couponFormSchema.safeParse({
      code: cForm.code.trim().toUpperCase(),
      title: cForm.title.trim(),
      discountValue: Number(cForm.discountValue),
      maxDiscountAmount: Number(cForm.maxDiscountAmount),
      minOrderAmount: Number(cForm.minOrderAmount),
      usageLimit: Number(cForm.usageLimit),
      startDate: cForm.startDate,
      expiryDate: cForm.expiryDate,
    });
    if (!parsed.success) {
      pushToast({ type: 'error', title: 'Coupon Validation Error', description: parsed.error.issues[0].message });
      return;
    }

    const res = saveCoupon(
      {
        ...cForm,
        code: parsed.data.code,
        title: parsed.data.title,
        startDate: new Date(cForm.startDate).toISOString(),
        expiryDate: new Date(cForm.expiryDate).toISOString(),
      },
      editingCouponId
    );
    pushToast({
      type: res.ok ? 'success' : 'error',
      title: res.ok ? (editingCouponId ? 'Coupon Updated' : 'Coupon Created') : 'Error',
      description: res.message,
    });
    if (res.ok) setCouponModal(false);
  };

  const handleSaveCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(cmpForm.endDate) < new Date(cmpForm.startDate)) {
      pushToast({ type: 'error', title: 'Invalid Schedule', description: 'End date must be on or after start date.' });
      return;
    }
    const res = saveCampaign(
      {
        ...cmpForm,
        startDate: new Date(cmpForm.startDate).toISOString(),
        endDate: new Date(cmpForm.endDate).toISOString(),
      },
      editingCampaignId
    );
    pushToast({
      type: res.ok ? 'success' : 'error',
      title: res.ok ? (editingCampaignId ? 'Campaign Updated' : 'Campaign Created') : 'Error',
      description: res.message,
    });
    if (res.ok) setCampaignModal(false);
  };

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <span className="font-label-sm text-primary uppercase tracking-wider">Promotions & DPCO Guardrails</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Coupons & Marketing Campaigns</h1>
          <p className="font-body-md text-on-surface-variant">
            Manage discount codes with DPCO price-cap exclusions and omnichannel campaign performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'coupons' && can('coupons', 'create') && (
            <button
              type="button"
              onClick={openNewCoupon}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md text-body-sm"
            >
              <span className="material-symbols-outlined text-[18px]">local_offer</span>
              <span>New Coupon</span>
            </button>
          )}
          {tab === 'campaigns' && can('campaigns', 'create') && (
            <button
              type="button"
              onClick={openNewCampaign}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md text-body-sm"
            >
              <span className="material-symbols-outlined text-[18px]">campaign</span>
              <span>New Campaign</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTab('coupons')}
          className={`px-4 py-2 rounded-lg font-title-md text-body-sm ${
            tab === 'coupons' ? 'bg-primary-container text-on-primary' : 'bg-surface-container-lowest text-on-surface-variant'
          }`}
        >
          Promo Coupons ({coupons.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('campaigns')}
          className={`px-4 py-2 rounded-lg font-title-md text-body-sm ${
            tab === 'campaigns' ? 'bg-primary-container text-on-primary' : 'bg-surface-container-lowest text-on-surface-variant'
          }`}
        >
          Campaigns ({campaigns.length})
        </button>
      </div>

      {tab === 'coupons' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
          {coupons.length === 0 ? (
            <div className="md:col-span-2 bg-surface-container-lowest p-10 rounded-xl shadow-sm text-center text-on-surface-variant font-body-sm">
              No promotional coupons configured yet. Click New Coupon to create one.
            </div>
          ) : (
            coupons.map((c) => (
              <div key={c.id} className="bg-surface-container-lowest p-5 rounded-xl shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="px-2.5 py-1 rounded-md bg-primary-fixed text-on-primary-fixed font-title-md tracking-wide">
                      {c.code}
                    </span>
                    <h3 className="font-title-lg text-on-surface mt-2">{c.title}</h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded font-label-sm shrink-0 ${c.active ? 'bg-primary-container text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                    {c.active ? 'Active' : 'Paused'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-body-sm text-on-surface-variant">
                  <div>Benefit: <strong className="text-on-surface">{c.discountType === 'Percentage' ? `${c.discountValue}% (up to ${formatINR(c.maxDiscountAmount)})` : formatINR(c.discountValue)}</strong></div>
                  <div>Min Cart: <strong className="text-on-surface">{formatINR(c.minOrderAmount)}</strong></div>
                  <div>Used: {c.usedCount} / {c.usageLimit} ({c.perCustomerLimit}/user)</div>
                  <div>Valid: {formatIndianDate(c.startDate)} – {formatIndianDate(c.expiryDate)}</div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-outline-variant/30 gap-2 flex-wrap">
                  <span className="font-label-sm text-primary">
                    {c.excludeDpcoScheduled ? 'DPCO / Scheduled Excluded' : 'Applies Storewide'}
                    {c.categoryIds?.length ? ` • ${c.categoryIds.length} Cat(s)` : ''}
                  </span>
                  <div className="flex items-center gap-2">
                    {can('coupons', 'edit') && (
                      <button
                        type="button"
                        onClick={() => openEditCoupon(c)}
                        className="px-2.5 py-1 rounded bg-surface-container text-on-surface font-label-sm hover:bg-surface-container-high"
                      >
                        Edit
                      </button>
                    )}
                    {can('coupons', 'edit') && (
                      <button
                        type="button"
                        onClick={() => {
                          const res = toggleCoupon(c.id);
                          pushToast({
                            type: res.ok ? 'info' : 'error',
                            title: res.ok ? 'Coupon Updated' : 'Update Failed',
                            description: res.message,
                          });
                        }}
                        className="px-2.5 py-1 rounded bg-surface-container text-on-surface font-label-sm"
                      >
                        {c.active ? 'Pause' : 'Activate'}
                      </button>
                    )}
                    {can('coupons', 'delete') && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(c)}
                        className="px-2.5 py-1 rounded bg-error-container text-on-error-container font-label-sm"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
          {campaigns.length === 0 ? (
            <div className="md:col-span-2 lg:col-span-3 bg-surface-container-lowest p-10 rounded-xl shadow-sm text-center text-on-surface-variant font-body-sm">
              No marketing campaigns scheduled yet. Click New Campaign to launch one.
            </div>
          ) : (
            campaigns.map((cmp) => (
            <div key={cmp.id} className="bg-surface-container-lowest p-5 rounded-xl shadow-sm space-y-2.5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-sm">
                    {cmp.channel}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded font-label-sm ${
                      cmp.status === 'Active'
                        ? 'bg-primary-fixed text-on-primary-fixed'
                        : cmp.status === 'Paused'
                        ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {cmp.status}
                  </span>
                </div>
                <h3 className="font-title-lg text-on-surface">{cmp.name}</h3>
                <p className="font-body-sm text-on-surface-variant">Target: {cmp.targetGroup}</p>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/30 text-body-sm">
                  <div>
                    <div className="text-[11px] text-on-surface-variant">Budget</div>
                    <div className="font-title-md tabular-nums">{formatINR(cmp.budget)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-on-surface-variant">Attributed Revenue</div>
                    <div className="font-title-md text-primary tabular-nums">{formatINR(cmp.attributedRevenue)}</div>
                  </div>
                </div>
                <div className="text-[11px] text-on-surface-variant">
                  {formatIndianDate(cmp.startDate)} – {formatIndianDate(cmp.endDate)} • {cmp.conversions} conversions
                </div>
              </div>
              {can('campaigns', 'edit') && (
                <div className="pt-2 border-t border-outline-variant/30 flex items-center justify-between gap-2">
                  <select
                    value={cmp.status}
                    onChange={(e) => {
                      const nextStatus = e.target.value as Campaign['status'];
                      const res = saveCampaign({ ...cmp, status: nextStatus }, cmp.id);
                      pushToast({
                        type: res.ok ? 'info' : 'error',
                        title: res.ok ? 'Campaign Status Updated' : 'Update Failed',
                        description: res.ok ? `${cmp.name} → ${nextStatus}` : res.message,
                      });
                    }}
                    className="h-8 px-2 rounded bg-surface-container-low border border-outline-variant text-[12px]"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Active">Active</option>
                    <option value="Paused">Paused</option>
                    <option value="Completed">Completed</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => openEditCampaign(cmp)}
                    className="px-2.5 py-1 rounded bg-surface-container text-on-surface font-label-sm hover:bg-surface-container-high"
                  >
                    Edit Campaign
                  </button>
                </div>
              )}
            </div>
            ))
          )}
        </div>
      )}

      {/* Coupon Modal */}
      {couponModal && (
        <div className="fixed inset-0 z-[85] bg-on-surface/40 flex items-center justify-center p-4">
          <form onSubmit={handleSaveCoupon} className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-5 space-y-3 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-title-lg text-on-surface">
                {editingCouponId ? 'Edit Promotional Coupon' : 'Create Promotional Coupon'}
              </h3>
              <button type="button" onClick={() => setCouponModal(false)} className="p-1 rounded hover:bg-surface-container">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-label-sm mb-1">Coupon Code</label>
                <input required value={cForm.code} onChange={(e) => setCForm({ ...cForm, code: e.target.value.toUpperCase() })} placeholder="CARE20" className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant uppercase" />
              </div>
              <div>
                <label className="block font-label-sm mb-1">Title</label>
                <input required value={cForm.title} onChange={(e) => setCForm({ ...cForm, title: e.target.value })} placeholder="Monsoon Immunity Sale" className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
              <div>
                <label className="block font-label-sm mb-1">Type</label>
                <select value={cForm.discountType} onChange={(e) => setCForm({ ...cForm, discountType: e.target.value as Coupon['discountType'] })} className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant">
                  <option value="Percentage">Percentage (%)</option>
                  <option value="Fixed">Fixed (INR)</option>
                </select>
              </div>
              <div>
                <label className="block font-label-sm mb-1">Discount Value</label>
                <input type="number" required value={cForm.discountValue} onChange={(e) => setCForm({ ...cForm, discountValue: Number(e.target.value) })} className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
              <div>
                <label className="block font-label-sm mb-1">Max Cap (INR)</label>
                <input type="number" required value={cForm.maxDiscountAmount} onChange={(e) => setCForm({ ...cForm, maxDiscountAmount: Number(e.target.value) })} className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
              <div>
                <label className="block font-label-sm mb-1">Min Order (INR)</label>
                <input type="number" required value={cForm.minOrderAmount} onChange={(e) => setCForm({ ...cForm, minOrderAmount: Number(e.target.value) })} className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
              <div>
                <label className="block font-label-sm mb-1">Total Usage Limit</label>
                <input type="number" min={1} required value={cForm.usageLimit} onChange={(e) => setCForm({ ...cForm, usageLimit: Number(e.target.value) })} className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
              <div>
                <label className="block font-label-sm mb-1">Per-Customer Limit</label>
                <input type="number" min={1} required value={cForm.perCustomerLimit} onChange={(e) => setCForm({ ...cForm, perCustomerLimit: Number(e.target.value) })} className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
              <div>
                <label className="block font-label-sm mb-1">Start Date</label>
                <input type="date" required value={cForm.startDate} onChange={(e) => setCForm({ ...cForm, startDate: e.target.value })} className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
              <div>
                <label className="block font-label-sm mb-1">Expiry Date</label>
                <input type="date" required value={cForm.expiryDate} onChange={(e) => setCForm({ ...cForm, expiryDate: e.target.value })} className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
            </div>

            <div>
              <label className="block font-label-sm mb-1">Category Scope (leave unchecked for all eligible)</label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-lg bg-surface-container-low">
                {categories.filter((cat) => cat.status === 'Active').map((cat) => {
                  const checked = cForm.categoryIds.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategoryRestriction(cat.id)}
                      className={`px-2 py-0.5 rounded text-[11px] font-label-sm ${
                        checked ? 'bg-primary-container text-on-primary' : 'bg-surface-container-lowest text-on-surface-variant'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center gap-2 text-body-sm">
              <input type="checkbox" checked={cForm.excludeDpcoScheduled} onChange={(e) => setCForm({ ...cForm, excludeDpcoScheduled: e.target.checked })} />
              <span>Exclude DPCO Price-Capped & Schedule H1/X Drugs</span>
            </label>
            <div className="p-3 rounded-xl bg-primary-fixed/40 text-body-sm">
              <strong>Live Cart Preview:</strong> Use code <strong>{cForm.code || 'CODE'}</strong> to save{' '}
              {cForm.discountType === 'Percentage' ? `${cForm.discountValue}% up to ${formatINR(cForm.maxDiscountAmount)}` : formatINR(cForm.discountValue)} on carts above {formatINR(cForm.minOrderAmount)}.
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCouponModal(false)} className="px-4 py-2 rounded-lg bg-surface-container">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md">
                {editingCouponId ? 'Save Coupon Changes' : 'Publish Coupon'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Campaign Modal */}
      {campaignModal && (
        <div className="fixed inset-0 z-[85] bg-on-surface/40 flex items-center justify-center p-4">
          <form onSubmit={handleSaveCampaign} className="bg-surface-container-lowest rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-title-lg text-on-surface">
                {editingCampaignId ? 'Edit Campaign' : 'Launch Campaign'}
              </h3>
              <button type="button" onClick={() => setCampaignModal(false)} className="p-1 rounded hover:bg-surface-container">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div>
              <label className="block font-label-sm mb-1">Campaign Name</label>
              <input required value={cmpForm.name} onChange={(e) => setCmpForm({ ...cmpForm, name: e.target.value })} placeholder="Campaign Name" className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-label-sm mb-1">Channel</label>
                <select value={cmpForm.channel} onChange={(e) => setCmpForm({ ...cmpForm, channel: e.target.value as Campaign['channel'] })} className="w-full min-w-0 h-9 px-2 rounded-lg bg-surface-container-low border border-outline-variant">
                  <option value="In-App & Web">In-App & Web</option>
                  <option value="WhatsApp (Simulated)">WhatsApp (Simulated)</option>
                  <option value="Email (Simulated)">Email (Simulated)</option>
                  <option value="Push (Simulated)">Push (Simulated)</option>
                </select>
              </div>
              <div>
                <label className="block font-label-sm mb-1">Status</label>
                <select value={cmpForm.status} onChange={(e) => setCmpForm({ ...cmpForm, status: e.target.value as Campaign['status'] })} className="w-full min-w-0 h-9 px-2 rounded-lg bg-surface-container-low border border-outline-variant">
                  <option value="Scheduled">Scheduled</option>
                  <option value="Active">Active</option>
                  <option value="Paused">Paused</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block font-label-sm mb-1">Target Patient Segment</label>
              <input required value={cmpForm.targetGroup} onChange={(e) => setCmpForm({ ...cmpForm, targetGroup: e.target.value })} placeholder="Target Patient Segment" className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-label-sm mb-1">Start Date</label>
                <input type="date" required value={cmpForm.startDate} onChange={(e) => setCmpForm({ ...cmpForm, startDate: e.target.value })} className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
              <div>
                <label className="block font-label-sm mb-1">End Date</label>
                <input type="date" required value={cmpForm.endDate} onChange={(e) => setCmpForm({ ...cmpForm, endDate: e.target.value })} className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
            </div>
            <div>
              <label className="block font-label-sm mb-1">Budget (INR)</label>
              <input type="number" required value={cmpForm.budget} onChange={(e) => setCmpForm({ ...cmpForm, budget: Number(e.target.value) })} placeholder="Budget INR" className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setCampaignModal(false)} className="px-4 py-2 rounded-lg bg-surface-container">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md">Save Campaign</button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete Coupon ${deleteTarget?.code || ''}?`}
        description="This permanently removes the coupon code from storefront checkout."
        confirmLabel="Delete Coupon"
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) {
            const res = deleteCoupon(deleteTarget.id);
            pushToast({
              type: res.ok ? 'success' : 'error',
              title: res.ok ? 'Coupon Deleted' : 'Delete Failed',
              description: res.message,
            });
          }
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
