"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { toast } from "sonner";
import { DAY_NAMES } from "@/lib/utils";
import type { Restaurant, DeliveryZone, OperatingHour } from "@lotta/shared";

export default function ConfiguracoesPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [hours, setHours] = useState<OperatingHour[]>([]);
  const [tab, setTab] = useState<"geral" | "entrega" | "horarios">("geral");
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [r, z, h] = await Promise.all([
      supabase.from("restaurants").select("*").limit(1).single(),
      supabase.from("delivery_zones").select("*").order("sort_order"),
      supabase.from("operating_hours").select("*").order("day_of_week").order("open_time"),
    ]);
    setRestaurant(r.data);
    setZones(z.data ?? []);
    setHours(h.data ?? []);
    setLoading(false);
  }

  async function saveRestaurant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!restaurant) return;
    const form = new FormData(e.currentTarget);

    const { error } = await supabase.from("restaurants").update({
      name: form.get("name"),
      phone: form.get("phone"),
      email: form.get("email"),
      document: form.get("document"),
      min_order: parseFloat(form.get("min_order") as string) || 0,
      avg_prep_time: parseInt(form.get("avg_prep_time") as string) || 30,
    }).eq("id", restaurant.id);

    if (error) toast.error(error.message);
    else toast.success("Configurações salvas");
    loadAll();
  }

  async function addZone(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await supabase.from("delivery_zones").insert({
      name: form.get("name"),
      type: "radius",
      radius_km: parseFloat(form.get("radius_km") as string),
      fee: parseFloat(form.get("fee") as string),
      estimated_min: parseInt(form.get("estimated_min") as string) || 30,
    });
    toast.success("Zona adicionada");
    e.currentTarget.reset();
    loadAll();
  }

  async function deleteZone(id: string) {
    await supabase.from("delivery_zones").delete().eq("id", id);
    toast.success("Zona removida");
    loadAll();
  }

  async function addHour(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await supabase.from("operating_hours").insert({
      day_of_week: parseInt(form.get("day_of_week") as string),
      open_time: form.get("open_time"),
      close_time: form.get("close_time"),
    });
    toast.success("Horário adicionado");
    e.currentTarget.reset();
    loadAll();
  }

  async function deleteHour(id: string) {
    await supabase.from("operating_hours").delete().eq("id", id);
    loadAll();
  }

  if (loading) return <div className="py-12 text-center text-gray-400">Carregando...</div>;

  const tabs = [
    { key: "geral" as const, label: "Dados gerais" },
    { key: "entrega" as const, label: "Zonas de entrega" },
    { key: "horarios" as const, label: "Horários" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Configurações</h1>

      <div className="flex gap-1 mb-6 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${tab === t.key ? "border-paprica text-paprica" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "geral" && restaurant && (
        <form onSubmit={saveRestaurant} className="bg-white rounded-xl border p-6 space-y-4 max-w-xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do restaurante</label>
            <input name="name" defaultValue={restaurant.name} required className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input name="phone" defaultValue={restaurant.phone ?? ""} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input name="email" type="email" defaultValue={restaurant.email ?? ""} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
            <input name="document" defaultValue={restaurant.document ?? ""} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pedido mínimo (R$)</label>
              <input name="min_order" type="number" step="0.01" defaultValue={restaurant.min_order} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tempo médio preparo (min)</label>
              <input name="avg_prep_time" type="number" defaultValue={restaurant.avg_prep_time} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <button type="submit" className="px-6 py-2.5 bg-paprica text-white rounded-lg text-sm font-medium hover:bg-paprica-dark">
            Salvar
          </button>
        </form>
      )}

      {tab === "entrega" && (
        <div className="space-y-4 max-w-xl">
          {zones.map((z) => (
            <div key={z.id} className="bg-white rounded-xl border p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{z.name}</p>
                <p className="text-xs text-gray-500">
                  {z.radius_km}km · R$ {z.fee.toFixed(2)} · ~{z.estimated_min}min
                </p>
              </div>
              <button onClick={() => deleteZone(z.id)} className="text-paprica/60 hover:text-paprica p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          ))}
          <form onSubmit={addZone} className="bg-white rounded-xl border p-4 grid grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nome</label>
              <input name="name" placeholder="Até 3km" required className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Raio (km)</label>
              <input name="radius_km" type="number" step="0.1" required className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Taxa (R$)</label>
              <input name="fee" type="number" step="0.01" required className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tempo (min)</label>
              <div className="flex gap-2">
                <input name="estimated_min" type="number" defaultValue={30} className="w-full border rounded-lg px-3 py-2 text-sm" />
                <button type="submit" className="px-4 py-2 bg-paprica text-white rounded-lg text-sm whitespace-nowrap">+</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {tab === "horarios" && (
        <div className="space-y-4 max-w-xl">
          {DAY_NAMES.map((dayName, dayIdx) => {
            const dayHours = hours.filter((h) => h.day_of_week === dayIdx);
            return (
              <div key={dayIdx} className="bg-white rounded-xl border p-4">
                <p className="font-medium text-sm mb-2">{dayName}</p>
                {dayHours.length === 0 ? (
                  <p className="text-xs text-gray-400">Fechado</p>
                ) : (
                  <div className="space-y-1">
                    {dayHours.map((h) => (
                      <div key={h.id} className="flex items-center gap-2 text-sm text-gray-600">
                        <span>{h.open_time} - {h.close_time}</span>
                        <button onClick={() => deleteHour(h.id)} className="text-paprica/60 hover:text-paprica text-xs">remover</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <form onSubmit={addHour} className="bg-white rounded-xl border p-4 flex gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Dia</label>
              <select name="day_of_week" className="border rounded-lg px-3 py-2 text-sm">
                {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Abre</label>
              <input name="open_time" type="time" required className="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fecha</label>
              <input name="close_time" type="time" required className="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <button type="submit" className="px-4 py-2 bg-paprica text-white rounded-lg text-sm">Adicionar</button>
          </form>
        </div>
      )}
    </div>
  );
}
