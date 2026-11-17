import { useMemo, useState } from 'react';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';
import { ProductReview } from '../../types';
import { formatIndianDateTime } from '../../utils/formatters';

export function ProductReviewsPage() {
  const pushToast = useToastStore((s) => s.pushToast);

  const reviews = usePharmacyStore((s) => s.reviews);
  const moderateReview = usePharmacyStore((s) => s.moderateReview);
  const can = usePharmacyStore((s) => s.can);

  const [filter, setFilter] = useState<'ALL' | ProductReview['status']>('ALL');

  const filtered = useMemo(
    () => reviews.filter((r) => filter === 'ALL' || r.status === filter),
    [reviews, filter]
  );

  const handleModerate = (id: string, status: ProductReview['status'], note?: string) => {
    const res = moderateReview(id, status, note);
    pushToast({
      type: res.ok ? 'success' : 'error',
      title: res.ok ? `Review ${status}` : 'Blocked',
      description: res.message,
    });
  };

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      <div>
        <span className="font-label-sm text-primary uppercase tracking-wider">Drugs & Magic Remedies Act Compliance</span>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Product Reviews Moderation</h1>
        <p className="font-body-md text-on-surface-variant">
          Moderate verified patient feedback & flag unverified medical cure claims under DMR Act
        </p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(['ALL', 'Pending', 'Approved', 'Flagged (DMR Act)', 'Hidden', 'Rejected'] as const).map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setFilter(st)}
            className={`px-3 py-1.5 rounded-lg font-label-md whitespace-nowrap ${
              filter === st ? 'bg-primary-container text-on-primary' : 'bg-surface-container-lowest text-on-surface-variant'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-surface-container-lowest p-10 rounded-xl shadow-sm text-center text-on-surface-variant font-body-md">
            No patient reviews match the "{filter}" status filter.
          </div>
        ) : (
          filtered.map((rev) => (
            <div key={rev.id} className="bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-title-md text-primary">{rev.productName}</span>
                  <span className="px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-sm">
                    {rev.rating} ★
                  </span>
                  <span className="px-2 py-0.5 rounded bg-surface-container font-label-sm">{rev.status}</span>
                </div>
                <h3 className="font-title-md text-on-surface">{rev.title}</h3>
                <p className="font-body-sm text-on-surface-variant">{rev.comment}</p>
                <div className="text-[11px] text-on-surface-variant">
                  By {rev.customerName} • {formatIndianDateTime(rev.createdAt)}
                  {rev.moderationNote ? ` • Note: ${rev.moderationNote}` : ''}
                </div>
              </div>

              {can('reviews', 'approve') && (
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleModerate(rev.id, 'Approved')}
                    className="px-3 py-1.5 rounded-lg bg-primary-fixed text-on-primary-fixed font-label-md"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModerate(rev.id, 'Flagged (DMR Act)', 'Unverified therapeutic claim flagged under DMR Act')}
                    className="px-3 py-1.5 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed font-label-md"
                  >
                    Flag DMR Act
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModerate(rev.id, 'Hidden')}
                    className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface font-label-md"
                  >
                    Hide
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModerate(rev.id, 'Rejected')}
                    className="px-3 py-1.5 rounded-lg bg-error-container text-on-error-container font-label-md"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
