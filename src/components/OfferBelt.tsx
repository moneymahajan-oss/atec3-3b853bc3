import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Offer {
  id: string;
  message: string;
  bg_color: string;
}

export default function OfferBelt() {
  const { data: offers = [], isLoading } = useQuery({
    queryKey: ['offer_belt'],
    queryFn: async () => {
      const { data } = await supabase
        .from("offer_belt")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      return (data || []) as Offer[];
    },
    staleTime: 0,
  });

  if (isLoading || offers.length === 0) return null;

  const bg = offers[0].bg_color || "#F59E0B";
  const items = [...offers, ...offers, ...offers];

  return (
    <div
      className="w-full overflow-hidden py-2.5 text-white text-sm font-medium"
      style={{ backgroundColor: bg }}
    >
      <div className="animate-marquee flex whitespace-nowrap gap-12">
        {items.map((o, i) => (
          <span key={`${o.id}-${i}`} className="px-4">
            {o.message}
          </span>
        ))}
      </div>
    </div>
  );
}
