# Supabase Setup Guide

## ✅ Fixed: Correct Project URL
The Supabase project URL has been corrected to: `https://itdmwpbsnviassgqfhxk.supabase.co`

## Current Status
- ✅ DNS resolution working
- ✅ Project URL corrected
- ✅ Configuration updated
- ⚠️ Need to verify API key and table setup

## Steps to Complete Setup

### 1. Set Up Environment Variables
Create a `.env.local` file in your project root with:

```env
NEXT_PUBLIC_SUPABASE_URL=https://itdmwpbsnviassgqfhxk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo
```

### 2. Verify API Key
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/itdmwpbsnviassgqfhxk)
2. Navigate to Settings > API
3. Copy the `anon` public key
4. Update your `.env.local` file if the key is different

### 3. Create Required Tables
Run these SQL commands in your Supabase SQL Editor:

```sql
-- Create articles table
CREATE TABLE IF NOT EXISTS articles (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT,
  excerpt TEXT,
  image_url TEXT,
  category TEXT,
  featured BOOLEAN DEFAULT false,
  trending BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analytics tables
CREATE TABLE IF NOT EXISTS analytics_page_views (
  id SERIAL PRIMARY KEY,
  session_id TEXT,
  page_path TEXT,
  page_title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id SERIAL PRIMARY KEY,
  session_id TEXT,
  event_name TEXT,
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create newsletter table
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. Test the Connection
1. Restart your development server: `npm run dev`
2. Open browser console and look for:
   - ✅ "Supabase connection successful!"
   - ❌ Any error messages

### 5. Debug Page
Visit: `http://localhost:3000/debug` to see detailed connection status

## Fallback System
The application has a robust fallback system:
- If Supabase fails, it automatically uses file storage
- Articles are stored in `lib/data/articles.json`
- The system will work even if Supabase is completely down

## Troubleshooting

### If you still see connection errors:
1. Check that your `.env.local` file exists and has the correct values
2. Verify the API key in your Supabase dashboard
3. Ensure the tables exist in your Supabase database
4. Check the browser console for specific error messages

### Google AdSense Blocking
The AdSense blocking is normal when using ad blockers. This won't affect your site's functionality.

## Next Steps
1. Create the `.env.local` file with the correct configuration
2. Set up the database tables in Supabase
3. Test the connection
4. Your application should now work with both Supabase and fallback to file storage
