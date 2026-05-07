import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "../components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Award, Plus, Search, Download, Trash2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { generateCertificatePdf } from "../lib/certificatePdf";
import { buildWaLink, fillTemplate, logWaSend } from "../lib/whatsapp";
import { useCrmAuth } from "../hooks/useCrmAuth";
import { getStudentEnrolments, type Enrolment } from "../lib/enrolments";

interface Cert {
  id: string;
  certificate_no: string;
  student_id: string;
  student_name_snapshot: string | null;
  course_name_snapshot: string | null;
  enrolment_no_snapshot: string | null;
  grade: string | null;
  issued_on: string;
  template_kind: string;
  pdf_url: string | null;
}

interface StudentLite {
  id: string;
  full_name: string;
  enrolment_no: string | null;
  course_name_snapshot: string | null;
  course_id: string | null;
  phone: string;
}

export default function CrmCertificates() {
  const { isAdmin, hasAccess } = useCrmAuth();
  const [certs, setCerts] = useState<Cert[]>([]);
  const [students, setStudents] = useState<StudentLite[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [openIssue, setOpenIssue] = useState(false);
  const [issuing, setIssuing] = useState(false);

  const [studentId, setStudentId] = useState("");
  const [studentEnrolments, setStudentEnrolments] = useState<Enrolment[]>([]);
  const [enrolmentId, setEnrolmentId] = useState("");
  const [grade, setGrade] = useState("A");
  const [templateKind, setTemplateKind] = useState("computer");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));

  // Load enrolments whenever student changes (for issue dialog)
  useEffect(() => {
    if (!studentId) { setStudentEnrolments([]); setEnrolmentId(""); return; }
    getStudentEnrolments(studentId).then((rows) => {
      setStudentEnrolments(rows);
      // Auto-select sole enrolment, otherwise leave empty so user must pick
      if (rows.length === 1) setEnrolmentId(rows[0].id);
      else setEnrolmentId("");
    });
  }, [studentId]);

  async function load() {
    setLoading(true);
    const [{ data: c }, { data: s }] = await Promise.all([
      supabase.from("crm_certificates").select("*").order("created_at", { ascending: false }),
      supabase.from("crm_students").select("id,full_name,enrolment_no,course_name_snapshot,course_id,phone").order("full_name"),
    ]);
    setCerts((c as any) || []);
    setStudents((s as any) || []);
    setLoading(false);
  }
  useEffect(() => { if (hasAccess) load(); }, [hasAccess]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return certs;
    return certs.filter(c =>
      (c.certificate_no || "").toLowerCase().includes(q) ||
      (c.student_name_snapshot || "").toLowerCase().includes(q) ||
      (c.course_name_snapshot || "").toLowerCase().includes(q)
    );
  }, [certs, search]);

  async function handleIssue() {
    if (!studentId) { toast.error("Select a student"); return; }
    const stu = students.find(s => s.id === studentId);
    if (!stu) return;
    if (studentEnrolments.length > 1 && !enrolmentId) {
      toast.error("Pick which course this certificate is for");
      return;
    }
    const enr = studentEnrolments.find((e) => e.id === enrolmentId) || studentEnrolments[0] || null;
    setIssuing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("crm_certificates").insert({
        student_id: stu.id,
        course_id: enr?.course_id ?? stu.course_id,
        course_name_snapshot: enr?.course_name_snapshot ?? stu.course_name_snapshot,
        student_name_snapshot: stu.full_name,
        enrolment_no_snapshot: enr?.enrolment_no ?? stu.enrolment_no,
        enrolment_id: enr?.id ?? null,
        template_kind: templateKind,
        grade,
        issued_on: issueDate,
        issued_by: user?.id,
        issued_by_name: user?.user_metadata?.full_name || user?.email || null,
      } as never).select("*").single();
      if (error) throw error;

      // Generate PDF and upload
      await uploadAndAttachPdf(data as Cert);
      toast.success("Certificate issued");
      setOpenIssue(false);
      setStudentId("");
      setEnrolmentId("");
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to issue");
    } finally {
      setIssuing(false);
    }
  }

  async function uploadAndAttachPdf(cert: Cert) {
    const { data: settings } = await supabase
      .from("crm_institute_settings").select("*").maybeSingle();

    const blob = await generateCertificatePdf({
      certificateNo: cert.certificate_no,
      studentName: cert.student_name_snapshot || "",
      enrolmentNo: cert.enrolment_no_snapshot,
      courseName: cert.course_name_snapshot || "",
      grade: cert.grade,
      issuedOn: cert.issued_on,
      templateKind: cert.template_kind,
      institute: {
        name: settings?.name || "ATEC Education",
        address: settings?.address,
        website: settings?.website,
        logoUrl: settings?.logo_url,
        sealUrl: settings?.institute_seal_url,
        signatureUrl: settings?.director_signature_url,
      },
    });

    const path = `${cert.id}/${cert.certificate_no.replace(/\//g, "-")}.pdf`;
    const { error: upErr } = await supabase.storage
      .from("crm-certificates")
      .upload(path, blob, { contentType: "application/pdf", upsert: true });
    if (upErr) throw upErr;
    const { data: urlData } = supabase.storage.from("crm-certificates").getPublicUrl(path);
    await supabase.from("crm_certificates").update({ pdf_url: urlData.publicUrl }).eq("id", cert.id);
  }

  async function handleDownload(cert: Cert) {
    if (cert.pdf_url) {
      window.open(cert.pdf_url, "_blank");
      return;
    }
    await uploadAndAttachPdf(cert);
    load();
  }

  async function handleSendWhatsApp(cert: Cert) {
    const stu = students.find(s => s.id === cert.student_id);
    if (!stu) { toast.error("Student not found"); return; }
    const { data: tpl } = await supabase
      .from("crm_whatsapp_templates")
      .select("*")
      .eq("template_key", "certificate_ready")
      .maybeSingle();
    const body = tpl?.body || `Dear {student_name}, your certificate for {course_name} is ready. Download: {pdf_url}`;
    const message = fillTemplate(body, {
      student_name: stu.full_name,
      course_name: cert.course_name_snapshot || "",
      certificate_no: cert.certificate_no,
      pdf_url: cert.pdf_url || "",
    });
    await logWaSend({
      template_key: "certificate_ready",
      contact_number: stu.phone,
      contact_name: stu.full_name,
      message_snapshot: message,
      entity_type: "certificate",
      entity_id: cert.id,
    });
    window.open(buildWaLink(stu.phone, message), "_blank");
  }

  async function handleDelete(cert: Cert) {
    if (!confirm(`Delete certificate ${cert.certificate_no}?`)) return;
    await supabase.from("crm_certificates").delete().eq("id", cert.id);
    toast.success("Deleted");
    load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certificates"
        description="Issue, download and share completion certificates."
        actions={
          <Button onClick={() => setOpenIssue(true)}>
            <Plus className="h-4 w-4 mr-2" /> Issue Certificate
          </Button>
        }
      />

      <Card className="p-4">
        <div className="relative max-w-md mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by no., student or course"
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Certificate No.</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                <Award className="h-10 w-10 mx-auto mb-2 opacity-40" />
                No certificates yet
              </TableCell></TableRow>
            ) : filtered.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">{c.certificate_no}</TableCell>
                <TableCell>
                  <Link to={`/crm/students/${c.student_id}`} className="hover:underline">
                    {c.student_name_snapshot}
                  </Link>
                  {c.enrolment_no_snapshot && <div className="text-xs text-muted-foreground">{c.enrolment_no_snapshot}</div>}
                </TableCell>
                <TableCell>{c.course_name_snapshot}</TableCell>
                <TableCell><Badge variant="secondary">{c.grade || "—"}</Badge></TableCell>
                <TableCell className="text-sm">{c.issued_on}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleDownload(c)} title="Download PDF">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleSendWhatsApp(c)} title="Send WhatsApp">
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(c)} title="Delete">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={openIssue} onOpenChange={setOpenIssue}>
        <DialogContent>
          <DialogHeader><DialogTitle>Issue Certificate</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Student</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name} {s.enrolment_no ? `(${s.enrolment_no})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {studentId && studentEnrolments.length > 1 && (
              <div>
                <Label>Course (enrolment) *</Label>
                <Select value={enrolmentId || "none"} onValueChange={(v) => setEnrolmentId(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Choose course" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— select —</SelectItem>
                    {studentEnrolments.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.course_name_snapshot || "—"} · {e.enrolment_no} · {e.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Template</Label>
                <Select value={templateKind} onValueChange={setTemplateKind}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="computer">Computer</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Grade</Label>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["A+","A","B+","B","C","Pass"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Issue Date</Label>
              <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenIssue(false)}>Cancel</Button>
            <Button onClick={handleIssue} disabled={issuing}>
              {issuing ? "Issuing..." : "Issue & Generate PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
