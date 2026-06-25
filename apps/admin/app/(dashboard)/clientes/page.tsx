"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { formatCurrency } from "@/lib/utils";
import { Search, Users } from "lucide-react";
import Link from "next/link";

const SEGMENT_COLORS: Record<string, string> = {
  novato: "bg-blue-50 text-blue-700", candidato: "bg-cyan-50 text-cyan-700",
  promissor: "bg-amber-50 text-amber-700", fidelizado: "bg-green-50 text-green-700",
  inativo: "bg-orange-50 text-orange-700", perdido: "bg-paprica/10 text-paprica",
};

export default function ClientesPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("");
  const [stats, setStats] = useState<Record<string, number>>({});
  const supabase = createClient();

  useEffect(() => { load(); }, [segmentFilter]);

  async function load() {
    let q = supabase.from("customers").select("*").order("total_spent", { ascending: false }).limit(100);
    if (segmentFilter) q = q.eq("segment", segmentFilter);
    if (search) q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    const { data } = await q;
    setCustomers(data ?? []);

    // Stats
    const { data: all } = await supabase.from("customers").select("segment");
    const s: Record<string, number> = {};
    (all ?? []).forEach((c) => { s[c.segment] = (s[c.segment] || 0) + 1; });
    setStats(s);
  }

  const segments = ["novato", "candidato", "promissor", "fidelizado", "inativo", "perdido"];
  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Clientes</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-3 lg:grid-cols-7 gap-2 mb-6">
        <button onClick={() => setSegmentFilter("")} className={`p-3 rounded-xl border text-center ${!segmentFilter ? "ring-2 ring-paprica" : ""}`}>
          <p className="text-xl font-bold">{total}</p><p className="text-[10px] text-gray-500">Total</p>
        </button>
        {segments.map((seg) => (
          <button key={seg} onClick={() => setSegmentFilter(seg === segmentFilter ? "" : seg)} className={`p-3 rounded-xl border text-center ${segmentFilter === seg ? "ring-2 ring-paprica" : ""}`}>
            <p className="text-xl font-bold">{stats[seg] || 0}</p><p className="text-[10px] text-gray-500 capitalize">{seg}s</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={(e) => { setSearch(e.target.value); }} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="Buscar por nome ou telefone..." className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="text-left px-4 py-3">Cliente</th>
              <th className="text-left px-4 py-3">Segmento</th>
              <th className="text-right px-4 py-3">Pedidos</th>
              <th className="text-right px-4 py-3">Total gasto</th>
              <th className="text-left px-4 py-3">Origem</th>
              <th className="text-left px-4 py-3">Último pedido</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/clientes/${c.id}`}>
                <td className="px-4 py-3">
                  <p className="font-medium">{c.name || "—"}</p>
                  <p className="text-xs text-gray-400">{c.phone}</p>
                </td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${SEGMENT_COLORS[c.segment] || ""}`}>{c.segment}</span></td>
                <td className="px-4 py-3 text-right">{c.total_orders}</td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(c.total_spent)}</td>
                <td className="px-4 py-3 capitalize text-gray-500">{c.source}</td>
                <td className="px-4 py-3 text-gray-500">{c.last_order_at ? new Date(c.last_order_at).toLocaleDateString("pt-BR") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 && <div className="p-8 text-center text-gray-400">Nenhum cliente encontrado</div>}
      </div>
    </div>
  );
}
