"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) return;
    
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName || email.split('@')[0],
            }
          }
        });

        if (signUpError) throw signUpError;
        alert('Account registration successful! You can now toggle to Sign In and log in.');
        setIsSignUp(false);
        setPassword('');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        router.replace('/home');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed');
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
            {isSignUp ? 'Create your platform login account' : 'Sign in to the unified business platform'}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="p-3.5 bg-danger-tint border border-danger/20 rounded-lg text-danger text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {isSignUp && (
              <div>
                <label htmlFor="full-name" className="block text-xs font-bold text-navy uppercase tracking-wider mb-2">
                  Full Name
                </label>
                <input
                  id="full-name"
                  name="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="appearance-none block w-full px-3.5 py-2.5 border border-border rounded-lg placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm bg-background text-text transition-all"
                  placeholder="John Doe"
                />
              </div>
            )}

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
                autoComplete={isSignUp ? "new-password" : "current-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full px-3.5 py-2.5 border border-border rounded-lg placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm bg-background text-text transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="space-y-4">
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
                  <span>{isSignUp ? 'Registering...' : 'Signing in...'}</span>
                </span>
              ) : (
                isSignUp ? 'Register Account' : 'Sign In'
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                }}
                className="text-xs font-semibold text-primary hover:underline"
              >
                {isSignUp ? 'Already have an account? Sign In' : 'Need a login profile? Create Account'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
