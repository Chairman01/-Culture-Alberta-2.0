const fs = require('fs');

// Read the JSON file
const data = fs.readFileSync('temp_admin_articles.json', 'utf8');
const articles = JSON.parse(data);

console.log(`Loaded ${articles.length} articles`);

let fixed = 0;
articles.forEach(article => {
  if (article.title) {
    const oldTitle = article.title;
    // Fix common encoding issues
    article.title = article.title
      .replace(/â€™/g, "'")
      .replace(/â€œ/g, '"')
      .replace(/â€/g, '"')
      .replace(/â€"/g, '-')
      .replace(/â€"/g, '-')
      .replace(/€/g, '')
      .replace(/â€˜/g, "'")
      .replace(/â€"/g, '"')
      .replace(/â€"/g, '"')
      .replace(/â€"/g, "'")
      .replace(/â€"/g, "'");
    
    if (oldTitle !== article.title) {
      fixed++;
      console.log(`Fixed: ${article.title.substring(0, 60)}`);
    }
  }
  
  // Fix excerpt if it exists
  if (article.excerpt) {
    article.excerpt = article.excerpt
      .replace(/â€™/g, "'")
      .replace(/â€œ/g, '"')
      .replace(/â€/g, '"')
      .replace(/â€"/g, '-')
      .replace(/â€"/g, '-')
      .replace(/€/g, '')
      .replace(/â€˜/g, "'")
      .replace(/â€"/g, '"')
      .replace(/â€"/g, '"')
      .replace(/â€"/g, "'")
      .replace(/â€"/g, "'");
  }
  
  // Fix content if it exists
  if (article.content) {
    article.content = article.content
      .replace(/â€™/g, "'")
      .replace(/â€œ/g, '"')
      .replace(/â€/g, '"')
      .replace(/â€"/g, '-')
      .replace(/â€"/g, '-')
      .replace(/€/g, '')
      .replace(/â€˜/g, "'")
      .replace(/â€"/g, '"')
      .replace(/â€"/g, '"')
      .replace(/â€"/g, "'")
      .replace(/â€"/g, "'");
  }
});

console.log(`\nFixed ${fixed} titles`);

// Write to optimized-fallback.json
fs.writeFileSync('optimized-fallback.json', JSON.stringify(articles, null, 2), 'utf8');
console.log('✅ Saved optimized-fallback.json with fixed encoding');
