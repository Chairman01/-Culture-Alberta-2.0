import { Article, CreateArticleInput, UpdateArticleInput } from './types/article'
import { 
  getAllArticles as getAllArticlesFromSupabase,
  getArticleById as getArticleByIdFromSupabase,
  createArticle as createArticleInSupabase,
  updateArticle as updateArticleInSupabase,
  deleteArticle as deleteArticleFromSupabase
} from './supabase-articles'

// Re-export Supabase functions with the same names for backward compatibility
export const getAllArticles = getAllArticlesFromSupabase
export const getArticleById = getArticleByIdFromSupabase
export const createArticle = createArticleInSupabase
export const updateArticle = updateArticleInSupabase
export const deleteArticle = deleteArticleFromSupabase 