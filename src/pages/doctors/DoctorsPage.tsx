import React, { useState } from 'react';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';
import { Doctor } from '../../types';
import { formatINR } from '../../utils/formatters';

export function DoctorsPage() {
  const pushToast = useToastStore((s) => s.pushToast);

  const doctors = usePharmacyStore((s) => s.doctors);
  const saveDoctor = usePharmacyStore((s) => s.saveDoctor);
  const can = usePharmacyStore((s) => s.can);

  const [specFilter, setSpecFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [form, setForm] = useState({
    name: '',
    qualification: 'MBBS, MD',
    specialization: 'General Medicine',
    experienceYears: 8,
    nmcRegNo: '',
    languages: 'English, Hindi',
    consultationFee: 499,
    availabilitySlots: '10:00 AM - 01:00 PM, 05:00 PM - 08:00 PM',
    hubAffiliation: 'Bengaluru Telehealth Pod',
    status: 'Available' as Doctor['status'],
  });

  const specializations = ['ALL', ...Array.from(new Set(doctors.map((d) => d.specialization)))];
  const filtered = doctors.filter((d) => specFilter === 'ALL' || d.specialization === specFilter);

  const openModal = (doc?: Doctor) => {
    if (doc) {
      setEditing(doc);
      setForm({
        name: doc.name,
        qualification: doc.qualification,
        specialization: doc.specialization,
        experienceYears: doc.experienceYears,
        nmcRegNo: doc.nmcRegNo,
        languages: doc.languages.join(', '),
        consultationFee: doc.consultationFee,
        availabilitySlots: doc.availabilitySlots.join(', '),
        hubAffiliation: doc.hubAffiliation,
        status: doc.status,
      });
    } else {
      setEditing(null);
      setForm({
        name: '',
        qualification: 'MBBS, MD',
        specialization: 'General Medicine',
        experienceYears: 8,
        nmcRegNo: '',
        languages: 'English, Hindi',
        consultationFee: 499,
        availabilitySlots: '10:00 AM - 01:00 PM',
        hubAffiliation: 'Bengaluru Telehealth Pod',
        status: 'Available',
      });
    }
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const res = saveDoctor(
      {
        name: form.name,
        qualification: form.qualification,
        specialization: form.specialization,
        experienceYears: Number(form.experienceYears) || 1,
        nmcRegNo: form.nmcRegNo,
        languages: form.languages.split(',').map((s) => s.trim()).filter(Boolean),
        consultationFee: Number(form.consultationFee) || 399,
        availabilitySlots: form.availabilitySlots.split(',').map((s) => s.trim()).filter(Boolean),
        hubAffiliation: form.hubAffiliation,
        status: form.status,
      },
      editing?.id
    );
    pushToast({
      type: res.ok ? 'success' : 'error',
      title: res.ok ? 'Doctor Profile Saved' : 'Blocked',
      description: res.message,
    });
    if (res.ok) setModalOpen(false);
  };

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <span className="font-label-sm text-primary uppercase tracking-wider">NMC Credentialing & Roster</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Doctors Directory</h1>
          <p className="font-body-md text-on-surface-variant">
            Verified tele-physicians, NMC/SMC registration tracking, consultation fees & shift slots
          </p>
        </div>
        {can('doctors', 'create') && (
          <button
            type="button"
            onClick={() => openModal()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md text-body-sm hover:bg-primary self-start"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Onboard Doctor</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {specializations.map((sp) => (
          <button
            key={sp}
            type="button"
            onClick={() => setSpecFilter(sp)}
            className={`px-3 py-1.5 rounded-lg font-label-md whitespace-nowrap ${
              specFilter === sp ? 'bg-primary-container text-on-primary' : 'bg-surface-container-lowest text-on-surface-variant'
            }`}
          >
            {sp === 'ALL' ? 'All Specialties' : sp}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
        {filtered.length === 0 ? (
          <div className="md:col-span-2 lg:col-span-3 bg-surface-container-lowest p-10 rounded-xl shadow-sm text-center text-on-surface-variant font-body-sm">
            No doctors match the selected specialty filter.
          </div>
        ) : (
          filtered.map((doc) => (
            <div key={doc.id} className="bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-title-lg text-on-surface">{doc.name}</h3>
                    <p className="font-label-md text-primary">{doc.specialization} • {doc.qualification}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded font-label-sm shrink-0 ${
                      doc.status === 'Available'
                        ? 'bg-primary-fixed text-on-primary-fixed'
                        : doc.status === 'Credential Pending'
                        ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {doc.status}
                  </span>
                </div>
                <div className="mt-3 space-y-1 font-body-sm text-on-surface-variant">
                  <div>NMC Reg: <strong className="text-on-surface">{doc.nmcRegNo}</strong></div>
                  <div>Experience: {doc.experienceYears} yrs • Rating: {doc.rating} ★ ({doc.consultationsCount})</div>
                  <div>Languages: {doc.languages.join(', ')}</div>
                  <div>Slots: {doc.availabilitySlots.join(' | ')}</div>
                </div>
              </div>

              <div className="pt-3 border-t border-outline-variant/30 flex items-center justify-between">
                <span className="font-title-lg text-primary tabular-nums">{formatINR(doc.consultationFee)}</span>
                {can('doctors', 'edit') && (
                  <button
                    type="button"
                    onClick={() => openModal(doc)}
                    className="px-3 py-1 rounded-lg bg-surface-container hover:bg-primary-fixed text-primary font-label-md"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[85] bg-on-surface/40 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-5 space-y-3 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-title-lg text-on-surface">{editing ? 'Edit Doctor Profile' : 'Onboard New Doctor'}</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-surface-container">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-label-sm mb-1">Full Name</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
              <div>
                <label className="block font-label-sm mb-1">Qualification</label>
                <input required value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
              <div>
                <label className="block font-label-sm mb-1">Specialization</label>
                <input required value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
              <div>
                <label className="block font-label-sm mb-1">NMC / SMC Reg No</label>
                <input required value={form.nmcRegNo} onChange={(e) => setForm({ ...form, nmcRegNo: e.target.value })} className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
              <div>
                <label className="block font-label-sm mb-1">Fee (INR)</label>
                <input type="number" required value={form.consultationFee} onChange={(e) => setForm({ ...form, consultationFee: Number(e.target.value) })} className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
              <div>
                <label className="block font-label-sm mb-1">Experience (Years)</label>
                <input type="number" required value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: Number(e.target.value) })} className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
              <div>
                <label className="block font-label-sm mb-1">Duty Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Doctor['status'] })} className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant">
                  <option value="Available">Available</option>
                  <option value="In Consultation">In Consultation</option>
                  <option value="Off Duty">Off Duty</option>
                  <option value="Credential Pending">Credential Pending</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block font-label-sm mb-1">Languages (comma-separated)</label>
                <input value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-label-sm mb-1">Availability Slots</label>
                <input value={form.availabilitySlots} onChange={(e) => setForm({ ...form, availabilitySlots: e.target.value })} className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg bg-surface-container">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md">Save Doctor</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
