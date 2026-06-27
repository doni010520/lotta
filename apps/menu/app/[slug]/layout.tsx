import { createServiceClient } from "@/lib/supabase";
import { CartProvider } from "@/lib/cart";
import { notFound } from "next/navigation";
import Script from "next/script";
import Image from "next/image";

interface Props {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const supabase = createServiceClient();
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("name, logo_url")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!restaurant) return { title: "Não encontrado" };

  return {
    title: `${restaurant.name} — Cardápio Digital`,
    description: `Peça online de ${restaurant.name}`,
    icons: restaurant.logo_url ? [{ url: restaurant.logo_url }] : undefined,
  };
}

async function getRestaurant(slug: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("restaurants")
    .select("*, payment_configs(*)")
    .eq("slug", slug)
    .single();
  return data;
}

async function getMarketingTags(restaurantId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("restaurants")
    .select("metadata")
    .eq("id", restaurantId)
    .single();
  return data?.metadata as Record<string, any> | null;
}

export default async function MenuLayout({ children, params }: Props) {
  const { slug } = await params;
  const restaurant = await getRestaurant(slug);
  if (!restaurant || restaurant.status === "cancelled") notFound();

  const tags = await getMarketingTags(restaurant.id);
  const pixelId = tags?.meta_pixel_id;
  const ga4Id = tags?.ga4_measurement_id;
  const gtmId = tags?.gtm_container_id;

  return (
    <CartProvider>
      {/* GTM */}
      {gtmId && (
        <Script id="gtm" strategy="afterInteractive">{`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
          var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
          j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
          f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');
        `}</Script>
      )}
      {/* GA4 */}
      {ga4Id && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">{`
            window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
            gtag('js',new Date());gtag('config','${ga4Id}');
          `}</Script>
        </>
      )}
      {/* Meta Pixel */}
      {pixelId && (
        <Script id="meta-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
          (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init','${pixelId}');fbq('track','PageView');
        `}</Script>
      )}

      <div className="min-h-dvh bg-creme">
        {/* Header */}
        <header className="bg-white border-b border-cafe/10 sticky top-0 z-40">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            {restaurant.logo_url && (
              <Image
                src={restaurant.logo_url}
                alt={`Logo de ${restaurant.name}`}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover border border-cafe/10"
              />
            )}
            <div>
              <h1 className="font-display font-bold text-lg leading-tight text-cafe">{restaurant.name}</h1>
              <p className="text-xs text-muted">
                {restaurant.is_open ? (
                  <span className="text-green-600 font-medium">● Aberto</span>
                ) : (
                  <span className="text-paprica font-medium">● Fechado</span>
                )}
                {restaurant.avg_prep_time && (
                  <span className="ml-2">~{restaurant.avg_prep_time} min</span>
                )}
              </p>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto">{children}</main>
      </div>
    </CartProvider>
  );
}
