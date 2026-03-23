import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logClerkWebhook } from "@/lib/clerk-webhook-log";
import {
  deleteUserByClerkId,
  normalizePrimaryEmail,
  updateUserNamesIfExists,
  upsertUserFromClerk,
  WebhookPayloadError,
} from "@/lib/clerk-user-sync";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Missing CLERK_WEBHOOK_SECRET");
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse("Missing headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: unknown;
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.error("Webhook verification failed", err);
    return new NextResponse("Error", { status: 400 });
  }

  const event = evt as {
    type: string;
    data: Record<string, unknown> & {
      id?: string;
      email_addresses?: { email_address: string }[];
      first_name?: string | null;
      last_name?: string | null;
    };
  };

  try {
    switch (event.type) {
      case "user.created": {
        const id = event.data.id;
        const rawEmail = event.data.email_addresses?.[0]?.email_address;
        if (!id) {
          return new NextResponse("Missing user id", { status: 400 });
        }
        const email = normalizePrimaryEmail(rawEmail);
        logClerkWebhook("user.created received", { userId: id });
        const outcome = await upsertUserFromClerk(db, {
          id,
          email,
          firstName: event.data.first_name,
          lastName: event.data.last_name,
        });
        if (outcome.action === "created") {
          logClerkWebhook("user row inserted (new)", { userId: outcome.userId });
        } else if (outcome.action === "created_replacing_ghost") {
          logClerkWebhook("user row inserted (replaced ghost)", {
            userId: outcome.userId,
            removedGhostUserId: outcome.removedGhostUserId,
          });
        } else {
          logClerkWebhook("user row updated (id already existed)", {
            userId: outcome.userId,
          });
        }
        break;
      }
      case "user.updated": {
        const id = event.data.id;
        const rawEmail = event.data.email_addresses?.[0]?.email_address;
        if (!id) {
          return new NextResponse("Missing user id", { status: 400 });
        }
        logClerkWebhook("user.updated received", { userId: id });
        if (rawEmail) {
          const email = normalizePrimaryEmail(rawEmail);
          const outcome = await upsertUserFromClerk(db, {
            id,
            email,
            firstName: event.data.first_name,
            lastName: event.data.last_name,
          });
          if (outcome.action === "updated") {
            logClerkWebhook("user row updated (profile sync)", {
              userId: outcome.userId,
            });
          } else if (outcome.action === "created") {
            logClerkWebhook("user row inserted (was missing — repair)", {
              userId: outcome.userId,
            });
          } else {
            logClerkWebhook("user row inserted (replaced ghost — repair)", {
              userId: outcome.userId,
              removedGhostUserId: outcome.removedGhostUserId,
            });
          }
        } else {
          const { userId, rowsUpdated } = await updateUserNamesIfExists(
            db,
            id,
            event.data.first_name,
            event.data.last_name
          );
          logClerkWebhook("user names-only update (no email in payload)", {
            userId,
            rowsUpdated,
          });
        }
        break;
      }
      case "user.deleted": {
        const id = event.data.id;
        if (!id) {
          return new NextResponse("Missing user id", { status: 400 });
        }
        logClerkWebhook("user.deleted received", { userId: id });
        const { deleted } = await deleteUserByClerkId(db, id);
        logClerkWebhook(
          deleted
            ? "user row deleted from database"
            : "user.deleted acknowledged (no row matched — idempotent)",
          { userId: id, deleted }
        );
        break;
      }
      default:
        logClerkWebhook("event ignored (no handler)", {
          type: event.type,
        });
        break;
    }
  } catch (e) {
    if (e instanceof WebhookPayloadError) {
      logClerkWebhook("payload validation failed", { detail: e.message });
      return new NextResponse(e.message, { status: 400 });
    }
    console.error("[clerk-webhook] handler error", e);
    return new NextResponse("Internal error", { status: 500 });
  }

  return new NextResponse("OK", { status: 200 });
}
