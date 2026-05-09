import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sparkles, Clock, CheckCircle2, XCircle, MessageCircle, BookOpen, Trophy, Zap, Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { useToast } from "@/hooks/use-toast";

interface Question {
  question: string;
  options: string[];
  // 'correct' is intentionally NOT included on the public payload
}

interface Test {
  id: string;
  course: string;
  title: string;
  questions: Question[];
}

type Stage = "intro" | "register" | "test" | "result";

export default function MockTestSection() {
  const settings = useSiteSettings();
  const { toast } = useToast();
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [stage, setStage] = useState<Stage>("intro");
  const [studentName, setStudentName] = useState("");
  const [whatsappNo, setWhatsappNo] = useState("");
  const [activeTest, setActiveTest] = useState<Test | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [secondsLeft, setSecondsLeft] = useState(30 * 60);
  const [resultLink, setResultLink] = useState("");
  const [score, setScore] = useState(0);

  const { data: tests = [] } = useQuery({
    queryKey: ['mock_tests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mock_tests")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      if (!data) return [];
      return (data as any[]).map((t) => ({
        ...t,
        questions: Array.isArray(t.questions) ? t.questions : [],
      })) as Test[];
    },
    placeholderData: [] as Test[],
    retry: 2,
    retryDelay: 1000,
  });

  useEffect(() => {
    if (tests.length > 0 && !selectedCourse) {
      setSelectedCourse(tests[0].course);
    }
  }, [tests, selectedCourse]);

  useEffect(() => {
    if (stage !== "test") return;
    if (secondsLeft <= 0) {
      handleSubmit();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, secondsLeft]);

  const courses = Array.from(new Set(tests.map((t) => t.course)));
  const courseTests = tests.filter((t) => t.course === selectedCourse);

  const startRegister = (course?: string) => {
    const target = course || selectedCourse;
    if (course) setSelectedCourse(course);
    const targetTests = tests.filter((t) => t.course === target);
    if (targetTests.length === 0) {
      toast({ title: "No tests available", description: "Tests for this course are coming soon." });
      return;
    }
    setStage("register");
  };

  const startTest = () => {
    if (!studentName || !whatsappNo) {
      toast({ title: "Required", description: "Name and WhatsApp number are required.", variant: "destructive" });
      return;
    }
    const test = courseTests[0];
    if (!test) return;
    const shuffled = { ...test, questions: [...test.questions].sort(() => Math.random() - 0.5) };
    setActiveTest(shuffled);
    setAnswers({});
    setSecondsLeft(30 * 60);
    setStage("test");
  };

  const handleSubmit = async () => {
    if (!activeTest) return;
    let correct = 0;
    activeTest.questions.forEach((q, i) => {
      if (answers[i] === q.correct) correct += 1;
    });
    const total = activeTest.questions.length;
    const percentage = Math.round((correct / total) * 100);
    const passFail = percentage >= 60 ? "PASS ✅" : "Try Again 💪";

    setScore(correct);

    await supabase.from("mock_test_results").insert({
      student_name: studentName,
      whatsapp_no: whatsappNo,
      course: activeTest.course,
      score: correct,
      total,
      answers: answers as any,
    });

    const link = await buildWhatsAppLink(
      "mock_test_result",
      {
        student_name: studentName,
        course_name: activeTest.course,
        score: correct,
        total,
        percentage,
        pass_fail: passFail,
      },
      settings.whatsapp_number
    );
    setResultLink(link);
    setStage("result");
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <section id="mock-test" className="py-12 bg-[#f8fafc]">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <Badge variant="outline" className="mb-4 text-accent border-accent/30 bg-accent/10">
            <Trophy className="w-3 h-3 mr-1" /> Free Mock Tests
          </Badge>
          <h2 className="text-3xl md:text-5xl font-heading font-bold text-foreground mb-3">
            {settings.mocktest_section_heading || "Test Your Knowledge"}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base md:text-lg">
            {settings.mocktest_section_subheading || "Pick a course, take a 30-minute test, and get your result instantly on WhatsApp."}
          </p>
        </motion.div>

        {stage === "intro" && (
          <div className="max-w-5xl mx-auto">
            {courses.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Mock tests will be added soon. Stay tuned!
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {(() => {
                  const cards = courses.map((c) => {
                    const test = tests.find((t) => t.course === c);
                    const qCount = test?.questions.length || 0;
                    const difficulty = qCount >= 20 ? "Hard" : qCount >= 10 ? "Medium" : "Easy";
                    const diffColor = difficulty === "Hard" ? "bg-destructive/10 text-destructive border-destructive/30" : difficulty === "Medium" ? "bg-accent/10 text-accent border-accent/30" : "bg-green-100 text-green-700 border-green-300";
                    const icons = [BookOpen, Brain, Zap, Trophy];
                    const Icon = icons[Math.abs(c.charCodeAt(0)) % icons.length];
                    return { c, qCount, difficulty, diffColor, Icon };
                  });
                  const padded = cards.length % 2 === 1 ? [...cards, null] : cards;
                  return padded.map((card, idx) => {
                    if (!card) {
                      return (
                        <div key={`pad-${idx}`} className="rounded-2xl border-2 border-dashed border-primary/20 p-6 flex flex-col items-center justify-center text-center text-muted-foreground bg-white/50">
                          <Sparkles className="w-8 h-8 mb-2 opacity-50" />
                          <p className="text-sm font-medium">More tests coming soon</p>
                        </div>
                      );
                    }
                    const { c, qCount, difficulty, diffColor, Icon } = card;
                    return (
                      <motion.div
                        key={c}
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.05 }}
                        className="rounded-2xl bg-white border border-primary/10 p-6 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                            <Icon className="w-6 h-6 text-primary-foreground" />
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${diffColor}`}>{difficulty}</span>
                        </div>
                        <h3 className="font-heading font-bold text-lg text-foreground mb-1">{c}</h3>
                        <p className="text-sm text-muted-foreground mb-4 flex items-center gap-3">
                          <span className="inline-flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{qCount} questions</span>
                          <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />30 min</span>
                        </p>
                        <Button
                          size="sm"
                          onClick={() => startRegister(c)}
                          className="mt-auto w-full gradient-accent text-accent-foreground border-0 font-semibold"
                        >
                          Start Test
                        </Button>
                      </motion.div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        )}

        {stage !== "intro" && (
        <div className="max-w-3xl mx-auto glass rounded-2xl p-6 md:p-8 bg-white">
          {false && null}

          {stage === "register" && (
            <div className="space-y-4 max-w-md mx-auto">
              <h3 className="font-heading font-bold text-xl text-center mb-2">Quick Register</h3>
              <Input
                placeholder="Your Name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="bg-background"
              />
              <Input
                placeholder="WhatsApp Number"
                type="tel"
                value={whatsappNo}
                onChange={(e) => setWhatsappNo(e.target.value)}
                className="bg-background"
              />
              <Button
                onClick={startTest}
                className="w-full gradient-accent text-accent-foreground border-0"
                size="lg"
              >
                Begin Test
              </Button>
            </div>
          )}

          {stage === "test" && activeTest && (
            <div>
              <div className="flex items-center justify-between mb-6 sticky top-0 bg-card/80 backdrop-blur py-2 -mx-2 px-2 rounded">
                <span className="text-sm font-medium">{activeTest.course}</span>
                <span className="inline-flex items-center gap-1 text-accent font-bold">
                  <Clock className="w-4 h-4" /> {formatTime(secondsLeft)}
                </span>
              </div>
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                {activeTest.questions.map((q, i) => (
                  <div key={i} className="border border-border rounded-xl p-4">
                    <p className="font-medium mb-3">
                      <span className="text-accent">Q{i + 1}.</span> {q.question}
                    </p>
                    <div className="space-y-2">
                      {q.options.map((opt, j) => (
                        <label
                          key={j}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                            answers[i] === j ? "bg-accent/10 border border-accent" : "hover:bg-muted"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${i}`}
                            checked={answers[i] === j}
                            onChange={() => setAnswers({ ...answers, [i]: j })}
                          />
                          <span className="text-sm">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <Button
                onClick={handleSubmit}
                size="lg"
                className="w-full mt-6 gradient-accent text-accent-foreground border-0"
              >
                Submit Test
              </Button>
            </div>
          )}

          {stage === "result" && activeTest && (
            <div className="text-center space-y-4">
              <div className="text-6xl">
                {score / activeTest.questions.length >= 0.6 ? "🎉" : "💪"}
              </div>
              <h3 className="font-heading font-bold text-2xl">
                {score / activeTest.questions.length >= 0.6 ? "You Passed!" : "Keep Learning"}
              </h3>
              <p className="text-3xl font-bold text-accent">
                {score} / {activeTest.questions.length}
              </p>
              <p className="text-muted-foreground">
                {Math.round((score / activeTest.questions.length) * 100)}% score
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <Button
                  asChild
                  className="gradient-accent text-accent-foreground border-0"
                  size="lg"
                >
                  <a href={resultLink} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-4 h-4 mr-2" /> Get Result on WhatsApp
                  </a>
                </Button>
                <Button variant="outline" size="lg" onClick={() => setStage("intro")}>
                  Take Another Test
                </Button>
              </div>
              <details className="text-left mt-6">
                <summary className="cursor-pointer font-medium">Review Answers</summary>
                <div className="mt-4 space-y-3">
                  {activeTest.questions.map((q, i) => {
                    const isCorrect = answers[i] === q.correct;
                    return (
                      <div key={i} className="border rounded-lg p-3 text-sm">
                        <div className="flex items-start gap-2">
                          {isCorrect ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                          )}
                          <div>
                            <p className="font-medium">{q.question}</p>
                            <p className="text-muted-foreground mt-1">
                              Correct: {q.options[q.correct]}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            </div>
          )}
        </div>
        )}
      </div>
    </section>
  );
}
