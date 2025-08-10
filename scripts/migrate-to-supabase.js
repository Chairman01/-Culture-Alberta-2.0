import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const supabaseUrl = 'https://itdmwpbznviaszgqfxhk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Read the current articles.json file
const articlesPath = path.join(process.cwd(), 'lib', 'data', 'articles.json');

async function migrateArticles() {
  try {
    console.log('🔄 Starting migration to Supabase...');
    
    // Check if articles.json exists
    if (!fs.existsSync(articlesPath)) {
      console.log('❌ No articles.json file found. Nothing to migrate.');
      return;
    }

    // Read the current articles
    const articlesData = fs.readFileSync(articlesPath, 'utf-8');
    const articles = JSON.parse(articlesData);
    
    console.log(`📊 Found ${articles.length} articles to migrate`);
    
    if (articles.length === 0) {
      console.log('ℹ️ No articles to migrate.');
      return;
    }

    // Display the articles that will be migrated
    console.log('\n📋 Articles to migrate:');
    articles.forEach((article, index) => {
      console.log(`${index + 1}. ${article.title} (${article.category || 'Uncategorized'})`);
    });

    // Check if articles table exists
    console.log('\n🔍 Checking if articles table exists...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('articles')
      .select('count')
      .limit(1);

    if (tableError) {
      console.log('❌ Articles table does not exist or is not accessible.');
      console.log('📝 Please run the SQL script in your Supabase dashboard first:');
      console.log('   - Go to your Supabase project dashboard');
      console.log('   - Navigate to SQL Editor');
      console.log('   - Copy and paste the contents of create-articles-table.sql');
      console.log('   - Execute the script');
      return;
    }

    console.log('✅ Articles table exists!');

    // Migrate each article
    console.log('\n🚀 Starting data migration...');
    let successCount = 0;
    let errorCount = 0;

    for (const article of articles) {
      try {
        // Prepare the article data for Supabase
        const articleData = {
          title: article.title,
          content: article.content,
          excerpt: article.excerpt,
          category: article.category,
          location: article.location,
          author: article.author,
          date: article.date,
          type: article.type || 'article',
          status: article.status || 'published',
          image: article.image,
          created_at: article.createdAt || new Date().toISOString(),
          updated_at: article.updatedAt || new Date().toISOString()
        };

        // Insert the article
        const { data, error } = await supabase
          .from('articles')
          .insert([articleData])
          .select();

        if (error) {
          console.log(`❌ Failed to migrate "${article.title}":`, error.message);
          errorCount++;
        } else {
          console.log(`✅ Migrated "${article.title}"`);
          successCount++;
        }
      } catch (error) {
        console.log(`❌ Error migrating "${article.title}":`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully migrated: ${successCount} articles`);
    console.log(`❌ Failed to migrate: ${errorCount} articles`);

    if (successCount > 0) {
      console.log('\n🎉 Migration completed!');
      console.log('📝 Next steps:');
      console.log('1. Restart your development server: npm run dev');
      console.log('2. Your articles are now stored in Supabase!');
      console.log('3. You can delete the articles.json file if you want');
    }

  } catch (error) {
    console.error('❌ Error during migration:', error);
  }
}

migrateArticles();
