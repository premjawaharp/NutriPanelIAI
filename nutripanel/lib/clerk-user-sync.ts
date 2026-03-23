/**
 * Clerk ↔ Postgres User sync. All operations are scoped by Clerk user id (`user_…`)
 * or normalized primary email — never table-wide.
 */
import type { PrismaClient } from "@/app/generated/prisma/client";

/** Clerk user ids are opaque strings with this prefix (see Clerk docs). */
const CLERK_USER_ID_PREFIX = "user_";
const MAX_EMAIL_LEN = 320;
const MAX_NAME_LEN = 256;

export function assertClerkUserId(id: string): void {
  if (!id || typeof id !== "string") {
    throw new WebhookPayloadError("Invalid user id");
  }
  const trimmed = id.trim();
  if (trimmed.length === 0 || trimmed.length > 128) {
    throw new WebhookPayloadError("Invalid user id length");
  }
  if (!trimmed.startsWith(CLERK_USER_ID_PREFIX)) {
    throw new WebhookPayloadError("Unexpected user id format");
  }
}

export function normalizePrimaryEmail(raw: string | undefined): string {
  if (raw == null || typeof raw !== "string") {
    throw new WebhookPayloadError("Missing email");
  }
  const email = raw.trim().toLowerCase();
  if (email.length === 0 || email.length > MAX_EMAIL_LEN) {
    throw new WebhookPayloadError("Invalid email");
  }
  if (!email.includes("@")) {
    throw new WebhookPayloadError("Invalid email");
  }
  return email;
}

export class WebhookPayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookPayloadError";
  }
}

type Db = PrismaClient;

/**
 * user.created & user.updated: upsert semantics.
 * - If row exists for this Clerk id → update name + email.
 * - Else if another row has same email (ghost) → delete that row in same tx, then insert.
 * - Else → insert.
 */
export type UpsertUserOutcome =
  | { action: "created"; userId: string }
  | { action: "created_replacing_ghost"; userId: string; removedGhostUserId: string }
  | { action: "updated"; userId: string };

export async function upsertUserFromClerk(
  db: Db,
  params: {
    id: string;
    email: string;
    firstName: string | null | undefined;
    lastName: string | null | undefined;
  }
): Promise<UpsertUserOutcome> {
  const { id, email, firstName, lastName } = params;
  assertClerkUserId(id);
  const normalizedEmail = normalizePrimaryEmail(email);

  const first = truncate(firstName, MAX_NAME_LEN);
  const last = truncate(lastName, MAX_NAME_LEN);

  const existingById = await db.user.findUnique({ where: { id } });
  if (existingById) {
    await db.user.update({
      where: { id },
      data: {
        email: normalizedEmail,
        firstName: first,
        lastName: last,
      },
    });
    return { action: "updated", userId: id };
  }

  return db.$transaction(async (tx) => {
    const ghost = await tx.user.findUnique({
      where: { email: normalizedEmail },
    });
    let removedGhostUserId: string | undefined;
    if (ghost && ghost.id !== id) {
      removedGhostUserId = ghost.id;
      await tx.user.delete({ where: { email: normalizedEmail } });
    }
    await tx.user.create({
      data: {
        id,
        email: normalizedEmail,
        firstName: first,
        lastName: last,
      },
    });
    if (removedGhostUserId) {
      return {
        action: "created_replacing_ghost",
        userId: id,
        removedGhostUserId,
      };
    }
    return { action: "created", userId: id };
  });
}

function truncate(s: string | null | undefined, max: number): string | null {
  if (s == null) return null;
  const t = String(s).trim();
  if (t.length === 0) return null;
  return t.length > max ? t.slice(0, max) : t;
}

/**
 * When Clerk sends user.updated without a primary email in the payload, only sync names.
 */
export async function updateUserNamesIfExists(
  db: Db,
  id: string,
  firstName: string | null | undefined,
  lastName: string | null | undefined
): Promise<{ userId: string; rowsUpdated: number }> {
  assertClerkUserId(id);
  const first = truncate(firstName, MAX_NAME_LEN);
  const last = truncate(lastName, MAX_NAME_LEN);
  const result = await db.user.updateMany({
    where: { id },
    data: { firstName: first, lastName: last },
  });
  return { userId: id, rowsUpdated: result.count };
}

/**
 * user.deleted: delete exactly one `User` by Clerk id (`where: { id }` — 0 or 1 row).
 *
 * Related rows are handled at the database layer (see `schema.prisma`):
 * - `Subscription`, `Recipe`, `AuditEvent`: `onDelete: Cascade` — removed with the user.
 * - `Ingredient.createdByUserId`: `onDelete: SetNull` — ingredient rows stay; attribution cleared.
 *
 * New tables that reference `User` should use `onDelete: Cascade` (owned data) or `SetNull` (optional refs)
 * so deletes stay correct without manual `updateMany` here.
 *
 * Idempotent: missing user → `{ deleted: false }`.
 */
export async function deleteUserByClerkId(db: Db, id: string): Promise<{ deleted: boolean }> {
  assertClerkUserId(id);

  const result = await db.user.deleteMany({ where: { id } });
  return { deleted: result.count > 0 };
}
