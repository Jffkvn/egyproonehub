import React from 'react';

export default function ConfigError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-surface border border-border rounded-xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-danger-tint border border-danger/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-danger"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-navy mb-3">Database Connection Missing</h2>
        <p className="text-sm text-text-muted mb-6 leading-relaxed">
          Egypro Onehub requires Supabase environment variables to be configured. The application cannot run without backend integrity.
        </p>
        <div className="bg-background border border-border rounded-lg p-4 text-left font-mono text-xs text-text-muted space-y-2 mb-6">
          <p className="font-bold text-navy text-[11px] uppercase tracking-wider">Setup Instructions:</p>
          <p>1. Create a <code className="text-primary font-bold">.env.local</code> file in project root.</p>
          <p>2. Add the following keys:</p>
          <div className="pl-3 border-l-2 border-primary mt-1 space-y-1">
            <p>NEXT_PUBLIC_SUPABASE_URL=your_supabase_url</p>
            <p>NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key</p>
          </div>
        </div>
        <div className="text-xs text-text-muted">
          Please restart the Next.js development server after setting these variables.
        </div>
      </div>
    </div>
  );
}
