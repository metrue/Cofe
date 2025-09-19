'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Heart } from 'lucide-react'

interface LikeInfo {
  count: number
  countries: string[]
  userLiked: boolean
}

interface LikeButtonProps {
  type: 'blog' | 'memo'
  id: string
  initialLikes?: LikeInfo
  className?: string
}

export default function LikeButton({ type, id, initialLikes, className = '' }: LikeButtonProps) {
  const [likes, setLikes] = useState<LikeInfo>(
    initialLikes || { count: 0, countries: [], userLiked: false }
  )
  const [isLoading, setIsLoading] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)

  const fetchLikes = useCallback(async () => {
    try {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query GetLikes($itemType: String!, $id: String!) {
              getLikes(itemType: $itemType, id: $id) {
                count
                countries
                userLiked
              }
            }
          `,
          variables: { itemType: type, id },
        }),
      })

      const result = await response.json()
      if (result.data?.getLikes) {
        setLikes(result.data.getLikes)
      }
    } catch (error) {
      console.error('Error fetching likes:', error)
    }
  }, [type, id])

  // Fetch initial likes data if not provided
  useEffect(() => {
    if (!initialLikes && !hasInteracted) {
      fetchLikes()
    }
  }, [initialLikes, hasInteracted, fetchLikes])

  const toggleLike = async () => {
    if (isLoading) return

    setIsLoading(true)
    setHasInteracted(true)

    // Optimistic update
    const optimisticLikes: LikeInfo = {
      count: likes.userLiked ? likes.count - 1 : likes.count + 1,
      countries: likes.countries,
      userLiked: !likes.userLiked
    }
    setLikes(optimisticLikes)

    try {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            mutation ToggleLike($itemType: String!, $id: String!) {
              toggleLike(itemType: $itemType, id: $id) {
                liked
                count
                countries
              }
            }
          `,
          variables: { itemType: type, id },
        }),
      })

      const result = await response.json()
      
      if (result.data?.toggleLike) {
        // Update with server response
        setLikes({
          count: result.data.toggleLike.count,
          countries: result.data.toggleLike.countries,
          userLiked: result.data.toggleLike.liked
        })
      } else if (result.errors) {
        console.error('GraphQL errors:', result.errors)
        // Revert optimistic update
        setLikes(likes)
      }
    } catch (error) {
      console.error('Error toggling like:', error)
      // Revert optimistic update
      setLikes(likes)
    } finally {
      setIsLoading(false)
    }
  }

  const formatLikeDisplay = (likeInfo: LikeInfo): string => {
    const { count, countries } = likeInfo
    
    if (count === 0) {
      return 'Be the first to like this'
    }
    
    if (count === 1) {
      return '1 like'
    }
    
    if (countries.length === 0) {
      return `${count} likes`
    }
    
    if (countries.length <= 3) {
      return `${count} likes from ${countries.join(', ')}`
    }
    
    return `${count} likes from ${countries.slice(0, 3).join(', ')} and ${countries.length - 3} more`
  }

  return (
    <button
      onClick={toggleLike}
      disabled={isLoading}
      className={`
        flex items-center gap-1 p-1 transition-all duration-200 ${className}
        ${likes.userLiked 
          ? 'text-red-600' 
          : 'text-gray-600 hover:text-gray-800'
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        hover:scale-105 active:scale-95
      `}
      title={formatLikeDisplay(likes)}
    >
      <Heart
        size={16}
        className={`transition-all duration-200 ${
          likes.userLiked ? 'fill-red-500 text-red-500' : 'text-gray-400'
        }`}
      />
      <span className="text-sm font-medium">
        {likes.count > 0 ? likes.count : ''}
      </span>
    </button>
  )
}