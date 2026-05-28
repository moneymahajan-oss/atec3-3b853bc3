// src/components/FloatingChatbot.tsx
// AI-powered floating chatbot for ATEC Education website
// Uses Anthropic API via the Claude claude-sonnet-4-20250514 model
// Add <FloatingChatbot /> to your App.tsx or main layout

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  ChevronDown,
  Phone,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SYSTEM_PROMPT = `You are ATEC Assistant — a friendly, knowledgeable AI helpbot for ATEC (Avenue To Excellent Careers), Punjab's premier computer education institute located in Gurdaspur.

Your job is to help students, parents, and visitors with:
- Course information (Computer Basics, MS Office, Tally, DTP, Web Design, Programming, Digital Marketing, Hardware & Networking, etc.)
- Admission enquiries and fee structure guidance
- Batch timings and schedules
- Certificate and verification questions
- Career guidance related to ATEC courses
- Contact and location information
- Mock test and assessment queries

Key facts about ATEC:
- Location: Gurdaspur, Punjab, India
- Speciality: Computer education and IT courses
- Offers both short-term and long-term courses
- Provides industry-recognised certificates
- Has a student CRM, online mock tests, and a dedicated admin panel

Tone guidelines:
- Be warm, encouraging, and professional
- Keep replies concise and helpful (2–4 sentences max unless asked for details)
- Use simple English mixed with occasional Punjabi/Hindi phrases if it makes the student comfortable (like "Ji" for yes)
- Always end with an actionable next step (e.g., "You can WhatsApp us or fill the enquiry form")
- Never fabricate specific fee amounts or dates — say "Please contact us for the latest details"
- If you don't know something, say so and suggest contacting ATEC directly

Never discuss competitors, politics, or topics unrelated to ATEC or education.`;

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "👋 Sat Sri Akal! I'm the ATEC Assistant.\n\nI can help you with course details, admissions, batch timings, and more. What would you like to know?",
  timestamp: new Date(),
};

const QUICK_REPLIES = [
  "Which courses do you offer?",
  "How to take admission?",
  "What are the batch timings?",
  "Certificate verification",
];

