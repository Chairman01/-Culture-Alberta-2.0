# 🔧 FIX: Comments Failing to Submit (RLS Policy Issue)

## Problem
When users try to post comments, the request fails with:
```
Error: new row violates row-level security policy for table "comments"
```

This happens because Supabase Row Level Security (RLS) policies are blocking anonymous users from inserting comments.

## Solution

### Option 1: Run SQL Script in Supabase Dashboard (RECOMMENDED)

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard
   - Select your project
   - Click on **"SQL Editor"** in the left sidebar
   - Click **"New Query"**

2. **Copy and Paste the Fix Script**
   - Open the file: `FINAL_FIX_COMMENTS_RLS.sql` (in this directory)
   - Copy the ENTIRE content
   - Paste it into the SQL Editor

3. **Run the Script**
   - Click the **"Run"** button (or press `Ctrl+Enter`)
   - Wait for it to complete

4. **Verify Success**
   - You should see a table showing 2 policies:
     - `allow_read_approved_comments` (SELECT)
     - `allow_insert_comments` (INSERT)

5. **Test the Fix**
   - Go back to your website
   - Try posting a comment
   - It should work now!

### Option 2: Add Service Role Key (For Automated Fix)

If you want to run the test script instead:

1. **Get your Service Role Key**
   - Go to: https://supabase.com/dashboard
   - Select your project
   - Go to **Settings** → **API**
   - Find **"service_role key"** in the "Project API keys" section
   - Copy the key (it's hidden by default - click to reveal)

2. **Add to .env.local**
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

3. **Run the Test Script**
   ```bash
   node test-comments-fix.cjs
   ```

   This will:
   - Test if comment insertion works
   - Show you the exact error if it doesn't
   - Provide guidance on next steps

## What the Fix Does

The SQL script:
1. ✅ Drops all conflicting/old RLS policies
2. ✅ Temporarily disables RLS to clear any stuck state
3. ✅ Re-enables RLS
4. ✅ Creates two new policies:
   - **Reading**: Anyone can read approved comments
   - **Inserting**: Anyone (including anonymous users) can insert comments

## After the Fix

Once the RLS policies are fixed:
- ✅ Users can post comments without logging in
- ✅ Comments are stored with status "pending"
- ✅ Only approved comments are visible to readers
- ✅ The error message should disappear

## Still Having Issues?

If the fix doesn't work:

1. **Check the policies were created:**
   - Run this query in Supabase SQL Editor:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'comments';
   ```
   - You should see exactly 2 policies

2. **Check RLS is enabled:**
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename = 'comments';
   ```
   - `rowsecurity` should be `true`

3. **Try the browser test again:**
   - Open DevTools → Network tab
   - Try posting a comment
   - Check the response from `/api/comments`
   - Share the error message

## Files Created for This Fix

- `FINAL_FIX_COMMENTS_RLS.sql` - The SQL script to run in Supabase
- `test-comments-fix.cjs` - Test script (requires service role key)
- `fix-comments-rls-final.sql` - Alternative SQL format
- `fix-rls.cjs` - Alternative test script
- `README_COMMENTS_FIX.md` - This file
