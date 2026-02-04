import { supabase } from '../lib/supabase'

/**
 * Test script to verify comments functionality
 * Run with: npx tsx scripts/test-comments.ts
 */

async function testComments() {
    console.log('🧪 Testing Comments Feature...\n')

    // Test 1: Check if comments table exists
    console.log('1️⃣ Checking if comments table exists...')
    try {
        const { data, error } = await supabase
            .from('comments')
            .select('id')
            .limit(1)

        if (error) {
            console.error('❌ Comments table does not exist or is not accessible')
            console.error('Error:', error.message)
            console.log('\n📋 Please run SETUP-COMMENTS-TABLE.sql in Supabase SQL Editor')
            return
        }

        console.log('✅ Comments table exists and is accessible\n')
    } catch (err) {
        console.error('❌ Error checking table:', err)
        return
    }

    // Test 2: Try to insert a test comment
    console.log('2️⃣ Testing comment insertion...')
    const testArticleId = 'test-article-123'
    const testComment = {
        article_id: testArticleId,
        author_name: 'Test User',
        author_email: 'test@example.com',
        content: 'This is a test comment to verify the comments feature works correctly.',
        status: 'pending',
        ip_address: '127.0.0.1'
    }

    try {
        const { data: insertedComment, error: insertError } = await supabase
            .from('comments')
            .insert([testComment])
            .select()
            .single()

        if (insertError) {
            console.error('❌ Failed to insert test comment')
            console.error('Error:', insertError.message)
            console.error('Details:', insertError)
            return
        }

        console.log('✅ Test comment inserted successfully')
        console.log('Comment ID:', insertedComment.id)
        console.log('Status:', insertedComment.status, '\n')

        // Test 3: Try to fetch the comment
        console.log('3️⃣ Testing comment retrieval...')
        const { data: fetchedComments, error: fetchError } = await supabase
            .from('comments')
            .select('*')
            .eq('article_id', testArticleId)

        if (fetchError) {
            console.error('❌ Failed to fetch comments')
            console.error('Error:', fetchError.message)
            return
        }

        console.log('✅ Comments fetched successfully')
        console.log('Found', fetchedComments?.length || 0, 'comment(s)\n')

        // Test 4: Approve the comment
        console.log('4️⃣ Testing comment approval...')
        const { data: approvedComment, error: approveError } = await supabase
            .from('comments')
            .update({ status: 'approved' })
            .eq('id', insertedComment.id)
            .select()
            .single()

        if (approveError) {
            console.error('❌ Failed to approve comment')
            console.error('Error:', approveError.message)
            return
        }

        console.log('✅ Comment approved successfully')
        console.log('New status:', approvedComment.status, '\n')

        // Test 5: Fetch approved comments (public view)
        console.log('5️⃣ Testing public comment view (approved only)...')
        const { data: publicComments, error: publicError } = await supabase
            .from('comments')
            .select('id, author_name, content, created_at')
            .eq('article_id', testArticleId)
            .eq('status', 'approved')

        if (publicError) {
            console.error('❌ Failed to fetch public comments')
            console.error('Error:', publicError.message)
            return
        }

        console.log('✅ Public comments fetched successfully')
        console.log('Found', publicComments?.length || 0, 'approved comment(s)\n')

        // Clean up: Delete test comment
        console.log('6️⃣ Cleaning up test data...')
        const { error: deleteError } = await supabase
            .from('comments')
            .delete()
            .eq('id', insertedComment.id)

        if (deleteError) {
            console.error('⚠️ Warning: Could not delete test comment')
            console.error('Error:', deleteError.message)
            console.log('Please manually delete comment with ID:', insertedComment.id)
        } else {
            console.log('✅ Test comment deleted successfully\n')
        }

        // Summary
        console.log('='.repeat(50))
        console.log('🎉 All tests passed! Comments feature is working correctly.')
        console.log('='.repeat(50))
        console.log('\nNext steps:')
        console.log('1. Visit any article on your website')
        console.log('2. Scroll to the comments section')
        console.log('3. Submit a test comment')
        console.log('4. Go to Supabase → Table Editor → comments')
        console.log('5. Change the comment status from "pending" to "approved"')
        console.log('6. Refresh the article page to see your comment!\n')

    } catch (err) {
        console.error('❌ Unexpected error during testing:', err)
    }
}

// Run the tests
testComments()
    .then(() => {
        console.log('Test completed.')
        process.exit(0)
    })
    .catch((err) => {
        console.error('Fatal error:', err)
        process.exit(1)
    })
