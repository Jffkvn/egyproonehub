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
  Briefcase
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
            {/* Notification Bell (Visual only for milestone 1) */}
            <button className="p-1.5 rounded-full hover:bg-background text-text-muted hover:text-navy transition-colors relative">
              <Bell size={19} />
              <span className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full ring-2 ring-surface" />
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
    </div>
  );
}
