import { verifyToken } from "@clerk/backend";
import { config } from "../config";

export interface ClerkIdentity {
  clerkId: string;
  email: string;
  name: string;
}

export async function verifyClerkToken(
  token: string
): Promise<ClerkIdentity | null> {
  if (!config.clerkSecretKey) {
    throw new Error("CLERK_SECRET_KEY is not configured on the server");
  }

  try {
    const payload = await verifyToken(token, {
      secretKey: config.clerkSecretKey,
    });

    const clerkId = payload.sub;
    if (!clerkId) return null;

    const email =
      typeof payload.email === "string"
        ? payload.email
        : typeof payload.primary_email_address === "string"
          ? payload.primary_email_address
          : "";

    const name =
      typeof payload.name === "string"
        ? payload.name
        : [payload.given_name, payload.family_name]
            .filter((part) => typeof part === "string" && part)
            .join(" ")
            .trim();

    return { clerkId, email, name };
  } catch {
    return null;
  }
}
