// Quick script to sync new articles from Supabase to optimized-fallback.json
// Run this after creating new articles: node sync-new-articles.cjs

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://itdmwpbsnviassgqfhxk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo';

async function syncArticles() {
    try {
        console.log('🚀 Syncing articles from Supabase to optimized-fallback.json...');
        
        // Fetch ALL articles with content from Supabase
        const response = await fetch(`${SUPABASE_URL}/rest/v1/articles?select=*&order=created_at.desc`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Supabase request failed: ${response.status} ${response.statusText}`);
        }

        const articles = await response.json();
        console.log(`✅ Fetched ${articles.length} articles from Supabase`);

        // Check content status
        const articlesWithContent = articles.filter(article => 
            article.content && article.content.trim().length > 10
        );
        
        console.log(`📊 Articles with content: ${articlesWithContent.length}/${articles.length}`);

        // Map image_url to imageUrl for compatibility
        const mappedArticles = articles.map(article => ({
            ...article,
            imageUrl: article.image_url || article.image || null,
            // Remove the old image field to avoid confusion
            image: undefined
        }));

        // Save to optimized-fallback.json
        const optimizedFallbackPath = path.join(process.cwd(), 'optimized-fallback.json');
        fs.writeFileSync(optimizedFallbackPath, JSON.stringify(mappedArticles, null, 2), 'utf-8');
        console.log(`✅ Updated optimized-fallback.json with ${mappedArticles.length} articles`);
        
        // Also update lib/data/articles.json for backup
        const articlesPath = path.join(process.cwd(), 'lib', 'data', 'articles.json');
        fs.writeFileSync(articlesPath, JSON.stringify(articles, null, 2), 'utf-8');
        console.log(`✅ Also updated lib/data/articles.json`);

        console.log('\n🎉 SYNC COMPLETE!');
        console.log('📝 Next steps:');
        console.log('1. Refresh your website to see the new articles');
        console.log('2. If still not showing, restart the dev server: npm run dev');

    } catch (error) {
        console.error('❌ Error syncing articles:', error);
    }
}

syncArticles();

