import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ReportCol = {
  id?: string;
  column_key: string;
  label: string;
  show_in_list: boolean;
  show_in_export: boolean;
  sort_order: number;
};

type ColTable =
  | "crm_enquiry_report_columns"
  | "crm_student_report_columns"
  | "crm_batch_report_columns"
  | "crm_fee_report_columns"
  | "crm_attendance_report_columns"
  | "crm_certificate_report_columns";

export function useReportColumns(table: ColTable) {
  const [cols, setCols] = useState<ReportCol[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(table)
      .select("id,column_key,label,show_in_list,show_in_export,sort_order")
      .order("sort_order");
    if (error) toast.error(error.message);
    setCols((data ?? []) as ReportCol[]);
    setLoading(false);
  }, [table]);

  useEffect(() => { load(); }, [load]);

  const toggleVisible = async (col: ReportCol, next: boolean) => {
    if (!col.id) return;
    setCols((prev) => prev.map((c) => (c.id === col.id ? { ...c, show_in_list: next } : c)));
    const { error } = await supabase.from(table).update({ show_in_list: next }).eq("id", col.id);
    if (error) {
      toast.error(error.message);
      setCols((prev) => prev.map((c) => (c.id === col.id ? { ...c, show_in_list: !next } : c)));
    }
  };

  const visibleCols = useMemo(
    () => cols.filter((c) => c.show_in_list).sort((a, b) => a.sort_order - b.sort_order),
    [cols]
  );
  const exportCols = useMemo(
    () => cols.filter((c) => c.show_in_export).sort((a, b) => a.sort_order - b.sort_order),
    [cols]
  );

  return { cols, visibleCols, exportCols, toggleVisible, loading, reload: load };
}
