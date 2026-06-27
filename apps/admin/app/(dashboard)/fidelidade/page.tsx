"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { toast } from "sonner";
import { Gift, Coins, Trash2, Plus, Award } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function FidelidadePage() {
  const [program, setProgram] = useState<any>(null);
  const [type, setType] = useState<"points" | "cashback">("points");
  const [pointsPerReal, setPointsPerReal] = useState(1);
  const [cashbackPct, setCashbackPct] = useState(5);
  const [expireDays, setExpireDays] = useState(180);
  const [isActive, setIsActive] = useState(false);
  const [topBalances, setTopBalances] = useState<any[]>([]);
  const [tiers, setTiers] = useState<{ name: string; min: number; perk: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  function tierFor(lifetime: number): string {
    const sorted = [...tiers].sort((a, b) => b.min - a.min);
    return sorted.find((t) => lifetime >= t.min)?.name || "";
  }

  function updateTier(i: number, patch: Partial<{ name: string; min: number; perk: string }>) {
    setTiers(tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  }

  useEffect(() => {
    Promise.all([
      supabase.from("loyalty_programs").select("*").limit(1).single(),
      supabase.from("loyalty_balances").select("*, customers(name, phone)").order("balance", { ascending: false }).limit(10),
    ]).then(([prog, bals]) => {
      if (prog.data) {
        setProgram(prog.data);
        setType(prog.data.type);
        setPointsPerReal(prog.data.points_per_real);
        setCashbackPct(prog.data.cashback_pct);
        setExpireDays(prog.data.points_expire_days ?? 180);
        setIsActive(prog.data.is_active);
        setTiers(Array.isArray(prog.data.tiers) ? prog.data.tiers : []);
      }
      setTopBalances(bals.data ?? []);
      setLoading(false);
    });
  }, []);

  async function save() {
    const payload = {
      type, points_per_real: pointsPerReal, cashback_pct: cashbackPct,
      points_expire_days: expireDays, is_active: isActive,
      tiers: tiers.filter((t) => t.name && t.min >= 0),
    };
    if (program) {
      await supabase.from("loyalty_programs").update(payload).eq("id", program.id);
    } else {
      const { data } = await supabase.from("loyalty_programs").insert(payload).select().single();
      setProgram(data);
    }
    toast.success("Programa de fidelidade salvo");
  }

  if (loading) return <div className="py-12 text-center text-gray-400">Carregando...</div>;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-cafe mb-6">Fidelidade</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Config */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Gift className="w-6 h-6 text-purple-500" />
            <p className="font-semibold">Configuração do programa</p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
            Programa ativo
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="points">Pontos</option>
              <option value="cashback">Cashback</option>
            </select>
          </div>

          {type === "points" ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pontos por R$ 1,00 gasto</label>
              <input type="number" value={pointsPerReal} onChange={(e) => setPointsPerReal(parseFloat(e.target.value))} min={0.1} step={0.1} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <p className="text-xs text-gray-400 mt-1">Ex: 1 = cliente gasta R$100, ganha 100 pontos</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Percentual de cashback</label>
              <input type="number" value={cashbackPct} onChange={(e) => setCashbackPct(parseFloat(e.target.value))} min={1} max={20} step={0.5} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <p className="text-xs text-gray-400 mt-1">Ex: 5% = cliente gasta R$100, ganha R$5 de cashback</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiração (dias)</label>
            <input type="number" value={expireDays} onChange={(e) => setExpireDays(parseInt(e.target.value))} min={0} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <p className="text-xs text-gray-400 mt-1">0 = nunca expira</p>
          </div>

          {/* Níveis (tiers) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700"><Award className="w-4 h-4 text-amber-500" /> Níveis (benefícios exclusivos)</label>
              <button type="button" onClick={() => setTiers([...tiers, { name: "", min: 0, perk: "" }])} className="inline-flex items-center gap-1 text-xs text-paprica font-medium">
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {tiers.map((t, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input value={t.name} onChange={(e) => updateTier(i, { name: e.target.value })} placeholder="Nome (ex: Ouro)" className="flex-1 min-w-0 border rounded-lg px-2 py-1.5 text-sm" />
                  <input type="number" value={t.min} onChange={(e) => updateTier(i, { min: parseFloat(e.target.value) || 0 })} placeholder="A partir de" className="w-24 border rounded-lg px-2 py-1.5 text-sm" />
                  <input value={t.perk} onChange={(e) => updateTier(i, { perk: e.target.value })} placeholder="Benefício" className="flex-1 min-w-0 border rounded-lg px-2 py-1.5 text-sm" />
                  <button type="button" onClick={() => setTiers(tiers.filter((_, j) => j !== i))} className="p-1 text-paprica/60 hover:text-paprica shrink-0"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              {tiers.length === 0 && <p className="text-xs text-gray-400">Sem níveis. Adicione para premiar quem mais acumula.</p>}
            </div>
            <p className="text-xs text-gray-400 mt-1">&quot;A partir de&quot; usa o total acumulado ({type === "points" ? "pontos" : "R$"}) ao longo da vida do cliente.</p>
          </div>

          <button onClick={save} className="px-6 py-2.5 bg-paprica text-white rounded-lg text-sm font-medium hover:bg-paprica-dark">Salvar</button>
        </div>

        {/* Top balances */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-3 mb-4">
            <Coins className="w-6 h-6 text-amber-500" />
            <p className="font-semibold">Maiores saldos</p>
          </div>
          {topBalances.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum saldo registrado ainda</p>
          ) : (
            <div className="space-y-2">
              {topBalances.map((b, i) => (
                <div key={b.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      {(b as any).customers?.name || "—"}
                      {tierFor(Number((b as any).lifetime_earned ?? 0)) && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{tierFor(Number((b as any).lifetime_earned ?? 0))}</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">{(b as any).customers?.phone}</p>
                  </div>
                  <span className="font-semibold text-sm">
                    {type === "points" ? `${b.balance} pts` : formatCurrency(b.balance)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
