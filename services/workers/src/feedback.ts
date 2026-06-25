import { Worker } from "bullmq";
import IORedis from "ioredis";
import { wa } from "@lotta/shared";

const redis = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", { maxRetriesPerRequest: null });

export function startFeedbackWorker() {
  const worker = new Worker("feedback-requests", async (job) => {
    const { restaurantId, phone, orderNumber } = job.data;
    await wa.sendText(restaurantId, phone,
      `Como foi seu pedido #${orderNumber}? De 1 a 5, qual nota você dá? 🌟`);
    console.log(`Feedback requested for order #${orderNumber}`);
  }, { connection: redis, concurrency: 5 });

  console.log("Feedback worker started");
  return worker;
}
