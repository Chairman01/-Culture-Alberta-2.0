// Server-only file operations
// This file should only be imported on the server side

export async function deleteArticleFromFileServer(id: string): Promise<void> {
  const fs = await import('fs')
  const path = await import('path')
  
  const ARTICLES_FILE = path.join(process.cwd(), 'lib', 'data', 'articles.json')
  
  // Read current articles
  const articlesData = JSON.parse(fs.readFileSync(ARTICLES_FILE, 'utf8'))
  
  // Filter out the article to delete
  const filteredArticles = articlesData.filter((article: any) => article.id !== id)
  
  if (filteredArticles.length === articlesData.length) {
    throw new Error('Article not found')
  }
  
  // Write back the filtered articles
  fs.writeFileSync(ARTICLES_FILE, JSON.stringify(filteredArticles, null, 2))
  
  console.log('✅ Article deleted from file system:', id)
}
