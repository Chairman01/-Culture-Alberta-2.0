import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const supabaseUrl = 'https://itdmwpbsnviassgqfhxk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createArticlesTable() {
  try {
    console.log('🔄 Creating articles table in Supabase...');
    
    // Read the SQL script
    const sqlPath = path.join(process.cwd(), 'create-articles-table.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf-8');
    
    console.log('📝 Executing SQL script...');
    console.log('SQL Script:');
    console.log(sqlScript);
    
    // Execute the SQL script
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlScript });
    
    if (error) {
      console.error('❌ Error creating table:', error);
      console.log('\n📋 Manual Instructions:');
      console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard');
      console.log('2. Select your project: itdmwpbsnviassgqfhxk');
      console.log('3. Navigate to SQL Editor (left sidebar)');
      console.log('4. Copy and paste the SQL script above');
      console.log('5. Click "Run" to execute');
      return;
    }
    
    console.log('✅ Articles table created successfully!');
    console.log('📊 Table structure:');
    console.log(data);
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n📋 Manual Instructions:');
    console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard');
    console.log('2. Select your project: itdmwpbsnviassgqfhxk');
    console.log('3. Navigate to SQL Editor (left sidebar)');
    console.log('4. Copy and paste the contents of create-articles-table.sql');
    console.log('5. Click "Run" to execute');
  }
}

createArticlesTable();
