import { supabase } from "@/integrations/supabase/client";

export type ContactMatch = {
  kind: "enquiry" | "student";
  id: string;
  name: string;
  phone: string;
  course_name: string;
  status: string;
  created_at: string;
  extra: string;
};

export function normalisePhone(p: string | null | undefined): string {
  if (!p) return "";
  const digits = String(p).replace(/\D/g, "");
  return digits.slice(-10);
}

export function isValid10Digit(p: string | null | undefined): boolean {
  return /^\d{10}$/.test(normalisePhone(p));
}

/** Find all enquiries + students with the same 10-digit phone. */
export async function findByPhone(phone: string): Promise<ContactMatch[]> {
  const norm = normalisePhone(phone);
  if (!isValid10Digit(norm)) return [];
  const { data, error } = await supabase.rpc("crm_find_by_phone", { _phone: norm });
  if (error) {
    // Fallback to direct queries if RPC not available
    const [eRes, sRes] = await Promise.all([
      supabase.from("crm_enquiries").select("id,name,phone,course_name_snapshot,status,created_at,email").eq("phone", norm),
      supabase.from("crm_students").select("id,full_name,phone,course_name_snapshot,status,created_at,enrolment_no").eq("phone", norm),
    ]);
    const out: ContactMatch[] = [];
    (eRes.data || []).forEach((r: { id: string; name: string; phone: string; course_name_snapshot: string | null; status: string; created_at: string; email: string | null }) => out.push({
      kind: "enquiry", id: r.id, name: r.name, phone: r.phone,
      course_name: r.course_name_snapshot || "", status: r.status,
      created_at: r.created_at, extra: r.email || "",
    }));
    (sRes.data || []).forEach((r: { id: string; full_name: string; phone: string; course_name_snapshot: string | null; status: string; created_at: string; enrolment_no: string | null }) => out.push({
      kind: "student", id: r.id, name: r.full_name, phone: r.phone,
      course_name: r.course_name_snapshot || "", status: r.status,
      created_at: r.created_at, extra: r.enrolment_no || "",
    }));
    return out.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  return ((data as ContactMatch[]) || []);
}

/** Levenshtein distance for fuzzy name matching. */
export function levenshtein(a: string, b: string): number {
  a = a.toLowerCase().trim();
  b = b.toLowerCase().trim();
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

export function namesAreSimilar(a: string, b: string, maxDistance = 2): boolean {
  const na = (a || "").toLowerCase().trim();
  const nb = (b || "").toLowerCase().trim();
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (Math.abs(na.length - nb.length) > maxDistance) return false;
  return levenshtein(na, nb) <= maxDistance;
}
