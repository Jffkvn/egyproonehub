"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Project, Employee } from '@/types';
import Link from 'next/link';
import {
  Users,
  Briefcase,
  TrendingUp,
  PackageOpen,
  ClipboardCheck,
  AlertCircle,
  Coins
} from 'lucide-react';

export default function HomeDashboard() {
  const { user, employee } = useAuth();
  
  const getGreetingName = () => {
    if (employee?.full_name) {
      return employee.full_name.trim().split(/\s+/)[0];
    }
    if (user?.full_name && !user.full_name.includes('@')) {
      return user.full_name.trim().split(/\s+/)[0];
    }
    return user?.email ? user.email.split('@')[0] : 'User';
  };

  const [projectCount, setProjectCount] = useState(0);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [activeProjects, setActiveProjects] = useState<Project[]>([]);
  const [assignedProjectsCount, setAssignedProjectsCount] = useState(0);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!isSupabaseConfigured || !user) return;
      try {
        // Fetch project count
        const { count: projCount } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true });
        setProjectCount(projCount || 0);

        // Fetch employee count
        const { count: empCount } = await supabase
          .from('employees')
          .select('*', { count: 'exact', head: true });
          setEmployeeCount(empCount || 0);

        // Fetch top active projects
        const { data: projList } = await supabase
          .from('projects')
          .select('*')
          .eq('status', 'active')
          .limit(3);
        setActiveProjects((projList as Project[]) || []);

        // Fetch active user assignments count
        const { count: assignCount } = await supabase
          .from('project_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .is('unassigned_at', null);
        setAssignedProjectsCount(assignCount || 0);
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      }
    };
    loadDashboardData();
  }, [user]);

  if (!user) return null;

  // Render role-specific details
  const renderRoleDashboard = () => {
    switch (user.role) {
      case 'hr_admin':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-surface p-6 rounded-xl border border-border shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Total Headcount</span>
                  <Users className="text-primary w-5 h-5" />
                </div>
                <div className="text-3xl font-extrabold text-navy">{employeeCount}</div>
                <p className="text-xs text-text-muted mt-2">Active employee directory records</p>
              </div>

              <div className="bg-surface p-6 rounded-xl border border-border shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-navy uppercase tracking-wider">Pending User Links</span>
                  <AlertCircle className="text-navy w-5 h-5" />
                </div>
                <div className="text-3xl font-extrabold text-navy">Requires Audit</div>
                <p className="text-xs text-text-muted mt-2">Verify unlinked employee records</p>
              </div>

              <div className="bg-surface p-6 rounded-xl border border-border shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-success uppercase tracking-wider">System Security</span>
                  <ClipboardCheck className="text-success w-5 h-5" />
                </div>
                <div className="text-3xl font-extrabold text-success">RLS Enforced</div>
                <p className="text-xs text-text-muted mt-2">Least-privilege policy configuration active</p>
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl shadow-2xs p-6">
              <h3 className="font-bold text-navy text-base mb-4">HR Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <Link
                  href="/hr"
                  className="p-4 border border-border hover:border-primary/30 rounded-lg hover:bg-background transition-all block text-center"
                >
                  <span className="text-sm font-bold text-navy block mb-1">Manage Employees</span>
                  <span className="text-xs text-text-muted">Link user accounts and edit salaries</span>
                </Link>
                <Link
                  href="/admin"
                  className="p-4 border border-border hover:border-primary/30 rounded-lg hover:bg-background transition-all block text-center"
                >
                  <span className="text-sm font-bold text-navy block mb-1">Module Overrides</span>
                  <span className="text-xs text-text-muted">Grant custom permissions per user</span>
                </Link>
                <Link
                  href="/reports"
                  className="p-4 border border-border hover:border-primary/30 rounded-lg hover:bg-background transition-all block text-center"
                >
                  <span className="text-sm font-bold text-navy block mb-1">View Audit Logs</span>
                  <span className="text-xs text-text-muted">Audit system modifications</span>
                </Link>
              </div>
            </div>
          </div>
        );

      case 'pm':
      case 'coordinator':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-surface p-6 rounded-xl border border-border shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Your Assignments</span>
                  <Briefcase className="text-primary w-5 h-5" />
                </div>
                <div className="text-3xl font-extrabold text-navy">{assignedProjectsCount}</div>
                <p className="text-xs text-text-muted mt-2">Active engineering projects assigned to you</p>
              </div>

              <div className="bg-surface p-6 rounded-xl border border-border shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-navy uppercase tracking-wider">Active In System</span>
                  <TrendingUp className="text-navy w-5 h-5" />
                </div>
                <div className="text-3xl font-extrabold text-navy">{projectCount}</div>
                <p className="text-xs text-text-muted mt-2">Total registered company projects</p>
              </div>

              <div className="bg-surface p-6 rounded-xl border border-border shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-warning uppercase tracking-wider">Project Cash</span>
                  <Coins className="text-warning w-5 h-5" />
                </div>
                <div className="text-3xl font-extrabold text-navy">Active Control</div>
                <p className="text-xs text-text-muted mt-2">Submit cash advances for tracking</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-surface border border-border rounded-xl shadow-2xs p-6">
                <h3 className="font-bold text-navy text-base mb-4">Your Active Projects</h3>
                {activeProjects.length === 0 ? (
                  <p className="text-sm text-text-muted italic">No active projects found.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {activeProjects.map((proj) => (
                      <div key={proj.id} className="py-3 flex justify-between items-center first:pt-0 last:pb-0">
                        <div>
                          <p className="font-bold text-navy text-sm">{proj.name}</p>
                          <p className="text-xs text-text-muted">Code: {proj.code || 'N/A'}</p>
                        </div>
                        <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-success-tint text-success border border-success/20 uppercase">
                          {proj.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-surface border border-border rounded-xl shadow-2xs p-6 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-navy text-base mb-2">Daily Project Operations</h3>
                  <p className="text-sm text-text-muted mb-4 leading-relaxed">
                    Submit daily logs, site photos, request material allocations from the central warehouse, and track project cash flow directly.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link
                    href="/tracker"
                    className="flex-1 text-center py-2.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/95 transition-all shadow"
                  >
                    Site Log Tracker
                  </Link>
                  <Link
                    href="/cash"
                    className="flex-1 text-center py-2.5 border border-border hover:bg-background text-navy text-xs font-bold rounded-lg transition-all"
                  >
                    Cash Advance requests
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );

      case 'warehouse_manager':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-surface p-6 rounded-xl border border-border shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Inventory Index</span>
                  <PackageOpen className="text-primary w-5 h-5" />
                </div>
                <div className="text-3xl font-extrabold text-navy">Central Stock</div>
                <p className="text-xs text-text-muted mt-2">Active equipment catalogs</p>
              </div>

              <div className="bg-surface p-6 rounded-xl border border-border shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-navy uppercase tracking-wider">QR Code Labels</span>
                  <AlertCircle className="text-navy w-5 h-5" />
                </div>
                <div className="text-3xl font-extrabold text-navy">Deferred</div>
                <p className="text-xs text-text-muted mt-2">QR workflows coming in Milestone 2</p>
              </div>

              <div className="bg-surface p-6 rounded-xl border border-border shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-success uppercase tracking-wider">GRN Intake</span>
                  <ClipboardCheck className="text-success w-5 h-5" />
                </div>
                <div className="text-3xl font-extrabold text-success">Active Control</div>
                <p className="text-xs text-text-muted mt-2">Create Goods Received Notes</p>
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl shadow-2xs p-6">
              <h3 className="font-bold text-navy text-base mb-2">Warehouse Quick Overview</h3>
              <p className="text-sm text-text-muted mb-4">
                Milestone 1 establishes the inventory catalogue shell. Material requests, QR scanners, and print tasks are locked for upcoming releases.
              </p>
              <Link
                href="/inventory"
                className="inline-block px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/95 transition-all shadow"
              >
                Go to Catalog & Intake
              </Link>
            </div>
          </div>
        );

      case 'cfo':
      case 'md':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-surface p-6 rounded-xl border border-border shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Registered Projects</span>
                  <Briefcase className="text-primary w-5 h-5" />
                </div>
                <div className="text-3xl font-extrabold text-navy">{projectCount}</div>
                <p className="text-xs text-text-muted mt-2">Total active internal engineering projects</p>
              </div>

              <div className="bg-surface p-6 rounded-xl border border-border shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-navy uppercase tracking-wider">Organizational Settings</span>
                  <Users className="text-navy w-5 h-5" />
                </div>
                <div className="text-3xl font-extrabold text-navy">{employeeCount}</div>
                <p className="text-xs text-text-muted mt-2">Total active employees records</p>
              </div>

              <div className="bg-surface p-6 rounded-xl border border-border shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-success uppercase tracking-wider">Financial Overview</span>
                  <Coins className="text-success w-5 h-5" />
                </div>
                <div className="text-3xl font-extrabold text-success">Unified Cash</div>
                <p className="text-xs text-text-muted mt-2">Real-time budget overview panel</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-surface border border-border rounded-xl shadow-2xs p-6">
                <h3 className="font-bold text-navy text-base mb-4">Master Projects Status</h3>
                {activeProjects.length === 0 ? (
                  <p className="text-sm text-text-muted italic">No active projects found.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {activeProjects.map((proj) => (
                      <div key={proj.id} className="py-3 flex justify-between items-center first:pt-0 last:pb-0">
                        <div>
                          <p className="font-bold text-navy text-sm">{proj.name}</p>
                          <p className="text-xs text-text-muted">Estimated Budget: {proj.estimated_budget.toLocaleString()} {proj.currency}</p>
                        </div>
                        <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-success-tint text-success border border-success/20 uppercase">
                          {proj.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-surface border border-border rounded-xl shadow-2xs p-6 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-navy text-base mb-2">Executive Approvals</h3>
                  <p className="text-sm text-text-muted mb-4 leading-relaxed">
                    Access project audit reports, cash advance requests, project assignments, and set approval limits for project coordinators.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link
                    href="/reports"
                    className="flex-1 text-center py-2.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/95 transition-all shadow"
                  >
                    View System Audits
                  </Link>
                  <Link
                    href="/cash"
                    className="flex-1 text-center py-2.5 border border-border hover:bg-background text-navy text-xs font-bold rounded-lg transition-all"
                  >
                    Project Ledger
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-surface p-6 rounded-xl border border-border shadow-2xs">
            <h3 className="font-bold text-navy text-base mb-2">Welcome to your workspace</h3>
            <p className="text-sm text-text-muted leading-relaxed">
              Use the sidebar to navigate through your assigned modules. If you require additional module access, please contact your HR Administrator.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface border border-border rounded-xl shadow-2xs p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-navy">Welcome back, {getGreetingName()}!</h2>
          <p className="text-sm text-text-muted mt-1.5 leading-relaxed">
            Here is your dashboard overview for today. Role-based view: <code className="text-primary font-bold">{user.role}</code>.
          </p>
          {employee && (
            <p className="text-xs text-primary font-bold mt-2">
              Linked Employee record: {employee.full_name} ({employee.position || 'No Position Set'})
            </p>
          )}
        </div>
        <div className="flex-shrink-0">
          <span className="text-xs text-text-muted font-bold block mb-1 uppercase tracking-wider">Current Time</span>
          <span className="text-navy font-mono font-bold text-sm bg-background border border-border px-3 py-1.5 rounded-lg">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {renderRoleDashboard()}
    </div>
  );
}
