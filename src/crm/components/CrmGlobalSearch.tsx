import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, User, BookOpen, MessageSquare, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface SearchResult {
  type: "student" | "course" | "enquiry";
  id: string;
  title: string;
  subtitle: string;
}

export function CrmGlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    try {
      const term = `%${q}%`;
      const [students, courses, enquiries] = await Promise.all([
        supabase.from("crm_students").select("id, full_name, phone, enrolment_no").or(`full_name.ilike.${term},phone.ilike.${term},enrolment_no.ilike.${term}`).limit(5),
        supabase.from("courses").select("id, name, category").ilike("name", term).limit(5),
        supabase.from("crm_enquiries").select("id, name, phone, status").or(`name.ilike.${term},phone.ilike.${term}`).limit(5),
      ]);

      const items: SearchResult[] = [];
      (students.data ?? []).forEach((s: any) =>
        items.push({ type: "student", id: s.id, title: s.full_name, subtitle: s.enrolment_no || s.phone || "" })
      );
      (courses.data ?? []).forEach((c: any) =>
        items.push({ type: "course", id: c.id, title: c.name, subtitle: c.category })
      );
      (enquiries.data ?? []).forEach((e: any) =>
        items.push({ type: "enquiry", id: e.id, title: e.name, subtitle: `${e.status} · ${e.phone || ""}` })
      );
      setResults(items);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (val: string) => {
    setQuery(val);
    setSelectedIdx(-1);
    setOpen(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const goTo = (r: SearchResult) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    if (r.type === "student") navigate(`/crm/students/${r.id}`);
    else if (r.type === "course") navigate(`/crm/courses/${r.id}`);
    else if (r.type === "enquiry") navigate(`/crm/enquiries/${r.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && selectedIdx >= 0) { e.preventDefault(); goTo(results[selectedIdx]); }
    else if (e.key === "Escape") { setOpen(false); }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const icon = (type: string) => {
    if (type === "student") return <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
    if (type === "course") return <BookOpen className="w-3.5 h-3.5 text-green-500 shrink-0" />;
    return <MessageSquare className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
  };

  const label = (type: string) => {
    if (type === "student") return "Student";
    if (type === "course") return "Course";
    return "Enquiry";
  };

  return (
    <div ref={wrapperRef} className="relative hidden md:block w-80">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search students, courses, enquiries…"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { if (query.length >= 2) setOpen(true); }}
          onKeyDown={handleKeyDown}
          className="pl-9 h-9 text-sm bg-muted border-none"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {results.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground text-center py-4">No results found</p>
          )}
          {results.map((r, i) => (
            <button
              key={`${r.type}-${r.id}`}
              onClick={() => goTo(r)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-accent transition-colors ${
                i === selectedIdx ? "bg-accent" : ""
              }`}
            >
              {icon(r.type)}
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{r.title}</div>
                <div className="text-xs text-muted-foreground truncate">{r.subtitle}</div>
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide shrink-0">{label(r.type)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
