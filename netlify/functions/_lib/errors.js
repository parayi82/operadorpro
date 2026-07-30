// ============================================================
// errors.js — Errores tipados de dominio. El handler central los
// mapea a códigos HTTP; nunca se filtra un stack trace al cliente.
// ============================================================

class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || "app_error";
  }
}

class ValidationError extends AppError {
  constructor(message, details) {
    super(message, 400, "validation_error");
    this.details = details;
  }
}

class AuthError extends AppError {
  constructor(message = "Sesión no válida") {
    super(message, 401, "auth_error");
  }
}

class ForbiddenError extends AppError {
  constructor(message = "No tienes permiso para esta acción") {
    super(message, 403, "forbidden");
  }
}

class NotFoundError extends AppError {
  constructor(message = "Recurso no encontrado") {
    super(message, 404, "not_found");
  }
}

class RateLimitError extends AppError {
  constructor(message = "Demasiadas solicitudes, intenta más tarde") {
    super(message, 429, "rate_limited");
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  RateLimitError
};
