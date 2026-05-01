import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { Plus, Search, Phone, MessageSquare, Filter, Upload, Download, RotateCcw, Send, Copy, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "../components/PageHeader";
import { ColumnPickerPopover } from "../components/ColumnPickerPopover";
import { useReportColumns } from "../hooks/useReportColumns";
import { sendEnquiryFormViaWhatsApp } from "../lib/sendForm";
import { toast } from "sonner";

type Enquiry = {
  id: string;
  name: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  qualification: string | null;
  college_name: string | null;
  class_year: string | null;
  stream: string | null;
  current_status: string | null;
  company_name: string | null;
  course_id: string | null;
  course_name_snapshot: string | null;
  preferred_timing: string | null;
  budget_range: string | null;
  source: string;
  status: string;
  priority: string;
  follow_up_date: string | null;
  assigned_to_name: string | null;
  hear_about_us: string | null;
  referred_by: string | null;
  created_at: string;
};



const statusColors: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  contacted: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  follow_up: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  converted: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  lost: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  junk: "bg-muted text-muted-foreground",
};

const SOURCE_ICON: Record<string, string> = {
  website_enquiry_form: "🌐",
  website_course_page: "📄",
  student_self_fill: "📝",
  crm_manual: "👤",
  crm_from_catalogue: "📋",
  walk_in: "🚶",
  crm_walk_in: "🚶",
  referral: "🎁",
  whatsapp: "💬",
  phone: "📞",
  instagram: "📷",
  facebook: "📘",
  google: "🔎",
  youtube: "▶️",
  other: "•",
};

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}
function daysSinceLabel(d: number): string {
  if (d <= 0) return "Today";
  if (d === 1) return "1 day ago";
  return `${d} days ago`;
}
function daysBadgeClass(d: number): string {
  if (d <= 2) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  if (d <= 7) return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  return "bg-rose-500/15 text-rose-700 dark:text-rose-300";
}
function waColor(iso: string): string {
  const d = daysSince(iso);
  if (d <= 0) return "text-emerald-600 dark:text-emerald-400";
  if (d < 7) return "text-blue-600 dark:text-blue-400";
  return "text-muted-foreground";
}

