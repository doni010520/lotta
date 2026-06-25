import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function expireLoyaltyPoints() {
  console.log("Running loyalty expiration...");

  // Find expired credits that haven't been expired yet
  const { data: expired } = await supabase
    .from("loyalty_transactions")
    .select("id, restaurant_id, customer_id, amount")
    .eq("type", "credit")
    .lt("expires_at", new Date().toISOString())
    .is("reference_type", "order") // only expire order credits, not already-expired
    .limit(500);

  let count = 0;

  for (const tx of expired ?? []) {
    // Check if already expired (look for matching expiration tx)
    const { data: existing } = await supabase
      .from("loyalty_transactions")
      .select("id")
      .eq("reference_id", tx.id)
      .eq("type", "expiration")
      .limit(1);

    if (existing?.length) continue;

    // Get current balance
    const { data: bal } = await supabase
      .from("loyalty_balances")
      .select("balance")
      .eq("restaurant_id", tx.restaurant_id)
      .eq("customer_id", tx.customer_id)
      .single();

    if (!bal || bal.balance <= 0) continue;

    const expireAmount = Math.min(tx.amount, bal.balance);

    // Debit
    await supabase
      .from("loyalty_balances")
      .update({ balance: bal.balance - expireAmount, updated_at: new Date().toISOString() })
      .eq("restaurant_id", tx.restaurant_id)
      .eq("customer_id", tx.customer_id);

    // Log
    await supabase.from("loyalty_transactions").insert({
      restaurant_id: tx.restaurant_id,
      customer_id: tx.customer_id,
      type: "expiration",
      amount: -expireAmount,
      balance_after: bal.balance - expireAmount,
      reason: "Pontos expirados",
      reference_type: "expiration",
      reference_id: tx.id,
    });

    count++;
  }

  console.log(`Loyalty expiration: ${count} transactions expired`);
  return { expired: count };
}
