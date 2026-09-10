import {
  AuthError,
  type AuthSession,
  type LoginCredentials,
  type RegisterCredentials,
  type User,
} from "./auth.types";

/**
 * ----------------------------------------------------------------------------
 * auth.service.ts — authentication service abstraction
 * ----------------------------------------------------------------------------
 * This is the single boundary between the UI and authentication.
 *
 *   UI  →  useAuth()  →  AuthProvider  →  auth.service  →  (future) Spring Boot
 *
 * Today the implementation is a FRONTEND MOCK for development. To connect the
 * real backend later, only the bodies below change — the public surface stays
 * identical:
 *
 *   login(email, password)   →  POST /api/auth/login   (returns { token, user })
 *   getCurrentUser()         →  GET  /api/auth/me      (JWT in Authorization header)
 *   logout()                 →  POST /api/auth/logout
 *
 * with a JWT/session (Spring Security), and `register` / `requestPasswordReset`
 * map to their own REST endpoints. No component code needs to change.
 * ----------------------------------------------------------------------------
 */

export const SESSION_STORAGE_KEY = "urbanforma.session";
const REMEMBER_EMAIL_KEY = "urbanforma.rememberedEmail";
const MIN_PASSWORD_LENGTH = 6;

/**
 * Development session lifetime. The real backend will drive expiry via the
 * JWT (`exp`) and a refresh-token flow; this only keeps the local dev session
 * from living forever.
 */
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days (dev)

/* Development profile (documented on the login page). */
const DEV_ROLE: User["role"] = "Urban Planner";

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeToken(): string {
  const rand = Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `dev.${btoa("urbanforma").toLowerCase()}.${rand}`;
}

function pickStorage(remember?: boolean): Storage {
  // remember=true  → persist across restarts (localStorage)
  // remember=false → cleared when the tab closes (sessionStorage)
  return remember === false ? window.sessionStorage : window.localStorage;
}

function buildUser(email: string): User {
  const clean = email.trim().toLowerCase();
  const name =
    clean === "user@urbanforma.app"
      ? "UrbanForma User"
      : email
          .split("@")[0]
          .replace(/[._-]+/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());

  // Deterministic dev id from the email (so re-login is stable).
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash * 31 + clean.charCodeAt(i)) >>> 0;
  }

  return {
    id: `dev-${hash.toString(36)}`,
    name,
    email: clean,
    avatar: null, // UI falls back to initials until real avatars exist.
    role: DEV_ROLE,
  };
}

function writeSession(session: AuthSession, remember?: boolean): void {
  pickStorage(remember).setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify(session)
  );
  if (remember) {
    window.localStorage.setItem(REMEMBER_EMAIL_KEY, session.user.email);
  } else {
    window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
  }
}

/** Shape guard — ensures a persisted blob is a usable session. */
function isSessionShape(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  const u = s.user as Record<string, unknown> | undefined;
  return (
    typeof s.token === "string" &&
    typeof s.issuedAt === "number" &&
    !!u &&
    typeof u.id === "string" &&
    typeof u.email === "string" &&
    typeof u.name === "string"
  );
}

function readRawSession(): AuthSession | null {
  const raw =
    window.localStorage.getItem(SESSION_STORAGE_KEY) ??
    window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isSessionShape(parsed) ? parsed : null;
  } catch {
    // Corrupted storage — do not crash; fall through to clearing.
    return null;
  }
}

function readSession(): AuthSession | null {
  const session = readRawSession();
  if (session && isSessionValid(session)) return session;

  // Invalid / expired / corrupted — clear it so the app recovers safely.
  if (session || localStorageHasSession()) logout();
  return null;
}

function localStorageHasSession(): boolean {
  return (
    window.localStorage.getItem(SESSION_STORAGE_KEY) !== null ||
    window.sessionStorage.getItem(SESSION_STORAGE_KEY) !== null
  );
}

/* ---------------------------------------------------------------------------
 * Public service API — mirrors the future REST auth client.
 * ------------------------------------------------------------------------- */

/**
 * Validate credentials against the development backend and persist a session.
 * Replace with: POST /api/auth/login → { token, user }.
 */
export async function login(
  credentials: LoginCredentials
): Promise<AuthSession> {
  await delay(850); // emulate network latency

  const email = credentials.email.trim();
  if (!email) throw new AuthError("invalid-email", "Work email is required.");
  if (!isValidEmail(email))
    throw new AuthError("invalid-email", "Please enter a valid email address.");
  if (!credentials.password)
    throw new AuthError("invalid-password", "Password is required.");
  if (credentials.password.length < MIN_PASSWORD_LENGTH)
    throw new AuthError(
      "invalid-password",
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    );

  const session: AuthSession = {
    user: buildUser(email),
    token: makeToken(),
    issuedAt: Date.now(),
  };
  writeSession(session, credentials.remember);
  return session;
}

/**
 * Register a new account. Replace with: POST /api/auth/register.
 * For now it validates and leaves the UI to route to /login.
 */
export async function register(
  credentials: RegisterCredentials
): Promise<void> {
  await delay(750);
  if (!credentials.name.trim())
    throw new AuthError("invalid-name", "Full name is required.");
  if (!isValidEmail(credentials.email))
    throw new AuthError("invalid-email", "Please enter a valid email address.");
  if (credentials.password.length < MIN_PASSWORD_LENGTH)
    throw new AuthError(
      "invalid-password",
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    );
}

/**
 * Request a password reset. Replace with: POST /api/auth/forgot-password.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  await delay(700);
  if (!isValidEmail(email))
    throw new AuthError("invalid-email", "Please enter a valid email address.");
}

/**
 * Return the currently authenticated user, or null.
 * Replace with: GET /api/auth/me using the stored JWT.
 */
export function getCurrentUser(): User | null {
  return readSession()?.user ?? null;
}

/** Whether a valid session exists locally (the API becomes source of truth later). */
export function isAuthenticated(): boolean {
  return readSession() !== null;
}

/**
 * Session-expiration foundation.
 *
 * Today: a session is valid if it has the right shape and is younger than the
 * dev TTL. Later this is driven by the JWT `exp` claim / a call to
 * GET /api/auth/me; refresh will use a refresh token. Kept as explicit
 * placeholders so the architecture already supports Spring Boot/JWT expiry.
 */
export function isSessionValid(session?: AuthSession | null): boolean {
  const s = session ?? readRawSession();
  if (!s || !isSessionShape(s)) return false;
  return Date.now() - s.issuedAt < SESSION_TTL_MS;
}

/**
 * Placeholder for the future refresh-token flow.
 * Dev: simply re-reads the persisted session. NO fake token refresh is
 * performed. Later: POST /api/auth/refresh with the refresh token → new JWT.
 */
export async function refreshSession(): Promise<AuthSession | null> {
  // await api.post("/api/auth/refresh")  ← future
  return readSession();
}

/** Clear the local session. Replace with: POST /api/auth/logout. */
export function logout(): void {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

export function getStoredSession(): AuthSession | null {
  return readSession();
}

export function getRememberedEmail(): string {
  return window.localStorage.getItem(REMEMBER_EMAIL_KEY) ?? "";
}
