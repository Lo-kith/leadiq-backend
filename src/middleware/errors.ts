export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static payloadTooLarge(message = 'Uploaded file is too large') {
    return new AppError(413, 'PAYLOAD_TOO_LARGE', message);
  }

  static validation(message: string, details?: unknown) {
    return new AppError(422, 'VALIDATION_ERROR', message, details);
  }
}
