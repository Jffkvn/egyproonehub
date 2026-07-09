export interface Role {
  role_name: string;
  default_modules: string[];
  created_at: string;
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  national_id: string | null;
  position: string | null;
  department: string | null;
  employment_type: 'permanent' | 'contract' | 'casual' | 'intern';
  start_date: string | null;
  status: 'active' | 'inactive';
  gross_salary: number;
  currency: string;
  bank_name: string | null;
  account_number: string | null;
  mobile_money_number: string | null;
  gender: 'male' | 'female' | 'other' | null;
  dob: string | null;
  personal_email: string | null;
  tax_category: 'standard' | 'special' | 'exempt' | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  invite_sent_at?: string | null;
}

export interface UserModuleOverride {
  id: string;
  user_id: string;
  module_key: string;
  access_type: 'grant' | 'deny';
  created_at: string;
  created_by: string | null;
}

export interface Project {
  id: string;
  name: string;
  code: string | null;
  status: 'active' | 'inactive' | 'completed' | 'on_hold';
  description: string | null;
  estimated_budget: number;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ProjectAssignment {
  id: string;
  project_id: string;
  user_id: string;
  role_on_project: 'coordinator' | 'pm';
  assigned_at: string;
  unassigned_at: string | null;
  created_at: string;
  created_by: string | null;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  metadata: any | null;
  created_at: string;
}

export interface OrganizationSettings {
  id: boolean;
  company_name: string;
  logo_path: string;
  default_currency: string;
  updated_at: string;
  updated_by: string | null;
}
