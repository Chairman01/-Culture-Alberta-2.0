// Performance monitoring script
const { performance } = require('perf_hooks');

async function checkPerformance() {
  console.log('🚀 Performance Check Starting...');
  
  const start = performance.now();
  
  try {
    // Test homepage load time
    const homepageStart = performance.now();
    const response = await fetch('http://localhost:3000');
    const homepageTime = performance.now() - homepageStart;
    console.log(`✅ Homepage: ${Math.round(homepageTime)}ms`);
    
    // Test article page load time
    const articleStart = performance.now();
    const articleResponse = await fetch('http://localhost:3000/articles/calgary-sells-out-raptors-open-scrimmage-a-slam-dunk-for-alberta-basketball');
    const articleTime = performance.now() - articleStart;
    console.log(`✅ Article Page: ${Math.round(articleTime)}ms`);
    
    // Test category pages
    const categoryPages = ['/culture', '/food-drink', '/events'];
    for (const page of categoryPages) {
      const pageStart = performance.now();
      await fetch(`http://localhost:3000${page}`);
      const pageTime = performance.now() - pageStart;
      console.log(`✅ ${page}: ${Math.round(pageTime)}ms`);
    }
    
    const totalTime = performance.now() - start;
    console.log(`🎉 Total Performance Check: ${Math.round(totalTime)}ms`);
    
  } catch (error) {
    console.error('❌ Performance check failed:', error);
  }
}

checkPerformance();
