"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { toast } from "sonner";

export default function IntegracoesPage() {
  const [restaurant, setRestaurant] = useState<any>(null);
  const [ifoodCreds, setIfoodCreds] = useState({ client_id: "", client_secret: "", merchant_id: "" });
  const [food99Creds, setFood99Creds] = useState({ app_id: "", app_secret: "", access_token: "", shop_id: "" });
  const [autoAccept, setAutoAccept] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.from("restaurants").select("id, metadata").limit(1).single().then(({ data }) => {
      if (data) {
        setRestaurant(data);
        const m = (data.metadata || {}) as any;
        if (m.ifood_credentials) setIfoodCreds(m.ifood_credentials);
        if (m.food99_credentials) setFood99Creds(m.food99_credentials);
        setAutoAccept(m.ifood_auto_accept ?? false);
      }
    });
  }, []);

  async function saveIFood() {
    const metadata = { ...((restaurant?.metadata || {}) as any), ifood_credentials: ifoodCreds, ifood_auto_accept: autoAccept };
    await supabase.from("restaurants").update({ metadata }).eq("id", restaurant.id);
    toast.success("iFood configurado");
  }

  async function save99Food() {
    const metadata = { ...((restaurant?.metadata || {}) as any), food99_credentials: food99Creds };
    await supabase.from("restaurants").update({ metadata }).eq("id", restaurant.id);
    toast.success("99Food configurado");
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Integrações</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
        {/* iFood */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-paprica/10 rounded-lg flex items-center justify-center text-xl">🍔</div>
            <div><p className="font-semibold">iFood</p><p className="text-xs text-gray-400">Marketplace de delivery</p></div>
          </div>
          <div className="space-y-3">
            <input value={ifoodCreds.client_id} onChange={(e) => setIfoodCreds({ ...ifoodCreds, client_id: e.target.value })} placeholder="Client ID" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input type="password" value={ifoodCreds.client_secret} onChange={(e) => setIfoodCreds({ ...ifoodCreds, client_secret: e.target.value })} placeholder="Client Secret" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input value={ifoodCreds.merchant_id} onChange={(e) => setIfoodCreds({ ...ifoodCreds, merchant_id: e.target.value })} placeholder="Merchant ID" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={autoAccept} onChange={(e) => setAutoAccept(e.target.checked)} className="rounded" /> Aceitar pedidos automaticamente</label>
            <button onClick={saveIFood} className="px-4 py-2 bg-paprica text-white rounded-lg text-sm">Salvar</button>
          </div>
        </div>

        {/* 99Food */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center text-xl">🟡</div>
            <div><p className="font-semibold">99 Food</p><p className="text-xs text-gray-400">Marketplace de delivery</p></div>
          </div>
          <div className="space-y-3">
            <input value={food99Creds.app_id} onChange={(e) => setFood99Creds({ ...food99Creds, app_id: e.target.value })} placeholder="App ID" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input type="password" value={food99Creds.app_secret} onChange={(e) => setFood99Creds({ ...food99Creds, app_secret: e.target.value })} placeholder="App Secret" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input type="password" value={food99Creds.access_token} onChange={(e) => setFood99Creds({ ...food99Creds, access_token: e.target.value })} placeholder="Access Token" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input value={food99Creds.shop_id} onChange={(e) => setFood99Creds({ ...food99Creds, shop_id: e.target.value })} placeholder="Shop ID" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <button onClick={save99Food} className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm">Salvar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
