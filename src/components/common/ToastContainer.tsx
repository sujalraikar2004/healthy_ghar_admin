import { useToastStore } from '../../store/useToastStore';

export function ToastContainer() {
  const { toasts, dismissToast } = useToastStore();

  if (toasts.length === 0) return null;

  const iconMap = {
    success: { icon: 'check_circle', bg: 'bg-primary-container text-on-primary', border: 'border-primary' },
    error: { icon: 'error', bg: 'bg-error text-on-error', border: 'border-error' },
    warning: { icon: 'warning', bg: 'bg-tertiary-container text-on-tertiary', border: 'border-tertiary' },
    info: { icon: 'info', bg: 'bg-inverse-surface text-inverse-on-surface', border: 'border-outline' },
  };

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-0 left-0 sm:left-auto sm:right-4 z-[100] flex flex-col gap-2 max-w-sm w-full mx-auto sm:mx-0 pointer-events-none px-4 sm:px-0 no-print"
    >
      {toasts.map((t) => {
        const cfg = iconMap[t.type];
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-lg border ${cfg.bg} ${cfg.border}`}
          >
            <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">{cfg.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-title-md text-body-md leading-tight">{t.title}</p>
              {t.description && <p className="font-body-sm text-body-sm opacity-90 mt-0.5">{t.description}</p>}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              className="p-0.5 rounded hover:bg-black/15 transition-colors shrink-0"
              aria-label="Dismiss notification"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
