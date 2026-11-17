import { useMemo, useState } from 'react';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';
import { ReturnRequest } from '../../types';
import { formatIndianDateTime, formatINR } from '../../utils/formatters';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export function ReturnsRefundsPage() {
  const pushToast = useToastStore((s) => s.pushToast);

  const returns = usePharmacyStore((s) => s.returns);
  const reviewReturnRequest = usePharmacyStore((s) => s.reviewReturnRequest);
  const can = usePharmacyStore((s) => s.can);

  const [statusFilter, setStatusFilter] = useState<'ALL' | ReturnRequest['status']>('ALL');
  const [pendingAction, setPendingAction] = useState<{
    ret: ReturnRequest;
    decision: 'Approved' | 'Rejected' | 'Form 46 Destroyed' | 'Restocked';
  } | null>(null);

  const filtered = useMemo(
    () => returns.filter((r) => statusFilter === 'ALL' || r.status === statusFilter),
    [returns, statusFilter]
  );

  const handleConfirm = (reason: string) => {
    if (!pendingAction) return;
    const res = reviewReturnRequest({
      returnId: pendingAction.ret.id,
      decision: pendingAction.decision,
      reviewNotes: reason,
    });
    setPendingAction(null);
    pushToast({
      type: res.ok ? 'success' : 'error',
      title: res.ok ? 'Return Processed' : 'CDSCO Policy Blocked',
      description: res.message,
    });
  };

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      <div>
        <span className="font-label-sm text-primary uppercase tracking-wider">Reverse Logistics & Rule 65</span>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Returns & Cancellations</h1>
        <p className="font-body-md text-on-surface-variant">
          Enforces Cold-Chain & Schedule H non-returnable policy, sealed batch restocking, and Form 46 destruction
        </p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(['ALL', 'Pending Review', 'Approved', 'Restocked', 'Form 46 Destroyed', 'Rejected'] as const).map((st) => (
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

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-surface-container-lowest p-10 rounded-xl shadow-sm text-center text-on-surface-variant font-body-sm">
            No return or cancellation requests match the selected status filter.
          </div>
        ) : (
          filtered.map((ret) => (
            <div key={ret.id} className="bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-title-lg text-primary">{ret.returnCode}</span>
                  <span className="font-label-md text-on-surface">Order {ret.orderNumber}</span>
                  <span
                    className={`px-2 py-0.5 rounded font-label-sm ${
                      ret.eligibilityCheck === 'Eligible'
                        ? 'bg-primary-fixed text-on-primary-fixed'
                        : 'bg-error-container text-on-error-container'
                    }`}
                  >
                    {ret.eligibilityCheck}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-surface-container font-label-sm">{ret.status}</span>
                </div>
                <div className="font-title-md text-on-surface">
                  {ret.productName} × {ret.quantity} — Eligible Refund: {formatINR(ret.refundEligibleAmount)}
                </div>
                <p className="font-body-sm text-on-surface-variant">
                  Patient: {ret.customerName} • Reason: {ret.reason} • Evidence: {ret.evidenceNote}
                </p>
                <p className="text-[11px] text-on-surface-variant">Requested {formatIndianDateTime(ret.requestedAt)}</p>
              </div>

              {can('returns', 'approve') && ret.status === 'Pending Review' && (
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPendingAction({ ret, decision: 'Restocked' })}
                    className="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary font-label-md"
                  >
                    Approve & Restock
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingAction({ ret, decision: 'Form 46 Destroyed' })}
                    className="px-3 py-1.5 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed font-label-md"
                  >
                    Form 46 Destruction
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingAction({ ret, decision: 'Rejected' })}
                    className="px-3 py-1.5 rounded-lg bg-error-container text-on-error-container font-label-md"
                  >
                    Reject Return
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={`Confirm Return Action: ${pendingAction?.decision || ''}`}
        description={`Record statutory review note for ${pendingAction?.ret.returnCode}. Sealed restocks increment valid hub batch inventory.`}
        confirmLabel={`Confirm ${pendingAction?.decision || ''}`}
        variant={pendingAction?.decision === 'Rejected' ? 'danger' : 'warning'}
        requireReason
        onConfirm={handleConfirm}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}
