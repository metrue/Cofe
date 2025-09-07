import { type ClassValue, clsx } from "clsx"

import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);

  // Check if the date is valid
  if (isNaN(date.getTime())) {
    console.error('Invalid date:', timestamp);
    return 'Invalid date';
  }

  // Format the date string in the user's local time zone
  const localDateString = date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  // Get the local time zone offset
  const offsetMinutes = -date.getTimezoneOffset();
  const offsetHours = Math.floor(offsetMinutes / 60);
  const offsetSign = offsetHours >= 0 ? '+' : '-';
  const absOffsetHours = Math.abs(offsetHours);

  // Reformat the date string to match the desired format
  const [datePart, timePart] = localDateString.split(', ');
  const [month, day, year] = datePart.split('/');
  
  return `${year}/${month}/${day} ${timePart}(UTC${offsetSign}${absOffsetHours})`;
};

export function getRelativeTimeString(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

/**
 * Process memo content for preview in StatusCard
 * - Strips image markdown syntax
 * - Replaces images with [image] placeholder
 * - Preserves other text content
 */
export function processMemoForPreview(content: string): { 
  processedContent: string; 
  hasImages: boolean;
} {
  // Match markdown image syntax: ![alt](url)
  const imageRegex = /!\[([^\]]*)\]\([^\)]+\)/g;
  const hasImages = imageRegex.test(content);
  
  // Replace images with a simple placeholder
  const processedContent = content.replace(imageRegex, '[image]');
  
  return {
    processedContent: processedContent.trim(),
    hasImages
  };
}
