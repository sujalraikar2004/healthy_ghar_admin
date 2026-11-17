import { useNavigate } from 'react-router-dom';
import { PermissionModule } from '../../types';
import { usePharmacyStore } from '../../store/usePharmacyStore';

export function AccessDeniedPage({ requiredModule }: { requiredModule?: PermissionModule }) {
  const navigate = useNavigate();
  const currentUser = usePharmacyStore((s) => s.getCurrentUser());

  return (
    <div className="p-space-lg lg:p-space-xl flex items-center justify-center min-h-[70vh]">
      <div className="max-w-lg w-full bg-surface-container-lowest rounded-2xl shadow-sm p-5 sm:p-8 text-center border border-outline-variant/40">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-error-container text-on-error-container flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-[30px]">gpp_bad</span>
        </div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm uppercase tracking-wider mb-3">
          RBAC Policy Restricted
        </span>
        <h1 className="font-headline-md text-headline-md text-on-surface">Access Denied to Module</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-2">
          Your active role (<strong className="text-on-surface">{currentUser?.roleId || 'Staff'}</strong>) does not hold view privileges for{' '}
          <strong className="text-on-surface">{requiredModule || 'this resource'}</strong>.
        </p>
        <p className="font-body-sm text-body-sm text-outline mt-1">
          In Demo Mode, you can switch roles from the top-right profile menu or request Super Admin approval.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md text-body-md hover:bg-primary transition-colors"
          >
            Return to Dashboard
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg bg-surface-container text-on-surface font-title-md text-body-md hover:bg-surface-container-high transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
