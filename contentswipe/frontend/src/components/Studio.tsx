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
  Layers,
  Share2,
  Check,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useGenerationJobs } from "../hooks/useFeed";
import type {
  Business,
  BusinessInsert,
  ContentItemInsert,
  ContentType,
  GenerationJobInsert,
  Session,
  SessionInsert,
  SwipeDirection,
} from "../types/database";
import type { Persona } from "../lib/personas";

interface Message {
  id: string;
  role: "user" | "system";
  content: string;
  contentType?: ContentType;
  jobId?: string;
  timestamp: number;
}

interface StudioSession {
  id: string;
  name: string;
  messages: Message[];
}

interface StudioProps {
  personas: Persona[];
  activePersonaId: string;
  onPersonasChange: (personas: Persona[]) => void;
  onSelectPersona: (personaId: string) => void;
}

const DEFAULT_BUSINESS: BusinessInsert = {
  name: "ContentSwipe Demo",
  description: "Default workspace for local review flows",
};

const DEFAULT_CHANNEL_BY_TYPE: Record<ContentType, string> = {
  video: "tiktok",
  social: "linkedin",
  support: "intercom",
};

const TYPE_OPTIONS: Array<{
  value: ContentType;
  label: string;
  icon: typeof Video;
}> = [
  { value: "video", label: "Video", icon: Video },
  { value: "social", label: "Social", icon: FileText },
  { value: "support", label: "Support", icon: Headphones },
];

const PERSONA_ICON_OPTIONS: Array<{
  value: Persona["icon"];
  label: string;
  icon: typeof Video;
}> = [
  { value: "video", label: "Video", icon: Video },
  { value: "headset", label: "Support", icon: Headphones },
  { value: "share", label: "Social", icon: Share2 },
  { value: "layers", label: "Everything", icon: Layers },
];

const PERSONA_ICONS: Record<Persona["icon"], typeof Layers> = {
  video: Video,
  headset: Headphones,
  share: Share2,
  layers: Layers,
};

const SWIPE_DIRECTIONS: SwipeDirection[] = ["left", "right", "up", "down"];

async function ensureBusiness(): Promise<Business> {
  const { data: existing, error: existingError } = await supabase
    .from("businesses")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return existing as Business;
  }

  const { data: created, error: createError } = await supabase
    .from("businesses")
    .insert(DEFAULT_BUSINESS)
    .select()
    .single();

  if (createError || !created) {
    throw new Error(createError?.message ?? "Failed to create business");
  }

  return created as Business;
}

async function ensureSession(businessId: string): Promise<Session[]> {
  const { data: existing, error: existingError } = await supabase
    .from("sessions")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing && existing.length > 0) {
    return existing as Session[];
  }

  const defaultSession: SessionInsert = {
    business_id: businessId,
    name: "Launch Session",
  };

  const { data: created, error: createError } = await supabase
    .from("sessions")
    .insert(defaultSession)
    .select();

  if (createError || !created) {
    throw new Error(createError?.message ?? "Failed to create session");
  }

  return created as Session[];
}

