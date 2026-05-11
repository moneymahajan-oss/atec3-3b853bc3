import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Offer {
  id: string;
  message: string;
  bg_color: string;
  text_color?: string; // optional — fallback to auto-contrast if not set
}

/** Simple luminance check to pick black or white text automatically */
function autoTextColor(hex: string): string {
  try {
    const h = hex.replace("#", "");
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    // Perceived luminance formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55 ? "#000000" : "#ffffff";
  } catch {
    return "#ffffff";
  }
}

export default function OfferBelt() {
  const { data: offers = [], isLoading } = useQuery({
    queryKey: ["offer_belt"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offer_belt")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Offer[];
    },
    placeholderData: [] as Offer[],
    retry: 2,
    retryDelay: 1000,
  });

  if (isLoading || offers.length === 0) return null;

  const bg = offers[0].bg_color || "#F59E0B";

  // FIX: Use text_color from DB if present, otherwise auto-calculate from bg
  // This ensures color changes in admin panel are reflected correctly
  const textColor = offers[0].text_color
    ? offers[0].text_color
    : autoTextColor(bg);

  const items = [...offers, ...offers, ...offers];

  return (
    <div
      className="w-full overflow-hidden py-2.5 text-sm font-medium"
      style={{
        backgroundColor: bg,
        color: textColor, // FIX: inline style overrides Tailwind — no more color conflicts
      }}
      aria-label="Offer announcements"
    >
      <div className="animate-marquee flex whitespace-nowrap gap-12">
        {items.map((o, i) => (
          <span
            key={`${o.id}-${i}`}
            className="px-4"
            style={{ color: textColor }} // FIX: explicit color on each span too
          >
            {o.message}
          </span>
        ))}
      </div>
    </div>
  );
}
