import { HttpStatus } from '@nestjs/common';

/**
 * Error kinds — single source of truth for every error in the domain.
 *
 * Each entry defines:
 * - `kind` — stable machine-readable identifier (used as `code` in the envelope)
 * - `statusCode` — HTTP status
 * - `message` — default human-readable message
 *
 * Usage: `throw DomainError.fromKind('ENTITY_NOT_FOUND', cause)`
 */
export const ErrorKind = {
  // ── Common ───────────────────────────────────────────────
  INTERNAL_ERROR: { kind: 'INTERNAL_ERROR', statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Error genérico' },

  // ── App ──────────────────────────────────────────────────
  APP_ERROR: { kind: 'APP_ERROR', statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Error en App.' },
  APP_VERSION_NOT_FOUND: {
    kind: 'APP_VERSION_NOT_FOUND',
    statusCode: HttpStatus.NOT_FOUND,
    message: 'Error en App, no se pudo obtener la version.',
  },

  // ── Entity ───────────────────────────────────────────────
  ENTITY_ERROR: { kind: 'ENTITY_ERROR', statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Error en Entity.' },
  ENTITY_NOT_FOUND: {
    kind: 'ENTITY_NOT_FOUND',
    statusCode: HttpStatus.NOT_FOUND,
    message: 'Error Entity, al obtener el registro.',
  },
  ENTITY_NAME_ALREADY_EXISTS: {
    kind: 'ENTITY_NAME_ALREADY_EXISTS',
    statusCode: HttpStatus.CONFLICT,
    message: 'Error Entity, el nombre ya existe.',
  },
  ENTITY_EMAIL_ALREADY_EXISTS: {
    kind: 'ENTITY_EMAIL_ALREADY_EXISTS',
    statusCode: HttpStatus.CONFLICT,
    message: 'Error Entity, el email ya existe.',
  },
  ENTITY_POPULATE: {
    kind: 'ENTITY_POPULATE',
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Error Entity, al poblar base de datos.',
  },
} as const;

export type ErrorKind = (typeof ErrorKind)[keyof typeof ErrorKind];
export type ErrorKindName = keyof typeof ErrorKind;

/**
 * Single DomainError class — data-driven, no inheritance hierarchy.
 *
 * ```ts
 * // Throw by kind
 * throw DomainError.fromKind('ENTITY_NOT_FOUND');
 *
 * // Throw with custom message
 * throw DomainError.fromKind('ENTITY_NOT_FOUND', cause, 'Custom message');
 *
 * // Check kind
 * if (error.kind === 'ENTITY_NOT_FOUND') { ... }
 * ```
 */
export class DomainError extends Error {
  public readonly kind: string;
  public readonly statusCode: number;

  constructor(kind: string, statusCode: number, message: string, cause?: unknown) {
    super(message);
    this.name = 'DomainError';
    this.kind = kind;
    this.statusCode = statusCode;

    if (cause instanceof Error) {
      this.stack = cause.stack;
    }
  }

  /**
   * Create a DomainError from a known ErrorKind name.
   * @param name — key from the ErrorKind registry
   * @param cause — original error or message override
   * @param message — optional custom message (defaults to registry message)
   */
  static fromKind(name: ErrorKindName, cause?: unknown, message?: string): DomainError {
    const entry = ErrorKind[name];
    return new DomainError(entry.kind, entry.statusCode, message ?? entry.message, cause);
  }

  /** Create a generic 500 for unexpected errors */
  static internal(cause?: unknown, message?: string): DomainError {
    return DomainError.fromKind('INTERNAL_ERROR', cause, message);
  }
}
