import type { ApiError } from "../types";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }

  toResponse(corsHeaders?: Record<string, string>): Response {
    const body: ApiError = {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
    return new Response(JSON.stringify(body), {
      status: this.statusCode,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  }
}

export function notFound(resource: string = "Resource") {
  return new AppError(404, "NOT_FOUND", `${resource} not found`);
}

export function validationError(message: string, details?: unknown) {
  return new AppError(400, "VALIDATION_ERROR", message, details);
}

export function unauthorized(message = "Unauthorized") {
  return new AppError(401, "UNAUTHORIZED", message);
}

export function forbidden(message = "Forbidden") {
  return new AppError(403, "FORBIDDEN", message);
}

export function rateLimited() {
  return new AppError(429, "RATE_LIMITED", "Too many requests, try again later");
}

export function internalError(message = "Internal server error") {
  return new AppError(500, "INTERNAL_ERROR", message);
}
