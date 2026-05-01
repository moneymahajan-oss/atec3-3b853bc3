import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getStudentEnrolments, type Enrolment } from "../lib/enrolments";

export function EnrolmentsCard({ studentId }: { studentId: string }) {
  const [rows, setRows] = useState<Enrolment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getStudentEnrolments(studentId).then((r) => {
      if (alive) {
        setRows(r);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [studentId]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <GraduationCap className="w-4 h-4" /> Courses enrolled ({rows.length})
        </CardTitle>
        <Button asChild size="sm" variant="secondary">
          <Link to={`/crm/students/${studentId}/add-course`}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add another course
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {!loading && rows.length === 0 && (
          <div className="text-sm text-muted-foreground">No enrolments yet.</div>
        )}
        {rows.map((e) => (
          <div key={e.id} className="flex items-center gap-2 text-sm border rounded-md px-2 py-1.5 flex-wrap">
            <Badge
              variant={e.status === "active" ? "default" : "secondary"}
              className="capitalize text-[10px]"
            >
              {e.status.replace("_", " ")}
            </Badge>
            <span className="font-medium truncate">{e.course_name_snapshot || "—"}</span>
            <span className="text-muted-foreground text-xs">{e.enrolment_no}</span>
            <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
              ₹{(e.net_payable_fee ?? e.total_fee).toLocaleString()} · {new Date(e.enrolment_date).toLocaleDateString()}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
