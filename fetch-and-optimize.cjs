const fetch = require('node-fetch');

async function fetchAndOptimize() {
  try {
    console.log('🔍 Fetching article count from localhost API...\n');
    
    const response = await fetch('http://localhost:3000/api/count-all-articles');
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Supabase Database Stats:');
      console.log(`   Total items: ${data.total}`);
      console.log(`   Articles: ${data.breakdown.articles}`);
      console.log(`   Events: ${data.breakdown.events}`);
      console.log(`   Published: ${data.breakdown.published}`);
      console.log(`   Drafts: ${data.breakdown.drafts}`);
      console.log('\n📋 Most Recent 10 Items:\n');
      
      data.recentItems.forEach((item, i) => {
        const type = item.type === 'event' ? '📅 EVENT' : '📄 ARTICLE';
        console.log(`${i + 1}. ${type}: ${item.title}`);
        console.log(`   Status: ${item.status} | Created: ${item.created_at}\n`);
      });
    } else {
      console.error('❌ Error:', data.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fetchAndOptimize();

