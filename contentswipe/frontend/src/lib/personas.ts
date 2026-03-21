import type { ContentType } from "../types/database";

export type PersonaIcon = "video" | "layers" | "plane" | "building" | "gamepad" | "coffee" | "user";

export interface SwipeLabel {
  action: string;
  shortcut: string;
  color: string;
  requiresFeedback: boolean;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  videoType: string;
  targetDemographic: string;
  icon: PersonaIcon;
  color: string;
  contentTypes: ContentType[];
  builtin?: boolean;
  swipeLabels: {
    right: SwipeLabel;
    left: SwipeLabel;
    up: SwipeLabel;
    down: SwipeLabel;
  };
  emptyStateMessage: string;
  emptyStateCta: string;
}

const DEFAULT_SWIPE_LABELS: Persona["swipeLabels"] = {
  right: {
    action: "Approve",
    shortcut: "→",
    color: "#22c55e",
    requiresFeedback: false,
  },
  left: {
    action: "Reject",
    shortcut: "←",
    color: "#ef4444",
    requiresFeedback: true,
  },
  up: {
    action: "Request Variant",
    shortcut: "↑",
    color: "#a855f7",
    requiresFeedback: true,
  },
  down: {
    action: "Add Note",
    shortcut: "↓",
    color: "#f59e0b",
    requiresFeedback: true,
  },
};

export const PERSONAS: Persona[] = [
  {
    id: "all",
    name: "Everything",
    description: "All video content in a single feed",
    videoType: "Mixed — all formats and styles",
    targetDemographic: "General audience, all platforms",
    icon: "layers",
    color: "#64748b",
    contentTypes: ["video"],
    builtin: true,
    swipeLabels: { ...DEFAULT_SWIPE_LABELS },
    emptyStateMessage: "Nothing to review right now",
    emptyStateCta: "Create something new",
  },
  {
    id: "airplane-ai",
    name: "Airplane AI",
    description: "Comedy skits and viral memes featuring AI models in absurd scenarios",
    videoType: "Stylized 3D comedy skit — AI models personified in a crashing airplane scenario, each reacting in-character",
    targetDemographic: "AI/tech Twitter, developers, ML engineers, 18–35, heavy on TikTok/Reels/X. People who follow AI news and enjoy tech humor.",
    icon: "plane",
    color: "#3b82f6",
    contentTypes: ["video"],
    builtin: true,
    swipeLabels: { ...DEFAULT_SWIPE_LABELS },
    emptyStateMessage: "No AI comedy reels to review",
    emptyStateCta: "Generate an AI comedy skit",
  },
  {
    id: "cerebral-valley",
    name: "Cerebral Valley",
    description: "Infomercial-style ads for the AI builder community and events",
    videoType: "Fast-paced event promo / brand ad — hook, credibility, value prop, CTA in 20s",
    targetDemographic: "AI startup founders, engineers, VCs in SF Bay Area, 22–40. Active on X, LinkedIn, and community Discords.",
    icon: "building",
    color: "#8b5cf6",
    contentTypes: ["video"],
    builtin: true,
    swipeLabels: { ...DEFAULT_SWIPE_LABELS },
    emptyStateMessage: "No Cerebral Valley ads to review",
    emptyStateCta: "Create a CV infomercial",
  },
  {
    id: "pokemon-infomercial",
    name: "Pokemon Infomercial",
    description: "Ultra-serious dramatic infomercials treating Pokemon as premium products",
    icon: "gamepad",
    color: "#f59e0b",
    contentTypes: ["video"],
    builtin: true,
    swipeLabels: { ...DEFAULT_SWIPE_LABELS },
    emptyStateMessage: "No Pokemon infomercials to review",
    emptyStateCta: "Generate a Pokemon ad",
  },
  {
    id: "coffee-roastery",
    name: "Coffee Roastery",
    description: "LinkedIn-style thought leadership and product content for artisan coffee brands",
    icon: "coffee",
    color: "#92400e",
    contentTypes: ["video"],
    builtin: true,
    swipeLabels: {
      ...DEFAULT_SWIPE_LABELS,
      right: { ...DEFAULT_SWIPE_LABELS.right, action: "Schedule" },
    },
    emptyStateMessage: "No coffee content to review",
    emptyStateCta: "Brew up some content",
  },
];

