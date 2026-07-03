export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function handleApiError(err: unknown) {
  if (err instanceof ApiError) {
    return { status: err.status, body: { error: err.message, details: err.details } };
  }
  return { status: 500, body: { error: 'Internal server error' } };
}
