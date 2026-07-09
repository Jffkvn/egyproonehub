"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { countWorkingDays, validateLeaveDates } from '@/lib/utils/leave';
import { writeAuditLog } from '@/lib/audit/logger';
import { formatUGX } from '@/lib/payroll/calculations';
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
  Shield,
  Download,
  Upload
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
  
  // Public holidays list
  const [holidaysList, setHolidaysList] = useState<string[]>([]);

  // Payslip history
  const [myPayslips, setMyPayslips] = useState<any[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);

  // Attachments
  const [myAttachments, setMyAttachments] = useState<any[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

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

  const fetchMyAttachments = async () => {
    if (!employee || !isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('employee_attachments')
        .select('*')
        .eq('employee_id', employee.id)
        .order('uploaded_at', { ascending: false });
      if (!error) setMyAttachments(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadMyAttachment = async (file: File) => {
    if (!employee || !user || !isSupabaseConfigured) return;
    setUploadingDoc(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const storagePath = `${employee.id}/leave_support/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('employee-attachments')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('employee_attachments')
        .insert([{
          employee_id: employee.id,
          category: 'leave_support',
          file_name: file.name,
          storage_path: storagePath,
          mime_type: file.type,
          uploaded_by: user.id
        }]);

      if (dbError) throw dbError;

      showToast('success', 'Document uploaded successfully!');
      fetchMyAttachments();
      writeAuditLog(
        user.id,
        'EMPLOYEE_ATTACHMENT_UPLOAD',
        'employee_attachments',
        employee.id,
        `Uploaded leave support attachment: ${file.name}`
      );
    } catch (err: any) {
      console.error(err);
      showToast('error', err.message || 'Failed to upload document.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteMyAttachment = async (id: string, storagePath: string, fileName: string) => {
    if (!user || !isSupabaseConfigured) return;
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      const { error: storageError } = await supabase.storage
        .from('employee-attachments')
        .remove([storagePath]);
      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('employee_attachments')
        .delete()
        .eq('id', id);
      if (dbError) throw dbError;

      showToast('success', 'Document deleted successfully!');
      fetchMyAttachments();
      writeAuditLog(
        user.id,
        'EMPLOYEE_ATTACHMENT_DELETE',
        'employee_attachments',
        id,
        `Deleted attachment: ${fileName}`
      );
    } catch (err: any) {
      console.error(err);
      showToast('error', err.message || 'Failed to delete document.');
    }
  };

  const handleDownloadMyDoc = async (storagePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('employee-attachments')
        .download(storagePath);
      if (error) throw error;
      
      const blob = new Blob([data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Failed to download document.');
    }
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

      // 3. Fetch public holidays list
      const { data: holData } = await supabase
        .from('public_holidays')
        .select('holiday_date');
      setHolidaysList(holData?.map((h: any) => h.holiday_date) || []);

      // If no employee linked, we can skip fetching history, attachments, payroll, and computing balances
      if (!employee) {
        setLoading(false);
        return;
      }

      // 4. Fetch employee leave history
      const { data: lhData, error: lhError } = await supabase
        .from('leave_requests')
        .select('*, leave_types(name, code)')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false });
      
      if (lhError) throw lhError;
      const requests = (lhData || []) as LeaveRequest[];
      setLeaveHistory(requests);

      // 5. Fetch employee secure documents
      const { data: docData } = await supabase
        .from('employee_attachments')
        .select('*')
        .eq('employee_id', employee.id)
        .order('uploaded_at', { ascending: false });
      setMyAttachments(docData || []);

      // 6. Fetch employee finalized payslips
      const { data: payData } = await supabase
        .from('payroll_runs')
        .select('*, payroll_periods(name, start_date, end_date)')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false });
      setMyPayslips(payData || []);

      // 7. Compute provisional leave balances
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
        const days = countWorkingDays(startDate, endDate, holidaysList);
        setDaysRequested(days);
      }
    } else {
      setDaysRequested(0);
      setFormError(null);
    }
  }, [startDate, endDate, holidaysList]);

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

    // Check overlapping requests
    const hasOverlap = leaveHistory.some(req => {
      if (req.status === 'rejected' || req.status === 'cancelled') return false;
      const reqStart = new Date(req.start_date);
      const reqEnd = new Date(req.end_date);
      const newStart = new Date(startDate);
      const newEnd = new Date(endDate);
      return (newStart <= reqEnd && newEnd >= reqStart);
    });
    if (hasOverlap) {
      setFormError('Submit Block: You have an overlapping pending or approved leave request during this date range.');
      return;
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

              {/* PAYSLIP HISTORY CARD */}
              <div className="bg-surface border border-border rounded-xl shadow-2xs overflow-hidden mt-6">
                <div className="px-6 py-4 border-b border-border bg-background/25 flex justify-between items-center">
                  <h3 className="font-bold text-navy text-sm flex items-center gap-2">
                    <FileText className="text-primary w-5 h-5" />
                    My Salary Payslips
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm text-text-muted">
                    <thead className="bg-background/40 font-semibold text-navy text-xs uppercase tracking-wider border-b border-border">
                      <tr>
                        <th className="px-6 py-3">Period</th>
                        <th className="px-6 py-3 text-right">Gross Salary</th>
                        <th className="px-6 py-3 text-right">PAYE Tax</th>
                        <th className="px-6 py-3 text-right">NSSF (5%)</th>
                        <th className="px-6 py-3 text-right">Net Pay</th>
                        <th className="px-6 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-xs font-mono">
                      {myPayslips.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-6 text-center text-xs text-text-muted italic font-sans">
                            No finalized payslips available yet.
                          </td>
                        </tr>
                      ) : (
                        myPayslips.map((pay) => (
                          <tr key={pay.id} className="hover:bg-background/25 transition-colors">
                            <td className="px-6 py-4 font-sans font-bold text-navy">
                              {pay.payroll_periods?.name || 'Payroll Run'}
                            </td>
                            <td className="px-6 py-4 text-right text-text">{formatUGX(pay.gross_salary)}</td>
                            <td className="px-6 py-4 text-right text-danger font-semibold">-{formatUGX(pay.paye_amount)}</td>
                            <td className="px-6 py-4 text-right text-danger">-{formatUGX(pay.nssf_employee)}</td>
                            <td className="px-6 py-4 text-right text-primary font-bold">{formatUGX(pay.net_pay)}</td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => setSelectedPayslip(pay)}
                                className="px-2.5 py-1 bg-primary text-white text-[10px] font-bold rounded-md hover:bg-primary/95 transition-all shadow cursor-pointer font-sans"
                              >
                                Details
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MY SECURE ATTACHMENTS VAULT */}
              <div className="bg-surface border border-border rounded-xl shadow-2xs p-6 mt-6 space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-3.5">
                  <h3 className="text-base font-bold text-navy flex items-center gap-2">
                    <Shield className="text-primary w-5 h-5" />
                    My Supporting Documents & Attachments
                  </h3>
                </div>

                {/* Upload Form */}
                <div className="bg-background/25 border border-border rounded-lg p-4 space-y-3">
                  <h4 className="text-xs font-bold text-navy uppercase tracking-wider">Upload Support Document (e.g. Medical Cert)</h4>
                  <div className="flex flex-col sm:flex-row items-end gap-3">
                    <div className="flex-1 w-full">
                      <label className="block text-[9px] font-bold text-navy uppercase tracking-wider mb-1">Doc Category</label>
                      <div className="w-full px-2 py-1.5 border border-border rounded-lg text-xs bg-background text-text-muted select-none">
                        Leave Supporting Proof
                      </div>
                    </div>
                    <div className="flex-1 w-full">
                      <label className="block text-[9px] font-bold text-navy uppercase tracking-wider mb-1 font-sans">Choose File</label>
                      <input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleUploadMyAttachment(file);
                            e.target.value = '';
                          }
                        }}
                        className="w-full text-xs text-text-muted file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                      />
                    </div>
                  </div>
                  {uploadingDoc && (
                    <div className="text-[10px] text-primary italic font-bold flex items-center gap-1 animate-pulse">
                      <Clock size={12} /> Uploading file to secure vault...
                    </div>
                  )}
                </div>

                {/* Attachments List Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-background/25 text-navy font-bold">
                        <th className="px-4 py-2">Document Name</th>
                        <th className="px-4 py-2">Category</th>
                        <th className="px-4 py-2">Uploaded At</th>
                        <th className="px-4 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {myAttachments.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-4 text-center text-text-muted italic">
                            No documents stored in your vault.
                          </td>
                        </tr>
                      ) : (
                        myAttachments.map((doc) => (
                          <tr key={doc.id} className="hover:bg-background/10">
                            <td className="px-4 py-3 font-bold text-text truncate max-w-xs">{doc.file_name}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-primary-tint text-primary border border-primary/10">
                                {doc.category}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-text-muted">{new Date(doc.uploaded_at).toLocaleString()}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleDownloadMyDoc(doc.storage_path, doc.file_name)}
                                  className="p-1 text-primary hover:bg-primary-tint rounded-lg flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                                >
                                  <Download size={13} className="w-3.5 h-3.5" /> Download
                                </button>
                                <button
                                  onClick={() => handleDeleteMyAttachment(doc.id, doc.storage_path, doc.file_name)}
                                  className="p-1 text-danger hover:bg-danger-tint rounded-lg cursor-pointer"
                                >
                                  <Trash2 size={13} className="w-3.5 h-3.5" />
                                </button>
                              </div>
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

      {/* PAYSLIP DETAIL MODAL */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="max-w-xl w-full bg-surface border border-border rounded-xl shadow-2xl overflow-hidden m-4">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background/25">
              <h3 className="font-bold text-navy text-sm flex items-center gap-2">
                <FileText size={17} className="text-primary" /> Payslip Receipt Preview
              </h3>
              <button
                onClick={() => setSelectedPayslip(null)}
                className="p-1 text-text-muted hover:text-text hover:bg-background rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Receipt Header */}
              <div className="text-center space-y-1">
                <h2 className="text-lg font-extrabold text-navy tracking-wider">EGYPRO UGANDA LIMITED</h2>
                <p className="text-[10px] text-text-muted uppercase font-semibold">Kampala, Uganda • Payslip Receipt Statement</p>
                <div className="inline-block px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold mt-2">
                  Period: {selectedPayslip.payroll_periods?.name}
                </div>
              </div>

              {/* Employee Summary Info */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-background/25 border border-border rounded-lg p-4 font-sans">
                <div>
                  <span className="text-[10px] text-text-muted block uppercase font-bold">Employee Name</span>
                  <span className="font-bold text-navy text-sm">{employee?.full_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block uppercase font-bold">Position</span>
                  <span className="text-text">{employee?.position || 'Staff'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block uppercase font-bold">Department</span>
                  <span className="text-text">{employee?.department || 'Operations'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block uppercase font-bold">Tax Category</span>
                  <span className="text-text uppercase font-mono">{employee?.tax_category || 'local'}</span>
                </div>
              </div>

              {/* Salary Breakdown Details */}
              <div className="space-y-3 font-sans">
                <h4 className="text-xs font-bold text-navy uppercase tracking-wider border-b border-border pb-1">Earnings Breakdown</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Basic Contracted Gross Salary</span>
                    <span className="font-mono text-text">{formatUGX(selectedPayslip.gross_salary)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-border pt-1.5">
                    <span className="text-navy">Total Gross Earnings</span>
                    <span className="font-mono text-navy">{formatUGX(selectedPayslip.gross_salary)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 font-sans">
                <h4 className="text-xs font-bold text-navy uppercase tracking-wider border-b border-border pb-1">Statutory & Other Deductions</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-text-muted">PAYE Income Tax Deduction (Statutory)</span>
                    <span className="font-mono text-danger font-semibold">-{formatUGX(selectedPayslip.paye_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">NSSF Provident Fund (Employee 5%)</span>
                    <span className="font-mono text-danger font-semibold">-{formatUGX(selectedPayslip.nssf_employee)}</span>
                  </div>
                  {Number(selectedPayslip.leave_deduction_amount) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Unpaid Leave Deductions</span>
                      <span className="font-mono text-danger">-{formatUGX(selectedPayslip.leave_deduction_amount)}</span>
                    </div>
                  )}
                  {Number(selectedPayslip.other_deductions) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Other Adjustments / Deductions</span>
                      <span className="font-mono text-danger">-{formatUGX(selectedPayslip.other_deductions)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold border-t border-border pt-1.5">
                    <span className="text-navy">Total Deductions</span>
                    <span className="font-mono text-danger">
                      -{formatUGX(
                        Number(selectedPayslip.paye_amount) +
                        Number(selectedPayslip.nssf_employee) +
                        Number(selectedPayslip.leave_deduction_amount) +
                        Number(selectedPayslip.other_deductions)
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Net Pay Hero Summary */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 text-center font-sans">
                <span className="text-[10px] text-primary block uppercase font-bold tracking-wider">Net Take-Home Pay</span>
                <span className="text-2xl font-extrabold text-primary font-mono block mt-1">{formatUGX(selectedPayslip.net_pay)}</span>
                <span className="text-[9px] text-text-muted block mt-1 font-semibold uppercase">Transferred to registered bank details / MM account</span>
              </div>

              {/* Employer Contributions Info */}
              <div className="border-t border-border pt-4 text-[10px] text-text-muted space-y-1 bg-background/10 p-3 rounded-lg font-sans">
                <span className="font-bold text-navy uppercase block mb-1">Organization Contributions Info (Non-deducted)</span>
                <div className="flex justify-between">
                  <span>NSSF Employer Contribution (10%)</span>
                  <span className="font-mono">{formatUGX(selectedPayslip.nssf_employer)}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-border p-4 bg-background/25 flex gap-3 text-xs font-sans">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-navy text-white font-bold rounded-lg transition-all shadow-md text-center cursor-pointer"
              >
                Print Payslip
              </button>
              <button
                onClick={() => setSelectedPayslip(null)}
                className="flex-1 py-2 border border-border hover:bg-background text-text font-bold rounded-lg transition-all text-center cursor-pointer"
              >
                Close
              </button>
            </div>
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
