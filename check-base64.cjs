require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkBase64Images() {
    console.log('Checking for articles with base64 images...\n');

    const { data, error } = await supabase
        .from('articles')
        .select('id, title, image_url, image')
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
        console.error('Error:', error);
        return;
    }

    const base64Articles = data.filter(a =>
        (a.image && a.image.startsWith('data:')) ||
        (a.image_url && a.image_url.startsWith('data:'))
    );

    console.log(`Found ${base64Articles.length} articles with base64 images out of ${data.length} total:\n`);

    base64Articles.forEach((article, index) => {
        const hasBase64InImage = article.image && article.image.startsWith('data:');
        const hasBase64InImageUrl = article.image_url && article.image_url.startsWith('data:');
        const imageSize = hasBase64InImage ? Math.round(article.image.length / 1024) + ' KB' : '0 KB';

        console.log(`${index + 1}. ${article.title}`);
        console.log(`   ID: ${article.id}`);
        console.log(`   Base64 in 'image': ${hasBase64InImage} ${hasBase64InImage ? `(${imageSize})` : ''}`);
        console.log(`   Base64 in 'image_url': ${hasBase64InImageUrl}`);
        console.log('');
    });
}

checkBase64Images().then(() => process.exit(0));
