const { createClient } = require('../node_modules/@supabase/supabase-js');

const url = 'https://lrsfrxewctvzeqppsmcd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyc2ZyeGV3Y3R2emVxcHBzbWNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzUzMjYwMywiZXhwIjoyMDk5MTA4NjAzfQ.HVSGU8Z6K4H32ytpnusl5T-vwpYEdL6M8qpSXtygsxk';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyc2ZyeGV3Y3R2emVxcHBzbWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MzI2MDMsImV4cCI6MjA5OTEwODYwM30.4jPuYG6DiHbu3F9ry8--6RZo2fp78hm1r79YFuBPmuY';

const adminClient = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const anonClient = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function run() {
  console.log('Setting theagency256@gmail.com password to test4321...');
  const { data: listData, error: listErr } = await adminClient.auth.admin.listUsers();
  if (listErr) {
    console.error('Failed to list users:', listErr.message);
    return;
  }

  const target = listData.users.find(u => u.email === 'theagency256@gmail.com');
  if (!target) {
    console.error('User theagency256@gmail.com not found!');
    return;
  }

  const { error: updateErr } = await adminClient.auth.admin.updateUserById(target.id, {
    password: 'test4321',
    email_confirm: true
  });

  if (updateErr) {
    console.error('Failed to update theagency256@gmail.com password:', updateErr.message);
  } else {
    console.log('✅ Updated theagency256@gmail.com password to: test4321');
    const { data: verifyData, error: verifyErr } = await anonClient.auth.signInWithPassword({
      email: 'theagency256@gmail.com',
      password: 'test4321'
    });
    if (!verifyErr && verifyData.session) {
      console.log('✅ Verified: theagency256@gmail.com logs in cleanly with test4321!');
    } else {
      console.error('❌ Verification failed:', verifyErr?.message);
    }
  }
}

run();
