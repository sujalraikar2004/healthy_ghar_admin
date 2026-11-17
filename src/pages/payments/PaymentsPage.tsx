import React, { useMemo, useState } from 'react';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';
import { Payment } from '../../types';
import { downloadCsv, formatIndianDateTime, formatINR, formatINRCompact } from '../../utils/formatters';

export function PaymentsPage() {
  const pushToast = useToastStore((s) => s.pushToast);

  const payments = usePharmacyStore((s) => s.payments);
  const refunds = usePharmacyStore((s) => s.refunds);
  const createRefundRequest = usePharmacyStore((s) => s.createRefundRequest);
  const processRefund = usePharmacyStore((s) => s.processRefund);
  const can = usePharmacyStore((s) => s.can);

  const [tab, setTab] = useState<'ledger' | 'refunds'>('ledger');
  const [search, setSearch] = useState('');
  const [payloadModal, setPayloadModal] = useState<Payment | null>(null);
  const [refundModalPayment, setRefundModalPayment] = useState<Payment | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter(
      (p) => !q || `${p.transactionId} ${p.orderNumber} ${p.customerName} ${p.gateway}`.toLowerCase().includes(q)
    );
  }, [payments, search]);

  const filteredRefunds = useMemo(() => {
    const q = search.trim().toLowerCase();
    return refunds.filter(
      (r) => !q || `${r.refundCode} ${r.orderNumber} ${r.customerName} ${r.reason}`.toLowerCase().includes(q)
    );
  }, [refunds, search]);

  const metrics = useMemo(() => {
    const captured = payments.filter((p) => p.status === 'Captured' || p.status === 'Partially Refunded').reduce((s, p) => s + p.amount, 0);
    const refunded = refunds.filter((r) => r.status === 'Processed (Simulated)').reduce((s, r) => s + r.amount, 0);
    const pendingRefunds = refunds.filter((r) => r.status === 'Pending Approval').length;
    const failed = payments.filter((p) => p.status === 'Failed').length;
    return { captured, refunded, pendingRefunds, failed };
  }, [payments, refunds]);

  const handleCreateRefund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundModalPayment) return;
    const res = createRefundRequest({
      paymentId: refundModalPayment.id,
      amount: Number(refundAmount) || 0,
      reason: refundReason,
    });
    if (!res.ok) {
      pushToast({ type: 'error', title: 'Refund Blocked', description: res.message });
      return;
    }
    pushToast({ type: 'success', title: 'Refund Queued', description: res.message });
    setRefundModalPayment(null);
    setRefundAmount('');
    setRefundReason('');
    setTab('refunds');
  };

  const handleProcessRefund = (refundId: string, action: 'Approve & Simulate' | 'Reject') => {
    const res = processRefund(refundId, action);
    pushToast({
      type: res.ok ? 'success' : 'error',
      title: res.ok ? 'Refund Processed (Demo)' : 'Blocked',
      description: res.message,
    });
  };

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <span className="font-label-sm text-primary uppercase tracking-wider">Finance & Gateway Settlement (Demo Mode)</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Payments & Refunds Ledger</h1>
          <p className="font-body-md text-on-surface-variant">
            Simulated Razorpay/PayU/Cashfree settlement ledger with duplicate & over-refund safeguards
          </p>
        </div>
        {can('payments', 'export') && (
          <button
            type="button"
            onClick={() => {
              downloadCsv(
                'healthy-ghar-payments.csv',
                ['Txn ID', 'Order #', 'Patient', 'Method', 'Gateway', 'Amount', 'Refunded', 'Status', 'Mode'],
                filteredPayments.map((p) => [
                  p.transactionId,
                  p.orderNumber,
                  p.customerName,
                  p.method,
                  p.gateway,
                  p.amount,
                  p.refundedAmount,
                  p.status,
                  'Demo Simulated',
                ])
              );
              pushToast({ type: 'success', title: 'Settlement CSV Exported' });
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container-lowest shadow-sm font-title-md text-body-sm"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Export Ledger CSV</span>
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm">
          <span className="font-label-sm text-primary uppercase">Captured Settlement</span>
          <div className="font-metric-num text-primary mt-1 tabular-nums">{formatINRCompact(metrics.captured)}</div>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm">
          <span className="font-label-sm text-on-surface-variant uppercase">Simulated Refunds</span>
          <div className="font-metric-num text-on-surface mt-1 tabular-nums">{formatINRCompact(metrics.refunded)}</div>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm">
          <span className="font-label-sm text-tertiary uppercase">Pending Refund Approvals</span>
          <div className="font-metric-num text-tertiary mt-1 tabular-nums">{metrics.pendingRefunds}</div>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm">
          <span className="font-label-sm text-error uppercase">Failed Txns</span>
          <div className="font-metric-num text-error mt-1 tabular-nums">{metrics.failed}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('ledger')}
            className={`px-4 py-2 rounded-lg font-title-md text-body-sm ${
              tab === 'ledger' ? 'bg-primary-container text-on-primary' : 'bg-surface-container-lowest text-on-surface-variant'
            }`}
          >
            Transactions ({payments.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('refunds')}
            className={`px-4 py-2 rounded-lg font-title-md text-body-sm ${
              tab === 'refunds' ? 'bg-primary-container text-on-primary' : 'bg-surface-container-lowest text-on-surface-variant'
            }`}
          >
            Refund Queue ({refunds.length})
          </button>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by Txn/Refund ID, Order #, or Patient..."
          className="h-9 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant/60 text-body-sm w-full sm:w-64"
        />
      </div>

      {tab === 'ledger' ? (
        <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low font-label-sm text-on-surface-variant uppercase">
                  <th className="py-3 px-4">Transaction & Gateway</th>
                  <th className="py-3 px-4">Order & Patient</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Refunded</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 font-body-sm">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-on-surface-variant">
                      No payment transactions match your filter.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-container-low/60">
                      <td className="py-3 px-4">
                        <div className="font-title-md text-primary">{p.transactionId}</div>
                        <div className="text-[11px] text-on-surface-variant">{p.gateway} • Demo Simulated</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-title-md text-on-surface">{p.orderNumber}</div>
                        <div className="text-[11px] text-on-surface-variant">{p.customerName}</div>
                      </td>
                      <td className="py-3 px-4">{p.method}</td>
                      <td className="py-3 px-4 text-right font-title-md tabular-nums">{formatINR(p.amount)}</td>
                      <td className="py-3 px-4 text-right tabular-nums text-on-surface-variant">{formatINR(p.refundedAmount)}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded font-label-sm whitespace-nowrap ${
                            p.status === 'Captured'
                              ? 'bg-primary-fixed text-on-primary-fixed'
                              : p.status === 'Failed'
                              ? 'bg-error-container text-on-error-container'
                              : 'bg-surface-container text-on-surface'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setPayloadModal(p)}
                            className="px-2.5 py-1 rounded bg-surface-container text-on-surface font-label-sm hover:bg-surface-container-high whitespace-nowrap"
                          >
                            Webhook JSON
                          </button>
                          {can('refunds', 'create') && p.status !== 'Failed' && p.status !== 'Pending' && p.refundedAmount < p.amount && (
                            <button
                              type="button"
                              onClick={() => {
                                setRefundModalPayment(p);
                                setRefundAmount(String(p.amount - p.refundedAmount));
                                setRefundReason('');
                              }}
                              className="px-2.5 py-1 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-sm whitespace-nowrap"
                            >
                              Initiate Refund
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low font-label-sm text-on-surface-variant uppercase">
                  <th className="py-3 px-4">Refund #</th>
                  <th className="py-3 px-4">Order & Patient</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Finance Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 font-body-sm">
                {filteredRefunds.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-on-surface-variant">
                      No refund requests match your filter.
                    </td>
                  </tr>
                ) : (
                  filteredRefunds.map((r) => (
                    <tr key={r.id}>
                      <td className="py-3 px-4">
                        <div className="font-title-md text-primary">{r.refundCode}</div>
                        <div className="text-[11px] text-on-surface-variant">{formatIndianDateTime(r.createdAt)}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-title-md text-on-surface">{r.orderNumber}</div>
                        <div className="text-[11px] text-on-surface-variant">{r.customerName}</div>
                      </td>
                      <td className="py-3 px-4 max-w-xs">{r.reason}</td>
                      <td className="py-3 px-4 text-right font-title-md tabular-nums">{formatINR(r.amount)}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded font-label-sm whitespace-nowrap ${
                            r.status === 'Processed (Simulated)'
                              ? 'bg-primary-fixed text-on-primary-fixed'
                              : r.status === 'Rejected'
                              ? 'bg-error-container text-on-error-container'
                              : 'bg-tertiary-fixed text-on-tertiary-fixed'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {r.status === 'Pending Approval' && can('refunds', 'approve') ? (
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleProcessRefund(r.id, 'Approve & Simulate')}
                              className="px-2.5 py-1 rounded bg-primary-container text-on-primary font-label-sm whitespace-nowrap"
                            >
                              Approve & Simulate
                            </button>
                            <button
                              type="button"
                              onClick={() => handleProcessRefund(r.id, 'Reject')}
                              className="px-2.5 py-1 rounded bg-error-container text-on-error-container font-label-sm whitespace-nowrap"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-on-surface-variant">{r.gatewayRefundRef || 'Finalized'}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Webhook JSON Modal */}
      {payloadModal && (
        <div className="fixed inset-0 z-[85] bg-on-surface/40 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-title-lg text-on-surface truncate">Gateway Payload ({payloadModal.transactionId})</h3>
              <button type="button" onClick={() => setPayloadModal(null)} className="p-1 rounded hover:bg-surface-container shrink-0">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-surface-container text-xs overflow-auto max-h-80 font-mono whitespace-pre-wrap break-all">
              {JSON.stringify(payloadModal.payloadJson, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Initiate Refund Modal */}
      {refundModalPayment && (
        <div className="fixed inset-0 z-[85] bg-on-surface/40 flex items-center justify-center p-4">
          <form onSubmit={handleCreateRefund} className="bg-surface-container-lowest rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-title-lg text-on-surface">Initiate Refund ({refundModalPayment.orderNumber})</h3>
              <button
                type="button"
                onClick={() => {
                  setRefundModalPayment(null);
                  setRefundReason('');
                }}
                className="p-1 rounded hover:bg-surface-container"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className="font-body-sm text-on-surface-variant">
              Max eligible amount: {formatINR(refundModalPayment.amount - refundModalPayment.refundedAmount)} (Demo Simulated)
            </p>
            <div>
              <label className="block font-label-md mb-1">Refund Amount (INR)</label>
              <input
                type="number"
                min={1}
                max={refundModalPayment.amount - refundModalPayment.refundedAmount}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant"
              />
            </div>
            <div>
              <label className="block font-label-md mb-1">Reason</label>
              <textarea
                rows={2}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                required
                placeholder="Order cancellation / damaged strip / customer request..."
                className="w-full p-2.5 rounded-lg bg-surface-container-low border border-outline-variant"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRefundModalPayment(null);
                  setRefundReason('');
                }}
                className="px-4 py-2 rounded-lg bg-surface-container"
              >
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md">
                Queue Refund Request
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
