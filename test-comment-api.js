// Test script to verify comment submission works after RLS fix
const SUPABASE_URL = 'https://itdmwpbsnviassgqfhxk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo';

async function testCommentSubmission() {
    const testComment = {
        article_id: '1', // test article
        author_name: 'Test User After RLS Fix',
        author_email: 'test@example.com',
        content: 'Testing after RLS fix - ' + new Date().toISOString(),
        status: 'pending'
    };

    console.log('Submitting test comment...');
    console.log('Data:', testComment);

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/comments`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(testComment)
        });

        console.log('Response status:', response.status);
        console.log('Response statusText:', response.statusText);

        if (response.ok) {
            console.log('✅ SUCCESS! Comment submitted successfully!');
            console.log('The RLS fix is working correctly.');
        } else {
            const errorText = await response.text();
            console.log('❌ FAILED!');
            console.log('Error:', errorText);
        }
    } catch (error) {
        console.log('❌ ERROR:', error.message);
    }
}

testCommentSubmission();
