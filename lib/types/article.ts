export interface Article {
  id: string;
  title: string;
  slug?: string; // URL-friendly version of title
  content: string;
  excerpt?: string;
  description?: string;
  imageUrl?: string; // Keep for backward compatibility
  imageUrls?: string[]; // New field for multiple images
  category?: string;
  categories?: string[]; // New field for multiple categories
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
  slug?: string; // URL-friendly version of title
  content: string;
  imageUrl?: string; // Keep for backward compatibility
  imageUrls?: string[]; // New field for multiple images
  excerpt?: string;
  description?: string;
  category?: string;
  categories?: string[]; // New field for multiple categories
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