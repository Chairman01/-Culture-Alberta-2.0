# Cache Refresh Guide

## Problem
When you add new articles to Supabase, they don't appear immediately on the website because of caching. The cache improves performance but prevents newest articles from showing right away.

## Solution
We've implemented a simple **Refresh Cache** system that lets you force the site to show the newest articles without breaking anything.

## How to Use

### Option 1: Admin Dashboard Button (Easiest!)
1. Go to **Admin Dashboard** at `http://localhost:3000/admin/dashboard`
2. Click the **"Refresh Cache"** button in the top right
3. Wait for the success message: "✅ Cache refreshed! Newest articles will now show."
4. Refresh your browser on any page to see the newest articles

### Option 2: Direct API Call
You can also call the refresh API directly in your browser:
- **URL**: `http://localhost:3000/api/refresh-cache`
- Just visit this URL in your browser and you'll see a JSON response

### Option 3: Command Line (PowerShell)
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/refresh-cache" -Method POST
```

## What It Does

The refresh cache system:
1. **Clears in-memory cache** - Removes stored articles from server memory
2. **Clears Next.js cache** - Revalidates all main pages (home, edmonton, calgary, etc.)
3. **Forces fresh data** - Next page load will fetch newest articles from Supabase

## Automatic Refresh

The cache also refreshes automatically:
- **Development**: Every 10 seconds (very fast!)
- **Production**: Every 1 hour (for performance)

So in development, if you wait 10 seconds and refresh your browser, you'll see new articles automatically.

## When to Use

Use the refresh cache button when:
- ✅ You just added a new article in Supabase
- ✅ You edited an existing article
- ✅ You want to see the newest content immediately
- ✅ The homepage/city pages aren't showing the latest articles

## What's Working Now

✅ **All images show correctly** - No more placeholders  
✅ **Filtering works** - Articles appear on the right city pages  
✅ **Server-side rendering** - Fast page loads  
✅ **Automatic sync** - Cache refreshes every 10 seconds in dev  
✅ **Manual refresh** - Click button when you need instant updates  

## Technical Details

- **Cache Duration**: 10 seconds (dev), 1 hour (production)
- **API Endpoint**: `/api/refresh-cache`
- **Clears**: Articles cache, city cache, Next.js page cache
- **Affected Pages**: Home, Edmonton, Calgary, Food & Drink, Culture, Events, Articles

This is the best solution because:
1. **Keeps performance** - Site loads fast with caching
2. **Allows updates** - You can force fresh data when needed
3. **No breaking changes** - All images and filtering still work
4. **Simple to use** - Just click a button!

