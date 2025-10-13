import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Counting ALL articles in Supabase...');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables are not configured')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get total count
    const { count: totalCount, error: totalError } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true });
    
    if (totalError) {
      return NextResponse.json({ error: totalError.message }, { status: 500 });
    }
    
    // Get detailed breakdown
    const { data: allData, error: dataError } = await supabase
      .from('articles')
      .select('id, title, type, status, created_at')
      .order('created_at', { ascending: false });
    
    if (dataError) {
      return NextResponse.json({ error: dataError.message }, { status: 500 });
    }
    
    const articles = allData.filter(item => item.type !== 'event');
    const events = allData.filter(item => item.type === 'event');
    const published = allData.filter(item => item.status === 'published');
    const drafts = allData.filter(item => item.status === 'draft');
    
    return NextResponse.json({
      success: true,
      total: totalCount,
      breakdown: {
        articles: articles.length,
        events: events.length,
        published: published.length,
        drafts: drafts.length
      },
      recentItems: allData.slice(0, 10).map(item => ({
        title: item.title,
        type: item.type || 'article',
        status: item.status,
        created_at: item.created_at
      }))
    });
  } catch (error) {
    console.error('Error counting articles:', error);
    return NextResponse.json(
      { error: 'Failed to count articles', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

