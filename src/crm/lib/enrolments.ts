import { supabase } from "@/integrations/supabase/client";

export type Enrolment = {
  id: string;
  student_id: string;
  course_id: string | null;
  course_name_snapshot: string | null;
  batch_id: string | null;
  enrolment_no: string | null;
  enrolment_date: string;
  status: "active" | "completed" | "dropped" | "on_hold";
  total_fee: number;
  discount_amount: number;
  discount_reason: string | null;
  registration_fee_paid: number;
  net_payable_fee: number | null;
  source_enquiry_id: string | null;
  notes: string | null;
  created_at: string;
};

export async function getStudentEnrolments(studentId: string): Promise<Enrolment[]> {
  const { data, error } = await supabase
    .from("crm_student_enrolments" as never)
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getStudentEnrolments", error);
    return [];
  }
  return (data ?? []) as unknown as Enrolment[];
}

export type AddEnrolmentInput = {
  student_id: string;
  course_id: string;
  course_name_snapshot?: string | null;
  batch_id?: string | null;
  total_fee?: number;
  discount_amount?: number;
  discount_reason?: string | null;
  registration_fee_paid?: number;
  source_enquiry_id?: string | null;
  notes?: string | null;
  enrolment_date?: string;
  created_by?: string | null;
};

export async function addEnrolment(input: AddEnrolmentInput) {
  const payload = {
    student_id: input.student_id,
    course_id: input.course_id,
    course_name_snapshot: input.course_name_snapshot ?? null,
    batch_id: input.batch_id ?? null,
    total_fee: input.total_fee ?? 0,
    discount_amount: input.discount_amount ?? 0,
    discount_reason: input.discount_reason ?? null,
    registration_fee_paid: input.registration_fee_paid ?? 0,
    source_enquiry_id: input.source_enquiry_id ?? null,
    notes: input.notes ?? null,
    enrolment_date: input.enrolment_date ?? new Date().toISOString().slice(0, 10),
    created_by: input.created_by ?? null,
    status: "active" as const,
  };
  const { data, error } = await supabase
    .from("crm_student_enrolments" as never)
    .insert(payload as never)
    .select("*")
    .maybeSingle();
  return { data: data as unknown as Enrolment | null, error };
}
