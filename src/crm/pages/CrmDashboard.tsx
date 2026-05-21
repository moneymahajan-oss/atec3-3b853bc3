import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "../components/PageHeader";
import { BellRing, BookOpen, Cake, MessageSquare, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCrmAuth } from "../hooks/useCrmAuth";
import { loadAllReminderCounts, type ReminderCounts } from "../lib/reminders";

export default function CrmDashboard() {
  const { isAdmin, hasAccess } = useCrmAuth();
  const [counts, setCounts] = useState({ courses: 0, templates: 0, students: 0, enquiries: 0 });
  const [reminders, setReminders] = useState<ReminderCounts | null>(null);

  useEffect(() => {
    if (!hasAccess) return;
    (async () => {
      const [c, t, s, e] = await Promise.all([
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("crm_whatsapp_templates").select("id", { count: "exact", head: true }),
        supabase.from("crm_students").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("crm_enquiries").select("id", { count: "exact", head: true })
          .not("status", "in", "(converted,lost)"),
      ]);
      setCounts({
        courses: c.count ?? 0,
        templates: t.count ?? 0,
        students: s.count ?? 0,
        enquiries: e.count ?? 0,
      });
      try { setReminders(await loadAllReminderCounts()); } catch { /* ignore */ }
    })();
  }, [hasAccess]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Welcome back. Here's what's happening at ATEC today."
      />

      {reminders && reminders.total > 0 && (
        <Link
          to="/crm/reminders"
          className="block mb-6 rounded-2xl border bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-pink-500/10 p-5 hover:shadow-md transition-all"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
              <BellRing className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-heading font-bold text-lg">{reminders.total} active reminders</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500 text-white font-semibold">Action needed</span>
              </div>
              <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
                {reminders.overdue > 0 && <span>🔴 {reminders.overdue} fee overdue</span>}
                {reminders.dueSoon > 0 && <span>🟡 {reminders.dueSoon} due soon</span>}
                {reminders.birthdaysToday > 0 && <span>🎂 {reminders.birthdaysToday} birthday{reminders.birthdaysToday !== 1 && "s"} today</span>}
                {reminders.followUp > 0 && <span>📞 {reminders.followUp} follow-up{reminders.followUp !== 1 && "s"}</span>}
                {reminders.lowAttendance > 0 && <span>⚠️ {reminders.lowAttendance} low attendance</span>}
                {reminders.docsPending > 0 && <span>📋 {reminders.docsPending} docs pending</span>}
                {reminders.batchEnding > 0 && <span>🎓 {reminders.batchEnding} batch{reminders.batchEnding !== 1 && "es"} ending</span>}
              </div>
            </div>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard icon={Users} label="Open enquiries" value={counts.enquiries} to="/crm/enquiries" />
        <KpiCard icon={BookOpen} label="Active students" value={counts.students} to="/crm/students" />
        <KpiCard icon={Wallet} label="Pending fees" value={reminders ? reminders.overdue + reminders.dueSoon : "—"} to="/crm/reminders" />
        <KpiCard icon={Cake} label="Birthdays today" value={reminders?.birthdaysToday ?? "—"} to="/crm/reminders" />
      </div>

      <div className="bg-card border rounded-2xl p-5">
        <h2 className="font-heading font-bold mb-2">Quick actions</h2>
        <div className="flex flex-wrap gap-2">
          <Button asChild><Link to="/crm/enquiries">New enquiry</Link></Button>
          <Button asChild variant="outline"><Link to="/crm/students">New student</Link></Button>
          <Button asChild variant="outline"><Link to="/crm/fees">Collect fee</Link></Button>
          <Button asChild variant="outline"><Link to="/crm/attendance">Mark attendance</Link></Button>
          <Button asChild variant="outline"><Link to="/crm/whatsapp"><MessageSquare className="w-4 h-4 mr-1.5" />WA templates</Link></Button>
          {isAdmin && <Button asChild variant="ghost"><Link to="/crm/settings">Settings</Link></Button>}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, to }: {
  icon: typeof BookOpen; label: string; value: number | string; to: string;
}) {
  return (
    <Link to={to} className="bg-card border rounded-2xl p-5 hover:shadow-md transition-all flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="text-2xl font-heading font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </Link>
  );
}
