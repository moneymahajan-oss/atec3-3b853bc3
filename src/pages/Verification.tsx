import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Search, Loader2 } from "lucide-react";

interface CertResult {
  certificate_id: string;
  student_id: string;
  student_name: string;
  father_name: string;
  course_name: string;
  start_date: string;
  end_date: string;
  duration_hours: number;
  grade: string;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Verification() {
  const [form, setForm] = useState({ student_id: "", certificate_id: "", student_name: "", father_name: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CertResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [qrUrl, setQrUrl] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setNotFound(false);

    try {
      const [certRes, settingsRes] = await Promise.all([
        supabase
          .from("verification_certificates")
          .select("certificate_id,student_id,student_name,father_name,course_name,start_date,end_date,duration_hours,grade")
          .ilike("student_id", form.student_id.trim())
          .ilike("certificate_id", form.certificate_id.trim())
          .ilike("student_name", form.student_name.trim())
          .ilike("father_name", form.father_name.trim())
          .eq("is_active", true)
          .limit(1),
        supabase
          .from("app_settings")
          .select("value")
          .eq("key", "verification_url")
          .single(),
      ]);

      if (certRes.data && certRes.data.length > 0) {
        setResult(certRes.data[0] as CertResult);
        setQrUrl(settingsRes.data?.value || "https://ateceducation.in/verification");
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">Certificate Verification</h1>
        <p className="text-center text-muted-foreground mb-8">ATEC — Avenue to Excellent Careers</p>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Search className="h-5 w-5" /> Verify Certificate</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="student_id">Student ID</Label>
                <Input id="student_id" required value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="certificate_id">Certificate ID</Label>
                <Input id="certificate_id" required value={form.certificate_id} onChange={e => setForm(f => ({ ...f, certificate_id: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="student_name">Student Name</Label>
                <Input id="student_name" required value={form.student_name} onChange={e => setForm(f => ({ ...f, student_name: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="father_name">Father's Name</Label>
                <Input id="father_name" required value={form.father_name} onChange={e => setForm(f => ({ ...f, father_name: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Verifying...</> : "Verify Certificate"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {result && (
          <Card className="border-green-300 bg-white print:shadow-none">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <CheckCircle2 className="h-7 w-7 text-green-600" />
                <span className="text-xl font-bold text-green-700">Certificate Verified</span>
              </div>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-3 text-sm">
                  <Row label="Student Name" value={result.student_name} />
                  <Row label="Father's Name" value={result.father_name} />
                  <Row label="Student ID" value={result.student_id} />
                  <Row label="Certificate ID" value={result.certificate_id} />
                  <Row label="Course Name" value={result.course_name} />
                  <Row label="Duration" value={`${fmtDate(result.start_date)} → ${fmtDate(result.end_date)}`} />
                  <Row label="Total Duration" value={`${result.duration_hours} Hours`} />
                  <Row label="Grade" value={result.grade} />
                </div>
                <div className="flex-shrink-0 flex items-end justify-center md:justify-end">
                  <QRCodeSVG value={qrUrl} size={120} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {notFound && (
          <Card className="border-red-300 bg-white">
            <CardContent className="p-6 flex items-center gap-3">
              <XCircle className="h-6 w-6 text-red-500" />
              <span className="text-red-700 font-medium">No certificate found. Please check your details.</span>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex">
      <span className="w-36 font-medium text-muted-foreground">{label}:</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
