import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function startSegmentationCron() {
  console.log("Running RFM segmentation...");

  // Refresh materialized view
  await supabase.rpc("refresh_rfm");

  // Sync segments
  const { data } = await supabase.rpc("sync_segments");
  const updated = data ?? 0;

  console.log(`Segmentation complete: ${updated} customers updated`);
  return { updated };
}
