-- Migration script to update existing newsletter_subscriptions table
-- This script will rename 'location' to 'city' and add new columns

-- Step 1: Add new columns (if they don't exist)
ALTER TABLE newsletter_subscriptions 
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS province VARCHAR(50) DEFAULT 'Alberta',
ADD COLUMN IF NOT EXISTS country VARCHAR(50) DEFAULT 'Canada';

-- Step 2: Copy data from 'location' to 'city' (if location column exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'newsletter_subscriptions' 
               AND column_name = 'location') THEN
        UPDATE newsletter_subscriptions 
        SET city = location 
        WHERE city IS NULL;
        
        -- Drop the old location column
        ALTER TABLE newsletter_subscriptions DROP COLUMN location;
    END IF;
END $$;

-- Step 3: Make city column NOT NULL after data migration
ALTER TABLE newsletter_subscriptions ALTER COLUMN city SET NOT NULL;

-- Step 4: Update indexes
DROP INDEX IF EXISTS idx_newsletter_subscriptions_location;
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_city ON newsletter_subscriptions(city);

-- Step 5: Ensure other indexes exist
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_email ON newsletter_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_status ON newsletter_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_created_at ON newsletter_subscriptions(created_at);

-- Step 6: Verify the table structure
-- You can run this to see the current structure:
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'newsletter_subscriptions' 
-- ORDER BY ordinal_position;
