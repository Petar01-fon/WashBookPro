import { getCustomerToken } from "./customer-auth";

const API = process.env.NEXT_PUBLIC_API_URL!;

async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getCustomerToken();
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
}

async function throwOnError(res: Response): Promise<void> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as Record<string, string>).error ?? "Greška na serveru.");
  }
}

export interface ProfileData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}

export async function getProfile(): Promise<ProfileData> {
  const res = await authFetch("/auth/customer/me");
  await throwOnError(res);
  return res.json();
}

export async function updateProfile(data: {
  firstName: string;
  lastName: string;
  phoneNumber: string;
}): Promise<ProfileData> {
  const res = await authFetch("/auth/customer/me", {
    method: "PUT",
    body: JSON.stringify(data),
  });
  await throwOnError(res);
  return res.json();
}

export async function changeEmail(data: {
  newEmail: string;
  currentPassword: string;
}): Promise<void> {
  const res = await authFetch("/auth/customer/me/email", {
    method: "PUT",
    body: JSON.stringify(data),
  });
  await throwOnError(res);
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<TokenPair> {
  const res = await authFetch("/auth/customer/me/password", {
    method: "PUT",
    body: JSON.stringify(data),
  });
  await throwOnError(res);
  return res.json();
}
