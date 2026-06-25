import { createClient } from "@supabase/supabase-js";
import { wa } from "@lotta/shared";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function notifyLoyaltyCredit(restaurantId: string, customerId: string, credit: number, type: "points" | "cashback") {
  const { data: customer } = await supabase.from("customers").select("phone, name").eq("id", customerId).single();
  if (!customer?.phone) return;

  const { data: balance } = await supabase.from("loyalty_balances").select("balance")
    .eq("restaurant_id", restaurantId).eq("customer_id", customerId).single();

  const unit = type === "points" ? "pontos" : "R$";
  const creditStr = type === "points" ? `${credit} pontos` : `R$ ${credit.toFixed(2)}`;
  const balanceStr = type === "points" ? `${balance?.balance ?? 0} pontos` : `R$ ${(balance?.balance ?? 0).toFixed(2)}`;

  await wa.sendText(restaurantId, customer.phone,
    `🎉 Você ganhou ${creditStr}! Seu saldo agora é ${balanceStr}. Continue pedindo!`);
}
