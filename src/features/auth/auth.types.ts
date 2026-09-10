/**
 * Authentication domain models.
 * Kept deliberately simple and easy to extend when the Java Spring Boot /
 * JWT backend lands (e.g. add refreshToken, permissions, tenantId…).
 */

/** Application role. `string`-backed so new roles need no code change. */
export type UserRole =
  | "Urban Planner"
  | "Administrator"
  | "Reviewer"
  | "Sustainability Analyst"
  // eslint-disable-next-line @typescript-eslint/ban-types
  | (string & {});

export interface User {
  id: string;
  name: string;
  email: string;
  /** Optional avatar URL; null until real profiles exist (UI shows initials). */
  avatar: string | null;
  role: UserRole;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface AuthSession {
  user: User;
  /** Placeholder for the future JWT access token. */
  token: string;
  /** Reserved for the future refresh-token flow. */
  refreshToken?: string;
  issuedAt: number;
}

export type AuthErrorCode =
  | "invalid-email"
  | "invalid-password"
  | "invalid-name"
  | "password-mismatch"
  | "unauthenticated"
  | "unknown";

export class AuthError extends Error {
  code: AuthErrorCode;
  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "AuthError";
  }
}
