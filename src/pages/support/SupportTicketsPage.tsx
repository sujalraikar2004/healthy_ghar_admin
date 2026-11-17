import React, { useMemo, useState } from 'react';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';
import { SupportTicket, TicketStatus } from '../../types';
import { formatIndianDateTime } from '../../utils/formatters';

const CANNED_REPLIES = [
  'We have escalated your shipment to our priority 3PL hub and shared the live AWB scan.',
  'Our licensed pharmacist has reviewed your prescription note. Please confirm dosage duration so we can unlock dispatch.',
  'Your simulated refund has been processed and will reflect within 3–5 business days.',
];

const TICKET_CATEGORIES: SupportTicket['category'][] = [
  'Order Delay',
  'Prescription Clarification',
  'Refund / Payment',
  'Damaged Medicine',
  'Account',
];

export function SupportTicketsPage() {
  const pushToast = useToastStore((s) => s.pushToast);

  const tickets = usePharmacyStore((s) => s.tickets);
  const staff = usePharmacyStore((s) => s.staff);
  const customers = usePharmacyStore((s) => s.customers);
  const orders = usePharmacyStore((s) => s.orders);
  const createSupportTicket = usePharmacyStore((s) => s.createSupportTicket);
  const replySupportTicket = usePharmacyStore((s) => s.replySupportTicket);
  const updateSupportTicketStatus = usePharmacyStore((s) => s.updateSupportTicketStatus);
  const can = usePharmacyStore((s) => s.can);

  const [statusFilter, setStatusFilter] = useState<'ALL' | TicketStatus>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | SupportTicket['category']>('ALL');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(tickets[0]?.id || '');
  const [replyMode, setReplyMode] = useState<'Staff' | 'Internal Note'>('Staff');
  const [body, setBody] = useState('');

  // New Ticket Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [newCustomerId, setNewCustomerId] = useState(customers[0]?.id || '');
  const [newOrderNum, setNewOrderNum] = useState('');
  const [newCategory, setNewCategory] = useState<SupportTicket['category']>('Order Delay');
  const [newPriority, setNewPriority] = useState<SupportTicket['priority']>('High');
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');

  const customerOrders = useMemo(
    () => orders.filter((o) => o.customerId === newCustomerId),
    [orders, newCustomerId]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false;
      if (q && !`${t.ticketCode} ${t.subject} ${t.customerName} ${t.relatedOrderNumber || ''}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [tickets, statusFilter, categoryFilter, search]);

  const activeTicket = useMemo(
    () => filtered.find((t) => t.id === selectedId) || filtered[0] || null,
    [filtered, selectedId]
  );

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const res = createSupportTicket({
      customerId: newCustomerId,
      relatedOrderNumber: newOrderNum || undefined,
      category: newCategory,
      priority: newPriority,
      subject: newSubject,
      initialMessage: newMessage,
    });
    pushToast({
      type: res.ok ? 'success' : 'error',
      title: res.ok ? 'Ticket Logged' : 'Error',
      description: res.message,
    });
    if (res.ok && res.data) {
      setSelectedId(res.data.id);
      setNewSubject('');
      setNewMessage('');
      setNewOrderNum('');
      setCreateOpen(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket) return;
    const res = replySupportTicket(activeTicket.id, replyMode, body);
    pushToast({
      type: res.ok ? 'success' : 'error',
      title: res.ok ? (replyMode === 'Internal Note' ? 'Note Saved' : 'Reply Logged (Demo)') : 'Error',
      description: res.message,
    });
    if (res.ok) setBody('');
  };

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <span className="font-label-sm text-primary uppercase tracking-wider">Patient Resolution Desk</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Support Tickets</h1>
          <p className="font-body-md text-on-surface-variant">
            Order delays, prescription clarifications, internal staff escalations & simulated email/SMS replies
          </p>
        </div>
        {(can('support', 'create') || can('support', 'edit')) && (
          <button
            type="button"
            onClick={() => {
              setNewCustomerId(customers[0]?.id || '');
              setNewOrderNum('');
              setNewSubject('');
              setNewMessage('');
              setCreateOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md text-body-sm self-start hover:bg-primary"
          >
            <span className="material-symbols-outlined text-[18px]">add_comment</span>
            <span>New Ticket</span>
          </button>
        )}
      </div>

      <div className="bg-surface-container-lowest p-3.5 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(['ALL', 'Open', 'In Progress', 'Waiting for Customer', 'Resolved', 'Closed'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-label-md whitespace-nowrap ${
                statusFilter === st ? 'bg-primary-container text-on-primary' : 'bg-surface-container-low text-on-surface-variant'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)}
            className="h-9 px-2.5 rounded-lg bg-surface-container-low text-body-sm w-full sm:w-auto"
          >
            <option value="ALL">All Categories</option>
            {TICKET_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ticket, patient, order #..."
            className="h-9 px-3 rounded-lg bg-surface-container-low text-body-sm w-full sm:w-56"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        {/* Ticket List */}
        <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl shadow-sm divide-y divide-outline-variant/30 max-h-[680px] overflow-y-auto custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-body-sm text-on-surface-variant">
              No support tickets match these filters.
            </div>
          ) : (
            filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedId(t.id)}
                className={`w-full text-left p-4 transition-colors ${
                  activeTicket?.id === t.id ? 'bg-primary-fixed/40' : 'hover:bg-surface-container-low/70'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-label-md text-primary">{t.ticketCode}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-label-sm ${
                      t.priority === 'Urgent' || t.priority === 'High'
                        ? 'bg-error-container text-on-error-container'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {t.priority}
                  </span>
                </div>
                <div className="font-title-md text-on-surface mt-1">{t.subject}</div>
                <div className="text-[11px] text-on-surface-variant mt-1">
                  {t.customerName} • {t.category} • {t.status}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Thread */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col space-y-4">
          {!activeTicket ? (
            <div className="py-16 text-center text-on-surface-variant">Select a ticket to view conversation.</div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/30">
                <div>
                  <h2 className="font-title-lg text-on-surface">{activeTicket.subject}</h2>
                  <p className="font-body-sm text-on-surface-variant">
                    {activeTicket.customerName} • {activeTicket.relatedOrderNumber || 'General Query'}
                  </p>
                </div>
                {can('support', 'edit') && (
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={activeTicket.assignedStaffId || ''}
                      onChange={(e) => {
                        const res = updateSupportTicketStatus(activeTicket.id, activeTicket.status, e.target.value);
                        pushToast({
                          type: res.ok ? 'success' : 'error',
                          title: res.ok ? 'Assignee Updated' : 'Assignment Failed',
                          description: res.message,
                        });
                      }}
                      className="h-8 px-2 rounded-lg bg-surface-container-low border border-outline-variant text-[12px]"
                    >
                      <option value="">Unassigned</option>
                      {staff.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                    <select
                      value={activeTicket.status}
                      onChange={(e) => {
                        const res = updateSupportTicketStatus(activeTicket.id, e.target.value as TicketStatus);
                        pushToast({
                          type: res.ok ? 'info' : 'error',
                          title: res.ok ? 'Status Updated' : 'Update Failed',
                          description: res.message,
                        });
                      }}
                      className="h-8 px-2 rounded-lg bg-surface-container-low border border-outline-variant text-[12px]"
                    >
                      {(['Open', 'In Progress', 'Waiting for Customer', 'Resolved', 'Closed'] as const).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-3 max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
                {activeTicket.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`p-3 rounded-xl text-body-sm ${
                      m.senderType === 'Internal Note'
                        ? 'bg-tertiary-fixed/60 border border-tertiary/30'
                        : m.senderType === 'Staff'
                        ? 'bg-primary-fixed/40 ml-4 sm:ml-6'
                        : 'bg-surface-container-low mr-4 sm:mr-6'
                    }`}
                  >
                    <div className="flex justify-between text-[11px] font-label-sm mb-1">
                      <span className="text-on-surface">
                        {m.senderName} ({m.senderType}{m.isSimulatedDelivery ? ' • Demo Simulated' : ''})
                      </span>
                      <span className="text-on-surface-variant">{formatIndianDateTime(m.timestamp)}</span>
                    </div>
                    <p className="text-on-surface">{m.body}</p>
                  </div>
                ))}
              </div>

              {can('support', 'edit') && (
                <form onSubmit={handleSend} className="pt-3 border-t border-outline-variant/30 space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setReplyMode('Staff')}
                        className={`px-3 py-1 rounded-lg font-label-sm ${
                          replyMode === 'Staff' ? 'bg-primary-container text-on-primary' : 'bg-surface-container'
                        }`}
                      >
                        Customer Reply (Simulated)
                      </button>
                      <button
                        type="button"
                        onClick={() => setReplyMode('Internal Note')}
                        className={`px-3 py-1 rounded-lg font-label-sm ${
                          replyMode === 'Internal Note' ? 'bg-tertiary text-on-tertiary' : 'bg-surface-container'
                        }`}
                      >
                        Internal Staff Note
                      </button>
                    </div>
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) setBody(e.target.value);
                      }}
                      className="h-8 px-2 rounded-lg bg-surface-container-low border border-outline-variant text-[12px]"
                    >
                      <option value="">Insert Canned Macro...</option>
                      {CANNED_REPLIES.map((r, i) => (
                        <option key={i} value={r}>{r.slice(0, 42)}...</option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    rows={3}
                    required
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={
                      replyMode === 'Internal Note'
                        ? 'Private staff escalation note (not visible to patient)...'
                        : 'Type customer reply (logged in Demo Mode without sending live SMS/email)...'
                    }
                    className="w-full p-3 rounded-lg bg-surface-container-low border border-outline-variant text-body-sm"
                  />
                  <div className="flex justify-end">
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md text-body-sm">
                      {replyMode === 'Internal Note' ? 'Save Internal Note' : 'Send Simulated Reply'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Ticket Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-[85] bg-on-surface/40 flex items-center justify-center p-4">
          <form onSubmit={handleCreateTicket} className="bg-surface-container-lowest rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-title-lg text-on-surface">Log New Patient Support Ticket</h3>
              <button type="button" onClick={() => setCreateOpen(false)} className="p-1 rounded hover:bg-surface-container">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-label-sm mb-1">Patient *</label>
                <select
                  required
                  value={newCustomerId}
                  onChange={(e) => {
                    setNewCustomerId(e.target.value);
                    setNewOrderNum('');
                  }}
                  className="w-full min-w-0 h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-body-sm"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.customerCode})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-label-sm mb-1">Related Order (Optional)</label>
                <select
                  value={newOrderNum}
                  onChange={(e) => setNewOrderNum(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-body-sm"
                >
                  <option value="">General Query (No Order)</option>
                  {customerOrders.map((o) => (
                    <option key={o.id} value={o.orderNumber}>{o.orderNumber} ({o.status})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-label-sm mb-1">Category *</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as SupportTicket['category'])}
                  className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-body-sm"
                >
                  {TICKET_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-label-sm mb-1">Priority *</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as SupportTicket['priority'])}
                  className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-body-sm"
                >
                  <option value="Urgent">Urgent</option>
                  <option value="High">High</option>
                  <option value="Normal">Normal</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block font-label-sm mb-1">Subject *</label>
              <input
                required
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="e.g. Cold-chain delivery delay for Insulin Pens"
                className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-body-sm"
              />
            </div>
            <div>
              <label className="block font-label-sm mb-1">Patient Inquiry / Summary *</label>
              <textarea
                rows={3}
                required
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Describe patient query received via phone/email..."
                className="w-full p-3 rounded-lg bg-surface-container-low border border-outline-variant text-body-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-lg bg-surface-container">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md">
                Create Ticket
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
