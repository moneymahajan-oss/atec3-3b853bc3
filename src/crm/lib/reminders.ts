import { supabase } from "@/integrations/supabase/client";

export interface ReminderSettings {
  feeOverdueDaysOffset: number;   // show overdue once N days past due
  feeDueSoonWindow: number;       // window in days before due date
  batchEndingWindow: number;      // days before batch end
  attendanceThreshold: number;    // % below which "low"
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  feeOverdueDaysOffset: 0,
  feeDueSoonWindow: 3,
  batchEndingWindow: 14,
  attendanceThreshold: 75,
};

export interface ReminderCounts {
  overdue: number;
  dueSoon: number;
  birthdaysToday: number;
  birthdaysWeek: number;
  followUp: number;
  lowAttendance: number;
  docsPending: number;
  batchEnding: number;
  total: number;
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const monthDay = (d: Date) => `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export interface OverdueRow {
  id: string;
  student_id: string;
  student_name: string;
  phone: string;
  course: string | null;
  installment_no: number;
  amount: number;
  amount_paid: number;
  due_date: string;
  days_overdue: number;
}

export interface DueSoonRow extends Omit<OverdueRow, "days_overdue"> {
  days_left: number;
}

export interface BirthdayRow {
  id: string;
  full_name: string;
  phone: string;
  course: string | null;
  dob: string;
  age: number;
}

export interface FollowUpRow {
  id: string;
  name: string;
  phone: string;
  course: string | null;
  status: string;
  follow_up_date: string;
  assigned_to_name: string | null;
  days_overdue: number;
}

export interface LowAttendanceRow {
  student_id: string;
  full_name: string;
  phone: string;
  batch_id: string | null;
  course: string | null;
  attendance_pct: number;
  total_sessions: number;
  attended: number;
}

export interface DocsPendingRow {
  id: string;
  full_name: string;
  phone: string;
  course: string | null;
  missing: string[];
}

export interface BatchEndingRow {
  id: string;
  name: string;
  course: string | null;
  end_date: string;
  days_left: number;
  student_count: number;
}

async function fetchPendingFeePlansWithStudent() {
  const { data, error } = await supabase
    .from("crm_fee_plans")
    .select(`
      id, student_id, installment_no, amount, amount_paid, due_date, status,
      crm_students:student_id ( full_name, phone, course_name_snapshot )
    `)
    .in("status", ["pending", "partial", "overdue"]);
  if (error) throw error;
  return data ?? [];
}

export async function loadOverdue(settings = DEFAULT_REMINDER_SETTINGS): Promise<OverdueRow[]> {
  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - settings.feeOverdueDaysOffset);
  const cutoffStr = isoDate(cutoff);

  const rows = await fetchPendingFeePlansWithStudent();
  return rows
    .filter((r: any) => r.due_date && r.due_date <= cutoffStr && (r.amount_paid ?? 0) < (r.amount ?? 0))
    .map((r: any) => {
      const due = new Date(r.due_date);
      const days = Math.floor((today.getTime() - due.getTime()) / 86400000);
      const s = r.crm_students || {};
      return {
        id: r.id,
        student_id: r.student_id,
        student_name: s.full_name ?? "—",
        phone: s.phone ?? "",
        course: s.course_name_snapshot ?? null,
        installment_no: r.installment_no,
        amount: r.amount ?? 0,
        amount_paid: r.amount_paid ?? 0,
        due_date: r.due_date,
        days_overdue: days,
      } as OverdueRow;
    })
    .sort((a, b) => b.days_overdue - a.days_overdue);
}

export async function loadDueSoon(settings = DEFAULT_REMINDER_SETTINGS): Promise<DueSoonRow[]> {
  const today = new Date();
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + settings.feeDueSoonWindow);

  const rows = await fetchPendingFeePlansWithStudent();
  const todayStr = isoDate(today);
  const horizonStr = isoDate(horizon);

  return rows
    .filter((r: any) =>
      r.due_date && r.due_date >= todayStr && r.due_date <= horizonStr && (r.amount_paid ?? 0) < (r.amount ?? 0)
    )
    .map((r: any) => {
      const due = new Date(r.due_date);
      const days = Math.ceil((due.getTime() - today.getTime()) / 86400000);
      const s = r.crm_students || {};
      return {
        id: r.id,
        student_id: r.student_id,
        student_name: s.full_name ?? "—",
        phone: s.phone ?? "",
        course: s.course_name_snapshot ?? null,
        installment_no: r.installment_no,
        amount: r.amount ?? 0,
        amount_paid: r.amount_paid ?? 0,
        due_date: r.due_date,
        days_left: days,
      } as DueSoonRow;
    })
    .sort((a, b) => a.days_left - b.days_left);
}

function calcAge(dob: string): number {
  const d = new Date(dob);
  const t = new Date();
  let age = t.getFullYear() - d.getFullYear();
  const m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age--;
  return age;
}

export async function loadBirthdays(): Promise<{ today: BirthdayRow[]; week: BirthdayRow[] }> {
  const { data, error } = await supabase
    .from("crm_students")
    .select("id, full_name, phone, course_name_snapshot, dob, status")
    .not("dob", "is", null)
    .eq("status", "active");
  if (error) throw error;
  const today = new Date();
  const todayMd = monthDay(today);
  const weekSet = new Set<string>();
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    weekSet.add(monthDay(d));
  }
  const todayList: BirthdayRow[] = [];
  const weekList: BirthdayRow[] = [];
  (data ?? []).forEach((s: any) => {
    const md = monthDay(new Date(s.dob));
    const row: BirthdayRow = {
      id: s.id,
      full_name: s.full_name,
      phone: s.phone ?? "",
      course: s.course_name_snapshot,
      dob: s.dob,
      age: calcAge(s.dob),
    };
    if (md === todayMd) todayList.push(row);
    else if (weekSet.has(md)) weekList.push(row);
  });
  return { today: todayList, week: weekList };
}

export async function loadFollowUps(): Promise<FollowUpRow[]> {
  const today = isoDate(new Date());
  const { data, error } = await supabase
    .from("crm_enquiries")
    .select("id, name, phone, course_name_snapshot, status, follow_up_date, assigned_to_name")
    .not("follow_up_date", "is", null)
    .lte("follow_up_date", today)
    .not("status", "in", "(converted,lost)");
  if (error) throw error;
  const t = new Date();
  return (data ?? [])
    .map((r: any) => {
      const d = new Date(r.follow_up_date);
      const days = Math.floor((t.getTime() - d.getTime()) / 86400000);
      return {
        id: r.id,
        name: r.name,
        phone: r.phone,
        course: r.course_name_snapshot,
        status: r.status,
        follow_up_date: r.follow_up_date,
        assigned_to_name: r.assigned_to_name,
        days_overdue: days,
      } as FollowUpRow;
    })
    .sort((a, b) => b.days_overdue - a.days_overdue);
}

export async function loadLowAttendance(threshold = 75): Promise<LowAttendanceRow[]> {
  const { data: students, error: e1 } = await supabase
    .from("crm_students")
    .select("id, full_name, phone, batch_id, course_name_snapshot, status")
    .eq("status", "active");
  if (e1) throw e1;

  const { data: attendance, error: e2 } = await supabase
    .from("crm_attendance")
    .select("student_id, status");
  if (e2) throw e2;

  const grouped = new Map<string, { total: number; present: number }>();
  (attendance ?? []).forEach((a: any) => {
    const g = grouped.get(a.student_id) ?? { total: 0, present: 0 };
    g.total += 1;
    if (a.status === "present" || a.status === "late") g.present += 1;
    grouped.set(a.student_id, g);
  });

  const rows: LowAttendanceRow[] = [];
  (students ?? []).forEach((s: any) => {
    const g = grouped.get(s.id);
    if (!g || g.total < 5) return; // need at least 5 sessions to flag
    const pct = Math.round((g.present / g.total) * 100);
    if (pct < threshold) {
      rows.push({
        student_id: s.id,
        full_name: s.full_name,
        phone: s.phone ?? "",
        batch_id: s.batch_id,
        course: s.course_name_snapshot,
        attendance_pct: pct,
        total_sessions: g.total,
        attended: g.present,
      });
    }
  });
  return rows.sort((a, b) => a.attendance_pct - b.attendance_pct);
}

export async function loadDocsPending(): Promise<DocsPendingRow[]> {
  const { data, error } = await supabase
    .from("crm_students")
    .select("id, full_name, phone, course_name_snapshot, photo_url, id_proof_url, address_proof_url, status")
    .eq("status", "active");
  if (error) throw error;
  return (data ?? [])
    .map((s: any) => {
      const missing: string[] = [];
      if (!s.photo_url) missing.push("Photo");
      if (!s.id_proof_url) missing.push("ID Proof");
      if (!s.address_proof_url) missing.push("Address Proof");
      return missing.length
        ? {
            id: s.id,
            full_name: s.full_name,
            phone: s.phone ?? "",
            course: s.course_name_snapshot,
            missing,
          }
        : null;
    })
    .filter(Boolean) as DocsPendingRow[];
}

export async function loadBatchEnding(window = 14): Promise<BatchEndingRow[]> {
  const today = new Date();
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + window);

  const { data: batches, error } = await supabase
    .from("crm_batches")
    .select("id, name, course_name_snapshot, end_date, status")
    .not("end_date", "is", null)
    .gte("end_date", isoDate(today))
    .lte("end_date", isoDate(horizon))
    .neq("status", "completed");
  if (error) throw error;

  const ids = (batches ?? []).map((b: any) => b.id);
  let counts = new Map<string, number>();
  if (ids.length) {
    const { data: students } = await supabase
      .from("crm_students")
      .select("batch_id")
      .in("batch_id", ids);
    (students ?? []).forEach((s: any) => {
      counts.set(s.batch_id, (counts.get(s.batch_id) ?? 0) + 1);
    });
  }
  return (batches ?? [])
    .map((b: any) => {
      const d = new Date(b.end_date);
      const days = Math.ceil((d.getTime() - today.getTime()) / 86400000);
      return {
        id: b.id,
        name: b.name,
        course: b.course_name_snapshot,
        end_date: b.end_date,
        days_left: days,
        student_count: counts.get(b.id) ?? 0,
      };
    })
    .sort((a, b) => a.days_left - b.days_left);
}

export async function loadAllReminderCounts(settings = DEFAULT_REMINDER_SETTINGS): Promise<ReminderCounts> {
  const [overdue, dueSoon, bdays, follow, low, docs, batch] = await Promise.all([
    loadOverdue(settings),
    loadDueSoon(settings),
    loadBirthdays(),
    loadFollowUps(),
    loadLowAttendance(settings.attendanceThreshold),
    loadDocsPending(),
    loadBatchEnding(settings.batchEndingWindow),
  ]);
  const total =
    overdue.length + dueSoon.length + bdays.today.length + follow.length + low.length + docs.length + batch.length;
  return {
    overdue: overdue.length,
    dueSoon: dueSoon.length,
    birthdaysToday: bdays.today.length,
    birthdaysWeek: bdays.week.length,
    followUp: follow.length,
    lowAttendance: low.length,
    docsPending: docs.length,
    batchEnding: batch.length,
    total,
  };
}
