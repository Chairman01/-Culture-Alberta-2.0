// Test script to diagnose comment insertion issues
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://itdmwpbsnviassgqfhxk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCommentsTable() {
    console.log('🔍 Testing comments table...\n');

    // Test 1: Check if table exists by trying to select
    console.log('1️⃣ Checking if comments table exists...');
    const { data: selectData, error: selectError } = await supabase
        .from('comments')
        .select('count');

    if (selectError) {
        console.error('❌ Error selecting from comments table:', selectError);
    } else {
        console.log('✅ Comments table exists');
    }

    // Test 2: Try to insert a test comment
    console.log('\n2️⃣ Testing comment insertion...');
    const testComment = {
        article_id: 'test-article-id',
        author_name: 'Test User',
        author_email: 'test@example.com',
        content: 'This is a test comment',
        status: 'pending',
        ip_address: '127.0.0.1',
    };

    const { data: insertData, error: insertError } = await supabase
        .from('comments')
        .insert([testComment])
        .select()
        .single();

    if (insertError) {
        console.error('❌ Error inserting comment:', insertError);
        console.error('Error details:', JSON.stringify(insertError, null, 2));
    } else {
        console.log('✅ Comment inserted successfully!');
        console.log('Inserted comment:', insertData);

        // Test 3: Clean up - delete the test comment
        console.log('\n3️⃣ Cleaning up test comment...');
        const { error: deleteError } = await supabase
            .from('comments')
            .delete()
            .eq('id', insertData.id);

        if (deleteError) {
            console.error('⚠️  Could not delete test comment:', deleteError);
            console.log('Please manually delete comment with ID:', insertData.id);
        } else {
            console.log('✅ Test comment deleted');
        }
    }
}

testCommentsTable().catch(console.error);
