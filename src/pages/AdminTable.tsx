import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { invalidatePublicQueries } from "@/lib/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import { supabaseAdmin as supabase } from "@/integrations/supabase/adminClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, Pencil, Trash2, Save, X, GraduationCap,
  LogOut, Eye, ChevronDown, ChevronUp, Search, UserCog, MessageSquare, Phone
} from "lucide-react";

type TableName = "hero_slides" | "courses" | "gallery_items" | "testimonials" | "team_members" | "stats" | "youtube_videos" | "announcements" | "marquee_highlights" | "downloads" | "contact_submissions" | "site_settings" | "offer_belt" | "ai_use_cases" | "whatsapp_templates" | "mock_tests" | "mock_test_results" | "leads" | "crm_faculties";

const tableConfig: Record<string, {
  label: string;
  fields: { key: string; label: string; type: "text" | "textarea" | "number" | "boolean" | "select" | "json"; options?: (string | { value: string; label: string })[]; required?: boolean }[];
  canCreate?: boolean;
  canDelete?: boolean;
}> = {
  hero_slides: {
    label: "Hero Slides",
    canCreate: true, canDelete: true,
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "subtitle", label: "Subtitle", type: "textarea" },
      { key: "cta_text", label: "CTA Text", type: "text" },
      { key: "cta_link", label: "CTA Link", type: "text" },
      { key: "image_url", label: "Image URL", type: "text" },
      { key: "badge_text", label: "Badge Text", type: "text" },
      { key: "demo_video_url", label: "Watch Demo Video URL (YouTube / Instagram Reel)", type: "text" },
      { key: "is_active", label: "Active", type: "boolean" },
      { key: "display_order", label: "Order", type: "number" },
    ],
  },
  courses: {
    label: "Courses",
    canCreate: true, canDelete: true,
    fields: [
      // ── Same fields as Admin panel (original names kept) ──────────────────
      { key: "name",              label: "Name *",                                          type: "text",     required: true },
      { key: "category",         label: "Category *",                                      type: "select",   options: ["AI Programs", "Digital Marketing Stack", "Tally Certifications", "Commerce Courses", "Office & Productivity", "AI Kids Programs", "Programming", "computer", "finance"], required: true },
      { key: "short_description", label: "Short Description (shown on cards & WhatsApp)",   type: "textarea" },
      { key: "full_description",  label: "Full Description (shown on course page)",          type: "textarea" },
      { key: "syllabus",         label: "Syllabus (JSON array of module strings) — auto-converts to bullet points in WhatsApp", type: "json" },
      { key: "duration",         label: "Duration (e.g. 2 Months)",                        type: "text" },
      { key: "fee",              label: "Fee (text, e.g. ₹4,000) — also set Total Fee ₹ below for CRM", type: "text" },
      { key: "total_fee",        label: "Total Fee ₹ (number for CRM — e.g. 4000)",        type: "number" },
      { key: "badge_label",      label: "Badge (e.g. Popular, Beginner, New)",              type: "text" },
      // ── Images ────────────────────────────────────────────────────────────
      { key: "thumbnail_url",    label: "Thumbnail URL (card image — paste URL or upload via CRM)", type: "text" },
      { key: "syllabus_image_url", label: "Syllabus Image URL (photo of syllabus — used as WA thumbnail)", type: "text" },
      // ── PDFs ──────────────────────────────────────────────────────────────
      { key: "syllabus_pdf_url", label: "Syllabus PDF URL (Google Drive or Supabase — {brochure_link} in WA)", type: "text" },
      { key: "brochure_pdf_url", label: "Brochure PDF URL (same as above if identical)",   type: "text" },
      // ── Video ─────────────────────────────────────────────────────────────
      { key: "video_url",        label: "Course Video URL (YouTube/Instagram) — {video_link} in WA", type: "text" },
      // ── WhatsApp ──────────────────────────────────────────────────────────
      { key: "whatsapp_template_key", label: "WhatsApp Template Key (e.g. COURSE_INFO)",   type: "text" },
      // ── CRM-only extra fields ──────────────────────────────────────────────
      { key: "mode",             label: "Mode (offline / online / hybrid)",                type: "select",   options: ["offline", "online", "hybrid"] },
      { key: "registration_fee", label: "Registration Fee ₹",                             type: "number" },
      { key: "emi_options",      label: "EMI Options (comma-separated, e.g. 3 EMIs of ₹2000)", type: "text" },
      { key: "next_batch_date",  label: "Next Batch Date (YYYY-MM-DD)",                    type: "text" },
      { key: "certificate_title", label: "Certificate Title (printed on certificate)",     type: "text" },
      { key: "slug",             label: "URL Slug (auto-generated from name if blank)",    type: "text" },
      // ── Visibility ────────────────────────────────────────────────────────
      { key: "is_featured",      label: "Featured on homepage",                            type: "boolean" },
      { key: "is_active",        label: "Active (visible on website)",                     type: "boolean" },
      { key: "display_order",    label: "Display Order (lower = first)",                   type: "number" },
    ],
  },
  gallery_items: {
    label: "Gallery",
    canCreate: true, canDelete: true,
    fields: [
      { key: "image_url", label: "Image URL", type: "text", required: true },
      { key: "caption", label: "Caption", type: "text" },
      { key: "category", label: "Category", type: "text" },
      { key: "is_active", label: "Active", type: "boolean" },
      { key: "display_order", label: "Order", type: "number" },
    ],
  },
  testimonials: {
    label: "Testimonials",
    canCreate: true, canDelete: true,
    fields: [
      { key: "student_name", label: "Student Name", type: "text", required: true },
      { key: "course_name", label: "Course", type: "text" },
      { key: "youtube_url", label: "Video URL (YouTube / Instagram / any)", type: "text" },
      { key: "thumbnail_url", label: "Thumbnail Image URL", type: "text" },
      { key: "rating", label: "Rating (1-5)", type: "number" },
      { key: "review_text", label: "Review", type: "textarea" },
      { key: "photo_url", label: "Photo URL", type: "text" },
      { key: "batch_year", label: "Batch Year", type: "text" },
      { key: "is_active", label: "Active", type: "boolean" },
      { key: "display_order", label: "Order", type: "number" },
    ],
  },
  crm_faculties: {
    label: "Faculty Profiles",
    canCreate: true, canDelete: true,
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "designation", label: "Designation", type: "text" },
      { key: "specialization", label: "Specialization", type: "text" },
      { key: "qualifications", label: "Qualifications", type: "textarea" },
      { key: "bio", label: "Bio", type: "textarea" },
      { key: "photo_url", label: "Photo URL", type: "text" },
      { key: "experience_years", label: "Experience (years)", type: "number" },
      { key: "email", label: "Email", type: "text" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "linkedin_url", label: "LinkedIn URL", type: "text" },
      { key: "instagram_url", label: "Instagram URL", type: "text" },
      { key: "joined_on", label: "Joined On (YYYY-MM-DD)", type: "text" },
      { key: "is_active", label: "Active", type: "boolean" },
      { key: "is_public", label: "Show on Website", type: "boolean" },
      { key: "display_order", label: "Order", type: "number" },
    ],
  },
  team_members: {
    label: "Team Members",
    canCreate: true, canDelete: true,
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "role", label: "Role", type: "text" },
      { key: "bio", label: "Bio", type: "textarea" },
      { key: "photo_url", label: "Photo URL", type: "text" },
      { key: "linkedin_url", label: "LinkedIn URL", type: "text" },
      { key: "display_order", label: "Order", type: "number" },
    ],
  },
  stats: {
    label: "Stats",
    canCreate: true, canDelete: true,
    fields: [
      { key: "label", label: "Label", type: "text", required: true },
      { key: "value", label: "Value", type: "number", required: true },
      { key: "icon_name", label: "Icon Name", type: "text" },
      { key: "display_order", label: "Order", type: "number" },
    ],
  },
  youtube_videos: {
    label: "YouTube / Social Videos",
    canCreate: true, canDelete: true,
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "video_url", label: "Video URL (paste any YouTube / Instagram / Facebook / Vimeo link)", type: "text", required: true },
      { key: "platform", label: "Platform (auto-detected from URL — leave blank)", type: "select", options: ["youtube", "facebook", "instagram", "vimeo", "other"] },
      { key: "video_id", label: "Video ID (auto-filled from URL — leave blank)", type: "text" },
      { key: "thumbnail_url", label: "Thumbnail URL (auto-extracted when possible — paste image URL for IG/FB if needed)", type: "text" },
      { key: "section", label: "Section", type: "select", options: [{ value: "life", label: "Glimpses from ATEC" }, { value: "learn", label: "Watch and Learn" }] },
      { key: "description", label: "Description", type: "textarea" },
      { key: "is_active", label: "Active", type: "boolean" },
      { key: "display_order", label: "Order", type: "number" },
    ],
  },
  announcements: {
    label: "Announcements",
    canCreate: true, canDelete: true,
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "content", label: "Content", type: "textarea" },
      { key: "type", label: "Type", type: "select", options: ["badge", "news", "urgent"] },
      { key: "is_active", label: "Active", type: "boolean" },
    ],
  },
  marquee_highlights: {
    label: "Marquee Highlights (Row 2)",
    canCreate: true, canDelete: true,
    fields: [
      { key: "text", label: "Text", type: "text", required: true },
      { key: "icon_name", label: "Icon", type: "select", options: ["GraduationCap", "Award", "Users", "Star", "Zap", "Trophy", "CheckCircle", "Shield", "TrendingUp", "Sparkles", "Clock", "Tag", "BookOpen", "MessageCircle", "Heart", "Globe"] },
      { key: "color", label: "Icon Color (hex, e.g. #FF6B6B)", type: "text" },
      { key: "sort_order", label: "Order", type: "number" },
      { key: "is_active", label: "Active", type: "boolean" },
    ],
  },
  downloads: {
    label: "Downloads",
    canCreate: true, canDelete: true,
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "file_url", label: "File URL", type: "text" },
      { key: "category", label: "Category", type: "text" },
      { key: "icon_name", label: "Icon Name", type: "text" },
      { key: "is_active", label: "Active", type: "boolean" },
      { key: "display_order", label: "Order", type: "number" },
    ],
  },
  contact_submissions: {
    label: "Contact Inquiries",
    canCreate: false, canDelete: true,
    fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "course_interest", label: "Course Interest", type: "text" },
      { key: "message", label: "Message", type: "textarea" },
      { key: "is_read", label: "Read", type: "boolean" },
    ],
  },
  site_settings: {
    label: "Site Settings (raw)",
    canCreate: true, canDelete: true,
    fields: [
      { key: "key", label: "Key", type: "text", required: true },
      { key: "value", label: "Value", type: "textarea" },
    ],
  },
  offer_belt: {
    label: "Offer Belt",
    canCreate: true, canDelete: true,
    fields: [
      { key: "message", label: "Message", type: "text", required: true },
      { key: "bg_color", label: "Background Color (hex)", type: "text" },
      { key: "is_active", label: "Active", type: "boolean" },
      { key: "sort_order", label: "Order", type: "number" },
    ],
  },
  ai_use_cases: {
    label: "AI Use Cases",
    canCreate: true, canDelete: true,
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "earning_potential", label: "Earning Potential", type: "text" },
      { key: "icon", label: "Icon (emoji or lucide name)", type: "text" },
      { key: "is_active", label: "Active", type: "boolean" },
      { key: "sort_order", label: "Order", type: "number" },
    ],
  },
  whatsapp_templates: {
    label: "WhatsApp Templates",
    canCreate: true, canDelete: true,
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "template_key", label: "Template Key", type: "text", required: true },
      { key: "wa_number", label: "WhatsApp Number (with country code, e.g. 917009933289)", type: "text" },
      { key: "message_body", label: "Message (vars: {course_name} {student_name} {phone} {syllabus_pdf_url} {brochure_pdf_url} {score} {total} {percentage} {pass_fail} {message})", type: "textarea", required: true },
      { key: "is_active", label: "Active", type: "boolean" },
    ],
  },
  mock_tests: {
    label: "Mock Tests",
    canCreate: true, canDelete: true,
    fields: [
      { key: "course", label: "Course", type: "text", required: true },
      { key: "title", label: "Title", type: "text", required: true },
      { key: "questions", label: "Questions JSON: [{question, options:[a,b,c,d], correct:0}]", type: "json" },
      { key: "is_active", label: "Active", type: "boolean" },
    ],
  },
  mock_test_results: {
    label: "Mock Test Results",
    canCreate: false, canDelete: true,
    fields: [
      { key: "student_name", label: "Student Name", type: "text" },
      { key: "whatsapp_no", label: "WhatsApp No", type: "text" },
      { key: "course", label: "Course", type: "text" },
      { key: "score", label: "Score", type: "number" },
      { key: "total", label: "Total", type: "number" },
    ],
  },
  leads: {
    label: "Leads / Inquiries",
    canCreate: false, canDelete: true,
    fields: [
      { key: "student_name", label: "Name", type: "text" },
      { key: "phone", label: "Phone / WhatsApp", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "course_name", label: "Course", type: "text" },
      { key: "source", label: "Source", type: "text" },
      { key: "message", label: "Message", type: "textarea" },
      { key: "is_read", label: "Read", type: "boolean" },
    ],
  },
};

