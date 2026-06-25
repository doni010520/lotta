"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase-browser";
import { formatCurrency } from "@/lib/utils";
import type { Order } from "@lotta/shared";

const COLUMNS = [
  { status: "pending", label: "Em análise", color: "bg-yellow-500" },
  { status: "confirmed", label: "Confirmado", color: "bg-blue-500" },
  { status: "preparing", label: "Em preparo", color: "bg-orange-500" },
  { status: "ready", label: "Pronto", color: "bg-purple-500" },
  { status: "dispatched", label: "Em entrega", color: "bg-indigo-500" },
  { status: "delivered", label: "Entregue", color: "bg-green-500" },
];

const NEXT_STATUS: Record<string, string> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "ready",
  ready: "dispatched",
  dispatched: "delivered",
};

export default function PedidosKanban() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    loadOrders();

    const channel = supabase
      .channel("orders-kanban")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        setOrders((prev) => [payload.new as Order, ...prev]);
        // Play notification sound
        try { audioRef.current?.play(); } catch {}
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        setOrders((prev) => prev.map((o) => o.id === payload.new.id ? { ...o, ...payload.new } as Order : o));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadOrders() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from("orders")
      .select("*, items:order_items(product_name, quantity, total_price)")
      .gte("created_at", today.toISOString())
      .order("created_at", { ascending: false });

    setOrders(data ?? []);
    setLoading(false);
  }

  async function advanceStatus(orderId: string, currentStatus: string) {
    const nextStatus = NEXT_STATUS[currentStatus];
    if (!nextStatus) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ status: nextStatus }),
    });
  }

  async function cancelOrder(orderId: string) {
    if (!confirm("Cancelar este pedido?")) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ status: "cancelled" }),
    });
  }

  if (loading) return <div className="py-12 text-center text-gray-400">Carregando...</div>;

  return (
    <div>
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=" preload="auto" />

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Pedidos de hoje</h1>
        <span className="text-sm text-gray-500">{orders.length} pedidos</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.status);
          return (
            <div key={col.status} className="min-w-[280px] flex-shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                <span className="text-sm font-medium text-gray-700">{col.label}</span>
                <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{colOrders.length}</span>
              </div>

              <div className="space-y-2">
                {colOrders.map((order) => (
                  <div key={order.id} className="bg-white rounded-xl border p-3 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm">#{order.order_number}</span>
                      <span className="text-xs text-gray-400 capitalize">{order.channel}</span>
                    </div>

                    {order.customer_name && (
                      <p className="text-xs text-gray-600 mb-1">{order.customer_name}</p>
                    )}

                    {(order as any).items?.slice(0, 3).map((item: any, i: number) => (
                      <p key={i} className="text-xs text-gray-500">{item.quantity}x {item.product_name}</p>
                    ))}

                    <div className="flex items-center justify-between mt-2 pt-2 border-t">
                      <span className="font-semibold text-sm">{formatCurrency(order.total)}</span>
                      <div className="flex gap-1">
                        {NEXT_STATUS[order.status] && (
                          <button
                            onClick={() => advanceStatus(order.id, order.status)}
                            className="px-2.5 py-1 text-xs bg-paprica text-white rounded-lg hover:bg-paprica-dark"
                          >
                            Avançar
                          </button>
                        )}
                        {order.status !== "delivered" && (
                          <button
                            onClick={() => cancelOrder(order.id)}
                            className="px-2 py-1 text-xs text-paprica border border-paprica/30 rounded-lg hover:bg-paprica/10"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-[10px] text-gray-300 mt-1">
                      {new Date(order.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                ))}

                {colOrders.length === 0 && (
                  <div className="text-center py-8 text-gray-300 text-xs">Vazio</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
