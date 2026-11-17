import React, { useState } from 'react';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';
import { AdminUser, RoleId } from '../../types';
import { formatIndianDateTime } from '../../utils/formatters';

export function StaffManagementPage() {
  const pushToast = useToastStore((s) => s.pushToast);

  const staff = usePharmacyStore((s) => s.staff);
  const roles = usePharmacyStore((s) => s.roles);
  const warehouses = usePharmacyStore((s) => s.warehouses);
  const saveStaff = usePharmacyStore((s) => s.saveStaff);
  const toggleStaffStatus = usePharmacyStore((s) => s.toggleStaffStatus);
  const can = usePharmacyStore((s) => s.can);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '+91 98000 00000',
    roleId: 'PHARMACIST' as RoleId,
    title: 'Clinical Pharmacist',
    hubId: warehouses[0]?.id || 'WH-BLR-01',
    status: 'Active' as AdminUser['status'],
    registrationNumber: '',
    twoFactorEnabled: true,
  });

  const openModal = (user?: AdminUser) => {
    if (user) {
      setEditing(user);
      setForm({
        name: user.name,
        email: user.email,
        phone: user.phone,
        roleId: user.roleId,
        title: user.title,
        hubId: user.hubId,
        status: user.status,
        registrationNumber: user.registrationNumber || '',
        twoFactorEnabled: user.twoFactorEnabled,
      });
    } else {
      setEditing(null);
      setForm({
        name: '',
        email: '',
        phone: '+91 98000 00000',
        roleId: 'PHARMACIST',
        title: 'Duty Pharmacist',
        hubId: warehouses[0]?.id || 'WH-BLR-01',
        status: 'Active',
        registrationNumber: '',
        twoFactorEnabled: true,
      });
    }
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const res = saveStaff(
      {
        ...form,
        registrationNumber: form.registrationNumber || undefined,
      },
      editing?.id
    );
    pushToast({ type: res.ok ? 'success' : 'error', title: res.ok ? 'Staff Saved' : 'Blocked', description: res.message });
    if (res.ok) setModalOpen(false);
  };

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <span className="font-label-sm text-primary uppercase tracking-wider">Enterprise Team Governance</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Staff Management Directory</h1>
          <p className="font-body-md text-on-surface-variant">
            Manage pharmacy administrators, registered pharmacists (KSPC/MCI), hub leads & support operators
          </p>
        </div>
        {can('staff', 'create') && (
          <button
            type="button"
            onClick={() => openModal()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md text-body-sm self-start"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Invite Staff Member</span>
          </button>
        )}
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low font-label-sm text-on-surface-variant uppercase">
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Role & Title</th>
                <th className="py-3 px-4">Hub & Reg #</th>
                <th className="py-3 px-4">2FA</th>
                <th className="py-3 px-4">Last Active</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 font-body-sm">
              {staff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-on-surface-variant">
                    No staff members found in the directory.
                  </td>
                </tr>
              ) : (
                staff.map((u) => {
                  const role = roles.find((r) => r.id === u.roleId);
                  return (
                    <tr key={u.id}>
                      <td className="py-3 px-4">
                        <div className="font-title-md text-on-surface">{u.name}</div>
                        <div className="text-[11px] text-on-surface-variant">{u.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded font-label-sm whitespace-nowrap ${role?.badgeColor || 'bg-surface-container'}`}>
                          {role?.name || u.roleId}
                        </span>
                        <div className="text-[11px] text-on-surface-variant mt-0.5">{u.title}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div>{u.hubId}</div>
                        {u.registrationNumber && <div className="text-[11px] text-primary">{u.registrationNumber}</div>}
                      </td>
                      <td className="py-3 px-4">{u.twoFactorEnabled ? 'Enabled' : 'Disabled'}</td>
                      <td className="py-3 px-4 text-[12px] text-on-surface-variant whitespace-nowrap">{formatIndianDateTime(u.lastActiveAt)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded font-label-sm ${u.status === 'Active' ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-error-container text-on-error-container'}`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {can('staff', 'edit') && (
                          <div className="inline-flex items-center justify-end gap-2">
                            <button type="button" onClick={() => openModal(u)} className="px-2.5 py-1 rounded bg-surface-container font-label-sm whitespace-nowrap">
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const res = toggleStaffStatus(u.id);
                                pushToast({ type: res.ok ? 'info' : 'error', title: res.ok ? 'Status Changed' : 'Blocked', description: res.message });
                              }}
                              className="px-2.5 py-1 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-sm whitespace-nowrap"
                            >
                              {u.status === 'Active' ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[85] bg-on-surface/40 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-surface-container-lowest rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-title-lg text-on-surface">{editing ? 'Edit Staff Member' : 'Invite Staff Member'}</h3>
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
                <label className="block font-label-sm mb-1">Work Email</label>
                <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
              <div>
                <label className="block font-label-sm mb-1">Phone</label>
                <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
              <div>
                <label className="block font-label-sm mb-1">RBAC Role</label>
                <select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value as RoleId })} className="w-full min-w-0 h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant">
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-label-sm mb-1">Job Title</label>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
              <div>
                <label className="block font-label-sm mb-1">Assigned Hub</label>
                <select value={form.hubId} onChange={(e) => setForm({ ...form, hubId: e.target.value })} className="w-full min-w-0 h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant">
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.code} — {w.city}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-label-sm mb-1">Pharmacist Reg # (Optional)</label>
                <input value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} placeholder="KSPC-48219" className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg bg-surface-container">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md">Save Staff</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
