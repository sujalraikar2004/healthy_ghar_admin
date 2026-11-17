import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';
import { formatIndianDate, formatIndianDateTime, maskPhone } from '../../utils/formatters';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export function PrescriptionReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const pushToast = useToastStore((s) => s.pushToast);

  const prescriptions = usePharmacyStore((s) => s.prescriptions);
  const customers = usePharmacyStore((s) => s.customers);
  const orders = usePharmacyStore((s) => s.orders);
  const products = usePharmacyStore((s) => s.products);
  const inventory = usePharmacyStore((s) => s.inventory);
  const reviewPrescription = usePharmacyStore((s) => s.reviewPrescription);
  const can = usePharmacyStore((s) => s.can);

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [highContrast, setHighContrast] = useState(false);
  const [notes, setNotes] = useState('');
  const [checklist, setChecklist] = useState({
    rmpVerified: true,
    dateValid: true,
    dosageLegible: true,
    patientMatched: true,
  });
  const [pendingDecision, setPendingDecision] = useState<
    'Approved' | 'Rejected' | 'Clarification Requested' | null
  >(null);

  const rx = useMemo(() => prescriptions.find((r) => r.id === id), [prescriptions, id]);
  const customer = useMemo(() => customers.find((c) => c.id === rx?.customerId), [customers, rx]);
  const linkedOrder = useMemo(
    () => orders.find((o) => o.id === rx?.orderId || o.prescriptionId === rx?.id),
    [orders, rx]
  );

  if (!rx) {
    return (
      <div className="p-space-xl text-center space-y-4">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant">clinical_notes</span>
        <h2 className="font-headline-md text-on-surface">Prescription Record Not Found</h2>
        <button
          type="button"
          onClick={() => navigate('/prescriptions')}
          className="px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md"
        >
          Back to Queue
        </button>
      </div>
    );
  }

  const canApprove = can('prescriptions', 'approve');
  const allChecksPassed = Object.values(checklist).every(Boolean);
  const isFinalized = rx.status === 'Approved' || rx.status === 'Rejected';

  const handleConfirmDecision = (reasonFromDialog: string) => {
    if (!pendingDecision) return;
    const combinedNotes = reasonFromDialog || notes;
    const res = reviewPrescription({
      rxId: rx.id,
      decision: pendingDecision,
      notes: combinedNotes,
    });
    setPendingDecision(null);
    if (!res.ok) {
      pushToast({ type: 'error', title: 'Clinical Sign-off Blocked', description: res.message });
      return;
    }
    pushToast({ type: 'success', title: `Rx ${pendingDecision}`, description: res.message });
  };

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => navigate('/prescriptions')}
            className="flex items-center gap-1 font-label-md text-primary hover:underline mb-1"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Back to Prescription Queue</span>
          </button>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-headline-lg text-headline-lg text-on-surface">{rx.rxNumber}</h1>
            <span className="px-2.5 py-1 rounded-md bg-primary-fixed text-on-primary-fixed font-label-sm">
              {rx.status}
            </span>
            {rx.containsScheduleH1 && (
              <span className="px-2.5 py-1 rounded-md bg-tertiary-fixed text-on-tertiary-fixed font-label-sm">
                Schedule H1 Controlled
              </span>
            )}
            <span className="px-2.5 py-1 rounded-md bg-surface-container text-on-surface-variant font-label-sm">
              Demo Sample Scan
            </span>
          </div>
        </div>

        {linkedOrder && (
          <button
            type="button"
            onClick={() => navigate(`/orders/${linkedOrder.id}`)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container-lowest shadow-sm font-title-md text-body-sm text-primary hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
            <span>Linked Order: {linkedOrder.orderNumber}</span>
          </button>
        )}
      </div>

      {/* Split-Pane Clinical Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        {/* Left: Document Viewer */}
        <div className="lg:col-span-6 bg-surface-container-lowest rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-3 bg-surface-container-low border-b border-outline-variant/40 flex flex-wrap items-center justify-between gap-2">
            <span className="font-label-md text-on-surface">{rx.documentReference}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))))}
                className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface"
                title="Zoom Out"
              >
                <span className="material-symbols-outlined text-[18px]">zoom_out</span>
              </button>
              <span className="font-label-sm w-12 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.8, Number((z + 0.15).toFixed(2))))}
                className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface"
                title="Zoom In"
              >
                <span className="material-symbols-outlined text-[18px]">zoom_in</span>
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface"
                title="Rotate 90°"
              >
                <span className="material-symbols-outlined text-[18px]">rotate_right</span>
              </button>
              <button
                type="button"
                onClick={() => setHighContrast((v) => !v)}
                className={`px-2.5 py-1 rounded-lg font-label-sm ${
                  highContrast ? 'bg-on-surface text-surface' : 'bg-surface-container text-on-surface'
                }`}
              >
                B&W Contrast
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setRotation(0);
                  setHighContrast(false);
                }}
                className="px-2 py-1 rounded-lg hover:bg-surface-container font-label-sm text-primary"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="flex-1 bg-surface-container p-3 sm:p-6 overflow-auto min-h-[340px] sm:min-h-[460px] flex items-center justify-center">
            <div
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                filter: highContrast ? 'grayscale(100%) contrast(155%)' : 'none',
              }}
              className="transition-transform duration-150 origin-center bg-white text-slate-900 w-full max-w-md rounded-lg shadow-md border border-slate-300 p-4 sm:p-6"
            >
              <div className="flex items-start justify-between border-b-2 border-teal-700 pb-3">
                <div>
                  <div className="text-sm font-bold text-teal-800 uppercase">{rx.clinicName}</div>
                  <div className="text-xs font-semibold text-slate-800">{rx.doctorName}</div>
                  <div className="text-[11px] text-slate-600">Reg No: {rx.doctorRegNo}</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold">
                  SAMPLE DEMO RX
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] py-3 border-b border-slate-200">
                <div>
                  <span className="text-slate-500">Patient:</span>{' '}
                  <span className="font-semibold">{customer?.name || 'Patient'}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Date:</span>{' '}
                  <span className="font-semibold">{formatIndianDate(rx.prescriptionDate)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Age / Sex:</span>{' '}
                  <span>{customer?.age || 42}Y / {customer?.gender || 'Adult'}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Rx ID:</span> <span>{rx.rxNumber}</span>
                </div>
              </div>

              <div className="py-4 space-y-3">
                <div className="text-lg font-serif italic font-bold text-teal-800">℞</div>
                {rx.extractedDrugs.map((drug, i) => (
                  <div key={i} className="pl-2 border-l-2 border-teal-600">
                    <div className="text-xs font-bold text-slate-900">
                      {i + 1}. {drug.name} ({drug.dosage})
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Sig: {drug.frequency} • Duration: {drug.duration} • [{drug.schedule}]
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-3 border-t border-slate-200 flex justify-between items-end text-[10px] text-slate-500">
                <div>Verified Digital Sample Document</div>
                <div className="text-right">
                  <div className="font-serif italic text-xs text-slate-800">{rx.doctorName}</div>
                  <div>Authorized Prescriber Signature</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Clinical Verification & Sign-Off */}
        <div className="lg:col-span-6 space-y-space-md">
          {/* Patient Context */}
          <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-title-md text-on-surface">Patient Clinical Profile</h3>
              <span className="font-label-sm text-on-surface-variant">{customer?.customerCode}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-body-sm">
              <span className="font-title-md text-primary">{customer?.name}</span>
              <span className="text-on-surface-variant">{maskPhone(customer?.phone || '', canApprove)}</span>
              <span className="text-on-surface-variant">{customer?.city}</span>
            </div>
            {customer && (customer.allergies.length > 0 || customer.chronicTags.length > 0) && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {customer.allergies.map((al) => (
                  <span key={al} className="px-2 py-0.5 rounded bg-error-container text-on-error-container font-label-sm">
                    Allergy: {al}
                  </span>
                ))}
                {customer.chronicTags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-label-sm">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Extracted Medicines & Stock */}
          <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm space-y-3">
            <h3 className="font-title-md text-on-surface">Extracted Formulations & Hub Stock</h3>
            <div className="space-y-2">
              {rx.extractedDrugs.map((drug, idx) => {
                const matched = products.find((p) => p.id === drug.matchedProductId);
                const avail = matched
                  ? inventory.filter((i) => i.productId === matched.id).reduce((s, i) => s + i.availableQty, 0)
                  : 0;
                return (
                  <div key={idx} className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between gap-2">
                    <div>
                      <div className="font-title-md text-on-surface text-body-sm">{drug.name}</div>
                      <div className="text-[11px] text-on-surface-variant">
                        {drug.dosage} • {drug.frequency} • {drug.duration}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-sm">
                        {drug.schedule}
                      </span>
                      <div className="text-[11px] text-primary mt-1 font-label-sm">
                        {matched ? `Stock: ${avail} units` : 'Manual Match'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Statutory Checklist */}
          <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm space-y-2.5">
            <h3 className="font-title-md text-on-surface">Statutory Rule 65 Dispensing Checklist</h3>
            {(
              [
                { key: 'rmpVerified', label: `Prescriber NMC/SMC Registration verified (${rx.doctorRegNo})` },
                { key: 'dateValid', label: 'Prescription date is within valid 6-month dispensing window' },
                { key: 'dosageLegible', label: 'Drug strength, dosage schedule, and duration are legible' },
                { key: 'patientMatched', label: 'Patient identity matches order consignee & allergy profile checked' },
              ] as const
            ).map((chk) => (
              <label key={chk.key} className="flex items-center gap-2.5 font-body-sm text-on-surface cursor-pointer">
                <input
                  type="checkbox"
                  disabled={isFinalized}
                  checked={checklist[chk.key]}
                  onChange={(e) => setChecklist((prev) => ({ ...prev, [chk.key]: e.target.checked }))}
                  className="rounded border-outline-variant text-primary focus:ring-primary disabled:opacity-60"
                />
                <span>{chk.label}</span>
              </label>
            ))}
          </div>

          {/* Pharmacist Decision Box */}
          <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm space-y-3">
            <h3 className="font-title-md text-on-surface">Pharmacist Clinical Sign-Off</h3>
            {isFinalized ? (
              <div
                className={`p-3 rounded-xl font-body-sm flex items-start gap-2 ${
                  rx.status === 'Approved'
                    ? 'bg-primary-fixed text-on-primary-fixed'
                    : 'bg-error-container text-on-error-container'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {rx.status === 'Approved' ? 'verified' : 'cancel'}
                </span>
                <div>
                  <div className="font-title-md">Clinical Decision Recorded: {rx.status}</div>
                  <div className="mt-0.5">
                    This prescription has been digitally signed off and locked against duplicate re-submission.
                  </div>
                </div>
              </div>
            ) : !canApprove ? (
              <div className="p-3 rounded-xl bg-error-container text-on-error-container font-body-sm">
                RBAC Lock: Only a licensed Pharmacist (RMP) or Super Admin can approve, reject, or request clarification on prescriptions.
              </div>
            ) : (
              <>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional clinical note for approval, or mandatory reason for rejection/clarification..."
                  className="w-full rounded-lg bg-surface-container-low border border-outline-variant px-3 py-2 font-body-sm text-on-surface"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={!allChecksPassed}
                    onClick={() => setPendingDecision('Approved')}
                    className="px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md text-body-sm hover:bg-primary disabled:opacity-50"
                  >
                    Approve & Unlock Order
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDecision('Clarification Requested')}
                    className="px-3.5 py-2 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed font-title-md text-body-sm"
                  >
                    Request Clarification
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDecision('Rejected')}
                    className="px-3.5 py-2 rounded-lg bg-error-container text-on-error-container font-title-md text-body-sm"
                  >
                    Reject Prescription
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Review History */}
          {rx.reviewHistory.length > 0 && (
            <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm space-y-2">
              <h3 className="font-title-md text-on-surface">Verification Audit Log</h3>
              {rx.reviewHistory.map((ev) => (
                <div key={ev.id} className="p-2.5 rounded-lg bg-surface-container-low font-body-sm">
                  <div className="flex justify-between">
                    <span className="font-title-md text-on-surface">
                      {ev.action} — {ev.reviewerName} ({ev.reviewerRegNo})
                    </span>
                    <span className="font-label-sm text-on-surface-variant">{formatIndianDateTime(ev.timestamp)}</span>
                  </div>
                  <p className="text-on-surface-variant mt-0.5">{ev.notes}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDecision)}
        title={`Confirm Prescription ${pendingDecision || ''}`}
        description={
          pendingDecision === 'Approved'
            ? `Digitally sign off ${rx.rxNumber} under your Pharmacist Registration and unlock the linked order for dispatch.`
            : `Provide a clinical explanation for marking ${rx.rxNumber} as ${pendingDecision}.`
        }
        confirmLabel={`Confirm ${pendingDecision || ''}`}
        variant={pendingDecision === 'Rejected' ? 'danger' : pendingDecision === 'Clarification Requested' ? 'warning' : 'primary'}
        requireReason={pendingDecision !== 'Approved'}
        onConfirm={handleConfirmDecision}
        onCancel={() => setPendingDecision(null)}
      />
    </div>
  );
}
