import { useState } from "react";
import { Navbar } from "./components/Navbar";
import { SwipeFeed } from "./components/SwipeFeed";
import { Studio } from "./components/Studio";

export default function App() {
  const [view, setView] = useState<"feed" | "studio">("feed");

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar activeView={view} onNavigate={setView} />
      {view === "feed" ? (
        <SwipeFeed onNavigateToStudio={() => setView("studio")} />
      ) : (
        <Studio />
      )}
    </div>
  );
}
