"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { toast } from "sonner";
import { Gift, Star, Coins } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function FidelidadePage() {
  const [program, setProgram] = useState<any>(null);
  const [type, setType] = useState<"points" | "cashback">("points");
  const [pointsPerReal, setPointsPerReal] = useState(1);
  const [cashbackPct, setCashbackPct] = useState(5);
  const [expireDays, setExpireDays] = useState(180);
  const [isActive, setIsActive] = useState(false);
  const [topBalances, setTopBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

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
      }
      setTopBalances(bals.data ?? []);
      setLoading(false);
    });
  }, []);

  async function save() {
    const payload = {
      type, points_per_real: pointsPerReal, cashback_pct: cashbackPct,
      points_expire_days: expireDays, is_active: isActive,
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
      <h1 className="text-2xl font-semibold mb-6">Fidelidade</h1>

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
                    <p className="text-sm font-medium">{(b as any).customers?.name || "—"}</p>
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
