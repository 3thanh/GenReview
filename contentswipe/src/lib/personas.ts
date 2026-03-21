import type { ContentType } from "../types/database.js";

// ── Persona types ───────────────────────────────────────────────

export type PersonaId = string;

export interface SwipeLabel {
  action: string;
  shortcut: string;
  color: string;
  requiresFeedback: boolean;
}

export interface Persona {
  id: PersonaId;
  name: string;
  description: string;
  icon: string;
  contentTypes: ContentType[];
  swipeLabels: {
    right: SwipeLabel;
    left: SwipeLabel;
    up: SwipeLabel;
    down: SwipeLabel;
  };
  emptyStateMessage: string;
  emptyStateCta: string;
}

// ── Built-in personas ──────────────────────────────────────────

export const CONTENT_CREATOR: Persona = {
  id: "content-creator",
  name: "Content Creator",
  description: "Review and approve AI-generated video scripts and social posts",
  icon: "video",
  contentTypes: ["video", "social"],
  swipeLabels: {
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
      action: "Star",
      shortcut: "↓",
      color: "#f59e0b",
      requiresFeedback: false,
    },
  },
  emptyStateMessage: "No content to review",
  emptyStateCta: "Create your first video",
};

export const SUPPORT_AGENT: Persona = {
  id: "support-agent",
  name: "Support Agent",
  description: "Triage and respond to customer support tickets",
  icon: "headset",
  contentTypes: ["support"],
  swipeLabels: {
    right: {
      action: "Send Reply",
      shortcut: "→",
      color: "#22c55e",
      requiresFeedback: false,
    },
    left: {
      action: "Discard",
      shortcut: "←",
      color: "#ef4444",
      requiresFeedback: true,
    },
    up: {
      action: "Escalate",
      shortcut: "↑",
      color: "#a855f7",
      requiresFeedback: true,
    },
    down: {
      action: "Star",
      shortcut: "↓",
      color: "#f59e0b",
      requiresFeedback: false,
    },
  },
  emptyStateMessage: "Inbox zero — no tickets to review",
  emptyStateCta: "Check back later",
};

export const SOCIAL_MANAGER: Persona = {
  id: "social-manager",
  name: "Social Manager",
  description: "Review and schedule social content across channels",
  icon: "share",
  contentTypes: ["social"],
  swipeLabels: {
    right: {
      action: "Schedule",
      shortcut: "→",
      color: "#22c55e",
      requiresFeedback: false,
    },
    left: {
      action: "Skip",
      shortcut: "←",
      color: "#ef4444",
      requiresFeedback: false,
    },
    up: {
      action: "Edit & Rewrite",
      shortcut: "↑",
      color: "#a855f7",
      requiresFeedback: true,
    },
    down: {
      action: "Star",
      shortcut: "↓",
      color: "#f59e0b",
      requiresFeedback: false,
    },
  },
  emptyStateMessage: "No posts to review",
  emptyStateCta: "Draft a new post",
};

export const ALL_CONTENT: Persona = {
  id: "all",
  name: "Everything",
  description: "All content types in a single feed",
  icon: "layers",
  contentTypes: ["support", "social", "video"],
  swipeLabels: {
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
      action: "Star",
      shortcut: "↓",
      color: "#f59e0b",
      requiresFeedback: false,
    },
  },
  emptyStateMessage: "Nothing to review right now",
  emptyStateCta: "Create something new",
};

// ── Persona registry ────────────────────────────────────────────

const BUILTIN_PERSONAS: Persona[] = [
  CONTENT_CREATOR,
  SUPPORT_AGENT,
  SOCIAL_MANAGER,
  ALL_CONTENT,
];

const customPersonas = new Map<PersonaId, Persona>();

export function getPersona(id: PersonaId): Persona | undefined {
  return (
    customPersonas.get(id) ?? BUILTIN_PERSONAS.find((p) => p.id === id)
  );
}

export function listPersonas(): Persona[] {
  return [...BUILTIN_PERSONAS, ...customPersonas.values()];
}

export function registerPersona(persona: Persona): void {
  customPersonas.set(persona.id, persona);
}

export function unregisterPersona(id: PersonaId): boolean {
  return customPersonas.delete(id);
}

export function createPersona(
  id: PersonaId,
  overrides: Partial<Omit<Persona, "id">> & { name: string; contentTypes: ContentType[] }
): Persona {
  const base = ALL_CONTENT;
  const persona: Persona = {
    ...base,
    ...overrides,
    id,
    swipeLabels: {
      ...base.swipeLabels,
      ...overrides.swipeLabels,
    },
  };
  registerPersona(persona);
  return persona;
}

export function personaForContentType(
  contentType: ContentType
): Persona | undefined {
  const all = listPersonas().filter((p) => p.contentTypes.includes(contentType));
  return all.sort((a, b) => a.contentTypes.length - b.contentTypes.length)[0];
}
