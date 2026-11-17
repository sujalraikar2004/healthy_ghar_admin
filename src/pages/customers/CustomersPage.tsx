import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';
import { downloadCsv, formatIndianDate, formatIndianDateTime, formatINR, maskPhone } from '../../utils/formatters';
import { emailSchema, indianPhoneSchema } from '../../utils/validation';
import { Customer } from '../../types';

export function CustomersPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pushToast = useToastStore((s) => s.pushToast);

  const customers = usePharmacyStore((s) => s.customers);
  const customerGroups = usePharmacyStore((s) => s.customerGroups);
  const orders = usePharmacyStore((s) => s.orders);
  const prescriptions = usePharmacyStore((s) => s.prescriptions);
  const tickets = usePharmacyStore((s) => s.tickets);
  const reviews = usePharmacyStore((s) => s.reviews);
  const activityLogs = usePharmacyStore((s) => s.activityLogs);
  const updateCustomer = usePharmacyStore((s) => s.updateCustomer);
  const can = usePharmacyStore((s) => s.can);

  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('ALL');
  const [selectedId, setSelectedId] = useState(() => searchParams.get('selected') || customers[0]?.id || '');

  useEffect(() => {
    const paramId = searchParams.get('selected');
    if (paramId && customers.some((c) => c.id === paramId)) {
      setSelectedId(paramId);
    }
  }, [searchParams, customers]);
  const [dossierTab, setDossierTab] = useState<'overview' | 'orders' | 'rx' | 'addresses' | 'reviews' | 'support' | 'activity'>('overview');
  const [unmaskPhone, setUnmaskPhone] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    age: '',
    gender: 'Female' as NonNullable<Customer['gender']>,
    groupId: '',
    chronicTags: '',
    allergies: '',
    status: 'Active' as Customer['status'],
  });

  const canEdit = can('customers', 'edit');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (groupFilter !== 'ALL' && c.groupId !== groupFilter) return false;
      if (q && !`${c.name} ${c.customerCode} ${c.city} ${c.email}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [customers, groupFilter, search]);

  const selected = useMemo(
    () => filtered.find((c) => c.id === selectedId) || filtered[0] || null,
    [filtered, selectedId]
  );

  const patientOrders = useMemo(
    () => (selected ? orders.filter((o) => o.customerId === selected.id) : []),
    [orders, selected]
  );
  const patientRx = useMemo(
    () => (selected ? prescriptions.filter((r) => r.customerId === selected.id) : []),
    [prescriptions, selected]
  );
  const patientTickets = useMemo(
    () => (selected ? tickets.filter((t) => t.customerId === selected.id) : []),
    [tickets, selected]
  );
  const patientReviews = useMemo(
    () => (selected ? reviews.filter((r) => r.customerId === selected.id) : []),
    [reviews, selected]
  );
  const patientActivity = useMemo(() => {
    if (!selected) return [];
    const items: { id: string; title: string; detail: string; timestamp: string; badge: string }[] = [];
    patientOrders.forEach((o) =>
      items.push({
        id: `ACT-ORD-${o.id}`,
        title: `Order ${o.orderNumber} (${o.status})`,
        detail: `${o.items.length} item(s) • ${formatINR(o.totalAmount)}`,
        timestamp: o.updatedAt || o.createdAt,
        badge: 'Order',
      })
    );
    patientRx.forEach((r) =>
      items.push({
        id: `ACT-RX-${r.id}`,
        title: `Prescription ${r.rxNumber} (${r.status})`,
        detail: `Issued by ${r.doctorName}`,
        timestamp: r.reviewedAt || r.uploadedAt,
        badge: 'Prescription',
      })
    );
    patientTickets.forEach((t) =>
      items.push({
        id: `ACT-TKT-${t.id}`,
        title: `Ticket ${t.ticketCode}: ${t.subject}`,
        detail: `Status: ${t.status} • Priority: ${t.priority}`,
        timestamp: t.updatedAt || t.createdAt,
        badge: 'Support',
      })
    );
    activityLogs
      .filter((l) => l.recordId === selected.id || l.recordId === selected.customerCode)
      .forEach((l) =>
        items.push({
          id: `ACT-LOG-${l.id}`,
          title: `${l.action} by ${l.actorName}`,
          detail: `Module: ${l.module} • Result: ${l.result}`,
          timestamp: l.timestamp,
          badge: 'Audit',
        })
      );
    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [selected, patientOrders, patientRx, patientTickets, activityLogs]);

  const openEditPatient = () => {
    if (!selected) return;
    setEditForm({
      name: selected.name,
      email: selected.email,
      phone: selected.phone,
      city: selected.city,
      age: selected.age ? String(selected.age) : '',
      gender: selected.gender || 'Female',
      groupId: selected.groupId,
      chronicTags: selected.chronicTags.join(', '),
      allergies: selected.allergies.join(', '),
      status: selected.status,
    });
    setEditModalOpen(true);
  };

  const handleSavePatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    if (editForm.name.trim().length < 2) {
      pushToast({ type: 'error', title: 'Invalid Name', description: 'Patient full name is required.' });
      return;
    }
    const emailRes = emailSchema.safeParse(editForm.email);
    if (!emailRes.success) {
      pushToast({ type: 'error', title: 'Invalid Email', description: emailRes.error.issues[0].message });
      return;
    }
    const phoneRes = indianPhoneSchema.safeParse(editForm.phone);
    if (!phoneRes.success) {
      pushToast({ type: 'error', title: 'Invalid Phone', description: phoneRes.error.issues[0].message });
      return;
    }
    const res = updateCustomer(selected.id, {
      name: editForm.name.trim(),
      email: emailRes.data,
      phone: phoneRes.data,
      city: editForm.city.trim(),
      age: editForm.age ? Number(editForm.age) : undefined,
      gender: editForm.gender,
      groupId: editForm.groupId,
      chronicTags: editForm.chronicTags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      allergies: editForm.allergies
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      status: editForm.status,
    });
    pushToast({
      type: res.ok ? 'success' : 'error',
      title: res.ok ? 'Patient Dossier Updated' : 'Update Blocked',
      description: res.message,
    });
    if (res.ok) setEditModalOpen(false);
  };

  const handleToggleStatus = () => {
    if (!selected) return;
    const nextStatus = selected.status === 'Active' ? 'Blocked' : 'Active';
    const res = updateCustomer(selected.id, { status: nextStatus });
    pushToast({
      type: res.ok ? 'success' : 'error',
      title: res.ok ? `Patient ${nextStatus}` : 'Blocked',
      description: res.message,
    });
  };

  const handleExport = () => {
    downloadCsv(
      'healthy-ghar-patients.csv',
      ['Code', 'Name', 'City', 'Group', 'Orders', 'Total Spent (INR)', 'Chronic Tags', 'Status'],
      filtered.map((c) => [
        c.customerCode,
        c.name,
        c.city,
        customerGroups.find((g) => g.id === c.groupId)?.name || c.groupId,
        c.orderCount,
        c.totalSpent,
        c.chronicTags.join(' | '),
        c.status,
      ])
    );
    pushToast({ type: 'success', title: 'Patient Directory Exported', description: `Exported ${filtered.length} patient records.` });
  };

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <span className="font-label-sm text-primary uppercase tracking-wider">Patient CRM & Chronic Care</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Customer Directory & Health Dossier</h1>
          <p className="font-body-md text-on-surface-variant">
            Patient lifetime value, allergy alerts, Rx compliance history & PII phone masking
          </p>
        </div>
        <div className="flex items-center gap-2">
          {can('customers', 'export') && (
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container-lowest text-on-surface shadow-sm font-title-md text-body-sm hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        {/* Left: Directory */}
        <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl shadow-sm flex flex-col overflow-hidden max-h-[720px]">
          <div className="p-3.5 border-b border-outline-variant/30 space-y-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">search</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient name, city, or ID..."
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-surface-container-low border border-outline-variant/60 text-body-sm"
              />
            </div>
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant/60 text-body-sm"
            >
              <option value="ALL">All Care Tiers ({customers.length})</option>
              {customerGroups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/30 custom-scrollbar">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-body-sm text-on-surface-variant">
                No patients match your search or care tier filter.
              </div>
            ) : (
              filtered.map((cust) => {
                const active = selected?.id === cust.id;
                const grp = customerGroups.find((g) => g.id === cust.groupId);
                return (
                  <button
                    key={cust.id}
                    type="button"
                    onClick={() => setSelectedId(cust.id)}
                    className={`w-full text-left p-3.5 transition-colors flex items-start justify-between gap-2 ${
                      active ? 'bg-primary-fixed/40' : 'hover:bg-surface-container-low/70'
                    }`}
                  >
                    <div>
                      <div className="font-title-md text-on-surface">{cust.name}</div>
                      <div className="text-[11px] text-on-surface-variant">
                        {cust.customerCode} • {cust.city}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {grp && (
                          <span className="px-1.5 py-0.5 rounded bg-surface-container text-[10px] font-label-sm">
                            {grp.name}
                          </span>
                        )}
                        {cust.chronicTags.slice(0, 2).map((t) => (
                          <span key={t} className="px-1.5 py-0.5 rounded bg-primary-fixed text-on-primary-fixed text-[10px] font-label-sm">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-title-md text-primary tabular-nums">{formatINR(cust.totalSpent)}</div>
                      <div className="text-[11px] text-on-surface-variant">{cust.orderCount} orders</div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Dossier */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl shadow-sm p-5 space-y-4">
          {!selected ? (
            <div className="py-16 text-center text-on-surface-variant">Select a patient to view their health dossier.</div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-outline-variant/30">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-headline-md text-on-surface">{selected.name}</h2>
                    <span
                      className={`px-2 py-0.5 rounded font-label-sm ${
                        selected.status === 'Active'
                          ? 'bg-primary-fixed text-on-primary-fixed'
                          : 'bg-error-container text-on-error-container'
                      }`}
                    >
                      {selected.status}
                    </span>
                  </div>
                  <p className="font-body-sm text-on-surface-variant mt-0.5">
                    {selected.customerCode} • {selected.age || '—'} yrs • {selected.gender || '—'} • {selected.city}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 font-body-sm">
                    <span className="text-on-surface break-all">{selected.email}</span>
                    <span className="text-primary font-medium">{maskPhone(selected.phone, unmaskPhone)}</span>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setUnmaskPhone((v) => !v)}
                        className="text-[11px] text-primary hover:underline"
                      >
                        {unmaskPhone ? 'Mask PII' : 'Reveal Phone'}
                      </button>
                    )}
                  </div>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={openEditPatient}
                      className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface font-label-md hover:bg-surface-container-high"
                    >
                      Edit Profile
                    </button>
                    <button
                      type="button"
                      onClick={handleToggleStatus}
                      className={`px-3 py-1.5 rounded-lg font-label-md ${
                        selected.status === 'Active'
                          ? 'bg-error-container text-on-error-container'
                          : 'bg-primary-fixed text-on-primary-fixed'
                      }`}
                    >
                      {selected.status === 'Active' ? 'Block Account' : 'Reactivate'}
                    </button>
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-2 border-b border-outline-variant/30 overflow-x-auto">
                {(
                  [
                    { id: 'overview', label: 'Clinical Overview' },
                    { id: 'orders', label: `Orders (${patientOrders.length})` },
                    { id: 'rx', label: `Prescriptions (${patientRx.length})` },
                    { id: 'addresses', label: `Addresses (${selected.addresses.length})` },
                    { id: 'reviews', label: `Reviews (${patientReviews.length})` },
                    { id: 'support', label: `Support (${patientTickets.length})` },
                    { id: 'activity', label: `Activity (${patientActivity.length})` },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDossierTab(t.id)}
                    className={`px-3 py-2 font-label-md whitespace-nowrap border-b-2 ${
                      dossierTab === t.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-on-surface-variant'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {dossierTab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-surface-container-low">
                      <span className="font-label-sm text-on-surface-variant">Total Orders</span>
                      <div className="font-headline-sm text-on-surface tabular-nums">{selected.orderCount}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-surface-container-low">
                      <span className="font-label-sm text-on-surface-variant">Lifetime Value</span>
                      <div className="font-headline-sm text-primary tabular-nums">{formatINR(selected.totalSpent)}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-surface-container-low">
                      <span className="font-label-sm text-on-surface-variant">Registered</span>
                      <div className="font-title-md text-on-surface mt-1">{formatIndianDate(selected.registeredAt)}</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-label-md text-on-surface mb-1.5">Chronic Care Conditions</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.chronicTags.length === 0 ? (
                        <span className="text-body-sm text-on-surface-variant">No chronic tags recorded.</span>
                      ) : (
                        selected.chronicTags.map((tag) => (
                          <span key={tag} className="px-2.5 py-1 rounded-lg bg-primary-fixed text-on-primary-fixed font-label-sm">
                            {tag}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-label-md text-on-surface mb-1.5">Known Drug Allergies</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.allergies.length === 0 ? (
                        <span className="text-body-sm text-on-surface-variant">No known drug allergies logged.</span>
                      ) : (
                        selected.allergies.map((al) => (
                          <span key={al} className="px-2.5 py-1 rounded-lg bg-error-container text-on-error-container font-label-sm">
                            {al}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {dossierTab === 'orders' && (
                <div className="space-y-2">
                  {patientOrders.map((ord) => (
                    <div
                      key={ord.id}
                      onClick={() => navigate(`/orders/${ord.id}`)}
                      className="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="font-title-md text-primary">{ord.orderNumber}</div>
                        <div className="text-[11px] text-on-surface-variant">{formatIndianDateTime(ord.createdAt)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-title-md tabular-nums">{formatINR(ord.totalAmount)}</div>
                        <div className="text-[11px] text-on-surface-variant">{ord.status}</div>
                      </div>
                    </div>
                  ))}
                  {patientOrders.length === 0 && <p className="text-body-sm text-on-surface-variant">No orders placed yet.</p>}
                </div>
              )}

              {dossierTab === 'rx' && (
                <div className="space-y-2">
                  {patientRx.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => navigate(`/prescriptions/${r.id}`)}
                      className="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="font-title-md text-primary">{r.rxNumber}</div>
                        <div className="text-[11px] text-on-surface-variant">
                          {r.doctorName} ({r.doctorRegNo})
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-label-sm">
                        {r.status}
                      </span>
                    </div>
                  ))}
                  {patientRx.length === 0 && <p className="text-body-sm text-on-surface-variant">No prescriptions uploaded.</p>}
                </div>
              )}

              {dossierTab === 'addresses' && (
                <div className="space-y-2">
                  {selected.addresses.map((addr) => (
                    <div key={addr.id} className="p-3 rounded-xl bg-surface-container-low">
                      <div className="flex items-center gap-2">
                        <span className="font-title-md text-on-surface">{addr.label}</span>
                        {addr.isDefault && (
                          <span className="px-1.5 py-0.5 rounded bg-primary-fixed text-on-primary-fixed text-[10px]">Default</span>
                        )}
                      </div>
                      <p className="text-body-sm text-on-surface-variant mt-1">
                        {addr.line1}, {addr.city}, {addr.state} — {addr.pincode}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {dossierTab === 'reviews' && (
                <div className="space-y-2">
                  {patientReviews.map((rev) => (
                    <div key={rev.id} className="p-3 rounded-xl bg-surface-container-low space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-title-md text-on-surface">{rev.productName} • {rev.rating}/5 ★</span>
                        <span className="px-2 py-0.5 rounded bg-surface-container font-label-sm">{rev.status}</span>
                      </div>
                      <div className="font-title-md text-body-sm text-primary">{rev.title}</div>
                      <p className="text-body-sm text-on-surface-variant">{rev.comment}</p>
                      <div className="text-[11px] text-outline">{formatIndianDate(rev.createdAt)}</div>
                    </div>
                  ))}
                  {patientReviews.length === 0 && <p className="text-body-sm text-on-surface-variant">No product reviews submitted by this patient.</p>}
                </div>
              )}

              {dossierTab === 'support' && (
                <div className="space-y-2">
                  {patientTickets.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => navigate('/support-tickets')}
                      className="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="font-title-md text-on-surface">{t.subject}</div>
                        <div className="text-[11px] text-on-surface-variant">{t.ticketCode} • {t.category}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-surface-container font-label-sm">{t.status}</span>
                    </div>
                  ))}
                  {patientTickets.length === 0 && <p className="text-body-sm text-on-surface-variant">No support tickets.</p>}
                </div>
              )}

              {dossierTab === 'activity' && (
                <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                  {patientActivity.map((act) => (
                    <div key={act.id} className="p-3 rounded-xl bg-surface-container-low flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-primary-fixed text-on-primary-fixed text-[10px] font-label-sm">{act.badge}</span>
                          <span className="font-title-md text-on-surface text-body-sm">{act.title}</span>
                        </div>
                        <div className="text-[12px] text-on-surface-variant mt-0.5">{act.detail}</div>
                      </div>
                      <span className="text-[11px] text-outline shrink-0">{formatIndianDateTime(act.timestamp)}</span>
                    </div>
                  ))}
                  {patientActivity.length === 0 && <p className="text-body-sm text-on-surface-variant">No patient activity recorded yet.</p>}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Edit Patient Modal */}
      {editModalOpen && selected && (
        <div className="fixed inset-0 z-[85] bg-on-surface/40 flex items-center justify-center p-4">
          <form onSubmit={handleSavePatient} className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-5 space-y-3 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
              <div>
                <h3 className="font-title-lg text-on-surface">Edit Patient Dossier</h3>
                <p className="font-body-sm text-on-surface-variant">{selected.customerCode}</p>
              </div>
              <button type="button" onClick={() => setEditModalOpen(false)} className="p-1 rounded-lg hover:bg-surface-container">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-label-sm mb-1">Full Name *</label>
                <input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
              <div>
                <label className="block font-label-sm mb-1">Care Tier Group</label>
                <select value={editForm.groupId} onChange={(e) => setEditForm({ ...editForm, groupId: e.target.value })} className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant">
                  {customerGroups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-label-sm mb-1">Email *</label>
                <input type="email" required value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
              <div>
                <label className="block font-label-sm mb-1">Phone (+91) *</label>
                <input required value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
              <div>
                <label className="block font-label-sm mb-1">City *</label>
                <input required value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-label-sm mb-1">Age</label>
                  <input type="number" min={1} max={120} value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })} className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
                </div>
                <div>
                  <label className="block font-label-sm mb-1">Gender</label>
                  <select value={editForm.gender} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value as NonNullable<Customer['gender']> })} className="w-full h-9 px-2 rounded-lg bg-surface-container-low border border-outline-variant">
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block font-label-sm mb-1">Chronic Care Conditions (comma-separated)</label>
                <input value={editForm.chronicTags} onChange={(e) => setEditForm({ ...editForm, chronicTags: e.target.value })} placeholder="Type-2 Diabetes, Hypertension" className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-label-sm mb-1">Known Drug Allergies (comma-separated)</label>
                <input value={editForm.allergies} onChange={(e) => setEditForm({ ...editForm, allergies: e.target.value })} placeholder="Penicillin, Sulfa drugs" className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditModalOpen(false)} className="px-4 py-2 rounded-lg bg-surface-container">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md">Save Changes</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
