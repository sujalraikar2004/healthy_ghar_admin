import { useNavigate } from 'react-router-dom';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';

export function SessionExpiredPage() {
  const navigate = useNavigate();
  const restoreSession = usePharmacyStore((s) => s.restoreSession);
  const logout = usePharmacyStore((s) => s.logout);
  const currentUser = usePharmacyStore((s) => s.getCurrentUser());
  const pushToast = useToastStore((s) => s.pushToast);

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full bg-surface-container-lowest rounded-2xl shadow-lg p-5 sm:p-8 text-center border border-outline-variant/40">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-[30px]">lock_clock</span>
        </div>
        <h1 className="font-headline-md text-headline-md text-on-surface">Clinical Session Timed Out</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-2">
          For CDSCO patient privacy and dispensing security, inactive sessions lock automatically.
          {currentUser ? ` Locked user: ${currentUser.name}.` : ''}
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => {
              restoreSession();
              pushToast({ type: 'success', title: 'Session Restored', description: 'Demo session unlocked.' });
            }}
            className="w-full h-11 rounded-xl bg-primary-container text-on-primary font-title-md hover:bg-primary transition-colors"
          >
            Re-authenticate & Resume Session
          </button>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full h-10 rounded-xl bg-surface-container text-on-surface font-title-md hover:bg-surface-container-high transition-colors"
          >
            Switch Staff Account
          </button>
        </div>
      </div>
    </div>
  );
}
