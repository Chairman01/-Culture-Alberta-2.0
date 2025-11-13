const fs = require('fs');
const path = require('path');

// Simple Supabase client setup
const SUPABASE_URL = 'https://itdmwpbsnviassgqfhxk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbmlhc3NncWZoeGsiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcxNzQ4OTY4OCwiZXhwIjoyMDMzMDY1Njg4fQ.LVLw2EtwEVWjYq8xwMHPYCsJOyJOzvLjxPY+Br+61DUduprZu2+1lbaMDqOeD7182WHxC8Wzazdo3inWii28LBf7RmwCTyfvV7J4i+Jmn6X4VfR40ku7S4sXhhv423r5g42N718+aWd2sXpHVUhX8hmvPrTdtz6nKYRk9Ub1t8RvFsskYPijW';

async function exportAllArticlesWithContent() {
    try {
        console.log('🚀 Starting export of ALL articles with content from Supabase...');
        
        // Fetch ALL articles with content from Supabase
        const response = await fetch(`${SUPABASE_URL}/rest/v1/articles?select=*`, {
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
        const articlesWithoutContent = articles.filter(article => 
            !article.content || article.content.trim().length <= 10
        );

        console.log(`📊 Content Analysis:`);
        console.log(`- Articles WITH content: ${articlesWithContent.length}`);
        console.log(`- Articles WITHOUT content: ${articlesWithoutContent.length}`);

        if (articlesWithoutContent.length > 0) {
            console.log(`\n⚠️ Articles missing content:`);
            articlesWithoutContent.forEach(article => {
                console.log(`- "${article.title}" (ID: ${article.id})`);
            });
        }

        // Save to exported-articles-with-content.json
        const outputPath = path.join(process.cwd(), 'exported-articles-with-content.json');
        fs.writeFileSync(outputPath, JSON.stringify(articles, null, 2), 'utf-8');
        console.log(`\n✅ Saved all articles to: exported-articles-with-content.json`);

        // Also update the optimized-fallback.json with content
        console.log(`\n🔄 Updating optimized-fallback.json with content...`);
        
        const optimizedFallbackPath = path.join(process.cwd(), 'optimized-fallback.json');
        const optimizedFallback = JSON.parse(fs.readFileSync(optimizedFallbackPath, 'utf-8'));
        
        // Create a map of articles by ID for quick lookup
        const supabaseArticlesMap = new Map();
        articles.forEach(article => {
            supabaseArticlesMap.set(article.id, article);
        });

        // Update optimized fallback with content from Supabase
        let updatedCount = 0;
        optimizedFallback.forEach(article => {
            const supabaseArticle = supabaseArticlesMap.get(article.id);
            if (supabaseArticle && supabaseArticle.content && supabaseArticle.content.trim().length > 10) {
                article.content = supabaseArticle.content;
                updatedCount++;
            }
        });

        // Save updated optimized fallback
        fs.writeFileSync(optimizedFallbackPath, JSON.stringify(optimizedFallback, null, 2), 'utf-8');
        console.log(`✅ Updated ${updatedCount} articles in optimized-fallback.json with content`);

        // Final verification
        const finalOptimizedFallback = JSON.parse(fs.readFileSync(optimizedFallbackPath, 'utf-8'));
        const finalWithContent = finalOptimizedFallback.filter(article => 
            article.content && article.content.trim().length > 10
        );
        
        console.log(`\n🎉 FINAL RESULT:`);
        console.log(`- Total articles in optimized-fallback.json: ${finalOptimizedFallback.length}`);
        console.log(`- Articles with content: ${finalWithContent.length}`);
        console.log(`- Articles without content: ${finalOptimizedFallback.length - finalWithContent.length}`);

        if (finalOptimizedFallback.length - finalWithContent.length > 0) {
            console.log(`\n⚠️ Still missing content:`);
            finalOptimizedFallback
                .filter(article => !article.content || article.content.trim().length <= 10)
                .forEach(article => {
                    console.log(`- "${article.title}" (ID: ${article.id})`);
                });
        }

    } catch (error) {
        console.error('❌ Error exporting articles:', error);
    }
}

exportAllArticlesWithContent();
