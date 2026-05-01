import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { findByPhone, isValid10Digit, type ContactMatch } from "../lib/dedupe";

interface Props {
  phone: string;
  /** Hide the row currently being edited (its own id). */
  excludeId?: string;
  /** Called when user explicitly chooses "Continue anyway". */
  onAcknowledge?: () => void;
}

/**
 * Live duplicate-detection banner. Pass the phone number being typed; once it's
 * 10 digits we look up enquiries + students with the same number and surface them.
 */
export function DuplicateAlert({ phone, excludeId, onAcknowledge }: Props) {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<ContactMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(false);
    if (!isValid10Digit(phone)) {
      setMatches([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const rows = await findByPhone(phone);
      if (!cancelled) {
        setMatches(rows.filter((r) => r.id !== excludeId));
        setLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
      setLoading(false);
    };
  }, [phone, excludeId]);

  if (dismissed || loading || matches.length === 0) return null;

  const open = (m: ContactMatch) => {
    if (m.kind === "enquiry") navigate(`/crm/enquiries/${m.id}`);
    else navigate(`/crm/students/${m.id}`);
  };

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 mb-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            This mobile number is already in the system ({matches.length} record{matches.length > 1 ? "s" : ""})
          </div>
          <ul className="mt-2 space-y-1">
            {matches.slice(0, 5).map((m) => (
              <li key={`${m.kind}-${m.id}`} className="flex items-center gap-2 text-sm">
                <Badge variant={m.kind === "student" ? "default" : "secondary"} className="capitalize text-[10px]">
                  {m.kind}
                </Badge>
                <span className="font-medium truncate">{m.name}</span>
                {m.course_name && <span className="text-muted-foreground truncate">· {m.course_name}</span>}
                <span className="text-muted-foreground text-xs">· {m.status}</span>
                <span className="text-muted-foreground text-xs ml-auto whitespace-nowrap">
                  {new Date(m.created_at).toLocaleDateString()}
                </span>
                <Button type="button" size="sm" variant="ghost" className="h-6 px-2" onClick={() => open(m)}>
                  Open <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 mt-2">
            <Button
              type="button" size="sm" variant="outline"
              onClick={() => { setDismissed(true); onAcknowledge?.(); }}
            >
              Continue anyway (different person)
            </Button>
          </div>
        </div>
        <button type="button" onClick={() => setDismissed(true)} className="text-amber-700 hover:text-amber-900">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
