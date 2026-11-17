import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6">
      <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-5 sm:p-8 max-w-md w-full text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-primary-fixed text-primary flex items-center justify-center">
          <span className="material-symbols-outlined text-[32px]">explore_off</span>
        </div>
        <h1 className="font-headline-md text-on-surface">Route Not Found (404)</h1>
        <p className="font-body-md text-on-surface-variant">
          The requested pharmacy operations view does not exist or has moved.
        </p>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="px-5 py-2.5 rounded-lg bg-primary-container text-on-primary font-title-md text-body-md hover:bg-primary"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}
