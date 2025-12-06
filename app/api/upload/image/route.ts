import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client for storage operations
const supabaseUrl = 'https://itdmwpbsnviassgqfhxk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Bucket name - matches what user created in Supabase dashboard
const BUCKET_NAME = 'Article-image'

export async function POST(request: NextRequest) {
    console.log('📤 Image upload API called')

    try {
        const formData = await request.formData()
        const file = formData.get('image') as File | null

        if (!file) {
            console.log('❌ No image file in request')
            return NextResponse.json(
                { error: 'No image file provided' },
                { status: 400 }
            )
        }

        console.log('📁 File received:', file.name, 'Size:', file.size, 'Type:', file.type)

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return NextResponse.json(
                { error: 'File must be an image' },
                { status: 400 }
            )
        }

        // Validate file size (max 5MB)
        const MAX_SIZE = 5 * 1024 * 1024
        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                { error: 'Image must be less than 5MB' },
                { status: 400 }
            )
        }

        // Generate unique filename
        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(2, 8)
        const extension = file.name.split('.').pop() || 'jpg'
        const fileName = `article-${timestamp}-${randomStr}.${extension}`

        console.log('📝 Generated filename:', fileName)

        // Convert file to buffer for upload
        const arrayBuffer = await file.arrayBuffer()
        const buffer = new Uint8Array(arrayBuffer)

        console.log('🚀 Uploading to Supabase Storage bucket:', BUCKET_NAME)

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, buffer, {
                contentType: file.type,
                cacheControl: '31536000', // Cache for 1 year
                upsert: false
            })

        if (error) {
            console.error('❌ Supabase storage upload error:', error)
            console.error('Error details:', JSON.stringify(error, null, 2))

            // Provide helpful error messages
            let userMessage = 'Failed to upload image'
            if (error.message?.includes('Bucket not found')) {
                userMessage = 'Storage bucket "Article-image" not found. Please create it in Supabase Dashboard.'
            } else if (error.message?.includes('row-level security') || error.message?.includes('policy')) {
                userMessage = 'Storage permissions error. Please add an INSERT policy to the bucket.'
            } else if (error.message) {
                userMessage = error.message
            }

            return NextResponse.json(
                { error: userMessage, details: error.message },
                { status: 500 }
            )
        }

        console.log('✅ Upload successful:', data)

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(fileName)

        const publicUrl = urlData.publicUrl

        console.log('🔗 Public URL:', publicUrl)

        return NextResponse.json({
            success: true,
            url: publicUrl,
            fileName: fileName
        })

    } catch (error) {
        console.error('❌ Image upload error:', error)
        return NextResponse.json(
            { error: 'Failed to process image upload', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}
