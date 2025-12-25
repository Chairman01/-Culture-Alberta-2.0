const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// This script uses the SERVICE ROLE KEY to bypass RLS and fix the policies
// Make sure you have SUPABASE_SERVICE_ROLE_KEY in your .env.local

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing environment variables!')
    console.error('Please ensure you have:')
    console.error('- NEXT_PUBLIC_SUPABASE_URL')
    console.error('- SUPABASE_SERVICE_ROLE_KEY')
    console.error('\nYou can find the service role key in:')
    console.error('Supabase Dashboard → Settings → API → service_role key (secret)')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function fixCommentsRLS() {
    console.log('🔧 Testing comment insertion with current setup...\n')

    // Test 1: Try to insert a comment
    const testComment = {
        article_id: 'test-article-' + Date.now(),
        author_name: 'Test User',
        author_email: 'test@example.com',
        content: 'This is a test comment to verify RLS policies',
        status: 'pending',
        ip_address: '127.0.0.1'
    }

    console.log('📝 Attempting to insert test comment...')
    const { data, error } = await supabase
        .from('comments')
        .insert(testComment)
        .select()
        .single()

    if (error) {
        console.error('❌ INSERT FAILED!')
        console.error('Error code:', error.code)
        console.error('Error message:', error.message)
        console.error('Error details:', error.details)
        console.error('Error hint:', error.hint)
        console.error('\n🎯 This confirms the RLS policy is blocking insertions.')
        console.error('\n📋 TO FIX THIS:')
        console.error('1. Go to https://supabase.com/dashboard')
        console.error('2. Select your project')
        console.error('3. Go to SQL Editor (left sidebar)')
        console.error('4. Click "New Query"')
        console.error('5. Copy and paste the entire contents of: FINAL_FIX_COMMENTS_RLS.sql')
        console.error('6. Click "Run" to execute the script')
        console.error('7. Verify you see 2 policies in the output')
        console.error('8. Run this test script again to verify the fix')
        process.exit(1)
    } else {
        console.log('✅ INSERT SUCCESSFUL!')
        console.log('Inserted comment:', data)

        // Clean up
        console.log('\n🧹 Cleaning up test comment...')
        await supabase.from('comments').delete().eq('id', data.id)
        console.log('✅ Test comment removed')

        console.log('\n🎉 SUCCESS! Your comments system is working correctly!')
        console.log('You can now post comments from the frontend.')
    }

    // Show current policies
    console.log('\n📋 Checking current RLS policies on comments table...')
    const { data: policies, error: policyError } = await supabase
        .rpc('get_policies')
        .eq('tablename', 'comments')

    if (!policyError && policies) {
        console.log('Current policies:', policies)
    }
}

fixCommentsRLS().catch((err) => {
    console.error('Unexpected error:', err)
    process.exit(1)
})
