import { v4 as uuidv4 } from "uuid";
import { isValidUpiId, normalizeUpiId } from "@splitsnap/shared";
import { User, IUser } from "../models/User";

export function serializeUser(user: IUser) {
  return {
    id: user._id.toString(),
    clerkId: user.clerkId,
    email: user.email,
    name: user.name,
    upiId: user.upiId ?? "",
    hasUpi: !!user.upiId,
  };
}

export async function findOrCreateUserFromClerk(input: {
  clerkId: string;
  email: string;
  name: string;
}) {
  let user = await User.findOne({ clerkId: input.clerkId });
  if (user) {
    let changed = false;
    if (input.email && user.email !== input.email) {
      user.email = input.email;
      changed = true;
    }
    if (input.name && user.name !== input.name) {
      user.name = input.name;
      changed = true;
    }
    if (changed) await user.save();
    return user;
  }

  user = await User.create({
    clerkId: input.clerkId,
    email: input.email,
    name: input.name || "Host",
    participantGuestId: uuidv4(),
  });

  return user;
}

export async function updateUserUpi(userId: string, upiId: string) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const trimmed = upiId.trim();
  if (!trimmed) {
    user.upiId = undefined;
    await user.save();
    return user;
  }

  if (!isValidUpiId(trimmed)) {
    throw new Error("Invalid UPI ID. Use format: name@bank (e.g. you@ybl)");
  }

  user.upiId = normalizeUpiId(trimmed);
  await user.save();
  return user;
}

export async function getUserById(userId: string) {
  return User.findById(userId);
}
