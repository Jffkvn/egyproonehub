"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function AccessDenied() {
  const { signOut } = useAuth();

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
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-navy mb-3">Access Denied</h2>
        <p className="text-sm text-text-muted mb-6 leading-relaxed">
          You do not have the required permissions to view this module. If you believe this is an error, please contact your administrator to configure a module override.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/home"
            className="w-full sm:w-auto px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg shadow hover:bg-primary/95 transition-all text-center"
          >
            Go to Home
          </Link>
          <button
            onClick={() => signOut()}
            className="w-full sm:w-auto px-5 py-2.5 border border-border hover:bg-background text-text text-sm font-semibold rounded-lg transition-all"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
