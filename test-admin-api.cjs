const fetch = require('node-fetch');

async function testAdminAPI() {
  try {
    console.log('🔧 Testing admin articles API...');
    
    const response = await fetch('http://localhost:3000/api/admin/articles');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const articles = await response.json();
    console.log(`📊 Admin API returned ${articles.length} articles`);
    
    // Look for the Maria Wozniak article
    const mariaArticle = articles.find(article => 
      article.title.includes('Maria Wozniak')
    );
    
    if (mariaArticle) {
      console.log('\n✅ Maria Wozniak article found in admin API:');
      console.log(`- ID: ${mariaArticle.id}`);
      console.log(`- Title: ${mariaArticle.title}`);
      console.log(`- Type: ${mariaArticle.type}`);
      console.log(`- Status: ${mariaArticle.status}`);
    } else {
      console.log('\n❌ Maria Wozniak article NOT found in admin API');
    }
    
    // List first 5 articles
    console.log('\n📋 First 5 articles from admin API:');
    articles.slice(0, 5).forEach((article, index) => {
      console.log(`${index + 1}. ${article.title} (${article.type})`);
    });
    
  } catch (error) {
    console.error('❌ Error testing admin API:', error.message);
  }
}

testAdminAPI();