const PERSONA_ICON_SET = new Set<PersonaIcon>(["video", "layers", "plane", "building", "gamepad", "coffee", "user"]);
const CONTENT_TYPE_SET = new Set<ContentType>(["video"]);
const SWIPE_DIRECTIONS = ["right", "left", "up", "down"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function clonePersona(persona: Persona): Persona {
  return {
    ...persona,
    contentTypes: [...persona.contentTypes],
    swipeLabels: {
      right: { ...persona.swipeLabels.right },
      left: { ...persona.swipeLabels.left },
      up: { ...persona.swipeLabels.up },
      down: { ...persona.swipeLabels.down },
    },
  };
}

export function clonePersonas(personas: Persona[]): Persona[] {
  return personas.map(clonePersona);
}

export function createBlankPersona(): Persona {
  return {
    id: `persona-${Date.now()}`,
    name: "New Persona",
    description: "Describe this persona's purpose",
    icon: "user",
    color: "#6366f1",
    contentTypes: ["video"],
    builtin: false,
    swipeLabels: {
      right: { ...DEFAULT_SWIPE_LABELS.right },
      left: { ...DEFAULT_SWIPE_LABELS.left },
      up: { ...DEFAULT_SWIPE_LABELS.up },
      down: { ...DEFAULT_SWIPE_LABELS.down },
    },
    emptyStateMessage: "No content to review",
    emptyStateCta: "Create content",
  };
}

function hydratePersona(base: Persona, stored: Record<string, unknown>): Persona {
  const next = clonePersona(base);

  if (typeof stored.name === "string") next.name = stored.name;
  if (typeof stored.description === "string") next.description = stored.description;
  if (typeof stored.color === "string") next.color = stored.color;

  if (
    typeof stored.icon === "string" &&
    PERSONA_ICON_SET.has(stored.icon as PersonaIcon)
  ) {
    next.icon = stored.icon as PersonaIcon;
  }

  if (Array.isArray(stored.contentTypes)) {
    const nextContentTypes = Array.from(
      new Set(
        stored.contentTypes.filter(
          (value): value is ContentType =>
            typeof value === "string" && CONTENT_TYPE_SET.has(value as ContentType)
        )
      )
    );
    if (nextContentTypes.length > 0) next.contentTypes = nextContentTypes;
  }

  if (typeof stored.emptyStateMessage === "string") next.emptyStateMessage = stored.emptyStateMessage;
  if (typeof stored.emptyStateCta === "string") next.emptyStateCta = stored.emptyStateCta;

  if (isRecord(stored.swipeLabels)) {
    for (const direction of SWIPE_DIRECTIONS) {
      const storedLabel = stored.swipeLabels[direction];
      if (!isRecord(storedLabel)) continue;
      if (typeof storedLabel.action === "string") next.swipeLabels[direction].action = storedLabel.action;
      if (typeof storedLabel.shortcut === "string") next.swipeLabels[direction].shortcut = storedLabel.shortcut;
      if (typeof storedLabel.color === "string") next.swipeLabels[direction].color = storedLabel.color;
      if (typeof storedLabel.requiresFeedback === "boolean") next.swipeLabels[direction].requiresFeedback = storedLabel.requiresFeedback;
    }
  }

  return next;
}

export function hydrateStoredPersonas(storedValue: unknown): Persona[] {
  if (!Array.isArray(storedValue)) {
    return clonePersonas(PERSONAS);
  }

  const storedById = new Map<string, Record<string, unknown>>();
  for (const value of storedValue) {
    if (!isRecord(value) || typeof value.id !== "string") continue;
    storedById.set(value.id, value);
  }

  const result: Persona[] = PERSONAS.map((basePersona) => {
    const stored = storedById.get(basePersona.id);
    if (!stored) return clonePersona(basePersona);
    storedById.delete(basePersona.id);
    return hydratePersona(basePersona, stored);
  });

  for (const [, stored] of storedById) {
    if (typeof stored.id !== "string" || typeof stored.name !== "string") continue;
    const custom = createBlankPersona();
    custom.id = stored.id;
    custom.builtin = false;
    result.push(hydratePersona(custom, stored));
  }

  return result;
}

export function getPersonaById(personas: Persona[], id: string | null | undefined): Persona | undefined {
  if (!id) return undefined;
  return personas.find((p) => p.id === id);
}
