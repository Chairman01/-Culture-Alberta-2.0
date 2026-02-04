# How to Enable Comments on Your Website

## Quick Setup (5 minutes)

### Step 1: Create the Comments Table in Supabase

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your Culture Alberta project

2. **Open SQL Editor**
   - Click **"SQL Editor"** in the left sidebar
   - Click **"New Query"**

3. **Run the SQL**
   - Open the file: [`SETUP-COMMENTS-TABLE.sql`](file:///c:/Users/Admin/Documents/Culturealberta/SETUP-COMMENTS-TABLE.sql)
   - Copy **ALL** the SQL code
   - Paste it into the Supabase SQL Editor
   - Click **"Run"** (or press `Ctrl+Enter`)

4. **Verify Success**
   - You should see: `"Success. No rows returned"`
   - The message should also show: `"Comments table created successfully!"`

### Step 2: Test the Setup (Optional but Recommended)

Run this command in your terminal:

```bash
npx tsx scripts/test-comments.ts
```

This will verify:
- ✅ Comments table exists
- ✅ Can insert comments
- ✅ Can fetch comments
- ✅ RLS policies work correctly

### Step 3: Test on Your Live Website

1. **Visit any article** on your website
2. **Scroll down** to the comments section
3. **Fill out the form**:
   - Name: Your name
   - Email: (optional)
   - Comment: Write a test comment
4. **Click "Post Comment"**
5. **You should see**: "Thank you! Your comment has been submitted and will appear after moderation."

### Step 4: Approve Comments

Comments start as "pending" and need approval before they appear publicly:

1. **Go to Supabase Dashboard**
2. **Click "Table Editor"** in the left sidebar
3. **Select "comments" table**
4. **Find your comment** in the list
5. **Click on the "status" cell** for that comment
6. **Change from "pending" to "approved"**
7. **Refresh your article page** - the comment should now appear!

---

## Managing Comments

### View All Comments
- Supabase Dashboard → Table Editor → comments

### Approve a Comment
- Find the comment → Change status to "approved"

### Reject a Comment
- Find the comment → Change status to "rejected"

### Delete a Comment
- Find the comment → Click the delete icon (trash can)

---

## Troubleshooting

### "Failed to submit comment"
- Check that you ran the SQL in Supabase
- Verify the comments table exists in Table Editor
- Run the test script: `npx tsx scripts/test-comments.ts`

### Comments don't appear after approval
- Make sure status is exactly "approved" (lowercase)
- Refresh the page (Ctrl+R or Cmd+R)
- Clear browser cache

### Need Help?
- Check the implementation plan: [`implementation_plan.md`](file:///C:/Users/Admin/.gemini/antigravity/brain/d30d4029-3d94-4e30-a2cf-9b039a21ae9f/implementation_plan.md)
- Run the test script for detailed diagnostics

---

## What Happens Behind the Scenes

1. **User submits comment** → Saved to Supabase with status "pending"
2. **You approve it** → Status changes to "approved"
3. **Comment appears** → Only approved comments show on the website
4. **Spam protection** → IP addresses are logged for spam prevention

All comments are moderated to keep your site safe and professional! 🛡️
