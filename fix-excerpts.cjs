// Script to fix truncated excerpts in Supabase articles
// This will generate proper excerpts from article content for articles with truncated or missing excerpts
// Run with: node fix-excerpts.cjs

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://itdmwpbsnviassgqfhxk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo';

/**
 * Extracts a clean excerpt from markdown/HTML content
 * @param {string} content - The article content
 * @param {number} targetLength - Target length in characters (default 200)
 * @returns {string} - Clean excerpt
 */
function extractExcerpt(content, targetLength = 200) {
    if (!content || content.trim().length === 0) {
        return '';
    }

    // Remove markdown image syntax: ![alt](url)
    let cleaned = content.replace(/!\[.*?\]\(.*?\)/g, '');

    // Remove markdown links but keep the text: [text](url) -> text
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

    // Remove markdown headers (#, ##, etc.)
    cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');

    // Remove HTML tags
    cleaned = cleaned.replace(/<[^>]+>/g, '');

    // Remove markdown bold/italic
    cleaned = cleaned.replace(/(\*\*|__)(.*?)\1/g, '$2');
    cleaned = cleaned.replace(/(\*|_)(.*?)\1/g, '$2');

    // Remove multiple spaces and newlines
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // If content is shorter than target, return it all
    if (cleaned.length <= targetLength) {
        return cleaned;
    }

    // Find a good breaking point (end of sentence or word)
    let excerpt = cleaned.substring(0, targetLength + 50); // Get a bit extra to find good break

    // Try to break at end of sentence
    const sentenceEnd = excerpt.match(/[.!?]\s/g);
    if (sentenceEnd) {
        const lastSentence = excerpt.lastIndexOf(sentenceEnd[sentenceEnd.length - 1]);
        if (lastSentence > targetLength * 0.7) { // Make sure we get at least 70% of target
            return excerpt.substring(0, lastSentence + 1).trim();
        }
    }

    // Otherwise break at word boundary
    const lastSpace = excerpt.lastIndexOf(' ', targetLength);
    if (lastSpace > targetLength * 0.8) {
        return excerpt.substring(0, lastSpace).trim() + '...';
    }

    // Fallback: hard cut at target length
    return cleaned.substring(0, targetLength).trim() + '...';
}

/**
 * Check if an excerpt needs fixing
 * @param {string} excerpt - Current excerpt
 * @returns {boolean} - True if needs fixing
 */
function needsFixing(excerpt) {
    if (!excerpt || excerpt.trim().length === 0) {
        return true; // No excerpt at all
    }

    const trimmed = excerpt.trim();

    // Check if it's already truncated (ends with ... or has only partial text)
    if (trimmed.endsWith('...') && trimmed.length < 150) {
        return true;
    }

    // Check if it's too short
    if (trimmed.length < 100) {
        return true;
    }

    return false;
}

async function fixExcerpts() {
    try {
        console.log('🔧 Starting excerpt fixing process...\n');

        // Fetch all articles from Supabase
        console.log('📥 Fetching articles from Supabase...');
        const response = await fetch(`${SUPABASE_URL}/rest/v1/articles?select=*`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch articles: ${response.status} ${response.statusText}`);
        }

        const articles = await response.json();
        console.log(`✅ Fetched ${articles.length} articles\n`);

        // Find articles that need fixing
        const articlesToFix = [];

        for (const article of articles) {
            if (needsFixing(article.excerpt)) {
                articlesToFix.push(article);
            }
        }

        console.log(`📊 Found ${articlesToFix.length} articles with excerpts that need fixing\n`);

        if (articlesToFix.length === 0) {
            console.log('✅ All articles have good excerpts! Nothing to fix.');
            return;
        }

        // Show preview of what will be fixed
        console.log('Preview of changes:');
        console.log('='.repeat(80));

        const updates = [];

        for (const article of articlesToFix.slice(0, 5)) { // Show first 5 as preview
            const newExcerpt = extractExcerpt(article.content, 200);
            console.log(`\n📰 ${article.title}`);
            console.log(`   OLD: "${article.excerpt || '(empty)'}"`);
            console.log(`   NEW: "${newExcerpt}"`);

            updates.push({
                id: article.id,
                title: article.title,
                oldExcerpt: article.excerpt,
                newExcerpt: newExcerpt
            });
        }

        if (articlesToFix.length > 5) {
            console.log(`\n... and ${articlesToFix.length - 5} more articles`);
        }

        console.log('\n' + '='.repeat(80));
        console.log('\n🚀 Updating excerpts in Supabase...\n');

        // Update all articles
        let successCount = 0;
        let errorCount = 0;

        for (const article of articlesToFix) {
            const newExcerpt = extractExcerpt(article.content, 200);

            try {
                const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/articles?id=eq.${article.id}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({ excerpt: newExcerpt })
                });

                if (updateResponse.ok) {
                    successCount++;
                    console.log(`✅ Updated: ${article.title}`);
                } else {
                    errorCount++;
                    console.log(`❌ Failed to update: ${article.title} (${updateResponse.status})`);
                }
            } catch (error) {
                errorCount++;
                console.log(`❌ Error updating ${article.title}:`, error.message);
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('\n📊 Summary:');
        console.log(`   ✅ Successfully updated: ${successCount}`);
        console.log(`   ❌ Failed: ${errorCount}`);
        console.log(`   📝 Total processed: ${articlesToFix.length}`);

        if (successCount > 0) {
            console.log('\n🔄 Now syncing to optimized-fallback.json...');
            console.log('   Run: node sync-new-articles.cjs');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run the script
fixExcerpts();
