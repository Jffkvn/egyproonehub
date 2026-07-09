"use client";

import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Employee, User } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { writeAuditLog } from '@/lib/audit/logger';
import {
  Users,
  UserPlus,
  Link as LinkIcon,
  Search,
  CheckCircle,
  Plus,
  X,
  Edit2,
  Eye,
  Trash2,
  FileText,
  UserMinus,
  Calendar,
  Mail,
  Clock
} from 'lucide-react';

export default function HRManagement() {
  const { user: currentUser } = useAuth();
  
  // Data lists
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [unlinkedUsers, setUnlinkedUsers] = useState<User[]>([]);
  
  // UI Loading states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Toast Notification state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterPosition, setFilterPosition] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLinkState, setFilterLinkState] = useState('all');

  // Modals visibility
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);

  // Selected records
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Leave Requests state
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [approverNotes, setApproverNotes] = useState('');
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>('approved');

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [dob, setDob] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');
  const [employmentType, setEmploymentType] = useState<'permanent' | 'contract' | 'casual' | 'intern'>('permanent');
  const [grossSalary, setGrossSalary] = useState(0);
  const [taxCategory, setTaxCategory] = useState<'standard' | 'special' | 'exempt'>('standard');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [mobileMoneyNumber, setMobileMoneyNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [empStatus, setEmpStatus] = useState<'active' | 'inactive'>('active');
  const [startDate, setStartDate] = useState('');

  const [linkTargetUserId, setLinkTargetUserId] = useState('');
  const [invitingEmployeeId, setInvitingEmployeeId] = useState<string | null>(null);

  const fetchHRData = async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      // 1. Fetch employees
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('*')
        .order('full_name', { ascending: true });

      if (empError) throw empError;
      setEmployees((empData || []) as Employee[]);

      // 2. Fetch active users profiles
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (userError) throw userError;
      setUsers((userData || []) as User[]);

      // 3. Compute unlinked users
      const linkedUserIds = new Set(
        (empData || []).filter((e: any) => e.user_id !== null).map((e: any) => e.user_id)
      );
      const unlinked = (userData || []).filter((u: any) => !linkedUserIds.has(u.id));
      setUnlinkedUsers(unlinked as User[]);

      // 4. Fetch Leave Requests
      const { data: reqData, error: reqError } = await supabase
        .from('leave_requests')
        .select('*, employees(full_name, position, department), leave_types(name)')
        .order('created_at', { ascending: false });

      if (reqError) throw reqError;
      setLeaveRequests(reqData || []);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading employee records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHRData();
  }, []);

  // Set form values for edit modal
  const openEditModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    setFullName(emp.full_name);
    setEmail(emp.email || '');
    setPersonalEmail(emp.personal_email || '');
    setPhone(emp.phone || '');
    setNationalId(emp.national_id || '');
    setGender(emp.gender || 'male');
    setDob(emp.dob || '');
    setPosition(emp.position || '');
    setDepartment(emp.department || '');
    setEmploymentType(emp.employment_type);
    setGrossSalary(emp.gross_salary);
    setTaxCategory(emp.tax_category || 'standard');
    setBankName(emp.bank_name || '');
    setAccountNumber(emp.account_number || '');
    setMobileMoneyNumber(emp.mobile_money_number || '');
    setNotes(emp.notes || '');
    setEmpStatus(emp.status);
    setStartDate(emp.start_date || '');
    setEditModalOpen(true);
  };

  const openDetailModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    setDetailModalOpen(true);
  };

  const openLinkModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    setLinkTargetUserId('');
    setLinkModalOpen(true);
  };

  // CREATE EMPLOYEE
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !isSupabaseConfigured) return;
    try {
      const { data, error: insertError } = await supabase
        .from('employees')
        .insert([{
          full_name: fullName,
          email: email || null,
          personal_email: personalEmail || null,
          phone: phone || null,
          national_id: nationalId || null,
          gender,
          dob: dob || null,
          position: position || null,
          department: department || null,
          employment_type: employmentType,
          gross_salary: grossSalary,
          tax_category: taxCategory,
          bank_name: bankName || null,
          account_number: accountNumber || null,
          mobile_money_number: mobileMoneyNumber || null,
          notes: notes || null,
          status: 'active',
          start_date: startDate || null,
          created_by: currentUser.id,
          updated_by: currentUser.id
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Write Audit log
      await writeAuditLog(
        currentUser.id,
        'EMPLOYEE_CREATE',
        'employees',
        data.id,
        `Created employee profile for ${fullName} (${position || 'Unassigned'})`,
        { new: data }
      );

      // Reset form & state
      setCreateModalOpen(false);
      resetForm();
      fetchHRData();
      showToast('success', `Employee profile for ${fullName} registered successfully!`);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to register employee');
    }
  };

  // EDIT EMPLOYEE
  const handleEditEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !currentUser || !isSupabaseConfigured) return;
    try {
      const oldVal = { ...selectedEmployee };
      const { data, error: updateError } = await supabase
        .from('employees')
        .update({
          full_name: fullName,
          email: email || null,
          personal_email: personalEmail || null,
          phone: phone || null,
          national_id: nationalId || null,
          gender,
          dob: dob || null,
          position: position || null,
          department: department || null,
          employment_type: employmentType,
          gross_salary: grossSalary,
          tax_category: taxCategory,
          bank_name: bankName || null,
          account_number: accountNumber || null,
          mobile_money_number: mobileMoneyNumber || null,
          notes: notes || null,
          status: empStatus,
          start_date: startDate || null,
          updated_by: currentUser.id
        })
        .eq('id', selectedEmployee.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Write Audit log
      await writeAuditLog(
        currentUser.id,
        'EMPLOYEE_UPDATE',
        'employees',
        selectedEmployee.id,
        `Updated employee details for ${fullName}`,
        { old: oldVal, new: data }
      );

      setEditModalOpen(false);
      resetForm();
      fetchHRData();
      showToast('success', `Employee details for ${fullName} updated successfully!`);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update employee details');
    }
  };

  // LINK ACCOUNT
  const handleLinkAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !linkTargetUserId || !currentUser || !isSupabaseConfigured) return;
    try {
      const targetUser = users.find((u) => u.id === linkTargetUserId);
      const { data, error: linkError } = await supabase
        .from('employees')
        .update({ user_id: linkTargetUserId, updated_by: currentUser.id })
        .eq('id', selectedEmployee.id)
        .select()
        .single();

      if (linkError) throw linkError;

      await writeAuditLog(
        currentUser.id,
        'EMPLOYEE_LINK',
        'employees',
        selectedEmployee.id,
        `Linked employee ${selectedEmployee.full_name} to user account ${targetUser?.full_name || linkTargetUserId}`
      );

      setLinkModalOpen(false);
      setSelectedEmployee(null);
      fetchHRData();
      showToast('success', `Linked employee ${selectedEmployee.full_name} successfully!`);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to link account');
    }
  };

  // UNLINK ACCOUNT
  const handleUnlinkAccount = async (emp: Employee) => {
    if (!currentUser || !isSupabaseConfigured) return;
    if (!confirm(`Are you sure you want to revoke system portal access for ${emp.full_name}?`)) return;
    try {
      const { error: unlinkError } = await supabase
        .from('employees')
        .update({ user_id: null, updated_by: currentUser.id })
        .eq('id', emp.id);

      if (unlinkError) throw unlinkError;

      await writeAuditLog(
        currentUser.id,
        'EMPLOYEE_UNLINK',
        'employees',
        emp.id,
        `Unlinked system user account from employee ${emp.full_name}`
      );

      fetchHRData();
      showToast('success', `Revoked system portal access for ${emp.full_name}.`);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to unlink account');
    }
  };

  // SEND SECURE PORTAL INVITE
  const handleSendInvite = async (emp: Employee) => {
    if (!emp.email) {
      showToast('error', 'Employee has no email address on file.');
      return;
    }
    
    setInvitingEmployeeId(emp.id);
    try {
      // Get current auth session to extract token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated: please sign in again.');
      }

      const response = await fetch('/api/invite-employee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          employeeId: emp.id,
          email: emp.email,
          redirectTo: `${window.location.origin}/home`
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to send invite.');
      }

      showToast('success', resData.is_resend 
        ? `Portal invitation email successfully resent to ${emp.email}!`
        : `Portal invitation email successfully sent to ${emp.email}!`
      );
      
      fetchHRData();
    } catch (err: any) {
      showToast('error', 'Error sending invite: ' + err.message);
    } finally {
      setInvitingEmployeeId(null);
    }
  };

  // LEAVE APPROVAL REVIEW SUBMISSION
  const handleReviewLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !currentUser || !isSupabaseConfigured) return;
    try {
      const { error: reviewError } = await supabase
        .rpc('rpc_review_leave_request', {
          p_request_id: selectedRequest.id,
          p_decision: reviewAction,
          p_approver_notes: approverNotes || null
        });

      if (reviewError) throw reviewError;

      setReviewModalOpen(false);
      setSelectedRequest(null);
      setApproverNotes('');
      fetchHRData();
      showToast('success', `Leave request successfully ${reviewAction}ed!`);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to submit leave request review');
    }
  };

  const resetForm = () => {
    setSelectedEmployee(null);
    setFullName('');
    setEmail('');
    setPersonalEmail('');
    setPhone('');
    setNationalId('');
    setGender('male');
    setDob('');
    setPosition('');
    setDepartment('');
    setEmploymentType('permanent');
    setGrossSalary(0);
    setTaxCategory('standard');
    setBankName('');
    setAccountNumber('');
    setMobileMoneyNumber('');
    setNotes('');
    setStartDate('');
  };

  // Compute filters
  const departments = Array.from(new Set(employees.filter(e => e.department).map(e => e.department)));
  const positions = Array.from(new Set(employees.filter(e => e.position).map(e => e.position)));

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (emp.personal_email && emp.personal_email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDept = filterDepartment === 'all' || emp.department === filterDepartment;
    const matchesPos = filterPosition === 'all' || emp.position === filterPosition;
    const matchesType = filterType === 'all' || emp.employment_type === filterType;
    const matchesStatus = filterStatus === 'all' || emp.status === filterStatus;
    
    let matchesLink = true;
    if (filterLinkState === 'linked') matchesLink = emp.user_id !== null;
    else if (filterLinkState === 'unlinked') matchesLink = emp.user_id === null;

    return matchesSearch && matchesDept && matchesPos && matchesType && matchesStatus && matchesLink;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-surface border border-border rounded-xl shadow-2xs p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy mb-1.5 flex items-center gap-2">
            <Users className="text-primary w-5 h-5" />
            HR Employee Directory
          </h2>
          <p className="text-sm text-text-muted">
            Manage legal payroll contracts, record details, and audit linked portal permissions.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setCreateModalOpen(true); }}
          className="self-start sm:self-center px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-lg shadow hover:bg-primary/95 transition-all flex items-center gap-2"
        >
          <Plus size={15} />
          Add Employee Profile
        </button>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-surface border border-border rounded-xl shadow-2xs p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="col-span-1 sm:col-span-2 relative">
          <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Search Directory</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text transition-all"
            />
            <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-text-muted" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Department</label>
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="w-full px-2 py-1.5 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-background text-text"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept!}>{dept}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Position</label>
          <select
            value={filterPosition}
            onChange={(e) => setFilterPosition(e.target.value)}
            className="w-full px-2 py-1.5 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-background text-text"
          >
            <option value="all">All Positions</option>
            {positions.map((pos) => (
              <option key={pos} value={pos!}>{pos}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Emp Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full px-2 py-1.5 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-background text-text"
          >
            <option value="all">All Types</option>
            <option value="permanent">Permanent</option>
            <option value="contract">Contract</option>
            <option value="casual">Casual</option>
            <option value="intern">Intern</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Portal Account</label>
          <select
            value={filterLinkState}
            onChange={(e) => setFilterLinkState(e.target.value)}
            className="w-full px-2 py-1.5 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-background text-text"
          >
            <option value="all">All States</option>
            <option value="linked">Linked</option>
            <option value="unlinked">Unlinked</option>
          </select>
        </div>
      </div>

      {/* ROSTER TABLE */}
      {loading ? (
        <div className="py-16 text-center bg-surface border border-border rounded-xl shadow-2xs">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-text-muted font-medium">Fetching roster...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-danger-tint border border-danger/20 rounded-xl text-danger text-xs font-semibold">
          {error}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-background/25">
            <h3 className="font-bold text-navy text-sm">Roster Directory Listing ({filteredEmployees.length})</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-text-muted">
              <thead className="bg-background/40 font-semibold text-navy text-xs uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="px-6 py-3.5">Employee Name</th>
                  <th className="px-6 py-3.5">Email & Phone</th>
                  <th className="px-6 py-3.5">Work Details</th>
                  <th className="px-6 py-3.5">User Link</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-xs text-text-muted italic">
                      No matching employee records found.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-background/25 transition-colors">
                      <td className="px-6 py-4 font-bold text-navy">
                        <div>{emp.full_name}</div>
                        <div className="text-[10px] text-text-muted font-normal mt-0.5">{emp.position || 'No Position assigned'}</div>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <div>Work: {emp.email || '—'}</div>
                        <div className="text-text-muted">Personal: {emp.personal_email || '—'}</div>
                        <div className="text-text-muted font-mono">{emp.phone || '—'}</div>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <div className="font-semibold text-text">{emp.department || '—'}</div>
                        <div className="capitalize">{emp.employment_type}</div>
                        <div className="text-text-muted font-mono">{emp.gross_salary.toLocaleString()} UGX ({emp.tax_category})</div>
                      </td>
                      <td className="px-6 py-4">
                        {emp.user_id ? (
                          <div className="space-y-1">
                            <span className="flex items-center gap-1 text-[10px] font-bold text-success bg-success-tint border border-success/20 px-2 py-0.5 rounded-full w-max">
                              <CheckCircle size={10} /> Portal Active
                            </span>
                            <button
                              onClick={() => handleUnlinkAccount(emp)}
                              className="text-[10px] text-danger hover:underline block font-semibold text-left"
                            >
                              Revoke Link
                            </button>
                          </div>
                        ) : emp.invite_sent_at ? (
                          <div className="space-y-1">
                            <span className="flex items-center gap-1 text-[10px] font-bold text-warning bg-warning-tint border border-warning/20 px-2 py-0.5 rounded-full w-max">
                              <Clock size={10} /> Invite Sent
                            </span>
                            <div className="flex flex-col gap-0.5 text-[10px]">
                              <button
                                disabled={invitingEmployeeId === emp.id}
                                onClick={() => handleSendInvite(emp)}
                                className="text-primary hover:underline font-semibold disabled:opacity-50 text-left"
                              >
                                {invitingEmployeeId === emp.id ? 'Resending...' : 'Resend Invite'}
                              </button>
                              <button
                                onClick={() => openLinkModal(emp)}
                                className="text-navy hover:underline font-semibold text-left"
                              >
                                Link Account
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <span className="flex items-center gap-1 text-[10px] font-bold text-text-muted bg-neutral-gray/10 border border-border px-2 py-0.5 rounded-full w-max">
                              <X size={10} /> No Portal Access
                            </span>
                            <button
                              disabled={invitingEmployeeId === emp.id}
                              onClick={() => handleSendInvite(emp)}
                              className="flex items-center gap-1 text-[10px] font-bold text-navy hover:text-primary bg-background border border-border hover:border-primary/25 px-2 py-1 rounded-md transition-all disabled:opacity-50"
                            >
                              <Mail size={10} /> {invitingEmployeeId === emp.id ? 'Sending...' : 'Send Invite'}
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border uppercase
                          ${emp.status === 'active' ? 'bg-success-tint text-success border-success/20' : 'bg-neutral-gray/10 text-text-muted border-border'}
                        `}>
                          {emp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openDetailModal(emp)}
                            className="p-1 text-text-muted hover:text-navy hover:bg-background rounded"
                            title="View Employee Dossier"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => openEditModal(emp)}
                            className="p-1 text-text-muted hover:text-primary hover:bg-background rounded"
                            title="Edit Profile"
                          >
                            <Edit2 size={16} />
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
      )}

      {/* CREATE EMPLOYEE MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="max-w-2xl w-full bg-surface border border-border rounded-xl shadow-2xl overflow-hidden m-4">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background/25">
              <h3 className="font-bold text-navy text-sm flex items-center gap-2">
                <UserPlus size={17} className="text-primary" /> Register Employee Profile
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 text-text-muted hover:text-text hover:bg-background rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Personal Section */}
                <div className="space-y-3 sm:col-span-2">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider pb-1 border-b border-border">Personal Details</h4>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text"
                    placeholder="E.g. Sarah Namono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">National ID / NIN</label>
                  <input
                    type="text"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    className="w-full px-3 py-1.5 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text font-mono"
                    placeholder="E.g. CM890..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full px-2 py-1.5 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-background text-text"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full px-3 py-1 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Personal Email</label>
                  <input
                    type="email"
                    value={personalEmail}
                    onChange={(e) => setPersonalEmail(e.target.value)}
                    className="w-full px-3 py-1.5 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text"
                    placeholder="sarah.personal@gmail.com"
                  />
                </div>

                {/* Job details */}
                <div className="space-y-3 sm:col-span-2 pt-2">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider pb-1 border-b border-border">Employment & Work</h4>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Work Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-1.5 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text"
                    placeholder="sarah@egypro.com"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-1.5 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text font-mono"
                    placeholder="+25677..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Position</label>
                    <input
                      type="text"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="w-full px-3 py-1.5 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text"
                      placeholder="E.g. Civil Engineer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Department</label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3 py-1.5 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text"
                      placeholder="E.g. Operations"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Employment Type</label>
                    <select
                      value={employmentType}
                      onChange={(e) => setEmploymentType(e.target.value as any)}
                      className="w-full px-2 py-1.5 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-background text-text"
                    >
                      <option value="permanent">Permanent</option>
                      <option value="contract">Contract</option>
                      <option value="casual">Casual</option>
                      <option value="intern">Intern</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-1 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text"
                    />
                  </div>
                </div>

                {/* Salary details */}
                <div className="space-y-3 sm:col-span-2 pt-2">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider pb-1 border-b border-border">Gross Payroll & Accounts</h4>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Gross Salary (UGX)</label>
                    <input
                      type="number"
                      required
                      value={grossSalary}
                      onChange={(e) => setGrossSalary(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Tax Category</label>
                    <select
                      value={taxCategory}
                      onChange={(e) => setTaxCategory(e.target.value as any)}
                      className="w-full px-2 py-1.5 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-background text-text"
                    >
                      <option value="standard">Standard Tax</option>
                      <option value="special">Special Rate</option>
                      <option value="exempt">Tax Exempt</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text"
                    placeholder="Stanbic Bank"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Bank Account No</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full px-3 py-1.5 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Mobile Money Number</label>
                    <input
                      type="text"
                      value={mobileMoneyNumber}
                      onChange={(e) => setMobileMoneyNumber(e.target.value)}
                      className="w-full px-3 py-1.5 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text font-mono"
                      placeholder="+25677..."
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Notes / File references</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-1.5 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text"
                    placeholder="Add special notes..."
                  />
                </div>
              </div>

              <div className="border-t border-border pt-4 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/95 transition-all shadow-md text-center"
                >
                  Create Profile
                </button>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="flex-1 py-2.5 border border-border hover:bg-background text-text text-xs font-bold rounded-lg transition-all text-center"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EMPLOYEE MODAL */}
      {editModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="max-w-2xl w-full bg-surface border border-border rounded-xl shadow-2xl overflow-hidden m-4">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background/25">
              <h3 className="font-bold text-navy text-sm flex items-center gap-2">
                <Edit2 size={16} className="text-primary" /> Edit Employee Dossier
              </h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1 text-text-muted hover:text-text hover:bg-background rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditEmployee} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Status Toggle */}
                <div className="sm:col-span-2 flex justify-between items-center p-3 border border-border rounded-lg bg-background/50">
                  <div>
                    <span className="text-xs font-bold text-navy block">Employment Roster Status</span>
                    <span className="text-[10px] text-text-muted">Setting to inactive blocks self-service access</span>
                  </div>
                  <select
                    value={empStatus}
                    onChange={(e) => setEmpStatus(e.target.value as any)}
                    className="px-2 py-1.5 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-background text-text"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="space-y-3 sm:col-span-2">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider pb-1 border-b border-border">Personal Details</h4>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">National ID / NIN</label>
                  <input
                    type="text"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    className="w-full px-3 py-1.5 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full px-2 py-1.5 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-background text-text"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full px-3 py-1 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Personal Email</label>
                  <input
                    type="email"
                    value={personalEmail}
                    onChange={(e) => setPersonalEmail(e.target.value)}
                    className="w-full px-3 py-1.5 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text"
                  />
                </div>

                <div className="space-y-3 sm:col-span-2 pt-2">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider pb-1 border-b border-border">Employment Details</h4>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Work Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-1.5 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-1.5 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Position</label>
                    <input
                      type="text"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="w-full px-3 py-1.5 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Department</label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3 py-1.5 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Employment Type</label>
                    <select
                      value={employmentType}
                      onChange={(e) => setEmploymentType(e.target.value as any)}
                      className="w-full px-2 py-1.5 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-background text-text"
                    >
                      <option value="permanent">Permanent</option>
                      <option value="contract">Contract</option>
                      <option value="casual">Casual</option>
                      <option value="intern">Intern</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-1 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text"
                    />
                  </div>
                </div>

                <div className="space-y-3 sm:col-span-2 pt-2">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider pb-1 border-b border-border">Gross Payroll & Accounts</h4>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Gross Salary (UGX)</label>
                    <input
                      type="number"
                      required
                      value={grossSalary}
                      onChange={(e) => setGrossSalary(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Tax Category</label>
                    <select
                      value={taxCategory}
                      onChange={(e) => setTaxCategory(e.target.value as any)}
                      className="w-full px-2 py-1.5 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-background text-text"
                    >
                      <option value="standard">Standard Tax</option>
                      <option value="special">Special Rate</option>
                      <option value="exempt">Tax Exempt</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Bank Account No</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full px-3 py-1.5 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Mobile Money Number</label>
                    <input
                      type="text"
                      value={mobileMoneyNumber}
                      onChange={(e) => setMobileMoneyNumber(e.target.value)}
                      className="w-full px-3 py-1.5 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text font-mono"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Notes</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-1.5 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text"
                  />
                </div>
              </div>

              <div className="border-t border-border pt-4 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/95 transition-all shadow-md text-center"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="flex-1 py-2.5 border border-border hover:bg-background text-text text-xs font-bold rounded-lg transition-all text-center"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {detailModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="max-w-xl w-full bg-surface border border-border rounded-xl shadow-2xl overflow-hidden m-4">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background/25">
              <h3 className="font-bold text-navy text-sm flex items-center gap-2">
                <FileText size={17} className="text-primary" /> Employee Dossier Summary
              </h3>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-1 text-text-muted hover:text-text hover:bg-background rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 text-sm text-text-muted max-h-[75vh] overflow-y-auto">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-primary-tint border border-primary/20 text-primary text-xl font-bold flex items-center justify-center rounded-full uppercase">
                  {selectedEmployee.full_name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-base font-bold text-navy">{selectedEmployee.full_name}</h4>
                  <p className="text-xs text-text-muted">{selectedEmployee.position || 'No Position assigned'} • {selectedEmployee.department || 'No Dept Assigned'}</p>
                </div>
              </div>

              <div className="border-t border-border pt-4 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-bold text-navy uppercase tracking-wider block mb-0.5">Work Email</span>
                  <span className="text-text">{selectedEmployee.email || '—'}</span>
                </div>
                <div>
                  <span className="font-bold text-navy uppercase tracking-wider block mb-0.5">Personal Email</span>
                  <span className="text-text">{selectedEmployee.personal_email || '—'}</span>
                </div>
                <div>
                  <span className="font-bold text-navy uppercase tracking-wider block mb-0.5">Phone Number</span>
                  <span className="text-text font-mono">{selectedEmployee.phone || '—'}</span>
                </div>
                <div>
                  <span className="font-bold text-navy uppercase tracking-wider block mb-0.5">National ID / NIN</span>
                  <span className="text-text font-mono">{selectedEmployee.national_id || '—'}</span>
                </div>
                <div>
                  <span className="font-bold text-navy uppercase tracking-wider block mb-0.5">Gender</span>
                  <span className="text-text capitalize">{selectedEmployee.gender || '—'}</span>
                </div>
                <div>
                  <span className="font-bold text-navy uppercase tracking-wider block mb-0.5">Date of Birth</span>
                  <span className="text-text font-mono">{selectedEmployee.dob || '—'}</span>
                </div>
                <div>
                  <span className="font-bold text-navy uppercase tracking-wider block mb-0.5">Employment Type</span>
                  <span className="text-text capitalize">{selectedEmployee.employment_type}</span>
                </div>
                <div>
                  <span className="font-bold text-navy uppercase tracking-wider block mb-0.5">Start Date</span>
                  <span className="text-text font-mono">{selectedEmployee.start_date || '—'}</span>
                </div>
              </div>

              <div className="border-t border-border pt-4 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-bold text-navy uppercase tracking-wider block mb-0.5">Gross Monthly Salary</span>
                  <span className="text-text font-mono font-semibold">{selectedEmployee.gross_salary.toLocaleString()} UGX</span>
                </div>
                <div>
                  <span className="font-bold text-navy uppercase tracking-wider block mb-0.5">Tax Category</span>
                  <span className="text-text capitalize">{selectedEmployee.tax_category || 'standard'}</span>
                </div>
                <div>
                  <span className="font-bold text-navy uppercase tracking-wider block mb-0.5">Bank Account Details</span>
                  <span className="text-text">{selectedEmployee.bank_name || '—'} / Account: {selectedEmployee.account_number || '—'}</span>
                </div>
                <div>
                  <span className="font-bold text-navy uppercase tracking-wider block mb-0.5">Mobile Money Number</span>
                  <span className="text-text font-mono">{selectedEmployee.mobile_money_number || '—'}</span>
                </div>
              </div>

              {selectedEmployee.notes && (
                <div className="border-t border-border pt-4 text-xs">
                  <span className="font-bold text-navy uppercase tracking-wider block mb-1">Administrative Notes</span>
                  <p className="p-3 bg-background border border-border rounded-lg text-text italic leading-relaxed">
                    {selectedEmployee.notes}
                  </p>
                </div>
              )}

              <div className="border-t border-border pt-4 flex gap-3 text-xs">
                <div className="flex-1">
                  <span className="font-bold text-navy uppercase tracking-wider block mb-0.5">Roster Profile Status</span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase
                    ${selectedEmployee.status === 'active' ? 'bg-success-tint text-success border-success/20' : 'bg-neutral-gray/10 text-text-muted border-border'}
                  `}>
                    {selectedEmployee.status}
                  </span>
                </div>

                <div className="flex-1 text-right">
                  <span className="font-bold text-navy uppercase tracking-wider block mb-0.5">Portal Linking Status</span>
                  {selectedEmployee.user_id ? (
                    <span className="text-[10px] font-bold text-success bg-success-tint border border-success/20 px-2 py-0.5 rounded-full">
                      Portal Active
                    </span>
                  ) : selectedEmployee.invite_sent_at ? (
                    <span className="text-[10px] font-bold text-warning bg-warning-tint border border-warning/20 px-2 py-0.5 rounded-full">
                      Invite Sent (Pending)
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-text-muted bg-neutral-gray/10 border border-border px-2 py-0.5 rounded-full">
                      No Portal Access
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LINK USER MODAL */}
      {linkModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="max-w-md w-full bg-surface border border-border rounded-xl shadow-2xl overflow-hidden m-4">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background/25">
              <h3 className="font-bold text-navy text-sm flex items-center gap-2">
                <LinkIcon size={17} className="text-primary" /> Link User Profile Account
              </h3>
              <button
                onClick={() => setLinkModalOpen(false)}
                className="p-1 text-text-muted hover:text-text hover:bg-background rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleLinkAccount} className="p-6 space-y-4">
              <div>
                <p className="text-xs text-text-muted mb-4 leading-relaxed">
                  Link employee <strong className="text-navy">{selectedEmployee.full_name}</strong> to an active system profile account to enable self-service dashboard options.
                </p>
                <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1.5">Select Eligible User Profile</label>
                <select
                  required
                  value={linkTargetUserId}
                  onChange={(e) => setLinkTargetUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text"
                >
                  <option value="">-- Choose User Profile --</option>
                  {unlinkedUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.email} - role: {u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-t border-border pt-4 flex gap-3 text-xs">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/95 transition-all shadow-md text-center"
                >
                  Link Account
                </button>
                <button
                  type="button"
                  onClick={() => setLinkModalOpen(false)}
                  className="flex-1 py-2 border border-border hover:bg-background text-text font-bold rounded-lg transition-all text-center"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* LEAVE REQUESTS APPROVAL DASHBOARD */}
      <div className="bg-surface border border-border rounded-xl shadow-2xs overflow-hidden mt-6">
        <div className="px-6 py-4 border-b border-border bg-background/25 flex items-center gap-2">
          <Calendar className="text-primary w-5 h-5" />
          <h3 className="font-bold text-navy text-sm">Roster Leave Request Reviews</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-text-muted">
            <thead className="bg-background/40 font-semibold text-navy text-xs uppercase tracking-wider border-b border-border">
              <tr>
                <th className="px-6 py-3.5">Employee Name</th>
                <th className="px-6 py-3.5">Leave Policy type</th>
                <th className="px-6 py-3.5">Duration</th>
                <th className="px-6 py-3.5">Requested Days</th>
                <th className="px-6 py-3.5">Reason</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {leaveRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-xs text-text-muted italic">
                    No leave requests found.
                  </td>
                </tr>
              ) : (
                leaveRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-background/25 transition-colors">
                    <td className="px-6 py-4 font-bold text-navy">
                      <div>{req.employees?.full_name || 'Sarah Namono'}</div>
                      <div className="text-[10px] text-text-muted font-normal mt-0.5">{req.employees?.position || 'Project Coordinator'}</div>
                    </td>
                    <td className="px-6 py-4">{req.leave_types?.name || 'Annual Leave'}</td>
                    <td className="px-6 py-4 font-mono text-text">
                      {req.start_date} to {req.end_date}
                    </td>
                    <td className="px-6 py-4 font-bold font-mono text-text">
                      {req.days_requested} Days
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-text-muted" title={req.reason}>
                      {req.reason}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border uppercase
                        ${req.status === 'pending' ? 'bg-warning-tint text-warning border-warning/20' : ''}
                        ${req.status === 'approved' ? 'bg-success-tint text-success border-success/20' : ''}
                        ${req.status === 'rejected' ? 'bg-danger-tint text-danger border-danger/20' : ''}
                        ${req.status === 'cancelled' ? 'bg-neutral-gray/10 text-text-muted border-border' : ''}
                      `}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {req.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              setReviewAction('approved');
                              setApproverNotes('');
                              setReviewModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-primary text-white text-[10px] font-bold rounded-md hover:bg-primary/95 transition-all shadow"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              setReviewAction('rejected');
                              setApproverNotes('');
                              setReviewModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-danger text-white text-[10px] font-bold rounded-md hover:bg-danger/90 transition-all shadow"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <div className="text-[10px] text-text-muted italic max-w-xs truncate" title={req.approver_notes || ''}>
                          {req.approver_notes ? `Notes: ${req.approver_notes}` : 'No notes'}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* LEAVE REVIEW MODAL */}
      {reviewModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="max-w-md w-full bg-surface border border-border rounded-xl shadow-2xl overflow-hidden m-4">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background/25">
              <h3 className="font-bold text-navy text-sm flex items-center gap-2">
                <Calendar size={17} className="text-primary" /> Review Leave Request
              </h3>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="p-1 text-text-muted hover:text-text hover:bg-background rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReviewLeave} className="p-6 space-y-4">
              <div className="text-xs space-y-2.5 text-text-muted leading-relaxed">
                <div>
                  <span className="font-bold text-navy">Employee:</span> {selectedRequest.employees?.full_name || 'Sarah Namono'}
                </div>
                <div>
                  <span className="font-bold text-navy">Leave Policy:</span> {selectedRequest.leave_types?.name || 'Annual Leave'}
                </div>
                <div>
                  <span className="font-bold text-navy">Requested:</span> {selectedRequest.days_requested} Days ({selectedRequest.start_date} to {selectedRequest.end_date})
                </div>
                <div>
                  <span className="font-bold text-navy">Reason:</span> &ldquo;{selectedRequest.reason}&rdquo;
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1.5">Approver Notes (Optional)</label>
                <textarea
                  rows={3}
                  value={approverNotes}
                  onChange={(e) => setApproverNotes(e.target.value)}
                  placeholder="Explain decision if needed..."
                  className="w-full px-3 py-1.5 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text"
                />
              </div>

              <div className="border-t border-border pt-4 flex gap-3 text-xs">
                <button
                  type="submit"
                  className={`flex-1 py-2 text-white font-bold rounded-lg transition-all shadow-md text-center
                    ${reviewAction === 'approved' ? 'bg-primary hover:bg-primary/95' : 'bg-danger hover:bg-danger/90'}
                  `}
                >
                  Confirm {reviewAction === 'approved' ? 'Approval' : 'Rejection'}
                </button>
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
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
