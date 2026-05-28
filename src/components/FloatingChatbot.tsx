// src/components/FloatingChatbot.tsx
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, X, Send, Bot, User, Loader2, Sparkles, ChevronDown, Phone,
} from "lucide-react";

// Direct URL — bypasses supabase-js client to avoid connection issues
const CHAT_URL = "https://mrshgfevvanopzrocdb.supabase.co/functions/v1/chat";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: "👋 Sat Sri Akal! I'm the ATEC Assistant.\n\nI can help you with course details, admissions, batch timings, and more. What would you like to know?",
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
  const [showTooltip, setShowTooltip] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
      setUnreadCount(0);
      setShowTooltip(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const t = setTimeout(() => setShowTooltip(true), 4000);
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
      const history = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      // Direct fetch to Supabase Edge Function URL
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...history, { role: "user", content }],
        }),
      });

      const data = await response.json();
      const reply = data?.reply || "Sorry, I couldn't respond right now. Please try again or contact ATEC directly!";

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (!isOpen) setUnreadCount((n) => n + 1);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Connection issue. Please try again or WhatsApp ATEC directly!",
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
    text.split("\n").map((line, i, arr) => (
      <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
    ));

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-24 right-4 sm:right-6 z-[9999] w-[calc(100vw-2rem)] sm:w-[380px] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
            style={{ maxHeight: "min(600px, calc(100vh - 120px))", background: "white", border: "1px solid rgba(0,0,0,0.08)" }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 px-4 py-3 text-white relative overflow-hidden flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)" }}
            >
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 50%, white 0%, transparent 60%)" }} />
              <div className="relative w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-white" />
              </div>
              <div className="relative flex-1 min-w-0">
                <div className="font-bold text-sm leading-tight">ATEC Assistant</div>
                <div className="text-xs text-white/70 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  Online · Powered by AI
                </div>
              </div>
              <div className="relative flex items-center gap-1.5">
                <a
                  href="https://wa.me/919876543210"
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
                  className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${msg.role === "assistant" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                    {msg.role === "assistant" ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                  </div>
                  <div className={`max-w-[75%] flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "rounded-tr-sm text-white" : "rounded-tl-sm bg-white text-slate-800 border border-slate-100 shadow-sm"}`}
                      style={msg.role === "user" ? { background: "linear-gradient(135deg, #2563eb, #1e40af)" } : {}}
                    >
                      {formatContent(msg.content)}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1">{formatTime(msg.timestamp)}</span>
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 items-end">
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-white border border-slate-100 shadow-sm px-4 py-3 rounded-2xl rounded-tl-sm">
                    <div className="flex gap-1 items-center h-4">
                      {[0, 1, 2].map((i) => (
                        <motion.span key={i} className="w-1.5 h-1.5 bg-blue-400 rounded-full"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick replies */}
            {messages.length <= 1 && (
              <div className="px-4 pb-2 flex gap-2 overflow-x-auto flex-shrink-0 bg-white">
                {QUICK_REPLIES.map((q) => (
                  <button key={q} onClick={() => sendMessage(q)}
                    className="whitespace-nowrap text-xs px-3 py-1.5 rounded-full border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors flex-shrink-0">
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
                  style={{ background: input.trim() ? "linear-gradient(135deg, #2563eb, #1e40af)" : "#e2e8f0" }}
                  aria-label="Send"
                >
                  {isLoading
                    ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                    : <Send className={`w-4 h-4 ${input.trim() ? "text-white" : "text-slate-400"}`} />
                  }
                </button>
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-1.5">
                AI-powered · For urgent queries{" "}
                <a href="#contact" className="text-blue-500 hover:underline">contact ATEC</a>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <div className="fixed bottom-5 right-4 sm:right-6 z-[9999]">
        <AnimatePresence>
          {!isOpen && showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute bottom-16 right-0 w-max max-w-[190px] bg-slate-900 text-white text-xs px-3 py-2 rounded-xl rounded-br-sm shadow-lg pointer-events-none"
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                <span>Ask me about courses!</span>
              </div>
              <div className="absolute -bottom-1.5 right-3 w-3 h-3 bg-slate-900 rotate-45" style={{ clipPath: "polygon(0 0, 100% 100%, 0 100%)" }} />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => setIsOpen((v) => !v)}
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.06 }}
          className="relative w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white"
          style={{ background: isOpen ? "linear-gradient(135deg, #475569, #334155)" : "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)" }}
          aria-label={isOpen ? "Close chat" : "Open ATEC Assistant"}
        >
          {!isOpen && (
            <motion.span
              className="absolute inset-0 rounded-full"
              style={{ border: "2px solid #3b82f6" }}
              animate={{ scale: [1, 1.55], opacity: [0.7, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            />
          )}
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}>
                <ChevronDown className="w-6 h-6" />
              </motion.div>
            ) : (
              <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.18 }}>
                <MessageCircle className="w-6 h-6" />
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {unreadCount > 0 && !isOpen && (
              <motion.span
                initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
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
