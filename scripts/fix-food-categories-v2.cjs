const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing from .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const FOOD_KEYWORDS = [
    'restaurant', 'cafe', 'coffee', 'sushi', 'brunch', 'eat', 'dining',
    'food', 'drink', 'brewery', 'cuisine', 'meal', 'menu', 'bite',
    'taste', 'culinary', 'kitchen', 'chef', 'recipe', 'cooking',
    'beverage', 'wine', 'beer', 'cocktail'
];

async function fixFoodCategories() {
    console.log('🚀 Starting Food & Drink article categorization fix...');

    try {
        // 1. Fetch all articles to check their titles/content
        const { data: articles, error } = await supabase
            .from('articles')
            .select('id, title, category, categories, status');

        if (error) throw error;

        console.log(`🔍 Checking ${articles.length} articles...`);

        let updatedCount = 0;

        for (const article of articles) {
            const titleLower = (article.title || '').toLowerCase();
            const isFoodRelated = FOOD_KEYWORDS.some(keyword => titleLower.includes(keyword));

            const hasFoodCategory = article.category === 'Food & Drink';
            const hasFoodInCategories = article.categories && article.categories.includes('Food & Drink');

            if (isFoodRelated && (!hasFoodCategory || !hasFoodInCategories)) {
                console.log(`📌 Fixing categorization for: "${article.title}"`);

                let newCategories = article.categories || [];
                if (!newCategories.includes('Food & Drink')) {
                    newCategories.push('Food & Drink');
                }

                const { error: updateError } = await supabase
                    .from('articles')
                    .update({
                        category: 'Food & Drink',
                        categories: newCategories,
                        status: 'published' // Ensure they are published so they show up
                    })
                    .eq('id', article.id);

                if (updateError) {
                    console.error(`❌ Failed to update article ${article.id}:`, updateError.message);
                } else {
                    updatedCount++;
                }
            }
        }

        console.log(`\n✅ Finished! Updated ${updatedCount} articles.`);

        // 2. Summary of current Food & Drink articles
        const { data: summary, error: summaryError } = await supabase
            .from('articles')
            .select('title')
            .eq('category', 'Food & Drink');

        if (!summaryError) {
            console.log(`📊 There are now ${summary.length} articles in the "Food & Drink" category.`);
            summary.forEach(a => console.log(`   - ${a.title}`));
        }

    } catch (err) {
        console.error('💥 Fatal error:', err.message);
    } finally {
        process.exit();
    }
}

fixFoodCategories();
