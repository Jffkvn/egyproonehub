const { createClient } = require('../node_modules/@supabase/supabase-js');

const url = 'https://lrsfrxewctvzeqppsmcd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyc2ZyeGV3Y3R2emVxcHBzbWNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzUzMjYwMywiZXhwIjoyMDk5MTA4NjAzfQ.HVSGU8Z6K4H32ytpnusl5T-vwpYEdL6M8qpSXtygsxk';

const adminClient = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function run() {
  const { data: reqs, error } = await adminClient
    .from('leave_requests')
    .select('*, employees(full_name, email), leave_types(name)')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching leave requests:', error.message);
    return;
  }

  console.log(`Found ${reqs.length} total leave requests:`);
  const seen = new Set();
  const toDelete = [];

  reqs.forEach(r => {
    const key = `${r.employee_id}_${r.leave_type_id}_${r.start_date}_${r.end_date}_${r.status}`;
    if (seen.has(key) && r.status === 'pending') {
      console.log(`[DUPLICATE] ID: ${r.id} | Employee: ${r.employees?.full_name} | Type: ${r.leave_types?.name} | Dates: ${r.start_date} to ${r.end_date} | Status: ${r.status}`);
      toDelete.push(r.id);
    } else {
      seen.add(key);
      console.log(`[KEEP] ID: ${r.id} | Employee: ${r.employees?.full_name} | Type: ${r.leave_types?.name} | Dates: ${r.start_date} to ${r.end_date} | Status: ${r.status}`);
    }
  });

  if (toDelete.length > 0) {
    console.log(`\nDeleting ${toDelete.length} duplicate pending leave requests...`);
    const { error: delErr } = await adminClient
      .from('leave_requests')
      .delete()
      .in('id', toDelete);
    if (delErr) {
      console.error('Error deleting duplicates:', delErr.message);
    } else {
      console.log('✅ Successfully deleted duplicates!');
    }
  } else {
    console.log('\nNo duplicate pending requests found.');
  }
}

run();
