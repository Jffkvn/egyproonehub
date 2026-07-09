import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      return NextResponse.json({ 
        error: 'Missing SUPABASE_SERVICE_ROLE_KEY in server environment. Please open your .env.local file and append: SUPABASE_SERVICE_ROLE_KEY=your_key' 
      }, { status: 500 });
    }

    // 1. Validate caller identity using anon client and token
    const clientSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    });

    const { data: { user: callerUser }, error: authError } = await clientSupabase.auth.getUser(token);
    if (authError || !callerUser) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    // 2. Initialize Admin Client
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // 3. Validate caller role (only allow hr_admin) using admin client to bypass client RLS context in route handler
    const { data: callerProfile, error: profileError } = await adminSupabase
      .from('users')
      .select('role, is_active')
      .eq('id', callerUser.id)
      .single();

    if (profileError || !callerProfile || callerProfile.role !== 'hr_admin' || !callerProfile.is_active) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    // 4. Parse request body
    const body = await req.json();
    const { employeeId, email, redirectTo } = body;

    if (!employeeId || !email) {
      return NextResponse.json({ error: 'Missing employeeId or email' }, { status: 400 });
    }

    // Check if the employee already has an invitation sent
    const { data: emp, error: empError } = await adminSupabase
      .from('employees')
      .select('invite_sent_at, user_id')
      .eq('id', employeeId)
      .single();

    if (empError || !emp) {
      return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });
    }

    if (emp.user_id) {
      return NextResponse.json({ error: 'Portal access is already active and linked for this employee' }, { status: 400 });
    }

    const isResend = emp.invite_sent_at !== null;

    // 5. Send Supabase Auth invitation
    const { error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectTo || `${req.nextUrl.origin}/home`
    });

    if (inviteError) {
      return NextResponse.json({ error: 'Supabase Invite Error: ' + inviteError.message }, { status: 500 });
    }

    // 6. Update invite_sent_at on the employees table
    const { error: updateError } = await adminSupabase
      .from('employees')
      .update({ invite_sent_at: new Date().toISOString() })
      .eq('id', employeeId);

    if (updateError) throw updateError;

    // 7. Write Audit Log
    await adminSupabase.from('audit_logs').insert({
      actor_id: callerUser.id,
      action: isResend ? 'INVITE_RESEND' : 'INVITE_SENT',
      entity_type: 'employees',
      entity_id: employeeId,
      description: isResend 
        ? `Resent portal invitation email to ${email}`
        : `Sent portal invitation email to ${email}`
    });

    return NextResponse.json({ 
      success: true, 
      is_resend: isResend 
    });

  } catch (err: any) {
    console.error('Invite API error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
