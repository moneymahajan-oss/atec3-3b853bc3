import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Filter, Phone, User, RotateCcw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

type Student = {
  id: string;
  enrolment_no: string | null;
  full_name: string;
  phone: string;
  course_name_snapshot: string | null;
  enrolment_date: string;
  status: string;
  total_fee: number;
  photo_url: string | null;
};

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  completed: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  dropped: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  on_hold: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

export default function CrmStudents() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("crm_students")
        .select("id,enrolment_no,full_name,phone,course_name_snapshot,enrolment_date,status,total_fee,photo_url")
        .order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      setItems((data ?? []) as Student[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => items.filter((s) => {
    if (status !== "all" && s.status !== status) return false;
    if (!q) return true;
    const t = q.toLowerCase();
    return (
      s.full_name.toLowerCase().includes(t) ||
      s.phone.includes(t) ||
      (s.enrolment_no ?? "").toLowerCase().includes(t) ||
      (s.course_name_snapshot ?? "").toLowerCase().includes(t)
    );
  }), [items, q, status]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Master record of every enrolled student."
        actions={
          <Button onClick={() => navigate("/crm/students/new")}>
            <Plus className="w-4 h-4 mr-2" /> New Student
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search name, phone, enrolment no, course…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-48"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="on_hold">On hold</SelectItem>
            <SelectItem value="dropped">Dropped</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Enrolment №</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Fee</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                No students yet. <Link to="/crm/students/new" className="underline">Add one</Link>.
              </TableCell></TableRow>
            ) : filtered.map((s) => {
              const initials = s.full_name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
              return (
              <TableRow key={s.id} className="cursor-pointer" onClick={() => navigate(`/crm/students/${s.id}`)}>
                <TableCell className="font-mono text-xs">{s.enrolment_no ?? "—"}</TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      {s.photo_url ? <AvatarImage src={s.photo_url} alt={s.full_name} /> : null}
                      <AvatarFallback className="text-xs">{initials || <User className="w-4 h-4" />}</AvatarFallback>
                    </Avatar>
                    <span>{s.full_name}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm flex items-center gap-1">
                  <Phone className="w-3 h-3 text-muted-foreground" /> {s.phone}
                </TableCell>
                <TableCell className="text-sm">{s.course_name_snapshot || "—"}</TableCell>
                <TableCell className="text-sm">{s.enrolment_date}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={statusColors[s.status] || ""}>{s.status.replace("_"," ")}</Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">₹{s.total_fee.toLocaleString("en-IN")}</TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
