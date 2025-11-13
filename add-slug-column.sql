-- Add slug column to articles table for SEO-friendly URLs
-- Run this script in Supabase SQL Editor

-- Add slug column if it doesn't exist
ALTER TABLE articles ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create unique index on slug for fast lookups and uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_slug_unique ON articles(slug) WHERE slug IS NOT NULL;

-- Create regular index on slug for general queries
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);

-- Update existing articles to have slugs based on their titles
-- This will generate SEO-friendly slugs for existing articles
UPDATE articles 
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(title, '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
      ),
      '-+', '-', 'g'
    ),
    '^-|-$', '', 'g'
  )
)
WHERE slug IS NULL OR slug = '';

-- Add a function to generate unique slugs
CREATE OR REPLACE FUNCTION generate_unique_slug(base_slug TEXT, article_id TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    final_slug TEXT;
    counter INTEGER := 1;
BEGIN
    final_slug := base_slug;
    
    -- Check if slug already exists (excluding current article if updating)
    WHILE EXISTS (
        SELECT 1 FROM articles 
        WHERE slug = final_slug 
        AND (article_id IS NULL OR id != article_id)
    ) LOOP
        final_slug := base_slug || '-' || counter;
        counter := counter + 1;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to automatically generate slugs when title changes
CREATE OR REPLACE FUNCTION auto_generate_slug()
RETURNS TRIGGER AS $$
BEGIN
    -- Only generate slug if it's not already set or if title changed
    IF NEW.slug IS NULL OR NEW.slug = '' OR (OLD.title IS DISTINCT FROM NEW.title AND NEW.slug = OLD.slug) THEN
        NEW.slug := generate_unique_slug(
            LOWER(
                REGEXP_REPLACE(
                    REGEXP_REPLACE(
                        REGEXP_REPLACE(
                            REGEXP_REPLACE(NEW.title, '[^a-zA-Z0-9\s-]', '', 'g'),
                            '\s+', '-', 'g'
                        ),
                        '-+', '-', 'g'
                    ),
                    '^-|-$', '', 'g'
                )
            ),
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic slug generation
DROP TRIGGER IF EXISTS trigger_auto_generate_slug ON articles;
CREATE TRIGGER trigger_auto_generate_slug
    BEFORE INSERT OR UPDATE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_slug();

-- Add comment to document the slug column
COMMENT ON COLUMN articles.slug IS 'SEO-friendly URL slug generated from article title';
