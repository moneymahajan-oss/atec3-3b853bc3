import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  AlertTriangle, Calendar, Cake, PhoneCall, ClipboardX,
  FileWarning, Hourglass, Loader2, MessageCircle, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "../components/PageHeader";
import { useCrmAuth } from "../hooks/useCrmAuth";
import {
  loadOverdue, loadDueSoon, loadBirthdays, loadFollowUps,
  loadLowAttendance, loadDocsPending, loadBatchEnding,
  DEFAULT_REMINDER_SETTINGS,
  type OverdueRow, type DueSoonRow, type BirthdayRow,
  type FollowUpRow, type LowAttendanceRow, type DocsPendingRow, type BatchEndingRow,
} from "../lib/reminders";
import { buildWaLink, fillTemplate, logWaSend } from "../lib/whatsapp";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const inr = (n: number) => `₹${(n ?? 0).toLocaleString("en-IN")}`;

interface TemplateMap {
  fee_due_reminder?: string;
  fee_overdue?: string;
  birthday_wish?: string;
  enquiry_followup_1?: string;
  low_attendance_alert?: string;
  admission_docs_reminder?: string;
}

export default function CrmReminders() {
  const { user, hasAccess, loading: authLoading } = useCrmAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [overdue, setOverdue] = useState<OverdueRow[]>([]);
  const [dueSoon, setDueSoon] = useState<DueSoonRow[]>([]);
  const [bdayToday, setBdayToday] = useState<BirthdayRow[]>([]);
  const [bdayWeek, setBdayWeek] = useState<BirthdayRow[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpRow[]>([]);
  const [lowAtt, setLowAtt] = useState<LowAttendanceRow[]>([]);
  const [docs, setDocs] = useState<DocsPendingRow[]>([]);
  const [batchEnd, setBatchEnd] = useState<BatchEndingRow[]>([]);
  const [templates, setTemplates] = useState<TemplateMap>({});
  const [instituteName, setInstituteName] = useState("ATEC Education");
  const [institutePhone, setInstitutePhone] = useState("");
  const [tab, setTab] = useState("overdue");

  const reload = async () => {
    setRefreshing(true);
    try {
      const [o, d, b, f, l, dp, be] = await Promise.all([
        loadOverdue(),
        loadDueSoon(),
        loadBirthdays(),
        loadFollowUps(),
        loadLowAttendance(DEFAULT_REMINDER_SETTINGS.attendanceThreshold),
        loadDocsPending(),
        loadBatchEnding(DEFAULT_REMINDER_SETTINGS.batchEndingWindow),
      ]);
      setOverdue(o); setDueSoon(d); setBdayToday(b.today); setBdayWeek(b.week);
      setFollowUps(f); setLowAtt(l); setDocs(dp); setBatchEnd(be);
    } catch (err: any) {
      toast({ title: "Could not load reminders", description: err.message, variant: "destructive" });
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasAccess) return;
    (async () => {
      const [tpl, settings] = await Promise.all([
        supabase.from("crm_whatsapp_templates").select("template_key, body").eq("is_active", true),
        supabase.from("crm_institute_settings").select("name, phone, whatsapp_number").maybeSingle(),
      ]);
      const map: TemplateMap = {};
      (tpl.data ?? []).forEach((t: any) => { (map as any)[t.template_key] = t.body; });
      setTemplates(map);
      if (settings.data) {
        setInstituteName(settings.data.name || "ATEC Education");
        setInstitutePhone(settings.data.phone || settings.data.whatsapp_number || "");
      }
      reload();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAccess]);

  const sendWa = async (
    phone: string,
    name: string,
    template_key: keyof TemplateMap,
    vars: Record<string, any>,
    entity_type?: string,
    entity_id?: string,
  ) => {
    const body = templates[template_key];
    if (!body) {
      toast({ title: "Template missing", description: `No active template for "${template_key}"`, variant: "destructive" });
      return;
    }
    const message = fillTemplate(body, { ...vars, institute_name: instituteName, phone: institutePhone });
    const link = buildWaLink(phone, message);
    window.open(link, "_blank");
    await logWaSend({
      template_key: template_key as string,
      contact_number: phone,
      contact_name: name,
      message_snapshot: message,
      entity_type, entity_id,
    });
  };

  const counts = useMemo(() => ({
    overdue: overdue.length,
    dueSoon: dueSoon.length,
    bday: bdayToday.length,
    follow: followUps.length,
    low: lowAtt.length,
    docs: docs.length,
    batch: batchEnd.length,
    total:
      overdue.length + dueSoon.length + bdayToday.length + followUps.length +
      lowAtt.length + docs.length + batchEnd.length,
  }), [overdue, dueSoon, bdayToday, followUps, lowAtt, docs, batchEnd]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <Helmet><title>Reminders · ATEC CRM</title></Helmet>
      <PageHeader
        title="Reminders"
        description={
          counts.total === 0
            ? "All clear! No active reminders right now."
            : `${counts.total} action${counts.total === 1 ? "" : "s"} need attention across ${
                [counts.overdue, counts.dueSoon, counts.bday, counts.follow, counts.low, counts.docs, counts.batch]
                  .filter((c) => c > 0).length
              } categories.`
        }
        actions={
          <Button variant="outline" onClick={reload} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="mt-2">
        <TabsList className="flex flex-wrap h-auto justify-start gap-1 bg-muted/40 p-1">
          <TabPill value="overdue" icon={AlertTriangle} label="Fee Overdue" count={counts.overdue} tone="rose" />
          <TabPill value="due_soon" icon={Hourglass} label="Due Soon" count={counts.dueSoon} tone="amber" />
          <TabPill value="birthday" icon={Cake} label="Birthdays" count={counts.bday} tone="pink" />
          <TabPill value="followup" icon={PhoneCall} label="Follow-up" count={counts.follow} tone="sky" />
          <TabPill value="attendance" icon={ClipboardX} label="Low Attendance" count={counts.low} tone="orange" />
          <TabPill value="docs" icon={FileWarning} label="Docs Pending" count={counts.docs} tone="slate" />
          <TabPill value="batch" icon={Calendar} label="Batch Ending" count={counts.batch} tone="violet" />
        </TabsList>

        {/* OVERDUE */}
        <TabsContent value="overdue" className="mt-4">
          <Empty when={overdue.length === 0} label="No overdue installments. Great job!" />
          {overdue.length > 0 && (
            <ReminderTable
              headers={["Student", "Course", "Inst.", "Amount", "Due", "Days Late", ""]}
              rows={overdue.map((r) => [
                <Link to={`/crm/fees/${r.student_id}`} className="font-medium hover:underline">{r.student_name}</Link>,
                <span className="text-muted-foreground">{r.course ?? "—"}</span>,
                `#${r.installment_no}`,
                <span className="font-mono">{inr(r.amount - r.amount_paid)}</span>,
                <span className="text-xs">{r.due_date}</span>,
                <Badge variant="destructive">{r.days_overdue}d</Badge>,
                <Button size="sm" variant="outline" onClick={() => sendWa(
                  r.phone, r.student_name, "fee_overdue",
                  { name: r.student_name, installment_no: r.installment_no, amount: inr(r.amount - r.amount_paid), due_date: r.due_date, course_name: r.course ?? "" },
                  "fee_plan", r.id,
                )}>
                  <MessageCircle className="w-3.5 h-3.5 mr-1" /> Send
                </Button>,
              ])}
            />
          )}
        </TabsContent>

        {/* DUE SOON */}
        <TabsContent value="due_soon" className="mt-4">
          <Empty when={dueSoon.length === 0} label="No installments due in the next few days." />
          {dueSoon.length > 0 && (
            <ReminderTable
              headers={["Student", "Course", "Inst.", "Amount", "Due", "Days Left", ""]}
              rows={dueSoon.map((r) => [
                <Link to={`/crm/fees/${r.student_id}`} className="font-medium hover:underline">{r.student_name}</Link>,
                <span className="text-muted-foreground">{r.course ?? "—"}</span>,
                `#${r.installment_no}`,
                <span className="font-mono">{inr(r.amount - r.amount_paid)}</span>,
                <span className="text-xs">{r.due_date}</span>,
                <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/15">in {r.days_left}d</Badge>,
                <Button size="sm" variant="outline" onClick={() => sendWa(
                  r.phone, r.student_name, "fee_due_reminder",
                  { name: r.student_name, installment_no: r.installment_no, amount: inr(r.amount - r.amount_paid), due_date: r.due_date, course_name: r.course ?? "" },
                  "fee_plan", r.id,
                )}>
                  <MessageCircle className="w-3.5 h-3.5 mr-1" /> Remind
                </Button>,
              ])}
            />
          )}
        </TabsContent>

        {/* BIRTHDAYS */}
        <TabsContent value="birthday" className="mt-4 space-y-6">
          <div>
            <h3 className="font-heading font-semibold mb-2 flex items-center gap-2">
              <Cake className="w-4 h-4 text-pink-500" /> Today
            </h3>
            <Empty when={bdayToday.length === 0} label="No birthdays today." />
            {bdayToday.length > 0 && (
              <ReminderTable
                headers={["Student", "Course", "Turning", ""]}
                rows={bdayToday.map((r) => [
                  <Link to={`/crm/students/${r.id}`} className="font-medium hover:underline">{r.full_name}</Link>,
                  <span className="text-muted-foreground">{r.course ?? "—"}</span>,
                  <Badge className="bg-pink-500/15 text-pink-700 hover:bg-pink-500/15">{r.age + 1}</Badge>,
                  <Button size="sm" variant="outline" onClick={() => sendWa(
                    r.phone, r.full_name, "birthday_wish",
                    { name: r.full_name }, "student", r.id,
                  )}>
                    <MessageCircle className="w-3.5 h-3.5 mr-1" /> Wish
                  </Button>,
                ])}
              />
            )}
          </div>
          <div>
            <h3 className="font-heading font-semibold mb-2 text-muted-foreground">This week</h3>
            <Empty when={bdayWeek.length === 0} label="No birthdays in the next 7 days." />
            {bdayWeek.length > 0 && (
              <ReminderTable
                headers={["Student", "Course", "Birthday"]}
                rows={bdayWeek.map((r) => [
                  <Link to={`/crm/students/${r.id}`} className="font-medium hover:underline">{r.full_name}</Link>,
                  <span className="text-muted-foreground">{r.course ?? "—"}</span>,
                  <span className="text-xs">{r.dob}</span>,
                ])}
              />
            )}
          </div>
        </TabsContent>

        {/* FOLLOW-UP */}
        <TabsContent value="followup" className="mt-4">
          <Empty when={followUps.length === 0} label="No follow-ups due." />
          {followUps.length > 0 && (
            <ReminderTable
              headers={["Enquiry", "Course", "Stage", "Due", "Counsellor", ""]}
              rows={followUps.map((r) => [
                <Link to={`/crm/enquiries/${r.id}`} className="font-medium hover:underline">{r.name}</Link>,
                <span className="text-muted-foreground">{r.course ?? "—"}</span>,
                <Badge variant="outline" className="capitalize">{r.status.replace(/_/g, " ")}</Badge>,
                <span className="text-xs">
                  {r.follow_up_date}
                  {r.days_overdue > 0 && <span className="ml-1 text-rose-600">({r.days_overdue}d late)</span>}
                </span>,
                <span className="text-xs text-muted-foreground">{r.assigned_to_name ?? "—"}</span>,
                <div className="flex gap-1">
                  <a href={`tel:${r.phone.replace(/\D/g, "")}`}>
                    <Button size="sm" variant="outline"><PhoneCall className="w-3.5 h-3.5" /></Button>
                  </a>
                  <Button size="sm" variant="outline" onClick={() => sendWa(
                    r.phone, r.name, "enquiry_followup_1",
                    { name: r.name, course_name: r.course ?? "" }, "enquiry", r.id,
                  )}>
                    <MessageCircle className="w-3.5 h-3.5 mr-1" /> WA
                  </Button>
                </div>,
              ])}
            />
          )}
        </TabsContent>

        {/* LOW ATTENDANCE */}
        <TabsContent value="attendance" className="mt-4">
          <Empty when={lowAtt.length === 0} label="All students above the attendance threshold." />
          {lowAtt.length > 0 && (
            <ReminderTable
              headers={["Student", "Course", "Attendance", "Sessions", ""]}
              rows={lowAtt.map((r) => [
                <Link to={`/crm/students/${r.student_id}`} className="font-medium hover:underline">{r.full_name}</Link>,
                <span className="text-muted-foreground">{r.course ?? "—"}</span>,
                <Badge className="bg-orange-500/15 text-orange-700 hover:bg-orange-500/15">{r.attendance_pct}%</Badge>,
                <span className="text-xs">{r.attended}/{r.total_sessions}</span>,
                <Button size="sm" variant="outline" onClick={() => sendWa(
                  r.phone, r.full_name, "low_attendance_alert",
                  { name: r.full_name, parent_name: "Parent", student_name: r.full_name, course_name: r.course ?? "", attendance_percent: r.attendance_pct },
                  "student", r.student_id,
                )}>
                  <MessageCircle className="w-3.5 h-3.5 mr-1" /> Alert
                </Button>,
              ])}
            />
          )}
        </TabsContent>

        {/* DOCS PENDING */}
        <TabsContent value="docs" className="mt-4">
          <Empty when={docs.length === 0} label="All active students have full documents on file." />
          {docs.length > 0 && (
            <ReminderTable
              headers={["Student", "Course", "Missing", ""]}
              rows={docs.map((r) => [
                <Link to={`/crm/students/${r.id}`} className="font-medium hover:underline">{r.full_name}</Link>,
                <span className="text-muted-foreground">{r.course ?? "—"}</span>,
                <div className="flex flex-wrap gap-1">
                  {r.missing.map((m) => (
                    <Badge key={m} variant="outline" className="text-xs">{m}</Badge>
                  ))}
                </div>,
                <Button size="sm" variant="outline" onClick={() => sendWa(
                  r.phone, r.full_name, "admission_docs_reminder",
                  { name: r.full_name }, "student", r.id,
                )}>
                  <MessageCircle className="w-3.5 h-3.5 mr-1" /> Remind
                </Button>,
              ])}
            />
          )}
        </TabsContent>

        {/* BATCH ENDING */}
        <TabsContent value="batch" className="mt-4">
          <Empty when={batchEnd.length === 0} label="No batches ending in the next two weeks." />
          {batchEnd.length > 0 && (
            <ReminderTable
              headers={["Batch", "Course", "End Date", "Days Left", "Students", ""]}
              rows={batchEnd.map((r) => [
                <Link to={`/crm/batches`} className="font-medium hover:underline">{r.name}</Link>,
                <span className="text-muted-foreground">{r.course ?? "—"}</span>,
                <span className="text-xs">{r.end_date}</span>,
                <Badge className="bg-violet-500/15 text-violet-700 hover:bg-violet-500/15">in {r.days_left}d</Badge>,
                <span className="font-mono text-sm">{r.student_count}</span>,
                <Link to="/crm/certificates">
                  <Button size="sm" variant="outline">Generate Certs</Button>
                </Link>,
              ])}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TabPill({ value, icon: Icon, label, count, tone }: {
  value: string; icon: typeof AlertTriangle; label: string; count: number;
  tone: "rose" | "amber" | "pink" | "sky" | "orange" | "slate" | "violet";
}) {
  const toneMap: Record<string, string> = {
    rose: "data-[state=active]:bg-rose-500/15 data-[state=active]:text-rose-700",
    amber: "data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-700",
    pink: "data-[state=active]:bg-pink-500/15 data-[state=active]:text-pink-700",
    sky: "data-[state=active]:bg-sky-500/15 data-[state=active]:text-sky-700",
    orange: "data-[state=active]:bg-orange-500/15 data-[state=active]:text-orange-700",
    slate: "data-[state=active]:bg-slate-500/15 data-[state=active]:text-slate-700",
    violet: "data-[state=active]:bg-violet-500/15 data-[state=active]:text-violet-700",
  };
  return (
    <TabsTrigger value={value} className={`gap-1.5 ${toneMap[tone]}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
      {count > 0 && (
        <span className="ml-1 inline-flex items-center justify-center rounded-full bg-foreground text-background text-[10px] min-w-[18px] h-[18px] px-1">
          {count}
        </span>
      )}
    </TabsTrigger>
  );
}

function ReminderTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>{headers.map((h, i) => <TableHead key={i}>{h}</TableHead>)}</TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((cells, i) => (
            <TableRow key={i}>
              {cells.map((c, j) => <TableCell key={j}>{c}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function Empty({ when, label }: { when: boolean; label: string }) {
  if (!when) return null;
  return (
    <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}
