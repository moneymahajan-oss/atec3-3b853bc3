import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabaseAdmin as supabase } from "@/integrations/supabase/adminClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  GraduationCap,
  LogOut,
  Eye,
  Plus,
  Trash2,
  Pencil,
  Save,
  X,
  Shuffle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// Target pool size — students always get 30 randomly selected from this pool
const POOL_TARGET = 50;
const TEST_SIZE = 30;

type Question = { question: string; options: string[]; correct: number };
type Test = {
  id: string;
  title: string;
  course: string;
  questions: Question[];
  is_active: boolean;
};

const blank = (): Question => ({
  question: "",
  options: ["", "", "", ""],
  correct: 0,
});
const letters = ["A", "B", "C", "D"];

export default function AdminMockTests() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Question>(blank());
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [newTest, setNewTest] = useState({ title: "", course: "" });

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/admin/login");
  }, [user, isAdmin, loading]);

  const refresh = async () => {
    const { data } = await supabase
      .from("mock_tests")
      .select("*")
      .order("created_at");
    const list = (data || []).map((t: any) => ({
      ...t,
      questions: Array.isArray(t.questions) ? t.questions : [],
    })) as Test[];
    setTests(list);
    if (!selectedId && list.length) setSelectedId(list[0].id);
  };

  useEffect(() => {
    if (isAdmin) refresh();
  }, [isAdmin]);

  const selected = tests.find((t) => t.id === selectedId);

  const saveQuestions = async (qs: Question[]) => {
    if (!selected) return;
    const { error } = await supabase
      .from("mock_tests")
      .update({ questions: qs as any })
      .eq("id", selected.id);
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    refresh();
  };

  const addQuestion = async () => {
    if (!selected) return;
    if (!draft.question.trim() || draft.options.some((o) => !o.trim())) {
      toast({
        title: "Fill question and all 4 options",
        variant: "destructive",
      });
      return;
    }
    const next = [...selected.questions];
    if (editingIdx !== null) next[editingIdx] = draft;
    else next.push(draft);
    await saveQuestions(next);
    setDraft(blank());
    setEditingIdx(null);
    toast({
      title:
        editingIdx !== null
          ? "Question updated ✓"
          : `Question added (${next.length} total)`,
    });
  };

  const editQuestion = (i: number) => {
    if (!selected) return;
    setDraft(JSON.parse(JSON.stringify(selected.questions[i])));
    setEditingIdx(i);
  };

  const deleteQuestion = async (i: number) => {
    if (!selected || !confirm("Delete this question?")) return;
    const next = selected.questions.filter((_, idx) => idx !== i);
    await saveQuestions(next);
  };

  const createTest = async () => {
    if (!newTest.title.trim() || !newTest.course.trim()) {
      toast({ title: "Title & course required", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase
      .from("mock_tests")
      .insert({
        title: newTest.title.trim(),
        course: newTest.course.trim(),
        questions: [] as any,
        is_active: true,
      })
      .select()
      .single();
    if (error) {
      toast({ title: error.message, variant: "destructive" });
      return;
    }
    setNewTest({ title: "", course: "" });
    setSelectedId((data as any).id);
    refresh();
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );

  // Pool progress helpers
  const poolCount = selected?.questions.length ?? 0;
  const poolPercent = Math.min(100, Math.round((poolCount / POOL_TARGET) * 100));
  const poolReady = poolCount >= TEST_SIZE;
  const poolFull = poolCount >= POOL_TARGET;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* ── Header ── */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="p-2 hover:bg-muted rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-accent-foreground" />
            </div>
            <span className="font-heading font-bold text-lg">
              Mock Tests — Question Bank
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/mock_tests">
                <Pencil className="w-4 h-4 mr-1" /> JSON Editor
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/">
                <Eye className="w-4 h-4 mr-1" /> View Site
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-1" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">

        {/* ── How it works banner ── */}
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 flex items-start gap-3">
          <Shuffle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <span className="font-semibold">How shuffling works: </span>
            Add up to <span className="font-semibold">{POOL_TARGET}+ questions</span> to the
            pool. Each student receives{" "}
            <span className="font-semibold">{TEST_SIZE} randomly selected questions</span> in a
            unique order — so no two students see the same test pattern.
          </div>
        </div>

        {/* ── Create New Test ── */}
        <div className="glass rounded-xl p-6">
          <h2 className="font-heading font-bold text-lg mb-3">
            Create New Test
          </h2>
          <div className="grid md:grid-cols-3 gap-3">
            <Input
              placeholder="Test title (unique)"
              value={newTest.title}
              onChange={(e) => setNewTest({ ...newTest, title: e.target.value })}
            />
            <Input
              placeholder="Course name"
              value={newTest.course}
              onChange={(e) =>
                setNewTest({ ...newTest, course: e.target.value })
              }
            />
            <Button
              onClick={createTest}
              className="gradient-accent text-accent-foreground border-0"
            >
              <Plus className="w-4 h-4 mr-1" /> Create Test
            </Button>
          </div>
        </div>

        {/* ── Select Test ── */}
        <div className="glass rounded-xl p-6">
          <h2 className="font-heading font-bold text-lg mb-3">Select Test</h2>
          <Select
            value={selectedId || ""}
            onValueChange={setSelectedId}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Choose test..." />
            </SelectTrigger>
            <SelectContent>
              {tests.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.title} — {t.course} ({t.questions.length} questions in
                  pool)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selected && (
          <>
            {/* ── Pool Progress Card ── */}
            <div className="glass rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-heading font-bold text-lg">
                  Question Pool — {selected.title}
                </h2>
                <div className="flex items-center gap-2">
                  {poolReady ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 border border-green-300 px-2 py-1 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> Live — students can
                      take test
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-1 rounded-full">
                      <AlertCircle className="w-3 h-3" /> Need {TEST_SIZE - poolCount} more
                      to go live
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>
                    {poolCount} questions added
                  </span>
                  <span>
                    Target: {POOL_TARGET} questions ({TEST_SIZE} shown per
                    student)
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      poolFull
                        ? "bg-green-500"
                        : poolReady
                        ? "bg-accent"
                        : "bg-amber-400"
                    }`}
                    style={{ width: `${poolPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span
                    className={
                      poolReady ? "text-green-600 font-medium" : "text-amber-600"
                    }
                  >
                    {poolReady
                      ? poolFull
                        ? `✓ Pool complete — ${poolCount - TEST_SIZE} extra questions for maximum variety!`
                        : `✓ Test is live with ${poolCount} questions — add more for better variety`
                      : `Add ${TEST_SIZE - poolCount} more questions before students can take this test`}
                  </span>
                  <span className="text-muted-foreground font-medium">
                    {poolPercent}%
                  </span>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="rounded-lg bg-background border border-border p-3 text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {poolCount}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Total in pool
                  </div>
                </div>
                <div className="rounded-lg bg-accent/10 border border-accent/20 p-3 text-center">
                  <div className="text-2xl font-bold text-accent">
                    {TEST_SIZE}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Per student (random)
                  </div>
                </div>
                <div className="rounded-lg bg-background border border-border p-3 text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {POOL_TARGET - poolCount > 0
                      ? POOL_TARGET - poolCount
                      : "✓"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {POOL_TARGET - poolCount > 0
                      ? `More to reach ${POOL_TARGET}`
                      : "Pool target met!"}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Add / Edit Question ── */}
            <div className="glass rounded-xl p-6">
              <h2 className="font-heading font-bold text-lg mb-4">
                {editingIdx !== null
                  ? `Edit Question #${editingIdx + 1}`
                  : `Add Question ${poolCount > 0 ? `(will be #${poolCount + 1})` : ""}`}
              </h2>
              <div className="space-y-3">
                <Textarea
                  placeholder="Question text"
                  rows={2}
                  value={draft.question}
                  onChange={(e) =>
                    setDraft({ ...draft, question: e.target.value })
                  }
                  className="bg-background"
                />
                <div className="grid md:grid-cols-2 gap-3">
                  {draft.options.map((opt, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <span className="font-bold text-muted-foreground w-6">
                        {letters[i]}.
                      </span>
                      <Input
                        placeholder={`Option ${letters[i]}`}
                        value={opt}
                        onChange={(e) => {
                          const next = [...draft.options];
                          next[i] = e.target.value;
                          setDraft({ ...draft, options: next });
                        }}
                        className="bg-background"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-medium">Correct Answer:</span>
                  <Select
                    value={String(draft.correct)}
                    onValueChange={(v) =>
                      setDraft({ ...draft, correct: Number(v) })
                    }
                  >
                    <SelectTrigger className="w-32 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {letters.map((l, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={addQuestion}
                    className="gradient-accent text-accent-foreground border-0"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    {editingIdx !== null ? "Update" : "Add"} Question
                  </Button>
                  {editingIdx !== null && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setDraft(blank());
                        setEditingIdx(null);
                      }}
                    >
                      <X className="w-4 h-4 mr-1" /> Cancel
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* ── Question List ── */}
            <div className="glass rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading font-bold text-lg">
                  All Questions in Pool ({selected.questions.length})
                </h2>
                {selected.questions.length > TEST_SIZE && (
                  <span className="text-xs text-green-700 bg-green-100 border border-green-300 px-2 py-1 rounded-full font-medium">
                    <Shuffle className="w-3 h-3 inline mr-1" />
                    {selected.questions.length - TEST_SIZE} extra for shuffle
                    variety
                  </span>
                )}
              </div>

              {selected.questions.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  No questions yet. Add your first question above.
                </p>
              )}

              <div className="space-y-3">
                {selected.questions.map((q, i) => (
                  <div
                    key={i}
                    className="border border-border rounded-lg p-4 bg-background"
                  >
                    <div className="flex justify-between gap-3 mb-2">
                      <div className="font-medium text-foreground">
                        <span className="text-xs font-bold text-muted-foreground mr-2 bg-muted px-1.5 py-0.5 rounded">
                          #{i + 1}
                        </span>
                        {q.question}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => editQuestion(i)}
                          title="Edit"
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteQuestion(i)}
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <ul className="text-sm space-y-1 ml-2">
                      {q.options.map((o, oi) => (
                        <li
                          key={oi}
                          className={
                            oi === q.correct
                              ? "text-green-600 font-semibold"
                              : "text-muted-foreground"
                          }
                        >
                          {letters[oi]}. {o}{" "}
                          {oi === q.correct && (
                            <span className="text-green-600">✓</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
