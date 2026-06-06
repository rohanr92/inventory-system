// src/app/api/webhooks/orders/route.ts
import { prisma } from "@/lib/db";
import { verifyShopifyWebhook } from "@/lib/shopify-webhook";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // 1. Read the RAW body (needed for HMAC — must be the exact bytes Shopify sent)
  const rawBody = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256");

  // 2. Verify it's really from Shopify
  if (!verifyShopifyWebhook(rawBody, hmac)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // 3. Respond fast — Shopify needs a 2xx within 5s. Parse after verifying.
  let order: any;
  try { order = JSON.parse(rawBody); } catch { return new NextResponse("Bad JSON", { status: 400 }); }

  const orderId = String(order.id);
  const orderNumber = order.name || order.order_number?.toString() || null;

  // 4. Idempotency — skip if we already processed this order (Shopify retries)
  const already = await prisma.processedOrder.findUnique({ where: { orderId } });
  if (already) return NextResponse.json({ ok: true, skipped: "already processed" });

  // 5. Deduct each line item from warehouse by SKU
  const lineItems: any[] = order.line_items || [];
  let deducted = 0;
  for (const li of lineItems) {
    const sku = li.sku;
    const qty = li.quantity || 0;
    if (!sku || qty <= 0) continue;

    const cur = await prisma.shadowInventory.findUnique({ where: { sku } });
    if (!cur) continue; // not tracked in warehouse

    const after = cur.shadowQty - qty;
    await prisma.shadowInventory.update({ where: { sku }, data: { shadowQty: after } });
    await prisma.inventoryLog.create({ data: {
      sku, product: cur.product, changeType: "ORDER",
      delta: -qty, before: cur.shadowQty, after,
      note: `Order ${orderNumber || orderId}`,
    }});
    deducted++;
  }

  // 6. Mark order processed so it never deducts twice
  await prisma.processedOrder.create({ data: { orderId, orderNumber } });

  return NextResponse.json({ ok: true, orderNumber, deducted });
}