require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fixLastBase64Image() {
    console.log('Fixing the last article with base64 image...\n');

    const articleId = 'article-1757456295385-rmivbmjm1';

    // Update the article to set image_url to null
    // This will make it use the placeholder image
    const { data, error } = await supabase
        .from('articles')
        .update({ image_url: null })
        .eq('id', articleId)
        .select();

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('✅ Successfully updated article:');
    console.log(`   ID: ${articleId}`);
    console.log(`   Title: Calgary's Mayoral Race: A Toss-Up with No Clear Winner....Yet`);
    console.log(`   image_url: ${data[0].image_url} (now null - will use placeholder)`);
    console.log('\nThe article will now display with a placeholder image until a new image is uploaded.');
}

fixLastBase64Image().then(() => process.exit(0));
