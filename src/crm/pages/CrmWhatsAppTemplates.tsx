import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "../components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useCrmAuth } from "../hooks/useCrmAuth";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { logAudit } from "../lib/audit";

interface Template {
  id: string;
  template_key: string;
  name: string;
  category: string;
  body: string;
  variables: string[];
  is_active: boolean;
}

export default function CrmWhatsAppTemplates() {
  const { isAdmin, hasAccess } = useCrmAuth();
  const [list, setList] = useState<Template[]>([]);
  const [editing, setEditing] = useState<Template | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("crm_whatsapp_templates").select("*").order("category").order("name");
    setList(((data ?? []) as unknown) as Template[]);
  };
  useEffect(() => { if (hasAccess) load(); }, [hasAccess]);

  const startNew = () => {
    setEditing({ id: "", template_key: "", name: "", category: "general", body: "", variables: [], is_active: true });
    setOpen(true);
  };

  const startEdit = (t: Template) => { setEditing({ ...t }); setOpen(true); };

  const save = async () => {
    if (!editing) return;
    if (!editing.template_key || !editing.name || !editing.body) {
      toast.error("Key, name and body are required");
      return;
    }
    // Auto-extract {variables}
    const vars = Array.from(editing.body.matchAll(/\{([a-zA-Z0-9_]+)\}/g)).map((m) => m[1]);
    const uniqueVars = Array.from(new Set(vars));
    const payload = { ...editing, variables: uniqueVars as unknown as string[] };
    if (editing.id) {
      const { error } = await supabase.from("crm_whatsapp_templates").update({
        template_key: payload.template_key,
        name: payload.name,
        category: payload.category,
        body: payload.body,
        variables: payload.variables,
        is_active: payload.is_active,
      }).eq("id", editing.id);
      if (error) return toast.error(error.message);
      logAudit("update", "wa_template", editing.id);
    } else {
      const { error } = await supabase.from("crm_whatsapp_templates").insert({
        template_key: payload.template_key,
        name: payload.name,
        category: payload.category,
        body: payload.body,
        variables: payload.variables,
        is_active: payload.is_active,
      });
      if (error) return toast.error(error.message);
      logAudit("create", "wa_template", payload.template_key);
    }
    toast.success("Template saved");
    setOpen(false);
    load();
  };

  return (
    <div>
      <PageHeader
        title="WhatsApp Templates"
        description="All wa.me messages sent from the CRM use these templates. Variables like {name} are filled in automatically."
        actions={isAdmin && <Button onClick={startNew}><Plus className="w-4 h-4 mr-1" /> New template</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {list.map((t) => (
          <div key={t.id} className="bg-card border rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-heading font-bold">{t.name}</span>
                  {!t.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Inactive</span>}
                </div>
                <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{t.template_key}</code>
                <span className="text-[10px] text-muted-foreground ml-2">{t.category}</span>
              </div>
              {isAdmin && (
                <Button size="icon" variant="ghost" onClick={() => startEdit(t)}><Pencil className="w-4 h-4" /></Button>
              )}
            </div>
            <pre className="text-xs whitespace-pre-wrap bg-muted/40 rounded p-3 max-h-48 overflow-y-auto">{t.body}</pre>
            {t.variables?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {t.variables.map((v) => (
                  <span key={v} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">{`{${v}}`}</span>
                ))}
              </div>
            )}
          </div>
        ))}
        {list.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground py-12">No templates yet.</div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit template" : "New template"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Template key</Label>
                  <Input value={editing.template_key} onChange={(e) => setEditing({ ...editing, template_key: e.target.value.toUpperCase().replace(/\s/g, "_") })} placeholder="ENQUIRY_WELCOME" />
                </div>
                <div className="space-y-1.5">
                  <Label>Display name</Label>
                  <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Input value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                  <Label>Active</Label>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Body — use <code className="bg-muted px-1 rounded">{"{variable}"}</code> placeholders</Label>
                <Textarea rows={14} className="font-mono text-xs" value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