export default function AdminTable() {
  const { table } = useParams<{ table: string }>();
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<string>("display_order");
  const [sortAsc, setSortAsc] = useState(true);

  const config = tableConfig[table || ""] || null;
  const tableName = table as TableName;

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate("/admin/login");
  }, [user, isAdmin, authLoading]);

  const fetchData = async () => {
    if (!table) return;
    setLoading(true);
    const query = supabase.from(tableName).select("*");
    const { data: rows, error } = await query;
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setData(rows || []);
    }
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) fetchData(); }, [table, isAdmin]);

  const handleSave = async () => {
    if (!editItem || !table) return;
    const payload = { ...editItem };
    delete payload.id;
    delete payload.created_at;
    delete payload.updated_at;

    // Parse JSON fields
    config?.fields.forEach(f => {
      if (f.type === "json" && typeof payload[f.key] === "string") {
        try { payload[f.key] = JSON.parse(payload[f.key]); } catch { /* keep as string */ }
      }
    });

    // Courses: sync all old columns → new unified columns on every save
    if (tableName === "courses") {
      // emi_options: comma string → array
      if (typeof payload.emi_options === "string") {
        payload.emi_options = payload.emi_options
          ? payload.emi_options.split(",").map((s: string) => s.trim()).filter(Boolean)
          : [];
      }

      // Auto-generate slug from name if blank
      if (!payload.slug || !String(payload.slug).trim()) {
        payload.slug = String(payload.name || "")
          .toLowerCase().trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 60);
      }

      // fee text "₹4,000" → total_fee number 4000
      if ((!payload.total_fee || payload.total_fee === 0) && payload.fee) {
        const cleaned = String(payload.fee).replace(/[^0-9]/g, "");
        if (cleaned) payload.total_fee = parseInt(cleaned, 10);
      }
      // Keep fee text in sync if total_fee was set numerically
      if (payload.total_fee && (!payload.fee || payload.fee === "0")) {
        payload.fee = `₹${Number(payload.total_fee).toLocaleString("en-IN")}`;
      }

      // short_description ↔ concise_syllabus
      if (!payload.concise_syllabus && payload.short_description) {
        payload.concise_syllabus = payload.short_description;
      }
      if (payload.concise_syllabus && !payload.short_description) {
        payload.short_description = payload.concise_syllabus;
      }

      // full_description ↔ detailed_syllabus_html
      if (!payload.detailed_syllabus_html && payload.full_description) {
        payload.detailed_syllabus_html = payload.full_description;
      }
      if (payload.detailed_syllabus_html && !payload.full_description) {
        payload.full_description = payload.detailed_syllabus_html;
      }

      // JSON syllabus array → detailed_syllabus_html + concise_syllabus
      if (payload.syllabus && Array.isArray(payload.syllabus)) {
        const items: string[] = payload.syllabus.map((i: unknown) =>
          typeof i === "string" ? i :
          (typeof i === "object" && i !== null)
            ? String((i as Record<string,unknown>).title || (i as Record<string,unknown>).name || "")
            : String(i)
        ).filter(Boolean);

        if (items.length > 0) {
          // Only fill if empty — don't overwrite manually-edited content
          if (!payload.detailed_syllabus_html && !payload.full_description) {
            const html = "<ol>\n" + items.map(t => `  <li>${t}</li>`).join("\n") + "\n</ol>";
            payload.detailed_syllabus_html = html;
            payload.full_description = html;
          }
          if (!payload.concise_syllabus && !payload.short_description) {
            const shown = items.slice(0, 4).join(", ");
            const extra = items.length > 4 ? ` and ${items.length - 4} more topics` : "";
            const concise = `Modules covered: ${shown}${extra}.`;
            payload.concise_syllabus = concise;
            payload.short_description = concise;
          }
        }
      }

      // thumbnail_url ↔ og_image_url
      if (!payload.og_image_url && payload.thumbnail_url) {
        payload.og_image_url = payload.thumbnail_url;
      }
      if (payload.og_image_url && !payload.thumbnail_url) {
        payload.thumbnail_url = payload.og_image_url;
      }

      // syllabus_pdf_url / brochure_pdf_url ↔ brochure_url
      const pdfUrl = payload.brochure_url || payload.brochure_pdf_url || payload.syllabus_pdf_url || null;
      if (pdfUrl) {
        payload.brochure_url    = pdfUrl;
        payload.brochure_pdf_url = pdfUrl;
        payload.syllabus_pdf_url = pdfUrl;
      }

      // video_url ↔ youtube_url
      if (!payload.youtube_url && payload.video_url) {
        payload.youtube_url = payload.video_url;
      }
      if (payload.youtube_url && !payload.video_url) {
        payload.video_url = payload.youtube_url;
      }
    }

    // Auto-derive platform / video_id / thumbnail for youtube_videos
    if (tableName === "youtube_videos") {
      const { detectPlatform, extractVideoId, deriveThumbnail } = await import("@/lib/videoUtils");
      const url: string = (payload.video_url || payload.video_id || "").trim();
      const platform = (payload.platform && String(payload.platform).trim())
        ? String(payload.platform).toLowerCase()
        : detectPlatform(url);
      payload.platform = platform;
      if (!payload.video_id || !String(payload.video_id).trim()) {
        payload.video_id = extractVideoId(url, platform as any) || url;
      }
      if (!payload.thumbnail_url || !String(payload.thumbnail_url).trim()) {
        const thumb = deriveThumbnail(url, platform as any, null);
        if (thumb && thumb !== "/placeholder.svg") payload.thumbnail_url = thumb;
      }
    }

    if (isNew) {
      const { error } = await supabase.from(tableName).insert(payload as any);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from(tableName).update(payload as any).eq("id", editItem.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: isNew ? "Created" : "Updated", description: `${config?.label} saved successfully.` });
    setEditItem(null);
    setIsNew(false);
    fetchData();
    invalidatePublicQueries(queryClient, tableName);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    const { error } = await supabase.from(tableName).delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Deleted" });
    fetchData();
    invalidatePublicQueries(queryClient, tableName);
  };

  const openNew = () => {
    const item: any = {};
    config?.fields.forEach(f => {
      if (f.type === "boolean") item[f.key] = true;
      else if (f.type === "number") item[f.key] = 0;
      else if (f.type === "json") item[f.key] = "[]";
      else item[f.key] = "";
    });
    setEditItem(item);
    setIsNew(true);
  };

  const filteredData = useMemo(() => {
    let filtered = data;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = data.filter(row =>
        Object.values(row).some(v => String(v).toLowerCase().includes(q))
      );
    }
    return [...filtered].sort((a, b) => {
      const aVal = a[sortField] ?? "";
      const bVal = b[sortField] ?? "";
      if (typeof aVal === "number" && typeof bVal === "number") return sortAsc ? aVal - bVal : bVal - aVal;
      return sortAsc ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });
  }, [data, searchQuery, sortField, sortAsc]);

  const toggleSort = (field: string) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  if (!config) return <div className="p-8">Unknown table</div>;

  // Pick display columns (first 4-5 important ones)
  const displayFields = config.fields.slice(0, 5);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="p-2 hover:bg-muted rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </Link>
            <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-accent-foreground" />
            </div>
            <span className="font-heading font-bold text-lg text-foreground">{config.label}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="default" size="sm" asChild className="bg-rose-500 hover:bg-rose-600 text-white"><Link to="/admin/crm_faculties"><UserCog className="w-4 h-4 mr-1" /> Faculty</Link></Button>
            <Button variant="outline" size="sm" asChild><Link to="/"><Eye className="w-4 h-4 mr-1" /> View Site</Link></Button>
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="w-4 h-4 mr-1" /> Sign Out</Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 bg-background" />
          </div>
          {config.canCreate && (
            <Button onClick={openNew} className="gradient-accent text-accent-foreground border-0">
              <Plus className="w-4 h-4 mr-1" /> Add New
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full" /></div>
        ) : (
          <div className="glass rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {displayFields.map(f => (
                      <th key={f.key} className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => toggleSort(f.key)}>
                        <span className="inline-flex items-center gap-1">
                          {f.label}
                          {sortField === f.key && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </span>
                      </th>
                    ))}
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map(row => (
                    <tr key={row.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      {displayFields.map(f => (
                        <td key={f.key} className="px-4 py-3 text-foreground max-w-[200px] truncate">
                          {f.type === "boolean" ? (
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${row[f.key] ? "bg-green-500/20 text-green-600" : "bg-red-500/20 text-red-500"}`}>
                              {row[f.key] ? "Yes" : "No"}
                            </span>
                          ) : f.type === "json" ? (
                            <span className="text-xs text-muted-foreground">[JSON]</span>
                          ) : (
                            String(row[f.key] ?? "")
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1 items-center">
                          {/* WhatsApp direct message button — shows for leads table when phone exists */}
                          {table === "leads" && row.phone && (
                            <>
                              <Button size="sm" variant="ghost" asChild title="Call">
                                <a href={`tel:${row.phone}`}>
                                  <Phone className="w-4 h-4 text-blue-500" />
                                </a>
                              </Button>
                              <Button size="sm" variant="ghost" asChild title="Send WhatsApp message">
                                <a
                                  href={`https://wa.me/91${row.phone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(`Hi ${row.student_name || ""},\n\nThank you for your enquiry about *${row.course_name || "our courses"}* at ATEC Education, Gurdaspur.\n\nWe'd love to help you get started. Please let us know a convenient time to connect.\n\nRegards,\nATEC Team\n+91-7009933289`)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                                </a>
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => {
                            const item = { ...row };
                            config.fields.forEach(f => {
                              if (f.type === "json" && item[f.key] !== undefined) {
                                item[f.key] = JSON.stringify(item[f.key] ?? []);
                              }
                            });
                            setEditItem(item);
                            setIsNew(false);
                          }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          {config.canDelete && (
                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(row.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredData.length === 0 && (
                    <tr><td colSpan={displayFields.length + 1} className="px-4 py-12 text-center text-muted-foreground">No items found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={!!editItem} onOpenChange={() => { setEditItem(null); setIsNew(false); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{isNew ? "Create" : "Edit"} {config.label}</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4">
              {config.fields.map(f => (
                <div key={f.key}>
                  <label className="text-sm font-medium text-foreground mb-1 block">{f.label}{f.required && " *"}</label>
                  {f.type === "boolean" ? (
                    <Switch checked={!!editItem[f.key]} onCheckedChange={v => setEditItem({ ...editItem, [f.key]: v })} />
                  ) : f.type === "select" ? (
                    <Select value={editItem[f.key] || ""} onValueChange={v => setEditItem({ ...editItem, [f.key]: v })}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {f.options?.map(o => {
                          const val = typeof o === "string" ? o : o.value;
                          const lab = typeof o === "string" ? o : o.label;
                          return <SelectItem key={val} value={val}>{lab}</SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                  ) : f.type === "textarea" || f.type === "json" ? (
                    <Textarea
                      value={editItem[f.key] || ""}
                      onChange={e => setEditItem({ ...editItem, [f.key]: e.target.value })}
                      rows={f.type === "json" ? 6 : 3}
                      className="bg-background font-mono text-xs"
                    />
                  ) : f.type === "number" ? (
                    <Input
                      type="number"
                      value={editItem[f.key] ?? ""}
                      onChange={e => setEditItem({ ...editItem, [f.key]: Number(e.target.value) })}
                      className="bg-background"
                    />
                  ) : (
                    <Input
                      value={editItem[f.key] || ""}
                      onChange={e => setEditItem({ ...editItem, [f.key]: e.target.value })}
                      className="bg-background"
                    />
                  )}
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} className="flex-1 gradient-accent text-accent-foreground border-0">
                  <Save className="w-4 h-4 mr-1" /> Save
                </Button>
                <Button variant="outline" onClick={() => { setEditItem(null); setIsNew(false); }}>
                  <X className="w-4 h-4 mr-1" /> Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
