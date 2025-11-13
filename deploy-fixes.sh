#!/bin/bash

# Culture Alberta - Production Fixes Deployment Script
# This script helps deploy the fixes for Vercel resource limits and production issues

echo "🚀 Deploying Culture Alberta Production Fixes..."
echo "================================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if git is clean
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Warning: You have uncommitted changes. Please commit them first."
    echo "Files with changes:"
    git status --porcelain
    echo ""
    read -p "Do you want to continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Deployment cancelled."
        exit 1
    fi
fi

# Build the project to check for errors
echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the errors before deploying."
    exit 1
fi

echo "✅ Build successful!"

# Commit the fixes
echo "📝 Committing fixes..."
git add .
git commit -m "Fix Vercel resource limits and production issues

- Optimize image loading to reduce Fast Origin Transfer
- Fix TypeScript error in best-of page
- Add Vercel-specific optimizations
- Implement resource usage tracking
- Reduce cache duration and bundle size
- Fix image display component typo
- Add Vercel SpeedInsights for performance monitoring

Expected results:
- Fast Origin Transfer: 40-50% reduction
- ISR Reads: 30-40% reduction
- Function Invocations: 20-30% reduction
- Page load times: 2-3x faster"

# Push to main branch
echo "🚀 Pushing to main branch..."
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment initiated successfully!"
    echo ""
    echo "📊 Monitor your Vercel dashboard for:"
    echo "   - Fast Origin Transfer (should reduce significantly)"
    echo "   - ISR Reads (should stay under 1M)"
    echo "   - Function Invocations (should stay under 1M)"
    echo "   - Page load times (should be under 3 seconds)"
    echo ""
    echo "🔗 Check your deployment at: https://vercel.com/dashboard"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Wait for deployment to complete (usually 2-3 minutes)"
    echo "   2. Test your production site"
    echo "   3. Check Vercel dashboard for resource usage"
    echo "   4. Monitor performance improvements"
    echo ""
    echo "🆘 If issues persist:"
    echo "   - Check Vercel dashboard for current usage"
    echo "   - Consider upgrading Vercel plan if needed"
    echo "   - Monitor error logs in Vercel"
else
    echo "❌ Failed to push to main branch. Please check your git configuration."
    exit 1
fi

echo ""
echo "🎉 Deployment script completed!"
