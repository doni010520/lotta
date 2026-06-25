"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { toast } from "sonner";
import { Check, ArrowRight, Store, MapPin, MessageSquare, Bot, UtensilsCrossed } from "lucide-react";

const STEPS = [
  { key: "restaurant", label: "Seu restaurante", icon: Store },
  { key: "menu", label: "Cardápio", icon: UtensilsCrossed },
  { key: "delivery", label: "Entrega", icon: MapPin },
  { key: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { key: "agent", label: "Agente IA", icon: Bot },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<any>({});
  const router = useRouter();
  const supabase = createClient();

  async function saveStep() {
    const currentStep = STEPS[step].key;

    // Get current restaurant ID
    const { data: memberships } = await supabase.from("restaurant_users").select("restaurant_id").limit(1).single();
    const restId = memberships?.restaurant_id;
    if (!restId) { toast.error("Restaurante não encontrado"); return; }

    if (currentStep === "restaurant") {
      await supabase.from("restaurants").update({
        name: data.name, phone: data.phone, email: data.email,
        address: { street: data.street, number: data.number, neighborhood: data.neighborhood, city: data.city, state: data.state, zip: data.zip },
      }).eq("id", restId);
    }

    if (currentStep === "delivery" && data.zones) {
      for (const z of data.zones) {
        await supabase.from("delivery_zones").insert({ restaurant_id: restId, name: z.name, type: "radius", radius_km: z.radius, fee: z.fee, estimated_min: z.time || 30 });
      }
    }

    if (currentStep === "whatsapp") {
      await supabase.from("whatsapp_instances").upsert({ restaurant_id: restId,
        provider: data.wa_provider || "uazapi",
        credentials: { host: data.wa_host, token: data.wa_token, instance: data.wa_instance },
        agent_enabled: true,
      });
    }

    if (currentStep === "agent") {
      await supabase.from("whatsapp_instances").update({
        agent_name: data.agent_name || "Assistente",
        agent_persona: data.agent_persona || "Você é um assistente simpático e eficiente.",
      }).eq("restaurant_id", restId);
    }

    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      await supabase.from("restaurants").update({ is_open: true }).eq("id", restId);
      toast.success("Restaurante configurado! Seu cardápio está ativo.");
      router.push("/pedidos");
    }
  }

  const current = STEPS[step];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i < step ? "bg-green-500 text-white" : i === step ? "bg-paprica text-white" : "bg-gray-200 text-gray-500"
              }`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < step ? "bg-green-500" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border p-8">
          <div className="flex items-center gap-3 mb-6">
            <current.icon className="w-6 h-6 text-paprica" />
            <h2 className="text-xl font-semibold">{current.label}</h2>
          </div>

          {current.key === "restaurant" && (
            <div className="space-y-3">
              <input value={data.name || ""} onChange={(e) => setData({ ...data, name: e.target.value })} placeholder="Nome do restaurante" className="w-full border rounded-lg px-3 py-2.5 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input value={data.phone || ""} onChange={(e) => setData({ ...data, phone: e.target.value })} placeholder="Telefone" className="border rounded-lg px-3 py-2.5 text-sm" />
                <input value={data.email || ""} onChange={(e) => setData({ ...data, email: e.target.value })} placeholder="E-mail" className="border rounded-lg px-3 py-2.5 text-sm" />
              </div>
              <input value={data.street || ""} onChange={(e) => setData({ ...data, street: e.target.value })} placeholder="Rua" className="w-full border rounded-lg px-3 py-2.5 text-sm" />
              <div className="grid grid-cols-3 gap-3">
                <input value={data.number || ""} onChange={(e) => setData({ ...data, number: e.target.value })} placeholder="Nº" className="border rounded-lg px-3 py-2.5 text-sm" />
                <input value={data.neighborhood || ""} onChange={(e) => setData({ ...data, neighborhood: e.target.value })} placeholder="Bairro" className="border rounded-lg px-3 py-2.5 text-sm" />
                <input value={data.city || ""} onChange={(e) => setData({ ...data, city: e.target.value })} placeholder="Cidade" className="border rounded-lg px-3 py-2.5 text-sm" />
              </div>
            </div>
          )}

          {current.key === "menu" && (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">Cadastre seus produtos no cardápio. Você pode importar do iFood ou adicionar manualmente.</p>
              <p className="text-sm text-gray-400">Após o wizard, acesse a aba "Cardápio" para gerenciar seus produtos.</p>
            </div>
          )}

          {current.key === "delivery" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Configure suas zonas de entrega</p>
              {[0, 1, 2].map((i) => (
                <div key={i} className="grid grid-cols-4 gap-2">
                  <input placeholder={`Zona ${i + 1}`} onChange={(e) => {
                    const zones = data.zones || [{}, {}, {}];
                    zones[i] = { ...zones[i], name: e.target.value };
                    setData({ ...data, zones });
                  }} className="border rounded-lg px-3 py-2 text-sm" />
                  <input type="number" placeholder="Raio km" step="0.5" onChange={(e) => {
                    const zones = data.zones || [{}, {}, {}];
                    zones[i] = { ...zones[i], radius: parseFloat(e.target.value) };
                    setData({ ...data, zones });
                  }} className="border rounded-lg px-3 py-2 text-sm" />
                  <input type="number" placeholder="Taxa R$" step="0.5" onChange={(e) => {
                    const zones = data.zones || [{}, {}, {}];
                    zones[i] = { ...zones[i], fee: parseFloat(e.target.value) };
                    setData({ ...data, zones });
                  }} className="border rounded-lg px-3 py-2 text-sm" />
                  <input type="number" placeholder="Min" defaultValue={30} onChange={(e) => {
                    const zones = data.zones || [{}, {}, {}];
                    zones[i] = { ...zones[i], time: parseInt(e.target.value) };
                    setData({ ...data, zones });
                  }} className="border rounded-lg px-3 py-2 text-sm" />
                </div>
              ))}
            </div>
          )}

          {current.key === "whatsapp" && (
            <div className="space-y-3">
              <select value={data.wa_provider || "uazapi"} onChange={(e) => setData({ ...data, wa_provider: e.target.value })} className="w-full border rounded-lg px-3 py-2.5 text-sm">
                <option value="uazapi">Uazapi (não-oficial)</option>
                <option value="meta_cloud">Meta Cloud API (oficial)</option>
              </select>
              <input value={data.wa_host || ""} onChange={(e) => setData({ ...data, wa_host: e.target.value })} placeholder="Host (ex: https://uazapi.benitechlab.com)" className="w-full border rounded-lg px-3 py-2.5 text-sm" />
              <input value={data.wa_token || ""} onChange={(e) => setData({ ...data, wa_token: e.target.value })} placeholder="Token" type="password" className="w-full border rounded-lg px-3 py-2.5 text-sm" />
              <input value={data.wa_instance || ""} onChange={(e) => setData({ ...data, wa_instance: e.target.value })} placeholder="Nome da instância" className="w-full border rounded-lg px-3 py-2.5 text-sm" />
            </div>
          )}

          {current.key === "agent" && (
            <div className="space-y-3">
              <input value={data.agent_name || ""} onChange={(e) => setData({ ...data, agent_name: e.target.value })} placeholder="Nome do agente (ex: Sofia)" className="w-full border rounded-lg px-3 py-2.5 text-sm" />
              <textarea value={data.agent_persona || ""} onChange={(e) => setData({ ...data, agent_persona: e.target.value })} placeholder="Personalidade do agente..." rows={4} className="w-full border rounded-lg px-3 py-2.5 text-sm" />
              <p className="text-xs text-gray-400">Ex: "Seja informal, use emojis com moderação. Sempre sugira a sobremesa do dia."</p>
            </div>
          )}

          <div className="flex justify-between mt-8">
            {step > 0 ? (
              <button onClick={() => setStep(step - 1)} className="px-4 py-2.5 border rounded-lg text-sm">Voltar</button>
            ) : <div />}
            <button onClick={saveStep} className="flex items-center gap-2 px-6 py-2.5 bg-paprica text-white rounded-lg text-sm font-medium hover:bg-paprica-dark">
              {step === STEPS.length - 1 ? "Ativar cardápio" : "Próximo"} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Lotta — a solução que lota o seu delivery
        </p>
      </div>
    </div>
  );
}
