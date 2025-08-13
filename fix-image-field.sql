-- Fix image field migration for articles table
-- This ensures the image_url field exists and is properly configured

-- Add image_url field if it doesn't exist
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create index on image_url for better performance
CREATE INDEX IF NOT EXISTS idx_articles_image_url ON articles(image_url);

-- Update any existing articles that have image data but no image_url
UPDATE articles 
SET image_url = image 
WHERE image_url IS NULL AND image IS NOT NULL;

-- Add a comment to document the image_url field usage
COMMENT ON COLUMN articles.image_url IS 'URL or path to the article image. This is the primary field for article images.';

-- Verify the table structure
-- You can run this to see the current structure:
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'articles' 
-- AND column_name IN ('image', 'image_url')
-- ORDER BY ordinal_position;
