// src/lib/shopify.ts
let SHOP = (process.env.SHOPIFY_STORE_DOMAIN || "").trim().replace(/\.myshopify\.com$/i, "");
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID!;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET!;
const API_VERSION = process.env.SHOPIFY_API_VERSION || "2026-01";

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken;
  const res = await fetch(`https://${SHOP}.myshopify.com/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Shopify token failed (${res.status}): ${await res.text()}`);
  const { access_token, expires_in } = await res.json();
  cachedToken = access_token;
  tokenExpiresAt = Date.now() + expires_in * 1000;
  return cachedToken!;
}

export async function shopifyGraphQL<T = any>(query: string, variables: Record<string, any> = {}): Promise<T> {
  const res = await fetch(`https://${SHOP}.myshopify.com/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": await getToken() },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Shopify GraphQL failed (${res.status}): ${await res.text()}`);
  const { data, errors } = await res.json();
  if (errors?.length) throw new Error(`Shopify GraphQL errors: ${JSON.stringify(errors)}`);
  return data as T;
}