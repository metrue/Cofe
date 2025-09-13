import { NextRequest, NextResponse } from 'next/server';
import { createBlogPost, createMemo, deleteBlogPost, deleteMemo, updateBlogPost, updateMemo } from '@/lib/githubApi';
import { authOptions } from "@/lib/auth";
import { createOptimizedGitHubClient } from '@/lib/client';
import { getServerSession } from "next-auth/next";
import { handleApiError, AuthenticationError, ValidationError } from '@/lib/errorHandling';

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
      throw new AuthenticationError();
    }

    const { action, ...data } = await request.json();
    console.log('Action:', action);
    console.log('Data:', JSON.stringify(data, null, 2));

    if (!action) {
      throw new ValidationError('Action is required');
    }

    switch (action) {
      case 'createBlogPost':
        if (!data.title || !data.content) {
          throw new ValidationError('Title and content are required');
        }
        await createBlogPost(data.title, data.content, session.accessToken, data.discussions);
        return NextResponse.json({ message: 'Blog post created successfully' }, { headers });
      case 'updateBlogPost':
        if (!data.id || !data.title || !data.content) {
          throw new ValidationError('ID, title and content are required');
        }
        await updateBlogPost(data.id, data.title, data.content, session.accessToken, data.discussions);
        return NextResponse.json({ message: 'Blog post updated successfully' }, { headers });
      case 'deleteBlogPost':
        if (!data.id) {
          throw new ValidationError('ID is required');
        }
        await deleteBlogPost(data.id, session.accessToken);
        return NextResponse.json({ message: 'Blog post deleted successfully' }, { headers });
      case 'createMemo':
        if (!data.content) {
          throw new ValidationError('Content is required');
        }
        await createMemo(data.content, data.image, session.accessToken);
        return NextResponse.json({ message: 'Memo created successfully' }, { headers });
      case 'updateMemo':
        if (!data.id || !data.content) {
          throw new ValidationError('ID and content are required');
        }
        await updateMemo(data.id, data.content, session.accessToken);
        return NextResponse.json({ message: 'Memo updated successfully' }, { headers });
      case 'deleteMemo':
        if (!data.id) {
          throw new ValidationError('ID is required');
        }
        await deleteMemo(data.id, session.accessToken);
        return NextResponse.json({ message: 'Memo deleted successfully' }, { headers });
      default:
        throw new ValidationError('Invalid action');
    }
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status, headers });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const id = searchParams.get('id');
    const owner = searchParams.get('owner');

    if (!action) {
      throw new ValidationError('Action is required');
    }

    // For public reads, we don't require authentication
    // Use optimized client that prefers raw GitHub URLs
    let client;
    let clientOwner = owner;

    if (session?.accessToken) {
      // Authenticated user - use hybrid approach
      if (!clientOwner) {
        // Get owner from authenticated user
        const { Octokit } = await import('@octokit/rest');
        const { data: user } = await new Octokit({ auth: session.accessToken }).users.getAuthenticated();
        clientOwner = user.login;
      }
      client = createOptimizedGitHubClient(clientOwner, session.accessToken);
    } else {
      // Public user - use raw URLs only
      if (!clientOwner) {
        throw new ValidationError('Owner parameter required for public access');
      }
      client = createOptimizedGitHubClient(clientOwner);
    }

    switch (action) {
      case 'getBlogPosts':
        const posts = await client.getBlogPosts();
        return NextResponse.json(posts, { headers });
      case 'getBlogPost':
        if (!id) {
          throw new ValidationError('ID parameter is required');
        }
        const post = await client.getBlogPost(`${id}.md`);
        return NextResponse.json(post, { headers });
      case 'getMemos':
        const memos = await client.getMemos();
        return NextResponse.json(memos, { headers });
      case 'getLinks':
        const links = await client.getLinks();
        return NextResponse.json(links, { headers });
      default:
        throw new ValidationError('Invalid action');
    }
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status, headers });
  }
}
