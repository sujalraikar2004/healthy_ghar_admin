import { useState, useEffect } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger' | 'warning';
  requireReason?: boolean;
  reasonPlaceholder?: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  requireReason = false,
  reasonPlaceholder = 'Enter audit reason or clinical note...',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setReason('');
      setError('');
    }
  }, [open]);

  if (!open) return null;

  const btnStyle =
    variant === 'danger'
      ? 'bg-error text-on-error hover:bg-on-error-container'
      : variant === 'warning'
      ? 'bg-tertiary-container text-on-tertiary hover:bg-tertiary'
      : 'bg-primary-container text-on-primary hover:bg-primary';

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) {
      setError('A valid reason is required for the statutory audit trail.');
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-on-surface/40 backdrop-blur-xs p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl max-w-md w-full p-6 border border-outline-variant/40">
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-xl shrink-0 ${
              variant === 'danger'
                ? 'bg-error-container text-on-error-container'
                : variant === 'warning'
                ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                : 'bg-primary-fixed text-on-primary-fixed'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">
              {variant === 'danger' ? 'warning' : variant === 'warning' ? 'policy' : 'verified_user'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">{title}</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">{description}</p>
          </div>
        </div>

        {requireReason && (
          <div className="mt-4">
            <label className="block font-label-md text-label-md text-on-surface mb-1">
              Statutory Audit Reason <span className="text-error">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder={reasonPlaceholder}
              className="w-full rounded-lg bg-surface-container-low border border-outline-variant px-3 py-2 font-body-md text-on-surface focus:outline-none focus:border-primary-container"
            />
            {error && <p className="text-error font-body-sm mt-1">{error}</p>}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-surface-container text-on-surface font-title-md text-body-md hover:bg-surface-container-high transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-lg font-title-md text-body-md transition-colors ${btnStyle}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