export default function CrmEnquiries() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Enquiry[]>([]);
  const [waMap, setWaMap] = useState<Record<string, { template_key: string; created_at: string }>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [course, setCourse] = useState("all");
  const [counsellor, setCounsellor] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const { cols: reportCols, visibleCols, toggleVisible: toggleColumnVisibility } = useReportColumns("crm_enquiry_report_columns");
  const [instituteName, setInstituteName] = useState<string>("ATEC Education");

  const formUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/enquire`;

  const buildFormMessage = (greetName?: string) => {
    const who = (greetName || "").trim() || "there";
    return (
      `Hi ${who}, this is ${instituteName}.\n\n` +
      `Please fill out our quick enquiry form so we can share course details, fees, and batch timings with you:\n` +
      `${formUrl}\n\n` +
      `It only takes a minute. Thank you!`
    );
  };

  const shareFormViaWhatsApp = async (existingPhone?: string, greetName?: string, enquiryId?: string) => {
    const raw = (existingPhone || "").replace(/\D/g, "");
    const phone = raw || window.prompt("Enter WhatsApp number (with country code, digits only):", "91")?.replace(/\D/g, "") || "";
    if (!phone || phone.length < 10) { toast.error("Valid phone number required (10+ digits)"); return; }
    const ok = await sendEnquiryFormViaWhatsApp({
      phone,
      name: greetName,
      formUrl,
      instituteName,
      entityId: enquiryId,
    });
    if (ok) toast.success("Form link sent — logged to WhatsApp history");
  };

  const copyFormUrl = async () => {
    try {
      await navigator.clipboard.writeText(formUrl);
      toast.success("Enquiry form link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("crm_enquiries")
      .select("id,name,phone,whatsapp,email,city,state,qualification,college_name,class_year,stream,current_status,company_name,course_id,course_name_snapshot,preferred_timing,budget_range,source,status,priority,follow_up_date,assigned_to_name,hear_about_us,referred_by,created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    const list = (data ?? []) as Enquiry[];
    setItems(list);

    const ids = list.map((e) => e.id);
    if (ids.length) {
      const { data: logs } = await supabase
        .from("crm_whatsapp_logs")
        .select("entity_id, template_key, created_at")
        .eq("entity_type", "enquiry")
        .in("entity_id", ids)
        .order("created_at", { ascending: false });
      const map: Record<string, { template_key: string; created_at: string }> = {};
      (logs ?? []).forEach((l: { entity_id: string; template_key: string; created_at: string }) => {
        if (!map[l.entity_id]) map[l.entity_id] = { template_key: l.template_key, created_at: l.created_at };
      });
      setWaMap(map);
    }
    setLoading(false);
  };


  useEffect(() => {
    load();
    supabase.from("crm_courses").select("id,name").eq("is_active", true).order("name")
      .then(({ data }) => setCourses((data ?? []) as { id: string; name: string }[]));
    supabase.from("crm_institute_settings").select("name").maybeSingle()
      .then(({ data }) => { if (data?.name) setInstituteName(data.name as string); });
  }, []);


  const counsellors = useMemo(() => {
    const set = new Set<string>();
    items.forEach((e) => { if (e.assigned_to_name) set.add(e.assigned_to_name); });
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((e) => {
      if (status !== "all" && e.status !== status) return false;
      if (source !== "all" && e.source !== source) return false;
      if (course !== "all" && e.course_id !== course) return false;
      if (counsellor !== "all" && e.assigned_to_name !== counsellor) return false;
      if (from && new Date(e.created_at) < new Date(from)) return false;
      if (to && new Date(e.created_at) > new Date(to + "T23:59:59")) return false;
      if (q) {
        const t = q.toLowerCase();
        if (!(e.name.toLowerCase().includes(t)
          || e.phone.includes(t)
          || (e.email ?? "").toLowerCase().includes(t)
          || (e.course_name_snapshot ?? "").toLowerCase().includes(t)
          || (e.referred_by ?? "").toLowerCase().includes(t))) return false;
      }
      return true;
    });
  }, [items, q, status, source, course, counsellor, from, to]);

  const reset = () => { setQ(""); setStatus("all"); setSource("all"); setCourse("all"); setCounsellor("all"); setFrom(""); setTo(""); };


  const renderCell = (key: string, e: Enquiry) => {
    const wa = waMap[e.id];
    const d = daysSince(e.created_at);
    switch (key) {
      case "enquiry_id": return <span className="font-mono text-xs">{e.id.slice(0, 8)}</span>;
      case "days_since": return <Badge variant="secondary" className={daysBadgeClass(d)}>{daysSinceLabel(d)}</Badge>;
      case "name": return (
        <div>
          <div className="font-medium">{e.name}</div>
          {e.email && <div className="text-xs text-muted-foreground">{e.email}</div>}
        </div>
      );
      case "mobile": return <span className="font-mono text-sm">{e.phone}</span>;
      case "whatsapp": return <span className="font-mono text-sm">{e.whatsapp || "—"}</span>;
      case "email": return <span className="text-sm">{e.email || "—"}</span>;
      case "city": return <span className="text-sm">{e.city || "—"}</span>;
      case "state": return <span className="text-sm">{e.state || "—"}</span>;
      case "qualification": return <span className="text-sm">{e.qualification || "—"}</span>;
      case "college_name": return <span className="text-sm">{e.college_name || "—"}</span>;
      case "class_year": return <span className="text-sm">{e.class_year || "—"}</span>;
      case "stream": return <span className="text-sm">{e.stream || "—"}</span>;
      case "current_status": return <span className="text-sm">{e.current_status || "—"}</span>;
      case "company_name": return <span className="text-sm">{e.company_name || "—"}</span>;
      case "course": return <span className="text-sm">{e.course_name_snapshot || "—"}</span>;
      case "category": return <span className="text-sm">—</span>;
      case "preferred_timing": return <span className="text-sm">{e.preferred_timing || "—"}</span>;
      case "budget_range": return <span className="text-sm">{e.budget_range || "—"}</span>;
      case "source": return (
        <span className="text-xs">
          <span className="mr-1">{SOURCE_ICON[e.source] || "•"}</span>
          <span className="uppercase text-muted-foreground">{e.source.replace(/_/g, " ")}</span>
        </span>
      );
      case "stage": return <Badge variant="secondary" className={statusColors[e.status] || ""}>{e.status.replace("_", " ")}</Badge>;
      case "counsellor": return <span className="text-sm">{e.assigned_to_name || "—"}</span>;
      case "follow_up_date": return <span className="text-sm">{e.follow_up_date || "—"}</span>;
      case "how_heard": return <span className="text-sm">{e.hear_about_us || "—"}</span>;
      case "referred_by": return <span className="text-sm">{e.referred_by || "—"}</span>;
      case "wa_sent": return wa ? (
        <span className={`text-xs ${waColor(wa.created_at)}`}>{wa.template_key} · {daysSinceLabel(daysSince(wa.created_at))}</span>
      ) : <span className="text-xs text-muted-foreground">—</span>;
      case "created_at": return <span className="text-xs">{new Date(e.created_at).toLocaleString()}</span>;
      default: return <span className="text-sm text-muted-foreground">—</span>;
    }
  };

  const exportXlsx = () => {
    const cols = reportCols.filter((c) => c.show_in_export);
    const rows = filtered.map((e) => {
      const wa = waMap[e.id];
      const row: Record<string, string | number | null> = {};
      cols.forEach((c) => {
        switch (c.column_key) {
          case "enquiry_id": row[c.label] = e.id; break;
          case "days_since": row[c.label] = daysSince(e.created_at); break;
          case "name": row[c.label] = e.name; break;
          case "mobile": row[c.label] = e.phone; break;
          case "whatsapp": row[c.label] = e.whatsapp ?? ""; break;
          case "email": row[c.label] = e.email ?? ""; break;
          case "city": row[c.label] = e.city ?? ""; break;
          case "state": row[c.label] = e.state ?? ""; break;
          case "qualification": row[c.label] = e.qualification ?? ""; break;
          case "college_name": row[c.label] = e.college_name ?? ""; break;
          case "class_year": row[c.label] = e.class_year ?? ""; break;
          case "stream": row[c.label] = e.stream ?? ""; break;
          case "current_status": row[c.label] = e.current_status ?? ""; break;
          case "company_name": row[c.label] = e.company_name ?? ""; break;
          case "course": row[c.label] = e.course_name_snapshot ?? ""; break;
          case "preferred_timing": row[c.label] = e.preferred_timing ?? ""; break;
          case "budget_range": row[c.label] = e.budget_range ?? ""; break;
          case "source": row[c.label] = e.source; break;
          case "stage": row[c.label] = e.status; break;
          case "counsellor": row[c.label] = e.assigned_to_name ?? ""; break;
          case "follow_up_date": row[c.label] = e.follow_up_date ?? ""; break;
          case "how_heard": row[c.label] = e.hear_about_us ?? ""; break;
          case "referred_by": row[c.label] = e.referred_by ?? ""; break;
          case "wa_sent": row[c.label] = wa ? `${wa.template_key} · ${new Date(wa.created_at).toLocaleString()}` : ""; break;
          case "created_at": row[c.label] = new Date(e.created_at).toLocaleString(); break;
          default: row[c.label] = "";
        }
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Enquiries");
    XLSX.writeFile(wb, `enquiries-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`Exported ${rows.length} enquiries`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enquiries"
        description="Track every prospective student from first contact to enrolment."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate("/crm/enquiries/new")}>
              <Plus className="w-4 h-4 mr-2" /> New Enquiry
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => shareFormViaWhatsApp()}
              title="Send the public enquiry form link on WhatsApp"
            >
              <Send className="w-4 h-4 mr-2" /> Share Form on WhatsApp
            </Button>
            <Button variant="outline" onClick={copyFormUrl} title={formUrl}>
              <Copy className="w-4 h-4 mr-2" /> Copy Form Link
            </Button>
            <Button variant="outline" onClick={() => window.open("/enquire", "_blank", "noopener,noreferrer")}>
              <ExternalLink className="w-4 h-4 mr-2" /> Open Form
            </Button>
            <ColumnPickerPopover cols={reportCols} onToggle={toggleColumnVisibility} />
            <Button variant="outline" onClick={() => navigate("/crm/import-export")}>
              <Upload className="w-4 h-4 mr-2" /> Import
            </Button>
            <Button variant="outline" onClick={exportXlsx}>
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
        <div className="relative sm:col-span-2 lg:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="From" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} placeholder="To" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><Filter className="w-3.5 h-3.5 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {["new","contacted","follow_up","converted","lost","junk"].map((s) => <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {Object.keys(SOURCE_ICON).map((s) => <SelectItem key={s} value={s}>{SOURCE_ICON[s]} {s.replace(/_/g," ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={course} onValueChange={setCourse}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={counsellor} onValueChange={setCounsellor}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Counsellors</SelectItem>
            {counsellors.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="ghost" onClick={reset}><RotateCcw className="w-4 h-4 mr-1" /> Reset</Button>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleCols.map((c) => <TableHead key={c.column_key}>{c.label}</TableHead>)}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={visibleCols.length + 1} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={visibleCols.length + 1} className="text-center py-12 text-muted-foreground">
                No enquiries found. <Link to="/crm/enquiries/new" className="underline">Add your first one</Link>.
              </TableCell></TableRow>
            ) : filtered.map((e) => (
              <TableRow key={e.id} className="cursor-pointer" onClick={() => navigate(`/crm/enquiries/${e.id}`)}>
                {visibleCols.map((c) => (
                  <TableCell key={c.column_key}>{renderCell(c.column_key, e)}</TableCell>
                ))}
                <TableCell className="text-right" onClick={(ev) => ev.stopPropagation()}>
                  <div className="inline-flex gap-1">
                    <Button size="icon" variant="ghost" asChild title="Call">
                      <a href={`tel:${e.phone}`}><Phone className="w-4 h-4" /></a>
                    </Button>
                    <Button size="icon" variant="ghost" asChild title="Open WhatsApp chat">
                      <a href={`https://wa.me/${e.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                        <MessageSquare className="w-4 h-4" />
                      </a>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Send public enquiry form link on WhatsApp"
                      onClick={() => shareFormViaWhatsApp(e.phone, e.name, e.id)}
                    >
                      <Send className="w-4 h-4 text-emerald-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
