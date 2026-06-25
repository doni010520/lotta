import { createClient } from "@supabase/supabase-js";
import { wa } from "@lotta/shared";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function startRecoveryCron() {
  console.log("Running recovery checks...");
  let actions = 0;

  // 1. Abandoned carts (no checkout after 30 min)
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: carts } = await supabase.from("abandoned_carts").select("*").eq("notified", false).lt("created_at", thirtyMinAgo);

  for (const cart of carts ?? []) {
    if (!cart.customer_phone) continue;
    try {
      const items = (cart.items as any[] || []).map((i: any) => `${i.quantity}x ${i.name}`).join(", ");
      await wa.sendText(cart.restaurant_id, cart.customer_phone,
        `Ei! Você deixou itens no carrinho: ${items}. Quer finalizar o pedido? 😊`);
      await supabase.from("abandoned_carts").update({ notified: true }).eq("id", cart.id);
      actions++;
    } catch (err) { console.error("Cart recovery error:", err); }
  }

  // 2. Inactive customers
  const { data: restaurants } = await supabase.from("restaurants").select("id, name");

  for (const rest of restaurants ?? []) {
    const { data: inactive } = await supabase.from("customers").select("id, phone, name, last_order_at")
      .eq("restaurant_id", rest.id).eq("consent_marketing", true).eq("segment", "inativo").limit(50);

    for (const cust of inactive ?? []) {
      if (!cust.phone) continue;

      const { data: recentLog } = await supabase.from("automation_logs").select("id")
        .eq("customer_id", cust.id).eq("action", "recovery_sent")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()).limit(1);
      if (recentLog?.length) continue;

      try {
        const firstName = cust.name?.split(" ")[0] || "";
        await wa.sendText(rest.id, cust.phone,
          `${firstName}, sentimos sua falta no ${rest.name}! 🍽️ Que tal pedir algo gostoso hoje?`);

        await supabase.from("automation_logs").insert({
          restaurant_id: rest.id, customer_id: cust.id, action: "recovery_sent",
          metadata: { type: "inactive_recovery" },
        });
        actions++;
      } catch (err) { console.error("Recovery error:", err); }
    }
  }

  console.log(`Recovery: ${actions} actions`);
  return { actions };
}
