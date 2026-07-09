import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

/**
 * Inserts an entry into the immutable database audit_logs table.
 * Standard action names: USER_CREATE, EMPLOYEE_CREATE, ROLE_CHANGE, OVERRIDE_MODIFY, PROJECT_CREATE, PROJECT_ASSIGN.
 */
export async function writeAuditLog(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  description: string,
  metadata: any | null = null
): Promise<boolean> {
  if (!isSupabaseConfigured) {
    console.warn('Supabase not configured. Skipping audit log write.');
    return false;
  }

  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert([
        {
          actor_id: actorId,
          action,
          entity_type: entityType,
          entity_id: entityId,
          description,
          metadata,
        },
      ]);

    if (error) {
      console.error('Failed to write database audit log entry:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Audit logger runtime error:', err);
    return false;
  }
}
