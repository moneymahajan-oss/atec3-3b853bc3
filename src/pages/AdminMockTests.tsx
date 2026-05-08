import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabaseAdmin as supabase } from "@/integrations/supabase/adminClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, GraduationCap, LogOut, Eye, Plus, Trash2, Pencil, Save, X } from "lucide-react";

type Question = { question: string; options: string[]; correct: number };
type Test = { id: string; title: string; course: string; questions: Question[]; is_active: boolean };

const blank = (): Question => ({ question: "", options: ["", "", "", ""], correct: 0 });
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

  useEffect(() => { if (!loading && (!user || !isAdmin)) navigate("/admin/login"); }, [user, isAdmin, loading]);

  const refresh = async () => {
    const { data } = await supabase.from("mock_tests").select("*").order("created_at");
    const list = (data || []).map((t: any) => ({ ...t, questions: Array.isArray(t.questions) ? t.questions : [] })) as Test[];
    setTests(list);
    if (!selectedId && list.length) setSelectedId(list[0].id);
  };

  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);

  const selected = tests.find(t => t.id === selectedId);

  const saveQuestions = async (qs: Question[]) => {
    if (!selected) return;
    const { error } = await supabase.from("mock_tests").update({ questions: qs as any }).eq("id", selected.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    refresh();
  };

  const addQuestion = async () => {
    if (!selected) return;
    if (!draft.question.trim() || draft.options.some(o => !o.trim())) {
      toast({ title: "Fill question and all 4 options", variant: "destructive" }); return;
    }
    const next = [...selected.questions];
    if (editingIdx !== null) next[editingIdx] = draft;
    else next.push(draft);
    await saveQuestions(next);
    setDraft(blank()); setEditingIdx(null);
    toast({ title: editingIdx !== null ? "Question updated" : "Question added" });
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
    if (!newTest.title.trim() || !newTest.course.trim()) { toast({ title: "Title & course required", variant: "destructive" }); return; }
    const { data, error } = await supabase.from("mock_tests").insert({ title: newTest.title.trim(), course: newTest.course.trim(), questions: [] as any, is_active: true }).select().single();
    if (error) { toast({ title: error.message, variant: "destructive" }); return; }
    setNewTest({ title: "", course: "" });
    setSelectedId((data as any).id);
    refresh();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="p-2 hover:bg-muted rounded-lg"><ArrowLeft className="w-5 h-5" /></Link>
            <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-accent-foreground" />
            </div>
            <span className="font-heading font-bold text-lg">Mock Tests — Manual Editor</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild><Link to="/admin/mock_tests"><Pencil className="w-4 h-4 mr-1" /> JSON Editor</Link></Button>
            <Button variant="outline" size="sm" asChild><Link to="/"><Eye className="w-4 h-4 mr-1" /> View Site</Link></Button>
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="w-4 h-4 mr-1" /> Sign Out</Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <div className="glass rounded-xl p-6">
          <h2 className="font-heading font-bold text-lg mb-3">Create New Test</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <Input placeholder="Test title (unique)" value={newTest.title} onChange={e => setNewTest({ ...newTest, title: e.target.value })} />
            <Input placeholder="Course name" value={newTest.course} onChange={e => setNewTest({ ...newTest, course: e.target.value })} />
            <Button onClick={createTest} className="gradient-accent text-accent-foreground border-0"><Plus className="w-4 h-4 mr-1" /> Create Test</Button>
          </div>
        </div>

        <div className="glass rounded-xl p-6">
          <h2 className="font-heading font-bold text-lg mb-3">Select Test</h2>
          <Select value={selectedId || ""} onValueChange={setSelectedId}>
            <SelectTrigger className="bg-background"><SelectValue placeholder="Choose test..." /></SelectTrigger>
            <SelectContent>
              {tests.map(t => <SelectItem key={t.id} value={t.id}>{t.title} — {t.course} ({t.questions.length} Qs)</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {selected && (
          <>
            <div className="glass rounded-xl p-6">
              <h2 className="font-heading font-bold text-lg mb-4">{editingIdx !== null ? `Edit Question #${editingIdx + 1}` : "Add Question"}</h2>
              <div className="space-y-3">
                <Textarea placeholder="Question text" rows={2} value={draft.question} onChange={e => setDraft({ ...draft, question: e.target.value })} className="bg-background" />
                <div className="grid md:grid-cols-2 gap-3">
                  {draft.options.map((opt, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <span className="font-bold text-muted-foreground w-6">{letters[i]}.</span>
                      <Input placeholder={`Option ${letters[i]}`} value={opt} onChange={e => {
                        const next = [...draft.options]; next[i] = e.target.value;
                        setDraft({ ...draft, options: next });
                      }} className="bg-background" />
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Correct Answer:</span>
                  <Select value={String(draft.correct)} onValueChange={(v) => setDraft({ ...draft, correct: Number(v) })}>
                    <SelectTrigger className="w-32 bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {letters.map((l, i) => <SelectItem key={i} value={String(i)}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={addQuestion} className="gradient-accent text-accent-foreground border-0">
                    <Save className="w-4 h-4 mr-1" /> {editingIdx !== null ? "Update" : "Add"} Question
                  </Button>
                  {editingIdx !== null && (
                    <Button variant="ghost" onClick={() => { setDraft(blank()); setEditingIdx(null); }}>
                      <X className="w-4 h-4 mr-1" /> Cancel
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="glass rounded-xl p-6">
              <h2 className="font-heading font-bold text-lg mb-4">Questions ({selected.questions.length})</h2>
              {selected.questions.length === 0 && <p className="text-muted-foreground text-sm">No questions yet.</p>}
              <div className="space-y-3">
                {selected.questions.map((q, i) => (
                  <div key={i} className="border border-border rounded-lg p-4 bg-background">
                    <div className="flex justify-between gap-3 mb-2">
                      <div className="font-medium text-foreground">Q{i + 1}. {q.question}</div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="ghost" onClick={() => editQuestion(i)}><Pencil className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteQuestion(i)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                      </div>
                    </div>
                    <ul className="text-sm space-y-1 ml-2">
                      {q.options.map((o, oi) => (
                        <li key={oi} className={oi === q.correct ? "text-green-600 font-semibold" : "text-muted-foreground"}>
                          {letters[oi]}. {o} {oi === q.correct && "✓"}
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
