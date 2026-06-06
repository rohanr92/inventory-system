// src/app/inventory/page.tsx
"use client";
import { useEffect, useMemo, useState } from "react";

type Row = { product: string; variantTitle: string; sku: string; upc: string; qty: number; status: string };
type Summary = { total: number; oversold: number; out: number; low: number };

const STATUS: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  OVERSOLD: { label: "Oversold", dot: "bg-rose-500",   text: "text-rose-700",   bg: "bg-rose-50 ring-rose-600/20" },
  OUT:      { label: "Out",      dot: "bg-orange-500", text: "text-orange-700", bg: "bg-orange-50 ring-orange-600/20" },
  LOW:      { label: "Low",      dot: "bg-amber-500",  text: "text-amber-700",  bg: "bg-amber-50 ring-amber-600/20" },
  OK:       { label: "In stock", dot: "bg-emerald-500",text: "text-emerald-700",bg: "bg-emerald-50 ring-emerald-600/20" },
};

export default function InventoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  async function load() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/inventory");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setRows(json.rows); setSummary(json.summary);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      return r.sku.toLowerCase().includes(s) || r.upc.toLowerCase().includes(s) || r.product.toLowerCase().includes(s);
    });
  }, [rows, q, statusFilter]);

  return (
    <div className="text-neutral-900">
      <div className="mx-auto max-w-7xl px-8 py-10">
        {/* Header */}
        <div className="flex items-end justify-between border-b border-neutral-200 pb-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-neutral-400">Menina Step</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Inventory</h1>
          </div>
          <button onClick={load} disabled={loading}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50">
            {loading ? "Syncing…" : "Sync now"}
          </button>
        </div>

        {/* Stat cards */}
        {summary && (
          <div className="mt-6 grid grid-cols-4 gap-4">
            <Stat label="Total variants" value={summary.total} active={statusFilter === "ALL"} onClick={() => setStatusFilter("ALL")} />
            <Stat label="Oversold" value={summary.oversold} accent="text-rose-600" active={statusFilter === "OVERSOLD"} onClick={() => setStatusFilter("OVERSOLD")} />
            <Stat label="Out of stock" value={summary.out} accent="text-orange-600" active={statusFilter === "OUT"} onClick={() => setStatusFilter("OUT")} />
            <Stat label="Low (≤3)" value={summary.low} accent="text-amber-600" active={statusFilter === "LOW"} onClick={() => setStatusFilter("LOW")} />
          </div>
        )}

        {/* Search */}
        <div className="mt-6">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" /></svg>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by SKU, UPC, or product name"
              className="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-900/5" />
          </div>
          <p className="mt-2 text-xs text-neutral-400">
            Showing {filtered.length.toLocaleString()} of {rows.length.toLocaleString()} variants
            {statusFilter !== "ALL" && <button onClick={() => setStatusFilter("ALL")} className="ml-2 text-neutral-600 underline">clear filter</button>}
          </p>
        </div>

        {/* Table */}
        <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/80 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">Size</th>
                <th className="px-5 py-3">SKU</th>
                <th className="px-5 py-3">UPC</th>
                <th className="px-5 py-3 text-right">Qty</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading && <tr><td colSpan={6} className="px-5 py-12 text-center text-neutral-400">Loading inventory from Shopify…</td></tr>}
              {error && <tr><td colSpan={6} className="px-5 py-12 text-center text-rose-600">Error: {error}</td></tr>}
              {!loading && !error && filtered.map((r, i) => {
                const s = STATUS[r.status];
                return (
                  <tr key={i} className="transition hover:bg-neutral-50">
                    <td className="px-5 py-3 font-medium text-neutral-900">{r.product}</td>
                    <td className="px-5 py-3 text-neutral-500">{r.variantTitle}</td>
                    <td className="px-5 py-3 font-mono text-xs text-neutral-500">{r.sku || "—"}</td>
                    <td className="px-5 py-3 font-mono text-xs text-neutral-500">{r.upc || "—"}</td>
                    <td className={`px-5 py-3 text-right font-semibold tabular-nums ${r.qty < 0 ? "text-rose-600" : r.qty === 0 ? "text-orange-600" : "text-neutral-900"}`}>{r.qty}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${s.bg} ${s.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{s.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!loading && !error && filtered.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-neutral-400">No matching variants.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent = "text-neutral-900", active, onClick }: { label: string; value: number; accent?: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`rounded-xl border bg-white p-5 text-left shadow-sm transition hover:shadow ${active ? "border-neutral-900 ring-1 ring-neutral-900" : "border-neutral-200"}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tabular-nums tracking-tight ${accent}`}>{value.toLocaleString()}</p>
    </button>
  );
}