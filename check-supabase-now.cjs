require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSupabase() {
  console.log('=== CHECKING SUPABASE DATA ===\n');
  
  const { data, error } = await supabase
    .from('articles')
    .select('title, created_at, date')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${data.length} articles:\n`);
  data.forEach((article, i) => {
    console.log(`${i + 1}. ${article.title}`);
    console.log(`   Created: ${article.created_at}`);
    console.log(`   Date: ${article.date}\n`);
  });
}

checkSupabase();

