"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { toast } from "sonner";
import { Plus, Send, Pause, BarChart3 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600", scheduled: "bg-blue-50 text-blue-600",
  sending: "bg-yellow-50 text-yellow-600", sent: "bg-green-50 text-green-600",
  cancelled: "bg-paprica/10 text-paprica",
};

export default function CampanhasPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const supabase = createClient();

  useEffect(() => { load(); }, []);
  async function load() {
    const { data } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false });
    setCampaigns(data ?? []);
  }

  async function createCampaign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await supabase.from("campaigns").insert({
      name: form.get("name"),
      type: "broadcast",
      template: form.get("template"),
      segment_filter: { segment: form.get("segment") || null },
    });
    toast.success("Campanha criada");
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
        <h1 className="text-2xl font-semibold">Campanhas</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-paprica text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Nova campanha</button>
      </div>

      <div className="space-y-3">
        {campaigns.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{c.name}</p>
                <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[c.status]}`}>{c.status}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {c.sent_count > 0 && `${c.sent_count} enviados · ${c.delivered_count} entregues · ${c.read_count} lidos · ${c.converted_count} convertidos`}
                {c.sent_count === 0 && `Segmento: ${c.segment_filter?.segment || "todos"}`}
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

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={createCampaign} className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
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
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-paprica text-white rounded-lg text-sm">Criar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
