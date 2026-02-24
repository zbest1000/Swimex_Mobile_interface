import { API_ERROR_CODES } from '../shared/protocols';

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(API_ERROR_CODES.AUTH_REQUIRED, message, 401);
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(API_ERROR_CODES.INSUFFICIENT_PERMISSIONS, message, 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(API_ERROR_CODES.RESOURCE_NOT_FOUND, message, 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(API_ERROR_CODES.VALIDATION_ERROR, message, 400);
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many attempts, please try again later') {
    super(API_ERROR_CODES.RATE_LIMITED, message, 429);
    this.name = 'RateLimitError';
  }
}

export class DeviceNotRegisteredError extends AppError {
  constructor() {
    super(API_ERROR_CODES.VIEW_ONLY, 'Device not registered — view-only access', 403);
    this.name = 'DeviceNotRegisteredError';
  }
}
