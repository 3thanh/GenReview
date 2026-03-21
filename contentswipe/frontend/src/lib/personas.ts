import type { ContentType } from "../types/database";

export type PersonaIcon = "video" | "layers";

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
    description: "Review and approve AI-generated video scripts and renders",
    icon: "video",
    contentTypes: ["video"],
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
        action: "Add Note",
        shortcut: "↓",
        color: "#f59e0b",
        requiresFeedback: true,
      },
    },
    emptyStateMessage: "No videos to review",
    emptyStateCta: "Create your first video",
  },
  {
    id: "airplane-ai",
    name: "Airplane AI",
    description:
      "AI models as passengers on a crashing plane — stylized 3D comedy reels where each model reacts in-character. GPT-4 narrates the exit procedure, Claude gives away its parachute, Llama already jumped, Grok live-tweets the crash, Gemini writes his own eulogy.",
    icon: "video",
    contentTypes: ["video"],
    swipeLabels: {
      right: {
        action: "Ship It",
        shortcut: "→",
        color: "#22c55e",
        requiresFeedback: false,
      },
      left: {
        action: "Not Funny",
        shortcut: "←",
        color: "#ef4444",
        requiresFeedback: true,
      },
      up: {
        action: "New Character Take",
        shortcut: "↑",
        color: "#a855f7",
        requiresFeedback: true,
      },
      down: {
        action: "Star / Save",
        shortcut: "↓",
        color: "#f59e0b",
        requiresFeedback: false,
      },
    },
    emptyStateMessage: "No airplane reels to review",
    emptyStateCta: "Generate an AI airplane comedy reel",
  },
  {
    id: "all",
    name: "Everything",
    description: "All video content in a single feed",
    icon: "layers",
    contentTypes: ["video"],
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
        action: "Add Note",
        shortcut: "↓",
        color: "#f59e0b",
        requiresFeedback: true,
      },
    },
    emptyStateMessage: "Nothing to review right now",
    emptyStateCta: "Create something new",
  },
];

const PERSONA_ICON_SET = new Set<PersonaIcon>(["video", "layers"]);
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
