# Supabase Setup Guide

## Current Issue
The application is showing `Error fetching article from Supabase: {}` because the Supabase connection is failing. This guide will help you fix this issue.

## Steps to Fix

### 1. Check Supabase Connection
Visit the debug page at: `http://localhost:3003/debug`

This page will show you:
- Whether Supabase is connecting properly
- If the articles table exists
- What articles are available in both Supabase and file storage

### 2. Set Up Environment Variables
Create a `.env.local` file in your project root with:

```env
NEXT_PUBLIC_SUPABASE_URL=https://itdmwpbznviaszgqfxhk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo
```

### 3. Create the Articles Table
If the debug page shows "Articles Table Status: Missing", you need to create the table in Supabase:

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Run the SQL from `create-articles-table.sql`

### 4. Test the Connection
After setting up the environment variables and creating the table:

1. Restart your development server: `npm run dev`
2. Visit the debug page again: `http://localhost:3003/debug`
3. Check the browser console for detailed logs

## Fallback System
The application has a robust fallback system:
- If Supabase fails, it automatically uses file storage
- Articles are stored in `lib/data/articles.json`
- The system will work even if Supabase is completely down

## Current Status
- ✅ File storage is working (articles.json has sample data)
- ✅ Error handling is improved with detailed logging
- ✅ Fallback system is in place
- ⚠️ Supabase connection needs to be configured

## Next Steps
1. Visit `/debug` to see the current status
2. Set up environment variables if needed
3. Create the articles table in Supabase if missing
4. Test the connection again

The application should work properly once these steps are completed, and articles will no longer be deleted.
