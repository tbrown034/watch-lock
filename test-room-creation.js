/**
 * Test room creation directly
 * This simulates what the browser does when creating a room
 */

const SUPABASE_URL = 'https://msdemnzgwzaokzjyymgi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZGVtbnpnd3phb2t6anl5bWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMzUwNzMsImV4cCI6MjA3NTYxMTA3M30.XtmagdOEbMD2SCSGWV1Mwwl_xxEFM7ZVqAcnTWFboXw';

// Test user credentials (you'll need to be logged in)
// First, let's test directly with Supabase client
async function testRoomCreation() {
  console.log('🧪 Testing room creation directly...\n');

  try {
    // Step 1: Sign in to get auth token
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('❌ Not authenticated. Please log in first via the browser.');
      return;
    }

    console.log('✅ Authenticated as:', user.email);
    console.log('   User ID:', user.id);

    // Step 2: Generate share code
    const shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    console.log('\n📝 Creating room with share code:', shareCode);

    // Step 3: Try to insert room directly
    const roomData = {
      name: 'Test Room ' + new Date().toISOString(),
      share_code: shareCode,
      max_members: 10,
      created_by: user.id
    };

    console.log('   Room data:', JSON.stringify(roomData, null, 2));

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert(roomData)
      .select()
      .single();

    if (roomError) {
      console.log('\n❌ Room creation failed!');
      console.log('   Error code:', roomError.code);
      console.log('   Error message:', roomError.message);
      console.log('   Error details:', roomError.details);
      console.log('   Error hint:', roomError.hint);
      return;
    }

    console.log('\n✅ Room created successfully!');
    console.log('   Room ID:', room.id);
    console.log('   Share code:', room.share_code);

    // Step 4: Check if room_member was added by trigger
    const { data: members, error: memberError } = await supabase
      .from('room_members')
      .select('*')
      .eq('room_id', room.id);

    if (memberError) {
      console.log('\n⚠️  Could not check room members:', memberError.message);
    } else {
      console.log('\n👥 Room members:', members.length);
      members.forEach(m => {
        console.log(`   - User ${m.user_id} as ${m.role}`);
      });
    }

    // Cleanup: Delete the test room
    const { error: deleteError } = await supabase
      .from('rooms')
      .delete()
      .eq('id', room.id);

    if (!deleteError) {
      console.log('\n🧹 Test room cleaned up');
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error);
  }
}

// Run the test
testRoomCreation();