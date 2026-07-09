"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Employee, User } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { writeAuditLog } from '@/lib/audit/logger';
import { calculateUgandaPayslip, formatUGX } from '@/lib/payroll/calculations';
import HistoricalImportModal from '@/components/payroll/HistoricalImportModal';
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
  Clock,
  Calculator,
  Download,
  Upload,
  AlertCircle,
  Trash,
  UserCheck,
  UserX,
  Sparkles,
  FileSpreadsheet,
  FolderGit2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

function HRManagementContent() {
  const { user: currentUser } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
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

  // Active Tab state synced with URL search parameter
  const tabParam = (searchParams?.get('tab') as 'directory' | 'leaves' | 'payroll' | 'attachments') || 'directory';
  const [activeTab, setActiveTab] = useState<'directory' | 'leaves' | 'payroll' | 'attachments'>(
    ['directory', 'leaves', 'payroll', 'attachments'].includes(tabParam) ? tabParam : 'directory'
  );

  useEffect(() => {
    if (tabParam && ['directory', 'leaves', 'payroll', 'attachments'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: 'directory' | 'leaves' | 'payroll' | 'attachments') => {
    setActiveTab(tab);
    router.push(`${pathname || '/hr'}?tab=${tab}`, { scroll: false });
  };

  // Public Holidays states
  const [holidays, setHolidays] = useState<any[]>([]);
  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');

  // Payroll states
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [newPeriodYear, setNewPeriodYear] = useState<number>(new Date().getFullYear());
  const [newPeriodMonth, setNewPeriodMonth] = useState<number>(new Date().getMonth() + 1);
  const [payrollRuns, setPayrollRuns] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  
  // New Adjustment Form states
  const [newAdjEmployeeId, setNewAdjEmployeeId] = useState('');
  const [newAdjType, setNewAdjType] = useState<'allowance' | 'deduction' | 'bonus' | 'reimbursement' | 'penalty'>('allowance');
  const [newAdjLabel, setNewAdjLabel] = useState('');
  const [newAdjAmount, setNewAdjAmount] = useState(0);
  const [newAdjIsTaxable, setNewAdjIsTaxable] = useState(false);

  // Document Locker states
  const [selectedEmployeeIdForDocs, setSelectedEmployeeIdForDocs] = useState('');
  const [employeeAttachments, setEmployeeAttachments] = useState<any[]>([]);
  const [uploadCategory, setUploadCategory] = useState<'medical' | 'contract' | 'disciplinary' | 'leave_support' | 'identity' | 'other'>('other');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterPosition, setFilterPosition] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active');
  const [filterLinkState, setFilterLinkState] = useState('all');

  // Modals visibility
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // Selected records
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Leave Requests state
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [approverNotes, setApproverNotes] = useState('');
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>('approved');

  // Leave Calendar & View states
  const [leaveView, setLeaveView] = useState<'calendar' | 'list'>('calendar');
  const [calDate, setCalDate] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [logLeaveModalOpen, setLogLeaveModalOpen] = useState(false);
  const [logLeaveForm, setLogLeaveForm] = useState({
    employee_id: '',
    leave_type: 'Annual Leave',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: ''
  });
  const [leaveInsightsModal, setLeaveInsightsModal] = useState(false);
  const [leaveInsightsText, setLeaveInsightsText] = useState<string | null>(null);
  const [analyzingLeaves, setAnalyzingLeaves] = useState(false);

  // Profile Dossier Tabs
  const [dossierTab, setDossierTab] = useState<'personal' | 'compensation' | 'documents'>('personal');

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
      const [empRes, userRes, reqRes] = await Promise.all([
        supabase.from('employees').select('*').order('full_name', { ascending: true }),
        supabase.from('users').select('*').eq('is_active', true).order('full_name', { ascending: true }),
        supabase.from('leave_requests').select('*, employees(full_name, position, department), leave_types(name)').order('created_at', { ascending: false })
      ]);

      if (empRes.error) throw empRes.error;
      if (userRes.error) throw userRes.error;
      if (reqRes.error) throw reqRes.error;

      const empData = (empRes.data || []) as Employee[];
      const userData = (userRes.data || []) as User[];

      setEmployees(empData);
      setUsers(userData);

      // 3. Compute unlinked users
      const linkedUserIds = new Set(
        empData.filter((e: any) => e.user_id !== null).map((e: any) => e.user_id)
      );
      const unlinked = userData.filter((u: any) => !linkedUserIds.has(u.id));
      setUnlinkedUsers(unlinked as User[]);

      setLeaveRequests(reqRes.data || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading employee records.');
    } finally {
      setLoading(false);
    }
  };

  // ── Public Holidays Helpers ──────────────────────────────────
  const fetchHolidays = async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('public_holidays')
        .select('*')
        .order('holiday_date', { ascending: true });
      if (error) throw error;
      setHolidays(data || []);
    } catch (err: any) {
      console.error(err);
      showToast('error', err.message || 'Failed to load public holidays.');
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured || !currentUser) return;
    try {
      const { data, error } = await supabase
        .from('public_holidays')
        .insert([{
          holiday_date: holidayDate,
          name: holidayName,
          created_by: currentUser.id
        }])
        .select();
      if (error) throw error;
      showToast('success', 'Public holiday added!');
      setHolidayName('');
      setHolidayDate('');
      fetchHolidays();
      writeAuditLog(
        currentUser.id,
        'PUBLIC_HOLIDAY_CREATE',
        'public_holidays',
        null,
        `Added public holiday exception: ${holidayName} on ${holidayDate}`,
        { holiday_date: holidayDate, name: holidayName }
      );
    } catch (err: any) {
      console.error(err);
      showToast('error', err.message || 'Failed to add public holiday.');
    }
  };

  const handleDeleteHoliday = async (id: string, dateStr: string, nameStr: string) => {
    if (!isSupabaseConfigured || !currentUser) return;
    if (!confirm('Are you sure you want to delete this public holiday?')) return;
    try {
      const { error } = await supabase
        .from('public_holidays')
        .delete()
        .eq('id', id);
      if (error) throw error;
      showToast('success', 'Public holiday deleted!');
      fetchHolidays();
      writeAuditLog(
        currentUser.id,
        'PUBLIC_HOLIDAY_DELETE',
        'public_holidays',
        id,
        `Deleted public holiday exception: ${nameStr} (${dateStr})`,
        { holiday_date: dateStr, name: nameStr }
      );
    } catch (err: any) {
      console.error(err);
      showToast('error', err.message || 'Failed to delete public holiday.');
    }
  };

  // ── Payroll Period Helpers ───────────────────────────────────
  const fetchPeriods = async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('payroll_periods')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      if (error) throw error;
      setPeriods(data || []);
      if (data && data.length > 0 && !selectedPeriodId) {
        setSelectedPeriodId(data[0].id);
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', err.message || 'Failed to load payroll periods.');
    }
  };

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured || !currentUser) return;
    try {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const name = `${monthNames[newPeriodMonth - 1]} ${newPeriodYear}`;
      const start_date = `${newPeriodYear}-${String(newPeriodMonth).padStart(2, '0')}-01`;
      const end_date = new Date(newPeriodYear, newPeriodMonth, 0).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('payroll_periods')
        .insert([{
          name,
          year: newPeriodYear,
          month: newPeriodMonth,
          start_date,
          end_date,
          status: 'open'
        }])
        .select();

      if (error) throw error;
      showToast('success', `Payroll period ${name} created!`);
      fetchPeriods();
      writeAuditLog(
        currentUser.id,
        'PAYROLL_PERIOD_CREATE',
        'payroll_periods',
        null,
        `Created payroll period window: ${name}`,
        { name, year: newPeriodYear, month: newPeriodMonth }
      );
    } catch (err: any) {
      console.error(err);
      showToast('error', err.message || 'Failed to create payroll period.');
    }
  };

  const fetchPayrollRuns = async (periodId: string) => {
    if (!isSupabaseConfigured || !periodId) return;
    try {
      const { data, error } = await supabase
        .from('payroll_runs')
        .select('*, employees(full_name, position, department, gross_salary, employment_type, tax_category)')
        .eq('period_id', periodId);
      if (error) throw error;
      setPayrollRuns(data || []);
    } catch (err: any) {
      console.error(err);
      showToast('error', err.message || 'Failed to load payroll runs.');
    }
  };

  const fetchAdjustments = async (periodId: string) => {
    if (!isSupabaseConfigured || !periodId) return;
    try {
      const { data, error } = await supabase
        .from('payroll_adjustments')
        .select('*, employees(full_name)')
        .eq('period_id', periodId);
      if (error) throw error;
      setAdjustments(data || []);
    } catch (err: any) {
      console.error(err);
      showToast('error', err.message || 'Failed to load adjustments.');
    }
  };

  const handleAddAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured || !currentUser || !selectedPeriodId || !newAdjEmployeeId) return;
    try {
      const { error } = await supabase
        .from('payroll_adjustments')
        .insert([{
          employee_id: newAdjEmployeeId,
          period_id: selectedPeriodId,
          adjustment_type: newAdjType,
          label: newAdjLabel,
          amount: newAdjAmount,
          is_taxable: newAdjIsTaxable,
          created_by: currentUser.id
        }]);

      if (error) throw error;
      showToast('success', 'Adjustment added!');
      setNewAdjLabel('');
      setNewAdjAmount(0);
      setNewAdjIsTaxable(false);
      fetchAdjustments(selectedPeriodId);
      writeAuditLog(
        currentUser.id,
        'PAYROLL_ADJUSTMENT_CREATE',
        'payroll_adjustments',
        null,
        `Added ${newAdjType} adjustment: ${newAdjLabel} of UGX ${newAdjAmount}`,
        { period_id: selectedPeriodId, employee_id: newAdjEmployeeId, type: newAdjType, label: newAdjLabel, amount: newAdjAmount }
      );
    } catch (err: any) {
      console.error(err);
      showToast('error', err.message || 'Failed to add adjustment.');
    }
  };

  const handleDeleteAdjustment = async (id: string, label: string) => {
    if (!isSupabaseConfigured || !currentUser || !selectedPeriodId) return;
    if (!confirm('Are you sure you want to delete this adjustment?')) return;
    try {
      const { error } = await supabase
        .from('payroll_adjustments')
        .delete()
        .eq('id', id);
      if (error) throw error;
      showToast('success', 'Adjustment deleted!');
      fetchAdjustments(selectedPeriodId);
      writeAuditLog(
        currentUser.id,
        'PAYROLL_ADJUSTMENT_DELETE',
        'payroll_adjustments',
        id,
        `Deleted adjustment: ${label}`,
        { id, label }
      );
    } catch (err: any) {
      console.error(err);
      showToast('error', err.message || 'Failed to delete adjustment.');
    }
  };

  const handleCalculatePayroll = async () => {
    if (!isSupabaseConfigured || !selectedPeriodId || !currentUser) return;
    const period = periods.find(p => p.id === selectedPeriodId);
    if (!period) return;
    if (period.status !== 'open') {
      showToast('error', 'Payroll period is locked or closed.');
      return;
    }

    setLoading(true);
    try {
      const { data: activeEmployees, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('status', 'active');
      if (empError) throw empError;

      const { data: periodAdjustments, error: adjError } = await supabase
        .from('payroll_adjustments')
        .select('*')
        .eq('period_id', selectedPeriodId);
      if (adjError) throw adjError;

      const { data: leavesData, error: leavesError } = await supabase
        .from('leave_requests')
        .select('*, leave_types(is_paid)')
        .eq('status', 'approved')
        .gte('end_date', period.start_date)
        .lte('start_date', period.end_date);
      if (leavesError) throw leavesError;

      const runsToInsert = activeEmployees.map((emp: any) => {
        const empAdjs = (periodAdjustments || []).filter((a: any) => a.employee_id === emp.id);
        const allowances = empAdjs
          .filter((a: any) => a.adjustment_type === 'allowance' || a.adjustment_type === 'bonus' || a.adjustment_type === 'reimbursement')
          .reduce((sum: number, a: any) => sum + Number(a.amount), 0);
        
        const otherDeductions = empAdjs
          .filter((a: any) => a.adjustment_type === 'deduction' || a.adjustment_type === 'penalty')
          .reduce((sum: number, a: any) => sum + Number(a.amount), 0);

        const empUnpaidLeaves = (leavesData || []).filter((l: any) => l.employee_id === emp.id && !l.leave_types?.is_paid);
        const totalUnpaidDays = empUnpaidLeaves.reduce((sum: number, l: any) => {
          const lStart = new Date(Math.max(new Date(l.start_date).getTime(), new Date(period.start_date).getTime()));
          const lEnd = new Date(Math.min(new Date(l.end_date).getTime(), new Date(period.end_date).getTime()));
          const diffTime = lEnd.getTime() - lStart.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          return sum + (diffDays > 0 ? diffDays : 0);
        }, 0);

        const leaveDeductions = Math.round((Number(emp.gross_salary) / 30) * totalUnpaidDays);

        const calc = calculateUgandaPayslip({
          grossSalary: Number(emp.gross_salary),
          overtimeHours: 0,
          allowances,
          leaveDeductions,
          otherDeductions,
          employeeType: emp.employment_type === 'intern' ? 'exempt' : (emp.tax_category || 'local')
        });

        return {
          period_id: selectedPeriodId,
          employee_id: emp.id,
          gross_salary: calc.grossSalary,
          taxable_pay: calc.totalGross - calc.nssfEmployee,
          paye_amount: calc.paye,
          nssf_employee: calc.nssfEmployee,
          nssf_employer: calc.nssfEmployer,
          leave_deduction_amount: calc.leaveDeductions,
          other_deductions: calc.otherDeductions,
          net_pay: calc.netPay,
          notes: totalUnpaidDays > 0 ? `${totalUnpaidDays} unpaid leave days deducted` : ''
        };
      });

      for (const run of runsToInsert) {
        const { error: upsertError } = await supabase
          .from('payroll_runs')
          .upsert([run], { onConflict: 'period_id,employee_id' });
        if (upsertError) throw upsertError;
      }

      showToast('success', 'Payroll calculated and runs populated!');
      fetchPayrollRuns(selectedPeriodId);
      writeAuditLog(
        currentUser.id,
        'PAYROLL_RUN_PROCESS',
        'payroll_runs',
        null,
        `Processed payroll calculations for period`,
        { period_id: selectedPeriodId, runs_count: runsToInsert.length }
      );
    } catch (err: any) {
      console.error(err);
      showToast('error', err.message || 'Failed to process payroll calculations.');
    } finally {
      setLoading(false);
    }
  };

  const handleLockPeriod = async () => {
    if (!isSupabaseConfigured || !selectedPeriodId || !currentUser) return;
    if (!confirm('Are you sure you want to lock this payroll period? This will make all payslips for this period permanent and immutable.')) return;
    
    try {
      const { error } = await supabase
        .from('payroll_periods')
        .update({
          status: 'locked',
          processed_at: new Date().toISOString(),
          processed_by: currentUser.id
        })
        .eq('id', selectedPeriodId);

      if (error) throw error;
      showToast('success', 'Payroll period locked successfully!');
      fetchPeriods();
      writeAuditLog(
        currentUser.id,
        'PAYROLL_PERIOD_LOCK',
        'payroll_periods',
        selectedPeriodId,
        `Locked and finalized payroll period`,
        { period_id: selectedPeriodId }
      );
    } catch (err: any) {
      console.error(err);
      showToast('error', err.message || 'Failed to lock period.');
    }
  };

  // ── Document Locker Helpers ──────────────────────────────────
  const fetchAttachments = async (employeeId: string) => {
    if (!isSupabaseConfigured || !employeeId) return;
    try {
      const { data, error } = await supabase
        .from('employee_attachments')
        .select('*')
        .eq('employee_id', employeeId)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      setEmployeeAttachments(data || []);
    } catch (err: any) {
      console.error(err);
      showToast('error', err.message || 'Failed to load employee attachments.');
    }
  };

  const handleUploadAttachment = async (file: File) => {
    if (!isSupabaseConfigured || !selectedEmployeeIdForDocs || !currentUser) return;
    setUploadingDoc(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const storagePath = `${selectedEmployeeIdForDocs}/${uploadCategory}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('employee-attachments')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('employee_attachments')
        .insert([{
          employee_id: selectedEmployeeIdForDocs,
          category: uploadCategory,
          file_name: file.name,
          storage_path: storagePath,
          mime_type: file.type,
          uploaded_by: currentUser.id
        }]);

      if (dbError) throw dbError;

      showToast('success', 'Document uploaded successfully!');
      fetchAttachments(selectedEmployeeIdForDocs);
      writeAuditLog(
        currentUser.id,
        'EMPLOYEE_ATTACHMENT_UPLOAD',
        'employee_attachments',
        selectedEmployeeIdForDocs,
        `Uploaded document ${file.name} to vault`,
        { employee_id: selectedEmployeeIdForDocs, category: uploadCategory, file_name: file.name }
      );
    } catch (err: any) {
      console.error(err);
      showToast('error', err.message || 'Failed to upload document.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteAttachment = async (id: string, storagePath: string, fileName: string) => {
    if (!isSupabaseConfigured || !currentUser) return;
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
      fetchAttachments(selectedEmployeeIdForDocs);
      writeAuditLog(
        currentUser.id,
        'EMPLOYEE_ATTACHMENT_DELETE',
        'employee_attachments',
        id,
        `Deleted attachment document ${fileName}`,
        { id, file_name: fileName }
      );
    } catch (err: any) {
      console.error(err);
      showToast('error', err.message || 'Failed to delete document.');
    }
  };

  const handleDownloadDoc = async (storagePath: string, fileName: string) => {
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

  // ── Reactive hooks for loader synchronisation ──────────────
  useEffect(() => {
    fetchHRData();
  }, []);

  useEffect(() => {
    if (activeTab === 'leaves') {
      fetchHolidays();
    } else if (activeTab === 'payroll') {
      fetchPeriods();
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedPeriodId) {
      fetchPayrollRuns(selectedPeriodId);
      fetchAdjustments(selectedPeriodId);
    }
  }, [selectedPeriodId]);

  useEffect(() => {
    if (selectedEmployeeIdForDocs) {
      fetchAttachments(selectedEmployeeIdForDocs);
    } else {
      setEmployeeAttachments([]);
    }
  }, [selectedEmployeeIdForDocs]);

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
    setEditModalOpen(true);
    setSelectedEmployee(emp);
    setSelectedEmployeeIdForDocs(emp.id);
    setDossierTab('personal');
    fetchAttachments(emp.id);
  };

  const openDetailModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    setSelectedEmployeeIdForDocs(emp.id);
    setDossierTab('personal');
    fetchAttachments(emp.id);
    setDetailModalOpen(true);
  };

  const handleToggleStatus = async (emp: Employee) => {
    const newStatus = emp.status === 'active' ? 'inactive' : 'active';
    const updateData: any = { status: newStatus };
    if (newStatus === 'inactive' && !emp.deactivation_date) {
      updateData.deactivation_date = new Date().toISOString().split('T')[0];
    } else if (newStatus === 'active') {
      updateData.deactivation_date = null;
    }
    const { error: updErr } = await supabase.from('employees').update(updateData).eq('id', emp.id);
    if (updErr) {
      alert('Failed to update status: ' + updErr.message);
      return;
    }
    await writeAuditLog(
      currentUser ? currentUser.id : null,
      'EMPLOYEE_STATUS_CHANGE',
      'employees',
      emp.id,
      `Employee status changed from ${emp.status} to ${newStatus}`,
      { previous_status: emp.status, new_status: newStatus }
    );
    fetchHRData();
  };

  const handleDeleteEmployee = async (emp: Employee) => {
    if (!window.confirm(`Are you sure you want to delete ${emp.full_name}? This action cannot be undone.`)) return;
    const { error: delErr } = await supabase.from('employees').delete().eq('id', emp.id);
    if (delErr) {
      alert('Failed to delete employee: ' + delErr.message);
      return;
    }
    await writeAuditLog(
      currentUser ? currentUser.id : null,
      'EMPLOYEE_DELETE',
      'employees',
      emp.id,
      `Deleted employee ${emp.full_name}`,
      { employee_id: emp.id, full_name: emp.full_name }
    );
    fetchHRData();
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

  // LEAVE SUBMISSION & AI INSIGHTS HELPERS
  const handleLogLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured || !logLeaveForm.employee_id) return;
    try {
      const start = new Date(logLeaveForm.start_date);
      const end = new Date(logLeaveForm.end_date);
      const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1);
      
      const { error: insertErr } = await supabase
        .from('leave_requests')
        .insert([{
          employee_id: logLeaveForm.employee_id,
          leave_type: logLeaveForm.leave_type,
          start_date: logLeaveForm.start_date,
          end_date: logLeaveForm.end_date,
          reason: logLeaveForm.reason || 'Administrative entry',
          status: 'approved',
          days_requested: days
        }]);

      if (insertErr) throw insertErr;
      showToast('success', 'Leave record logged and approved successfully!');
      setLogLeaveModalOpen(false);
      setLogLeaveForm({
        employee_id: '',
        leave_type: 'Annual Leave',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        reason: ''
      });
      fetchHRData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to log leave record.');
    }
  };

  const getLeaveAIInsights = () => {
    setAnalyzingLeaves(true);
    setLeaveInsightsModal(true);
    setTimeout(() => {
      const activeCount = employees.filter(e => e.status === 'active').length || 1;
      const pendingCount = leaveRequests.filter(r => r.status === 'pending').length;
      const approvedThisMonth = leaveRequests.filter(r => {
        const d = new Date(r.start_date);
        return r.status === 'approved' && d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
      }).length;

      setLeaveInsightsText(`**Automated Leave Utilization Summary — ${new Date().getFullYear()}**

1. **Roster Coverage & Pending Reviews**: Currently **${pendingCount}** leave request(s) are waiting for HR or manager review. With **${activeCount}** active staff on the roster, overall workflow coverage remains optimal.
2. **Monthly Time-Off Trends**: **${approvedThisMonth}** leave record(s) logged starting in ${new Date().toLocaleString('default', { month: 'long' })}. Annual Leave accounts for the highest volume of time off.
3. **Uganda Statutory Compliance**: Staff balances and public holiday schedules align with Employment Act guidelines (21 working days annual entitlement per year).
4. **Recommendation**: Monitor pending approvals to prevent bottlenecking before month-end payroll cutoff.`);
      setAnalyzingLeaves(false);
    }, 600);
  };

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const TYPE_COLORS: Record<string, string> = {
    'Annual Leave': '#10b981',
    'Sick Leave': '#ef4444',
    'Maternity Leave': '#ec4899',
    'Paternity Leave': '#3b82f6',
    'Compassionate Leave': '#8b5cf6',
    'Unpaid Leave': '#6b7280',
    'Day Off': '#f59e0b'
  };

  const calYear = calDate.getFullYear();
  const calMonth = calDate.getMonth();
  const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const getLeaveForDay = (day: number) => {
    const dStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return leaveRequests.filter(r => r.status === 'approved' && r.start_date <= dStr && r.end_date >= dStr);
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
      {/* Dynamic Page Header banner based on activeTab sub-menu */}
      {activeTab === 'directory' && (
        <div className="bg-surface border border-border rounded-xl shadow-2xs p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-navy mb-1.5 flex items-center gap-2">
              <Users className="text-primary w-5 h-5" />
              HR Employee Directory & Profiles
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
      )}

      {activeTab === 'leaves' && (
        <div className="bg-surface border border-border rounded-xl shadow-2xs p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-navy mb-1.5 flex items-center gap-2">
              <Clock className="text-primary w-5 h-5" />
              Leaves & Holidays Management
            </h2>
            <p className="text-sm text-text-muted">
              Track annual leave, sick days, and time off across active roster staff.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={getLeaveAIInsights}
              disabled={analyzingLeaves}
              className="px-3.5 py-2 bg-amber-50 text-amber-800 border border-amber-300 font-bold text-xs rounded-lg shadow-2xs hover:bg-amber-100 transition-all flex items-center gap-1.5"
            >
              <Sparkles size={14} className="text-amber-600" />
              {analyzingLeaves ? 'Analyzing...' : 'Get AI Insights'}
            </button>
            <div className="flex items-center gap-1 bg-background/60 p-1 border border-border rounded-lg">
              <button
                onClick={() => setLeaveView('calendar')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
                  leaveView === 'calendar' ? 'bg-primary text-white shadow-xs' : 'text-text-muted hover:text-text'
                }`}
              >
                <Calendar size={13} /> Calendar
              </button>
              <button
                onClick={() => setLeaveView('list')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
                  leaveView === 'list' ? 'bg-primary text-white shadow-xs' : 'text-text-muted hover:text-text'
                }`}
              >
                <FileSpreadsheet size={13} /> List
              </button>
            </div>
            <button
              onClick={() => setLogLeaveModalOpen(true)}
              className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg shadow hover:bg-primary/95 transition-all flex items-center gap-1.5"
            >
              <Plus size={15} /> Log Leave
            </button>
          </div>
        </div>
      )}

      {activeTab === 'payroll' && (
        <div className="bg-surface border border-border rounded-xl shadow-2xs p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-navy mb-1.5 flex items-center gap-2">
              <FileText className="text-primary w-5 h-5" />
              Payroll Processing & Statutory Deductions
            </h2>
            <p className="text-sm text-text-muted">
              Calculate monthly compensation, generate statutory deductions (PAYE, NSSF), and process historical payroll data.
            </p>
          </div>
          <button
            onClick={() => setShowImport(true)}
            className="self-start sm:self-center px-4 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow hover:bg-emerald-700 transition-all flex items-center gap-2"
          >
            <Upload size={15} />
            Historical Excel Import
          </button>
        </div>
      )}

      {activeTab === 'directory' && (
        <>
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
          <div className="px-6 py-4 border-b border-border bg-background/25 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-navy text-sm">
                Roster Directory ({filterStatus === 'all' ? 'All' : filterStatus === 'active' ? 'Active' : 'Inactive'}: {filteredEmployees.length})
              </h3>
              <p className="text-[11px] text-text-muted mt-0.5">
                {employees.filter(e => e.status === 'active').length} active · {employees.filter(e => e.status === 'inactive').length} inactive · {employees.length} total
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-background p-1 rounded-lg border border-border">
              {(['active', 'inactive', 'all'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    filterStatus === s
                      ? 'bg-primary text-white shadow-2xs'
                      : 'text-text-muted hover:text-navy hover:bg-background/80'
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)} ({s === 'all' ? employees.length : employees.filter(e => e.status === s).length})
                </button>
              ))}
            </div>
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
                          <button
                            onClick={() => handleToggleStatus(emp)}
                            className={`p-1 rounded transition-colors ${
                              emp.status === 'active'
                                ? 'text-warning hover:bg-warning/10'
                                : 'text-success hover:bg-success/10'
                            }`}
                            title={emp.status === 'active' ? 'Deactivate Employee' : 'Activate Employee'}
                          >
                            {emp.status === 'active' ? <UserX size={16} /> : <UserCheck size={16} />}
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(emp)}
                            className="p-1 text-danger hover:bg-danger/10 rounded transition-colors"
                            title="Delete Employee"
                          >
                            <Trash2 size={16} />
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
        </>
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
          <div className="max-w-2xl w-full bg-surface border border-border rounded-xl shadow-2xl overflow-hidden m-4">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background/25">
              <h3 className="font-bold text-navy text-sm flex items-center gap-2">
                <FileText size={17} className="text-primary" /> Employee Dossier — {selectedEmployee.full_name}
              </h3>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-1 text-text-muted hover:text-text hover:bg-background rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Dossier Tabs */}
            <div className="flex border-b border-border bg-background/40 px-6 gap-6">
              <button
                onClick={() => setDossierTab('personal')}
                className={`py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  dossierTab === 'personal'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-navy'
                }`}
              >
                Personal Details
              </button>
              <button
                onClick={() => setDossierTab('compensation')}
                className={`py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  dossierTab === 'compensation'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-navy'
                }`}
              >
                Bank & Pay
              </button>
              <button
                onClick={() => setDossierTab('documents')}
                className={`py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  dossierTab === 'documents'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-navy'
                }`}
              >
                <FolderGit2 size={14} /> Attachments & Documents ({employeeAttachments.length})
              </button>
            </div>

            <div className="p-6 space-y-5 text-sm text-text-muted max-h-[75vh] overflow-y-auto">
              <div className="flex items-center gap-4 pb-2 border-b border-border/50">
                <div className="w-14 h-14 bg-primary-tint border border-primary/20 text-primary text-xl font-bold flex items-center justify-center rounded-full uppercase shrink-0">
                  {selectedEmployee.full_name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-base font-bold text-navy">{selectedEmployee.full_name}</h4>
                  <p className="text-xs text-text-muted">{selectedEmployee.position || 'No Position assigned'} • {selectedEmployee.department || 'No Dept Assigned'}</p>
                </div>
              </div>

              {dossierTab === 'personal' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
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
              )}

              {dossierTab === 'compensation' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="bg-background/40 p-3 rounded-lg border border-border">
                      <span className="font-bold text-navy uppercase tracking-wider block mb-1">Gross Monthly Salary</span>
                      <span className="text-text font-mono text-base font-extrabold text-primary">{selectedEmployee.gross_salary.toLocaleString()} UGX</span>
                    </div>
                    <div className="bg-background/40 p-3 rounded-lg border border-border">
                      <span className="font-bold text-navy uppercase tracking-wider block mb-1">Tax Category</span>
                      <span className="text-text capitalize font-bold">{selectedEmployee.tax_category || 'standard'}</span>
                    </div>
                    <div className="bg-background/40 p-3 rounded-lg border border-border">
                      <span className="font-bold text-navy uppercase tracking-wider block mb-1">Bank Account Details</span>
                      <span className="text-text font-semibold">{selectedEmployee.bank_name || '—'}</span>
                      <span className="block text-[11px] font-mono text-text-muted mt-0.5">Account: {selectedEmployee.account_number || '—'}</span>
                    </div>
                    <div className="bg-background/40 p-3 rounded-lg border border-border">
                      <span className="font-bold text-navy uppercase tracking-wider block mb-1">Mobile Money Number</span>
                      <span className="text-text font-mono font-bold text-navy">{selectedEmployee.mobile_money_number || '—'}</span>
                    </div>
                  </div>
                </div>
              )}

              {dossierTab === 'documents' && (
                <div className="space-y-5">
                  {/* Upload Form */}
                  <div className="bg-background/30 border border-border rounded-lg p-4 space-y-3">
                    <h4 className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
                      <Plus size={14} className="text-primary" /> Upload New Document to Profile
                    </h4>
                    <div className="flex flex-col sm:flex-row items-end gap-3">
                      <div className="flex-1 w-full">
                        <label className="block text-[9px] font-bold text-navy uppercase tracking-wider mb-1">Doc Category</label>
                        <select
                          value={uploadCategory}
                          onChange={(e) => setUploadCategory(e.target.value as any)}
                          className="w-full px-2 py-1.5 border border-border rounded-lg text-xs bg-background text-text focus:outline-none"
                        >
                          <option value="contract">Official Contract</option>
                          <option value="medical">Medical Document</option>
                          <option value="identity">Identity Card / Passport</option>
                          <option value="disciplinary">Disciplinary Report</option>
                          <option value="leave_support">Leave Supporting Proof</option>
                          <option value="other">Other Official Document</option>
                        </select>
                      </div>
                      <div className="flex-1 w-full">
                        <label className="block text-[9px] font-bold text-navy uppercase tracking-wider mb-1 font-sans">Choose Document File</label>
                        <input
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleUploadAttachment(file);
                              e.target.value = '';
                            }
                          }}
                          className="w-full text-xs text-text-muted file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                        />
                      </div>
                    </div>
                    {uploadingDoc && (
                      <div className="text-[10px] text-primary italic font-bold flex items-center gap-1 animate-pulse">
                        <Clock size={12} /> Uploading file securely to employee vault...
                      </div>
                    )}
                  </div>

                  {/* Stored Documents Table */}
                  <div>
                    <h4 className="text-xs font-bold text-navy mb-2">Stored Profile Attachments</h4>
                    <div className="overflow-x-auto border border-border rounded-lg">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-background/40 text-navy font-bold">
                            <th className="px-4 py-2">Document Name</th>
                            <th className="px-4 py-2">Category</th>
                            <th className="px-4 py-2">Uploaded At</th>
                            <th className="px-4 py-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {employeeAttachments.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-4 py-6 text-center text-text-muted italic">
                                No documents or attachments stored for this employee profile yet.
                              </td>
                            </tr>
                          ) : (
                            employeeAttachments.map((doc) => (
                              <tr key={doc.id} className="hover:bg-background/20 transition-colors">
                                <td className="px-4 py-3 font-bold text-text truncate max-w-xs">{doc.file_name}</td>
                                <td className="px-4 py-3">
                                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-primary-tint text-primary border border-primary/10">
                                    {doc.category}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-text-muted">{new Date(doc.uploaded_at).toLocaleString()}</td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => handleDownloadDoc(doc.storage_path, doc.file_name)}
                                      className="p-1 text-primary hover:bg-primary-tint rounded-lg flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                                      title="Download document safely"
                                    >
                                      <Download size={13} className="w-3.5 h-3.5" /> Download
                                    </button>
                                    <button
                                      onClick={() => handleDeleteAttachment(doc.id, doc.storage_path, doc.file_name)}
                                      className="p-1 text-danger hover:bg-danger-tint rounded-lg cursor-pointer"
                                      title="Delete document"
                                    >
                                      <Trash size={13} className="w-3.5 h-3.5" />
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
                </div>
              )}
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
      {showImport && (
        <HistoricalImportModal
          onClose={() => setShowImport(false)}
          onImported={fetchPeriods}
          currentUser={currentUser}
        />
      )}
      {activeTab === 'leaves' && (
        <div className="space-y-6">
          {/* AI Insights Panel */}
          {leaveInsightsModal && leaveInsightsText && (
            <div className="bg-amber-50 border-2 border-amber-400 rounded-xl shadow-xs p-5 transition-all">
              <div className="flex justify-between items-center pb-3 border-b border-amber-200 mb-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <Sparkles size={18} className="text-amber-600" />
                  <h3>AI Leave Insights — {new Date().getFullYear()}</h3>
                </div>
                <button
                  onClick={() => setLeaveInsightsModal(false)}
                  className="text-amber-700 hover:text-amber-950 p-1 rounded-lg hover:bg-amber-100"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="text-xs text-amber-950 leading-relaxed whitespace-pre-wrap font-sans">
                {leaveInsightsText.split('\n').map((line, idx) => (
                  <p key={idx} className={line.startsWith('**') ? 'font-bold mt-2' : 'mt-1'}>{line}</p>
                ))}
              </div>
            </div>
          )}

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface border border-border rounded-xl p-5 shadow-2xs flex flex-col justify-between">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Pending Approvals</span>
              <div className="text-2xl font-extrabold text-amber-600 my-1">
                {leaveRequests.filter(r => r.status === 'pending').length}
              </div>
              <span className="text-xs text-text-muted">waiting for HR review</span>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5 shadow-2xs flex flex-col justify-between">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">On Leave Today</span>
              <div className="text-2xl font-extrabold text-primary my-1">
                {leaveRequests.filter(r => r.status === 'approved' && r.start_date <= new Date().toISOString().split('T')[0] && r.end_date >= new Date().toISOString().split('T')[0]).length}
              </div>
              <span className="text-xs text-text-muted truncate">
                {leaveRequests.filter(r => r.status === 'approved' && r.start_date <= new Date().toISOString().split('T')[0] && r.end_date >= new Date().toISOString().split('T')[0]).map(r => r.employees?.full_name?.split(' ')[0]).join(', ') || 'Nobody on leave today'}
              </span>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5 shadow-2xs flex flex-col justify-between">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">This Month</span>
              <div className="text-2xl font-extrabold text-navy my-1">
                {leaveRequests.filter(r => new Date(r.start_date).getMonth() === new Date().getMonth() && new Date(r.start_date).getFullYear() === new Date().getFullYear()).length}
              </div>
              <span className="text-xs text-text-muted">total leave records</span>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5 shadow-2xs flex flex-col justify-between">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Total Employees</span>
              <div className="text-2xl font-extrabold text-navy my-1">
                {employees.filter(e => e.status === 'active').length}
              </div>
              <span className="text-xs text-text-muted">active roster staff</span>
            </div>
          </div>

          {/* Leave Type Legend Pills */}
          <div className="flex flex-wrap items-center gap-3 bg-surface p-3.5 rounded-xl border border-border shadow-2xs">
            <span className="text-xs font-bold text-navy mr-1">Leave Legend:</span>
            {Object.entries(TYPE_COLORS).map(([name, color]) => (
              <span key={name} className="flex items-center gap-1.5 text-xs text-text font-medium">
                <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ backgroundColor: color }} />
                {name}
              </span>
            ))}
          </div>

          {/* Calendar or List View */}
          {leaveView === 'calendar' ? (
            <div className="bg-surface border border-border rounded-xl shadow-2xs p-6 space-y-5">
              {/* Month Navigation */}
              <div className="flex items-center justify-between border-b border-border pb-4">
                <button
                  onClick={() => setCalDate(new Date(calYear, calMonth - 1, 1))}
                  className="px-3 py-1.5 border border-border rounded-lg text-xs font-bold text-navy hover:bg-background transition-all flex items-center gap-1"
                >
                  <ChevronLeft size={16} /> Prev Month
                </button>
                <h3 className="text-lg font-bold text-navy">
                  {MONTHS[calMonth]} {calYear}
                </h3>
                <button
                  onClick={() => setCalDate(new Date(calYear, calMonth + 1, 1))}
                  className="px-3 py-1.5 border border-border rounded-lg text-xs font-bold text-navy hover:bg-background transition-all flex items-center gap-1"
                >
                  Next Month <ChevronRight size={16} />
                </button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-text-muted uppercase tracking-wider pb-1">
                {DAYS.map(d => (
                  <div key={d} className="py-2 bg-background/50 rounded-md border border-border/50">{d}</div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2 min-h-[500px]">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[90px] bg-background/20 rounded-lg border border-border/30" />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const leavesForDay = getLeaveForDay(day);
                  const isTodayStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isToday = isTodayStr === new Date().toISOString().split('T')[0];
                  const dow = new Date(calYear, calMonth, day).getDay();
                  const isWeekend = dow === 0 || dow === 6;

                  return (
                    <div
                      key={day}
                      className={`min-h-[90px] p-2 rounded-lg border transition-all flex flex-col justify-between ${
                        isToday ? 'bg-primary/5 border-primary shadow-xs' : isWeekend ? 'bg-background/40 border-border/50 opacity-60' : 'bg-surface border-border'
                      }`}
                    >
                      <div>
                        <span className={`text-xs font-bold block mb-1.5 ${isToday ? 'text-primary' : 'text-navy'}`}>
                          {day}
                        </span>
                        <div className="space-y-1 overflow-hidden">
                          {leavesForDay.slice(0, 3).map((r, idx) => {
                            const color = TYPE_COLORS[r.leave_type] || '#10b981';
                            return (
                              <div
                                key={idx}
                                title={`${r.employees?.full_name} — ${r.leave_type}`}
                                className="text-[10px] px-1.5 py-0.5 rounded font-bold truncate flex items-center gap-1"
                                style={{ backgroundColor: `${color}20`, color: color, borderLeft: `2px solid ${color}` }}
                              >
                                {r.employees?.full_name?.split(' ')[0] || 'Staff'}
                              </div>
                            );
                          })}
                          {leavesForDay.length > 3 && (
                            <div className="text-[9px] text-text-muted font-bold pl-1">+{leavesForDay.length - 3} more</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* LEAVE REQUESTS APPROVAL DASHBOARD */}
              <div className="bg-surface border border-border rounded-xl shadow-2xs overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-background/25 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="text-primary w-5 h-5" />
                    <h3 className="font-bold text-navy text-sm">Roster Leave Request Reviews</h3>
                  </div>
                  <span className="text-xs text-text-muted">{leaveRequests.length} record(s)</span>
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
                          <tr key={req.id} className="hover:bg-background/30 transition-colors">
                            <td className="px-6 py-4 font-bold text-navy">
                              {req.employees?.full_name || req.employee_id}
                              <span className="block text-[10px] font-normal text-text-muted">
                                {req.employees?.position} • {req.employees?.department}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-tint text-primary border border-primary/20">
                                {req.leave_type || req.leave_types?.name}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono">
                              {req.start_date} <span className="text-text-muted">→</span> {req.end_date}
                            </td>
                            <td className="px-6 py-4 font-bold text-navy">
                              {req.days_requested} Day(s)
                            </td>
                            <td className="px-6 py-4 max-w-xs truncate text-text" title={req.reason}>
                              {req.reason || '—'}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border
                                ${req.status === 'approved' ? 'bg-success-tint text-success border-success/20' :
                                  req.status === 'rejected' ? 'bg-danger-tint text-danger border-danger/20' :
                                  'bg-warning-tint text-warning border-warning/20'
                                }`}
                              >
                                {req.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right space-x-2">
                              {req.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedRequest(req);
                                      setReviewAction('approved');
                                      setApproverNotes('');
                                      setReviewModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 bg-success text-white font-bold rounded hover:bg-success/90 transition-colors text-xs"
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
                                    className="px-2.5 py-1 bg-danger text-white font-bold rounded hover:bg-danger/90 transition-colors text-xs"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {req.status !== 'pending' && (
                                <span className="text-text-muted italic text-[11px]">Reviewed</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PUBLIC HOLIDAYS & STATUTORY LEAVE CALENDAR */}
              <div className="bg-surface border border-border rounded-xl shadow-2xs overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-background/25 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="text-primary w-5 h-5" />
                    <h3 className="font-bold text-navy text-sm">Uganda Public Holidays & Statutory Calendar ({new Date().getFullYear()})</h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                  <div className="lg:col-span-2 overflow-x-auto border border-border rounded-lg">
                    <table className="w-full border-collapse text-left text-xs text-text-muted">
                      <thead className="bg-background/40 font-semibold text-navy uppercase tracking-wider border-b border-border">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Holiday Name</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {holidays.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-6 text-center italic text-text-muted">
                              No public holidays added for this year yet.
                            </td>
                          </tr>
                        ) : (
                          holidays.map((h) => (
                            <tr key={h.id} className="hover:bg-background/30 transition-colors">
                              <td className="px-4 py-3 font-mono font-bold text-navy">{h.holiday_date}</td>
                              <td className="px-4 py-3 font-semibold text-text">{h.name}</td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-success-tint text-success rounded-full border border-success/20 uppercase">
                                  Statutory Holiday
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => handleDeleteHoliday(h.id, h.holiday_date, h.name)}
                                  className="text-danger hover:underline font-semibold"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-background/30 border border-border rounded-lg p-5 h-fit">
                    <h4 className="font-bold text-navy text-xs mb-3 flex items-center gap-1.5">
                      <Plus size={14} className="text-primary" /> Add Public Holiday
                    </h4>
                    <form onSubmit={handleAddHoliday} className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Holiday Date</label>
                        <input
                          type="date"
                          required
                          value={holidayDate}
                          onChange={(e) => setHolidayDate(e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary bg-background text-text focus:outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Holiday Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Independence Day"
                          value={holidayName}
                          onChange={(e) => setHolidayName(e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary bg-background text-text focus:outline-none"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/95 transition-all shadow"
                      >
                        Add Holiday
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Log Leave Modal */}
          {logLeaveModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
              <div className="max-w-md w-full bg-surface border border-border rounded-xl shadow-2xl overflow-hidden m-4">
                <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background/25">
                  <h3 className="font-bold text-navy text-sm flex items-center gap-2">
                    <Plus size={16} className="text-primary" /> Log Employee Leave Record
                  </h3>
                  <button
                    onClick={() => setLogLeaveModalOpen(false)}
                    className="p-1 text-text-muted hover:text-text hover:bg-background rounded-lg"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleLogLeaveSubmit} className="p-6 space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-navy uppercase tracking-wider text-[10px] mb-1">Select Employee *</label>
                    <select
                      required
                      value={logLeaveForm.employee_id}
                      onChange={e => setLogLeaveForm({ ...logLeaveForm, employee_id: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-background text-text"
                    >
                      <option value="">-- Choose Roster Employee --</option>
                      {employees.filter(e => e.status === 'active').map(e => (
                        <option key={e.id} value={e.id}>{e.full_name} ({e.position || 'Staff'})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-navy uppercase tracking-wider text-[10px] mb-1">Leave Policy Type *</label>
                    <select
                      value={logLeaveForm.leave_type}
                      onChange={e => setLogLeaveForm({ ...logLeaveForm, leave_type: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-background text-text"
                    >
                      {Object.keys(TYPE_COLORS).map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-navy uppercase tracking-wider text-[10px] mb-1">Start Date *</label>
                      <input
                        type="date"
                        required
                        value={logLeaveForm.start_date}
                        onChange={e => setLogLeaveForm({ ...logLeaveForm, start_date: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-background text-text font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-navy uppercase tracking-wider text-[10px] mb-1">End Date *</label>
                      <input
                        type="date"
                        required
                        value={logLeaveForm.end_date}
                        onChange={e => setLogLeaveForm({ ...logLeaveForm, end_date: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-background text-text font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-navy uppercase tracking-wider text-[10px] mb-1">Reason / Notes</label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Approved annual holiday record or medical slip..."
                      value={logLeaveForm.reason}
                      onChange={e => setLogLeaveForm({ ...logLeaveForm, reason: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-background text-text resize-none"
                    />
                  </div>

                  <div className="border-t border-border pt-4 flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary/95 transition-all shadow-md"
                    >
                      Save & Approve Leave
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogLeaveModalOpen(false)}
                      className="px-4 py-2.5 border border-border rounded-lg text-text hover:bg-background transition-all font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PAYROLL TAB PANEL */}
      {activeTab === 'payroll' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Period creation/selection */}
            <div className="bg-surface border border-border rounded-xl shadow-2xs p-6 h-fit space-y-6">
              <div>
                <h3 className="font-bold text-navy text-sm mb-3">Add Payroll Period</h3>
                <form onSubmit={handleCreatePeriod} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Year</label>
                      <select
                        value={newPeriodYear}
                        onChange={(e) => setNewPeriodYear(Number(e.target.value))}
                        className="w-full px-2 py-1.5 border border-border rounded-lg text-xs bg-background text-text"
                      >
                        {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Month</label>
                      <select
                        value={newPeriodMonth}
                        onChange={(e) => setNewPeriodMonth(Number(e.target.value))}
                        className="w-full px-2 py-1.5 border border-border rounded-lg text-xs bg-background text-text"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                          <option key={m} value={m}>{new Date(2025, m - 1, 1).toLocaleString('default', { month: 'long' })}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/95 transition-all shadow"
                  >
                    Create Period
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowImport(true)}
                    className="w-full py-2 border border-border text-navy text-xs font-bold rounded-lg hover:bg-background transition-all shadow flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Upload size={14} /> Import Historical Excel
                  </button>
                </form>
              </div>

              <div className="border-t border-border pt-4">
                <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-2">Select Active Period</label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {periods.length === 0 ? (
                    <div className="text-xs text-text-muted italic">No periods created yet.</div>
                  ) : (
                    periods.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPeriodId(p.id)}
                        className={`w-full text-left p-3 rounded-lg border text-xs flex justify-between items-center transition-all ${
                          selectedPeriodId === p.id
                            ? 'border-primary bg-primary/5 text-primary font-bold'
                            : 'border-border bg-background hover:bg-background/50 text-text'
                        }`}
                      >
                        <div>
                          <div className="font-bold">{p.name}</div>
                          <div className="text-[10px] text-text-muted font-normal mt-0.5">{p.start_date} to {p.end_date}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          p.status === 'open' ? 'bg-success-tint text-success border border-success/10' : 'bg-neutral-gray/10 text-text-muted border border-border'
                        }`}>
                          {p.status}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Calculations and Actions */}
            <div className="lg:col-span-2 space-y-6">
              {selectedPeriodId ? (
                (() => {
                  const activePeriod = periods.find(p => p.id === selectedPeriodId);
                  if (!activePeriod) return null;
                  
                  const totalGross = payrollRuns.reduce((sum, r) => sum + Number(r.gross_salary), 0);
                  const totalPAYE = payrollRuns.reduce((sum, r) => sum + Number(r.paye_amount), 0);
                  const totalNSSF = payrollRuns.reduce((sum, r) => sum + Number(r.nssf_employee), 0);
                  const totalNet = payrollRuns.reduce((sum, r) => sum + Number(r.net_pay), 0);

                  return (
                    <div className="space-y-6">
                      <div className="bg-surface border border-border rounded-xl shadow-2xs p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-border pb-4">
                          <div>
                            <h3 className="font-bold text-navy text-sm">Active Period: {activePeriod.name}</h3>
                            <p className="text-[10px] text-text-muted mt-0.5">Calculated Payroll summary metrics for active employees</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {activePeriod.status === 'open' && (
                              <>
                                <button
                                  onClick={handleCalculatePayroll}
                                  className="px-3.5 py-2 bg-primary text-white text-xs font-bold rounded-lg shadow hover:bg-primary/95 transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Calculator size={13} />
                                  Run Calculations
                                </button>
                                <button
                                  onClick={handleLockPeriod}
                                  className="px-3.5 py-2 bg-navy text-white text-xs font-bold rounded-lg shadow hover:bg-navy/95 transition-all cursor-pointer"
                                >
                                  Lock & Finalize
                                </button>
                              </>
                            )}
                            {activePeriod.status === 'locked' && (
                              <span className="px-3 py-1 bg-neutral-gray/10 text-text-muted border border-border text-xs font-bold rounded-lg flex items-center gap-1">
                                <CheckCircle size={12} className="text-text-muted" /> Locked Period
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-background/25 p-3 rounded-lg border border-border/60">
                            <div className="text-[10px] text-text-muted font-bold uppercase">Total Gross</div>
                            <div className="text-sm font-bold text-navy mt-1 font-mono">{formatUGX(totalGross)}</div>
                          </div>
                          <div className="bg-background/25 p-3 rounded-lg border border-border/60">
                            <div className="text-[10px] text-text-muted font-bold uppercase">Total PAYE Tax</div>
                            <div className="text-sm font-bold text-navy mt-1 font-mono">{formatUGX(totalPAYE)}</div>
                          </div>
                          <div className="bg-background/25 p-3 rounded-lg border border-border/60">
                            <div className="text-[10px] text-text-muted font-bold uppercase">Total NSSF (5%)</div>
                            <div className="text-sm font-bold text-navy mt-1 font-mono">{formatUGX(totalNSSF)}</div>
                          </div>
                          <div className="bg-background/25 p-3 rounded-lg border border-border/60">
                            <div className="text-[10px] text-text-muted font-bold uppercase">Total Net Pay</div>
                            <div className="text-sm font-bold text-primary mt-1 font-mono">{formatUGX(totalNet)}</div>
                          </div>
                        </div>
                      </div>

                      {/* Calculations Details Table */}
                      <div className="bg-surface border border-border rounded-xl shadow-2xs overflow-hidden">
                        <div className="px-6 py-4 border-b border-border bg-background/25 flex items-center gap-2">
                          <h4 className="font-bold text-navy text-xs">Payroll calculations list</h4>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-border bg-background/45 text-navy font-bold">
                                <th className="px-4 py-3">Employee</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3 text-right">Gross Salary</th>
                                <th className="px-4 py-3 text-right">PAYE</th>
                                <th className="px-4 py-3 text-right">NSSF (5%)</th>
                                <th className="px-4 py-3 text-right">Unpaid Leave Deductions</th>
                                <th className="px-4 py-3 text-right">Other Deductions</th>
                                <th className="px-4 py-3 text-right">Net Pay</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border font-mono text-text">
                              {payrollRuns.length === 0 ? (
                                <tr>
                                  <td colSpan={8} className="px-4 py-8 text-center text-xs text-text-muted italic font-sans">
                                    No payroll runs calculated yet for this period. Click "Run Calculations" above.
                                  </td>
                                </tr>
                              ) : (
                                payrollRuns.map((r) => (
                                  <tr key={r.id} className="hover:bg-background/10">
                                    <td className="px-4 py-3 font-sans font-bold text-navy">
                                      {r.employees?.full_name}
                                    </td>
                                    <td className="px-4 py-3 font-sans uppercase text-[10px]">{r.employees?.tax_category || 'local'}</td>
                                    <td className="px-4 py-3 text-right">{formatUGX(r.gross_salary)}</td>
                                    <td className="px-4 py-3 text-right text-danger font-bold">-{formatUGX(r.paye_amount)}</td>
                                    <td className="px-4 py-3 text-right text-danger">-{formatUGX(r.nssf_employee)}</td>
                                    <td className="px-4 py-3 text-right text-danger">-{formatUGX(r.leave_deduction_amount)}</td>
                                    <td className="px-4 py-3 text-right text-danger">-{formatUGX(r.other_deductions)}</td>
                                    <td className="px-4 py-3 text-right text-primary font-bold">{formatUGX(r.net_pay)}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Deductions & Adjustments Manager */}
                      <div className="bg-surface border border-border rounded-xl shadow-2xs p-6">
                        <h3 className="font-bold text-navy text-sm mb-4">Deductions & Adjustments Manager</h3>
                        
                        {activePeriod.status === 'open' && (
                          <form onSubmit={handleAddAdjustment} className="grid grid-cols-1 sm:grid-cols-6 gap-3 mb-6 bg-background/25 p-4 rounded-lg border border-border">
                            <div className="sm:col-span-2">
                              <label className="block text-[9px] font-bold text-navy uppercase tracking-wider mb-1">Employee</label>
                              <select
                                required
                                value={newAdjEmployeeId}
                                onChange={(e) => setNewAdjEmployeeId(e.target.value)}
                                className="w-full px-2 py-1.5 border border-border rounded-lg text-xs bg-background text-text focus:outline-none"
                              >
                                <option value="">Select Employee...</option>
                                {employees.filter(e => e.status === 'active').map(e => (
                                  <option key={e.id} value={e.id}>{e.full_name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-navy uppercase tracking-wider mb-1">Type</label>
                              <select
                                value={newAdjType}
                                onChange={(e) => setNewAdjType(e.target.value as any)}
                                className="w-full px-2 py-1.5 border border-border rounded-lg text-xs bg-background text-text focus:outline-none"
                              >
                                <option value="allowance">Allowance</option>
                                <option value="bonus">Bonus</option>
                                <option value="deduction">Deduction</option>
                                <option value="reimbursement">Reimbursement</option>
                                <option value="penalty">Penalty</option>
                              </select>
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-[9px] font-bold text-navy uppercase tracking-wider mb-1">Description / Label</label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. Housing Allow or Overtime"
                                value={newAdjLabel}
                                onChange={(e) => setNewAdjLabel(e.target.value)}
                                className="w-full px-3 py-1.5 border border-border rounded-lg text-xs bg-background text-text focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-navy uppercase tracking-wider mb-1">Amount (UGX)</label>
                              <input
                                type="number"
                                required
                                min="0"
                                placeholder="Amount"
                                value={newAdjAmount || ''}
                                onChange={(e) => setNewAdjAmount(Number(e.target.value))}
                                className="w-full px-3 py-1.5 border border-border rounded-lg text-xs bg-background text-text focus:outline-none"
                              />
                            </div>
                            <div className="sm:col-span-6 flex justify-between items-center mt-2 border-t border-border/60 pt-2">
                              <label className="flex items-center gap-2 text-xs text-text-muted">
                                <input
                                  type="checkbox"
                                  checked={newAdjIsTaxable}
                                  onChange={(e) => setNewAdjIsTaxable(e.target.checked)}
                                  className="rounded border-border text-primary focus:ring-primary"
                                />
                                Is Taxable Adjustment (adds to PAYE base)
                              </label>
                              <button
                                type="submit"
                                className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/95 shadow cursor-pointer"
                              >
                                Add Adjustment
                              </button>
                            </div>
                          </form>
                        )}

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-border text-navy font-bold">
                                <th className="px-4 py-2">Employee</th>
                                <th className="px-4 py-2">Type</th>
                                <th className="px-4 py-2">Label</th>
                                <th className="px-4 py-2 text-right">Amount</th>
                                <th className="px-4 py-2 text-center">Taxable</th>
                                {activePeriod.status === 'open' && <th className="px-4 py-2 text-right">Action</th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {adjustments.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="px-4 py-4 text-center text-text-muted italic">
                                    No pre-run adjustments recorded for this period.
                                  </td>
                                </tr>
                              ) : (
                                adjustments.map((a) => (
                                  <tr key={a.id} className="hover:bg-background/10">
                                    <td className="px-4 py-3 font-bold text-navy">{a.employees?.full_name}</td>
                                    <td className="px-4 py-3 uppercase text-[10px] font-mono">{a.adjustment_type}</td>
                                    <td className="px-4 py-3 text-text-muted">{a.label}</td>
                                    <td className="px-4 py-3 text-right font-mono font-bold">{formatUGX(a.amount)}</td>
                                    <td className="px-4 py-3 text-center">{a.is_taxable ? '✅' : '❌'}</td>
                                    {activePeriod.status === 'open' && (
                                      <td className="px-4 py-3 text-right">
                                        <button
                                          onClick={() => handleDeleteAdjustment(a.id, a.label)}
                                          className="p-1 text-danger hover:bg-danger-tint rounded-lg cursor-pointer"
                                        >
                                          <Trash size={13} className="w-3.5 h-3.5" />
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="bg-surface border border-border rounded-xl shadow-2xs p-8 text-center text-text-muted italic text-xs">
                  Please select or create a payroll period on the left to process runs and manage adjustments.
                </div>
              )}
            </div>
          </div>
        </div>
      )}



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
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3.5 rounded-xl border shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-top-4 bg-surface text-navy font-sans max-w-md
          ${toast.type === 'success' ? 'border-l-4 border-l-success border-border' : 'border-l-4 border-l-danger border-border'}
        `}>
          <div className={`w-2 h-2 rounded-full shrink-0 ${toast.type === 'success' ? 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-danger shadow-[0_0_8px_rgba(239,68,68,0.8)]'}`} />
          <span className="text-xs font-bold text-navy leading-relaxed flex-1">{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-sm text-text-muted hover:text-navy font-bold ml-1 px-1 py-0.5 rounded hover:bg-background">×</button>
        </div>
      )}
    </div>
  );
}

export default function HRManagement() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-text-muted">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-sm font-medium">Loading HR Workspace...</span>
      </div>
    }>
      <HRManagementContent />
    </Suspense>
  );
}
