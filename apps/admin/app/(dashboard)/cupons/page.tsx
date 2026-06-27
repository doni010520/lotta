"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Ticket, Trash2, Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function CuponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [suggestion, setSuggestion] = useState<any>(null);
  const [suggesting, setSuggesting] = useState(false);
  const supabase = createClient();

  async function suggestWithAI() {
    setSuggesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await api<{ suggestion: any }>("/api/coupons/suggest", { method: "POST", token: session?.access_token });
      setSuggestion(res.suggestion);
      setBulkMode(false);
      setShowForm(true);
      toast.success("Sugestão da IA pronta — revise e crie");
    } catch (err: any) {
      toast.error(err.message || "Falha ao sugerir cupom");
    } finally {
      setSuggesting(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
    setCoupons(data ?? []);
  }

  async function createCoupon(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const code = (form.get("code") as string).toUpperCase().trim();
    const type = form.get("type") as string;
    const value = parseFloat(form.get("value") as string);
    const minOrder = parseFloat(form.get("min_order") as string) || 0;
    const maxUses = form.get("max_uses") ? parseInt(form.get("max_uses") as string) : null;
    const validUntil = form.get("valid_until") as string || null;

    if (bulkMode) {
      const qty = parseInt(form.get("bulk_qty") as string) || 10;
      const prefix = code || "PROMO";
      const rows = Array.from({ length: qty }, (_, i) => ({
        code: `${prefix}${String(i + 1).padStart(3, "0")}`,
        type, value, min_order: minOrder, max_uses: 1,
        valid_until: validUntil || null,
      }));
      await supabase.from("coupons").insert(rows);
      toast.success(`${qty} cupons criados com prefixo ${prefix}`);
    } else {
      await supabase.from("coupons").insert({ code, type, value, min_order: minOrder, max_uses: maxUses, valid_until: validUntil });
      toast.success("Cupom criado");
    }

    setShowForm(false);
    load();
  }

  async function toggleCoupon(id: string, active: boolean) {
    await supabase.from("coupons").update({ is_active: !active }).eq("id", id);
    load();
  }

  async function deleteCoupon(id: string) {
    if (!confirm("Excluir este cupom?")) return;
    await supabase.from("coupons").delete().eq("id", id);
    load();
  }

  const typeLabels: Record<string, string> = { percent: "%", fixed: "R$", free_delivery: "Frete grátis" };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Cupons</h1>
        <div className="flex items-center gap-2">
          <button onClick={suggestWithAI} disabled={suggesting} className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
            <Sparkles className="w-4 h-4 text-paprica" /> {suggesting ? "Sugerindo..." : "Sugerir com IA"}
          </button>
          <button onClick={() => { setSuggestion(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-paprica text-white rounded-lg text-sm">
            <Plus className="w-4 h-4" /> Novo cupom
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {coupons.map((c) => (
          <div key={c.id} className={`bg-white rounded-xl border p-4 flex items-center justify-between ${!c.is_active ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-3">
              <Ticket className="w-5 h-5 text-purple-500" />
              <div>
                <p className="font-mono font-bold text-sm">{c.code}</p>
                <p className="text-xs text-gray-500">
                  {c.type === "percent" && `${c.value}% de desconto`}
                  {c.type === "fixed" && `${formatCurrency(c.value)} de desconto`}
                  {c.type === "free_delivery" && "Frete grátis"}
                  {c.min_order > 0 && ` · Mín. ${formatCurrency(c.min_order)}`}
                  {c.max_uses && ` · ${c.used_count}/${c.max_uses} usos`}
                  {c.valid_until && ` · até ${new Date(c.valid_until).toLocaleDateString("pt-BR")}`}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => toggleCoupon(c.id, c.is_active)} className={`px-2 py-1 text-xs rounded ${c.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {c.is_active ? "Ativo" : "Inativo"}
              </button>
              <button onClick={() => deleteCoupon(c.id)} className="p-1 text-paprica/60 hover:text-paprica"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {coupons.length === 0 && <div className="text-center py-12 text-gray-400">Nenhum cupom criado</div>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form key={suggestion?.code || "manual"} onSubmit={createCoupon} className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold">{bulkMode ? "Criar cupons em lote" : suggestion ? "Cupom sugerido pela IA" : "Novo cupom"}</h2>
            {suggestion?.reason && <p className="text-xs text-gray-600 bg-gema/10 border border-gema/30 rounded-lg p-2">{suggestion.reason}</p>}

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={bulkMode} onChange={(e) => setBulkMode(e.target.checked)} className="rounded" />
              Criar em lote
            </label>

            <input name="code" defaultValue={suggestion?.code || ""} placeholder={bulkMode ? "Prefixo (ex: PROMO)" : "Código (ex: BEMVINDO10)"} required className="w-full border rounded-lg px-3 py-2 text-sm uppercase" />

            {bulkMode && (
              <input name="bulk_qty" type="number" defaultValue={10} min={1} max={500} placeholder="Quantidade" className="w-full border rounded-lg px-3 py-2 text-sm" />
            )}

            <select name="type" defaultValue={suggestion?.type || "percent"} required className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="percent">Desconto percentual (%)</option>
              <option value="fixed">Desconto fixo (R$)</option>
              <option value="free_delivery">Frete grátis</option>
            </select>

            <input name="value" type="number" step="0.01" min="0" defaultValue={suggestion?.value ?? ""} placeholder="Valor (10 = 10% ou R$10)" required className="w-full border rounded-lg px-3 py-2 text-sm" />

            <div className="grid grid-cols-2 gap-3">
              <input name="min_order" type="number" step="0.01" min="0" defaultValue={suggestion?.min_order ?? ""} placeholder="Pedido mínimo (R$)" className="border rounded-lg px-3 py-2 text-sm" />
              {!bulkMode && <input name="max_uses" type="number" min="1" placeholder="Máx. usos (vazio=ilimitado)" className="border rounded-lg px-3 py-2 text-sm" />}
            </div>

            <input name="valid_until" type="date" className="w-full border rounded-lg px-3 py-2 text-sm" />

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
