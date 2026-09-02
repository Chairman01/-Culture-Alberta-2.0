export interface Article {
  id: string;
  title: string;
  seoTitle?: string; // Editor-written <title> override (≤60 chars); see lib/seo/title.ts
  content: string;
  excerpt?: string;
  description?: string;
  imageUrl?: string; // Keep for backward compatibility
  imageUrls?: string[]; // New field for multiple images
  imageSource?: string; // Image credit / attribution
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
  slug?: string; // URL slug for the article
  createdAt: string;
  updatedAt: string;
  // Trending flags
  trendingHome?: boolean;
  trendingEdmonton?: boolean;
  trendingCalgary?: boolean;
  trendingAlberta?: boolean;
  featuredHome?: boolean;
  featuredEdmonton?: boolean;
  featuredCalgary?: boolean;
  featuredAlberta?: boolean;
}

export interface CreateArticleInput {
  title: string;
  seoTitle?: string;
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
  trendingAlberta?: boolean;
  featuredHome?: boolean;
  featuredEdmonton?: boolean;
  featuredCalgary?: boolean;
  featuredAlberta?: boolean;
}

export interface UpdateArticleInput extends Partial<CreateArticleInput> {
} 