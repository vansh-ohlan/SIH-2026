export interface ApiErrorResponse {
  error: string;
  message: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;

  constructor(statusCode: number, errorCode: string, message: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toJSON(): ApiErrorResponse {
    return {
      error: this.errorCode,
      message: this.message
    };
  }
}

export class NotFoundError extends AppError {
  constructor(errorCode = 'not_found', message = 'Resource not found') {
    super(404, errorCode, message);
    this.name = 'NotFoundError';
  }
}

export class ParcelNotFoundError extends NotFoundError {
  constructor() {
    super('ulpid_not_found', 'No parcel found for this ULPID');
    this.name = 'ParcelNotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Invalid request parameters', errorCode = 'validation_error') {
    super(400, errorCode, message);
    this.name = 'ValidationError';
  }
}

export class UnreadableDocumentError extends AppError {
  constructor(message = 'OCR could not extract required fields') {
    super(422, 'unreadable_document', message);
    this.name = 'UnreadableDocumentError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication token is missing or invalid', errorCode = 'unauthorized') {
    super(401, errorCode, message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions to perform this action', errorCode = 'forbidden') {
    super(403, errorCode, message);
    this.name = 'ForbiddenError';
  }
}

