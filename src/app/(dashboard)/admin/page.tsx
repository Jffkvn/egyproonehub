"use client";

import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { User, UserModuleOverride, OrganizationSettings } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { writeAuditLog } from '@/lib/audit/logger';
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Building,
  Key,
  Save,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Edit2,
  Check,
  X
} from 'lucide-react';

interface LeaveType {
  id: string;
  name: string;
  code: string;
  default_days: number;
  is_paid: boolean;
  is_active: boolean;
}

export default function AdminSettings() {
  const { user: currentUser } = useAuth();
  
  // Organization settings states
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [logoPath, setLogoPath] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState('UGX');
  
  // User profiles & override states
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeOverrides, setActiveOverrides] = useState<UserModuleOverride[]>([]);
  const [newModuleKey, setNewModuleKey] = useState('inventory');
  const [newAccessType, setNewAccessType] = useState<'grant' | 'deny'>('grant');

  // Leave Types Configuration states
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [editingLeaveTypeId, setEditingLeaveTypeId] = useState<string | null>(null);
  const [editDefaultDays, setEditDefaultDays] = useState<number>(0);
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editIsPaid, setEditIsPaid] = useState<boolean>(true);

  const [loading, setLoading] = useState(true);

  // Toast Notification state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAdminData = async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      // 1. Fetch organization settings
      const { data: settingsData } = await supabase
        .from('organization_settings')
        .select('*')
        .eq('id', true)
        .single();
      
      if (settingsData) {
        setOrgSettings(settingsData as OrganizationSettings);
        setCompanyName(settingsData.company_name);
        setLogoPath(settingsData.logo_path);
        setDefaultCurrency(settingsData.default_currency);
      }

      // 2. Fetch users roster
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .order('full_name', { ascending: true });
      
      setUsers((usersData || []) as User[]);

      // 3. Fetch Leave Types
      const { data: leaveTypeData } = await supabase
        .from('leave_types')
        .select('*')
        .order('code', { ascending: true });
      
      setLeaveTypes((leaveTypeData || []) as LeaveType[]);

    } catch (err) {
      console.error('Error fetching admin settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleUpdateOrgSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !isSupabaseConfigured) return;
    try {
      const { error } = await supabase
        .from('organization_settings')
        .update({
          company_name: companyName,
          logo_path: logoPath,
          default_currency: defaultCurrency,
          updated_by: currentUser.id
        })
        .eq('id', true);

      if (error) throw error;

      // Write audit log
      await writeAuditLog(
        currentUser.id,
        'ORG_SETTINGS_UPDATE',
        'organization_settings',
        null,
        `Updated organization settings: Name: ${companyName}, Currency: ${defaultCurrency}`
      );

      showToast('success', 'Organization settings updated successfully.');
      fetchAdminData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update organization settings');
    }
  };

  const handleFetchOverrides = async (user: User) => {
    setSelectedUser(user);
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('user_module_overrides')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      setActiveOverrides((data || []) as UserModuleOverride[]);
    } catch (err: any) {
      showToast('error', 'Error fetching overrides: ' + err.message);
    }
  };

  const handleAddOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !currentUser || !isSupabaseConfigured) return;
    try {
      const { error } = await supabase
        .from('user_module_overrides')
        .upsert({
          user_id: selectedUser.id,
          module_key: newModuleKey,
          access_type: newAccessType,
          created_by: currentUser.id
        }, { onConflict: 'user_id,module_key' });

      if (error) throw error;

      // Write audit log
      await writeAuditLog(
        currentUser.id,
        'OVERRIDE_MODIFY',
        'user_module_overrides',
        null,
        `Added override for user ${selectedUser.full_name}: ${newModuleKey} -> ${newAccessType}`
      );

      showToast('success', 'Module permission override created successfully.');
      handleFetchOverrides(selectedUser);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to create module override');
    }
  };

  const handleRemoveOverride = async (id: string) => {
    if (!selectedUser || !currentUser || !isSupabaseConfigured) return;
    try {
      const { error } = await supabase
        .from('user_module_overrides')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Write audit log
      await writeAuditLog(
        currentUser.id,
        'OVERRIDE_MODIFY',
        'user_module_overrides',
        null,
        `Removed module override configuration for user ${selectedUser.full_name}`
      );

      showToast('success', 'Module override successfully removed.');
      handleFetchOverrides(selectedUser);
    } catch (err: any) {
      showToast('error', 'Failed to remove override: ' + err.message);
    }
  };

  const handleUpdateRole = async (newRole: string) => {
    if (!selectedUser || !currentUser || !isSupabaseConfigured) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Write audit log
      await writeAuditLog(
        currentUser.id,
        'USER_UPDATE',
        'users',
        selectedUser.id,
        `Updated role of user ${selectedUser.full_name} (${selectedUser.email}) to ${newRole}`
      );

      // Update local state
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, role: newRole } : u));
      setSelectedUser(prev => prev ? { ...prev, role: newRole } : null);
      showToast('success', `Successfully updated base system role to ${newRole}`);
    } catch (err: any) {
      showToast('error', 'Failed to update base system role: ' + err.message);
    }
  };

  // Leave Type Edit Start
  const startEditLeaveType = (lt: LeaveType) => {
    setEditingLeaveTypeId(lt.id);
    setEditDefaultDays(lt.default_days);
    setEditIsActive(lt.is_active);
    setEditIsPaid(lt.is_paid);
  };

  // Save Leave Type
  const handleSaveLeaveType = async (lt: LeaveType) => {
    if (!currentUser || !isSupabaseConfigured) return;
    try {
      const { error } = await supabase
        .from('leave_types')
        .update({
          default_days: editDefaultDays,
          is_active: editIsActive,
          is_paid: editIsPaid
        })
        .eq('id', lt.id);

      if (error) throw error;

      // Write Audit log
      await writeAuditLog(
        currentUser.id,
        'LEAVE_TYPE_UPDATE',
        'leave_types',
        lt.id,
        `Updated leave type policy ${lt.name}: default days = ${editDefaultDays}, paid = ${editIsPaid}, active = ${editIsActive}`
      );

      setEditingLeaveTypeId(null);
      fetchAdminData();
      showToast('success', `Leave policy updated successfully.`);
    } catch (err: any) {
      showToast('error', 'Failed to update leave type: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-surface border border-border rounded-xl shadow-2xs p-6">
        <h2 className="text-xl font-bold text-navy mb-1.5 flex items-center gap-2">
          <SettingsIcon className="text-primary w-5 h-5" />
          System Administration
        </h2>
        <p className="text-sm text-text-muted">
          Modify core organization settings, customize module permissions, and manage leave type policies.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Organization Config (Left Panel) */}
        <div className="lg:col-span-1 bg-surface border border-border rounded-xl shadow-2xs p-6 space-y-6 h-fit">
          <h3 className="text-base font-bold text-navy border-b border-border pb-3 mb-4 flex items-center gap-2">
            <Building className="text-primary w-5 h-5" />
            Company Profile
          </h3>

          <form onSubmit={handleUpdateOrgSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-navy uppercase tracking-wider mb-1.5">Company Name</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-navy uppercase tracking-wider mb-1.5">Logo Path URL</label>
              <input
                type="text"
                required
                value={logoPath}
                onChange={(e) => setLogoPath(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-navy uppercase tracking-wider mb-1.5">Default Currency</label>
              <select
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text"
              >
                <option value="UGX">UGX (Ugandan Shilling)</option>
                <option value="KES">KES (Kenyan Shilling)</option>
                <option value="USD">USD (US Dollar)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/95 transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Save size={14} /> Update Settings
            </button>
          </form>
        </div>

        {/* User Module Overrides (Right Panel) */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-background/25">
            <h3 className="font-bold text-navy text-sm flex items-center gap-2">
              <ShieldCheck className="text-primary w-5 h-5" /> Module Authorization Overrides
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
            {/* User List */}
            <div className="p-4 space-y-3">
              <span className="text-xs font-bold text-navy uppercase tracking-wider block mb-2">Select User Profile</span>
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleFetchOverrides(u)}
                    className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex justify-between items-center
                      ${selectedUser?.id === u.id
                        ? 'border-primary bg-primary-tint/20 text-navy font-bold'
                        : 'border-border hover:bg-background text-text-muted'}
                    `}
                  >
                    <div>
                      <div className="font-bold">{u.full_name}</div>
                      <div className="text-[10px] opacity-75">{u.email}</div>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-90 px-2 py-0.5 rounded-full bg-background border">
                      {u.role}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Overrides Management */}
            <div className="p-5 space-y-5">
              {!selectedUser ? (
                <div className="h-48 flex items-center justify-center text-xs text-text-muted italic">
                  Select a user profile to manage module permission overrides.
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="pb-3 border-b border-border flex justify-between items-end gap-4">
                    <div>
                      <span className="text-xs font-bold text-navy uppercase tracking-wider block mb-1">Active Overrides for</span>
                      <span className="text-sm font-bold text-primary block">{selectedUser.full_name}</span>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <label className="block text-[9px] font-bold text-text-muted uppercase tracking-wide">Base System Role</label>
                      <select
                        value={selectedUser.role}
                        onChange={(e) => handleUpdateRole(e.target.value)}
                        className="px-2.5 py-1 border border-border rounded-lg text-xs focus:outline-none bg-background text-navy font-bold uppercase"
                      >
                        <option value="employee">Employee</option>
                        <option value="coordinator">Coordinator</option>
                        <option value="pm">Project Manager</option>
                        <option value="warehouse_manager">Warehouse Manager</option>
                        <option value="cfo">CFO</option>
                        <option value="hr_admin">HR Admin</option>
                        <option value="md">MD</option>
                      </select>
                    </div>
                  </div>

                  {/* Existing Overrides List */}
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {activeOverrides.length === 0 ? (
                      <p className="text-xs text-text-muted italic">No overrides currently configured.</p>
                    ) : (
                      activeOverrides.map((ovr) => (
                        <div key={ovr.id} className="flex items-center justify-between p-2 border border-border rounded bg-background/50 text-xs">
                          <div>
                            <code className="font-bold text-navy">{ovr.module_key}</code>
                            <span className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase
                              ${ovr.access_type === 'grant' ? 'bg-success-tint text-success' : 'bg-danger-tint text-danger'}
                            `}>
                              {ovr.access_type}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveOverride(ovr.id)}
                            className="text-danger hover:text-danger/80 font-semibold"
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add New Override Form */}
                  <form onSubmit={handleAddOverride} className="border-t border-border pt-4 space-y-3.5">
                    <span className="text-xs font-bold text-navy uppercase tracking-wider block">Add Custom Override</span>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wide mb-1">Module Key</label>
                        <select
                          value={newModuleKey}
                          onChange={(e) => setNewModuleKey(e.target.value)}
                          className="w-full px-3 py-1.5 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text"
                        >
                          <option value="hr">HR</option>
                          <option value="inventory">Inventory</option>
                          <option value="cash">Cash</option>
                          <option value="tracker">Tracker</option>
                          <option value="reports">Reports</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wide mb-1">Access Rule</label>
                        <select
                          value={newAccessType}
                          onChange={(e) => setNewAccessType(e.target.value as any)}
                          className="w-full px-3 py-1.5 border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-background text-text"
                        >
                          <option value="grant">Grant Access</option>
                          <option value="deny">Deny Access</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 border border-primary text-primary hover:bg-primary-tint/10 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5"
                    >
                      <Key size={14} /> Add Override Rule
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* LEAVE TYPE POLICIES MANAGER */}
      <div className="bg-surface border border-border rounded-xl shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-background/25 flex items-center gap-2">
          <Calendar className="text-primary w-5 h-5" />
          <h3 className="font-bold text-navy text-sm">Corporate Leave Type Policies (Annual Entitlements)</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-text-muted">
            <thead className="bg-background/40 font-semibold text-navy text-xs uppercase tracking-wider border-b border-border">
              <tr>
                <th className="px-6 py-3">Leave Name</th>
                <th className="px-6 py-3">Code</th>
                <th className="px-6 py-3">Default Entitlement (Days)</th>
                <th className="px-6 py-3">Paid / Unpaid</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {leaveTypes.map((lt) => (
                <tr key={lt.id} className="hover:bg-background/25 transition-colors">
                  <td className="px-6 py-3.5 font-bold text-navy">{lt.name}</td>
                  <td className="px-6 py-3.5 font-mono text-text-muted uppercase">{lt.code}</td>
                  <td className="px-6 py-3.5">
                    {editingLeaveTypeId === lt.id ? (
                      <input
                        type="number"
                        min="0"
                        value={editDefaultDays}
                        onChange={(e) => setEditDefaultDays(Number(e.target.value))}
                        className="w-20 px-2 py-1 border border-border rounded bg-background text-text focus:outline-none focus:ring-1 focus:ring-primary font-semibold text-center"
                      />
                    ) : (
                      <span className="font-bold text-text">{lt.default_days} Days</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5">
                    {editingLeaveTypeId === lt.id ? (
                      <select
                        value={editIsPaid ? 'paid' : 'unpaid'}
                        onChange={(e) => setEditIsPaid(e.target.value === 'paid')}
                        className="px-2 py-1 border border-border rounded bg-background text-text text-xs"
                      >
                        <option value="paid">Paid</option>
                        <option value="unpaid">Unpaid</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase
                        ${lt.is_paid ? 'bg-success-tint text-success border-success/20' : 'bg-danger-tint text-danger border-danger/20'}
                      `}>
                        {lt.is_paid ? 'Paid' : 'Unpaid'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3.5">
                    {editingLeaveTypeId === lt.id ? (
                      <select
                        value={editIsActive ? 'active' : 'inactive'}
                        onChange={(e) => setEditIsActive(e.target.value === 'active')}
                        className="px-2 py-1 border border-border rounded bg-background text-text text-xs"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase
                        ${lt.is_active ? 'bg-success-tint text-success border-success/20' : 'bg-neutral-gray/10 text-text-muted border-border'}
                      `}>
                        {lt.is_active ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    {editingLeaveTypeId === lt.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleSaveLeaveType(lt)}
                          className="p-1 text-success hover:bg-success-tint rounded-md"
                          title="Save Changes"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setEditingLeaveTypeId(null)}
                          className="p-1 text-danger hover:bg-danger-tint rounded-md"
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditLeaveType(lt)}
                        className="p-1 text-text-muted hover:text-primary hover:bg-background rounded"
                        title="Edit Entitlement Policy"
                      >
                        <Edit2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
