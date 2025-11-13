/**
 * Optimized Best of Alberta Page
 * 
 * Performance optimizations:
 * - Client-side rendering with optimized API calls
 * - Server-side pagination and filtering
 * - Single API call on initial load
 * - Optimized images with Next.js Image component
 * 
 * Used as: Best of Alberta listing page (/best-of)
 */

import { PageSEO } from '@/components/seo/page-seo'
import { BestOfClient } from './best-of-client'

/**
 * Best of Alberta Page Component
 * 
 * Displays top-rated professionals and businesses across Alberta
 * Now uses client-side API calls for better performance
 */
export default function BestOfPage() {
  return (
    <>
      <PageSEO
        title="Best of Alberta - Culture Alberta"
        description="Discover the top-rated professionals and businesses across Alberta, from healthcare providers to legal services, restaurants, and more."
      />
      <BestOfClient />
    </>
  )
}
