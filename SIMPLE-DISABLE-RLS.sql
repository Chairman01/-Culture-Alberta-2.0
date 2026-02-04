-- Simple test: Disable RLS completely
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;

SELECT 'RLS disabled. Try posting a comment on your website now!' as message;
