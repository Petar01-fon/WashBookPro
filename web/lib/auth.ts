import { apiFetch } from "@/lib/api";

const ACCESS_TOKEN_KEY = "washbook_access_token";
const REFRESH_TOKEN_KEY = "washbook_refresh_token";

// ── Token storage ──────────────────────────────────────────────

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function saveTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// ── JWT decode ─────────────────────────────────────────────────

type JwtPayload = {
  sub: string;
  tenant_id: string;
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": string;
  exp: number;
};

export function decodeToken(token: string): JwtPayload | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload as JwtPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload) return true;
  return payload.exp * 1000 < Date.now();
}

// ── Login / logout ─────────────────────────────────────────────

type LoginRequest = {
  email: string;
  password: string;
};

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  tenantSlug: string;
};

export async function login(credentials: LoginRequest): Promise<void> {
  const data = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: credentials,
  });
  saveTokens(data.accessToken, data.refreshToken);
  if (data.tenantSlug) saveTenantSlug(data.tenantSlug);
}

export function logout(): void {
  clearTokens();
  document.cookie = "washbook_authed=; path=/; max-age=0";
}

// ── Helpers ───────────────────────────────────────────────────

export function getRole(): string | null {
  const token = getAccessToken();
  if (!token) return null;
  const payload = decodeToken(token);
  return (payload as any)?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ?? null;
}

export function getTenantSlug(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("washbook_tenant_slug");
}

export function saveTenantSlug(slug: string): void {
  localStorage.setItem("washbook_tenant_slug", slug);
}
// TODO: Multi-tenant user support — dokumentovati u novom ADR kada zatreba
// TODO: Super Admin impersonation — dokumentovati u novom ADR kada zatreba