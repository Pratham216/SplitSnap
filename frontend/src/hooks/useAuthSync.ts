import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { syncClerkUser, type AppUser } from "../api/users";
import { clearUserSession, setUserSession } from "../lib/auth";

let cachedUser: AppUser | null = null;

export function useAuthSync() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const syncing = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      clearUserSession();
      cachedUser = null;
      return;
    }

    if (syncing.current) return;
    syncing.current = true;

    (async () => {
      try {
        const clerkToken = await getToken();
        if (!clerkToken) return;
        const data = await syncClerkUser(clerkToken);
        setUserSession(data.token, data.guestId);
        cachedUser = data.user;
      } catch (err) {
        console.error("Auth sync failed:", err);
      } finally {
        syncing.current = false;
      }
    })();
  }, [isLoaded, isSignedIn, getToken]);
}

export function getCachedUser() {
  return cachedUser;
}

export function setCachedUser(user: AppUser | null) {
  cachedUser = user;
}
