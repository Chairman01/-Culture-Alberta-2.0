import { Article, CreateArticleInput, UpdateArticleInput } from './types/article'
import { 
  getAllArticles,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle
} from './supabase-articles'

// Re-export the functions directly
export { getAllArticles, getArticleById, createArticle, updateArticle, deleteArticle } 