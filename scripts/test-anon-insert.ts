// Test script to verify anon role can insert comments
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://itdmwpbsnviassgqfhxk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

// Create client with anon key (same as API route)
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
})

async function testInsert() {
    console.log('🧪 Testing anon role insert via Supabase client...')

    const testComment = {
        article_id: 'test-article-anon-123',
        author_name: 'Test Anon User',
        author_email: 'testanon@example.com',
        content: 'This is a test comment from anon role',
        status: 'pending',
        ip_address: '127.0.0.1',
    }

    console.log('📝 Inserting:', testComment)

    const { data, error } = await supabase
        .from('comments')
        .insert([testComment])
        .select()
        .single()

    if (error) {
        console.error('❌ Insert failed:')
        console.error('Error code:', error.code)
        console.error('Error message:', error.message)
        console.error('Error details:', error.details)
        console.error('Error hint:', error.hint)
        process.exit(1)
    }

    console.log('✅ Insert successful!')
    console.log('Inserted comment:', data)

    // Clean up - delete the test comment
    const { error: deleteError } = await supabase
        .from('comments')
        .delete()
        .eq('id', data.id)

    if (deleteError) {
        console.log('⚠️ Could not delete test comment (expected if RLS prevents it)')
    } else {
        console.log('🗑️ Test comment cleaned up')
    }
}

testInsert().catch(console.error)
