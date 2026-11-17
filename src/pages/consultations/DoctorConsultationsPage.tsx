import React, { useMemo, useState } from 'react';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';
import { Consultation, ConsultationStatus } from '../../types';
import { formatIndianDateTime, formatINR } from '../../utils/formatters';

export function DoctorConsultationsPage() {
  const pushToast = useToastStore((s) => s.pushToast);

  const consultations = usePharmacyStore((s) => s.consultations);
  const customers = usePharmacyStore((s) => s.customers);
  const doctors = usePharmacyStore((s) => s.doctors);
  const createConsultation = usePharmacyStore((s) => s.createConsultation);
  const updateConsultationStatus = usePharmacyStore((s) => s.updateConsultationStatus);
  const can = usePharmacyStore((s) => s.can);

  const [statusFilter, setStatusFilter] = useState<'ALL' | ConsultationStatus>('ALL');
  const [bookOpen, setBookOpen] = useState(false);
  const [notesModal, setNotesModal] = useState<Consultation | null>(null);
  const [clinicalNotes, setClinicalNotes] = useState('');

  const [form, setForm] = useState({
    customerId: customers[0]?.id || '',
    doctorId: doctors[0]?.id || '',
    scheduledAt: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    mode: 'Video' as Consultation['mode'],
    chiefComplaint: '',
  });

  const filtered = useMemo(
    () => consultations.filter((c) => statusFilter === 'ALL' || c.status === statusFilter),
    [consultations, statusFilter]
  );

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    const res = createConsultation({
      ...form,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
    });
    if (!res.ok) {
      pushToast({ type: 'error', title: 'Scheduling Failed', description: res.message });
      return;
    }
    pushToast({ type: 'success', title: 'Consultation Scheduled', description: res.message });
    setBookOpen(false);
    setForm((f) => ({ ...f, chiefComplaint: '' }));
  };

  const handleCompleteWithNotes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notesModal) return;
    const res = updateConsultationStatus(notesModal.id, 'Completed', clinicalNotes);
    pushToast({ type: res.ok ? 'success' : 'error', title: res.ok ? 'Session Completed' : 'Error', description: res.message });
    if (res.ok) setNotesModal(null);
  };

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <span className="font-label-sm text-primary uppercase tracking-wider">Telemedicine Operations</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Doctor Consultations Queue</h1>
          <p className="font-body-md text-on-surface-variant">
            Manage video/audio/chat patient triage, consultation slots, and clinical summary notes
          </p>
        </div>
        {can('consultations', 'create') && (
          <button
            type="button"
            onClick={() => setBookOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md text-body-sm hover:bg-primary self-start"
          >
            <span className="material-symbols-outlined text-[18px]">video_call</span>
            <span>Schedule Consultation</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(['ALL', 'Requested', 'Scheduled', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'] as const).map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg font-label-md whitespace-nowrap ${
              statusFilter === st ? 'bg-primary-container text-on-primary' : 'bg-surface-container-lowest text-on-surface-variant'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
        {filtered.length === 0 ? (
          <div className="lg:col-span-2 bg-surface-container-lowest p-10 rounded-xl shadow-sm text-center text-on-surface-variant font-body-sm">
            No consultations match the selected status filter.
          </div>
        ) : (
          filtered.map((c) => (
            <div key={c.id} className="bg-surface-container-lowest p-5 rounded-xl shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-title-md text-primary">{c.consultationCode}</span>
                    <span className="px-2 py-0.5 rounded bg-surface-container font-label-sm">{c.mode}</span>
                    <span className="px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-label-sm">{c.status}</span>
                  </div>
                  <h3 className="font-title-lg text-on-surface mt-1">{c.customerName}</h3>
                  <p className="font-body-sm text-on-surface-variant">
                    With {c.doctorName} ({c.specialization}) • Fee: {formatINR(c.fee)} ({c.paymentStatus})
                  </p>
                </div>
                <span className="font-label-sm text-on-surface-variant shrink-0">{formatIndianDateTime(c.scheduledAt)}</span>
              </div>

              <div className="p-3 rounded-lg bg-surface-container-low font-body-sm text-on-surface">
                <strong>Chief Complaint:</strong> {c.chiefComplaint}
              </div>
              {c.clinicalNotes && (
                <div className="p-3 rounded-lg bg-primary-fixed/40 font-body-sm text-on-primary-fixed">
                  <strong>Clinical Notes:</strong> {c.clinicalNotes}
                </div>
              )}

              {can('consultations', 'edit') && c.status !== 'Completed' && c.status !== 'Cancelled' && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {c.status !== 'In Progress' && (
                    <button
                      type="button"
                      onClick={() => {
                        const res = updateConsultationStatus(c.id, 'In Progress');
                        pushToast({
                          type: res.ok ? 'info' : 'error',
                          title: res.ok ? 'Session Active' : 'Start Blocked',
                          description: res.message,
                        });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-secondary-container text-on-secondary-container font-label-md"
                    >
                      Start Session
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setNotesModal(c);
                      setClinicalNotes(c.clinicalNotes || '');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary font-label-md"
                  >
                    Complete & Log Notes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const res = updateConsultationStatus(c.id, 'Cancelled', 'Cancelled by tele-ops desk');
                      pushToast({
                        type: res.ok ? 'warning' : 'error',
                        title: res.ok ? 'Consultation Cancelled' : 'Cancel Blocked',
                        description: res.message,
                      });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-error-container text-on-error-container font-label-md"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Book Modal */}
      {bookOpen && (
        <div className="fixed inset-0 z-[85] bg-on-surface/40 flex items-center justify-center p-4">
          <form onSubmit={handleBook} className="bg-surface-container-lowest rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-title-lg text-on-surface">Schedule Telehealth Consultation</h3>
              <button type="button" onClick={() => setBookOpen(false)} className="p-1 rounded hover:bg-surface-container">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div>
              <label className="block font-label-md mb-1">Patient</label>
              <select
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                className="w-full min-w-0 h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.city}){c.status !== 'Active' ? ` [${c.status}]` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-label-md mb-1">Doctor</label>
              <select
                value={form.doctorId}
                onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
                className="w-full min-w-0 h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.specialization} ({formatINR(d.consultationFee)}) [{d.status}]
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-label-md mb-1">Slot</label>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                  className="w-full h-10 px-2.5 rounded-lg bg-surface-container-low border border-outline-variant text-body-sm"
                />
              </div>
              <div>
                <label className="block font-label-md mb-1">Mode</label>
                <select
                  value={form.mode}
                  onChange={(e) => setForm({ ...form, mode: e.target.value as Consultation['mode'] })}
                  className="w-full h-10 px-2.5 rounded-lg bg-surface-container-low border border-outline-variant"
                >
                  <option value="Video">Video</option>
                  <option value="Audio">Audio</option>
                  <option value="Chat">Chat</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block font-label-md mb-1">Chief Complaint</label>
              <textarea
                rows={2}
                required
                value={form.chiefComplaint}
                onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })}
                placeholder="Symptoms, refill request, or lab review..."
                className="w-full p-2.5 rounded-lg bg-surface-container-low border border-outline-variant"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setBookOpen(false)} className="px-4 py-2 rounded-lg bg-surface-container">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md">
                Confirm Booking
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Clinical Notes Modal */}
      {notesModal && (
        <div className="fixed inset-0 z-[85] bg-on-surface/40 flex items-center justify-center p-4">
          <form onSubmit={handleCompleteWithNotes} className="bg-surface-container-lowest rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-title-lg text-on-surface">Complete Consultation ({notesModal.consultationCode})</h3>
              <button type="button" onClick={() => setNotesModal(null)} className="p-1 rounded hover:bg-surface-container">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <textarea
              rows={4}
              required
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Diagnosis summary, advised tests, and Rx guidance..."
              className="w-full p-3 rounded-lg bg-surface-container-low border border-outline-variant"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setNotesModal(null)} className="px-4 py-2 rounded-lg bg-surface-container">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md">
                Save & Complete
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
