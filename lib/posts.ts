import { supabase } from './supabase'

export interface BlogPost {
  id: string
  title: string
  content: string
  excerpt: string
  image_url: string
  category: string
  created_at: string
  updated_at: string
  author: string
  slug: string
  tags: string
}

// Create a new blog post
export async function createPost(post: Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from('posts')
    .insert([
      {
        ...post,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ])
    .select()

  if (error) throw error
  return data[0]
}

// Get all blog posts
export async function getAllPosts() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// Get a single blog post by ID
export async function getPostById(id: string) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// Get a single blog post by slug
export async function getPostBySlug(slug: string) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) throw error
  return data
}

// Update a blog post
export async function updatePost(id: string, updates: Partial<BlogPost>) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from('posts')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()

  if (error) throw error
  return data[0]
}

// Delete a blog post
export async function deletePost(id: string) {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Get posts by category
export async function getPostsByCategory(category: string) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('category', category)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// Search posts
export async function searchPosts(query: string) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .or(`title.ilike.%${query}%,content.ilike.%${query}%,excerpt.ilike.%${query}%`)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
} 