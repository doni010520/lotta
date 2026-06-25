import type { FastifyInstance } from "fastify";
import { requireAuth } from "../plugins/auth-guard";
import sharp from "sharp";
import { randomUUID } from "crypto";

export async function uploadRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAuth);

  app.post("/product-image", async (request, reply) => {
    const file = await request.file();
    if (!file) return reply.status(400).send({ error: "No file uploaded" });

    const buffer = await file.toBuffer();

    // Resize to max 800x800, webp, quality 80
    const optimized = await sharp(buffer)
      .resize(800, 800, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const filename = `${request.restaurantId}/${randomUUID()}.webp`;

    const { error } = await request.supabaseAdmin.storage
      .from("product-images")
      .upload(filename, optimized, {
        contentType: "image/webp",
        upsert: false,
      });

    if (error) return reply.status(500).send({ error: error.message });

    const { data: urlData } = request.supabaseAdmin.storage
      .from("product-images")
      .getPublicUrl(filename);

    return { url: urlData.publicUrl };
  });

  app.post("/restaurant-logo", async (request, reply) => {
    const file = await request.file();
    if (!file) return reply.status(400).send({ error: "No file uploaded" });

    const buffer = await file.toBuffer();

    const optimized = await sharp(buffer)
      .resize(400, 400, { fit: "cover" })
      .webp({ quality: 85 })
      .toBuffer();

    const filename = `${request.restaurantId}/logo.webp`;

    const { error } = await request.supabaseAdmin.storage
      .from("restaurant-assets")
      .upload(filename, optimized, {
        contentType: "image/webp",
        upsert: true,
      });

    if (error) return reply.status(500).send({ error: error.message });

    const { data: urlData } = request.supabaseAdmin.storage
      .from("restaurant-assets")
      .getPublicUrl(filename);

    // Update restaurant logo_url
    await request.supabase
      .from("restaurants")
      .update({ logo_url: urlData.publicUrl })
      .eq("id", request.restaurantId);

    return { url: urlData.publicUrl };
  });
}
