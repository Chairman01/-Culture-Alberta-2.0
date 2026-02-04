# Testing Comments - Quick Guide

The test script is failing, but this might be a configuration issue with the test script itself, not the actual comments feature.

## Let's Test on Your Live Website Instead

1. **Go to any article** on your website (e.g., https://culturealberta.com/articles/[any-article-slug])

2. **Scroll to the comments section** at the bottom

3. **Fill out the form:**
   - Name: Test User
   - Email: (leave blank or add test@example.com)
   - Comment: This is a test comment

4. **Click "Post Comment"**

5. **What to expect:**
   - ✅ Success message: "Thank you! Your comment has been submitted and will appear after moderation."
   - ❌ Error message: "Failed to submit comment"

## If It Works on the Website

That means the RLS policies are correct and the test script has a configuration issue (probably using the wrong Supabase key).

## If It Doesn't Work

Then we need to temporarily disable RLS to isolate the issue. Run [`DISABLE-RLS-TEST.sql`](file:///c:/Users/Admin/Documents/Culturealberta/DISABLE-RLS-TEST.sql) in Supabase.

## After Testing

Let me know what happens and we'll proceed from there!
