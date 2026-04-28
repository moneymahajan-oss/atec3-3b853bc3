import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Phone, MessageSquare, Filter } from "lucide-react";
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
import { toast } from "sonner";

type Enquiry = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  course_name_snapshot: string | null;
  source: string;
  status: string;
  priority: string;
  follow_up_date: string | null;
  assigned_to_name: string | null;
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

export default function CrmEnquiries() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("crm_enquiries")
      .select("id,name,phone,email,course_name_snapshot,source,status,priority,follow_up_date,assigned_to_name,created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data ?? []) as Enquiry[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return items.filter((e) => {
      if (status !== "all" && e.status !== status) return false;
      if (!q) return true;
      const t = q.toLowerCase();
      return (
        e.name.toLowerCase().includes(t) ||
        e.phone.includes(t) ||
        (e.email ?? "").toLowerCase().includes(t) ||
        (e.course_name_snapshot ?? "").toLowerCase().includes(t)
      );
    });
  }, [items, q, status]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enquiries"
        description="Track every prospective student from first contact to enrolment."
        actions={
          <Button onClick={() => navigate("/crm/enquiries/new")}>
            <Plus className="w-4 h-4 mr-2" /> New Enquiry
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search name, phone, email, course…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="follow_up">Follow-up</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
            <SelectItem value="junk">Junk</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Follow-up</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                No enquiries found. <Link to="/crm/enquiries/new" className="underline">Add your first one</Link>.
              </TableCell></TableRow>
            ) : filtered.map((e) => (
              <TableRow key={e.id} className="cursor-pointer" onClick={() => navigate(`/crm/enquiries/${e.id}`)}>
                <TableCell>
                  <div className="font-medium">{e.name}</div>
                  {e.email && <div className="text-xs text-muted-foreground">{e.email}</div>}
                </TableCell>
                <TableCell className="font-mono text-sm">{e.phone}</TableCell>
                <TableCell className="text-sm">{e.course_name_snapshot || "—"}</TableCell>
                <TableCell className="text-xs uppercase text-muted-foreground">{e.source}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={statusColors[e.status] || ""}>
                    {e.status.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{e.follow_up_date || "—"}</TableCell>
                <TableCell className="text-right" onClick={(ev) => ev.stopPropagation()}>
                  <div className="inline-flex gap-1">
                    <Button size="icon" variant="ghost" asChild>
                      <a href={`tel:${e.phone}`}><Phone className="w-4 h-4" /></a>
                    </Button>
                    <Button size="icon" variant="ghost" asChild>
                      <a href={`https://wa.me/${e.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                        <MessageSquare className="w-4 h-4" />
                      </a>
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
