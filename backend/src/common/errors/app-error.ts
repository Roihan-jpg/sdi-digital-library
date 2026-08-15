export class AppError extends Error {
  readonly cause?: unknown;

  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    cause?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
    this.cause = cause;
  }
}
