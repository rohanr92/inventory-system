// register-webhook.mjs — run once: node register-webhook.mjs
import "dotenv/config";

let SHOP = (process.env.SHOPIFY_STORE_DOMAIN || "").trim().replace(/\.myshopify\.com$/i, "");
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const API_VERSION = process.env.SHOPIFY_API_VERSION || "2026-01";

// Your live endpoint:
const CALLBACK = "https://inventory-system-iota-one.vercel.app/api/webhooks/orders";

async function getToken() {
  const res = await fetch(`https://${SHOP}.myshopify.com/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: CLIENT_ID, client_secret: CLIENT_SECRET }),
  });
  if (!res.ok) throw new Error(`Token failed: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

async function gql(token, query, variables) {
  const res = await fetch(`https://${SHOP}.myshopify.com/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

async function run() {
  const token = await getToken();

  // 1. List existing webhooks (avoid duplicates)
  const list = await gql(token, `{ webhookSubscriptions(first: 50) { edges { node { id topic endpoint { __typename ... on WebhookHttpEndpoint { callbackUrl } } } } } }`);
  console.log("Existing webhooks:");
  for (const e of list.data.webhookSubscriptions.edges) {
    const url = e.node.endpoint?.callbackUrl || "(non-http)";
    console.log(`  ${e.node.topic} -> ${url}`);
  }

  // 2. Create the orders/create subscription
  const mutation = `
    mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
      webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
        webhookSubscription { id topic uri }
        userErrors { field message }
      }
    }`;
  const result = await gql(token, mutation, {
    topic: "ORDERS_CREATE",
    webhookSubscription: { uri: CALLBACK, format: "JSON" },
  });

  const payload = result.data?.webhookSubscriptionCreate;
  if (payload?.userErrors?.length) {
    console.log("\n⚠️ Errors:", JSON.stringify(payload.userErrors, null, 2));
  } else if (payload?.webhookSubscription) {
    console.log("\n✅ Registered:", payload.webhookSubscription.topic, "->", payload.webhookSubscription.uri);
  } else {
    console.log("\nUnexpected response:", JSON.stringify(result, null, 2));
  }
}

run().catch(e => console.error("❌", e.message));