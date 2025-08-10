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
}

export interface UpdateArticleInput extends Partial<CreateArticleInput> {
  id: string;
} 