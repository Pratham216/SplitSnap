import { resolveApiToken } from "../lib/auth";

const API_BASE = "/api";

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  auth: boolean | "guest" = true
): Promise<T> {
  const headers = new Headers(options.headers);

  if (auth) {
    const token = await resolveApiToken(auth === "guest");
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}
