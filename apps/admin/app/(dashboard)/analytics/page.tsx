"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, ShoppingBag, Users, DollarSign, Star, Download, Sparkles } from "lucide-react";

const FUNNEL_STEPS: { key: string; label: string }[] = [
  { key: "view_menu", label: "Visitas ao cardápio" },
  { key: "view_product", label: "Viram um produto" },
  { key: "add_to_cart", label: "Adicionaram ao carrinho" },
  { key: "begin_checkout", label: "Iniciaram o checkout" },
  { key: "purchase", label: "Finalizaram o pedido" },
];

export default function AnalyticsPage() {
  const [stats, setStats] = useState({ revenue: 0, orders: 0, avgTicket: 0, activeCustomers: 0, cancelRate: 0, avgRating: 0 });
  const [channelBreakdown, setChannelBreakdown] = useState<Record<string, { orders: number; revenue: number }>>({});
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [segmentDist, setSegmentDist] = useState<Record<string, number>>({});
  const [funnel, setFunnel] = useState<Record<string, number>>({});
  const [insight, setInsight] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [period, setPeriod] = useState(30);
  const supabase = createClient();

  async function token() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  }

  useEffect(() => { loadAll(); }, [period]);

  async function loadAll() {
    const since = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString();

    // Orders
    const { data: orders } = await supabase.from("orders").select("total, channel, status, created_at").gte("created_at", since);
    const validOrders = (orders ?? []).filter((o) => o.status !== "cancelled");
    const cancelledCount = (orders ?? []).filter((o) => o.status === "cancelled").length;
    const totalRevenue = validOrders.reduce((s, o) => s + (o.total || 0), 0);
    const avgTicket = validOrders.length > 0 ? totalRevenue / validOrders.length : 0;

    // Channel breakdown
    const channels: Record<string, { orders: number; revenue: number }> = {};
    validOrders.forEach((o) => {
      if (!channels[o.channel]) channels[o.channel] = { orders: 0, revenue: 0 };
      channels[o.channel].orders++;
      channels[o.channel].revenue += o.total || 0;
    });

    // Top products
    const { data: items } = await supabase.from("order_items").select("product_name, quantity, total_price").gte("created_at", since);
    const productMap: Record<string, { qty: number; revenue: number }> = {};
    (items ?? []).forEach((i) => {
      if (!productMap[i.product_name]) productMap[i.product_name] = { qty: 0, revenue: 0 };
      productMap[i.product_name].qty += i.quantity;
      productMap[i.product_name].revenue += i.total_price;
    });
    const topProds = Object.entries(productMap).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 10)
      .map(([name, data]) => ({ name, ...data, pct: totalRevenue > 0 ? (data.revenue / totalRevenue * 100) : 0 }));

    // Customers
    const { data: customers } = await supabase.from("customers").select("segment");
    const segDist: Record<string, number> = {};
    (customers ?? []).forEach((c) => { segDist[c.segment] = (segDist[c.segment] || 0) + 1; });
    const activeCustomers = (segDist.fidelizado || 0) + (segDist.promissor || 0) + (segDist.candidato || 0);

    // Feedbacks
    const { data: feedbacks } = await supabase.from("feedbacks").select("rating").gte("created_at", since);
    const avgRating = feedbacks?.length ? feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length : 0;

    // Funil de conversão do cardápio
    const { data: events } = await supabase.from("menu_events").select("type").gte("created_at", since);
    const funnelCounts: Record<string, number> = {};
    (events ?? []).forEach((e) => { funnelCounts[e.type] = (funnelCounts[e.type] || 0) + 1; });
    setFunnel(funnelCounts);

    // Último insight de feedback (IA)
    const { data: lastInsight } = await supabase
      .from("feedback_insights").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();
    setInsight(lastInsight ?? null);

    setStats({
      revenue: totalRevenue, orders: validOrders.length, avgTicket,
      activeCustomers, cancelRate: orders?.length ? (cancelledCount / orders.length * 100) : 0,
      avgRating: Math.round(avgRating * 10) / 10,
    });
    setChannelBreakdown(channels);
    setTopProducts(topProds);
    setSegmentDist(segDist);
  }

  async function analyzeFeedbacks() {
    setAnalyzing(true);
    try {
      const res = await api("/api/reports/feedback-insights", {
        method: "POST", body: JSON.stringify({ period_days: period }), token: await token(),
      });
      if (res?.skipped) toast.message("Sem feedbacks suficientes no período");
      else toast.success("Análise gerada pela IA");
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Falha ao analisar feedbacks");
    } finally {
      setAnalyzing(false);
    }
  }

  function exportCSV() {
    const since = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString();
    supabase
      .from("orders")
      .select("order_number, created_at, channel, status, payment_method, subtotal, delivery_fee, discount, total, customer_name, customer_phone")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const rows = data ?? [];
        if (!rows.length) { toast.message("Sem pedidos no período"); return; }
        const headers = Object.keys(rows[0]);
        const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        const csv = [
          headers.join(","),
          ...rows.map((r: any) => headers.map((h) => escape(r[h])).join(",")),
        ].join("\n");
        const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `lotta-pedidos-${period}d.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  const SENTIMENT_BADGE: Record<string, string> = {
    positivo: "bg-green-100 text-green-700", neutro: "bg-gray-100 text-gray-600", negativo: "bg-paprica/10 text-paprica",
  };

  const CHANNEL_LABELS: Record<string, string> = { cardapio: "Cardápio", whatsapp: "WhatsApp", ifood: "iFood", "99food": "99Food" };
  const SEGMENT_COLORS: Record<string, string> = { novato: "#3b82f6", candidato: "#06b6d4", promissor: "#f59e0b", fidelizado: "#22c55e", inativo: "#f97316", perdido: "#ef4444" };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-sm hover:bg-gray-50">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
          <select value={period} onChange={(e) => setPeriod(parseInt(e.target.value))} className="border rounded-lg px-3 py-2 text-sm">
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Faturamento", value: formatCurrency(stats.revenue), icon: DollarSign, color: "text-green-600" },
          { label: "Pedidos", value: stats.orders.toString(), icon: ShoppingBag, color: "text-blue-600" },
          { label: "Ticket médio", value: formatCurrency(stats.avgTicket), icon: TrendingUp, color: "text-purple-600" },
          { label: "Clientes ativos", value: stats.activeCustomers.toString(), icon: Users, color: "text-cyan-600" },
          { label: "Taxa cancelamento", value: `${stats.cancelRate.toFixed(1)}%`, icon: ShoppingBag, color: "text-paprica" },
          { label: "Avaliação média", value: stats.avgRating > 0 ? `${stats.avgRating}★` : "—", icon: Star, color: "text-amber-500" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-1">
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              <span className="text-xs text-gray-500">{kpi.label}</span>
            </div>
            <p className="text-xl font-bold">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Funil de conversão + Insights de feedback (IA) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Funil de conversão */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">Funil de conversão do cardápio</h2>
          {(() => {
            const top = funnel.view_menu || 0;
            if (!top) return <p className="text-sm text-gray-400">Sem dados de navegação no período.</p>;
            return (
              <div className="space-y-2">
                {FUNNEL_STEPS.map((step) => {
                  const count = funnel[step.key] || 0;
                  const pct = top > 0 ? (count / top) * 100 : 0;
                  return (
                    <div key={step.key}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">{step.label}</span>
                        <span className="font-medium">{count.toLocaleString("pt-BR")} <span className="text-gray-400 text-xs">({pct.toFixed(0)}%)</span></span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-paprica rounded-full" style={{ width: `${Math.max(2, pct)}%` }} />
                      </div>
                    </div>
                  );
                })}
                <p className="text-xs text-gray-400 pt-2">
                  Conversão visita → pedido: <span className="font-medium text-gray-600">{top > 0 ? (((funnel.purchase || 0) / top) * 100).toFixed(1) : "0"}%</span>
                </p>
              </div>
            );
          })()}
        </div>

        {/* Insights de feedback (IA) */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Feedbacks — análise por IA</h2>
            <button
              onClick={analyzeFeedbacks}
              disabled={analyzing}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-paprica text-white rounded-lg text-xs font-medium hover:bg-paprica-dark disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" /> {analyzing ? "Analisando..." : "Analisar"}
            </button>
          </div>
          {!insight ? (
            <p className="text-sm text-gray-400">Nenhuma análise ainda. Clique em &quot;Analisar&quot; para gerar com IA.</p>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${SENTIMENT_BADGE[insight.sentiment] || "bg-gray-100"}`}>
                  {insight.sentiment}
                </span>
                <span className="text-xs text-gray-400">{insight.avg_rating}★ · {insight.sample_size} feedbacks</span>
              </div>
              {insight.summary && <p className="text-sm text-gray-700 mb-3">{insight.summary}</p>}
              <ul className="space-y-2">
                {(insight.recommendations || []).map((r: any, i: number) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium text-gray-800">{r.title}</span>
                    {r.action && <span className="text-gray-500"> — {r.action}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channel breakdown */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">Vendas por canal</h2>
          <div className="space-y-3">
            {Object.entries(channelBreakdown).map(([ch, data]) => (
              <div key={ch} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{CHANNEL_LABELS[ch] || ch}</p>
                  <p className="text-xs text-gray-400">{data.orders} pedidos</p>
                </div>
                <span className="font-semibold text-sm">{formatCurrency(data.revenue)}</span>
              </div>
            ))}
            {Object.keys(channelBreakdown).length === 0 && <p className="text-sm text-gray-400">Sem dados no período</p>}
          </div>
        </div>

        {/* Customer segments */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">Clientes por segmento</h2>
          <div className="space-y-2">
            {Object.entries(segmentDist).sort((a, b) => b[1] - a[1]).map(([seg, count]) => {
              const total = Object.values(segmentDist).reduce((s, v) => s + v, 0);
              const pct = total > 0 ? (count / total * 100) : 0;
              return (
                <div key={seg} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SEGMENT_COLORS[seg] || "#999" }} />
                  <span className="text-sm capitalize flex-1">{seg}</span>
                  <span className="text-sm font-medium">{count}</span>
                  <span className="text-xs text-gray-400 w-12 text-right">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top products */}
        <div className="bg-white rounded-xl border p-6 lg:col-span-2">
          <h2 className="font-semibold mb-4">Ranking de produtos</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500"><tr><th className="text-left py-2">Produto</th><th className="text-right py-2">Qtd</th><th className="text-right py-2">Faturamento</th><th className="text-right py-2">% do total</th><th className="text-left py-2 pl-4">Quadrante</th></tr></thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-2 font-medium">{p.name}</td>
                    <td className="py-2 text-right">{p.qty}</td>
                    <td className="py-2 text-right">{formatCurrency(p.revenue)}</td>
                    <td className="py-2 text-right">{p.pct.toFixed(1)}%</td>
                    <td className="py-2 pl-4">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${p.pct >= 5 ? "bg-green-50 text-green-700" : p.pct >= 2 ? "bg-amber-50 text-amber-700" : "bg-paprica/10 text-paprica"}`}>
                        {p.pct >= 5 ? "Campeão" : p.pct >= 2 ? "Promissor" : "Baixo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {topProducts.length === 0 && <p className="text-center py-4 text-gray-400 text-sm">Sem dados</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
