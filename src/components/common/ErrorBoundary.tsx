import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error?.message || 'Unexpected rendering error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-4 sm:p-6">
          <div className="max-w-lg w-full bg-surface-container-lowest rounded-2xl shadow-lg p-5 sm:p-8 text-center border border-outline-variant/40">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-error-container text-on-error-container flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[30px]">error_outline</span>
            </div>
            <h1 className="font-headline-md text-headline-md text-on-surface">Healthy Ghar Ops Interface Recovered</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">
              An unexpected error occurred while rendering this module. Your persisted pharmacy data remains safe.
            </p>
            <div className="mt-4 p-3 rounded-lg bg-surface-container-low text-left font-mono text-[12px] text-error break-words">
              {this.state.errorMessage}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, errorMessage: '' })}
                className="px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md text-body-md hover:bg-primary transition-colors"
              >
                Retry Current Screen
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = '/';
                }}
                className="px-4 py-2 rounded-lg bg-surface-container text-on-surface font-title-md text-body-md hover:bg-surface-container-high transition-colors"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
