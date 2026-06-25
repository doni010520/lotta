"use client";

import { useState } from "react";
import { X, Minus, Plus, Trash2, Clock, MapPin, CreditCard } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Props {
  slug: string;
  minOrder: number;
  zones: any[];
  onClose: () => void;
}

type Step = "cart" | "address" | "payment";

export function CartDrawer({ slug, minOrder, zones, onClose }: Props) {
  const { items, removeItem, updateQuantity, subtotal, clearCart } = useCart();
  const [step, setStep] = useState<Step>("cart");
  const [address, setAddress] = useState({ street: "", number: "", complement: "", neighborhood: "", zip: "" });
  const [selectedZone, setSelectedZone] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("pix");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const deliveryFee = selectedZone?.fee ?? 0;
  const total = subtotal + deliveryFee;

  async function handleSubmit() {
    if (!customerName || !customerPhone) {
      toast.error("Preencha seu nome e telefone");
      return;
    }
    if (!address.street || !address.number) {
      toast.error("Preencha o endereço de entrega");
      return;
    }
    if (subtotal < minOrder) {
      toast.error(`Pedido mínimo: ${formatCurrency(minOrder)}`);
      return;
    }

    setLoading(true);

    try {
      // Get restaurant
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id")
        .eq("slug", slug)
        .single();

      if (!restaurant) throw new Error("Restaurante não encontrado");

      // Find or create customer
      const { data: existing } = await supabase
        .from("customers")
        .select("id")
        .eq("restaurant_id", restaurant.id)
        .eq("phone", customerPhone.replace(/\D/g, ""))
        .single();

      let customerId = existing?.id;

      if (!customerId) {
        const { data: newCustomer } = await supabase
          .from("customers")
          .insert({
            restaurant_id: restaurant.id,
            name: customerName,
            phone: customerPhone.replace(/\D/g, ""),
            source: "organic",
          })
          .select("id")
          .single();
        customerId = newCustomer?.id;
      }

      // Create order
      const orderPayload = {
        restaurant_id: restaurant.id,
        customer_id: customerId,
        channel: "cardapio",
        status: paymentMethod === "cash" || paymentMethod === "card_on_delivery" ? "confirmed" : "pending",
        payment_method: paymentMethod,
        payment_status: paymentMethod === "cash" || paymentMethod === "card_on_delivery" ? "paid" : "pending",
        subtotal,
        delivery_fee: deliveryFee,
        discount: 0,
        total,
        delivery_address: address,
        customer_name: customerName,
        customer_phone: customerPhone.replace(/\D/g, ""),
        notes: notes || null,
        scheduled_for: scheduledFor || null,
      };

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert(orderPayload)
        .select("id, order_number")
        .single();

      if (orderErr) throw orderErr;

      // Create order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        restaurant_id: restaurant.id,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        options: item.options,
        notes: item.notes || null,
      }));

      await supabase.from("order_items").insert(orderItems);

      // Create status history
      await supabase.from("order_status_history").insert({
        order_id: order.id,
        restaurant_id: restaurant.id,
        to_status: orderPayload.status,
        notes: "Pedido criado pelo cardápio digital",
      });

      // Update customer stats
      await supabase.rpc("increment_customer_stats", {
        p_customer_id: customerId,
        p_total: total,
      }).catch(() => {});

      clearCart();
      toast.success("Pedido realizado!");
      router.push(`/${slug}/pedido/${order.id}`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar pedido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-lg">
            {step === "cart" ? "Carrinho" : step === "address" ? "Endereço" : "Pagamento"}
          </h2>
          <button onClick={onClose} className="p-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4">
          {step === "cart" && (
            <>
              {items.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Carrinho vazio</p>
              ) : (
                <div className="space-y-3 mb-4">
                  {items.map((item, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.productName}</p>
                        {item.options.length > 0 && (
                          <p className="text-xs text-gray-400">
                            {item.options.map((o) => o.optionName).join(", ")}
                          </p>
                        )}
                        <p className="text-sm font-semibold mt-1">{formatCurrency(item.totalPrice)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQuantity(i, item.quantity - 1)} className="p-1 border rounded">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-sm">{item.quantity}</span>
                        <button onClick={() => updateQuantity(i, item.quantity + 1)} className="p-1 border rounded">
                          <Plus className="w-3 h-3" />
                        </button>
                        <button onClick={() => removeItem(i)} className="p-1 text-paprica/60 ml-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {items.length > 0 && (
                <>
                  <div className="border-t pt-3 flex justify-between font-semibold">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <button
                    onClick={() => setStep("address")}
                    disabled={subtotal < minOrder}
                    className="w-full mt-4 bg-paprica text-white rounded-xl py-3 font-medium disabled:opacity-50"
                  >
                    {subtotal < minOrder
                      ? `Pedido mínimo: ${formatCurrency(minOrder)}`
                      : "Continuar"}
                  </button>
                </>
              )}
            </>
          )}

          {step === "address" && (
            <>
              <div className="space-y-3 mb-4">
                <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Seu nome" required className="w-full border rounded-lg px-3 py-2.5 text-sm" />
                <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="WhatsApp (ex: 71999999999)" required className="w-full border rounded-lg px-3 py-2.5 text-sm" />
                <div className="grid grid-cols-3 gap-2">
                  <input value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} placeholder="Rua" className="col-span-2 border rounded-lg px-3 py-2.5 text-sm" />
                  <input value={address.number} onChange={(e) => setAddress({ ...address, number: e.target.value })} placeholder="Nº" className="border rounded-lg px-3 py-2.5 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input value={address.complement} onChange={(e) => setAddress({ ...address, complement: e.target.value })} placeholder="Complemento" className="border rounded-lg px-3 py-2.5 text-sm" />
                  <input value={address.neighborhood} onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })} placeholder="Bairro" className="border rounded-lg px-3 py-2.5 text-sm" />
                </div>
              </div>

              {/* Delivery zone */}
              <div className="mb-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-1"><MapPin className="w-4 h-4" /> Zona de entrega</p>
                <div className="space-y-1">
                  {zones.map((z) => (
                    <button
                      key={z.id}
                      onClick={() => setSelectedZone(z)}
                      className={`w-full flex justify-between px-3 py-2.5 rounded-lg border text-sm ${
                        selectedZone?.id === z.id ? "border-paprica bg-paprica/10" : "hover:bg-gray-50"
                      }`}
                    >
                      <span>{z.name}</span>
                      <span className="text-gray-500">{formatCurrency(z.fee)} · ~{z.estimated_min}min</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Schedule */}
              <div className="mb-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-1"><Clock className="w-4 h-4" /> Agendar pedido (opcional)</p>
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm"
                />
              </div>

              <div className="flex gap-2">
                <button onClick={() => setStep("cart")} className="flex-1 border rounded-xl py-3 text-sm">Voltar</button>
                <button
                  onClick={() => selectedZone ? setStep("payment") : toast.error("Selecione a zona de entrega")}
                  className="flex-1 bg-paprica text-white rounded-xl py-3 text-sm font-medium"
                >
                  Continuar
                </button>
              </div>
            </>
          )}

          {step === "payment" && (
            <>
              <p className="text-sm font-medium mb-3 flex items-center gap-1"><CreditCard className="w-4 h-4" /> Forma de pagamento</p>
              <div className="space-y-1 mb-4">
                {[
                  { value: "pix", label: "Pix" },
                  { value: "credit_card", label: "Cartão de crédito" },
                  { value: "cash", label: "Dinheiro na entrega" },
                  { value: "card_on_delivery", label: "Maquininha na entrega" },
                ].map((pm) => (
                  <button
                    key={pm.value}
                    onClick={() => setPaymentMethod(pm.value)}
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm text-left ${
                      paymentMethod === pm.value ? "border-paprica bg-paprica/10" : "hover:bg-gray-50"
                    }`}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações do pedido..."
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm mb-4"
              />

              {/* Summary */}
              <div className="border-t pt-3 space-y-1 text-sm mb-4">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Entrega</span><span>{formatCurrency(deliveryFee)}</span></div>
                <div className="flex justify-between font-semibold text-base pt-1 border-t"><span>Total</span><span>{formatCurrency(total)}</span></div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setStep("address")} className="flex-1 border rounded-xl py-3 text-sm">Voltar</button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-paprica text-white rounded-xl py-3 text-sm font-medium disabled:opacity-50"
                >
                  {loading ? "Enviando..." : `Finalizar · ${formatCurrency(total)}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
