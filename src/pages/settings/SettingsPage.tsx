import React, { useEffect, useState } from 'react';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { emailSchema, gstinSchema, indianPhoneSchema } from '../../utils/validation';

export function SettingsPage() {
  const pushToast = useToastStore((s) => s.pushToast);

  const settings = usePharmacyStore((s) => s.settings);
  const updateSettings = usePharmacyStore((s) => s.updateSettings);
  const resetDemoData = usePharmacyStore((s) => s.resetDemoData);
  const can = usePharmacyStore((s) => s.can);

  const [form, setForm] = useState(settings);
  const [tab, setTab] = useState<'business' | 'tax_shipping' | 'dispensing' | 'integrations'>('business');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  useEffect(() => {
    setForm(settings);
    setErrors({});
  }, [settings]);

  const canEdit = can('settings', 'edit');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const gstRes = gstinSchema.safeParse(form.gstin.toUpperCase());
    if (!gstRes.success) errs.gstin = gstRes.error.issues[0].message;

    const mailRes = emailSchema.safeParse(form.supportEmail);
    if (!mailRes.success) errs.supportEmail = mailRes.error.issues[0].message;

    const phoneRes = indianPhoneSchema.safeParse(form.supportPhone);
    if (!phoneRes.success) errs.supportPhone = phoneRes.error.issues[0].message;

    if (!form.pharmacyName.trim()) errs.pharmacyName = 'Pharmacy name is required';
    if (!form.drugLicenseNumber20B.trim() || !form.drugLicenseNumber21B.trim()) {
      errs.license = 'Form 20B and Form 21B drug license numbers are mandatory';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      pushToast({ type: 'error', title: 'Validation Error', description: Object.values(errs)[0] });
      return;
    }

    setErrors({});
    const res = updateSettings({
      ...form,
      gstin: form.gstin.trim().toUpperCase(),
      supportEmail: mailRes.success ? mailRes.data : form.supportEmail,
      supportPhone: phoneRes.success ? phoneRes.data : form.supportPhone,
    });
    pushToast({
      type: res.ok ? 'success' : 'error',
      title: res.ok ? 'Configuration Saved' : 'Blocked',
      description: res.message,
    });
  };

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <span className="font-label-sm text-primary uppercase tracking-wider">Statutory & Platform Governance</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Pharmacy Configuration & Rules</h1>
          <p className="font-body-md text-on-surface-variant">
            GSTIN, Drug Licenses 20B/21B, dispensing safety gates, GST slabs & demo environment reset
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setResetConfirmOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-error-container text-on-error-container font-title-md text-body-sm self-start"
          >
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>
            <span>Reset Demo Data</span>
          </button>
        )}
      </div>

      {/* Section Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-outline-variant/30 pb-2">
        {(
          [
            { id: 'business', label: 'Business & Drug Licenses' },
            { id: 'tax_shipping', label: 'Tax & Shipping' },
            { id: 'dispensing', label: 'Dispensing & Returns' },
            { id: 'integrations', label: 'Integrations & Security' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg font-title-md text-body-sm ${
              tab === t.id ? 'bg-primary-container text-on-primary' : 'bg-surface-container-lowest text-on-surface-variant'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="bg-surface-container-lowest p-4 sm:p-6 rounded-xl shadow-sm space-y-5">
        {tab === 'business' && (
          <div className="space-y-4">
            <h2 className="font-title-lg text-on-surface">Legal Entity & CDSCO Drug Licenses</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-label-sm mb-1">Pharmacy Brand Name *</label>
                <input
                  disabled={!canEdit}
                  value={form.pharmacyName}
                  onChange={(e) => setForm({ ...form, pharmacyName: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant"
                />
                {errors.pharmacyName && <p className="text-error text-body-sm mt-1">{errors.pharmacyName}</p>}
              </div>
              <div>
                <label className="block font-label-sm mb-1">15-Digit GSTIN *</label>
                <input
                  disabled={!canEdit}
                  value={form.gstin}
                  onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                  className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant font-mono uppercase"
                />
                {errors.gstin && <p className="text-error text-body-sm mt-1">{errors.gstin}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="block font-label-sm mb-1">Legal Entity Name</label>
                <input
                  disabled={!canEdit}
                  value={form.legalEntityName}
                  onChange={(e) => setForm({ ...form, legalEntityName: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant"
                />
              </div>
              <div>
                <label className="block font-label-sm mb-1">Form 20B Wholesale License *</label>
                <input
                  disabled={!canEdit}
                  value={form.drugLicenseNumber20B}
                  onChange={(e) => setForm({ ...form, drugLicenseNumber20B: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant font-mono"
                />
              </div>
              <div>
                <label className="block font-label-sm mb-1">Form 21B Retail/Restricted License *</label>
                <input
                  disabled={!canEdit}
                  value={form.drugLicenseNumber21B}
                  onChange={(e) => setForm({ ...form, drugLicenseNumber21B: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant font-mono"
                />
              </div>
              <div>
                <label className="block font-label-sm mb-1">Patient Support Email *</label>
                <input
                  type="email"
                  disabled={!canEdit}
                  value={form.supportEmail}
                  onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant"
                />
                {errors.supportEmail && <p className="text-error text-body-sm mt-1">{errors.supportEmail}</p>}
              </div>
              <div>
                <label className="block font-label-sm mb-1">Support Helpline (+91) *</label>
                <input
                  disabled={!canEdit}
                  value={form.supportPhone}
                  onChange={(e) => setForm({ ...form, supportPhone: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant"
                />
                {errors.supportPhone && <p className="text-error text-body-sm mt-1">{errors.supportPhone}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="block font-label-sm mb-1">Registered Office Address</label>
                <input
                  disabled={!canEdit}
                  value={form.registeredAddress}
                  onChange={(e) => setForm({ ...form, registeredAddress: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant"
                />
              </div>
            </div>
            {errors.license && <p className="text-error text-body-sm">{errors.license}</p>}
          </div>
        )}

        {tab === 'tax_shipping' && (
          <div className="space-y-4">
            <h2 className="font-title-lg text-on-surface">GST Slabs & Delivery Charges (INR)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block font-label-sm mb-1">Default GST Slab (%)</label>
                <select
                  disabled={!canEdit}
                  value={form.defaultGstSlab}
                  onChange={(e) => setForm({ ...form, defaultGstSlab: Number(e.target.value) as 5 | 12 | 18 })}
                  className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant"
                >
                  <option value={5}>5% (Essential / Insulin)</option>
                  <option value={12}>12% (Standard Pharma)</option>
                  <option value={18}>18% (Devices & Supplements)</option>
                </select>
              </div>
              <div>
                <label className="block font-label-sm mb-1">Free Delivery Threshold (₹)</label>
                <input
                  type="number"
                  min={0}
                  disabled={!canEdit}
                  value={form.freeDeliveryThreshold}
                  onChange={(e) => setForm({ ...form, freeDeliveryThreshold: Number(e.target.value) })}
                  className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant"
                />
              </div>
              <div>
                <label className="block font-label-sm mb-1">Standard Shipping Fee (₹)</label>
                <input
                  type="number"
                  min={0}
                  disabled={!canEdit}
                  value={form.standardShippingFee}
                  onChange={(e) => setForm({ ...form, standardShippingFee: Number(e.target.value) })}
                  className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant"
                />
              </div>
              <div>
                <label className="block font-label-sm mb-1">Cold-Chain Packaging Fee (₹)</label>
                <input
                  type="number"
                  min={0}
                  disabled={!canEdit}
                  value={form.coldChainSurcharge}
                  onChange={(e) => setForm({ ...form, coldChainSurcharge: Number(e.target.value) })}
                  className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant"
                />
              </div>
            </div>
          </div>
        )}

        {tab === 'dispensing' && (
          <div className="space-y-4">
            <h2 className="font-title-lg text-on-surface">CDSCO Rule 65 Dispensing Gates & Returns</h2>
            <div className="max-w-xs">
              <label className="block font-label-sm mb-1">Sealed OTC Return Window (Days)</label>
              <input
                type="number"
                min={0}
                max={30}
                disabled={!canEdit}
                value={form.returnWindowDays}
                onChange={(e) => setForm({ ...form, returnWindowDays: Number(e.target.value) })}
                className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant"
              />
            </div>
            <div className="space-y-3 pt-1">
              <label className="flex items-center gap-2.5 text-body-sm">
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={form.blockOrderDispatchWithoutRxApproval}
                  onChange={(e) => setForm({ ...form, blockOrderDispatchWithoutRxApproval: e.target.checked })}
                />
                <span>Block Order Packing & Dispatch without Pharmacist Rx Approval</span>
              </label>
              <label className="flex items-center gap-2.5 text-body-sm">
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={form.requirePharmacistDualSignOffScheduleH1}
                  onChange={(e) => setForm({ ...form, requirePharmacistDualSignOffScheduleH1: e.target.checked })}
                />
                <span>Require Dual Clinical Check for Schedule H1 / Narcotic SKUs</span>
              </label>
              <label className="flex items-center gap-2.5 text-body-sm">
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={form.autoQuarantineExpiredBatches}
                  onChange={(e) => setForm({ ...form, autoQuarantineExpiredBatches: e.target.checked })}
                />
                <span>Auto-Quarantine Expired Batches from FEFO Checkout</span>
              </label>
              <label className="flex items-center gap-2.5 text-body-sm">
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={form.allowReturnForColdChain}
                  onChange={(e) => setForm({ ...form, allowReturnForColdChain: e.target.checked })}
                />
                <span>Allow Return Override for Cold-Chain / Schedule H (Disabled per Rule 65 by default)</span>
              </label>
            </div>
          </div>
        )}

        {tab === 'integrations' && (
          <div className="space-y-4">
            <h2 className="font-title-lg text-on-surface">External Gateways & Session Security</h2>
            <div className="max-w-xs">
              <label className="block font-label-sm mb-1">Admin Session Timeout (Minutes)</label>
              <input
                type="number"
                min={15}
                max={1440}
                disabled={!canEdit}
                value={form.sessionTimeoutMinutes}
                onChange={(e) => setForm({ ...form, sessionTimeoutMinutes: Number(e.target.value) })}
                className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-surface-container-low">
                <div className="font-label-sm text-on-surface-variant">Payment Gateway</div>
                <div className="font-title-md text-primary mt-0.5">{form.integrations.paymentGatewayMode}</div>
              </div>
              <div className="p-3 rounded-xl bg-surface-container-low">
                <div className="font-label-sm text-on-surface-variant">SMS Provider</div>
                <div className="font-title-md text-primary mt-0.5">{form.integrations.smsProviderMode}</div>
              </div>
              <div className="p-3 rounded-xl bg-surface-container-low">
                <div className="font-label-sm text-on-surface-variant">Email Dispatch</div>
                <div className="font-title-md text-primary mt-0.5">{form.integrations.emailProviderMode}</div>
              </div>
              <div className="p-3 rounded-xl bg-surface-container-low">
                <div className="font-label-sm text-on-surface-variant">3PL Courier Webhook</div>
                <div className="font-title-md text-primary mt-0.5">{form.integrations.courierWebhookMode}</div>
              </div>
              <div className="p-3 rounded-xl bg-surface-container-low">
                <div className="font-label-sm text-on-surface-variant">ABDM Health ID Sync</div>
                <div className="font-title-md text-primary mt-0.5">{form.integrations.abdmHealthIdSync}</div>
              </div>
            </div>
          </div>
        )}

        {canEdit && (
          <div className="pt-4 border-t border-outline-variant/30 flex justify-end">
            <button type="submit" className="px-5 py-2 rounded-lg bg-primary-container text-on-primary font-title-md text-body-sm hover:bg-primary">
              Save Configuration
            </button>
          </div>
        )}
      </form>

      <ConfirmDialog
        open={resetConfirmOpen}
        title="Reset All Demo Data?"
        description="This restores all orders, batches, prescriptions, staff, RBAC permissions, and settings back to the clean initial Healthy Ghar seed dataset."
        confirmLabel="Reset Demo Workspace"
        variant="danger"
        onConfirm={() => {
          resetDemoData();
          setResetConfirmOpen(false);
          pushToast({ type: 'success', title: 'Demo Workspace Reset', description: 'Fresh Healthy Ghar operational seed data restored.' });
        }}
        onCancel={() => setResetConfirmOpen(false)}
      />
    </div>
  );
}
