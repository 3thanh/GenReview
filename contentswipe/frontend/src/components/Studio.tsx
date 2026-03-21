import { useState, useRef, useEffect } from "react";
import {
  Send,
  Plus,
  Loader2,
  Video,
  FileText,
  Headphones,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Layers,
  Share2,
  Check,
  Settings2,
  Film,
  Clock,
  Mic,
  Palette,
  LayoutGrid,
  Zap,
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

// ── Video Generation Config ─────────────────────────────────────────────

type VisualStyle =
  | "cinematic_cgi"
  | "photorealistic"
  | "2d_animation"
  | "motion_graphics"
  | "anime"
  | "watercolor";

type ScriptFormat =
  | "comedy_skit"
  | "product_showcase"
  | "tutorial"
  | "testimonial"
  | "meme_viral"
  | "storytelling";

type VideoDuration = "15-30s" | "30-60s" | "60-90s";
type AspectRatio = "9:16" | "16:9" | "1:1";
type NarrationStyle = "warm_narrator" | "energetic" | "casual" | "authoritative" | "none";
type VideoTone = "comedy" | "dramatic" | "informative" | "inspirational" | "edgy";
type TransitionStyle = "crossfade" | "hard_cut" | "swipe" | "zoom";

interface VideoConfig {
  visualStyle: VisualStyle;
  styleNotes: string;
  scriptFormat: ScriptFormat;
  duration: VideoDuration;
  aspectRatio: AspectRatio;
  narrationStyle: NarrationStyle;
  tone: VideoTone;
  sceneCount: number;
  transitionStyle: TransitionStyle;
  kenBurnsEnabled: boolean;
  sfxEnabled: boolean;
}

const AIRPLANE_VIDEO_DEFAULTS: VideoConfig = {
  visualStyle: "cinematic_cgi",
  styleNotes:
    "Pixar-meets-Unreal-Engine aesthetic, stylized 3D characters with slightly exaggerated proportions, dramatic volumetric lighting, rich color grading",
  scriptFormat: "comedy_skit",
  duration: "60-90s",
  aspectRatio: "9:16",
  narrationStyle: "warm_narrator",
  tone: "comedy",
  sceneCount: 8,
  transitionStyle: "crossfade",
  kenBurnsEnabled: true,
  sfxEnabled: true,
};

const VISUAL_STYLE_OPTIONS: Array<{ value: VisualStyle; label: string; desc: string }> = [
  { value: "cinematic_cgi", label: "Cinematic CGI", desc: "Pixar / Unreal Engine quality" },
  { value: "photorealistic", label: "Photorealistic", desc: "Real-world footage look" },
  { value: "2d_animation", label: "2D Animation", desc: "Flat illustration, animated" },
  { value: "motion_graphics", label: "Motion Graphics", desc: "Clean, typographic, corporate" },
  { value: "anime", label: "Anime", desc: "Japanese animation style" },
  { value: "watercolor", label: "Watercolor", desc: "Painted, artistic feel" },
];

const SCRIPT_FORMAT_OPTIONS: Array<{ value: ScriptFormat; label: string; desc: string }> = [
  { value: "comedy_skit", label: "Comedy Skit", desc: "Character-driven sketch with punchlines" },
  { value: "product_showcase", label: "Product Showcase", desc: "Feature highlights & benefits" },
  { value: "tutorial", label: "Tutorial", desc: "Step-by-step how-to walkthrough" },
  { value: "testimonial", label: "Testimonial", desc: "Customer story / social proof" },
  { value: "meme_viral", label: "Meme / Viral", desc: "Trending format, shareable hook" },
  { value: "storytelling", label: "Storytelling", desc: "Narrative arc with emotional payoff" },
];

const DURATION_OPTIONS: Array<{ value: VideoDuration; label: string }> = [
  { value: "15-30s", label: "15–30s" },
  { value: "30-60s", label: "30–60s" },
  { value: "60-90s", label: "60–90s" },
];

const ASPECT_RATIO_OPTIONS: Array<{ value: AspectRatio; label: string; desc: string }> = [
  { value: "9:16", label: "9:16", desc: "Vertical / Reels" },
  { value: "16:9", label: "16:9", desc: "Landscape / YouTube" },
  { value: "1:1", label: "1:1", desc: "Square / Feed" },
];

const NARRATION_OPTIONS: Array<{ value: NarrationStyle; label: string }> = [
  { value: "warm_narrator", label: "Warm Narrator" },
  { value: "energetic", label: "Energetic" },
  { value: "casual", label: "Casual" },
  { value: "authoritative", label: "Authoritative" },
  { value: "none", label: "No Narration" },
];

const TONE_OPTIONS: Array<{ value: VideoTone; label: string }> = [
  { value: "comedy", label: "Comedy" },
  { value: "dramatic", label: "Dramatic" },
  { value: "informative", label: "Informative" },
  { value: "inspirational", label: "Inspirational" },
  { value: "edgy", label: "Edgy" },
];

const TRANSITION_OPTIONS: Array<{ value: TransitionStyle; label: string }> = [
  { value: "crossfade", label: "Crossfade" },
  { value: "hard_cut", label: "Hard Cut" },
  { value: "swipe", label: "Swipe" },
  { value: "zoom", label: "Zoom" },
];

function composeVideoPrompt(userPrompt: string, config: VideoConfig): string {
  const styleLookup: Record<VisualStyle, string> = {
    cinematic_cgi:
      "high-quality cinematic CGI render, stylized 3D characters with slightly exaggerated proportions, dramatic volumetric lighting, rich color grading",
    photorealistic: "photorealistic live-action look, natural lighting, shallow depth of field",
    "2d_animation": "vibrant 2D flat illustration style, bold outlines, smooth frame-by-frame animation",
    motion_graphics:
      "clean motion graphics, typographic animation, corporate gradient backgrounds, geometric shapes",
    anime: "Japanese anime style, cel-shaded characters, dynamic action lines, vivid palette",
    watercolor: "soft watercolor painting aesthetic, organic textures, gentle blending, storybook feel",
  };

  const formatLookup: Record<ScriptFormat, string> = {
    comedy_skit: "comedy sketch with distinct character voices, setup → escalation → punchline structure",
    product_showcase: "product showcase highlighting key features and benefits with clean visuals",
    tutorial: "step-by-step tutorial with clear numbered steps and on-screen demonstrations",
    testimonial: "customer testimonial / social proof story with authentic emotional tone",
    meme_viral: "viral meme format using trending hooks, designed for maximum shareability",
    storytelling: "narrative storytelling arc with emotional setup, tension, and satisfying resolution",
  };

  const narrationLookup: Record<NarrationStyle, string> = {
    warm_narrator: "warm, clear storytelling narrator voice (stability ~0.55, style ~0.5)",
    energetic: "high-energy, fast-paced enthusiastic voiceover (stability ~0.2, style ~0.7)",
    casual: "relaxed, conversational tone like talking to a friend (stability ~0.4, style ~0.3)",
    authoritative: "confident, professional authoritative voice (stability ~0.7, style ~0.2)",
    none: "no voiceover narration — music and visuals only",
  };

  const parts = [
    userPrompt,
    "",
    "─── VIDEO CONFIGURATION ───",
    `Visual Style: ${styleLookup[config.visualStyle]}`,
    config.styleNotes ? `Additional Style Notes: ${config.styleNotes}` : "",
    `Script Format: ${formatLookup[config.scriptFormat]}`,
    `Target Duration: ${config.duration}`,
    `Aspect Ratio: ${config.aspectRatio} composition`,
    `Narration: ${narrationLookup[config.narrationStyle]}`,
    `Tone: ${config.tone}`,
    `Target Scene Count: ${config.sceneCount} scenes`,
    `Transitions: ${config.transitionStyle} between scenes`,
    config.kenBurnsEnabled ? "Visual Effects: Ken Burns zoom & pan on stills" : "",
    config.sfxEnabled ? "SFX: Include immersive sound design per scene" : "SFX: None",
  ];

  return parts.filter(Boolean).join("\n");
}

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
  const [videoConfig, setVideoConfig] = useState<VideoConfig>({ ...AIRPLANE_VIDEO_DEFAULTS });
  const [configExpanded, setConfigExpanded] = useState(true);
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

    const userPrompt = input.trim();
    const enrichedPrompt =
      contentType === "video"
        ? composeVideoPrompt(userPrompt, videoConfig)
        : userPrompt;

    setInput("");
    setGenerating(true);

    addMessage({ role: "user", content: userPrompt, contentType });

    try {
      const contentItem: ContentItemInsert = {
        title: userPrompt.slice(0, 100),
        body_text: userPrompt,
        business_id: businessId,
        session_id: activeSession.id,
        content_type: contentType,
        channel: DEFAULT_CHANNEL_BY_TYPE[contentType],
        review_mode: contentType,
        review_status: "pending",
        source_type: "generated",
        prompt_input_summary: userPrompt,
        generation_status: "queued",
        ...(contentType === "video" && {
          metadata: { videoConfig } as any,
        }),
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
        prompt: enrichedPrompt,
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
    <div className="flex h-[calc(100vh-7rem)] bg-[linear-gradient(180deg,rgba(255,255,255,0.26),rgba(255,255,255,0.12))]">
      {sidebarOpen && (
        <div className="flex w-80 flex-col border-r border-slate-200/80 bg-white/48 backdrop-blur-xl xl:w-96">
          <div className="border-b border-slate-200/80 p-4">
            <button
              onClick={() => {
                void createSession();
              }}
              disabled={!businessId || loadingSessions}
              className="surface-pill flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-white"
            >
              <Plus className="h-4 w-4" />
              New Session
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="border-b border-slate-200/80 px-4 py-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Sessions
              </p>
              <div className="space-y-1.5">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setActiveSessionId(session.id)}
                    className={`w-full rounded-[22px] px-4 py-3 text-left text-sm transition-colors ${
                      session.id === activeSessionId
                        ? "bg-slate-900 text-white shadow-[0_16px_32px_rgba(15,23,42,0.16)]"
                        : "text-slate-500 hover:bg-white hover:text-slate-900"
                    }`}
                  >
                    {session.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-b border-slate-200/80 px-4 py-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Personas
                </p>
                <span className="rounded-full border border-slate-200 bg-white/70 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-400">
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
                          ? "border-slate-900 bg-slate-900 text-white shadow-[0_18px_36px_rgba(15,23,42,0.16)]"
                          : "border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 rounded-xl p-2 ${isActive ? "bg-white/10" : "bg-slate-100"}`}>
                          <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{persona.name}</p>
                          <p className={`mt-1 text-xs leading-5 ${isActive ? "text-white/70" : "text-slate-500"}`}>
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
              <div className="space-y-4 px-4 py-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Configure Persona
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    These values are preloaded from the hard-coded personas and can now be adjusted here.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
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
                    className="surface-input w-full rounded-2xl px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-sky-300"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
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
                    className="surface-input w-full resize-none rounded-2xl px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-sky-300"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
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
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-slate-200 bg-white/75 text-slate-500 hover:border-slate-300 hover:text-slate-900"
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
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Content Types
                    </label>
                    <span className="text-[10px] uppercase tracking-[0.16em] text-slate-300">
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
                              ? "border-sky-200 bg-sky-50 text-sky-800"
                              : "border-slate-200 bg-white/75 text-slate-500 hover:border-slate-300 hover:text-slate-900"
                          }`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <Icon className="h-4 w-4" />
                            <span>{label}</span>
                            {isSelected ? (
                              <Check className="h-3 w-3 text-sky-500" />
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
                  <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Review Actions
                  </label>
                  <div className="space-y-2">
                    {SWIPE_DIRECTIONS.map((direction) => {
                      const swipeLabel = activePersona.swipeLabels[direction];

                      return (
                        <div
                          key={direction}
                          className="rounded-2xl border border-slate-200 bg-white/78 p-3"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">
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
                              className="h-8 w-10 cursor-pointer rounded border border-slate-200 bg-transparent"
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
                            className="surface-input w-full rounded-xl px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-sky-300"
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
                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:text-slate-700"
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
                  <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
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
                    className="surface-input w-full rounded-2xl px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-sky-300"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
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
                    className="surface-input w-full rounded-2xl px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-sky-300"
                  />
                </div>
              </div>
            )}
          </div>

          {activeJobs.length > 0 && (
            <div className="border-t border-slate-200/80 p-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Active Jobs
              </p>
              {activeJobs.map((job) => (
                <div key={job.id} className="flex items-center gap-2 py-1.5">
                  <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                  <span className="truncate text-xs text-slate-500">{job.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-1 flex-col">
        <button
          onClick={() => setSidebarOpen((value) => !value)}
          className="absolute left-0 top-1/2 z-10 flex h-10 w-6 -translate-y-1/2 items-center justify-center rounded-r-full border border-slate-200/90 bg-white text-slate-500 shadow-[0_12px_28px_rgba(148,163,184,0.12)] transition-colors hover:text-slate-900"
          style={{ left: sidebarOpen ? "20rem" : 0 }}
        >
          <ChevronRight
            className={`h-3 w-3 transition-transform ${sidebarOpen ? "rotate-180" : ""}`}
          />
        </button>

        <div className="flex-1 overflow-y-auto px-6 py-8">
          {loadingSessions && (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          )}

          {!loadingSessions && activeSession?.messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="surface-panel mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <Sparkles className="h-7 w-7 text-slate-400" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-slate-900">
                Create Content as {activePersona?.name ?? "Your Persona"}
              </h2>
              <p className="max-w-sm text-sm leading-6 text-slate-500">
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
                className={`max-w-md rounded-[24px] px-4 py-3 text-sm ${
                  message.role === "user"
                    ? "rounded-br-md bg-slate-900 text-white shadow-[0_14px_32px_rgba(15,23,42,0.16)]"
                    : "rounded-bl-md border border-slate-200 bg-white/82 text-slate-700"
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

        <div className="border-t border-slate-200/80 bg-white/44 px-6 py-4 backdrop-blur-xl">
          {activePersona && (
            <div className="surface-card mb-3 rounded-[26px] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Active Persona
              </p>
              <div className="mt-1 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{activePersona.name}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {activePersona.description}
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {activePersona.contentTypes.map((type) => (
                    <span
                      key={type}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-500"
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
                className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-all ${
                  contentType === value
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white/72 text-slate-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-35"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {contentType === "video" && (
            <div className="mb-3 overflow-hidden rounded-[22px] border border-slate-200/80 bg-white/60 backdrop-blur-md">
              <button
                onClick={() => setConfigExpanded((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-50/60"
              >
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-violet-500" />
                  <span className="text-sm font-semibold text-slate-800">
                    Video Configuration
                  </span>
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-600">
                    Airplane preset
                  </span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform ${configExpanded ? "rotate-180" : ""}`}
                />
              </button>

              {configExpanded && (
                <div className="max-h-[42vh] space-y-4 overflow-y-auto border-t border-slate-200/60 px-4 py-4">
                  {/* Visual Style */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Palette className="h-3 w-3 text-slate-400" />
                      <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Visual Style
                      </label>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {VISUAL_STYLE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() =>
                            setVideoConfig((c) => ({ ...c, visualStyle: opt.value }))
                          }
                          className={`rounded-2xl border px-2.5 py-2 text-left transition-all ${
                            videoConfig.visualStyle === opt.value
                              ? "border-violet-300 bg-violet-50 text-slate-900"
                              : "border-slate-200/80 bg-white/50 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                          }`}
                        >
                          <p className="text-xs font-semibold">{opt.label}</p>
                          <p className="mt-0.5 text-[10px] leading-tight text-slate-400">
                            {opt.desc}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Style Notes */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Style Notes
                    </label>
                    <textarea
                      value={videoConfig.styleNotes}
                      onChange={(e) =>
                        setVideoConfig((c) => ({ ...c, styleNotes: e.target.value }))
                      }
                      rows={2}
                      placeholder="e.g., Pixar-meets-Unreal-Engine aesthetic, dramatic volumetric lighting..."
                      className="surface-input w-full resize-none rounded-2xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition-colors focus:border-sky-300"
                    />
                  </div>

                  {/* Script Format */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Film className="h-3 w-3 text-slate-400" />
                      <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Script Format
                      </label>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {SCRIPT_FORMAT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() =>
                            setVideoConfig((c) => ({ ...c, scriptFormat: opt.value }))
                          }
                          className={`rounded-2xl border px-2.5 py-2 text-left transition-all ${
                            videoConfig.scriptFormat === opt.value
                              ? "border-violet-300 bg-violet-50 text-slate-900"
                              : "border-slate-200/80 bg-white/50 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                          }`}
                        >
                          <p className="text-xs font-semibold">{opt.label}</p>
                          <p className="mt-0.5 text-[10px] leading-tight text-slate-400">
                            {opt.desc}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duration + Aspect Ratio row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Duration
                        </label>
                      </div>
                      <div className="flex gap-1.5">
                        {DURATION_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() =>
                              setVideoConfig((c) => ({ ...c, duration: opt.value }))
                            }
                            className={`flex-1 rounded-xl border px-2 py-1.5 text-xs font-semibold transition-all ${
                              videoConfig.duration === opt.value
                                ? "border-violet-300 bg-violet-50 text-slate-900"
                                : "border-slate-200/80 bg-white/50 text-slate-500 hover:border-slate-300"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <LayoutGrid className="h-3 w-3 text-slate-400" />
                        <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Aspect Ratio
                        </label>
                      </div>
                      <div className="flex gap-1.5">
                        {ASPECT_RATIO_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() =>
                              setVideoConfig((c) => ({ ...c, aspectRatio: opt.value }))
                            }
                            className={`flex-1 rounded-xl border px-2 py-1.5 text-center transition-all ${
                              videoConfig.aspectRatio === opt.value
                                ? "border-violet-300 bg-violet-50 text-slate-900"
                                : "border-slate-200/80 bg-white/50 text-slate-500 hover:border-slate-300"
                            }`}
                          >
                            <p className="text-xs font-semibold">{opt.label}</p>
                            <p className="text-[9px] text-slate-400">{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Narration + Tone row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Mic className="h-3 w-3 text-slate-400" />
                        <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Narration
                        </label>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {NARRATION_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() =>
                              setVideoConfig((c) => ({
                                ...c,
                                narrationStyle: opt.value,
                              }))
                            }
                            className={`rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                              videoConfig.narrationStyle === opt.value
                                ? "border-violet-300 bg-violet-50 text-slate-900"
                                : "border-slate-200/80 bg-white/50 text-slate-500 hover:border-slate-300"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Zap className="h-3 w-3 text-slate-400" />
                        <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Tone
                        </label>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {TONE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() =>
                              setVideoConfig((c) => ({ ...c, tone: opt.value }))
                            }
                            className={`rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                              videoConfig.tone === opt.value
                                ? "border-violet-300 bg-violet-50 text-slate-900"
                                : "border-slate-200/80 bg-white/50 text-slate-500 hover:border-slate-300"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Scene Count slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Scene Count
                      </label>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-mono font-semibold text-slate-700">
                        {videoConfig.sceneCount}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={12}
                      value={videoConfig.sceneCount}
                      onChange={(e) =>
                        setVideoConfig((c) => ({
                          ...c,
                          sceneCount: parseInt(e.target.value, 10),
                        }))
                      }
                      className="w-full accent-violet-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>2 (quick)</span>
                      <span>12 (epic)</span>
                    </div>
                  </div>

                  {/* Transitions + Toggles */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Transitions
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {TRANSITION_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() =>
                              setVideoConfig((c) => ({
                                ...c,
                                transitionStyle: opt.value,
                              }))
                            }
                            className={`rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                              videoConfig.transitionStyle === opt.value
                                ? "border-violet-300 bg-violet-50 text-slate-900"
                                : "border-slate-200/80 bg-white/50 text-slate-500 hover:border-slate-300"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Effects
                      </label>
                      <div className="space-y-1.5">
                        <button
                          onClick={() =>
                            setVideoConfig((c) => ({
                              ...c,
                              kenBurnsEnabled: !c.kenBurnsEnabled,
                            }))
                          }
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                            videoConfig.kenBurnsEnabled
                              ? "border-emerald-300 bg-emerald-50 text-slate-800"
                              : "border-slate-200/80 bg-white/50 text-slate-400"
                          }`}
                        >
                          <span>Ken Burns</span>
                          {videoConfig.kenBurnsEnabled && (
                            <Check className="h-3 w-3 text-emerald-500" />
                          )}
                        </button>
                        <button
                          onClick={() =>
                            setVideoConfig((c) => ({
                              ...c,
                              sfxEnabled: !c.sfxEnabled,
                            }))
                          }
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                            videoConfig.sfxEnabled
                              ? "border-emerald-300 bg-emerald-50 text-slate-800"
                              : "border-slate-200/80 bg-white/50 text-slate-400"
                          }`}
                        >
                          <span>Sound Effects</span>
                          {videoConfig.sfxEnabled && (
                            <Check className="h-3 w-3 text-emerald-500" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the content you want to generate..."
              rows={2}
              className="surface-input flex-1 resize-none rounded-[24px] px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-300 focus:outline-none"
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
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-white transition-all hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
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
