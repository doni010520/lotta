import { createClient } from "@supabase/supabase-js";
import { ifood, importIFoodOrder } from "./client";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const POLL_INTERVAL = 30_000; // 30 seconds (iFood requirement)

export async function startIFoodPolling() {
  console.log("iFood polling started");

  async function poll() {
    try {
      // Get all active iFood integrations
      const { data: integrations } = await supabase
        .from("whatsapp_instances") // reusing table pattern — should be a dedicated integrations table
        .rpc("get_ifood_integrations"); // we'll use restaurant metadata instead

      // Actually, get from restaurants with ifood credentials in metadata
      const { data: restaurants } = await supabase
        .from("restaurants")
        .select("id, metadata")
        .not("metadata->ifood_credentials", "is", null);

      for (const rest of restaurants ?? []) {
        const creds = (rest.metadata as any)?.ifood_credentials;
        if (!creds?.client_id) continue;

        try {
          const events = await ifood.pollEvents(creds) ?? [];
          const orderEvents = (Array.isArray(events) ? events : []).filter(
            (e: any) => e.code === "PLC" || e.code === "CFM" || e.code === "CAN"
          );

          for (const event of orderEvents) {
            if (event.code === "PLC") {
              // New order placed
              const orderDetails = await ifood.getOrder(creds, event.orderId);
              if (orderDetails) {
                const result = await importIFoodOrder(rest.id, orderDetails);
                console.log(`iFood order imported: #${result.orderNumber} for restaurant ${rest.id}`);

                // Auto-confirm if enabled
                const autoAccept = (rest.metadata as any)?.ifood_auto_accept;
                if (autoAccept) {
                  await ifood.confirmOrder(creds, event.orderId);
                }
              }
            }
            // Acknowledge event
            await ifood.ackEvents(creds, [event.id]);
          }
        } catch (err) {
          console.error(`iFood poll error for ${rest.id}:`, err);
        }
      }
    } catch (err) {
      console.error("iFood polling error:", err);
    }
  }

  // Start polling loop
  setInterval(poll, POLL_INTERVAL);
  poll(); // Run immediately
}
