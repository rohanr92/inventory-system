// src/lib/shopify-inventory.ts
import { shopifyGraphQL } from "@/lib/shopify";

export type ShopifyVariant = { sku: string; upc: string; product: string; variantName: string; qty: number };

export async function fetchAllShopifyVariants(): Promise<ShopifyVariant[]> {
  const out: ShopifyVariant[] = [];
  let cursor: string | null = null;
  let hasNext = true;
  let safety = 0;

  while (hasNext && safety < 60) {
    safety++;
    const after: string = cursor ? `, after: "${cursor}"` : "";
    const data: any = await shopifyGraphQL(`{
      products(first: 100${after}) {
        pageInfo { hasNextPage endCursor }
        edges { node {
          title
          variants(first: 100) { edges { node { title sku barcode inventoryQuantity } } }
        } }
      }
    }`);
    for (const p of data.products.edges) {
      for (const v of p.node.variants.edges) {
        const sku = v.node.sku || "";
        if (!sku) continue; // need SKU as the key
        out.push({
          sku,
          upc: v.node.barcode || "",
          product: p.node.title,
          variantName: v.node.title,
          qty: v.node.inventoryQuantity ?? 0,
        });
      }
    }
    hasNext = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor;
  }
  return out;
}