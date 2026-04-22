import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "washbookpro_token";

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export interface JwtClaims {
  sub: string;
  email: string;
  tenant_id: string;
  role: string;
  exp: number;
}

export function decodeToken(token: string): JwtClaims | null {
  try {
    const payload = token.split(".")[1];
    const decoded = atob(payload);
    return JSON.parse(decoded) as JwtClaims;
  } catch {
    return null;
  }
}