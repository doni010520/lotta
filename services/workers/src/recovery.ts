import { createClient } from "@supabase/supabase-js";
import { wa } from "@lotta/shared";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Régua padrão (usada quando o restaurante não configurou em metadata.recovery_rules)
const DEFAULTS = {
  abandoned_cart: {
    enabled: true,
    message: "Ei! Você deixou itens no carrinho: {itens}. Quer finalizar o pedido? 😊",
  },
  inactive: {
    enabled: true,
    cooldown_days: 7,
    message: "{nome}, sentimos sua falta no {restaurante}! 🍽️ Que tal pedir algo gostoso hoje?",
    coupon_code: "",
  },
};

function applyTemplate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/{(\w+)}/g, (_, k) => vars[k] ?? "");
}

export async function startRecoveryCron() {
  console.log("Running recovery checks...");
  let actions = 0;

  // Mapa de restaurantes (id → { name, rules })
  const { data: restaurants } = await supabase.from("restaurants").select("id, name, metadata");
  const restMap = new Map<string, { name: string; rules: any }>();
  for (const r of restaurants ?? []) {
    const rules = (r.metadata as any)?.recovery_rules || {};
    restMap.set(r.id, { name: r.name, rules });
  }

  // 1. Carrinhos abandonados (sem checkout após 30 min)
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: carts } = await supabase.from("abandoned_carts").select("*").eq("notified", false).lt("created_at", thirtyMinAgo);

  for (const cart of carts ?? []) {
    if (!cart.customer_phone) continue;
    const conf = { ...DEFAULTS.abandoned_cart, ...(restMap.get(cart.restaurant_id)?.rules?.abandoned_cart || {}) };
    if (conf.enabled === false) continue;
    try {
      const items = (cart.items as any[] || []).map((i: any) => `${i.quantity}x ${i.name}`).join(", ");
      await wa.sendText(cart.restaurant_id, cart.customer_phone,
        applyTemplate(conf.message, { itens: items }));
      await supabase.from("abandoned_carts").update({ notified: true }).eq("id", cart.id);
      actions++;
    } catch (err) { console.error("Cart recovery error:", err); }
  }

  // 2. Clientes inativos (win-back) — régua configurável + oferta automática (cupom)
  for (const [restId, rest] of restMap) {
    const conf = { ...DEFAULTS.inactive, ...(rest.rules?.inactive || {}) };
    if (conf.enabled === false) continue;
    const cooldownDays = Number(conf.cooldown_days ?? 7);

    const { data: inactive } = await supabase.from("customers").select("id, phone, name, last_order_at")
      .eq("restaurant_id", restId).eq("consent_marketing", true).eq("segment", "inativo")
      .is("opted_out_at", null).limit(50);

    for (const cust of inactive ?? []) {
      if (!cust.phone) continue;

      const { data: recentLog } = await supabase.from("automation_logs").select("id")
        .eq("customer_id", cust.id).eq("action", "recovery_sent")
        .gte("created_at", new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000).toISOString()).limit(1);
      if (recentLog?.length) continue;

      try {
        const firstName = cust.name?.split(" ")[0] || "";
        let msg = applyTemplate(conf.message, { nome: firstName, restaurante: rest.name });
        // Oferta automática: anexa o cupom configurado na régua
        if (conf.coupon_code) msg += `\n\nUse o cupom *${conf.coupon_code}* no seu próximo pedido. 🎁`;

        await wa.sendText(restId, cust.phone, msg);

        await supabase.from("automation_logs").insert({
          restaurant_id: restId, customer_id: cust.id, action: "recovery_sent",
          metadata: { type: "inactive_recovery", coupon: conf.coupon_code || null },
        });
        actions++;
      } catch (err) { console.error("Recovery error:", err); }
    }
  }

  console.log(`Recovery: ${actions} actions`);
  return { actions };
}
