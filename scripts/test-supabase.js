import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://itdmwpbsnviassgqfhxk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabaseConnection() {
  try {
    console.log('🔄 Testing Supabase connection...');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('articles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ Supabase connection failed:', error.message);
      console.log('📋 This is expected if the articles table doesn\'t exist yet.');
      console.log('📋 Please create the articles table in your Supabase dashboard.');
      return;
    }
    
    console.log('✅ Supabase connection successful!');
    console.log('📊 Data:', data);
    
  } catch (error) {
    console.error('❌ Error testing Supabase:', error);
  }
}

testSupabaseConnection();
