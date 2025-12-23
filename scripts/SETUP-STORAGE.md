# 🚀 Quick Supabase Storage Setup

## Before Running Migration

You need to create a storage bucket in Supabase. Takes 30 seconds!

### Steps:

1. **Go to Supabase Storage:**
   - https://supabase.com/dashboard/project/itdmwpbsnviassgqfhxk/storage/buckets

2. **Click "New Bucket"**

3. **Configure:**
   - **Name:** `images`
   - **Public:** ✅ **YES** (Check this box!)
   - **File size limit:** 50MB (default is fine)

4. **Click "Create Bucket"**

---

## After Creating Bucket

Reply with "done" and I'll run the test migration!

---

## What Happens Next:

1. **Test migration** (5 articles)
2. **Verify** images display correctly
3. **Full migration** (all 32 articles)
4. **Monitor** bandwidth drop in Vercel

---

> [!IMPORTANT]
> The bucket MUST be **Public** or images won't display on your website!
