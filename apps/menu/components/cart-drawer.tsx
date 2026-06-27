"use client";

import { useState } from "react";
import { X, Minus, Plus, Trash2, Clock, MapPin, CreditCard, Gift } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createOrder, requestPixPayment, getLoyaltyBalance } from "@/lib/payment-client";
import { Sheet } from "./sheet";
import { ProductImage } from "./product-image";

interface Props {
  slug: string;
  minOrder: number;
  zones: any[];
  onClose: () => void;
  /** Produtos sugeridos (upsell) que não estão no carrinho */
  suggestions?: any[];
  /** Abre o modal de um produto com opções (upsell de item configurável) */
  onPickSuggestion?: (product: any) => void;
}

type Step = "cart" | "address" | "payment" | "pix";

const inputClass =
  "w-full border border-cafe/10 rounded-lg px-3 py-2.5 text-sm text-cafe placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-paprica/25";

export function CartDrawer({ slug, minOrder, zones, onClose, suggestions = [], onPickSuggestion }: Props) {
  const { items, addItem, removeItem, updateQuantity, subtotal, clearCart } = useCart();
  const [step, setStep] = useState<Step>("cart");
  const [loyalty, setLoyalty] = useState<{ enabled: boolean; balance: number; min_redeem?: number }>({ enabled: false, balance: 0 });
  const [applyRedeem, setApplyRedeem] = useState(false);
  const [address, setAddress] = useState({ street: "", number: "", complement: "", neighborhood: "", zip: "" });
  const [selectedZone, setSelectedZone] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("pix");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{ pixCode?: string; pixQrBase64?: string } | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const router = useRouter();

  const deliveryFee = selectedZone?.fee ?? 0;
  const redeemApplied = applyRedeem ? Math.min(loyalty.balance, subtotal + deliveryFee) : 0;
  const total = Math.max(0, subtotal + deliveryFee - redeemApplied);

  // Quick-add de upsell: item sem opções entra direto; com opções abre o modal
  function pickSuggestion(prod: any) {
    const hasOptions = (prod.option_groups ?? []).length > 0;
    if (hasOptions) {
      onPickSuggestion?.(prod);
      onClose();
      return;
    }
    const unitPrice = prod.promo_price ?? prod.price;
    addItem({
      productId: prod.id,
      productName: prod.name,
      unitPrice,
      quantity: 1,
      imageUrl: prod.image_url ?? null,
      options: [],
      notes: "",
      totalPrice: unitPrice,
    });
    toast.success(`${prod.name} adicionado`);
  }

  // mínimo do agendamento = agora (horário local), evita agendar no passado
  const now = new Date();
  const minSchedule = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

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
      // Cria o pedido no servidor — total/preços recomputados a partir do banco (Nível B)
      const order = await createOrder({
        restaurant_slug: slug,
        customer_name: customerName,
        customer_phone: customerPhone,
        delivery_address: address,
        zone_id: selectedZone?.id ?? null,
        payment_method: paymentMethod,
        notes: notes || null,
        scheduled_for: scheduledFor || null,
        redeem_amount: redeemApplied || null,
        items: items.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
          options: item.options.map((o) => ({ group_name: o.groupName, option_name: o.optionName })),
          notes: item.notes || null,
        })),
      });

      if (order.error || !order.id) {
        throw new Error(typeof order.error === "string" ? order.error : "Erro ao criar pedido");
      }

      setCreatedOrderId(order.id);
      clearCart();

      // Pagamento online via Pix: gera a cobrança no gateway do restaurante
      if (paymentMethod === "pix") {
        const pay = await requestPixPayment(order.id);
        if (pay.error || !pay.pixCode) {
          toast.error(pay.error || "Não foi possível gerar o Pix. Acompanhe o pedido.");
          router.push(`/${slug}/pedido/${order.id}`);
          return;
        }
        setPixData(pay);
        setStep("pix");
        return;
      }

      toast.success("Pedido realizado!");
      router.push(`/${slug}/pedido/${order.id}`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar pedido");
    } finally {
      setLoading(false);
    }
  }

  async function goToPayment() {
    if (!selectedZone) { toast.error("Selecione a zona de entrega"); return; }
    setStep("payment");
    if (customerPhone) {
      const bal = await getLoyaltyBalance(slug, customerPhone);
      setLoyalty(bal);
      if (!bal.balance) setApplyRedeem(false);
    }
  }

  const stepTitle = step === "cart" ? "Carrinho" : step === "address" ? "Endereço" : "Pagamento";

  return (
    <Sheet title={stepTitle} onClose={onClose}>
      <div className="flex items-center justify-between p-4 border-b border-cafe/10">
        <h2 className="font-display font-bold text-lg text-cafe">{stepTitle}</h2>
        <button onClick={onClose} aria-label="Fechar" className="grid place-items-center h-10 w-10 -mr-2 rounded-full text-cafe hover:bg-creme transition-colors">
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      <div className="p-4">
        {step === "cart" && (
          <>
            {items.length === 0 ? (
              <p className="text-center text-muted py-8">Carrinho vazio</p>
            ) : (
              <div className="space-y-3 mb-4">
                {items.map((item, i) => (
                  <div key={`${item.productId}-${i}`} className="flex gap-3 items-start">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-cafe">{item.productName}</p>
                      {item.options.length > 0 && (
                        <p className="text-xs text-muted">
                          {item.options.map((o) => o.optionName).join(", ")}
                        </p>
                      )}
                      <p className="text-sm font-semibold text-cafe mt-1">{formatCurrency(item.totalPrice)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQuantity(i, item.quantity - 1)} aria-label="Diminuir quantidade" className="grid place-items-center h-9 w-9 border border-cafe/10 rounded text-cafe">
                        <Minus className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <span className="px-2 min-w-7 text-center text-sm" aria-live="polite">{item.quantity}</span>
                      <button onClick={() => updateQuantity(i, item.quantity + 1)} aria-label="Aumentar quantidade" className="grid place-items-center h-9 w-9 border border-cafe/10 rounded text-cafe">
                        <Plus className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button onClick={() => removeItem(i)} aria-label="Remover item" className="grid place-items-center h-9 w-9 text-paprica/70 hover:text-paprica ml-1">
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {items.length > 0 && suggestions.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-cafe mb-2">Peça também 👀</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => pickSuggestion(s)}
                      className="shrink-0 w-28 text-left border border-cafe/10 rounded-xl p-2 hover:border-paprica/30 transition-colors"
                    >
                      <ProductImage src={s.image_url} alt={s.name} sizes="112px" className="w-full h-16 rounded-lg mb-1" />
                      <p className="text-xs font-medium text-cafe line-clamp-1">{s.name}</p>
                      <p className="text-xs text-paprica font-semibold">{formatCurrency(s.promo_price ?? s.price)}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {items.length > 0 && (
              <>
                <div className="border-t border-cafe/10 pt-3 flex justify-between font-semibold text-cafe">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <button
                  onClick={() => setStep("address")}
                  disabled={subtotal < minOrder}
                  className="w-full mt-4 bg-paprica text-white rounded-xl py-3 font-medium hover:bg-paprica-dark disabled:opacity-50 transition-colors"
                >
                  {subtotal < minOrder ? `Pedido mínimo: ${formatCurrency(minOrder)}` : "Continuar"}
                </button>
              </>
            )}
          </>
        )}

        {step === "address" && (
          <>
            <div className="space-y-3 mb-4">
              <div>
                <label htmlFor="cust-name" className="block text-sm font-medium text-cafe mb-1">Seu nome</label>
                <input id="cust-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} autoComplete="name" required placeholder="Nome completo" className={inputClass} />
              </div>
              <div>
                <label htmlFor="cust-phone" className="block text-sm font-medium text-cafe mb-1">WhatsApp</label>
                <input id="cust-phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" required placeholder="Ex: 71999999999" className={inputClass} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label htmlFor="addr-street" className="block text-sm font-medium text-cafe mb-1">Rua</label>
                  <input id="addr-street" value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} autoComplete="address-line1" required placeholder="Rua" className={inputClass} />
                </div>
                <div>
                  <label htmlFor="addr-number" className="block text-sm font-medium text-cafe mb-1">Nº</label>
                  <input id="addr-number" value={address.number} onChange={(e) => setAddress({ ...address, number: e.target.value })} inputMode="numeric" required placeholder="Nº" className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="addr-complement" className="block text-sm font-medium text-cafe mb-1">Complemento</label>
                  <input id="addr-complement" value={address.complement} onChange={(e) => setAddress({ ...address, complement: e.target.value })} autoComplete="address-line2" placeholder="Apto, bloco..." className={inputClass} />
                </div>
                <div>
                  <label htmlFor="addr-neighborhood" className="block text-sm font-medium text-cafe mb-1">Bairro</label>
                  <input id="addr-neighborhood" value={address.neighborhood} onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })} autoComplete="address-level3" placeholder="Bairro" className={inputClass} />
                </div>
              </div>
            </div>

            {/* Delivery zone */}
            <div className="mb-4">
              <p className="text-sm font-medium text-cafe mb-2 flex items-center gap-1"><MapPin className="w-4 h-4" aria-hidden="true" /> Zona de entrega</p>
              <div className="space-y-1">
                {zones.map((z) => (
                  <button
                    key={z.id}
                    aria-pressed={selectedZone?.id === z.id}
                    onClick={() => setSelectedZone(z)}
                    className={`w-full flex justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                      selectedZone?.id === z.id ? "border-paprica bg-paprica/10 text-cafe" : "border-cafe/10 hover:bg-creme"
                    }`}
                  >
                    <span>{z.name}</span>
                    <span className="text-muted">{formatCurrency(z.fee)} · ~{z.estimated_min}min</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Schedule */}
            <div className="mb-4">
              <label htmlFor="schedule" className="text-sm font-medium text-cafe mb-2 flex items-center gap-1"><Clock className="w-4 h-4" aria-hidden="true" /> Agendar pedido (opcional)</label>
              <input
                id="schedule"
                type="datetime-local"
                min={minSchedule}
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep("cart")} className="flex-1 border border-cafe/10 rounded-xl py-3 text-sm text-cafe hover:bg-creme transition-colors">Voltar</button>
              <button
                onClick={goToPayment}
                className="flex-1 bg-paprica text-white rounded-xl py-3 text-sm font-medium hover:bg-paprica-dark transition-colors"
              >
                Continuar
              </button>
            </div>
          </>
        )}

        {step === "payment" && (
          <>
            <p className="text-sm font-medium text-cafe mb-3 flex items-center gap-1"><CreditCard className="w-4 h-4" aria-hidden="true" /> Forma de pagamento</p>
            <div className="space-y-1 mb-4">
              {[
                { value: "pix", label: "Pix" },
                { value: "cash", label: "Dinheiro na entrega" },
                { value: "card_on_delivery", label: "Maquininha na entrega" },
              ].map((pm) => (
                <button
                  key={pm.value}
                  aria-pressed={paymentMethod === pm.value}
                  onClick={() => setPaymentMethod(pm.value)}
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm text-left transition-colors ${
                    paymentMethod === pm.value ? "border-paprica bg-paprica/10 text-cafe" : "border-cafe/10 hover:bg-creme"
                  }`}
                >
                  {pm.label}
                </button>
              ))}
            </div>

            <div className="mb-4">
              <label htmlFor="order-notes" className="block text-sm font-medium text-cafe mb-1">Observações do pedido</label>
              <textarea
                id="order-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: troco para R$50, ponto de referência..."
                rows={2}
                className={inputClass}
              />
            </div>

            {/* Resgate de cashback */}
            {loyalty.enabled && loyalty.balance > 0 && (
              <label className="flex items-center justify-between gap-2 mb-4 p-3 rounded-lg border border-gema/40 bg-gema/10 cursor-pointer">
                <span className="flex items-center gap-2 text-sm text-cafe">
                  <Gift className="w-4 h-4 text-gema" aria-hidden="true" />
                  Usar {formatCurrency(loyalty.balance)} de cashback
                </span>
                <input
                  type="checkbox"
                  checked={applyRedeem}
                  onChange={(e) => setApplyRedeem(e.target.checked)}
                  className="h-4 w-4 accent-paprica"
                />
              </label>
            )}

            {/* Summary */}
            <div className="border-t border-cafe/10 pt-3 space-y-1 text-sm mb-4">
              <div className="flex justify-between"><span className="text-muted">Subtotal</span><span className="text-cafe">{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Entrega</span><span className="text-cafe">{formatCurrency(deliveryFee)}</span></div>
              {redeemApplied > 0 && (
                <div className="flex justify-between text-green-600"><span>Cashback</span><span>-{formatCurrency(redeemApplied)}</span></div>
              )}
              <div className="flex justify-between font-semibold text-base text-cafe pt-1 border-t border-cafe/10"><span>Total</span><span>{formatCurrency(total)}</span></div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep("address")} className="flex-1 border border-cafe/10 rounded-xl py-3 text-sm text-cafe hover:bg-creme transition-colors">Voltar</button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-paprica text-white rounded-xl py-3 text-sm font-medium hover:bg-paprica-dark disabled:opacity-50 transition-colors"
              >
                {loading ? "Enviando..." : `Finalizar · ${formatCurrency(total)}`}
              </button>
            </div>
          </>
        )}

        {step === "pix" && pixData && (
          <div className="text-center">
            <p className="text-sm font-medium text-cafe mb-3">Pague com Pix para confirmar seu pedido</p>
            {pixData.pixQrBase64 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`data:image/png;base64,${pixData.pixQrBase64}`} alt="QR Code Pix" className="w-48 h-48 mx-auto mb-3" />
            )}
            <p className="text-xs text-muted mb-1">Pix copia e cola</p>
            <textarea
              readOnly
              aria-label="Código Pix copia e cola"
              value={pixData.pixCode || ""}
              rows={3}
              className="w-full border border-cafe/10 rounded-lg px-3 py-2 text-xs mb-3"
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />
            <button
              onClick={() => { navigator.clipboard?.writeText(pixData.pixCode || ""); toast.success("Código copiado"); }}
              className="w-full border border-cafe/10 rounded-xl py-3 text-sm text-cafe hover:bg-creme transition-colors mb-2"
            >
              Copiar código Pix
            </button>
            <button
              onClick={() => createdOrderId && router.push(`/${slug}/pedido/${createdOrderId}`)}
              className="w-full bg-paprica text-white rounded-xl py-3 text-sm font-medium hover:bg-paprica-dark transition-colors"
            >
              Já paguei · acompanhar pedido
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
