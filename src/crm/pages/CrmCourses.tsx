import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "../components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Send, ExternalLink, Eye, EyeOff } from "lucide-react";
import { useCrmAuth } from "../hooks/useCrmAuth";
import SendCourseDrawer from "../components/SendCourseDrawer";
import { toast } from "sonner";
import { logAudit } from "../lib/audit";

interface Course {
  id: string;
  name: string;
  category: "finance" | "computer";
  duration: string | null;
  mode: "offline" | "online" | "hybrid";
  total_fee: number;
  brochure_url: string | null;
  youtube_url: string | null;
  video_url: string | null;
  is_active: boolean;
  display_order: number;
  concise_syllabus: string | null;
  next_batch_date: string | null;
}

export default function CrmCourses() {
  const { isAdmin } = useCrmAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [sending, setSending] = useState<Course | null>(null);

  const load = async () => {
    const { data } = await supabase.from("crm_courses").select("*").order("display_order");
    setCourses(((data ?? []) as unknown) as Course[]);
  };
  useEffect(() => { load(); }, []);

  const toggleActive = async (c: Course) => {
    const { error } = await supabase.from("crm_courses").update({ is_active: !c.is_active }).eq("id", c.id);
    if (error) return toast.error(error.message);
    logAudit("toggle_active", "course", c.id, { from: c.is_active, to: !c.is_active });
    load();
  };

  const filtered = courses.filter((c) => {
    if (cat !== "all" && c.category !== cat) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const catColor = (c: string) => c === "finance"
    ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30"
    : "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30";

  return (
    <div>
      <PageHeader
        title="Course Catalogue"
        description="All ATEC courses. Click 'Send to Enquiry' to share course details on WhatsApp."
        actions={isAdmin && (
          <Button asChild><Link to="/crm/courses/new"><Plus className="w-4 h-4 mr-1" /> New course</Link></Button>
        )}
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <Input placeholder="Search courses…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="max-w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="finance">Finance</SelectItem>
            <SelectItem value="computer">Computer</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground self-center ml-auto">{filtered.length} courses</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <div key={c.id} className="bg-card border rounded-2xl p-5 flex flex-col">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-heading font-bold text-lg leading-tight">{c.name}</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${catColor(c.category)}`}>{c.category}</span>
            </div>
            <div className="text-xs text-muted-foreground mb-3 flex flex-wrap gap-x-3 gap-y-1">
              {c.duration && <span>⏱ {c.duration}</span>}
              <span>📋 {c.mode}</span>
              <span>💰 ₹{c.total_fee.toLocaleString("en-IN")}</span>
            </div>
            {c.concise_syllabus && (
              <p className="text-xs text-muted-foreground line-clamp-3 mb-4 flex-1">{c.concise_syllabus}</p>
            )}
            {!c.is_active && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground self-start mb-3">Inactive</span>
            )}
            <div className="flex flex-wrap gap-2 mt-auto">
              <Button size="sm" onClick={() => setSending(c)}>
                <Send className="w-3.5 h-3.5 mr-1" /> Send to Enquiry
              </Button>
              {isAdmin && (
                <>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/crm/courses/${c.id}`}><Pencil className="w-3.5 h-3.5 mr-1" /> Edit</Link>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(c)}>
                    {c.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </Button>
                </>
              )}
              {c.brochure_url && (
                <Button size="sm" variant="ghost" asChild>
                  <a href={c.brochure_url} target="_blank" rel="noreferrer"><ExternalLink className="w-3.5 h-3.5" /></a>
                </Button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground py-12">No courses match your filter.</div>
        )}
      </div>

      <SendCourseDrawer course={sending} onClose={() => setSending(null)} />
    </div>
  );
}
