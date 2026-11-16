import React from 'react';

type State = {
  hasError: boolean;
  message: string;
};

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || 'Something went wrong.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col items-center justify-center p-6 text-center">
          <div className="text-xs font-semibold tracking-[0.16em] text-[var(--text-muted)]">
            GREENSTRIKE
          </div>
          <h1 className="mt-6 font-serif-editorial text-4xl sm:text-5xl text-[var(--text)]">
            Something went wrong
          </h1>
          <p className="mt-3 text-sm text-[var(--text-2)] max-w-md">
            An unexpected error occurred while rendering this view.
          </p>
          <a
            href="/dashboard"
            className="mt-8 inline-flex items-center justify-center px-6 py-3 rounded-full bg-[var(--emerald)] text-white text-sm font-medium hover:brightness-110 transition-all"
          >
            Back to dashboard
          </a>
        </div>
      );
    }

    return this.props.children;
  }
}
