"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { OrganizationSettings } from '@/types';
import {
  Home,
  User,
  Users,
  Package,
  Coins,
  FileText,
  FileSpreadsheet,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Bell,
  Briefcase,
  Lock
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, employee, effectiveModules, loading, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings | null>(null);

  // Password setup states (for invite & recovery links)
  const [showInvitePasswordModal, setShowInvitePasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Notification count state
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);

  // Toast notification state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch organization settings (single-row global config)
  useEffect(() => {
    const fetchOrgSettings = async () => {
      if (!isSupabaseConfigured || !user) return;
      try {
        const { data, error } = await supabase
          .from('organization_settings')
          .select('*')
          .eq('id', true)
          .single();
        if (!error && data) {
          setOrgSettings(data as OrganizationSettings);
        }
      } catch (err) {
        console.error('Error fetching org settings:', err);
      }
    };
    fetchOrgSettings();
  }, [user]);

  // Check URL hash for invitation/recovery link tokens
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.includes('type=invite') || hash.includes('type=recovery') || hash.includes('recovery')) {
        setShowInvitePasswordModal(true);
      }
    }
  }, []);

  // Fetch pending leave reviews count for HR Admins
  useEffect(() => {
    const fetchPendingCount = async () => {
      if (!isSupabaseConfigured || !user || user.role !== 'hr_admin') return;
      try {
        const { count, error } = await supabase
          .from('leave_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        if (!error && count !== null) {
          setPendingLeaveCount(count);
        }
      } catch (err) {
        console.error('Error fetching pending leave reviews count:', err);
      }
    };
    fetchPendingCount();
  }, [user]);

  const handleSetInvitePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      // Successfully saved password! Clear states
      setShowInvitePasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
      
      // Clear URL hash in browser so reload doesn't pop it up
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      
      showToast('success', 'Your login password has been securely configured! Use this password for successive logins.');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update login password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <span className="text-sm text-text-muted font-medium">Resolving permissions...</span>
        </div>
      </div>
    );
  }

  // Redirect if not signed in
  if (!user) return null;

  const roleLabels: Record<string, string> = {
    employee: 'Employee',
    coordinator: 'Project Coordinator',
    pm: 'Project Manager',
    warehouse_manager: 'Warehouse Manager',
    cfo: 'CFO',
    hr_admin: 'HR Admin',
    md: 'Managing Director'
  };

  const navItems = [
    {
      name: 'Home Dashboard',
      href: '/home',
      icon: Home,
      moduleKey: 'home' // public to all logged in
    },
    {
      name: 'My Workspace',
      href: '/my',
      icon: User,
      moduleKey: 'my' // always allowed
    },
    {
      name: 'HR Management',
      href: '/hr',
      icon: Users,
      moduleKey: 'hr'
    },
    {
      name: 'Inventory Operations',
      href: '/inventory',
      icon: Package,
      moduleKey: 'inventory'
    },
    {
      name: 'Project Cash Control',
      href: '/cash',
      icon: Coins,
      moduleKey: 'cash'
    },
    {
      name: 'Daily Tracker',
      href: '/tracker',
      icon: FileText,
      moduleKey: 'tracker'
    },
    {
      name: 'Reports & Audits',
      href: '/reports',
      icon: FileSpreadsheet,
      moduleKey: 'reports'
    },
    {
      name: 'System Admin',
      href: '/admin',
      icon: SettingsIcon,
      moduleKey: 'admin'
    }
  ];

  // Filter menu items by user's effective modules
  const allowedNavItems = navItems.filter(
    (item) => item.moduleKey === 'home' || effectiveModules.includes(item.moduleKey)
  );

  const getPageTitle = () => {
    const activeItem = navItems.find((item) => pathname?.startsWith(item.href));
    return activeItem ? activeItem.name : 'Egypro Onehub';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-surface border-r border-border transition-all duration-300 shadow-sm
          ${sidebarCollapsed ? 'w-[72px]' : 'w-[256px]'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:relative'}
        `}
      >
        {/* Sidebar Header with Brand Asset */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border bg-surface">
          <div className="flex items-center space-x-3 overflow-hidden">
            <Image
              src={orgSettings?.logo_path || '/logo.png'}
              alt="Brand Logo"
              width={32}
              height={32}
              className="flex-shrink-0"
            />
            {!sidebarCollapsed && (
              <span className="font-bold text-navy text-[15px] tracking-tight truncate">
                {orgSettings?.company_name || 'Egypro Onehub'}
              </span>
            )}
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1.5 text-text-muted hover:text-text hover:bg-background rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {allowedNavItems.map((item) => {
            const Icon = item.icon;
            // Exact or sub-path match for active styling
            const isActive = item.href === '/home' 
              ? pathname === '/home' 
              : pathname?.startsWith(item.href);
              
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group
                  ${isActive
                    ? 'bg-primary-tint text-primary'
                    : 'text-text hover:bg-background hover:text-navy'}
                `}
                title={sidebarCollapsed ? item.name : undefined}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon
                  size={19}
                  className={`transition-colors duration-150
                    ${isActive ? 'text-primary' : 'text-text-muted group-hover:text-navy'}
                  `}
                />
                {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-border space-y-1 bg-surface">
          <button
            onClick={() => signOut()}
            className="w-full flex items-center space-x-3.5 px-3 py-2.5 rounded-lg text-text hover:bg-danger-tint hover:text-danger text-sm font-semibold transition-all group"
            title={sidebarCollapsed ? 'Sign Out' : undefined}
          >
            <LogOut size={19} className="text-text-muted group-hover:text-danger transition-colors duration-150" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden md:flex w-full items-center justify-center py-1.5 text-text-muted hover:text-navy hover:bg-background rounded-lg transition-all"
            title={sidebarCollapsed ? 'Expand Menu' : 'Collapse Menu'}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </aside>

      {/* MAIN MAIN CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 flex items-center justify-between px-6 bg-surface border-b border-border z-30 shadow-xs">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 text-text-muted hover:text-navy hover:bg-background rounded-lg focus:outline-none"
            >
              <Menu size={22} />
            </button>
            <h1 className="text-base font-bold text-navy select-none tracking-tight">
              {getPageTitle()}
            </h1>
          </div>

          {/* User Profile info and role badge */}
          <div className="flex items-center space-x-4">
            {/* Notification Bell */}
            <button
              onClick={() => {
                if (user.role === 'hr_admin' && pendingLeaveCount > 0) {
                  showToast('success', `You have ${pendingLeaveCount} pending leave request(s) awaiting your review in HR Management!`);
                } else {
                  showToast('success', 'No new system notifications.');
                }
              }} 
              className="p-1.5 rounded-full hover:bg-background text-text-muted hover:text-navy transition-colors relative"
              title="System Notifications"
            >
              <Bell size={19} />
              {user.role === 'hr_admin' && pendingLeaveCount > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-surface select-none animate-pulse">
                  {pendingLeaveCount}
                </span>
              ) : (
                <span className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full ring-2 ring-surface" />
              )}
            </button>

            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-bold text-text leading-tight">
                {employee ? employee.full_name : (user.full_name && !user.full_name.includes('@') ? user.full_name : user.email.split('@')[0])}
              </span>
              <span className="text-xs text-text-muted leading-tight">{user.email}</span>
            </div>

            {/* Role Badge */}
            <span
              className={`px-3 py-1 text-[11px] font-bold rounded-full border tracking-wide uppercase shadow-2xs select-none
                ${user.role === 'hr_admin' ? 'bg-primary-tint text-primary border-primary/20' : ''}
                ${user.role === 'cfo' ? 'bg-danger-tint text-danger border-danger/20' : ''}
                ${user.role === 'pm' ? 'bg-success-tint text-success border-success/20' : ''}
                ${user.role === 'md' ? 'bg-warning-tint text-warning border-warning/20' : ''}
                ${user.role === 'coordinator' ? 'bg-navy-tint text-navy border-navy/20' : ''}
                ${user.role === 'warehouse_manager' ? 'bg-navy-tint text-navy border-navy/20' : ''}
                ${user.role === 'employee' ? 'bg-neutral-gray/10 text-text-muted border-border' : ''}
              `}
            >
              {roleLabels[user.role] || user.role}
            </span>
          </div>
        </header>

        {/* Viewport Wrapper */}
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* BLOCKING INVITE PASSWORD SETUP MODAL */}
      {showInvitePasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="max-w-md w-full bg-surface border border-border rounded-xl shadow-2xl p-8 m-4 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-primary-tint border border-primary/20 rounded-full flex items-center justify-center mx-auto text-primary animate-bounce">
                <Lock size={22} />
              </div>
              <h3 className="text-lg font-bold text-navy">Set Your Account Password</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Welcome to your Egypro Onehub portal! Please set a secure password to complete your account setup and enable future logins.
              </p>
            </div>

            <form onSubmit={handleSetInvitePassword} className="space-y-4 text-xs">
              {passwordError && (
                <div className="p-3 bg-danger-tint border border-danger/20 text-danger rounded-lg font-semibold">
                  {passwordError}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1.5">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter a secure password (min 6 chars)"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text font-normal text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text font-normal text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary/95 transition-all shadow-md text-center text-xs flex items-center justify-center gap-2"
              >
                {passwordLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving Password...
                  </>
                ) : (
                  'Activate Account'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* LAYOUT TOAST NOTIFICATIONS */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-top-4
          ${toast.type === 'success' ? 'bg-success-tint border-success/30 text-success' : 'bg-danger-tint border-danger/30 text-danger'}
        `}>
          <div className={`w-1.5 h-1.5 rounded-full ${toast.type === 'success' ? 'bg-success' : 'bg-danger'}`} />
          <span className="text-xs font-semibold">{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-xs opacity-60 hover:opacity-100 font-bold ml-1.5">×</button>
        </div>
      )}

    </div>
  );
}
