import type { FastifyRequest, FastifyReply } from "fastify";

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  if (!request.userId || !request.restaurantId) {
    return reply.status(401).send({ error: "Authentication required" });
  }
}

export async function requireRole(roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.userId) return reply.status(401).send({ error: "Not authenticated" });

    const { data } = await request.supabaseAdmin
      .from("restaurant_users")
      .select("role")
      .eq("user_id", request.userId)
      .eq("restaurant_id", request.restaurantId)
      .single();

    if (!data || !roles.includes(data.role)) {
      return reply.status(403).send({ error: "Insufficient permissions" });
    }
  };
}
