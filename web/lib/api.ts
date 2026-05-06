import { getAccessToken, logout, tryRefresh } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string;
};

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, token } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const resolvedToken = token ?? (typeof window !== "undefined" ? getAccessToken() : null);
  if (resolvedToken) {
    headers["Authorization"] = `Bearer ${resolvedToken}`;
  }
  

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && !options.token) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const newToken = getAccessToken();
      const retryResponse = await fetch(`${API_URL}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${newToken}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!retryResponse.ok) {
        throw new ApiError(retryResponse.status, retryResponse.statusText);
      }
      if (retryResponse.status === 204) return undefined as T;
      return retryResponse.json() as Promise<T>;
    } else {
      logout();
      window.location.href = "/login";
      throw new ApiError(401, "Session expired");
    }
  }

  if (!response.ok) {
    let message = response.statusText;
    try {
      const data = await response.json();
      message = data.error ?? data.message ?? data.title ?? message;
    } catch {}
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}