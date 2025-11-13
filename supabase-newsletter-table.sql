-- Create newsletter_subscriptions table with email and city as separate columns
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  city VARCHAR(100) NOT NULL,
  province VARCHAR(50) DEFAULT 'Alberta',
  country VARCHAR(50) DEFAULT 'Canada',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_email ON newsletter_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_city ON newsletter_subscriptions(city);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_status ON newsletter_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_created_at ON newsletter_subscriptions(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations on newsletter_subscriptions
CREATE POLICY "Allow all operations on newsletter_subscriptions" ON newsletter_subscriptions FOR ALL USING (true);

-- Optional: Insert some test data (you can remove this after testing)
-- INSERT INTO newsletter_subscriptions (email, city, status) VALUES 
--   ('test@example.com', 'calgary', 'active'),
--   ('test2@example.com', 'edmonton', 'active');
