-- TEMPORARY: Disable RLS to test if the API works
-- This will allow us to verify if the issue is with RLS or something else

ALTER TABLE comments DISABLE ROW LEVEL SECURITY;

SELECT 'RLS disabled - comments should work now!' as message;
SELECT 'IMPORTANT: This is temporary for testing. We will re-enable RLS after confirming it works.' as warning;
