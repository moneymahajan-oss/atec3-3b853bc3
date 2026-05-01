// Runtime validation for student fee aggregates.
// Flags students where enrolment totals, payments, and plan dues don't reconcile.

export type FeeValidationInput = {
  student_id: string;
  full_name: string;
  enrolment_no: string | null;
  enrolment_total: number;       // SUM(net_payable_fee ?? total_fee) across enrolments (or legacy total_fee)
  legacy_total: number;          // crm_students.total_fee snapshot
  registration_fee_paid: number; // crm_students.registration_fee_paid
  payments_total: number;        // SUM(amount) of non-void payments
  plans_total: number;           // SUM(amount) of non-void fee plans
  plans_paid: number;            // SUM(amount_paid) of non-void fee plans
};

export type FeeValidationIssue = {
  student_id: string;
  full_name: string;
  enrolment_no: string | null;
  reasons: string[];
  expected_total: number;
  observed_paid: number;
  observed_due: number;
};

const TOLERANCE = 1; // ₹1 rounding tolerance

export function validateStudentTotals(input: FeeValidationInput): FeeValidationIssue | null {
  const reasons: string[] = [];
  const expected = input.enrolment_total > 0 ? input.enrolment_total : input.legacy_total;
  const observedPaid = input.payments_total + input.registration_fee_paid;
  const observedDue = expected - observedPaid;

  // 1. Enrolment aggregate vs legacy snapshot mismatch (informational only when both > 0)
  if (input.enrolment_total > 0 && input.legacy_total > 0
      && Math.abs(input.enrolment_total - input.legacy_total) > TOLERANCE) {
    reasons.push(
      `Enrolment total ₹${input.enrolment_total} ≠ legacy snapshot ₹${input.legacy_total}`
    );
  }

  // 2. Plan total vs expected fee mismatch (only if any plans exist)
  if (input.plans_total > 0 && Math.abs(input.plans_total - expected) > TOLERANCE) {
    reasons.push(
      `Sum of fee plans ₹${input.plans_total} ≠ expected total ₹${expected}`
    );
  }

  // 3. Plan-paid vs payments mismatch (only if any plans exist)
  if (input.plans_total > 0 && Math.abs(input.plans_paid - input.payments_total) > TOLERANCE) {
    reasons.push(
      `Plan amount_paid ₹${input.plans_paid} ≠ payments total ₹${input.payments_total}`
    );
  }

  // 4. Overpayment
  if (observedPaid - expected > TOLERANCE && expected > 0) {
    reasons.push(
      `Paid ₹${observedPaid} exceeds expected total ₹${expected}`
    );
  }

  // 5. Negative values (data corruption)
  if (input.payments_total < 0 || input.plans_total < 0 || expected < 0) {
    reasons.push(`Negative aggregate detected`);
  }

  if (reasons.length === 0) return null;
  return {
    student_id: input.student_id,
    full_name: input.full_name,
    enrolment_no: input.enrolment_no,
    reasons,
    expected_total: expected,
    observed_paid: observedPaid,
    observed_due: observedDue,
  };
}

export function logFeeValidationReport(issues: FeeValidationIssue[]) {
  if (issues.length === 0) {
    console.info("[fee-validation] All student fee aggregates reconcile ✓");
    return;
  }
  console.group(`[fee-validation] ${issues.length} student(s) with fee mismatches`);
  issues.forEach((i) => {
    console.warn(
      `• ${i.full_name} (${i.enrolment_no ?? i.student_id})\n  expected=₹${i.expected_total} paid=₹${i.observed_paid} due=₹${i.observed_due}\n  - ${i.reasons.join("\n  - ")}`
    );
  });
  console.groupEnd();
}
