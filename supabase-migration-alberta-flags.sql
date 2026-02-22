-- Add Alberta trending and featured columns to articles table
-- Run this in your Supabase SQL editor if you get errors when creating/editing articles

ALTER TABLE articles ADD COLUMN IF NOT EXISTS trending_alberta boolean DEFAULT false;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS featured_alberta boolean DEFAULT false;
