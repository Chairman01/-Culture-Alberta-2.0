-- Add support for multiple images in articles table
-- This script adds a new column to store multiple image URLs as JSON

-- Add the multiple_images column as JSONB to store array of image objects
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS multiple_images JSONB DEFAULT '[]'::jsonb;

-- Add a comment to explain the structure
COMMENT ON COLUMN articles.multiple_images IS 'Array of image objects with structure: [{"url": "image_url", "alt": "alt_text", "caption": "caption_text"}]';

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_articles_multiple_images ON articles USING GIN (multiple_images);

-- Update existing articles to have empty multiple_images array if they don't have it
UPDATE articles 
SET multiple_images = '[]'::jsonb 
WHERE multiple_images IS NULL;

-- Example of how the multiple_images column will store data:
-- [
--   {
--     "url": "https://example.com/image1.jpg",
--     "alt": "Edmonton skyline",
--     "caption": "Beautiful view of downtown Edmonton",
--     "order": 1
--   },
--   {
--     "url": "https://example.com/image2.jpg", 
--     "alt": "Calgary tower",
--     "caption": "Calgary Tower at sunset",
--     "order": 2
--   }
-- ]
