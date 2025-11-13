// Test script to check Edmonton articles
const fs = require('fs');
const path = require('path');

// Read the articles.json file
const articlesPath = path.join(__dirname, 'lib', 'data', 'articles.json');
const articles = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));

console.log('Total articles in file:', articles.length);

// Filter Edmonton articles
const edmontonArticles = articles.filter((article) => {
  const hasEdmontonCategory = article.category?.toLowerCase().includes('edmonton');
  const hasEdmontonLocation = article.location?.toLowerCase().includes('edmonton');
  const hasEdmontonCategories = article.categories?.some((cat) => 
    cat.toLowerCase().includes('edmonton')
  );
  const hasEdmontonTags = article.tags?.some((tag) => 
    tag.toLowerCase().includes('edmonton')
  );
  
  return hasEdmontonCategory || hasEdmontonLocation || hasEdmontonCategories || hasEdmontonTags;
});

console.log('Edmonton articles found:', edmontonArticles.length);

// Sort by date (newest first)
edmontonArticles.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

console.log('\nTop 5 newest Edmonton articles:');
edmontonArticles.slice(0, 5).forEach((article, index) => {
  console.log(`${index + 1}. ${article.title}`);
  console.log(`   Date: ${article.date || article.createdAt}`);
  console.log(`   Category: ${article.category}`);
  console.log(`   Location: ${article.location}`);
  console.log('');
});

// Check for specific articles
const specificTitles = [
  'Caught on Camera: Edmonton Delivery Driver',
  'Edmonton Designer Maria Wozniak',
  'Must-Eat Places in Edmonton'
];

console.log('\nChecking for specific articles:');
specificTitles.forEach(title => {
  const found = edmontonArticles.find(article => 
    article.title.includes(title.split(':')[0]) || 
    article.title.includes(title.split(' ')[0])
  );
  if (found) {
    console.log(`✅ Found: ${found.title}`);
    console.log(`   Date: ${found.date || found.createdAt}`);
  } else {
    console.log(`❌ Not found: ${title}`);
  }
});
