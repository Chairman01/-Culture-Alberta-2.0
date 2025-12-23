require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkWitchPerfect() {
    console.log('Checking Witch Perfect article...\n');

    const { data, error } = await supabase
        .from('articles')
        .select('id, title, image_url, image, updated_at')
        .ilike('title', '%Witch Perfect%');

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No articles found matching "Witch Perfect"');
        return;
    }

    data.forEach(article => {
        console.log(`Title: ${article.title}`);
        console.log(`ID: ${article.id}`);
        console.log(`Last Updated: ${article.updated_at}`);
        console.log(`\nimage_url field:`);
        if (article.image_url) {
            if (article.image_url.startsWith('data:')) {
                console.log(`  ❌ Contains base64 data (${Math.round(article.image_url.length / 1024)} KB)`);
                console.log(`  Preview: ${article.image_url.substring(0, 100)}...`);
            } else {
                console.log(`  ✅ Proper URL: ${article.image_url}`);
            }
        } else {
            console.log('  ⚠️  NULL or empty');
        }

        console.log(`\nimage field:`);
        if (article.image) {
            if (article.image.startsWith('data:')) {
                console.log(`  ❌ Contains base64 data (${Math.round(article.image.length / 1024)} KB)`);
            } else {
                console.log(`  ✅ Proper URL: ${article.image}`);
            }
        } else {
            console.log('  ⚠️  NULL or empty');
        }
        console.log('\n');
    });
}

checkWitchPerfect().then(() => process.exit(0));
