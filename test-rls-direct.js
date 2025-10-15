/**
 * Test RLS directly using service role (bypasses RLS)
 * This will tell us if the problem is RLS or something else
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://msdemnzgwzaokzjyymgi.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZGVtbnpnd3phb2t6anl5bWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMzUwNzMsImV4cCI6MjA3NTYxMTA3M30.XtmagdOEbMD2SCSGWV1Mwwl_xxEFM7ZVqAcnTWFboXw';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZGVtbnpnd3phb2t6anl5bWdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDAzNTA3MywiZXhwIjoyMDc1NjExMDczfQ.w22x2zQn1h-gCzGFxt0Cw3Wxz-21bp-KhnmkES9IoGI';

const TEST_USER_ID = 'e7a51e40-a9e8-4c26-92c9-153431f9dd4e'; // Your user ID from logs

async function testWithServiceRole() {
  console.log('🧪 Testing with SERVICE ROLE (bypasses RLS)...\n');

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const { data, error } = await supabase
    .from('rooms')
    .insert({
      name: 'Test Room SERVICE ' + new Date().toISOString(),
      share_code: shareCode,
      max_members: 10,
      created_by: TEST_USER_ID
    })
    .select()
    .single();

  if (error) {
    console.log('❌ FAILED with service role!');
    console.log('   This means the problem is NOT RLS');
    console.log('   Error:', error.message);
    console.log('   Code:', error.code);
  } else {
    console.log('✅ SUCCESS with service role!');
    console.log('   Room ID:', data.id);
    console.log('   This confirms RLS is the issue\n');

    // Cleanup
    await supabase.from('rooms').delete().eq('id', data.id);
    console.log('🧹 Cleaned up test room');
  }
}

async function testWithAnonKey() {
  console.log('\n🧪 Testing with ANON KEY (respects RLS)...\n');

  // Create client that acts as authenticated user
  const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    auth: {
      persistSession: false
    }
  });

  // Set auth header manually to simulate authenticated user
  const shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const { data, error } = await supabase
    .from('rooms')
    .insert({
      name: 'Test Room ANON ' + new Date().toISOString(),
      share_code: shareCode,
      max_members: 10,
      created_by: TEST_USER_ID
    })
    .select()
    .single();

  if (error) {
    console.log('❌ FAILED with anon key (expected if RLS blocking)');
    console.log('   Error:', error.message);
    console.log('   Code:', error.code);
  } else {
    console.log('✅ SUCCESS with anon key!');
    console.log('   Room ID:', data.id);
    console.log('   RLS is allowing inserts!\n');

    // Cleanup
    await supabase.from('rooms').delete().eq('id', data.id);
  }
}

// Run both tests
console.log('='.repeat(50));
console.log('RLS DIAGNOSTIC TEST');
console.log('='.repeat(50));

await testWithServiceRole();
await testWithAnonKey();

console.log('\n' + '='.repeat(50));
console.log('TEST COMPLETE');
console.log('='.repeat(50));