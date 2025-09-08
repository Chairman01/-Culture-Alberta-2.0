import { Article, CreateArticleInput, UpdateArticleInput } from './types/article'
import { 
  getAllArticles as getAllArticlesFromSupabase,
  getHomepageArticles as getHomepageArticlesFromSupabase,
  getAdminArticles as getAdminArticlesFromSupabase,
  getCityArticles as getCityArticlesFromSupabase,
  getEventsArticles as getEventsArticlesFromSupabase,
  getArticleById as getArticleByIdFromSupabase,
  createArticle as createArticleInSupabase,
  updateArticle as updateArticleInSupabase,
  deleteArticle as deleteArticleFromSupabase
} from './supabase-articles'

// Re-export Supabase functions with the same names for backward compatibility
export const getAllArticles = getAllArticlesFromSupabase
export const getHomepageArticles = getHomepageArticlesFromSupabase
export const getAdminArticles = getAdminArticlesFromSupabase
export const getCityArticles = getCityArticlesFromSupabase
export const getEventsArticles = getEventsArticlesFromSupabase
export const getArticleById = getArticleByIdFromSupabase
export const createArticle = createArticleInSupabase
export const updateArticle = updateArticleInSupabase
export const deleteArticle = deleteArticleFromSupabase 