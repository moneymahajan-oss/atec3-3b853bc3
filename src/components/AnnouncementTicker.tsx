import { useQuery } from "@tanstack/react-query";
import { Megaphone, AlertTriangle, Award, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const typeConfig: Record<string, { icon: React.ElementType; class: string }> = {
  badge: { icon: Award, class: "text-primary bg-primary/10" },
  news: { icon: Megaphone, class: "text-green-600 bg-green-500/10" },
  urgent: { icon: AlertTriangle, class: "text-destructive bg-destructive/10" },
};

export default function AnnouncementTicker() {
  const { data: announcements = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data, error } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    placeholderData: [] as never[],
    retry: 2,
    retryDelay: 1000,
  });

  if (isError) return (
    <section className="py-4 bg-muted/50 border-y border-border text-center">
      <button onClick={() => refetch()} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <RefreshCw className="w-3 h-3" /> Retry loading announcements
      </button>
    </section>
  );

  if (isLoading || announcements.length === 0) return null;
  const items = [...announcements, ...announcements];

  return (
    <section className="py-4 bg-muted/50 border-y border-border overflow-hidden">
      <div className="animate-marquee flex whitespace-nowrap gap-8">
        {items.map((a: any, i: number) => {
          const cfg = typeConfig[a.type || "news"];
          const Icon = cfg?.icon || Megaphone;
          return (
            <div key={i} className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium ${cfg?.class || ""}`}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{a.title}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
