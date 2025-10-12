const fs = require('fs');
const path = require('path');

console.log('🔍 Testing current data sources...\n');

// Test articles.json
try {
  const articlesJsonPath = path.join(__dirname, 'lib', 'data', 'articles.json');
  if (fs.existsSync(articlesJsonPath)) {
    const fileContent = fs.readFileSync(articlesJsonPath, 'utf-8');
    const articles = JSON.parse(fileContent);
    
    console.log(`✅ articles.json: ${articles.length} articles`);
    
    // Get the latest 5 articles
    const latestArticles = articles
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
    
    console.log('\n📅 Latest 5 articles:');
    latestArticles.forEach((article, index) => {
      console.log(`${index + 1}. ${article.title}`);
      console.log(`   Date: ${article.createdAt}`);
      console.log(`   Category: ${article.category}`);
      console.log('');
    });
  } else {
    console.log('❌ articles.json not found');
  }
} catch (error) {
  console.error('❌ Error reading articles.json:', error.message);
}

// Test root articles.json
try {
  const rootArticlesPath = path.join(__dirname, 'articles.json');
  if (fs.existsSync(rootArticlesPath)) {
    const fileContent = fs.readFileSync(rootArticlesPath, 'utf-8');
    const articles = JSON.parse(fileContent);
    
    console.log(`✅ Root articles.json: ${articles.length} articles`);
    
    // Get the latest 5 articles
    const latestArticles = articles
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
    
    console.log('\n📅 Latest 5 articles from root:');
    latestArticles.forEach((article, index) => {
      console.log(`${index + 1}. ${article.title}`);
      console.log(`   Date: ${article.createdAt}`);
      console.log(`   Category: ${article.category}`);
      console.log('');
    });
  } else {
    console.log('❌ Root articles.json not found');
  }
} catch (error) {
  console.error('❌ Error reading root articles.json:', error.message);
}

console.log('🏁 Data test complete!');
