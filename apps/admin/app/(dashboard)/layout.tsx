import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { Sidebar } from "@/components/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  // Get restaurant name
  const { data: membership } = await supabase
    .from("restaurant_users")
    .select("restaurants(name)")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  const restaurantName = (membership as any)?.restaurants?.name || "Restaurante";

  return (
    <div className="flex h-screen">
      <Sidebar restaurantName={restaurantName} />
      <main className="flex-1 overflow-auto bg-creme">
        <div className="p-6 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
