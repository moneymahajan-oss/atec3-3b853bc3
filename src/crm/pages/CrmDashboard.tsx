import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "../components/PageHeader";
import { BookOpen, MessageSquare, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCrmAuth } from "../hooks/useCrmAuth";

export default function CrmDashboard() {
  const { isAdmin } = useCrmAuth();
  const [counts, setCounts] = useState({ courses: 0, templates: 0, waLogs: 0 });

  useEffect(() => {
    (async () => {
      const [c, t, w] = await Promise.all([
        supabase.from("crm_courses").select("id", { count: "exact", head: true }),
        supabase.from("crm_whatsapp_templates").select("id", { count: "exact", head: true }),
        supabase.from("crm_whatsapp_logs").select("id", { count: "exact", head: true }),
      ]);
      setCounts({ courses: c.count ?? 0, templates: t.count ?? 0, waLogs: w.count ?? 0 });
    })();
  }, []);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Welcome to ATEC CRM. Phase 1 is live — Courses, WhatsApp Templates and Settings are ready."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard icon={BookOpen} label="Active courses" value={counts.courses} to="/crm/courses" />
        <KpiCard icon={MessageSquare} label="WA templates" value={counts.templates} to="/crm/whatsapp" />
        <KpiCard icon={Users} label="WA links sent" value={counts.waLogs} to="/crm/courses" />
        <KpiCard icon={Wallet} label="Pending fees" value="—" to="#" />
      </div>

      <div className="bg-card border rounded-2xl p-5 mb-6">
        <h2 className="font-heading font-bold mb-2">Quick actions</h2>
        <div className="flex flex-wrap gap-2">
          <Button asChild><Link to="/crm/courses">Manage courses</Link></Button>
          <Button asChild variant="outline"><Link to="/crm/whatsapp">Edit WhatsApp templates</Link></Button>
          {isAdmin && <Button asChild variant="outline"><Link to="/crm/settings">Institute settings</Link></Button>}
        </div>
      </div>

      <div className="bg-muted/40 border border-dashed rounded-2xl p-5">
        <h3 className="font-heading font-semibold mb-1">Coming in Phase 2</h3>
        <p className="text-sm text-muted-foreground">
          Enquiry &amp; lead management, Student master with documents and internal notes,
          and the full WhatsApp template library (welcome, follow-ups, admission, fees, attendance,
          completion, alumni). Once Phase 1 is signed off, just ask: "build phase 2".
        </p>
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
