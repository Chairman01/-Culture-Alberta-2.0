-- Check all articles in Supabase
SELECT id, title, category, location, created_at 
FROM articles 
ORDER BY created_at DESC;
