import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';
import { AppNotification } from '../../types';
import { formatIndianDateTime } from '../../utils/formatters';

export function NotificationsPage() {
  const navigate = useNavigate();
  const pushToast = useToastStore((s) => s.pushToast);

  const notifications = usePharmacyStore((s) => s.notifications);
  const notificationTemplates = usePharmacyStore((s) => s.notificationTemplates);
  const markNotificationRead = usePharmacyStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = usePharmacyStore((s) => s.markAllNotificationsRead);
  const sendSimulatedNotification = usePharmacyStore((s) => s.sendSimulatedNotification);
  const can = usePharmacyStore((s) => s.can);

  const [tab, setTab] = useState<'feed' | 'templates'>('feed');
  const [composeOpen, setComposeOpen] = useState(false);
  const [form, setForm] = useState({
    category: 'System' as AppNotification['category'],
    channel: 'Email (Simulated)' as AppNotification['channel'],
    title: '',
    message: '',
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const res = sendSimulatedNotification(form);
    pushToast({ type: res.ok ? 'success' : 'error', title: res.ok ? 'Broadcast Queued (Demo)' : 'Blocked', description: res.message });
    if (res.ok) {
      setComposeOpen(false);
      setForm({ category: 'System', channel: 'Email (Simulated)', title: '', message: '' });
    }
  };

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <span className="font-label-sm text-primary uppercase tracking-wider">Alerts & Comms Templates (Demo Mode)</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Notifications Center</h1>
          <p className="font-body-md text-on-surface-variant">
            Operational alerts, simulated Email/SMS/Push dispatch logs, and compliance templates
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              markAllNotificationsRead();
              pushToast({ type: 'info', title: 'All Notifications Marked Read' });
            }}
            className="px-3.5 py-2 rounded-lg bg-surface-container-lowest shadow-sm font-title-md text-body-sm"
          >
            Mark All Read
          </button>
          {can('notifications', 'create') && (
            <button
              type="button"
              onClick={() => setComposeOpen(true)}
              className="px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md text-body-sm"
            >
              Send Simulated Broadcast
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTab('feed')}
          className={`px-4 py-2 rounded-lg font-title-md text-body-sm ${
            tab === 'feed' ? 'bg-primary-container text-on-primary' : 'bg-surface-container-lowest text-on-surface-variant'
          }`}
        >
          Alerts Feed ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('templates')}
          className={`px-4 py-2 rounded-lg font-title-md text-body-sm ${
            tab === 'templates' ? 'bg-primary-container text-on-primary' : 'bg-surface-container-lowest text-on-surface-variant'
          }`}
        >
          Message Templates ({notificationTemplates.length})
        </button>
      </div>

      {tab === 'feed' ? (
        <div className="space-y-2.5">
          {notifications.length === 0 ? (
            <div className="bg-surface-container-lowest p-10 rounded-xl shadow-sm text-center text-on-surface-variant font-body-sm">
              No notifications in the feed yet.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  markNotificationRead(n.id);
                  if (n.targetPath && n.targetPath !== '/notifications') navigate(n.targetPath);
                }}
                className={`p-4 rounded-xl shadow-sm cursor-pointer flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4 transition-colors ${
                  n.read ? 'bg-surface-container-lowest' : 'bg-primary-fixed/30 border border-primary/20'
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-surface-container font-label-sm">{n.category}</span>
                    <span className="text-[11px] text-primary font-label-sm">{n.channel}</span>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <h3 className="font-title-md text-on-surface mt-1">{n.title}</h3>
                  <p className="font-body-sm text-on-surface-variant">{n.message}</p>
                </div>
                <span className="text-[11px] text-on-surface-variant shrink-0">{formatIndianDateTime(n.createdAt)}</span>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
          {notificationTemplates.map((tpl) => (
            <div key={tpl.id} className="bg-surface-container-lowest p-5 rounded-xl shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-label-sm">{tpl.channel}</span>
                <span className="font-label-sm text-on-surface-variant">{tpl.category}</span>
              </div>
              <h3 className="font-title-lg text-on-surface">{tpl.name}</h3>
              <div className="text-body-sm font-medium text-primary">Subject: {tpl.subject}</div>
              <p className="p-3 rounded-lg bg-surface-container-low font-mono text-xs text-on-surface-variant break-words">{tpl.body}</p>
            </div>
          ))}
        </div>
      )}

      {composeOpen && (
        <div className="fixed inset-0 z-[85] bg-on-surface/40 flex items-center justify-center p-4">
          <form onSubmit={handleSend} className="bg-surface-container-lowest rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-title-lg text-on-surface">Queue Simulated Notification</h3>
              <button type="button" onClick={() => setComposeOpen(false)} className="p-1 rounded hover:bg-surface-container">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as AppNotification['category'] })} className="w-full min-w-0 h-9 px-2.5 rounded-lg bg-surface-container-low border border-outline-variant">
                <option value="System">System</option>
                <option value="Order">Order</option>
                <option value="Prescription">Prescription</option>
                <option value="Inventory">Inventory</option>
              </select>
              <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value as AppNotification['channel'] })} className="w-full min-w-0 h-9 px-2.5 rounded-lg bg-surface-container-low border border-outline-variant">
                <option value="Email (Simulated)">Email (Simulated)</option>
                <option value="SMS (Simulated)">SMS (Simulated)</option>
                <option value="Push (Simulated)">Push (Simulated)</option>
              </select>
            </div>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Alert Title" className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
            <textarea rows={3} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Message body..." className="w-full p-3 rounded-lg bg-surface-container-low border border-outline-variant" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setComposeOpen(false)} className="px-4 py-2 rounded-lg bg-surface-container">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md">Send (Demo)</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
