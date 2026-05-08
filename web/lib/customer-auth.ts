const CUSTOMER_TOKEN_KEY = "washbook_customer_token";
const CUSTOMER_REFRESH_KEY = "washbook_customer_refresh";
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// ── Token storage ──────────────────────────────────────────────

export function getCustomerToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CUSTOMER_TOKEN_KEY);
}

export function getCustomerRefresh(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CUSTOMER_REFRESH_KEY);
}

export function saveCustomerTokens(access: string, refresh: string): void {
  localStorage.setItem(CUSTOMER_TOKEN_KEY, access);
  localStorage.setItem(CUSTOMER_REFRESH_KEY, refresh);
}

export function clearCustomerTokens(): void {
  localStorage.removeItem(CUSTOMER_TOKEN_KEY);
  localStorage.removeItem(CUSTOMER_REFRESH_KEY);
}

// ── Token decode ───────────────────────────────────────────────

function decodeCustomerToken(token: string): Record<string, unknown> | null {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export function isCustomerLoggedIn(): boolean {
  const token = getCustomerToken();
  if (!token) return false;
  const payload = decodeCustomerToken(token);
  if (!payload) return false;
  const role = payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
  if (role !== "Customer") return false;
  return (payload.exp as number) * 1000 > Date.now();
}

export interface CustomerTokenInfo {
  firstName: string;
  lastName: string;
  email: string;
  initials: string;
}

export function getCustomerInfoFromToken(): CustomerTokenInfo | null {
  const token = getCustomerToken();
  if (!token) return null;
  const payload = decodeCustomerToken(token);
  if (!payload) return null;
  const firstName = (payload["given_name"] as string) ?? "";
  const lastName = (payload["family_name"] as string) ?? "";
  const email = (payload["email"] as string) ?? "";
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  return { firstName, lastName, email, initials };
}

// ── API calls ──────────────────────────────────────────────────

export async function customerLogin(email: string, password: string): Promise<void> {
  const res = await fetch(`${API_URL}/auth/customer/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as any).error ?? "Greška pri prijavi.");
  }
  const data = await res.json();
  saveCustomerTokens(data.accessToken, data.refreshToken);
}

export async function customerRegister(body: {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
}): Promise<void> {
  const res = await fetch(`${API_URL}/auth/customer/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as any).error ?? "Greška pri registraciji.");
  }
  const data = await res.json();
  saveCustomerTokens(data.accessToken, data.refreshToken);
}

export async function tryCustomerRefresh(): Promise<boolean> {
  const refresh = getCustomerRefresh();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_URL}/auth/customer/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    saveCustomerTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export interface CustomerProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}

export async function fetchCustomerProfile(): Promise<CustomerProfile | null> {
  const token = getCustomerToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_URL}/auth/customer/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function customerLogout(): void {
  clearCustomerTokens();
}
