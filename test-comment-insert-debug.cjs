// Test comment insertion with detailed error logging
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://itdmwpbsnviassgqfhxk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
    db: {
        schema: 'public',
    },
});

async function testCommentInsert() {
    console.log('🧪 Testing comment insertion...\n');

    const testComment = {
        article_id: 'article-1766120131469-z2bfjh5km',
        author_name: 'Debug Test',
        author_email: 'debug@test.com',
        content: 'Testing detailed error logging from CJS script',
        status: 'pending',
        ip_address: '127.0.0.1',
    };

    console.log('📝 Attempting to insert comment:', testComment);

    const { data, error } = await supabase
        .from('comments')
        .insert([testComment])
        .select()
        .single();

    if (error) {
        console.error('\n❌ Error inserting comment:');
        console.error('- Full error object:', JSON.stringify(error, null, 2));
        console.error('- Error code:', error.code);
        console.error('- Error message:', error.message);
        console.error('- Error details:', error.details);
        console.error('- Error hint:', error.hint);
        console.error('- Error status:', error.status);
        process.exit(1);
    }

    console.log('\n✅ Comment inserted successfully!');
    console.log('- Comment data:', JSON.stringify(data, null, 2));
}

testCommentInsert();
