import { supabase } from './supabase'
import { Article, CreateArticleInput, UpdateArticleInput } from './types/article'
import { 
  getAllArticlesFromFile,
  getArticleByIdFromFile,
  createArticleInFile,
  updateArticleInFile,
  deleteArticleFromFile
} from './file-articles'

export async function getAllArticles(): Promise<Article[]> {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Supabase query failed, using file fallback:', error.message)
      return getAllArticlesFromFile()
    }

    return data || []
  } catch (error) {
    console.warn('Supabase connection failed, using file fallback:', error)
    return getAllArticlesFromFile()
  }
}

export async function getArticleById(id: string): Promise<Article> {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching article from Supabase:', error)
      return getArticleByIdFromFile(id)
    }

    return data
  } catch (error) {
    console.error('Supabase query failed, using file fallback:', error)
    return getArticleByIdFromFile(id)
  }
}

export async function createArticle(article: CreateArticleInput): Promise<Article> {
  try {
    const { data, error } = await supabase
      .from('articles')
      .insert([article])
      .select()
      .single()

    if (error) {
      console.error('Error creating article in Supabase:', error)
      return createArticleInFile(article)
    }

    return data
  } catch (error) {
    console.error('Supabase insert failed, using file fallback:', error)
    return createArticleInFile(article)
  }
}

export async function updateArticle(id: string, article: UpdateArticleInput): Promise<Article> {
  try {
    const { data, error } = await supabase
      .from('articles')
      .update({ ...article, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating article in Supabase:', error)
      return updateArticleInFile(id, article)
    }

    return data
  } catch (error) {
    console.error('Supabase update failed, using file fallback:', error)
    return updateArticleInFile(id, article)
  }
}

export async function deleteArticle(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting article from Supabase:', error)
      return deleteArticleFromFile(id)
    }
  } catch (error) {
    console.error('Supabase delete failed, using file fallback:', error)
    return deleteArticleFromFile(id)
  }
}
