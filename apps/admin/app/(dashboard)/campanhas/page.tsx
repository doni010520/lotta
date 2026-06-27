"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { toast } from "sonner";
import { Plus, Send, Clock } from "lucide-react";
import { Modal } from "@/components/ui/modal";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600", scheduled: "bg-blue-50 text-blue-600",
  sending: "bg-yellow-50 text-yellow-600", sent: "bg-green-50 text-green-600",
  cancelled: "bg-paprica/10 text-paprica",
};
const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho", scheduled: "Agendada", sending: "Enviando", sent: "Enviada", cancelled: "Cancelada",
};

export default function CampanhasPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [rules, setRules] = useState<any>({
    abandoned_cart: { enabled: true, message: "Ei! Você deixou itens no carrinho: {itens}. Quer finalizar? 😊" },
    inactive: { enabled: true, cooldown_days: 7, message: "{nome}, sentimos sua falta no {restaurante}! 🍽️ Que tal pedir hoje?", coupon_code: "" },
  });
  const supabase = createClient();

  const minSchedule = (() => {
    const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 16);
  })();

  useEffect(() => { load(); loadRules(); }, []);
  async function load() {
    const { data } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false });
    setCampaigns(data ?? []);
  }
  async function loadRules() {
    const { data } = await supabase.from("restaurants").select("id, metadata").limit(1).single();
    if (data) {
      setRestaurant(data);
      const r = (data.metadata as any)?.recovery_rules;
      if (r) setRules((prev: any) => ({ abandoned_cart: { ...prev.abandoned_cart, ...r.abandoned_cart }, inactive: { ...prev.inactive, ...r.inactive } }));
    }
  }

  async function saveRules() {
    if (!restaurant) return;
    const metadata = { ...((restaurant.metadata || {}) as any), recovery_rules: rules };
    await supabase.from("restaurants").update({ metadata }).eq("id", restaurant.id);
    setRestaurant({ ...restaurant, metadata });
    toast.success("Régua de recuperação salva");
  }

  async function createCampaign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const scheduledRaw = form.get("scheduled_at") as string;
    const scheduledAt = scheduledRaw ? new Date(scheduledRaw).toISOString() : null;
    await supabase.from("campaigns").insert({
      name: form.get("name"),
      type: "broadcast",
      template: form.get("template"),
      segment_filter: { segment: form.get("segment") || null },
      scheduled_at: scheduledAt,
      status: scheduledAt ? "scheduled" : "draft",
    });
    toast.success(scheduledAt ? "Campanha agendada" : "Campanha criada");
    setShowForm(false);
    load();
  }

  async function sendCampaign(id: string) {
    if (!confirm("Enviar esta campanha agora?")) return;
    // In production: add job to BullMQ campaign queue
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/campaigns/${id}/send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    toast.success("Campanha agendada para envio");
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-cafe">Campanhas</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-paprica text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Nova campanha</button>
      </div>

      <div className="space-y-3">
        {campaigns.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{c.name}</p>
                <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[c.status]}`}>{STATUS_LABEL[c.status] || c.status}</span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                {c.sent_count > 0 && `${c.sent_count} enviados · ${c.delivered_count} entregues · ${c.read_count} lidos · ${c.converted_count} convertidos`}
                {c.sent_count === 0 && c.status === "scheduled" && c.scheduled_at && `Agendada para ${new Date(c.scheduled_at).toLocaleString("pt-BR")}`}
                {c.sent_count === 0 && c.status !== "scheduled" && `Segmento: ${c.segment_filter?.segment || "todos"}`}
              </p>
            </div>
            <div className="flex gap-2">
              {c.status === "draft" && (
                <button onClick={() => sendCampaign(c.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
        {campaigns.length === 0 && <div className="text-center py-12 text-gray-400">Nenhuma campanha criada</div>}
      </div>

      {/* Régua de recuperação (automática) */}
      <div className="bg-white rounded-xl border p-6 mt-8 max-w-3xl">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-5 h-5 text-paprica" />
          <h2 className="font-semibold">Régua de recuperação (automática)</h2>
        </div>
        <p className="text-sm text-muted mb-4">Mensagens enviadas pela Lotta sem intervenção manual.</p>

        {/* Carrinho abandonado */}
        <div className="border rounded-lg p-4 mb-3">
          <label className="flex items-center justify-between gap-2 mb-2">
            <span className="text-sm font-medium">Carrinho abandonado (após 30 min)</span>
            <input type="checkbox" checked={rules.abandoned_cart.enabled} onChange={(e) => setRules({ ...rules, abandoned_cart: { ...rules.abandoned_cart, enabled: e.target.checked } })} className="h-4 w-4 accent-paprica" />
          </label>
          <textarea
            value={rules.abandoned_cart.message}
            onChange={(e) => setRules({ ...rules, abandoned_cart: { ...rules.abandoned_cart, message: e.target.value } })}
            rows={2} className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">Variáveis: {"{itens}"}</p>
        </div>

        {/* Inativos */}
        <div className="border rounded-lg p-4">
          <label className="flex items-center justify-between gap-2 mb-2">
            <span className="text-sm font-medium">Cliente inativo (win-back)</span>
            <input type="checkbox" checked={rules.inactive.enabled} onChange={(e) => setRules({ ...rules, inactive: { ...rules.inactive, enabled: e.target.checked } })} className="h-4 w-4 accent-paprica" />
          </label>
          <textarea
            value={rules.inactive.message}
            onChange={(e) => setRules({ ...rules, inactive: { ...rules.inactive, message: e.target.value } })}
            rows={2} className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <p className="text-xs text-gray-400 mt-1 mb-3">Variáveis: {"{nome}"}, {"{restaurante}"}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Intervalo mínimo entre envios (dias)</label>
              <input type="number" min={1} value={rules.inactive.cooldown_days}
                onChange={(e) => setRules({ ...rules, inactive: { ...rules.inactive, cooldown_days: parseInt(e.target.value) || 7 } })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Cupom de retorno (opcional)</label>
              <input value={rules.inactive.coupon_code || ""} placeholder="Ex: VOLTA10"
                onChange={(e) => setRules({ ...rules, inactive: { ...rules.inactive, coupon_code: e.target.value.toUpperCase() } })}
                className="w-full border rounded-lg px-3 py-2 text-sm uppercase" />
            </div>
          </div>
        </div>

        <button onClick={saveRules} className="mt-4 px-6 py-2.5 bg-paprica text-white rounded-lg text-sm font-medium hover:bg-paprica-dark">Salvar régua</button>
      </div>

      {showForm && (
        <Modal title="Nova campanha" onClose={() => setShowForm(false)}>
          <form onSubmit={createCampaign} className="space-y-4">
            <h2 className="text-lg font-semibold">Nova campanha</h2>
            <input name="name" placeholder="Nome da campanha" required className="w-full border rounded-lg px-3 py-2 text-sm" />
            <select name="segment" className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Todos os clientes</option>
              <option value="novato">Novatos</option>
              <option value="candidato">Candidatos</option>
              <option value="promissor">Promissores</option>
              <option value="fidelizado">Fidelizados</option>
              <option value="inativo">Inativos</option>
            </select>
            <textarea name="template" rows={4} placeholder="Mensagem (use {nome} para personalizar)" required className="w-full border rounded-lg px-3 py-2 text-sm" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Agendar envio (opcional)</label>
              <input name="scheduled_at" type="datetime-local" min={minSchedule} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <p className="text-xs text-gray-400 mt-1">Em branco = fica como rascunho para enviar manualmente.</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-paprica text-white rounded-lg text-sm">Criar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
