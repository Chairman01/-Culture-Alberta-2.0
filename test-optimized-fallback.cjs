const articles = require('./optimized-fallback.json');

console.log('✅ Optimized fallback loaded successfully!\n');
console.log(`📊 Total items: ${articles.length}`);
console.log(`   Articles: ${articles.filter(a => a.type !== 'event').length}`);
console.log(`   Events: ${articles.filter(a => a.type === 'event').length}`);

console.log('\n📋 First 5 titles:');
articles.slice(0, 5).forEach((a, i) => {
  const type = a.type === 'event' ? '[EVENT]' : '[ARTICLE]';
  console.log(`${i+1}. ${type} ${a.title}`);
});

console.log('\n🎉 Ready to use!');

