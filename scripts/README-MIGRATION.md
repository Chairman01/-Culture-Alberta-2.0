# Image Migration Script

This script migrates base64-encoded images from the `articles` table to Supabase Storage.

## Prerequisites

1. **Supabase Storage Bucket**: Create a bucket named `images` in your Supabase project
   - Go to Storage in Supabase Dashboard
   - Click "New Bucket"
   - Name: `images`
   - Make it public

## Usage

### 1. Dry Run (Recommended First Step)
See what will be migrated WITHOUT making changes:
```bash
npx ts-node scripts/migrate-images.ts --dry-run
```

### 2. Test Mode (Migrate 5 Articles)
Test on first 5 articles only:
```bash
npx ts-node scripts/migrate-images.ts --test
```

### 3. Full Migration
Migrate ALL articles with base64 images:
```bash
npx ts-node scripts/migrate-images.ts
```

## What It Does

1. **Queries** all articles from Supabase
2. **Identifies** articles with base64 images (either `data:image/...` or raw base64 strings)
3. **Converts** base64 → Buffer
4. **Uploads** to Supabase Storage (`images` bucket, `article-images/` folder)
5. **Updates** article record with new storage URL
6. **Backs up** old URLs to JSON file

## Safety Features

- ✅ **Dry run mode** - preview changes without modifying data
- ✅ **Test mode** - test on 5 articles first
- ✅ **Automatic backups** - saves old URLs before migration
- ✅ **Error handling** - continues on errors, logs failures
- ✅ **Progress tracking** - shows real-time progress
- ✅ **Rate limiting** - 500ms delay between uploads

## Output

The script creates a backup file:
```
scripts/image-migration-backup-<timestamp>.json
```

This contains:
- Article ID and title
- Old image URL (truncated)
- New storage URL
- Any errors encountered

## Rollback

If you need to restore old URLs:
1. Find the backup file
2. Use the `id` and `old_image_url` to update articles manually

## Expected Results

**Before:**
- Page size: 3.5 MB (base64 embedded)
- Bandwidth: 2 GB/day

**After:**
- Page size: 50-80 KB (URL only)
- Bandwidth: 500 MB - 1 GB/day
- **Savings: 60-75% reduction!** 🎉

## Troubleshooting

### "Storage upload failed"
- Make sure the `images` bucket exists in Supabase
- Make sure the bucket is **public**

### "Database update failed"
- Check that your Supabase anon key has UPDATE permissions on the `articles` table

### Rate limit errors
- The script already includes 500ms delays
- If needed, increase the delay in the code
