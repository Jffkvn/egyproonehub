const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('.env.local file not found in project root!');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseAnonKey = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials not found in .env.local!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.log('Usage: node scripts/create-bootstrap-user.js <email> <password>');
  process.exit(1);
}

async function run() {
  console.log(`Attempting to sign up user: ${email}...`);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: 'Bootstrap Admin'
      }
    }
  });

  if (error) {
    console.error('Signup failed:', error.message);
    process.exit(1);
  }

  console.log('\n========================================');
  console.log('Success! Signup initiated.');
  console.log('========================================');
  if (data.session) {
    console.log('User signed up and authenticated immediately!');
  } else {
    console.log('If email confirmation is enabled on your Supabase project, you must click the link sent to your email before logging in.');
  }
  console.log(`User ID: ${data.user?.id}`);
  console.log('----------------------------------------\n');
}

run();
