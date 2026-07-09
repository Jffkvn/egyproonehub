"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) return;
    
    setLoading(true);
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;
      
      router.replace('/home');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-surface border border-border rounded-2xl shadow-2xl p-8 space-y-8">
        <div className="text-center">
          <Image
            src="/logo.png"
            alt="Egypro Onehub Logo"
            width={64}
            height={64}
            className="mx-auto"
            priority
          />
          <h2 className="mt-4 text-3xl font-extrabold text-navy">
            Egypro Onehub
          </h2>
          <p className="mt-2 text-sm text-text-muted">
            Sign in to the unified business platform
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="p-3.5 bg-danger-tint border border-danger/20 rounded-lg text-danger text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-xs font-bold text-navy uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none block w-full px-3.5 py-2.5 border border-border rounded-lg placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm bg-background text-text transition-all"
                placeholder="you@egypro.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-navy uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full px-3.5 py-2.5 border border-border rounded-lg placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm bg-background text-text transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-primary hover:bg-primary/95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
            >
              {loading ? (
                <span className="flex items-center space-x-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Signing in...</span>
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
