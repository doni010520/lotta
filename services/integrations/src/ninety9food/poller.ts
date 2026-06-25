import { createClient } from "@supabase/supabase-js";
import { ninety9food, import99FoodOrder } from "./client";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const POLL_INTERVAL = 60_000; // 60s

export async function start99FoodPolling() {
  console.log("99Food polling started");

  async function poll() {
    try {
      const { data: restaurants } = await supabase
        .from("restaurants")
        .select("id, metadata")
        .not("metadata->food99_credentials", "is", null);

      for (const rest of restaurants ?? []) {
        const creds = (rest.metadata as any)?.food99_credentials;
        if (!creds?.access_token || !creds?.shop_id) continue;

        try {
          const orders = await ninety9food.getOrders(creds) ?? [];
          for (const order of Array.isArray(orders) ? orders : []) {
            // Check if already imported
            const { data: existing } = await supabase
              .from("orders")
              .select("id")
              .eq("external_id", order.id)
              .eq("restaurant_id", rest.id)
              .limit(1);

            if (existing?.length) continue;

            const result = await import99FoodOrder(rest.id, order);
            if (result.success) console.log(`99Food order imported: #${result.orderNumber}`);
          }
        } catch (err) {
          console.error(`99Food poll error for ${rest.id}:`, err);
        }
      }
    } catch (err) {
      console.error("99Food polling error:", err);
    }
  }

  setInterval(poll, POLL_INTERVAL);
  poll();
}
