// src/app/api/shadow/route.ts
import { prisma } from "@/lib/db";
import { fetchAllShopifyVariants } from "@/lib/shopify-inventory";
import { NextRequest, NextResponse } from "next/server";

// GET = list shadow inventory
export async function GET() {
  const rows = await prisma.shadowInventory.findMany({ orderBy: { product: "asc" } });
  return NextResponse.json({ ok: true, rows });
}

// POST with { action }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action;

    // SEED: insert ONLY new SKUs. Never overwrites existing rows (preserves your counts).
    // Optional: pass { productFilter: "Serraje" } to seed just one style.
    if (action === "seed") {
      const productFilter: string | undefined = body.productFilter?.trim() || undefined;
      const variants = await fetchAllShopifyVariants();

      const bySku = new Map<string, typeof variants[number]>();
      for (const v of variants) {
        if (productFilter && !v.product.toLowerCase().includes(productFilter.toLowerCase())) continue;
        bySku.set(v.sku, v);
      }
      const candidates = [...bySku.values()];

      const existing = await prisma.shadowInventory.findMany({
        where: { sku: { in: candidates.map(v => v.sku) } },
        select: { sku: true },
      });
      const existingSet = new Set(existing.map(e => e.sku));
      const toInsert = candidates.filter(v => !existingSet.has(v.sku));

      if (toInsert.length > 0) {
        await prisma.shadowInventory.createMany({
          data: toInsert.map(v => ({
            sku: v.sku, upc: v.upc, product: v.product, variantName: v.variantName,
            shadowQty: v.qty, shopifyQty: v.qty,
          })),
          skipDuplicates: true,
        });
      }

      return NextResponse.json({
        ok: true,
        inserted: toInsert.length,
        skipped: candidates.length - toInsert.length,
        filter: productFilter || "ALL",
      });
    }

    // SAVE EDITS: batch-apply manual quantity changes, log each one
    if (action === "save-edits") {
      const edits: { sku: string; newQty: number }[] = body.edits || [];
      let saved = 0;
      for (const e of edits) {
        const cur = await prisma.shadowInventory.findUnique({ where: { sku: e.sku } });
        if (!cur) continue;
        if (e.newQty === cur.shadowQty) continue;
        await prisma.shadowInventory.update({ where: { sku: e.sku }, data: { shadowQty: e.newQty } });
        await prisma.inventoryLog.create({ data: {
          sku: e.sku, product: cur.product, changeType: "MANUAL_ADJUST",
          delta: e.newQty - cur.shadowQty, before: cur.shadowQty, after: e.newQty,
          userEmail: body.userEmail || null,
        }});
        saved++;
      }
      return NextResponse.json({ ok: true, saved });
    }

    // MATCH DIFF: compute what WOULD change (for the confirm popup) — does NOT write
    if (action === "match-diff") {
      const variants = await fetchAllShopifyVariants();
      const shopifyMap: Record<string, number> = {};
      for (const v of variants) shopifyMap[v.sku] = v.qty;
      const shadow = await prisma.shadowInventory.findMany();
      const changes = shadow
        .filter(r => shopifyMap[r.sku] !== undefined && shopifyMap[r.sku] !== r.shadowQty)
        .map(r => ({ sku: r.sku, product: r.product, variantName: r.variantName, from: r.shadowQty, to: shopifyMap[r.sku], delta: shopifyMap[r.sku] - r.shadowQty }));
      return NextResponse.json({ ok: true, changes });
    }

    // MATCH CONFIRM: actually apply the changes
    if (action === "match-confirm") {
      const variants = await fetchAllShopifyVariants();
      const shopifyMap: Record<string, number> = {};
      for (const v of variants) shopifyMap[v.sku] = v.qty;
      const shadow = await prisma.shadowInventory.findMany();
      let applied = 0;
      for (const r of shadow) {
        const target = shopifyMap[r.sku];
        if (target === undefined || target === r.shadowQty) continue;
        await prisma.shadowInventory.update({ where: { sku: r.sku }, data: { shadowQty: target, shopifyQty: target } });
        await prisma.inventoryLog.create({ data: {
          sku: r.sku, product: r.product, changeType: "MATCH_SHOPIFY",
          delta: target - r.shadowQty, before: r.shadowQty, after: target, userEmail: body.userEmail || null,
        }});
        applied++;
      }
      return NextResponse.json({ ok: true, applied });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}