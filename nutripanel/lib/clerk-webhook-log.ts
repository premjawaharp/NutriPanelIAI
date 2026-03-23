/**
 * Server logs for Clerk webhooks (search logs for `[clerk-webhook]`).
 * Logs Clerk user id only — not email (PII).
 */
export function logClerkWebhook(
  message: string,
  data?: Record<string, string | number | boolean | null | undefined>
): void {
  if (data && Object.keys(data).length > 0) {
    const safe = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined)
    );
    console.log(`[clerk-webhook] ${message}`, safe);
  } else {
    console.log(`[clerk-webhook] ${message}`);
  }
}
