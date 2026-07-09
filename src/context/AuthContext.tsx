"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { resolveEffectiveModules } from '@/lib/permissions/resolver';
import { User, Employee, UserModuleOverride } from '@/types';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  employee: Employee | null;
  effectiveModules: string[];
  loading: boolean;
  error: string | null;
  showPasswordResetModal: boolean;
  setShowPasswordResetModal: (show: boolean) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [effectiveModules, setEffectiveModules] = useState<string[]>(['my']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const initialLoadDone = useRef(false);
  const fetchingPromiseRef = useRef<Promise<void> | null>(null);
  
  const router = useRouter();
  const pathname = usePathname();

  const fetchProfileAndPermissions = async (userId: string): Promise<void> => {
    if (!isSupabaseConfigured) return;
    if (fetchingPromiseRef.current) return fetchingPromiseRef.current;

    const promise = (async () => {
      try {
        // 1. Fetch system user profile
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .eq('is_active', true)
          .single();

        if (userError || !userData) {
          // User profile doesn't exist (e.g. signup trigger delay or disabled account)
          setUser(null);
          setEmployee(null);
          setEffectiveModules(['my']);
          return;
        }

        setUser(userData as User);

        // 2. Fetch linked employee record (optional)
        const { data: employeeData } = await supabase
          .from('employees')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'active')
          .maybeSingle();

        setEmployee(employeeData as Employee);

        // 3. Fetch default modules for the user's role
        const { data: roleData, error: roleError } = await supabase
          .from('roles')
          .select('default_modules')
          .eq('role_name', userData.role)
          .single();

        const defaultModules = roleError || !roleData ? ['my'] : (roleData.default_modules as string[]);

        // 4. Fetch module overrides
        const { data: overridesData } = await supabase
          .from('user_module_overrides')
          .select('module_key, access_type')
          .eq('user_id', userId);

        const overrides = (overridesData || []) as UserModuleOverride[];

        // 5. Calculate effective module permissions
        const resolved = resolveEffectiveModules(defaultModules, overrides);
        setEffectiveModules(resolved);
      } catch (err: any) {
        console.error('Error fetching auth user profile details:', err);
        setError(err.message || 'Error resolving permissions');
      } finally {
        fetchingPromiseRef.current = null;
      }
    })();

    fetchingPromiseRef.current = promise;
    return promise;
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfileAndPermissions(user.id);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      initialLoadDone.current = true;
      return;
    }

    // Check right on mount before Supabase strips URL hash tokens
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      if (
        hash.includes('type=invite') ||
        hash.includes('type=recovery') ||
        hash.includes('recovery') ||
        search.includes('type=invite') ||
        search.includes('type=recovery')
      ) {
        setShowPasswordResetModal(true);
      }
    }

    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await fetchProfileAndPermissions(session.user.id);
        } else {
          setUser(null);
          setEmployee(null);
          setEffectiveModules(['my']);
        }
      } catch (err) {
        console.error('Session initialization error:', err);
      } finally {
        setLoading(false);
        initialLoadDone.current = true;
      }
    };

    initSession();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        if (event === 'PASSWORD_RECOVERY') {
          setShowPasswordResetModal(true);
        }

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setEmployee(null);
          setEffectiveModules(['my']);
          setLoading(false);
          initialLoadDone.current = true;
          return;
        }

        if (session) {
          if (!initialLoadDone.current) {
            setLoading(true);
            await fetchProfileAndPermissions(session.user.id);
            setLoading(false);
            initialLoadDone.current = true;
          } else if (event === 'USER_UPDATED' || event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') {
            await fetchProfileAndPermissions(session.user.id);
          }
        } else if (initialLoadDone.current && !fetchingPromiseRef.current) {
          setUser(null);
          setEmployee(null);
          setEffectiveModules(['my']);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Handle Client-Side Route Protection
  useEffect(() => {
    if (loading || fetchingPromiseRef.current) return;

    const publicRoutes = ['/login', '/unauthorized', '/setup-error'];
    const isPublicRoute = publicRoutes.some((route) => pathname?.startsWith(route));

    if (!user) {
      if (!isPublicRoute) {
        router.replace('/login');
      }
    } else {
      if (pathname === '/login') {
        router.replace('/home');
      } else if (!isPublicRoute && pathname !== '/home' && pathname !== '/unauthorized') {
        const moduleKey = pathname.split('/')[1];
        if (moduleKey && !effectiveModules.includes(moduleKey)) {
          router.replace('/unauthorized');
        }
      }
    }
  }, [user, loading, pathname, effectiveModules, router]);

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
      setUser(null);
      setEmployee(null);
      setEffectiveModules(['my']);
      router.replace('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        employee,
        effectiveModules,
        loading,
        error,
        showPasswordResetModal,
        setShowPasswordResetModal,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
