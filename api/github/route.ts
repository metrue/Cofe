import { NextRequest, NextResponse } from 'next/server';
import { createBlogPost, createMemo, deleteBlogPost, deleteMemo, updateBlogPost, updateMemo } from '@/lib/githubApi';

import { authOptions } from "@/lib/auth";
import { createGitHubAPIClient } from '@/lib/client';
import { getServerSession } from "next-auth/next";

export const dynamic = 'force-dynamic'; // Disable caching for this route
export const revalidate = 60; // Revalidate every 60 seconds

// Add cache control headers
const headers = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
  'Content-Type': 'application/json',
};

export async function POST(request: NextRequest) {
  try {
    console.log('POST request received');
    const session = await getServerSession(authOptions);
    
    if (!session || !session.accessToken) {
      console.log('No valid session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
    }

    const { action, ...data } = await request.json();
    console.log('Action:', action);
    console.log('Data:', JSON.stringify(data, null, 2));

    switch (action) {
      case 'createBlogPost':
        await createBlogPost(data.title, data.content, session.accessToken);
        return NextResponse.json({ message: 'Blog post created successfully' }, { headers });
      case 'updateBlogPost':
        await updateBlogPost(data.id, data.title, data.content, session.accessToken);
        return NextResponse.json({ message: 'Blog post updated successfully' }, { headers });
      case 'deleteBlogPost':
        await deleteBlogPost(data.id, session.accessToken);
        return NextResponse.json({ message: 'Blog post deleted successfully' }, { headers });
      case 'createMemo':
        await createMemo(data.content, data.image, session.accessToken);
        return NextResponse.json({ message: 'Memo created successfully' }, { headers });
      case 'updateMemo':
        await updateMemo(data.id, data.content, session.accessToken);
        return NextResponse.json({ message: 'Memo updated successfully' }, { headers });
      case 'deleteMemo':
        await deleteMemo(data.id, session.accessToken);
        return NextResponse.json({ message: 'Memo deleted successfully' }, { headers });
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400, headers });
    }
  } catch (error) {
    console.error('Error in /api/github POST:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
      return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500, headers });
    }
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500, headers });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.accessToken) {
      console.log('No valid session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const id = searchParams.get('id');

    const client = createGitHubAPIClient(session.accessToken)

    switch (action) {
      case 'getBlogPosts':
        const posts = await client.getBlogPosts();
        return NextResponse.json(posts, { headers });
      case 'getBlogPost':
        if (!id) {
          return NextResponse.json({ error: 'Missing id parameter' }, { status: 400, headers });
        }
        const post = await client.getBlogPost(`${id}.md`);
        return NextResponse.json(post, { headers });
      case 'getMemos':
        const memos = await client.getMemos()
        return NextResponse.json(memos, { headers });
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400, headers });
    }
  } catch (error) {
    console.error('Error in /api/github GET:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers });
    }
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500, headers });
  }
}
