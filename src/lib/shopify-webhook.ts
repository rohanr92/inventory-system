// src/lib/shopify-webhook.ts
import crypto from "crypto";

// Shopify signs every webhook with your app's client secret.
// We recompute the signature and compare — rejects forged requests.
export function verifyShopifyWebhook(rawBody: string, hmacHeader: string | null): boolean {
  if (!hmacHeader) return false;
  const secret = process.env.SHOPIFY_CLIENT_SECRET!;
  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
  } catch {
    return false;
  }
}