import type { FastifyInstance } from "fastify";

export async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/register — cria user + restaurante + vínculo owner
  app.post("/register", async (request, reply) => {
    const { email, password, full_name, restaurant_name, restaurant_slug } =
      request.body as any;

    const admin = request.supabaseAdmin;

    // 1. Create auth user
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (authErr) return reply.status(400).send({ error: authErr.message });

    const userId = authData.user.id;

    // 2. Update profile
    await admin.from("users").update({ full_name }).eq("id", userId);

    // 3. Create restaurant
    const { data: restaurant, error: restErr } = await admin
      .from("restaurants")
      .insert({
        name: restaurant_name,
        slug: restaurant_slug,
        status: "trial",
        trial_ends_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (restErr) return reply.status(400).send({ error: restErr.message });

    // 4. Link user as owner
    await admin.from("restaurant_users").insert({
      restaurant_id: restaurant.id,
      user_id: userId,
      role: "owner",
    });

    // 5. Generate session
    const { data: session, error: sessErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    // Return token via sign-in
    const { data: signIn } = await admin.auth.signInWithPassword({ email, password });

    return {
      user: { id: userId, email, full_name },
      restaurant: { id: restaurant.id, name: restaurant.name, slug: restaurant.slug },
      session: signIn.session,
    };
  });

  // POST /api/auth/login
  app.post("/login", async (request, reply) => {
    const { email, password } = request.body as any;
    const { data, error } = await request.supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return reply.status(401).send({ error: error.message });
    return { session: data.session, user: data.user };
  });

  // POST /api/auth/refresh
  app.post("/refresh", async (request, reply) => {
    const { refresh_token } = request.body as any;
    const { data, error } = await request.supabaseAdmin.auth.refreshSession({
      refresh_token,
    });

    if (error) return reply.status(401).send({ error: error.message });
    return { session: data.session };
  });

  // GET /api/auth/me
  app.get("/me", async (request, reply) => {
    if (!request.userId) return reply.status(401).send({ error: "Not authenticated" });

    const { data: user } = await request.supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", request.userId)
      .single();

    const { data: memberships } = await request.supabaseAdmin
      .from("restaurant_users")
      .select("*, restaurants(*)")
      .eq("user_id", request.userId);

    return { user, memberships };
  });
}
