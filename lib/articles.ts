import { Article, CreateArticleInput, UpdateArticleInput } from './types/article'
import { 
  getAllArticles as getAllArticlesFromSupabase,
  getHomepageArticles as getHomepageArticlesFromSupabase,
  getAdminArticles as getAdminArticlesFromSupabase,
  getCityArticles as getCityArticlesFromSupabase,
  getEventsArticles as getEventsArticlesFromSupabase,
  getArticleById as getArticleByIdFromSupabase,
  getArticleBySlug as getArticleBySlugFromSupabase,
  createArticle as createArticleInSupabase,
  updateArticle as updateArticleInSupabase,
  deleteArticle as deleteArticleFromSupabase
} from './supabase-articles'

// Public-facing functions use optimized file system for speed
export const getAllArticles = getAllArticlesFromSupabase
export const getHomepageArticles = getHomepageArticlesFromSupabase
export const getCityArticles = getCityArticlesFromSupabase
export const getEventsArticles = getEventsArticlesFromSupabase
export const getArticleById = getArticleByIdFromSupabase
export const getArticleBySlug = getArticleBySlugFromSupabase

// Admin functions always use Supabase for write operations
export const getAdminArticles = getAdminArticlesFromSupabase
export const createArticle = createArticleInSupabase
export const updateArticle = updateArticleInSupabase
export const deleteArticle = deleteArticleFromSupabase 