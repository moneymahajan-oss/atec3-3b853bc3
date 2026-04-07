import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  GraduationCap, LogOut, LayoutDashboard, Image, MessageSquare, Users,
  BookOpen, BarChart3, Video, Megaphone, Download, Settings, Mail, Sliders,
  Eye, Pencil, TrendingUp
} from "lucide-react";

const sections = [
  { key: "hero_slides", label: "Hero Slides", icon: Sliders, color: "bg-blue-500" },
  { key: "courses", label: "Courses", icon: BookOpen, color: "bg-orange-500" },
  { key: "gallery_items", label: "Gallery", icon: Image, color: "bg-green-500" },
  { key: "testimonials", label: "Testimonials", icon: MessageSquare, color: "bg-purple-500" },
  { key: "team_members", label: "Team", icon: Users, color: "bg-pink-500" },
  { key: "stats", label: "Stats", icon: BarChart3, color: "bg-cyan-500" },
  { key: "youtube_videos", label: "Videos", icon: Video, color: "bg-red-500" },
  { key: "announcements", label: "Announcements", icon: Megaphone, color: "bg-yellow-500" },
  { key: "downloads", label: "Downloads", icon: Download, color: "bg-indigo-500" },
  { key: "contact_submissions", label: "Inquiries", icon: Mail, color: "bg-emerald-500" },
  { key: "site_settings", label: "Settings", icon: Settings, color: "bg-slate-500" },
];

export default function AdminDashboard() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/admin/login");
    }
  }, [user, isAdmin, loading]);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchCounts = async () => {
      const results: Record<string, number> = {};
      for (const s of sections) {
        const { count } = await supabase.from(s.key as any).select("*", { count: "exact", head: true });
        results[s.key] = count || 0;
      }
      setCounts(results);

      const { count: unread } = await supabase.from("contact_submissions").select("*", { count: "exact", head: true }).eq("is_read", false);
      setUnreadCount(unread || 0);
    };
    fetchCounts();
  }, [isAdmin]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-accent-foreground" />
            </div>
            <span className="font-heading font-bold text-lg text-foreground">E-Tech Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild><Link to="/"><Eye className="w-4 h-4 mr-1" /> View Site</Link></Button>
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="w-4 h-4 mr-1" /> Sign Out</Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Quick stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="glass rounded-xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-accent" />
            </div>
            <div>
              <div className="text-2xl font-heading font-bold text-foreground">{counts.courses || 0}</div>
              <div className="text-sm text-muted-foreground">Active Courses</div>
            </div>
          </div>
          <div className="glass rounded-xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Mail className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-heading font-bold text-foreground">{unreadCount}</div>
              <div className="text-sm text-muted-foreground">Unread Inquiries</div>
            </div>
          </div>
          <div className="glass rounded-xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-heading font-bold text-foreground">{counts.testimonials || 0}</div>
              <div className="text-sm text-muted-foreground">Testimonials</div>
            </div>
          </div>
        </div>

        <h2 className="font-heading font-bold text-xl text-foreground mb-4">Manage Sections</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sections.map((s) => (
            <Link
              key={s.key}
              to={`/admin/${s.key}`}
              className="glass rounded-xl p-5 hover:shadow-lg transition-all group"
            >
              <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <s.icon className="w-5 h-5 text-white" />
              </div>
              <div className="font-heading font-semibold text-foreground">{s.label}</div>
              <div className="text-sm text-muted-foreground">{counts[s.key] ?? "..."} items</div>
              <Pencil className="w-4 h-4 text-muted-foreground mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
