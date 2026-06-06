// src/components/Sidebar.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/inventory", label: "Shopify Inventory", desc: "Live store stock" },
  { href: "/shadow", label: "Warehouse", desc: "Your count" },
  { href: "/orders", label: "Orders", desc: "Shipping SLA" },
  { href: "/logs", label: "Activity Log", desc: "Who changed what" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-neutral-200 bg-white">
      <div className="border-b border-neutral-100 px-6 py-5">
        <p className="text-sm font-semibold tracking-tight">Menina Step</p>
        <p className="text-xs text-neutral-400">Operations</p>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}
              className={`block rounded-lg px-3 py-2.5 transition ${
                active ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"
              }`}>
              <span className="block text-sm font-medium">{item.label}</span>
              <span className={`block text-xs ${active ? "text-neutral-300" : "text-neutral-400"}`}>{item.desc}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-neutral-100 px-6 py-4 text-xs text-neutral-400">
        Inventory & Shipping
      </div>
    </aside>
  );
}