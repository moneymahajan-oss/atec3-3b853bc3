import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "../components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Megaphone, Send, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { buildWaLink, fillTemplate, logWaSend } from "../lib/whatsapp";
import { useCrmAuth } from "../hooks/useCrmAuth";

interface Campaign {
  id: string;
  name: string;
  message_body: string;
  audience: string;
  audience_filter: any;
  status: string;
  scheduled_at: string | null;
  total_recipients: number;
  sent_count: number;
  created_at: string;
}

interface Recipient {
  id: string;
  campaign_id: string;
  contact_name: string | null;
  contact_number: string;
  message_snapshot: string;
  status: string;
  sent_at: string | null;
}

const empty = {
  name: "",
  message_body: "Hi {name}, ",
  audience: "all_enquiries" as const,
  audience_filter: {} as any,
};

export default function CrmCampaigns() {
  const { isAdmin, hasAccess } = useCrmAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<Campaign | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);

  async function load() {
    const [{ data: cs }, { data: co }, { data: bt }] = await Promise.all([
      supabase.from("crm_campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("crm_courses").select("id,name").eq("is_active", true).order("name"),
      supabase.from("crm_batches").select("id,name,course_name_snapshot").order("name"),
    ]);
    setCampaigns((cs as any) || []);
    setCourses(co || []);
    setBatches(bt || []);
  }
  useEffect(() => { if (hasAccess) load(); }, [hasAccess]);

  async function fetchAudience(audience: string, filter: any): Promise<{ name: string; phone: string; vars: Record<string,string> }[]> {
    if (audience === "all_enquiries") {
      const { data } = await supabase.from("crm_enquiries").select("name,phone,course_name_snapshot");
      return (data || []).map(d => ({ name: d.name, phone: d.phone, vars: { name: d.name, course: d.course_name_snapshot || "" } }));
    }
    if (audience === "enquiries_by_status") {
      const { data } = await supabase.from("crm_enquiries").select("name,phone,course_name_snapshot").eq("status", filter.status);
      return (data || []).map(d => ({ name: d.name, phone: d.phone, vars: { name: d.name, course: d.course_name_snapshot || "" } }));
    }
    if (audience === "all_students") {
      const { data } = await supabase.from("crm_students").select("full_name,phone,course_name_snapshot");
      return (data || []).map(d => ({ name: d.full_name, phone: d.phone, vars: { name: d.full_name, course: d.course_name_snapshot || "" } }));
    }
    if (audience === "students_by_course") {
      const { data } = await supabase.from("crm_students").select("full_name,phone,course_name_snapshot").eq("course_id", filter.course_id);
      return (data || []).map(d => ({ name: d.full_name, phone: d.phone, vars: { name: d.full_name, course: d.course_name_snapshot || "" } }));
    }
    if (audience === "students_by_batch") {
      const { data } = await supabase.from("crm_students").select("full_name,phone,course_name_snapshot").eq("batch_id", filter.batch_id);
      return (data || []).map(d => ({ name: d.full_name, phone: d.phone, vars: { name: d.full_name, course: d.course_name_snapshot || "" } }));
    }
    return [];
  }

  async function handleCreate() {
    if (!form.name?.trim() || !form.message_body?.trim()) { toast.error("Name and message required"); return; }
    setSaving(true);
    try {
      const audienceList = await fetchAudience(form.audience, form.audience_filter);
      const { data: { user } } = await supabase.auth.getUser();
      const { data: campaign, error } = await supabase.from("crm_campaigns").insert({
        name: form.name.trim(),
        message_body: form.message_body,
        audience: form.audience,
        audience_filter: form.audience_filter,
        total_recipients: audienceList.length,
        status: "draft",
        created_by: user?.id,
        created_by_name: user?.user_metadata?.full_name || user?.email || null,
      }).select("*").single();
      if (error) throw error;

      if (audienceList.length > 0) {
        const rows = audienceList.map(a => ({
          campaign_id: campaign.id,
          contact_name: a.name,
          contact_number: a.phone.replace(/\D/g, ""),
          message_snapshot: fillTemplate(form.message_body, a.vars),
          status: "pending",
        }));
        await supabase.from("crm_campaign_recipients").insert(rows);
      }
      toast.success(`Campaign created with ${audienceList.length} recipients`);
      setOpen(false);
      setForm(empty);
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally { setSaving(false); }
  }

  async function handleView(c: Campaign) {
    setViewing(c);
    const { data } = await supabase.from("crm_campaign_recipients")
      .select("*").eq("campaign_id", c.id).order("created_at");
    setRecipients((data as any) || []);
  }

  async function handleSendOne(r: Recipient) {
    await logWaSend({
      template_key: "campaign",
      contact_number: r.contact_number,
      contact_name: r.contact_name || undefined,
      message_snapshot: r.message_snapshot,
      entity_type: "campaign",
      entity_id: r.campaign_id,
    });
    await supabase.from("crm_campaign_recipients")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", r.id);
    // refresh sent count
    const { count } = await supabase.from("crm_campaign_recipients")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", r.campaign_id).eq("status", "sent");
    await supabase.from("crm_campaigns").update({
      sent_count: count || 0,
      status: "sending",
    }).eq("id", r.campaign_id);
    window.open(buildWaLink(r.contact_number, r.message_snapshot), "_blank");
    if (viewing?.id === r.campaign_id) handleView(viewing);
    load();
  }

  async function handleDelete(c: Campaign) {
    if (!confirm(`Delete campaign "${c.name}"?`)) return;
    await supabase.from("crm_campaign_recipients").delete().eq("campaign_id", c.id);
    await supabase.from("crm_campaigns").delete().eq("id", c.id);
    load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp Campaigns"
        description="Bulk-message enquiries or students with personalised templates."
        actions={
          <Button onClick={() => { setForm(empty); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> New Campaign
          </Button>
        }
      />

      <Card className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Audience</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                <Megaphone className="h-10 w-10 mx-auto mb-2 opacity-40" /> No campaigns yet
              </TableCell></TableRow>
            ) : campaigns.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell><Badge variant="outline">{c.audience.replace(/_/g, " ")}</Badge></TableCell>
                <TableCell><Badge>{c.status}</Badge></TableCell>
                <TableCell className="text-sm">{c.sent_count} / {c.total_recipients}</TableCell>
                <TableCell className="text-sm">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => handleView(c)}><Eye className="h-4 w-4" /></Button>
                  {isAdmin && (
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(c)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Create */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Campaign</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Audience</Label>
              <Select value={form.audience} onValueChange={v => setForm({ ...form, audience: v, audience_filter: {} })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_enquiries">All Enquiries</SelectItem>
                  <SelectItem value="enquiries_by_status">Enquiries by Status</SelectItem>
                  <SelectItem value="all_students">All Students</SelectItem>
                  <SelectItem value="students_by_course">Students by Course</SelectItem>
                  <SelectItem value="students_by_batch">Students by Batch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.audience === "enquiries_by_status" && (
              <div>
                <Label>Status</Label>
                <Select value={form.audience_filter.status || ""} onValueChange={v => setForm({ ...form, audience_filter: { status: v } })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["new","contacted","interested","follow_up","converted","lost"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.audience === "students_by_course" && (
              <div>
                <Label>Course</Label>
                <Select value={form.audience_filter.course_id || ""} onValueChange={v => setForm({ ...form, audience_filter: { course_id: v } })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.audience === "students_by_batch" && (
              <div>
                <Label>Batch</Label>
                <Select value={form.audience_filter.batch_id || ""} onValueChange={v => setForm({ ...form, audience_filter: { batch_id: v } })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name} — {b.course_name_snapshot}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Message Body</Label>
              <Textarea rows={6} value={form.message_body} onChange={e => setForm({ ...form, message_body: e.target.value })} />
              <div className="text-xs text-muted-foreground mt-1">Variables: <code>{"{name}"}</code>, <code>{"{course}"}</code></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Creating..." : "Create Campaign"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recipients viewer */}
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{viewing?.name}</DialogTitle></DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Send</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipients.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{r.contact_name}</TableCell>
                  <TableCell className="font-mono text-xs">{r.contact_number}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "sent" ? "default" : "secondary"}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => handleSendOne(r)}>
                      <Send className="h-3 w-3 mr-1" /> Send
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
