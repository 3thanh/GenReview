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
  contentTypes: ["video_script", "linkedin_post"],
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
      action: "More Ideas",
      shortcut: "↓",
      color: "#3b82f6",
      requiresFeedback: true,
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
  contentTypes: ["support_reply"],
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
      color: "#f59e0b",
      requiresFeedback: true,
    },
    down: {
      action: "Use Template",
      shortcut: "↓",
      color: "#3b82f6",
      requiresFeedback: true,
    },
  },
  emptyStateMessage: "Inbox zero — no tickets to review",
  emptyStateCta: "Check back later",
};

export const SOCIAL_MANAGER: Persona = {
  id: "social-manager",
  name: "Social Manager",
  description: "Review and schedule LinkedIn posts and social content",
  icon: "share",
  contentTypes: ["linkedin_post"],
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
      action: "Generate Alternatives",
      shortcut: "↓",
      color: "#3b82f6",
      requiresFeedback: true,
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
  contentTypes: ["video_script", "linkedin_post", "support_reply"],
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
      action: "More Ideas",
      shortcut: "↓",
      color: "#3b82f6",
      requiresFeedback: true,
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

/**
 * Build a custom persona from partial overrides on top of a base.
 * Useful for quick persona creation in the UI.
 */
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

/**
 * Given a content type, find the best-matching persona.
 * Returns the most specific persona (fewest content types) that
 * includes the given type.
 */
export function personaForContentType(
  contentType: ContentType
): Persona | undefined {
  const all = listPersonas().filter((p) => p.contentTypes.includes(contentType));
  return all.sort((a, b) => a.contentTypes.length - b.contentTypes.length)[0];
}
