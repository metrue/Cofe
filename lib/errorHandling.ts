export interface AppError extends Error {
  status?: number;
  code?: string;
}

export class AuthenticationError extends Error {
  status = 401;
  code = 'AUTHENTICATION_ERROR';
  
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class NotFoundError extends Error {
  status = 404;
  code = 'NOT_FOUND';
  
  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  status = 400;
  code = 'VALIDATION_ERROR';
  
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class GitHubApiError extends Error {
  status?: number;
  code = 'GITHUB_API_ERROR';
  
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'GitHubApiError';
    this.status = status;
  }
}

export function handleApiError(error: unknown): { message: string; status: number } {
  console.error('API Error:', error);
  
  if (error instanceof AuthenticationError) {
    return { message: error.message, status: error.status };
  }
  
  if (error instanceof NotFoundError) {
    return { message: error.message, status: error.status };
  }
  
  if (error instanceof ValidationError) {
    return { message: error.message, status: error.status };
  }
  
  if (error instanceof GitHubApiError) {
    return { message: error.message, status: error.status || 500 };
  }
  
  if (error instanceof Error) {
    return { message: error.message, status: 500 };
  }
  
  return { message: 'An unexpected error occurred', status: 500 };
}

export function isNotFoundError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'status' in error &&
    error.status === 404
  ) || error instanceof NotFoundError;
}

export function validateAccessToken(accessToken: string | undefined): string {
  if (!accessToken) {
    throw new AuthenticationError('Access token is required');
  }
  return accessToken;
}

export function validateRequiredFields(fields: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(fields)) {
    if (!value) {
      throw new ValidationError(`${key} is required`);
    }
  }
}