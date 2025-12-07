// Quick script to sync new articles AND events from Supabase to optimized-fallback.json
// Run this after creating new articles or events: node sync-new-articles.cjs

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://itdmwpbsnviassgqfhxk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo';

async function syncArticlesAndEvents() {
    try {
        console.log('🚀 Syncing articles AND events from Supabase to optimized-fallback.json...');

        // Fetch ALL articles from Supabase
        const articlesResponse = await fetch(`${SUPABASE_URL}/rest/v1/articles?select=*&order=created_at.desc`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!articlesResponse.ok) {
            throw new Error(`Supabase articles request failed: ${articlesResponse.status} ${articlesResponse.statusText}`);
        }

        const articles = await articlesResponse.json();
        console.log(`✅ Fetched ${articles.length} articles from Supabase`);

        // Fetch ALL events from Supabase events table
        const eventsResponse = await fetch(`${SUPABASE_URL}/rest/v1/events?select=*&order=created_at.desc`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        let events = [];
        if (eventsResponse.ok) {
            events = await eventsResponse.json();
            console.log(`✅ Fetched ${events.length} events from Supabase`);
        } else {
            console.log(`⚠️ Events table may not exist or is empty: ${eventsResponse.status}`);
        }

        // Check content status
        const articlesWithContent = articles.filter(article =>
            article.content && article.content.trim().length > 10
        );
        console.log(`📊 Articles with content: ${articlesWithContent.length}/${articles.length}`);

        // Map articles (snake_case to camelCase for frontend compatibility)
        const mappedArticles = articles.map(article => ({
            ...article,
            type: article.type || 'article', // Ensure type is set
            // Image URL mapping
            imageUrl: article.image_url || article.image || null,
            // Featured/Trending field mappings (snake_case to camelCase)
            featuredHome: article.featured_home || false,
            featuredEdmonton: article.featured_edmonton || false,
            featuredCalgary: article.featured_calgary || false,
            trendingHome: article.trending_home || false,
            trendingEdmonton: article.trending_edmonton || false,
            trendingCalgary: article.trending_calgary || false,
            // Date field mappings
            createdAt: article.created_at,
            updatedAt: article.updated_at,
            // Remove old fields to avoid confusion
            image: undefined,
            image_url: undefined,
            featured_home: undefined,
            featured_edmonton: undefined,
            featured_calgary: undefined,
            trending_home: undefined,
            trending_edmonton: undefined,
            trending_calgary: undefined,
            created_at: undefined,
            updated_at: undefined
        }));

        // Map events (snake_case to camelCase for frontend compatibility)
        const mappedEvents = events.map(event => ({
            ...event,
            type: 'event', // Force type to 'event'
            // Image URL mapping
            imageUrl: event.image_url || event.image || null,
            // Event-specific field mappings
            eventDate: event.event_date,
            eventEndDate: event.event_end_date,
            // Featured/Trending field mappings (snake_case to camelCase)
            featuredHome: event.featured_home || false,
            featuredEdmonton: event.featured_edmonton || false,
            featuredCalgary: event.featured_calgary || false,
            trendingHome: event.trending_home || false,
            trendingEdmonton: event.trending_edmonton || false,
            trendingCalgary: event.trending_calgary || false,
            // Date field mappings
            createdAt: event.created_at,
            updatedAt: event.updated_at,
            // Remove old fields to avoid confusion
            image: undefined,
            image_url: undefined,
            event_date: undefined,
            event_end_date: undefined,
            featured_home: undefined,
            featured_edmonton: undefined,
            featured_calgary: undefined,
            trending_home: undefined,
            trending_edmonton: undefined,
            trending_calgary: undefined,
            created_at: undefined,
            updated_at: undefined
        }));

        // Combine articles and events
        const allContent = [...mappedArticles, ...mappedEvents];
        console.log(`📊 Total content: ${allContent.length} (${mappedArticles.length} articles + ${mappedEvents.length} events)`);

        // Save to optimized-fallback.json
        const optimizedFallbackPath = path.join(process.cwd(), 'optimized-fallback.json');
        fs.writeFileSync(optimizedFallbackPath, JSON.stringify(allContent, null, 2), 'utf-8');
        console.log(`✅ Updated optimized-fallback.json with ${allContent.length} items`);

        // Also update lib/data/articles.json for backup (articles only)
        const articlesPath = path.join(process.cwd(), 'lib', 'data', 'articles.json');
        fs.writeFileSync(articlesPath, JSON.stringify(articles, null, 2), 'utf-8');
        console.log(`✅ Also updated lib/data/articles.json`);

        console.log('\n🎉 SYNC COMPLETE!');
        console.log('📝 Next steps:');
        console.log('1. Refresh your website to see the new articles and events');
        console.log('2. If still not showing, restart the dev server: npm run dev');

    } catch (error) {
        console.error('❌ Error syncing:', error);
    }
}

syncArticlesAndEvents();


