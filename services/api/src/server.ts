import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { supabasePlugin } from "./plugins/supabase";
import { authRoutes } from "./routes/auth";
import { restaurantRoutes } from "./routes/restaurants";
import { categoryRoutes } from "./routes/categories";
import { productRoutes } from "./routes/products";
import { deliveryZoneRoutes } from "./routes/delivery-zones";
import { operatingHourRoutes } from "./routes/operating-hours";
import { orderRoutes } from "./routes/orders";
import { uploadRoutes } from "./routes/uploads";

const app = Fastify({ logger: true });

async function start() {
  await app.register(cors, { origin: true });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
  await app.register(supabasePlugin);

  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(restaurantRoutes, { prefix: "/api/restaurants" });
  await app.register(categoryRoutes, { prefix: "/api/categories" });
  await app.register(productRoutes, { prefix: "/api/products" });
  await app.register(deliveryZoneRoutes, { prefix: "/api/delivery-zones" });
  await app.register(operatingHourRoutes, { prefix: "/api/operating-hours" });
  await app.register(orderRoutes, { prefix: "/api/orders" });
  await app.register(uploadRoutes, { prefix: "/api/uploads" });

  app.get("/api/health", async () => ({ status: "ok", service: "lotta-api", version: "0.0.1" }));

  const port = parseInt(process.env.PORT || "3001");
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`API running on :${port}`);
}

start().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
