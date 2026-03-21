import type { ContentType } from "../types/database";

export type PersonaIcon = "video" | "headset" | "share" | "layers";

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
  icon: PersonaIcon;
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

export const PERSONAS: Persona[] = [
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
];

const PERSONA_ICON_SET = new Set<PersonaIcon>([
  "video",
  "headset",
  "share",
  "layers",
]);
const CONTENT_TYPE_SET = new Set<ContentType>(["video", "social", "support"]);
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

export function hydrateStoredPersonas(storedValue: unknown): Persona[] {
  if (!Array.isArray(storedValue)) {
    return clonePersonas(PERSONAS);
  }

  const storedById = new Map<string, Record<string, unknown>>();

  for (const value of storedValue) {
    if (!isRecord(value) || typeof value.id !== "string") continue;
    storedById.set(value.id, value);
  }

  return PERSONAS.map((basePersona) => {
    const nextPersona = clonePersona(basePersona);
    const storedPersona = storedById.get(basePersona.id);

    if (!storedPersona) {
      return nextPersona;
    }

    if (typeof storedPersona.name === "string") {
      nextPersona.name = storedPersona.name;
    }

    if (typeof storedPersona.description === "string") {
      nextPersona.description = storedPersona.description;
    }

    if (
      typeof storedPersona.icon === "string" &&
      PERSONA_ICON_SET.has(storedPersona.icon as PersonaIcon)
    ) {
      nextPersona.icon = storedPersona.icon as PersonaIcon;
    }

    if (Array.isArray(storedPersona.contentTypes)) {
      const nextContentTypes = Array.from(
        new Set(
          storedPersona.contentTypes.filter(
            (value): value is ContentType =>
              typeof value === "string" && CONTENT_TYPE_SET.has(value as ContentType)
          )
        )
      );

      if (nextContentTypes.length > 0) {
        nextPersona.contentTypes = nextContentTypes;
      }
    }

    if (isRecord(storedPersona.swipeLabels)) {
      for (const direction of SWIPE_DIRECTIONS) {
        const storedLabel = storedPersona.swipeLabels[direction];
        if (!isRecord(storedLabel)) continue;

        if (typeof storedLabel.action === "string") {
          nextPersona.swipeLabels[direction].action = storedLabel.action;
        }

        if (typeof storedLabel.shortcut === "string") {
          nextPersona.swipeLabels[direction].shortcut = storedLabel.shortcut;
        }

        if (typeof storedLabel.color === "string") {
          nextPersona.swipeLabels[direction].color = storedLabel.color;
        }

        if (typeof storedLabel.requiresFeedback === "boolean") {
          nextPersona.swipeLabels[direction].requiresFeedback =
            storedLabel.requiresFeedback;
        }
      }
    }

    return nextPersona;
  });
}
