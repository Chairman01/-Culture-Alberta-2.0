export interface Article {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  description?: string;
  imageUrl?: string;
  category?: string;
  location?: string;
  date?: string;
  readTime?: string;
  type?: string;
  author?: string;
  status?: string;
  tags?: string[];
  rating?: number;
  featured?: boolean;
  createdAt: string;
  updatedAt: string;
  // Trending flags
  trendingHome?: boolean;
  trendingEdmonton?: boolean;
  trendingCalgary?: boolean;
  // Featured article flags
  featuredHome?: boolean;
  featuredEdmonton?: boolean;
  featuredCalgary?: boolean;
}

export interface CreateArticleInput {
  title: string;
  content: string;
  imageUrl?: string;
  excerpt?: string;
  description?: string;
  category?: string;
  location?: string;
  type?: string;
  author?: string;
  status?: string;
  tags?: string[];
  featured?: boolean;
  // Trending flags
  trendingHome?: boolean;
  trendingEdmonton?: boolean;
  trendingCalgary?: boolean;
  // Featured article flags
  featuredHome?: boolean;
  featuredEdmonton?: boolean;
  featuredCalgary?: boolean;
}

export interface UpdateArticleInput extends Partial<CreateArticleInput> {
} 