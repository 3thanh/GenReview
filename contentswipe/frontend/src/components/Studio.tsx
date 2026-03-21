import { useState, useRef, useEffect } from "react";
import {
  Send,
  Plus,
  Loader2,
  Video,
  FileText,
  Headphones,
  ChevronRight,
  Sparkles,
  Upload,
  Image,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useGenerationJobs } from "../hooks/useFeed";
import type { ContentType, GenerationJob } from "../types/database";

interface Message {
  id: string;
  role: "user" | "system";
  content: string;
  contentType?: ContentType;
  jobId?: string;
  timestamp: number;
}

interface Session {
  id: string;
  name: string;
  messages: Message[];
}

export function Studio() {
  const [sessions, setSessions] = useState<Session[]>([
    {
      id: "default",
      name: "Default Session",
      messages: [],
    },
  ]);
  const [activeSessionId, setActiveSessionId] = useState("default");
  const [input, setInput] = useState("");
  const [contentType, setContentType] = useState<ContentType>("video_script");
  const [generating, setGenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const activeJobs = useGenerationJobs();

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) ?? sessions[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession.messages]);

  const createSession = () => {
    const id = crypto.randomUUID();
    const session: Session = {
      id,
      name: `Session ${sessions.length + 1}`,
      messages: [],
    };
    setSessions((prev) => [...prev, session]);
    setActiveSessionId(id);
  };

  const addMessage = (msg: Omit<Message, "id" | "timestamp">) => {
    const message: Message = {
      ...msg,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, messages: [...s.messages, message] }
          : s
      )
    );
  };

  const handleGenerate = async () => {
    if (!input.trim() || generating) return;

    const prompt = input.trim();
    setInput("");
    setGenerating(true);

    addMessage({ role: "user", content: prompt, contentType });

    try {
      const { data: cardData, error: cardErr } = await supabase
        .from("content_queue")
        .insert({
          title: prompt.slice(0, 100),
          description: prompt,
          content_type: contentType,
          status: "pending",
        } as any)
        .select()
        .single();

      const card = cardData as any;
      if (cardErr || !card) throw new Error(cardErr?.message ?? "Failed to create");

      const { data: jobData, error: jobErr } = await supabase
        .from("generation_jobs")
        .insert({
          content_queue_id: card.id,
          job_type: "initial",
          prompt,
        })
        .select()
        .single();

      const job = jobData as any;
      if (jobErr) throw new Error(jobErr.message);

      addMessage({
        role: "system",
        content: `Generation started! Your ${
          contentType === "video_script"
            ? "video"
            : contentType === "linkedin_post"
              ? "LinkedIn post"
              : "support reply"
        } is being created. It will appear in the feed once ready.`,
        jobId: job?.id,
      });
    } catch (e: any) {
      addMessage({
        role: "system",
        content: `Error: ${e.message}`,
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const TYPE_OPTIONS: { value: ContentType; label: string; icon: typeof Video }[] = [
    { value: "video_script", label: "Video", icon: Video },
    { value: "linkedin_post", label: "LinkedIn", icon: FileText },
    { value: "support_reply", label: "Support", icon: Headphones },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-64 border-r border-zinc-800 flex flex-col bg-zinc-950">
          <div className="p-3 border-b border-zinc-800">
            <button
              onClick={createSession}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700/30 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Session
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSessionId(s.id)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  s.id === activeSessionId
                    ? "bg-zinc-800/50 text-white"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* Active jobs */}
          {activeJobs.length > 0 && (
            <div className="border-t border-zinc-800 p-3">
              <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider mb-2">
                Active Jobs
              </p>
              {activeJobs.map((job) => (
                <div key={job.id} className="flex items-center gap-2 py-1.5">
                  <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                  <span className="text-xs text-zinc-400 truncate">
                    {job.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Toggle sidebar */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-5 h-10 bg-zinc-800 border border-zinc-700/50 rounded-r flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          style={{ left: sidebarOpen ? "256px" : 0 }}
        >
          <ChevronRight
            className={`w-3 h-3 transition-transform ${sidebarOpen ? "rotate-180" : ""}`}
          />
        </button>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          {activeSession.messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-zinc-800/50 border border-zinc-700/30 flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-zinc-500" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">
                Create Content
              </h2>
              <p className="text-sm text-zinc-400 max-w-sm">
                Describe the content you want to generate. Choose a content type
                and hit send. Your content will appear in the feed for review.
              </p>
            </div>
          )}

          {activeSession.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex mb-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-md rounded-2xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-white text-black rounded-br-md"
                    : "bg-zinc-800 text-zinc-200 border border-zinc-700/30 rounded-bl-md"
                }`}
              >
                {msg.contentType && msg.role === "user" && (
                  <span className="text-[11px] opacity-60 uppercase tracking-wider block mb-1">
                    {msg.contentType === "video_script"
                      ? "Video"
                      : msg.contentType === "linkedin_post"
                        ? "LinkedIn"
                        : "Support"}
                  </span>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-zinc-800 px-6 py-4">
          {/* Content type selector */}
          <div className="flex items-center gap-2 mb-3">
            {TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setContentType(value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  contentType === value
                    ? "bg-white text-black"
                    : "bg-zinc-800/50 text-zinc-400 border border-zinc-700/30 hover:text-zinc-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Text input */}
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the content you want to generate..."
              rows={2}
              className="flex-1 bg-zinc-800/50 border border-zinc-700/30 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 resize-none focus:outline-none focus:border-zinc-600 transition-colors"
            />
            <button
              onClick={handleGenerate}
              disabled={!input.trim() || generating}
              className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
