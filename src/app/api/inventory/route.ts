// src/app/api/inventory/route.ts
import { shopifyGraphQL } from "@/lib/shopify";
import { NextResponse } from "next/server";

type Row = { product: string; variantTitle: string; sku: string; upc: string; qty: number; status: string };

function computeStatus(qty: number): string {
  if (qty < 0) return "OVERSOLD";
  if (qty === 0) return "OUT";
  if (qty <= 3) return "LOW";
  return "OK";
}

function buildQuery(cursor: string | null): string {
  const after = cursor ? `, after: "${cursor}"` : "";
  return `{
    products(first: 100${after}) {
      pageInfo { hasNextPage endCursor }
      edges { node {
        title
        variants(first: 100) { edges { node { title sku barcode inventoryQuantity } } }
      } }
    }
  }`;
}

export async function GET() {
  try {
    const rows: Row[] = [];
    let cursor: string | null = null;
    let hasNext = true;
    let safety = 0;

    while (hasNext && safety < 50) {
      safety++;
      const data: any = await shopifyGraphQL(buildQuery(cursor));
      for (const pEdge of data.products.edges) {
        const p = pEdge.node;
        for (const vEdge of p.variants.edges) {
          const v = vEdge.node;
          const qty = v.inventoryQuantity ?? 0;
          rows.push({
            product: p.title,
            variantTitle: v.title,
            sku: v.sku || "",
            upc: v.barcode || "",
            qty,
            status: computeStatus(qty),
          });
        }
      }
      hasNext = data.products.pageInfo.hasNextPage;
      cursor = data.products.pageInfo.endCursor;
    }

    const summary = {
      total: rows.length,
      oversold: rows.filter(r => r.status === "OVERSOLD").length,
      out: rows.filter(r => r.status === "OUT").length,
      low: rows.filter(r => r.status === "LOW").length,
    };
    return NextResponse.json({ ok: true, summary, rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}