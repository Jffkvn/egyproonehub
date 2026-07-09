"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { countWorkingDays, validateLeaveDates } from '@/lib/utils/leave';
import { writeAuditLog } from '@/lib/audit/logger';
import {
  User,
  CreditCard,
  Phone,
  Briefcase,
  Calendar,
  DollarSign,
  Plus,
  X,
  Megaphone,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Trash2,
  Shield
} from 'lucide-react';

interface LeaveType {
  id: string;
  name: string;
  code: string;
  default_days: number;
  is_active: boolean;
  is_paid: boolean;
}

interface LeaveRequest {
  id: string;
  employee_id: string;
  user_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approver_id: string | null;
  approver_notes: string | null;
  created_at: string;
  leave_types?: {
    name: string;
    code: string;
  };
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

export default function MyWorkspace() {
  const { user, employee } = useAuth();
  
  // Data lists
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveHistory, setLeaveHistory] = useState<LeaveRequest[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  // Balances map
  const [balances, setBalances] = useState<Record<string, { entitled: number; remaining: number }>>({});

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Leave Form states
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [daysRequested, setDaysRequested] = useState(0);
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Toast Notification state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchWorkspaceData = async () => {
    if (!user || !isSupabaseConfigured) return;
    setLoading(true);
    try {
      // 1. Fetch leave types
      const { data: ltData, error: ltError } = await supabase
        .from('leave_types')
        .select('*')
        .eq('is_active', true);
      
      if (ltError) throw ltError;
      const types = (ltData || []) as LeaveType[];
      setLeaveTypes(types);

      // 2. Fetch announcements
      const { data: annData, error: annError } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (annError) throw annError;
      setAnnouncements((annData || []) as Announcement[]);

      // If no employee linked, we can skip fetching history and computing balances
      if (!employee) {
        setLoading(false);
        return;
      }

      // 3. Fetch employee leave history
      const { data: lhData, error: lhError } = await supabase
        .from('leave_requests')
        .select('*, leave_types(name, code)')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false });
      
      if (lhError) throw lhError;
      const requests = (lhData || []) as LeaveRequest[];
      setLeaveHistory(requests);

      // 4. Compute provisional leave balances
      // Balance = Entitlement - Approved requested days starting in current calendar year
      const currentYear = new Date().getFullYear();
      const balancesMap: Record<string, { entitled: number; remaining: number }> = {};
      
      types.forEach(t => {
        balancesMap[t.id] = {
          entitled: t.default_days,
          remaining: t.default_days
        };
      });

      requests.forEach(req => {
        if (req.status === 'approved') {
          const reqYear = new Date(req.start_date).getFullYear();
          if (reqYear === currentYear && balancesMap[req.leave_type_id]) {
            balancesMap[req.leave_type_id].remaining -= Number(req.days_requested);
          }
        }
      });

      setBalances(balancesMap);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error fetching self-service workspace records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceData();
  }, [user, employee]);

  // Recalculate days requested when dates change
  useEffect(() => {
    if (startDate && endDate) {
      const validation = validateLeaveDates(startDate, endDate);
      if (!validation.isValid) {
        setFormError(validation.error);
        setDaysRequested(0);
      } else {
        setFormError(null);
        const days = countWorkingDays(startDate, endDate);
        setDaysRequested(days);
      }
    } else {
      setDaysRequested(0);
      setFormError(null);
    }
  }, [startDate, endDate]);

  if (!user) return null;

  // SUBMIT LEAVE REQUEST
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !user || !isSupabaseConfigured) return;
    
    // Final validations
    const validation = validateLeaveDates(startDate, endDate);
    if (!validation.isValid) {
      setFormError(validation.error);
      return;
    }
    
    if (daysRequested <= 0) {
      setFormError('Requested duration must result in at least 1 working day (excluding weekends).');
      return;
    }

    // Check balances
    const currentBalance = balances[leaveTypeId];
    if (currentBalance && currentBalance.remaining < daysRequested) {
      const typeName = leaveTypes.find(t => t.id === leaveTypeId)?.name || 'Leave';
      if (!confirm(`Warning: Your request of ${daysRequested} days exceeds your provisional remaining balance for ${typeName} (${currentBalance.remaining} days). Do you still wish to submit?`)) {
        return;
      }
    }

    try {
      const { data, error: insertError } = await supabase
        .from('leave_requests')
        .insert([{
          employee_id: employee.id,
          user_id: user.id,
          leave_type_id: leaveTypeId,
          start_date: startDate,
          end_date: endDate,
          days_requested: daysRequested,
          reason,
          status: 'pending'
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Write Audit log
      const typeName = leaveTypes.find(t => t.id === leaveTypeId)?.name || 'Leave';
      await writeAuditLog(
        user.id,
        'LEAVE_REQUEST_CREATE',
        'leave_requests',
        data.id,
        `Submitted leave request for ${daysRequested} day(s) of ${typeName} (${startDate} to ${endDate})`
      );

      setApplyModalOpen(false);
      // Reset form
      setLeaveTypeId('');
      setStartDate('');
      setEndDate('');
      setDaysRequested(0);
      setReason('');
      fetchWorkspaceData();
      showToast('success', 'Leave request submitted successfully!');
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit leave request.');
    }
  };

  // CANCEL PENDING LEAVE REQUEST
  const handleCancelLeave = async (req: LeaveRequest) => {
    if (!user || !isSupabaseConfigured) return;
    if (!confirm(`Are you sure you want to cancel your pending leave request from ${req.start_date} to ${req.end_date}?`)) return;
    
    try {
      const { error: cancelError } = await supabase
        .rpc('rpc_cancel_leave_request', {
          p_request_id: req.id
        });

      if (cancelError) throw cancelError;

      fetchWorkspaceData();
      showToast('success', 'Leave request cancelled successfully!');
    } catch (err: any) {
      showToast('error', 'Failed to cancel request: ' + err.message);
    }
  };

  const displayName = employee?.full_name || (user?.full_name && !user.full_name.includes('@') ? user.full_name : user?.email ? user.email.split('@')[0] : 'User');
  const displayAvatar = displayName.charAt(0).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-surface border border-border rounded-xl shadow-2xs p-6">
        <h2 className="text-xl font-bold text-navy mb-1.5 flex items-center gap-2">
          <User className="text-primary w-5 h-5" />
          My Profile Workspace
        </h2>
        <p className="text-sm text-text-muted">
          Access your personal profiles, request leave, and track company announcements.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Column: HR Records, Balances, & Leave History */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Employee Record */}
          <div className="bg-surface border border-border rounded-xl shadow-2xs p-6">
            <h3 className="text-base font-bold text-navy border-b border-border pb-3.5 mb-5 flex items-center gap-2">
              <Briefcase className="text-primary w-5 h-5" />
              Contracted HR Employment Records
            </h3>

            {!employee ? (
              user.role === 'hr_admin' ? (
                <div className="py-8 text-center space-y-4">
                  <div className="w-12 h-12 bg-primary-tint border border-primary/20 rounded-full flex items-center justify-center mx-auto text-primary">
                    <Shield size={22} />
                  </div>
                  <div className="max-w-md mx-auto space-y-2">
                    <h4 className="font-bold text-navy text-sm">System Operations & Admin Account</h4>
                    <p className="text-xs text-text-muted leading-relaxed">
                      You are logged in as a master administrator/support operator. This account is intentionally unlinked from the employee directory roster.
                    </p>
                    <div className="pt-2 text-[10px] text-text-muted">
                      Use the sidebar menu to access the HR Management roster, configure organization policies, or review system audits.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center">
                  <p className="text-sm text-text-muted italic mb-4">No employee record linked to this system user account.</p>
                  <div className="p-4 bg-background border border-border rounded-lg text-xs text-text-muted text-left max-w-md mx-auto leading-relaxed">
                    <span className="font-bold text-navy block mb-1">Self-Service Access Disabled</span>
                    To access leave requests, banking info, and payroll details, an HR Administrator must link your employee record to your system email login in the HR Directory.
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-text-muted">
                  <div>
                    <span className="font-semibold text-navy block mb-1">Full Legal Name:</span>
                    <span className="text-text font-bold text-sm">{employee.full_name}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-navy block mb-1">Job Title / Position:</span>
                    <span className="text-text">{employee.position || 'Not Assigned'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-navy block mb-1">Department:</span>
                    <span className="text-text">{employee.department || 'Not Assigned'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-navy block mb-1">Employment Type:</span>
                    <span className="text-text capitalize">{employee.employment_type}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-navy block mb-1 flex items-center gap-1">
                      <Calendar size={13} className="text-primary" /> Start Date:
                    </span>
                    <span className="text-text font-mono">{employee.start_date || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-navy block mb-1 flex items-center gap-1">
                      <DollarSign size={13} className="text-primary" /> Gross Contract Salary:
                    </span>
                    <span className="text-text font-mono font-semibold">
                      {employee.gross_salary.toLocaleString()} {employee.currency}
                    </span>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h4 className="font-bold text-navy text-xs mb-3 flex items-center gap-1.5">
                    <CreditCard size={14} className="text-primary" /> Disbursal Accounts Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-text-muted">
                    <div>
                      <span className="font-semibold text-navy block mb-0.5">Bank:</span>
                      <span className="text-text">{employee.bank_name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-navy block mb-0.5">Account Number:</span>
                      <span className="text-text font-mono">{employee.account_number || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-navy block mb-0.5 flex items-center gap-1">
                        <Phone size={13} className="text-primary" /> Mobile Money Number:
                      </span>
                      <span className="text-text font-mono">{employee.mobile_money_number || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-navy block mb-0.5">National ID (NIN):</span>
                      <span className="text-text font-mono">{employee.national_id || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {employee.notes && (
                  <div className="border-t border-border pt-4 text-xs">
                    <span className="font-semibold text-navy block mb-1">Employee Notes</span>
                    <p className="p-3 bg-background border border-border rounded-lg text-text italic leading-relaxed">
                      {employee.notes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {employee && (
            <>
              {/* Leave Balances Grid */}
              <div className="bg-surface border border-border rounded-xl shadow-2xs p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <h3 className="font-bold text-navy text-sm flex items-center gap-2">
                    <Clock className="text-primary w-4.5 h-4.5" />
                    Provisional Leave Balances ({new Date().getFullYear()} Calendar Period)
                  </h3>
                  <button
                    onClick={() => { setFormError(null); setApplyModalOpen(true); }}
                    className="px-3 py-1.5 bg-primary text-white text-[11px] font-bold rounded-lg hover:bg-primary/95 transition-all shadow-md flex items-center gap-1"
                  >
                    <Plus size={12} /> Apply Leave
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  {leaveTypes.map((t) => {
                    const bal = balances[t.id] || { entitled: t.default_days, remaining: t.default_days };
                    return (
                      <div key={t.id} className="p-3.5 border border-border rounded-lg bg-background/50 flex flex-col justify-between">
                        <span className="font-bold text-navy block mb-1 truncate" title={t.name}>{t.name}</span>
                        <div className="mt-2 flex justify-between items-baseline gap-1">
                          <span className="text-xl font-bold font-mono text-primary">{bal.remaining}</span>
                          <span className="text-[10px] text-text-muted">/ {bal.entitled} default</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Leave Request History */}
              <div className="bg-surface border border-border rounded-xl shadow-2xs overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-background/25">
                  <h3 className="font-bold text-navy text-sm flex items-center gap-2">
                    <FileText className="text-primary w-4.5 h-4.5" /> Leave Request History
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm text-text-muted">
                    <thead className="bg-background/40 font-semibold text-navy text-xs uppercase tracking-wider border-b border-border">
                      <tr>
                        <th className="px-6 py-3">Leave Type</th>
                        <th className="px-6 py-3">Duration</th>
                        <th className="px-6 py-3">Working Days</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-xs">
                      {leaveHistory.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-6 text-center text-xs text-text-muted italic">
                            No leave requests filed yet.
                          </td>
                        </tr>
                      ) : (
                        leaveHistory.map((req) => (
                          <tr key={req.id} className="hover:bg-background/25 transition-colors">
                            <td className="px-6 py-3.5 font-bold text-navy">{req.leave_types?.name || 'Annual Leave'}</td>
                            <td className="px-6 py-3.5 font-mono text-text">
                              {req.start_date} to {req.end_date}
                            </td>
                            <td className="px-6 py-3.5 font-bold font-mono text-text">
                              {req.days_requested} Days
                            </td>
                            <td className="px-6 py-3.5">
                              <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border uppercase
                                ${req.status === 'pending' ? 'bg-warning-tint text-warning border-warning/20' : ''}
                                ${req.status === 'approved' ? 'bg-success-tint text-success border-success/20' : ''}
                                ${req.status === 'rejected' ? 'bg-danger-tint text-danger border-danger/20' : ''}
                                ${req.status === 'cancelled' ? 'bg-neutral-gray/10 text-text-muted border-border' : ''}
                              `}>
                                {req.status}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 text-right">
                              {req.status === 'pending' ? (
                                <button
                                  onClick={() => handleCancelLeave(req)}
                                  className="text-danger hover:text-danger/80 font-bold flex items-center justify-end gap-1 ml-auto"
                                  title="Cancel Request"
                                >
                                  <Trash2 size={13} /> Cancel
                                </button>
                              ) : req.approver_notes ? (
                                <span className="text-[10px] text-text-muted italic truncate block max-w-[120px]" title={req.approver_notes}>
                                  Approver: {req.approver_notes}
                                </span>
                              ) : (
                                <span className="text-text-muted text-[10px] italic">No notes</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sidebar Column: Announcements & System Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Announcements Feed Card */}
          <div className="bg-surface border border-border rounded-xl shadow-2xs p-6 space-y-4">
            <h3 className="font-bold text-navy text-sm flex items-center gap-2 border-b border-border pb-3">
              <Megaphone className="text-primary w-4.5 h-4.5" />
              Company Announcements
            </h3>

            <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
              {announcements.length === 0 ? (
                <p className="text-xs text-text-muted italic py-4 text-center">No active announcements.</p>
              ) : (
                announcements.map((ann) => (
                  <div key={ann.id} className="p-3 bg-background/50 border border-border rounded-lg space-y-1.5">
                    <h4 className="font-bold text-navy text-xs flex justify-between gap-2">
                      <span>{ann.title}</span>
                      <span className="text-[9px] font-normal text-text-muted font-mono whitespace-nowrap">
                        {new Date(ann.created_at).toLocaleDateString()}
                      </span>
                    </h4>
                    <p className="text-xs text-text-muted leading-relaxed whitespace-pre-line">{ann.body}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Profile Details Summary Card */}
          <div className="bg-surface border border-border rounded-xl shadow-2xs p-6 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-tint border border-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 text-primary font-bold text-2xl uppercase">
                {displayAvatar}
              </div>
              <h3 className="text-base font-bold text-navy">{displayName}</h3>
              <p className="text-[10px] text-text-muted mt-1 uppercase tracking-wider font-semibold bg-background px-2.5 py-0.5 rounded-full border w-max mx-auto select-none">
                {user.role}
              </p>
            </div>

            <div className="border-t border-border pt-4 space-y-3.5 text-xs text-text-muted">
              <div className="flex justify-between">
                <span className="font-semibold text-navy">System Login:</span>
                <span className="text-text font-mono">{user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-navy">Roster Link:</span>
                {employee ? (
                  <span className="text-success font-semibold flex items-center gap-0.5">
                    <CheckCircle size={11} /> Linked
                  </span>
                ) : (
                  <span className="text-text-muted italic">Unlinked</span>
                )}
              </div>
              {employee && (
                <>
                  <div className="flex justify-between">
                    <span className="font-semibold text-navy">Gender:</span>
                    <span className="text-text capitalize">{employee.gender || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-navy">Date of Birth:</span>
                    <span className="text-text font-mono">{employee.dob || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-navy">Personal Email:</span>
                    <span className="text-text font-mono">{employee.personal_email || '—'}</span>
                  </div>
                </>
              )}
            </div>

            {/* Set Account Password Box */}
            <div className="border-t border-border pt-4 space-y-3">
              <h4 className="font-bold text-navy text-[11px] uppercase tracking-wider">Set Portal Password</h4>
              <p className="text-[10px] text-text-muted leading-relaxed">
                Choose a new login password for future sessions:
              </p>
              <div className="space-y-2">
                <input
                  type="password"
                  id="workspaceNewPassword"
                  placeholder="New password (min 6 chars)"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:ring-1 focus:ring-primary focus:outline-none text-[11px] font-normal"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const passInput = document.getElementById('workspaceNewPassword') as HTMLInputElement;
                    const password = passInput?.value;
                    if (!password || password.length < 6) {
                      showToast('error', 'Password must be at least 6 characters.');
                      return;
                    }
                    try {
                      const { error } = await supabase.auth.updateUser({ password });
                      if (error) throw error;
                      showToast('success', 'Portal login password updated successfully!');
                      if (passInput) passInput.value = '';
                    } catch (err: any) {
                      showToast('error', err.message || 'Failed to update password.');
                    }
                  }}
                  className="w-full py-2 bg-primary text-white text-[11px] font-bold rounded-lg hover:bg-primary/95 transition-all shadow-xs text-center cursor-pointer"
                >
                  Save Password
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* LEAVE SUBMISSION MODAL */}
      {applyModalOpen && employee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="max-w-md w-full bg-surface border border-border rounded-xl shadow-2xl overflow-hidden m-4">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background/25">
              <h3 className="font-bold text-navy text-sm flex items-center gap-2">
                <Calendar size={17} className="text-primary" /> Apply for Leave
              </h3>
              <button
                onClick={() => setApplyModalOpen(false)}
                className="p-1 text-text-muted hover:text-text hover:bg-background rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="p-6 space-y-4">
              {formError && (
                <div className="p-3.5 bg-danger-tint border border-danger/25 rounded-lg text-danger text-xs font-semibold flex items-center gap-1.5">
                  <AlertCircle size={15} />
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1.5">Leave Type Policy</label>
                <select
                  required
                  value={leaveTypeId}
                  onChange={(e) => setLeaveTypeId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text"
                >
                  <option value="">-- Select Type --</option>
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.default_days} default days)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1.5">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1.5">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text"
                  />
                </div>
              </div>

              {daysRequested > 0 && (
                <div className="p-3 bg-primary-tint/25 border border-primary/20 rounded-lg text-xs text-navy font-semibold flex justify-between items-center">
                  <span>Computed Requested Duration:</span>
                  <span className="text-sm font-bold font-mono text-primary">{daysRequested} Working Day(s)</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1.5">Reason for Request</label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="State the reason for your leave request..."
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text font-normal"
                />
              </div>

              <div className="border-t border-border pt-4 flex gap-3 text-xs">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/95 transition-all shadow-md text-center"
                >
                  Submit Application
                </button>
                <button
                  type="button"
                  onClick={() => setApplyModalOpen(false)}
                  className="flex-1 py-2 border border-border hover:bg-background text-text font-bold rounded-lg transition-all text-center"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