export default function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPulse, setShowPulse] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
      setUnreadCount(0);
      setShowPulse(false);
    }
  }, [isOpen]);

  // Show pulse after 3s to attract attention
  useEffect(() => {
    const t = setTimeout(() => setShowPulse(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const sendMessage = async (text?: string) => {
    const content = (text || input).trim();
    if (!content || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // Build conversation history (skip welcome, include last 10 messages)
      const history = messages
        .filter((m) => m.id !== "welcome")
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [...history, { role: "user", content }],
        }),
      });

      const data = await response.json();
      const reply =
        data?.content?.[0]?.text ||
        "Sorry, I couldn't process that. Please try again or contact ATEC directly.";

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Increment unread badge if chat is closed
      if (!isOpen) {
        setUnreadCount((n) => n + 1);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "Sorry, there was a connection issue. Please try again or WhatsApp us directly!",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const formatContent = (text: string) =>
    text.split("\n").map((line, i) => (
      <span key={i}>
        {line}
        {i < text.split("\n").length - 1 && <br />}
      </span>
    ));

  return (
    <>
      {/* ── Chat Window ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[380px] max-h-[600px] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
            style={{
              background: "white",
              border: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 px-4 py-3 text-white relative overflow-hidden flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",
              }}
            >
              {/* Background decoration */}
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 80% 50%, white 0%, transparent 60%)",
                }}
              />
              <div className="relative w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
                <span
                  className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-white"
                  aria-hidden="true"
                />
              </div>
              <div className="relative flex-1 min-w-0">
                <div className="font-bold text-sm leading-tight">
                  ATEC Assistant
                </div>
                <div className="text-xs text-white/70 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  Online — typically replies instantly
                </div>
              </div>
              <div className="relative flex items-center gap-1">
                <a
                  href="https://wa.me/917986xxxxxx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 transition-colors flex items-center justify-center"
                  title="WhatsApp ATEC"
                >
                  <Phone className="w-4 h-4 text-white" />
                </a>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 transition-colors flex items-center justify-center"
                  aria-label="Close chat"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 bg-gradient-to-b from-slate-50 to-white">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-2 ${
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      msg.role === "assistant"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <Bot className="w-3.5 h-3.5" />
                    ) : (
                      <User className="w-3.5 h-3.5" />
                    )}
                  </div>

                  {/* Bubble */}
                  <div
                    className={`max-w-[75%] flex flex-col ${
                      msg.role === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "rounded-tr-sm text-white"
                          : "rounded-tl-sm bg-white text-slate-800 border border-slate-100 shadow-sm"
                      }`}
                      style={
                        msg.role === "user"
                          ? {
                              background:
                                "linear-gradient(135deg, #2563eb, #1e40af)",
                            }
                          : {}
                      }
                    >
                      {formatContent(msg.content)}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2 items-end"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-white border border-slate-100 shadow-sm px-4 py-3 rounded-2xl rounded-tl-sm">
                    <div className="flex gap-1 items-center h-4">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="w-1.5 h-1.5 bg-blue-400 rounded-full"
                          animate={{ y: [0, -4, 0] }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.15,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Replies — show only on first message */}
            {messages.length <= 1 && (
              <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide flex-shrink-0 bg-white">
                {QUICK_REPLIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="whitespace-nowrap text-xs px-3 py-1.5 rounded-full border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors flex-shrink-0"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-3 py-3 bg-white border-t border-slate-100 flex-shrink-0">
              <div className="flex gap-2 items-center bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 focus-within:border-blue-400 focus-within:bg-white transition-colors">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about courses, admissions…"
                  className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none min-w-0"
                  disabled={isLoading}
                  maxLength={500}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isLoading}
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: input.trim()
                      ? "linear-gradient(135deg, #2563eb, #1e40af)"
                      : "#e2e8f0",
                  }}
                  aria-label="Send message"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Send
                      className={`w-4 h-4 ${
                        input.trim() ? "text-white" : "text-slate-400"
                      }`}
                    />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-1.5">
                Powered by AI · For urgent queries{" "}
                <a
                  href="#contact"
                  className="text-blue-500 hover:underline"
                >
                  contact ATEC
                </a>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Button ── */}
      <div className="fixed bottom-5 right-4 sm:right-6 z-50">
        {/* Scroll-to-top hint when chat closed */}
        <AnimatePresence>
          {!isOpen && showPulse && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute bottom-16 right-0 w-max max-w-[200px] bg-slate-900 text-white text-xs px-3 py-2 rounded-xl rounded-br-sm shadow-lg pointer-events-none"
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                <span>Ask me about courses!</span>
              </div>
              {/* Arrow */}
              <div
                className="absolute -bottom-1.5 right-3 w-3 h-3 bg-slate-900 rotate-45"
                style={{ clipPath: "polygon(0 0, 100% 100%, 0 100%)" }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => setIsOpen((v) => !v)}
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.05 }}
          className="relative w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white"
          style={{
            background: isOpen
              ? "linear-gradient(135deg, #475569, #334155)"
              : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",
          }}
          aria-label={isOpen ? "Close chat" : "Open ATEC Assistant"}
        >
          {/* Pulse ring when closed */}
          {!isOpen && (
            <motion.span
              className="absolute inset-0 rounded-full"
              style={{ border: "2px solid #2563eb" }}
              animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            />
          )}

          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-6 h-6" />
              </motion.div>
            ) : (
              <motion.div
                key="open"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <MessageCircle className="w-6 h-6" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Unread badge */}
          <AnimatePresence>
            {unreadCount > 0 && !isOpen && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white"
              >
                {unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </>
  );
}
