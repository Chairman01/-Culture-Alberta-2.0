require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Priority articles from the user's checklist
const priorityTitles = [
    'Edmonton Designer Maria Wozniak Showcases Alberta Creativity on National Stage',
    'Dashcam Footage Captures Brazen Phone Snatching in Downtown Edmonton',
    'The Best Coffee Shops in Edmonton for Working Remotely [With Wi-Fi Ratings!]',
    'Witch Perfect: Calgary\'s Getting a Wickedly Delicious Broadway Brunch',
    'A Massive Fire Breaks Out Near The Gamers Den on 119 Street',
    'Teachers Say No Deal: Strike Set to Shake Alberta Classrooms Oct. 6',
    'Alberta Invokes the Notwithstanding Clause to End Historic Teachers\' Strike',
    'Calgary Sells Out Raptors Open Scrimmage: A Slam Dunk for Alberta Basketball',
    'Edmonton Votes to Demolish Argyll Velodrome'
];

async function checkPriorityArticles() {
    console.log('Checking priority articles from your checklist...\n');
    console.log('='.repeat(80));

    let foundCount = 0;
    let base64Count = 0;
    let fixedCount = 0;

    for (const title of priorityTitles) {
        // Search for article by title (case insensitive, partial match)
        const { data, error } = await supabase
            .from('articles')
            .select('id, title, image_url, image, updated_at')
            .ilike('title', `%${title.substring(0, 30)}%`)
            .limit(1);

        if (error) {
            console.error(`Error searching for "${title}":`, error);
            continue;
        }

        if (!data || data.length === 0) {
            console.log(`❌ NOT FOUND: "${title}"`);
            console.log('');
            continue;
        }

        foundCount++;
        const article = data[0];

        const hasBase64InImageUrl = article.image_url && article.image_url.startsWith('data:');
        const hasBase64InImage = article.image && article.image.startsWith('data:');
        const hasBase64 = hasBase64InImageUrl || hasBase64InImage;

        if (hasBase64) {
            base64Count++;
            const imageUrlSize = hasBase64InImageUrl ? Math.round(article.image_url.length / 1024) : 0;
            const imageSize = hasBase64InImage ? Math.round(article.image.length / 1024) : 0;

            console.log(`❌ NEEDS FIX: "${article.title}"`);
            console.log(`   ID: ${article.id}`);
            console.log(`   Last Updated: ${new Date(article.updated_at).toLocaleString()}`);
            if (hasBase64InImageUrl) {
                console.log(`   image_url: Base64 (${imageUrlSize} KB)`);
            }
            if (hasBase64InImage) {
                console.log(`   image: Base64 (${imageSize} KB)`);
            }
        } else {
            fixedCount++;
            console.log(`✅ FIXED: "${article.title}"`);
            console.log(`   ID: ${article.id}`);
            console.log(`   Last Updated: ${new Date(article.updated_at).toLocaleString()}`);
            if (article.image_url) {
                console.log(`   image_url: ${article.image_url.substring(0, 80)}...`);
            }
        }

        console.log('');
    }

    console.log('='.repeat(80));
    console.log('\nSUMMARY:');
    console.log(`Total priority articles in checklist: ${priorityTitles.length}`);
    console.log(`Found in database: ${foundCount}`);
    console.log(`✅ Already fixed: ${fixedCount}`);
    console.log(`❌ Still need fixing: ${base64Count}`);
    console.log(`❓ Not found: ${priorityTitles.length - foundCount}`);
}

checkPriorityArticles().then(() => process.exit(0));
