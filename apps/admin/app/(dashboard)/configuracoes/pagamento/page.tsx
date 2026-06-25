"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { toast } from "sonner";

const GATEWAYS = [
  { value: "mercadopago", label: "Mercado Pago", fields: ["access_token", "payer_email"] },
  { value: "asaas", label: "Asaas", fields: ["api_key", "sandbox"] },
  { value: "stripe", label: "Stripe", fields: ["secret_key", "publishable_key"] },
  { value: "pagseguro", label: "PagSeguro", fields: ["token", "email"] },
  { value: "manual", label: "Sem gateway (manual)", fields: [] },
];

export default function PagamentoPage() {
  const [config, setConfig] = useState<any>(null);
  const [gateway, setGateway] = useState("manual");
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [accepts, setAccepts] = useState({ pix: true, card: true, cash: true, card_delivery: true });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.from("payment_configs").select("*").limit(1).single().then(({ data }) => {
      if (data) {
        setConfig(data);
        setGateway(data.gateway);
        setCreds(data.credentials || {});
        setAccepts({ pix: data.accepts_pix, card: data.accepts_card, cash: data.accepts_cash, card_delivery: data.accepts_card_delivery });
      }
      setLoading(false);
    });
  }, []);

  async function save() {
    const payload = {
      gateway,
      credentials: creds,
      accepts_pix: accepts.pix,
      accepts_card: accepts.card,
      accepts_cash: accepts.cash,
      accepts_card_delivery: accepts.card_delivery,
    };

    if (config) {
      await supabase.from("payment_configs").update(payload).eq("id", config.id);
    } else {
      await supabase.from("payment_configs").insert(payload);
    }
    toast.success("Configuração de pagamento salva");
  }

  if (loading) return <div className="py-12 text-center text-gray-400">Carregando...</div>;

  const selectedGw = GATEWAYS.find((g) => g.value === gateway);

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-6">Pagamento</h1>
      <p className="text-sm text-gray-500 mb-6">O dinheiro dos pedidos cai direto na sua conta. A Lotta não toca no seu dinheiro.</p>

      <div className="bg-white rounded-xl border p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Gateway de pagamento</label>
          <select value={gateway} onChange={(e) => { setGateway(e.target.value); setCreds({}); }} className="w-full border rounded-lg px-3 py-2.5 text-sm">
            {GATEWAYS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </div>

        {selectedGw && selectedGw.fields.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">Credenciais do {selectedGw.label} (criptografadas)</p>
            {selectedGw.fields.map((field) => (
              <div key={field}>
                <label className="block text-xs text-gray-500 mb-1">{field}</label>
                <input
                  type={field.includes("key") || field.includes("token") || field.includes("secret") ? "password" : "text"}
                  value={creds[field] || ""}
                  onChange={(e) => setCreds({ ...creds, [field]: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder={field}
                />
              </div>
            ))}
          </div>
        )}

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Métodos aceitos</p>
          <div className="space-y-2">
            {[
              { key: "pix", label: "Pix" },
              { key: "card", label: "Cartão de crédito (online)" },
              { key: "cash", label: "Dinheiro na entrega" },
              { key: "card_delivery", label: "Maquininha na entrega" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={(accepts as any)[key]}
                  onChange={(e) => setAccepts({ ...accepts, [key]: e.target.checked })}
                  className="rounded"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <button onClick={save} className="px-6 py-2.5 bg-paprica text-white rounded-lg text-sm font-medium hover:bg-paprica-dark">
          Salvar
        </button>
      </div>
    </div>
  );
}
