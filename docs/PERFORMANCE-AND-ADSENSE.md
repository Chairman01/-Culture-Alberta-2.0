# Performance & AdSense Guide

## Newsletter + AdSense Strategy (Implemented)

**Problem:** Sticky/floating newsletter overlapped with AdSense ads, creating clutter and hurting UX.

**Solution:** Newsletter is now **inline only** on article pages:
- Sits at the end of the article (after content, before comments)
- No floating popup or sidebar overlay
- Does not compete with AdSense for attention
- `ArticleNewsletterSignup` has `variant="inline"` by default

On the homepage, newsletter stays in the sidebar—it's static, not overlapping.

---

## CLS (Cumulative Layout Shift) Fixes (Implemented)

**Target:** CLS under 0.1 (currently above 0.25 on mobile).

### 1. Images in Article Content
- All `<img>` tags in article body now get `aspect-ratio: 16/9` and `max-width: 100%` via `processArticleContent()`
- Prevents layout jump when images load

### 2. Featured & Related Article Images
- Already use `fill` with fixed aspect containers
- Next.js Image with `sizes` and `placeholder="blur"` helps

### 3. AdSense Auto-Ads
- Auto-ads inject dynamically and can cause CLS
- **AdSense Console:** Reduce "Ad density" or limit auto-ads to below-the-fold only
- Consider switching to manual ad units in fixed positions with `AdSenseSlot` (reserves space)

---

## Engagement (23 sec average) – Recommendations

### Implemented
- Newsletter at end of article (inline) — captures engaged readers
- No intrusive popups that might make users leave

### Further Improvements
1. **Content:** Stronger openings, clearer value in first paragraph
2. **Typography:** Ensure `line-height: 1.7`, font size 18px+ for body
3. **Related articles:** Show 2–3 links partway through long articles
4. **Table of contents:** For articles 1000+ words
5. **Load speed:** Lazy-load below-fold content, optimize images

---

## Using Manual Ad Units

If you switch from auto-ads to manual units, use `AdSenseSlot` to reserve space:

```tsx
import { AdSenseSlot } from '@/components/adsense-slot'

<AdSenseSlot minHeight={250} className="my-6" />
```

Place it where the ad will go. Replace with the actual `<ins>` tag when ready.
