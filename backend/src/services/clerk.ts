import { verifyToken, createClerkClient } from "@clerk/backend";
import { config } from "../config";

export interface ClerkIdentity {
  clerkId: string;
  email: string;
  name: string;
}

let clerkClient: ReturnType<typeof createClerkClient> | null = null;

function getClerkClient() {
  if (!clerkClient) {
    clerkClient = createClerkClient({ secretKey: config.clerkSecretKey });
  }
  return clerkClient;
}

async function enrichFromClerk(
  clerkId: string,
  email: string,
  name: string
): Promise<{ email: string; name: string }> {
  if (email && name) return { email, name };

  try {
    const user = await getClerkClient().users.getUser(clerkId);

    const resolvedEmail =
      email ||
      user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
        ?.emailAddress ||
      user.emailAddresses[0]?.emailAddress ||
      "";

    const resolvedName =
      name ||
      [user.firstName, user.lastName]
        .filter((part) => typeof part === "string" && part)
        .join(" ")
        .trim() ||
      user.username ||
      "";

    return { email: resolvedEmail, name: resolvedName };
  } catch {
    return { email, name };
  }
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

    const tokenEmail =
      typeof payload.email === "string"
        ? payload.email
        : typeof payload.primary_email_address === "string"
          ? payload.primary_email_address
          : "";

    const tokenName =
      typeof payload.name === "string"
        ? payload.name
        : [payload.given_name, payload.family_name]
            .filter((part) => typeof part === "string" && part)
            .join(" ")
            .trim();

    const { email, name } = await enrichFromClerk(
      clerkId,
      tokenEmail,
      tokenName
    );

    return { clerkId, email, name };
  } catch {
    return null;
  }
}
