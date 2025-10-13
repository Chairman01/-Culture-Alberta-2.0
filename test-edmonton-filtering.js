const fs = require('fs');

// Test the Edmonton filtering logic
async function testEdmontonFiltering() {
  try {
    // Read the optimized fallback
    const fallbackData = JSON.parse(fs.readFileSync('optimized-fallback.json', 'utf8'));
    console.log(`📊 Total articles in fallback: ${fallbackData.length}`);
    
    // Find the Maria Wozniak article
    const mariaArticle = fallbackData.find(article => 
      article.title.includes('Maria Wozniak')
    );
    
    if (mariaArticle) {
      console.log('\n✅ Maria Wozniak article found:');
      console.log(`- Title: ${mariaArticle.title}`);
      console.log(`- Category: ${mariaArticle.category}`);
      console.log(`- Categories: ${JSON.stringify(mariaArticle.categories)}`);
      console.log(`- Status: ${mariaArticle.status}`);
      console.log(`- Featured Edmonton: ${mariaArticle.featuredEdmonton}`);
      console.log(`- Created: ${mariaArticle.created_at}`);
      
      // Test the filtering logic
      const city = 'edmonton';
      const hasCityCategory = mariaArticle.category?.toLowerCase().includes(city.toLowerCase());
      const hasCityLocation = mariaArticle.location?.toLowerCase().includes(city.toLowerCase());
      const hasCityCategories = mariaArticle.categories?.some((cat) => 
        cat.toLowerCase().includes(city.toLowerCase())
      );
      const hasCityTags = mariaArticle.tags?.some((tag) => 
        tag.toLowerCase().includes(city.toLowerCase())
      );
      
      console.log('\n🔍 Filtering test:');
      console.log(`- hasCityCategory: ${hasCityCategory}`);
      console.log(`- hasCityLocation: ${hasCityLocation}`);
      console.log(`- hasCityCategories: ${hasCityCategories}`);
      console.log(`- hasCityTags: ${hasCityTags}`);
      console.log(`- Should appear on Edmonton page: ${hasCityCategory || hasCityLocation || hasCityCategories || hasCityTags}`);
      
    } else {
      console.log('❌ Maria Wozniak article not found');
    }
    
    // Test filtering all Edmonton articles
    const edmontonArticles = fallbackData.filter(article => {
      const hasCityCategory = article.category?.toLowerCase().includes('edmonton');
      const hasCityLocation = article.location?.toLowerCase().includes('edmonton');
      const hasCityCategories = article.categories?.some((cat) => 
        cat.toLowerCase().includes('edmonton')
      );
      const hasCityTags = article.tags?.some((tag) => 
        tag.toLowerCase().includes('edmonton')
      );
      return hasCityCategory || hasCityLocation || hasCityCategories || hasCityTags;
    });
    
    console.log(`\n📊 Edmonton articles found: ${edmontonArticles.length}`);
    console.log('Edmonton article titles:');
    edmontonArticles.forEach((article, index) => {
      console.log(`${index + 1}. ${article.title}`);
    });
    
  } catch (error) {
    console.error('❌ Error testing filtering:', error);
  }
}

testEdmontonFiltering();
