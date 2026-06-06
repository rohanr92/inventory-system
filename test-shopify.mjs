// test-shopify.mjs — run with: node test-shopify.mjs
import "dotenv/config";

// Strip .myshopify.com if it was accidentally included
let SHOP = (process.env.SHOPIFY_STORE_DOMAIN || "").trim();
SHOP = SHOP.replace(/\.myshopify\.com$/i, "");

const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const API_VERSION = process.env.SHOPIFY_API_VERSION || "2026-01";

const TOKEN_URL = `https://${SHOP}.myshopify.com/admin/oauth/access_token`;
const GQL_URL = `https://${SHOP}.myshopify.com/admin/api/${API_VERSION}/graphql.json`;

console.log("Shop subdomain:", SHOP);
console.log("Token URL:", TOKEN_URL);
console.log("ClientID set:", !!CLIENT_ID, "| Secret set:", !!CLIENT_SECRET);

async function run() {
  let tokenRes;
  try {
    tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });
  } catch (e) {
    console.error("❌ Network error reaching token URL:", e.cause?.code || e.message);
    console.error("   → Usually means the shop subdomain is wrong. It should be just 'meninastep'.");
    return;
  }

  if (!tokenRes.ok) {
    console.error("❌ TOKEN FAILED:", tokenRes.status, await tokenRes.text());
    return;
  }
  const { access_token, scope, expires_in } = await tokenRes.json();
  console.log("✅ Got token. Scopes:", scope, "| expires_in:", expires_in);

  const gqlRes = await fetch(GQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": access_token },
    body: JSON.stringify({
      query: `{
        shop { name myshopifyDomain }
        products(first: 5) {
          edges { node {
            title
            variants(first: 5) { edges { node { sku barcode inventoryQuantity } } }
          } }
        }
      }`,
    }),
  });

  const result = await gqlRes.json();
  if (result.errors) {
    console.error("❌ GRAPHQL ERRORS:", JSON.stringify(result.errors, null, 2));
    return;
  }

  console.log("✅ Shop:", result.data.shop.name);
  for (const p of result.data.products.edges) {
    console.log(" •", p.node.title);
    for (const v of p.node.variants.edges) {
      console.log(`     SKU: ${v.node.sku || "—"} | UPC: ${v.node.barcode || "—"} | Qty: ${v.node.inventoryQuantity}`);
    }
  }
}

run().catch((e) => console.error("❌ CRASHED:", e.message));