import fp from "fastify-plugin";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { FastifyInstance, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    supabase: SupabaseClient;
    supabaseAdmin: SupabaseClient;
    userId: string | null;
    restaurantId: string | null;
  }
}

async function supabase(app: FastifyInstance) {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  app.decorateRequest("supabase", null);
  app.decorateRequest("supabaseAdmin", null);
  app.decorateRequest("userId", null);
  app.decorateRequest("restaurantId", null);

  app.addHook("onRequest", async (request: FastifyRequest) => {
    const token = request.headers.authorization?.replace("Bearer ", "");

    // Admin client always available
    request.supabaseAdmin = adminClient;

    if (token) {
      // Create authenticated client with user's token
      request.supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });

      const { data: { user } } = await adminClient.auth.getUser(token);
      request.userId = user?.id ?? null;

      if (request.userId) {
        // Get first restaurant for this user (multi-tenant)
        const { data: membership } = await adminClient
          .from("restaurant_users")
          .select("restaurant_id")
          .eq("user_id", request.userId)
          .limit(1)
          .single();

        request.restaurantId = membership?.restaurant_id ?? null;
      }
    } else {
      request.supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
  });
}

export const supabasePlugin = fp(supabase, { name: "supabase" });
