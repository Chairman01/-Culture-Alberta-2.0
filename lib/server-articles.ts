import { Article, CreateArticleInput, UpdateArticleInput } from './types/article'
import { 
  getAllArticlesFromFile,
  getArticleByIdFromFile,
  createArticleInFile,
  updateArticleInFile,
  deleteArticleFromFile
} from './data-articles'

// Server-side functions for use in server components
export async function getServerArticles(): Promise<Article[]> {
  return getAllArticlesFromFile()
}

export async function getServerArticleById(id: string): Promise<Article> {
  return getArticleByIdFromFile(id)
}

export async function createServerArticle(article: CreateArticleInput): Promise<Article> {
  return createArticleInFile(article)
}

export async function updateServerArticle(id: string, article: UpdateArticleInput): Promise<Article> {
  return updateArticleInFile(id, article)
}

export async function deleteServerArticle(id: string): Promise<void> {
  return deleteArticleFromFile(id)
}
