import { eq } from "drizzle-orm";
import { users } from "@shared/schema";
import { db } from "./db";

const MAX_USERNAME_LENGTH = 20;

const normalizeUsernameSeed = (seed: string) => {
  const cleaned = seed
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/_+/g, "_")
    .replace(/\.+/g, ".")
    .replace(/^[._-]+|[._-]+$/g, "");

  if (!cleaned) return "user";
  return cleaned.slice(0, MAX_USERNAME_LENGTH);
};

export const generateUniqueUsername = async (seed: string) => {
  const base = normalizeUsernameSeed(seed);

  for (let i = 0; i < 100; i += 1) {
    const suffix = i === 0 ? "" : String(i);
    const trimmed = base.slice(0, MAX_USERNAME_LENGTH - suffix.length);
    const candidate = `${trimmed}${suffix}`;

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, candidate));

    if (!existing) return candidate;
  }

  const fallback = `${base.slice(0, 12)}${Date.now().toString().slice(-6)}`;
  return fallback.slice(0, MAX_USERNAME_LENGTH);
};

export const generateUsernameSuggestions = async (
  requestedUsername: string,
  count: number = 5,
): Promise<string[]> => {
  const base = normalizeUsernameSeed(requestedUsername);
  const suggestions: string[] = [];

  // Try numeric suffixes first
  for (let i = 1; i <= count * 2 && suggestions.length < count; i += 1) {
    const candidate = `${base}${i}`;

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, candidate));

    if (!existing) {
      suggestions.push(candidate);
    }
  }

  // If we need more, try with underscores
  for (let i = 1; i <= count && suggestions.length < count; i += 1) {
    const candidate = `${base}_${i}`;

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, candidate));

    if (!existing) {
      suggestions.push(candidate);
    }
  }

  // If we still need more, try removing last character and adding suffix
  if (suggestions.length < count && base.length > 5) {
    const shortened = base.slice(0, -1);
    for (let i = 1; i <= count && suggestions.length < count; i += 1) {
      const candidate = `${shortened}${i}`;

      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, candidate));

      if (!existing) {
        suggestions.push(candidate);
      }
    }
  }

  return suggestions.slice(0, count);
};
