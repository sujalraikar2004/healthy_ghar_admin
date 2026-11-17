import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';
import { PrescriptionStatus } from '../../types';
import { formatIndianDateTime } from '../../utils/formatters';

const STATUS_TABS: Array<'ALL' | PrescriptionStatus> = [
  'ALL',
  'Pending Review',
  'Under Review',
  'Clarification Requested',
  'Approved',
  'Rejected',
];

const RX_BADGE: Record<PrescriptionStatus, string> = {
  Uploaded: 'bg-surface-container-high text-on-surface',
  'Pending Review': 'bg-tertiary-fixed text-on-tertiary-fixed',
  'Under Review': 'bg-secondary-container text-on-secondary-container',
  'Clarification Requested': 'bg-tertiary-fixed-dim/50 text-on-tertiary-fixed',
  Approved: 'bg-primary-fixed text-on-primary-fixed',
  Rejected: 'bg-error-container text-on-error-container',
};

export function PrescriptionsPage() {
  const navigate = useNavigate();
  const pushToast = useToastStore((s) => s.pushToast);

  const prescriptions = usePharmacyStore((s) => s.prescriptions);
  const customers = usePharmacyStore((s) => s.customers);
  const staff = usePharmacyStore((s) => s.staff);
  const assignPharmacist = usePharmacyStore((s) => s.assignPharmacist);
  const can = usePharmacyStore((s) => s.can);

  const [statusTab, setStatusTab] = useState<'ALL' | PrescriptionStatus>('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState<'ALL' | 'Critical' | 'Standard' | 'Refill' | 'H1'>('ALL');
  const [search, setSearch] = useState('');

  const pharmacists = useMemo(
    () => staff.filter((u) => u.roleId === 'PHARMACIST' && u.status === 'Active'),
    [staff]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return prescriptions
      .map((rx) => ({
        rx,
        customer: customers.find((c) => c.id === rx.customerId),
      }))
      .filter(({ rx, customer }) => {
        if (statusTab !== 'ALL' && rx.status !== statusTab) return false;
        if (urgencyFilter === 'H1' && !rx.containsScheduleH1) return false;
        if (urgencyFilter !== 'ALL' && urgencyFilter !== 'H1' && rx.urgency !== urgencyFilter) return false;
        if (q) {
          const hay = `${rx.rxNumber} ${customer?.name || ''} ${rx.doctorName} ${rx.doctorRegNo}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.rx.uploadedAt).getTime() - new Date(a.rx.uploadedAt).getTime());
  }, [prescriptions, customers, statusTab, urgencyFilter, search]);

  const handleAutoBalance = () => {
    if (pharmacists.length === 0) {
      pushToast({ type: 'warning', title: 'No Active Pharmacists', description: 'Add or activate a licensed Pharmacist in Staff Management before auto-balancing.' });
      return;
    }
    const unassigned = prescriptions.filter(
      (r) => !r.assignedPharmacistId && (r.status === 'Pending Review' || r.status === 'Uploaded')
    );
    if (unassigned.length === 0) {
      pushToast({ type: 'info', title: 'Queue Balanced', description: 'All pending prescriptions already have an assigned pharmacist.' });
      return;
    }
    unassigned.forEach((rx, idx) => {
      const target = pharmacists[idx % pharmacists.length];
      assignPharmacist(rx.id, target.id);
    });
    pushToast({
      type: 'success',
      title: 'Auto-Balance Complete',
      description: `Assigned ${unassigned.length} pending Rx record(s) across ${pharmacists.length} duty pharmacists.`,
    });
  };

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <span className="font-label-sm text-primary uppercase tracking-wider">CDSCO Rule 65 Clinical Desk</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Prescription Governance Queue</h1>
          <p className="font-body-md text-on-surface-variant">
            Sample clinical verification queue for Schedule H / H1 formulations & pharmacist load balancing
          </p>
        </div>
        {can('prescriptions', 'edit') && (
          <button
            type="button"
            onClick={handleAutoBalance}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md text-body-sm hover:bg-primary self-start"
          >
            <span className="material-symbols-outlined text-[18px]">balance</span>
            <span>Auto-Balance Unassigned Queue</span>
          </button>
        )}
      </div>

      {/* Duty Pharmacist Roster */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        {pharmacists.map((ph) => {
          const load = prescriptions.filter(
            (r) => r.assignedPharmacistId === ph.id && (r.status === 'Pending Review' || r.status === 'Under Review')
          ).length;
          return (
            <div key={ph.id} className="bg-surface-container-lowest p-4 rounded-xl shadow-sm flex items-center justify-between">
              <div>
                <div className="font-title-md text-on-surface">{ph.name}</div>
                <div className="font-label-sm text-primary">{ph.registrationNumber || 'RMP Verified'}</div>
                <div className="font-body-sm text-on-surface-variant mt-0.5">{ph.title}</div>
              </div>
              <div className="text-right">
                <div className="font-metric-num text-primary tabular-nums">{load}</div>
                <div className="font-label-sm text-on-surface-variant">Active Cases</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {STATUS_TABS.map((tab) => {
          const count = tab === 'ALL' ? prescriptions.length : prescriptions.filter((r) => r.status === tab).length;
          const active = statusTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusTab(tab)}
              className={`px-3 py-1.5 rounded-lg font-label-md whitespace-nowrap flex items-center gap-1.5 ${
                active
                  ? 'bg-primary-container text-on-primary'
                  : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <span>{tab === 'ALL' ? 'All Prescriptions' : tab}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${active ? 'bg-on-primary/20' : 'bg-surface-container'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Rx #, patient name, prescribing doctor, or NMC Reg No..."
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-low border border-outline-variant/60 text-body-sm text-on-surface"
          />
        </div>
        <select
          value={urgencyFilter}
          onChange={(e) => setUrgencyFilter(e.target.value as typeof urgencyFilter)}
          className="h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/60 text-body-sm text-on-surface"
        >
          <option value="ALL">All Urgencies & Schedules</option>
          <option value="Critical">Critical Priority</option>
          <option value="Standard">Standard</option>
          <option value="Refill">Chronic Refill</option>
          <option value="H1">Schedule H1 Only</option>
        </select>
      </div>

      {/* Queue Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant/40 font-label-sm text-on-surface-variant uppercase">
                <th className="py-3 px-4">Rx # & Priority</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Prescriber & Clinic</th>
                <th className="py-3 px-4">Drugs</th>
                <th className="py-3 px-4">Assigned Pharmacist</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Verify</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 font-body-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-on-surface-variant">
                    No prescriptions match the selected queue filters.
                  </td>
                </tr>
              ) : (
                filtered.map(({ rx, customer }) => (
                  <tr key={rx.id} className="hover:bg-surface-container-low/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-title-md text-primary">{rx.rxNumber}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-label-sm ${
                            rx.urgency === 'Critical'
                              ? 'bg-error-container text-on-error-container'
                              : 'bg-surface-container text-on-surface-variant'
                          }`}
                        >
                          {rx.urgency}
                        </span>
                        {rx.containsScheduleH1 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-label-sm bg-tertiary-fixed text-on-tertiary-fixed">
                            H1
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-title-md text-on-surface">{customer?.name || 'Patient'}</div>
                      <div className="text-[11px] text-on-surface-variant">{formatIndianDateTime(rx.uploadedAt)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-title-md text-on-surface">{rx.doctorName}</div>
                      <div className="text-[11px] text-on-surface-variant">{rx.doctorRegNo} • {rx.clinicName}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-label-md text-on-surface">{rx.extractedDrugs.length} formulation(s)</div>
                      <div className="text-[11px] text-on-surface-variant truncate max-w-[180px]">
                        {rx.extractedDrugs.map((d) => d.name).join(', ')}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {can('prescriptions', 'edit') ? (
                        <select
                          value={rx.assignedPharmacistId || ''}
                          onChange={(e) => {
                            if (!e.target.value) return;
                            const res = assignPharmacist(rx.id, e.target.value);
                            pushToast({ type: res.ok ? 'success' : 'error', title: res.ok ? 'Pharmacist Assigned' : 'Failed', description: res.message });
                          }}
                          className="h-8 px-2 rounded-lg bg-surface-container-low border border-outline-variant text-[12px]"
                        >
                          <option value="">Unassigned</option>
                          {pharmacists.map((ph) => (
                            <option key={ph.id} value={ph.id}>{ph.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span>{rx.assignedPharmacistName || 'Unassigned'}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-md font-label-sm ${RX_BADGE[rx.status]}`}>{rx.status}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/prescriptions/${rx.id}`)}
                        className="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary font-label-md hover:bg-primary whitespace-nowrap"
                      >
                        Review Rx
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
