import { useEffect, useState } from "react";
import { Navbar } from "./components/Navbar";
import { SwipeFeed } from "./components/SwipeFeed";
import { Studio } from "./components/Studio";
import type { FeedSourceMode } from "./lib/feed-source";
import {
  PERSONAS,
  clonePersonas,
  hydrateStoredPersonas,
  type Persona,
} from "./lib/personas";

const PERSONAS_STORAGE_KEY = "contentswipe.personas.v1";
const ACTIVE_PERSONA_STORAGE_KEY = "contentswipe.activePersonaId.v1";
const FEED_SOURCE_MODE_STORAGE_KEY = "contentswipe.feedSourceMode.v1";

function loadStoredPersonas(): Persona[] {
  if (typeof window === "undefined") {
    return clonePersonas(PERSONAS);
  }

  const storedValue = window.localStorage.getItem(PERSONAS_STORAGE_KEY);
  if (!storedValue) {
    return clonePersonas(PERSONAS);
  }

  try {
    return hydrateStoredPersonas(JSON.parse(storedValue));
  } catch {
    return clonePersonas(PERSONAS);
  }
}

function loadStoredActivePersonaId(personas: Persona[]): string {
  if (typeof window === "undefined") {
    return personas[0]?.id ?? "";
  }

  const storedValue = window.localStorage.getItem(ACTIVE_PERSONA_STORAGE_KEY);
  if (storedValue && personas.some((persona) => persona.id === storedValue)) {
    return storedValue;
  }

  return personas[0]?.id ?? "";
}

function getInitialAppState() {
  const personas = loadStoredPersonas();
  const feedSourceMode =
    typeof window !== "undefined" &&
    window.localStorage.getItem(FEED_SOURCE_MODE_STORAGE_KEY) === "demo"
      ? "demo"
      : "real";

  return {
    personas,
    activePersonaId: loadStoredActivePersonaId(personas),
    feedSourceMode: feedSourceMode as FeedSourceMode,
  };
}

export default function App() {
  const [{ personas, activePersonaId, feedSourceMode }, setAppState] = useState(getInitialAppState);
  const [view, setView] = useState<"feed" | "studio">("feed");

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PERSONAS_STORAGE_KEY, JSON.stringify(personas));
  }, [personas]);

  useEffect(() => {
    if (typeof window === "undefined" || !activePersonaId) return;
    window.localStorage.setItem(ACTIVE_PERSONA_STORAGE_KEY, activePersonaId);
  }, [activePersonaId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(FEED_SOURCE_MODE_STORAGE_KEY, feedSourceMode);
  }, [feedSourceMode]);

  useEffect(() => {
    if (personas.some((persona) => persona.id === activePersonaId)) return;

    setAppState((prev) => ({
      ...prev,
      activePersonaId: prev.personas[0]?.id ?? "",
    }));
  }, [activePersonaId, personas]);

  const handlePersonasChange = (nextPersonas: Persona[]) => {
    setAppState((prev) => ({
      ...prev,
      personas: nextPersonas,
    }));
  };

  const handleSelectPersona = (personaId: string) => {
    setAppState((prev) => ({
      ...prev,
      activePersonaId: personaId,
    }));
  };

  const handleFeedSourceModeChange = (mode: FeedSourceMode) => {
    setAppState((prev) => ({
      ...prev,
      feedSourceMode: mode,
    }));
  };

  return (
    <div className="min-h-screen px-3 py-3 text-slate-900 sm:px-5 sm:py-5 lg:px-6">
      <div className="app-shell mx-auto max-w-[1680px] rounded-[34px]">
        <Navbar activeView={view} onNavigate={setView} />
        {view === "feed" ? (
          <SwipeFeed
            personas={personas}
            activePersonaId={activePersonaId}
            feedSourceMode={feedSourceMode}
            onChangeFeedSourceMode={handleFeedSourceModeChange}
            onSelectPersona={handleSelectPersona}
            onNavigateToStudio={() => setView("studio")}
          />
        ) : (
          <Studio
            personas={personas}
            activePersonaId={activePersonaId}
            onPersonasChange={handlePersonasChange}
            onSelectPersona={handleSelectPersona}
          />
        )}
      </div>
    </div>
  );
}
