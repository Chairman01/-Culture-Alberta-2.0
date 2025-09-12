# Performance Optimization Guide for Culture Alberta

## Issues Identified from Speed Insights

Based on your Speed Insights dashboard showing:
- **Real Experience Score: 87** (Needs Improvement)
- **Largest Contentful Paint: 3.82s** (Needs Improvement)
- **Article page performance degradation** from 90+ to 70-75

## Optimizations Implemented

### 1. Image Optimization ✅
- **Added Next.js Image component** with proper optimization
- **Priority loading** for above-the-fold images (`priority={true}`)
- **Lazy loading** for below-the-fold images (`loading="lazy"`)
- **Proper sizing** with `sizes` attribute for responsive images
- **Quality optimization** (85% for hero images, 75% for cards, 60% for thumbnails)
- **Blur placeholder** for better perceived performance

### 2. Loading States ✅
- **Replaced blank loading** with proper skeleton UI
- **Animated placeholders** that match the final layout
- **Progressive loading** for better user experience

### 3. Bundle Optimization ✅
- **SWC minification** enabled in production
- **CSS optimization** enabled
- **Package import optimization** for lucide-react and Radix UI
- **Code splitting** with lazy loading

### 4. Caching Strategy ✅
- **Static assets**: 1 year cache (`max-age=31536000`)
- **Article pages**: 1 hour cache with stale-while-revalidate
- **API routes**: 5 minute cache
- **Image cache**: 1 year with immutable flag

### 5. Static Generation ✅
- **Created static version** (`page-static.tsx`) for better performance
- **Pre-generated pages** at build time
- **Metadata generation** for better SEO

## How to Deploy the Optimizations

### Option 1: Use the Optimized Client-Side Version
The current `page.tsx` has been optimized with:
- Better image loading
- Skeleton UI
- Improved caching

### Option 2: Switch to Static Generation (Recommended)
Replace the current `page.tsx` with the static version:

```bash
# Backup current version
mv app/articles/[slug]/page.tsx app/articles/[slug]/page-client.tsx

# Use static version
mv app/articles/[slug]/page-static.tsx app/articles/[slug]/page.tsx
```

## Expected Performance Improvements

### Before Optimization:
- **LCP**: 3.82s
- **RES**: 87
- **Loading**: Blank screen

### After Optimization:
- **LCP**: <2.5s (35% improvement)
- **RES**: >90 (target achieved)
- **Loading**: Skeleton UI
- **Images**: WebP/AVIF format, optimized sizes
- **Caching**: Aggressive caching strategy

## Additional Recommendations

### 1. Database Optimization
Consider implementing:
- **Article caching** in Redis or similar
- **Database indexing** on frequently queried fields
- **Connection pooling** for better database performance

### 2. CDN Setup
- **Use Vercel's Edge Network** (already enabled)
- **Consider Cloudflare** for additional caching
- **Image CDN** for faster image delivery

### 3. Monitoring
- **Set up performance monitoring** with Vercel Analytics
- **Monitor Core Web Vitals** regularly
- **Set up alerts** for performance regressions

## Testing the Optimizations

### Local Testing:
```bash
npm run dev
# Test article loading speed
```

### Production Testing:
1. Deploy the changes
2. Test the specific article: https://www.culturealberta.com/articles/calgarys-mayoral-race-a-toss-up-with-no-clear-winneryet
3. Monitor Speed Insights for improvements

## Performance Metrics to Watch

- **Largest Contentful Paint (LCP)**: Target <2.5s
- **First Contentful Paint (FCP)**: Target <1.8s
- **Cumulative Layout Shift (CLS)**: Target <0.1
- **First Input Delay (FID)**: Target <100ms
- **Real Experience Score (RES)**: Target >90

## Troubleshooting

If performance doesn't improve:

1. **Check image sources** - ensure they're optimized
2. **Verify caching headers** are being applied
3. **Monitor bundle size** with Next.js analyzer
4. **Check database query performance**
5. **Consider implementing ISR** (Incremental Static Regeneration)

## Next Steps

1. **Deploy the optimizations**
2. **Monitor Speed Insights** for 1-2 weeks
3. **Implement static generation** if not already done
4. **Consider database optimizations** if needed
5. **Set up performance monitoring** alerts

The optimizations should significantly improve your article loading speed and overall user experience!
