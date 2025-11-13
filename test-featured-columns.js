// Test script to check if featured article columns exist in Supabase
// Run this in your browser console on any page

async function testFeaturedColumns() {
  try {
    console.log('Testing featured article columns...')
    
    // Test the getAllArticles function
    const articles = await getAllArticles()
    
    console.log('All articles:', articles.map(a => ({
      id: a.id,
      title: a.title,
      featuredHome: a.featuredHome,
      featuredEdmonton: a.featuredEdmonton,
      featuredCalgary: a.featuredCalgary
    })))
    
    // Check if any articles have featured flags set to true
    const featuredArticles = articles.filter(a => 
      a.featuredHome === true || 
      a.featuredEdmonton === true || 
      a.featuredCalgary === true
    )
    
    console.log('Articles with featured flags set to true:', featuredArticles)
    
    if (featuredArticles.length === 0) {
      console.log('❌ No articles have featured flags set to true')
      console.log('This means either:')
      console.log('1. The featured columns were not added to Supabase')
      console.log('2. The featured flags are not being saved when you check them in admin')
    } else {
      console.log('✅ Found articles with featured flags set to true')
    }
    
  } catch (error) {
    console.error('Error testing featured columns:', error)
  }
}

// Run the test
testFeaturedColumns()
