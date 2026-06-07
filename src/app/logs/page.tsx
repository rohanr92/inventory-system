"use client";
import { useEffect, useState } from "react";

type Log = {
  id: string; sku: string; product: string; changeType: string;
  delta: number; before: number; after: number; note: string | null;
  userEmail: string | null; createdAt: string;
};

const TYPE_STYLE: Record<string, { label: string; cls: string }> = {
  MANUAL_ADJUST: { label: "Manual edit", cls: "bg-blue-50 text-blue-700 ring-blue-600/20" },
  ORDER:         { label: "Order",       cls: "bg-purple-50 text-purple-700 ring-purple-600/20" },
  MATCH_SHOPIFY: { label: "Match Shopify",cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  SEED:          { label: "Seed",        cls: "bg-neutral-100 text-neutral-600 ring-neutral-500/20" },
};

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (type) params.set("type", type);
    const res = await fetch("/api/logs?" + params.toString());
    const json = await res.json();
    setLogs(json.logs || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [type]);

  return (
    <div className="text-neutral-900">
      <div className="mx-auto max-w-7xl px-8 py-10">
        <div className="border-b border-neutral-200 pb-6">
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-400">Menina Step</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Activity Log</h1>
          <p className="mt-1 text-sm text-neutral-500">Every inventory change.</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && load()}
            placeholder="Search SKU, product, order #, or user"
            className="flex-1 min-w-64 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm shadow-sm outline-none focus:border-neutral-400" />
          <select value={type} onChange={e => setType(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm">
            <option value="">All types</option>
            <option value="MANUAL_ADJUST">Manual edits</option>
            <option value="ORDER">Orders</option>
            <option value="MATCH_SHOPIFY">Match Shopify</option>
            <option value="SEED">Seed</option>
          </select>
          <button onClick={load} className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700">Search</button>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/80 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                <th className="px-5 py-3">When</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">SKU</th>
                <th className="px-5 py-3 text-right">Before</th>
                <th className="px-5 py-3 text-right">After</th>
                <th className="px-5 py-3 text-right">Change</th>
                <th className="px-5 py-3">By / Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading && <tr><td colSpan={8} className="px-5 py-12 text-center text-neutral-400">Loading…</td></tr>}
              {!loading && logs.length === 0 && <tr><td colSpan={8} className="px-5 py-12 text-center text-neutral-400">No activity yet.</td></tr>}
              {!loading && logs.map(l => {
                const t = TYPE_STYLE[l.changeType] || { label: l.changeType, cls: "bg-neutral-100 text-neutral-600 ring-neutral-500/20" };
                return (
                  <tr key={l.id} className="hover:bg-neutral-50">
                    <td className="px-5 py-3 text-neutral-500 whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
                    <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${t.cls}`}>{t.label}</span></td>
                    <td className="px-5 py-3 font-medium">{l.product}</td>
                    <td className="px-5 py-3 font-mono text-xs text-neutral-500">{l.sku}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-neutral-500">{l.before}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-semibold">{l.after}</td>
                    <td className={`px-5 py-3 text-right tabular-nums font-medium ${l.delta < 0 ? "text-rose-600" : "text-emerald-600"}`}>{l.delta > 0 ? "+" : ""}{l.delta}</td>
                    <td className="px-5 py-3 text-neutral-500">{l.userEmail || l.note || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
