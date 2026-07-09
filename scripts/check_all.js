const { createClient } = require('../node_modules/@supabase/supabase-js');

const url = 'https://lrsfrxewctvzeqppsmcd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyc2ZyeGV3Y3R2emVxcHBzbWNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzUzMjYwMywiZXhwIjoyMDk5MTA4NjAzfQ.HVSGU8Z6K4H32ytpnusl5T-vwpYEdL6M8qpSXtygsxk';

const adminClient = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  console.log('--- Auth Users ---');
  const { data: authUsers } = await adminClient.auth.admin.listUsers();
  authUsers?.users.forEach(u => {
    console.log(`[Auth] ${u.email} (ID: ${u.id}) confirmed: ${u.email_confirmed_at ? 'YES' : 'NO'}`);
  });

  console.log('\n--- Public Users Table ---');
  const { data: pubUsers, error: pubErr } = await adminClient.from('users').select('*');
  if (pubErr) {
    console.error('Error fetching users table:', pubErr.message);
  } else {
    pubUsers?.forEach(u => {
      console.log(`[Table: users] ID: ${u.id} | Email: ${u.email} | Role: ${u.role} | Active: ${u.is_active}`);
    });
  }

  console.log('\n--- Employees Table ---');
  const { data: empData, error: empErr } = await adminClient.from('employees').select('id, employee_id, full_name, email, user_id, status');
  if (empErr) {
    console.error('Error fetching employees table:', empErr.message);
  } else {
    empData?.forEach(e => {
      console.log(`[Table: employees] ID: ${e.id} | Name: ${e.full_name} | Email: ${e.email} | UserID: ${e.user_id} | Status: ${e.status}`);
    });
  }
}

run();
