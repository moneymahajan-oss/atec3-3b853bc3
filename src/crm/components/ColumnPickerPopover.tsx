import { Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ReportCol } from "../hooks/useReportColumns";

type Props = {
  cols: ReportCol[];
  onToggle: (col: ReportCol, next: boolean) => void;
  label?: string;
};

export function ColumnPickerPopover({ cols, onToggle, label = "Columns" }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" title="Show / hide table columns">
          <Columns3 className="w-4 h-4 mr-2" /> {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 max-h-96 overflow-y-auto p-3">
        <div className="text-sm font-medium mb-2">Visible columns</div>
        <div className="space-y-1.5">
          {cols.map((c) => (
            <label
              key={c.column_key}
              className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 px-2 py-1 rounded"
            >
              <Checkbox
                checked={c.show_in_list}
                onCheckedChange={(v) => onToggle(c, !!v)}
              />
              <span>{c.label}</span>
            </label>
          ))}
        </div>
        <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
          Changes apply to everyone in your team.
        </div>
      </PopoverContent>
    </Popover>
  );
}
