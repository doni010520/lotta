"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle2, Clock, ChefHat, Package, Truck, PartyPopper } from "lucide-react";

const STEPS = [
  { status: "pending", label: "Pendente", icon: Clock, color: "text-yellow-500" },
  { status: "confirmed", label: "Confirmado", icon: CheckCircle2, color: "text-blue-500" },
  { status: "preparing", label: "Preparando", icon: ChefHat, color: "text-orange-500" },
  { status: "ready", label: "Pronto", icon: Package, color: "text-purple-500" },
  { status: "dispatched", label: "Saiu p/ entrega", icon: Truck, color: "text-indigo-500" },
  { status: "delivered", label: "Entregue", icon: PartyPopper, color: "text-green-600" },
];

interface Props {
  params: Promise<{ slug: string; orderId: string }>;
}

export default function OrderTrackingPage({ params }: Props) {
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderId, setOrderId] = useState("");

  useEffect(() => {
    params.then(({ orderId: id }) => {
      setOrderId(id);
      loadOrder(id);
    });
  }, [params]);

  async function loadOrder(id: string) {
    const { data } = await supabase
      .from("orders")
      .select("*, items:order_items(*)")
      .eq("id", id)
      .single();

    if (data) {
      setOrder(data);
      setItems(data.items ?? []);
    }
    setLoading(false);
  }

  // Realtime subscription
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order-${orderId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "orders",
        filter: `id=eq.${orderId}`,
      }, (payload) => {
        setOrder((prev: any) => prev ? { ...prev, ...payload.new } : prev);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  if (loading) return <div className="p-8 text-center text-gray-400">Carregando...</div>;
  if (!order) return <div className="p-8 text-center text-gray-400">Pedido não encontrado</div>;

  const currentIdx = STEPS.findIndex((s) => s.status === order.status);
  const isCancelled = order.status === "cancelled";

  return (
    <div className="px-4 py-6">
      <div className="bg-white rounded-2xl border p-6 mb-4">
        <div className="text-center mb-6">
          <p className="text-sm text-gray-500">Pedido</p>
          <p className="text-3xl font-bold">#{order.order_number}</p>
          {order.scheduled_for && (
            <p className="text-sm text-blue-600 mt-1">
              Agendado para {new Date(order.scheduled_for).toLocaleString("pt-BR")}
            </p>
          )}
        </div>

        {isCancelled ? (
          <div className="bg-paprica/10 text-paprica rounded-xl p-4 text-center font-medium">
            Pedido cancelado
          </div>
        ) : (
          <div className="space-y-4">
            {STEPS.map((step, idx) => {
              const isActive = idx <= currentIdx;
              const isCurrent = idx === currentIdx;
              const StepIcon = step.icon;

              return (
                <div key={step.status} className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isActive ? "bg-green-100" : "bg-gray-100"
                  }`}>
                    <StepIcon className={`w-5 h-5 ${isActive ? "text-green-600" : "text-gray-300"}`} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isActive ? "text-gray-900" : "text-gray-400"}`}>
                      {step.label}
                    </p>
                  </div>
                  {isCurrent && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium animate-pulse">
                      Agora
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Order details */}
      <div className="bg-white rounded-2xl border p-6">
        <h3 className="font-semibold text-sm mb-3">Itens do pedido</h3>
        <div className="space-y-2 mb-4">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>{item.quantity}x {item.product_name}</span>
              <span className="font-medium">{formatCurrency(item.total_price)}</span>
            </div>
          ))}
        </div>
        <div className="border-t pt-3 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Entrega</span><span>{formatCurrency(order.delivery_fee)}</span></div>
          {order.discount > 0 && (
            <div className="flex justify-between text-green-600"><span>Desconto</span><span>-{formatCurrency(order.discount)}</span></div>
          )}
          <div className="flex justify-between font-semibold text-base border-t pt-2">
            <span>Total</span><span>{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
