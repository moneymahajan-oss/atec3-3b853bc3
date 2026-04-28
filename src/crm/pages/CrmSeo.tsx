import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "../components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { useCrmAuth } from "../hooks/useCrmAuth";

interface SeoRow {
  id: string;
  page_path: string;
  title: string | null;
  description: string | null;
  keywords: string | null;
  og_image_url: string | null;
  canonical_url: string | null;
  json_ld: any;
  is_active: boolean;
}

const empty: Partial<SeoRow> = {
  page_path: "", title: "", description: "", keywords: "",
  og_image_url: "", canonical_url: "", is_active: true,
};

export default function CrmSeo() {
  const { isAdmin } = useCrmAuth();
  const [rows, setRows] = useState<SeoRow[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<SeoRow>>(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase.from("crm_seo_meta").select("*").order("page_path");
    setRows((data as any) || []);
  }
  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r =>
    !search || r.page_path.toLowerCase().includes(search.toLowerCase()) ||
    (r.title || "").toLowerCase().includes(search.toLowerCase())
  );

  async function handleSave() {
    if (!editing.page_path?.trim()) { toast.error("Page path is required"); return; }
    setSaving(true);
    try {
      const payload = {
        page_path: editing.page_path.trim(),
        title: editing.title || null,
        description: editing.description || null,
        keywords: editing.keywords || null,
        og_image_url: editing.og_image_url || null,
        canonical_url: editing.canonical_url || null,
        is_active: editing.is_active ?? true,
      };
      const { error } = editing.id
        ? await supabase.from("crm_seo_meta").update(payload).eq("id", editing.id)
        : await supabase.from("crm_seo_meta").insert(payload);
      if (error) throw error;
      toast.success("Saved");
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally { setSaving(false); }
  }

  async function handleDelete(r: SeoRow) {
    if (!confirm(`Delete SEO entry for ${r.page_path}?`)) return;
    await supabase.from("crm_seo_meta").delete().eq("id", r.id);
    load();
  }

  if (!isAdmin) {
    return (
      <div className="p-8">
        <PageHeader title="SEO Meta" />
        <Card className="p-8 text-center text-muted-foreground">Admin access required</Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="SEO Meta"
        description="Per-page meta titles, descriptions, OG images and canonical URLs."
        actions={
          <Button onClick={() => { setEditing(empty); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> New Page
          </Button>
        }
      />

      <Card className="p-4">
        <div className="relative max-w-md mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search pages..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="space-y-2">
          {filtered.map(r => (
            <div key={r.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border hover:bg-muted/30">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono px-2 py-0.5 rounded bg-muted">{r.page_path}</code>
                  {!r.is_active && <span className="text-[10px] uppercase text-muted-foreground">inactive</span>}
                </div>
                <div className="font-medium mt-1 truncate">{r.title || <span className="text-muted-foreground italic">No title</span>}</div>
                <div className="text-sm text-muted-foreground line-clamp-2">{r.description}</div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(r)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">No SEO entries</div>
          )}
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing.id ? "Edit" : "New"} SEO Entry</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Page Path *</Label>
              <Input
                placeholder="/courses/digital-marketing"
                value={editing.page_path || ""}
                onChange={e => setEditing({ ...editing, page_path: e.target.value })}
              />
            </div>
            <div>
              <Label>Title (under 60 chars)</Label>
              <Input value={editing.title || ""} onChange={e => setEditing({ ...editing, title: e.target.value })} />
              <div className="text-xs text-muted-foreground mt-1">{(editing.title || "").length}/60</div>
            </div>
            <div>
              <Label>Description (under 160 chars)</Label>
              <Textarea rows={3} value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })} />
              <div className="text-xs text-muted-foreground mt-1">{(editing.description || "").length}/160</div>
            </div>
            <div>
              <Label>Keywords (comma separated)</Label>
              <Input value={editing.keywords || ""} onChange={e => setEditing({ ...editing, keywords: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>OG Image URL</Label>
                <Input value={editing.og_image_url || ""} onChange={e => setEditing({ ...editing, og_image_url: e.target.value })} />
              </div>
              <div>
                <Label>Canonical URL</Label>
                <Input value={editing.canonical_url || ""} onChange={e => setEditing({ ...editing, canonical_url: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={editing.is_active ?? true} onCheckedChange={v => setEditing({ ...editing, is_active: v })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