export function Studio({
  personas,
  activePersonaId,
  onPersonasChange,
  onSelectPersona,
}: StudioProps) {
  const [sessions, setSessions] = useState<StudioSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [input, setInput] = useState("");
  const [contentType, setContentType] = useState<ContentType>("video");
  const [generating, setGenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const activeJobs = useGenerationJobs();

  const activeSession =
    sessions.find((session) => session.id === activeSessionId) ?? sessions[0];
  const activePersona =
    personas.find((persona) => persona.id === activePersonaId) ?? personas[0];

  useEffect(() => {
    let cancelled = false;

    const loadWorkspace = async () => {
      setLoadingSessions(true);
      try {
        const business = await ensureBusiness();
        const dbSessions = await ensureSession(business.id);

        if (cancelled) return;

        setBusinessId(business.id);
        setSessions((prev) => {
          const messagesBySession = new Map(
            prev.map((session) => [session.id, session.messages])
          );

          return dbSessions.map((session) => ({
            id: session.id,
            name: session.name,
            messages: messagesBySession.get(session.id) ?? [],
          }));
        });
        setActiveSessionId((prev) =>
          dbSessions.some((session) => session.id === prev)
            ? prev
            : dbSessions[0]?.id ?? ""
        );
      } catch (error: any) {
        if (!cancelled) {
          setSessions([
            {
              id: "fallback",
              name: "Offline Session",
              messages: [
                {
                  id: crypto.randomUUID(),
                  role: "system",
                  content: `Error: ${error.message ?? "Failed to load sessions"}`,
                  timestamp: Date.now(),
                },
              ],
            },
          ]);
          setActiveSessionId("fallback");
        }
      } finally {
        if (!cancelled) {
          setLoadingSessions(false);
        }
      }
    };

    void loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages]);

  useEffect(() => {
    if (!activePersona) return;
    if (!activePersona.contentTypes.includes(contentType)) {
      setContentType(activePersona.contentTypes[0] ?? "video");
    }
  }, [activePersona, contentType]);

  const createSession = async () => {
    if (!businessId) return;

    const sessionInput: SessionInsert = {
      business_id: businessId,
      name: `Session ${sessions.length + 1}`,
    };

    const { data, error } = await supabase
      .from("sessions")
      .insert(sessionInput)
      .select()
      .single();

    if (error || !data) {
      addMessage({
        role: "system",
        content: `Error: ${error?.message ?? "Failed to create session"}`,
      });
      return;
    }

    const session = data as Session;
    setSessions((prev) => [
      ...prev,
      {
        id: session.id,
        name: session.name,
        messages: [],
      },
    ]);
    setActiveSessionId(session.id);
  };

  const addMessage = (msg: Omit<Message, "id" | "timestamp">) => {
    const message: Message = {
      ...msg,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    setSessions((prev) =>
      prev.map((session) =>
        session.id === activeSessionId
          ? { ...session, messages: [...session.messages, message] }
          : session
      )
    );
  };

  const updatePersona = (
    personaId: string,
    updater: (persona: Persona) => Persona
  ) => {
    onPersonasChange(
      personas.map((persona) =>
        persona.id === personaId ? updater(persona) : persona
      )
    );
  };

  const toggleContentType = (type: ContentType) => {
    if (!activePersona) return;

    const hasType = activePersona.contentTypes.includes(type);
    const nextTypes = hasType
      ? activePersona.contentTypes.filter((value) => value !== type)
      : [...activePersona.contentTypes, type];

    if (nextTypes.length === 0) return;

    const orderedTypes = TYPE_OPTIONS.filter((option) =>
      nextTypes.includes(option.value)
    ).map((option) => option.value);

    updatePersona(activePersona.id, (persona) => ({
      ...persona,
      contentTypes: orderedTypes,
    }));
  };

  const handleGenerate = async () => {
    if (!input.trim() || generating || !activeSession || !businessId) return;

    const prompt = input.trim();
    setInput("");
    setGenerating(true);

    addMessage({ role: "user", content: prompt, contentType });

    try {
      const contentItem: ContentItemInsert = {
        title: prompt.slice(0, 100),
        body_text: prompt,
        business_id: businessId,
        session_id: activeSession.id,
        content_type: contentType,
        channel: DEFAULT_CHANNEL_BY_TYPE[contentType],
        review_mode: contentType,
        review_status: "pending",
        source_type: "generated",
        prompt_input_summary: prompt,
        generation_status: "queued",
      };

      const { data: cardData, error: cardErr } = await supabase
        .from("content_items")
        .insert(contentItem)
        .select()
        .single();

      if (cardErr || !cardData) {
        throw new Error(cardErr?.message ?? "Failed to create content item");
      }

      const jobInput: GenerationJobInsert = {
        content_item_id: (cardData as { id: string }).id,
        job_type: "initial",
        prompt,
        status: "queued",
      };

      const { data: jobData, error: jobErr } = await supabase
        .from("generation_jobs")
        .insert(jobInput)
        .select()
        .single();

      if (jobErr) throw new Error(jobErr.message);

      const typeLabel =
        contentType === "video"
          ? "video"
          : contentType === "social"
            ? "social post"
            : "support reply";

      addMessage({
        role: "system",
        content: `Generation started in ${activeSession.name}. Your ${typeLabel} is queued now and will appear in the ${activePersona?.name ?? "selected"} feed as it updates.`,
        jobId: (jobData as { id?: string } | null)?.id,
      });
    } catch (error: any) {
      addMessage({
        role: "system",
        content: `Error: ${error.message}`,
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleGenerate();
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {sidebarOpen && (
        <div className="flex w-80 flex-col border-r border-zinc-800 bg-zinc-950 xl:w-96">
          <div className="border-b border-zinc-800 p-3">
            <button
              onClick={() => {
                void createSession();
              }}
              disabled={!businessId || loadingSessions}
              className="flex w-full items-center gap-2 rounded-lg border border-zinc-700/30 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
            >
              <Plus className="h-4 w-4" />
              New Session
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="border-b border-zinc-800 px-3 py-3">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
                Sessions
              </p>
              <div className="space-y-1.5">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setActiveSessionId(session.id)}
                    className={`w-full rounded-xl px-4 py-2.5 text-left text-sm transition-colors ${
                      session.id === activeSessionId
                        ? "bg-zinc-800/60 text-white"
                        : "text-zinc-400 hover:bg-zinc-800/30 hover:text-zinc-200"
                    }`}
                  >
                    {session.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-b border-zinc-800 px-3 py-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
                  Personas
                </p>
                <span className="rounded-full border border-zinc-700/60 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                  Prebuilt
                </span>
              </div>

              <div className="space-y-2">
                {personas.map((persona) => {
                  const Icon = PERSONA_ICONS[persona.icon] ?? Layers;
                  const isActive = persona.id === activePersona?.id;

                  return (
                    <button
                      key={persona.id}
                      onClick={() => onSelectPersona(persona.id)}
                      className={`w-full rounded-2xl border px-3 py-3 text-left transition-all ${
                        isActive
                          ? "border-white/15 bg-zinc-900 text-white"
                          : "border-zinc-800 bg-zinc-950/50 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/80"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-xl border border-zinc-800 bg-black/40 p-2">
                          <Icon className="h-4 w-4 text-zinc-300" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{persona.name}</p>
                          <p className="mt-1 text-xs leading-5 text-zinc-500">
                            {persona.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {activePersona && (
              <div className="space-y-4 px-3 py-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
                    Configure Persona
                  </p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    These values are preloaded from the hard-coded personas and can now be adjusted here.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                    Name
                  </label>
                  <input
                    value={activePersona.name}
                    onChange={(event) =>
                      updatePersona(activePersona.id, (persona) => ({
                        ...persona,
                        name: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-zinc-600"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                    Description
                  </label>
                  <textarea
                    value={activePersona.description}
                    onChange={(event) =>
                      updatePersona(activePersona.id, (persona) => ({
                        ...persona,
                        description: event.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-zinc-600"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                    Icon
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {PERSONA_ICON_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const isSelected = option.value === activePersona.icon;

                      return (
                        <button
                          key={option.value}
                          onClick={() =>
                            updatePersona(activePersona.id, (persona) => ({
                              ...persona,
                              icon: option.value,
                            }))
                          }
                          className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                            isSelected
                              ? "border-emerald-500/40 bg-emerald-500/10 text-white"
                              : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                      Content Types
                    </label>
                    <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                      At least one
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {TYPE_OPTIONS.map(({ value, label, icon: Icon }) => {
                      const isSelected = activePersona.contentTypes.includes(value);
                      const isLocked =
                        isSelected && activePersona.contentTypes.length === 1;

                      return (
                        <button
                          key={value}
                          onClick={() => toggleContentType(value)}
                          disabled={isLocked}
                          className={`rounded-xl border px-3 py-3 text-sm transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                            isSelected
                              ? "border-sky-500/40 bg-sky-500/10 text-white"
                              : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                          }`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <Icon className="h-4 w-4" />
                            <span>{label}</span>
                            {isSelected ? (
                              <Check className="h-3 w-3 text-sky-300" />
                            ) : (
                              <span className="h-3" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                    Review Actions
                  </label>
                  <div className="space-y-2">
                    {SWIPE_DIRECTIONS.map((direction) => {
                      const swipeLabel = activePersona.swipeLabels[direction];

                      return (
                        <div
                          key={direction}
                          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className="rounded-full border border-zinc-700 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                              {swipeLabel.shortcut}
                            </span>
                            <input
                              type="color"
                              value={swipeLabel.color}
                              onChange={(event) =>
                                updatePersona(activePersona.id, (persona) => ({
                                  ...persona,
                                  swipeLabels: {
                                    ...persona.swipeLabels,
                                    [direction]: {
                                      ...persona.swipeLabels[direction],
                                      color: event.target.value,
                                    },
                                  },
                                }))
                              }
                              className="h-8 w-10 cursor-pointer rounded border border-zinc-700 bg-transparent"
                            />
                          </div>

                          <input
                            value={swipeLabel.action}
                            onChange={(event) =>
                              updatePersona(activePersona.id, (persona) => ({
                                ...persona,
                                swipeLabels: {
                                  ...persona.swipeLabels,
                                  [direction]: {
                                    ...persona.swipeLabels[direction],
                                    action: event.target.value,
                                  },
                                },
                              }))
                            }
                            className="w-full rounded-xl border border-zinc-800 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-zinc-600"
                          />

                          <button
                            onClick={() =>
                              updatePersona(activePersona.id, (persona) => ({
                                ...persona,
                                swipeLabels: {
                                  ...persona.swipeLabels,
                                  [direction]: {
                                    ...persona.swipeLabels[direction],
                                    requiresFeedback:
                                      !persona.swipeLabels[direction].requiresFeedback,
                                  },
                                },
                              }))
                            }
                            className={`mt-2 w-full rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                              swipeLabel.requiresFeedback
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                                : "border-zinc-800 bg-black/30 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                            }`}
                          >
                            {swipeLabel.requiresFeedback
                              ? "Feedback Required"
                              : "Feedback Optional"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                    Empty State Message
                  </label>
                  <input
                    value={activePersona.emptyStateMessage}
                    onChange={(event) =>
                      updatePersona(activePersona.id, (persona) => ({
                        ...persona,
                        emptyStateMessage: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-zinc-600"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                    Empty State CTA
                  </label>
                  <input
                    value={activePersona.emptyStateCta}
                    onChange={(event) =>
                      updatePersona(activePersona.id, (persona) => ({
                        ...persona,
                        emptyStateCta: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-zinc-600"
                  />
                </div>
              </div>
            )}
          </div>

          {activeJobs.length > 0 && (
            <div className="border-t border-zinc-800 p-3">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Active Jobs
              </p>
              {activeJobs.map((job) => (
                <div key={job.id} className="flex items-center gap-2 py-1.5">
                  <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
                  <span className="truncate text-xs text-zinc-400">{job.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-1 flex-col">
        <button
          onClick={() => setSidebarOpen((value) => !value)}
          className="absolute left-0 top-1/2 z-10 flex h-10 w-5 -translate-y-1/2 items-center justify-center rounded-r border border-zinc-700/50 bg-zinc-800 text-zinc-400 transition-colors hover:text-white"
          style={{ left: sidebarOpen ? "20rem" : 0 }}
        >
          <ChevronRight
            className={`h-3 w-3 transition-transform ${sidebarOpen ? "rotate-180" : ""}`}
          />
        </button>

        <div className="flex-1 overflow-y-auto px-6 py-8">
          {loadingSessions && (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
            </div>
          )}

          {!loadingSessions && activeSession?.messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-zinc-700/30 bg-zinc-800/50">
                <Sparkles className="h-7 w-7 text-zinc-500" />
              </div>
              <h2 className="mb-2 text-lg font-semibold text-white">
                Create Content as {activePersona?.name ?? "Your Persona"}
              </h2>
              <p className="max-w-sm text-sm text-zinc-400">
                Describe the content you want to generate, then use the left sidebar to tune persona labels, review actions, and supported content types.
              </p>
            </div>
          )}

          {activeSession?.messages.map((message) => (
            <div
              key={message.id}
              className={`mb-4 flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-md rounded-2xl px-4 py-3 text-sm ${
                  message.role === "user"
                    ? "rounded-br-md bg-white text-black"
                    : "rounded-bl-md border border-zinc-700/30 bg-zinc-800 text-zinc-200"
                }`}
              >
                {message.contentType && message.role === "user" && (
                  <span className="mb-1 block text-[11px] uppercase tracking-wider opacity-60">
                    {message.contentType === "video"
                      ? "Video"
                      : message.contentType === "social"
                        ? "Social"
                        : "Support"}
                  </span>
                )}
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-zinc-800 px-6 py-4">
          {activePersona && (
            <div className="mb-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                Active Persona
              </p>
              <div className="mt-1 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">{activePersona.name}</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    {activePersona.description}
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {activePersona.contentTypes.map((type) => (
                    <span
                      key={type}
                      className="rounded-full border border-zinc-700/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-zinc-400"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="mb-3 flex items-center gap-2">
            {TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setContentType(value)}
                disabled={!activePersona?.contentTypes.includes(value)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  contentType === value
                    ? "bg-white text-black"
                    : "border border-zinc-700/30 bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-35"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the content you want to generate..."
              rows={2}
              className="flex-1 resize-none rounded-xl border border-zinc-700/30 bg-zinc-800/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 transition-colors focus:border-zinc-600 focus:outline-none"
            />
            <button
              onClick={() => {
                void handleGenerate();
              }}
              disabled={
                !input.trim() ||
                generating ||
                loadingSessions ||
                !activeSession ||
                !businessId
              }
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white text-black transition-all hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
