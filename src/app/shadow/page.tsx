// src/app/shadow/page.tsx
"use client";
import { useEffect, useMemo, useState } from "react";

type Row = { id: string; sku: string; upc: string | null; product: string; variantName: string; shadowQty: number; shopifyQty: number };
type Change = { sku: string; product: string; variantName: string; from: number; to: number; delta: number };

export default function ShadowPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [q, setQ] = useState("");
  const [seedFilter, setSeedFilter] = useState("");
  const [changes, setChanges] = useState<Change[] | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/shadow");
    const json = await res.json();
    const r: Row[] = json.rows || [];
    setRows(r);
    setDraft(Object.fromEntries(r.map(x => [x.sku, x.shadowQty])));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function setQty(sku: string, val: number) {
    setDraft(d => ({ ...d, [sku]: val }));
  }

  // revert ONE row's draft back to its saved value
  function cancelRow(sku: string, savedQty: number) {
    setDraft(d => ({ ...d, [sku]: savedQty }));
  }

  // save ONE row to the database
  async function saveRow(sku: string) {
    const newQty = draft[sku];
    setBusy(`Saving ${sku}…`);
    const res = await fetch("/api/shadow", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save-edits", edits: [{ sku, newQty }] }),
    });
    const json = await res.json();
    setBusy("");
    if (!json.ok) { alert("Save failed: " + json.error); return; }
    load();
  }

  async function seed() {
    const filter = seedFilter.trim();
    setBusy(filter ? `Seeding "${filter}"…` : "Seeding all new styles…");
    const res = await fetch("/api/shadow", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "seed", productFilter: filter || undefined }),
    });
    const json = await res.json();
    setBusy("");
    alert(`Seed done. Added ${json.inserted} new, skipped ${json.skipped} already saved (filter: ${json.filter}).`);
    load();
  }

  async function openMatch() {
    setBusy("Comparing with Shopify…");
    const res = await fetch("/api/shadow", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "match-diff" }),
    });
    const json = await res.json();
    setBusy("");
    setChanges(json.changes || []);
  }

  async function confirmMatch() {
    setBusy("Applying…");
    await fetch("/api/shadow", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "match-confirm" }),
    });
    setBusy(""); setChanges(null); load();
  }

  const filtered = useMemo(() => rows.filter(r => {
    if (!q) return true; const s = q.toLowerCase();
    return r.sku.toLowerCase().includes(s) || (r.upc || "").toLowerCase().includes(s) || r.product.toLowerCase().includes(s);
  }), [rows, q]);

  return (
    <div className="text-neutral-900">
      <div className="mx-auto max-w-7xl px-8 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-200 pb-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-neutral-400">Menina Step</p>
            <h1 className="mt-1 text-2xl text-white font-semibold tracking-tight">Warehouse Inventory <span className="font-normal text-neutral-400">(your count)</span></h1>
          </div>
          <div className="flex items-center gap-2">
            <input value={seedFilter} onChange={e => setSeedFilter(e.target.value)} placeholder="Style name (optional)"
              className="w-44 bg-amber-50 rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
            <button onClick={seed} disabled={!!busy}
              className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50">Seed new styles</button>
            <button onClick={openMatch} disabled={!!busy || rows.length === 0}
              className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50">Match Shopify</button>
          </div>
        </div>

        {busy && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />{busy}
          </div>
        )}

        {loading && (
          <div className="mt-6 flex items-center justify-center gap-3 rounded-xl border border-neutral-200 bg-white py-16 text-sm text-neutral-500">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />Loading warehouse inventory…
          </div>
        )}

        {!loading && rows.length === 0 && !busy && (
          <p className="mt-8 text-neutral-500">No warehouse inventory yet. Click <b>Seed new styles</b> (leave the box empty to seed everything the first time).</p>
        )}

        {!loading && rows.length > 0 && (
          <>
            <div className="mt-6">
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by SKU, UPC, or product"
                className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm shadow-sm outline-none focus:border-neutral-400" />
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/80 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                    <th className="px-5 py-3">Product</th><th className="px-5 py-3">Size</th><th className="px-5 py-3">SKU</th>
                    <th className="px-5 py-3 text-right">Your Qty</th><th className="px-5 py-3 text-right">Shopify</th><th className="px-5 py-3 text-center">Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filtered.map(r => {
                    const val = draft[r.sku] ?? r.shadowQty;
                    const edited = val !== r.shadowQty;
                    return (
                      <tr key={r.id} className={edited ? "bg-amber-50" : "hover:bg-neutral-50"}>
                        <td className="px-5 py-3 font-medium">{r.product}</td>
                        <td className="px-5 py-3 text-neutral-500">{r.variantName}</td>
                        <td className="px-5 py-3 font-mono text-xs text-neutral-500">{r.sku}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => setQty(r.sku, val - 1)} className="h-7 w-7 rounded-md border border-neutral-300 hover:bg-neutral-100">−</button>
                            <input type="number" value={val}
                              onChange={e => setQty(r.sku, parseInt(e.target.value || "0", 10))}
                              className={`w-16 rounded-md border px-2 py-1 text-right tabular-nums ${edited ? "border-amber-400 bg-white font-semibold" : "border-neutral-200"}`} />
                            <button onClick={() => setQty(r.sku, val + 1)} className="h-7 w-7 rounded-md border border-neutral-300 hover:bg-neutral-100">+</button>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-neutral-400">{r.shopifyQty}</td>
                        <td className="px-5 py-3">
                          {edited ? (
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => saveRow(r.sku)} disabled={!!busy}
                                className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50">Save</button>
                              <button onClick={() => cancelRow(r.sku, r.shadowQty)}
                                className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium hover:bg-neutral-50">Cancel</button>
                            </div>
                          ) : (
                            <div className="text-center text-xs text-neutral-300">—</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {changes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold">Confirm Match with Shopify</h2>
            {changes.length === 0 ? (
              <p className="mt-3 text-neutral-500">Everything already matches Shopify.</p>
            ) : (
              <>
                <p className="mt-1 text-sm text-neutral-500">{changes.length} variant(s) will change:</p>
                <div className="mt-4 max-h-80 overflow-auto rounded-lg border border-neutral-200">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
                      <tr><th className="px-4 py-2">Product</th><th className="px-4 py-2">Size</th><th className="px-4 py-2 text-right">From</th><th className="px-4 py-2 text-right">To</th><th className="px-4 py-2 text-right">Δ</th></tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {changes.map(c => (
                        <tr key={c.sku}>
                          <td className="px-4 py-2">{c.product}</td><td className="px-4 py-2 text-neutral-500">{c.variantName}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{c.from}</td>
                          <td className="px-4 py-2 text-right font-semibold tabular-nums">{c.to}</td>
                          <td className={`px-4 py-2 text-right font-medium tabular-nums ${c.delta < 0 ? "text-rose-600" : "text-emerald-600"}`}>{c.delta > 0 ? "+" : ""}{c.delta}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setChanges(null)} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50">Cancel</button>
              {changes.length > 0 && <button onClick={confirmMatch} disabled={!!busy} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50">Confirm & Adjust</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}