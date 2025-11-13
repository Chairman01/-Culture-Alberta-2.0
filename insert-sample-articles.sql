-- Insert sample articles into the Supabase table
-- This will populate the table with the articles from articles.json

INSERT INTO articles (id, title, content, excerpt, category, location, author, date, type, status, image, created_at, updated_at) VALUES
(
  'article-1',
  'Welcome to Cultural Alberta',
  'Edmonton, the capital city of Alberta, is a vibrant cultural hub that offers visitors and residents alike a rich tapestry of arts, history, and community experiences.',
  'Discover the rich cultural heritage and vibrant arts scene of Alberta''s capital city.',
  'Edmonton',
  'Edmonton, Alberta',
  'Cultural Alberta Team',
  '2024-01-15T10:00:00.000Z',
  'article',
  'published',
  '/images/edmonton-culture.jpg',
  '2024-01-15T10:00:00.000Z',
  '2024-01-15T10:00:00.000Z'
),
(
  'article-2',
  'Calgary''s Cultural Renaissance',
  'Calgary, Alberta''s largest city, is experiencing an exciting cultural renaissance that''s transforming it into one of Canada''s most vibrant arts destinations.',
  'Explore Calgary''s dynamic arts scene and cultural transformation in the heart of the Canadian Rockies.',
  'Calgary',
  'Calgary, Alberta',
  'Cultural Alberta Team',
  '2024-01-20T14:30:00.000Z',
  'article',
  'published',
  '/images/calgary-culture.jpg',
  '2024-01-20T14:30:00.000Z',
  '2024-01-20T14:30:00.000Z'
);
