import { apiRequest } from "./client";

export interface AppUser {
  id: string;
  clerkId: string;
  email: string;
  name: string;
  upiId: string;
  hasUpi: boolean;
}

export async function syncClerkUser(clerkToken: string) {
  const res = await fetch("/api/auth/sync", {
    method: "POST",
    headers: { Authorization: `Bearer ${clerkToken}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Failed to sync account");
  }
  return res.json() as Promise<{
    token: string;
    guestId: string;
    user: AppUser;
  }>;
}

export async function getCurrentUser(): Promise<AppUser> {
  return apiRequest<AppUser>("/users/me");
}

export async function updateUserUpi(upiId: string): Promise<AppUser> {
  return apiRequest<AppUser>("/users/me/upi", {
    method: "PATCH",
    body: JSON.stringify({ upiId }),
  });
}
