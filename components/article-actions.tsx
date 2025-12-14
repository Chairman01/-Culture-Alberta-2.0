'use client'

import { useState, useCallback } from 'react'
import { Share2, Bookmark, Check, Copy, Twitter, Facebook, Linkedin, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'

interface ArticleActionsProps {
    articleTitle: string
    articleUrl: string
}

export function ArticleActions({ articleTitle, articleUrl }: ArticleActionsProps) {
    const { toast } = useToast()
    const [isSaved, setIsSaved] = useState(false)
    const [copied, setCopied] = useState(false)

    // Get full URL
    const fullUrl = typeof window !== 'undefined'
        ? `${window.location.origin}${articleUrl}`
        : `https://www.culturealberta.com${articleUrl}`

    // Handle native share (mobile) or show dropdown (desktop)
    const handleShare = useCallback(async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: articleTitle,
                    url: fullUrl,
                })
                toast({
                    title: 'Shared!',
                    description: 'Article shared successfully.',
                })
            } catch (error) {
                // User cancelled or error
                if ((error as Error).name !== 'AbortError') {
                    console.error('Share failed:', error)
                }
            }
        }
    }, [articleTitle, fullUrl, toast])

    // Copy link to clipboard
    const handleCopyLink = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(fullUrl)
            setCopied(true)
            toast({
                title: 'Link copied!',
                description: 'Article link copied to clipboard.',
            })
            setTimeout(() => setCopied(false), 2000)
        } catch (error) {
            console.error('Copy failed:', error)
            toast({
                title: 'Copy failed',
                description: 'Could not copy link to clipboard.',
                variant: 'destructive',
            })
        }
    }, [fullUrl, toast])

    // Share to Twitter
    const shareToTwitter = useCallback(() => {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(articleTitle)}&url=${encodeURIComponent(fullUrl)}`
        window.open(twitterUrl, '_blank', 'width=550,height=420')
    }, [articleTitle, fullUrl])

    // Share to Facebook
    const shareToFacebook = useCallback(() => {
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`
        window.open(facebookUrl, '_blank', 'width=550,height=420')
    }, [fullUrl])

    // Share to LinkedIn
    const shareToLinkedIn = useCallback(() => {
        const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fullUrl)}`
        window.open(linkedinUrl, '_blank', 'width=550,height=420')
    }, [fullUrl])

    // Share via Email
    const shareViaEmail = useCallback(() => {
        const emailUrl = `mailto:?subject=${encodeURIComponent(articleTitle)}&body=${encodeURIComponent(`Check out this article: ${fullUrl}`)}`
        window.location.href = emailUrl
    }, [articleTitle, fullUrl])

    // Handle save/bookmark
    const handleSave = useCallback(() => {
        setIsSaved(!isSaved)
        toast({
            title: isSaved ? 'Removed from saved' : 'Saved!',
            description: isSaved
                ? 'Article removed from your saved items.'
                : 'Article saved for later.',
        })
    }, [isSaved, toast])

    // Check if native share is supported
    const hasNativeShare = typeof navigator !== 'undefined' && !!navigator.share

    return (
        <div className="flex items-center space-x-4">
            {/* Share Button */}
            {hasNativeShare ? (
                <button
                    onClick={handleShare}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
                    aria-label="Share article"
                >
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Share</span>
                </button>
            ) : (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
                            aria-label="Share article"
                        >
                            <Share2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Share</span>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={handleCopyLink}>
                            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                            {copied ? 'Copied!' : 'Copy link'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={shareToTwitter}>
                            <Twitter className="w-4 h-4 mr-2" />
                            Share on Twitter
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={shareToFacebook}>
                            <Facebook className="w-4 h-4 mr-2" />
                            Share on Facebook
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={shareToLinkedIn}>
                            <Linkedin className="w-4 h-4 mr-2" />
                            Share on LinkedIn
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={shareViaEmail}>
                            <Mail className="w-4 h-4 mr-2" />
                            Share via Email
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}

            {/* Save Button */}
            <button
                onClick={handleSave}
                className={`flex items-center gap-2 transition-colors ${isSaved
                        ? 'text-blue-600 hover:text-blue-700'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                aria-label={isSaved ? 'Remove from saved' : 'Save article'}
            >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                <span className="hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
            </button>
        </div>
    )
}
