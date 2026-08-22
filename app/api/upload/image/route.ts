import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-admin'
import { requireAdminOrContributor } from '@/lib/admin-auth'

// Uploads run on the service role. They used the public anon key, which is why
// the storage bucket needed a policy letting anon write to it -- and that policy
// checked only the bucket name, so anyone on the internet could put files in it.
// With the upload authenticated here and performed as the service role, the
// bucket needs no anon write policy at all.
const supabase = getServiceClient()

// Bucket name - matches what user created in Supabase dashboard
const BUCKET_NAME = 'Article-image'

export async function POST(request: NextRequest) {
    console.log('📤 Image upload API called')

    try {
        const auth = requireAdminOrContributor(request)
        if (!auth.ok) return auth.response

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
                // Uploads run as the service role, which ignores bucket policies
                // entirely. Being refused by one means the key is missing and the
                // request fell back to the anon key -- so the old advice here, to
                // add an INSERT policy, pointed at the wrong thing and would have
                // reopened the bucket to the internet.
                userMessage = process.env.SUPABASE_SERVICE_ROLE_KEY
                    ? 'The storage bucket refused the upload. Check the Article-image bucket still exists.'
                    : 'Uploads are not configured on this environment: SUPABASE_SERVICE_ROLE_KEY is missing.'
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
