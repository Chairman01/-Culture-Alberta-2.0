// Fix the comments RLS policy
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY  // Use service role key to bypass RLS
)

async function fixRLS() {
    console.log('🔧 Fixing comments RLS policies...\n')

    const statements = [
        // Drop all existing policies
        `DROP POLICY IF EXISTS "Comments are viewable by everyone" ON comments`,
        `DROP POLICY IF EXISTS "Enable read access for all users" ON comments`,
        `DROP POLICY IF EXISTS "Enable insert for all users" ON comments`,
        `DROP POLICY IF EXISTS "Allow public to insert comments" ON comments`,
        `DROP POLICY IF EXISTS "Anyone can insert comments" ON comments`,
        `DROP POLICY IF EXISTS "Allow authenticated and anon to insert" ON comments`,
        `DROP POLICY IF EXISTS "allow_read_approved_comments" ON comments`,
        `DROP POLICY IF EXISTS "allow_insert_comments" ON comments`,

        // Disable RLS temporarily
        `ALTER TABLE comments DISABLE ROW LEVEL SECURITY`,

        // Re-enable RLS
        `ALTER TABLE comments ENABLE ROW LEVEL SECURITY`,

        // Create new permissive policies
        `CREATE POLICY "allow_read_approved_comments" ON comments FOR SELECT USING (status = 'approved')`,
        `CREATE POLICY "allow_insert_comments" ON comments FOR INSERT WITH CHECK (true)`
    ]

    for (const sql of statements) {
        console.log(`Executing: ${sql}`)
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql })

        if (error) {
            // Try direct query instead
            const { error: error2 } = await supabase.from('_sql').select(sql)
            if (error2) {
                console.error(`❌ Error: ${error.message || error2.message}`)
                // Some errors are expected (like DROP IF EXISTS when policy doesn't exist)
                if (!sql.includes('DROP POLICY IF EXISTS')) {
                    console.error('This is a real error!')
                }
            }
        } else {
            console.log('✅ Success')
        }
        console.log('')
    }

    // Verify the policies
    console.log('\n📋 Verifying policies...')
    const { data: policies, error } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'comments')

    if (error) {
        console.error('Could not verify policies:', error)
    } else {
        console.log('Current policies:')
        console.log(JSON.stringify(policies, null, 2))
    }

    // Test insert
    console.log('\n🧪 Testing comment insert...')
    const { data, error: insertError } = await supabase
        .from('comments')
        .insert({
            article_id: 'test-article',
            author_name: 'Test User',
            author_email: 'test@example.com',
            content: 'This is a test comment',
            status: 'pending',
            ip_address: '127.0.0.1'
        })
        .select()

    if (insertError) {
        console.error('❌ Insert test failed:', insertError)
    } else {
        console.log('✅ Insert test succeeded!')
        console.log('Inserted comment:', data)

        // Clean up test
        if (data && data[0]) {
            await supabase.from('comments').delete().eq('id', data[0].id)
            console.log('🧹 Cleaned up test comment')
        }
    }
}

fixRLS().catch(console.error)
