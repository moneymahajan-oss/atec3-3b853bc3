import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  MessageCircle,
  BookOpen,
  Trophy,
  Zap,
  Brain,
  Shuffle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { useToast } from "@/hooks/use-toast";

// How many questions each student gets per test session
const TEST_SIZE = 30;

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
  const [secondsLeft, setSecondsLeft] = useState(TEST_SIZE * 60);
  const [resultLink, setResultLink] = useState("");
  const [score, setScore] = useState(0);
  const [resultTotal, setResultTotal] = useState(0);
  // Maps display-position (0..N-1) → original DB index in the full question pool
  const [answerKeyMap, setAnswerKeyMap] = useState<number[]>([]);
  // correctMap[originalDBIdx] = correct option index for that question
  const [correctMap, setCorrectMap] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  // Ref to prevent double-submit (timer + manual button race condition)
  const hasSubmitted = useRef(false);

  const { data: tests = [] } = useQuery({
    queryKey: ["mock_tests"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_mock_tests");
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

  // Timer — stops immediately once submitted
  useEffect(() => {
    if (stage !== "test") return;
    if (secondsLeft <= 0) {
      submitTest();
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
      toast({
        title: "No tests available",
        description: "Tests for this course are coming soon.",
      });
      return;
    }
    setStage("register");
  };

  const startTest = () => {
    if (!studentName.trim() || !whatsappNo.trim()) {
      toast({
        title: "Required",
        description: "Name and WhatsApp number are required.",
        variant: "destructive",
      });
      return;
    }
    const test = courseTests[0];
    if (!test) return;

    const allQs = [...test.questions] as Question[];
    const poolSize = allQs.length;
    const pickCount = Math.min(TEST_SIZE, poolSize);

    // Fisher-Yates shuffle of indices so every student gets a different set
    const indices = Array.from({ length: poolSize }, (_, i) => i);
    for (let i = poolSize - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const selectedIndices = indices.slice(0, pickCount);
    const selectedQuestions = selectedIndices.map((idx) => allQs[idx]);

    // Reset all per-test state (fixes stale map on retake)
    hasSubmitted.current = false;
    setAnswerKeyMap(selectedIndices);
    setCorrectMap({});
    setActiveTest({ ...test, questions: selectedQuestions });
    setAnswers({});
    setSecondsLeft(TEST_SIZE * 60);
    setSubmitting(false);
    setStage("test");
  };

  // FIX: Renamed to submitTest and made idempotent with hasSubmitted ref
  const submitTest = async () => {
    // Prevent double-submit from timer + button race
    if (hasSubmitted.current) return;
    hasSubmitted.current = true;

    if (!activeTest) return;
    setSubmitting(true);

    // FIX: Build remapped answers with explicit string keys and number values.
    // JSONB object keys are always strings. The RPC's grade logic does:
    //   answers->>'42' to get the student's choice for DB question index 42.
    // Previously passing a JS object with numeric keys caused subtle type
    // mismatches in PostgreSQL JSONB lookups, returning score = 0.
    const remappedAnswers: Record<string, number> = {};
    Object.entries(answers).forEach(([displayPos, selectedOpt]) => {
      const originalIdx = answerKeyMap[Number(displayPos)];
      if (originalIdx !== undefined) {
        remappedAnswers[String(originalIdx)] = Number(selectedOpt);
      }
    });

    let correct = 0;
    let newCorrectMap: Record<number, number> = {};

    try {
      const { data: graded, error: gradeErr } = await supabase.rpc(
        "grade_mock_test",
        {
          _test_id: activeTest.id,
          _answers: remappedAnswers as any,
        }
      );

      if (gradeErr) {
        toast({
          title: "Could not grade test",
          description: gradeErr.message,
          variant: "destructive",
        });
        // FIX: Do NOT return early — still save result and show result page
        // Previously an early return here caused: mobile users missing from admin
        // results AND page becoming invisible (stage never set to "result")
      } else {
        const result = (graded ?? {}) as {
          score?: number;
          total?: number;
          correct?: Record<string, number> | number[];
        };

        correct = result.score ?? 0;

        // FIX: Normalize correct answers — RPC may return array OR keyed object.
        // Previously used correctIndices[] (sparse array) which broke when RPC
        // returned an object. Now use correctMap{} which handles both formats.
        if (result.correct) {
          if (Array.isArray(result.correct)) {
            result.correct.forEach((correctOpt, dbIdx) => {
              if (correctOpt !== null && correctOpt !== undefined) {
                newCorrectMap[dbIdx] = correctOpt;
              }
            });
          } else {
            Object.entries(result.correct).forEach(([k, v]) => {
              newCorrectMap[Number(k)] = Number(v);
            });
          }
        }
      }
    } catch (e) {
      // Network error — proceed with score 0, still show result page
      console.error("grade_mock_test error:", e);
    }

    const total = activeTest.questions.length;
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    const passFail = percentage >= 60 ? "PASS ✅" : "Try Again 💪";

    setScore(correct);
    setResultTotal(total);
    setCorrectMap(newCorrectMap);

    // FIX: Insert always runs now (not inside the gradeErr early-return path).
    // This was the root cause of mobile users missing from admin Test Results.
    await supabase.from("mock_test_results").insert({
      student_name: studentName,
      whatsapp_no: whatsappNo,
      course: activeTest.course,
      score: correct,
      total,
      answers: remappedAnswers as any,
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
    setSubmitting(false);
    // FIX: setStage("result") now always reached — fixes page becoming invisible
    setStage("result");
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <section id="mock-test" className="py-12 bg-[#f8fafc]">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <Badge
            variant="outline"
            className="mb-4 text-accent border-accent/30 bg-accent/10"
          >
            <Trophy className="w-3 h-3 mr-1" /> Free Mock Tests
          </Badge>
          <h2 className="text-3xl md:text-5xl font-heading font-bold text-foreground mb-3">
            {settings.mocktest_section_heading || "Test Your Knowledge"}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base md:text-lg">
            {settings.mocktest_section_subheading ||
              "Pick a course, take a 30-minute test, and get your result instantly on WhatsApp."}
          </p>
          <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-medium">
            <Shuffle className="w-3 h-3" />
            {TEST_SIZE} questions randomly picked every time — unique test for
            every student
          </div>
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
                    const poolCount = test?.questions.length || 0;
                    const testCount = Math.min(TEST_SIZE, poolCount);
                    const difficulty =
                      poolCount >= 40
                        ? "Hard"
                        : poolCount >= 20
                        ? "Medium"
                        : "Easy";
                    const diffColor =
                      difficulty === "Hard"
                        ? "bg-destructive/10 text-destructive border-destructive/30"
                        : difficulty === "Medium"
                        ? "bg-accent/10 text-accent border-accent/30"
                        : "bg-green-100 text-green-700 border-green-300";
                    const icons = [BookOpen, Brain, Zap, Trophy];
                    const Icon =
                      icons[Math.abs(c.charCodeAt(0)) % icons.length];
                    return { c, poolCount, testCount, difficulty, diffColor, Icon };
                  });
                  const padded =
                    cards.length % 2 === 1 ? [...cards, null] : cards;
                  return padded.map((card, idx) => {
                    if (!card) {
                      return (
                        <div
                          key={`pad-${idx}`}
                          className="rounded-2xl border-2 border-dashed border-primary/20 p-6 flex flex-col items-center justify-center text-center text-muted-foreground bg-white/50"
                        >
                          <Sparkles className="w-8 h-8 mb-2 opacity-50" />
                          <p className="text-sm font-medium">
                            More tests coming soon
                          </p>
                        </div>
                      );
                    }
                    const { c, poolCount, testCount, difficulty, diffColor, Icon } =
                      card;
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
                          <span
                            className={`text-[10px] font-bold px-2 py-1 rounded-full border ${diffColor}`}
                          >
                            {difficulty}
                          </span>
                        </div>
                        <h3 className="font-heading font-bold text-lg text-foreground mb-1">
                          {c}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-1 flex items-center gap-3">
                          <span className="inline-flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5" />
                            {testCount} questions
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            30 min
                          </span>
                        </p>
                        {poolCount > testCount && (
                          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                            <Shuffle className="w-3 h-3 text-green-600" />
                            <span className="text-green-600 font-medium">
                              Shuffled from {poolCount}-question pool
                            </span>
                          </p>
                        )}
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

        {/* FIX: min-h-[400px] prevents container collapsing to zero on mobile
            when content is loading or transitioning — fixes "invisible page" bug */}
        {stage !== "intro" && (
          <div className="max-w-3xl mx-auto glass rounded-2xl p-6 md:p-8 bg-white min-h-[400px]">

            {stage === "register" && (
              <div className="space-y-4 max-w-md mx-auto">
                <h3 className="font-heading font-bold text-xl text-center mb-2">
                  Quick Register
                </h3>
                <p className="text-center text-sm text-muted-foreground">
                  You will receive{" "}
                  <span className="font-semibold text-accent">
                    {TEST_SIZE} randomly selected questions
                  </span>{" "}
                  — unique every time!
                </p>
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
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setStage("intro")}
                >
                  ← Back
                </Button>
              </div>
            )}

            {stage === "test" && activeTest && (
              <div>
                <div className="flex items-center justify-between mb-6 sticky top-0 bg-card/80 backdrop-blur py-2 -mx-2 px-2 rounded">
                  <div>
                    <span className="text-sm font-medium">
                      {activeTest.course}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {Object.keys(answers).length}/{activeTest.questions.length}{" "}
                      answered
                    </span>
                  </div>
                  {/* FIX: Red pulsing timer when under 60 seconds */}
                  <span
                    className={`inline-flex items-center gap-1 font-bold ${
                      secondsLeft < 60
                        ? "text-destructive animate-pulse"
                        : "text-accent"
                    }`}
                  >
                    <Clock className="w-4 h-4" /> {formatTime(secondsLeft)}
                  </span>
                </div>

                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                  {activeTest.questions.map((q, i) => (
                    <div key={i} className="border border-border rounded-xl p-4">
                      <p className="font-medium mb-3">
                        <span className="text-accent">Q{i + 1}.</span>{" "}
                        {q.question}
                      </p>
                      <div className="space-y-2">
                        {q.options.map((opt, j) => (
                          <label
                            key={j}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                              answers[i] === j
                                ? "bg-accent/10 border border-accent"
                                : "hover:bg-muted"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`q-${i}`}
                              checked={answers[i] === j}
                              onChange={() =>
                                // FIX: functional setter avoids stale closure on
                                // rapid mobile taps
                                setAnswers((prev) => ({ ...prev, [i]: j }))
                              }
                            />
                            <span className="text-sm">{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* FIX: disabled + spinner while submitting prevents double-tap */}
                <Button
                  onClick={submitTest}
                  size="lg"
                  disabled={submitting}
                  className="w-full mt-6 gradient-accent text-accent-foreground border-0"
                >
                  {submitting ? "Submitting…" : "Submit Test"}
                </Button>
              </div>
            )}

            {stage === "result" && activeTest && (
              <div className="text-center space-y-4">
                <div className="text-6xl">
                  {score / resultTotal >= 0.6 ? "🎉" : "💪"}
                </div>
                <h3 className="font-heading font-bold text-2xl">
                  {score / resultTotal >= 0.6
                    ? "You Passed!"
                    : "Keep Learning"}
                </h3>
                <p className="text-3xl font-bold text-accent">
                  {score} / {resultTotal}
                </p>
                <p className="text-muted-foreground">
                  {Math.round((score / resultTotal) * 100)}% score
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                  <Button
                    asChild
                    className="gradient-accent text-accent-foreground border-0"
                    size="lg"
                  >
                    <a
                      href={resultLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" /> Get Result on
                      WhatsApp
                    </a>
                  </Button>
                  {/* FIX: Full state reset on retake prevents stale answerKeyMap
                      corrupting scores on a second attempt */}
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      setStage("intro");
                      setAnswers({});
                      setAnswerKeyMap([]);
                      setCorrectMap({});
                      setActiveTest(null);
                      setStudentName("");
                      setWhatsappNo("");
                      hasSubmitted.current = false;
                    }}
                  >
                    Take Another Test
                  </Button>
                </div>

                <details className="text-left mt-6">
                  <summary className="cursor-pointer font-medium select-none">
                    Review Answers
                  </summary>
                  <div className="mt-4 space-y-3">
                    {activeTest.questions.map((q, i) => {
                      const originalIdx = answerKeyMap[i];
                      // FIX: use correctMap (object keyed by DB index) instead of
                      // sparse array — handles both array and object RPC responses
                      const correctIdx = correctMap[originalIdx];
                      const userAnswer = answers[i];
                      const isCorrect =
                        userAnswer !== undefined && userAnswer === correctIdx;
                      return (
                        <div
                          key={i}
                          className="border rounded-lg p-3 text-sm"
                        >
                          <div className="flex items-start gap-2">
                            {isCorrect ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                            )}
                            <div>
                              <p className="font-medium">{q.question}</p>
                              <p className="text-muted-foreground mt-1">
                                Correct:{" "}
                                {correctIdx !== undefined
                                  ? q.options[correctIdx] ?? "—"
                                  : "—"}
                              </p>
                              {!isCorrect && userAnswer !== undefined && (
                                <p className="text-destructive mt-0.5">
                                  Your answer: {q.options[userAnswer]}
                                </p>
                              )}
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
