import {
  CheckCircle2,
  XCircle,
  ArrowUpCircle,
  ArrowDownCircle,
  Undo2,
} from "lucide-react";
import type { SwipeDirection } from "../types/database";
import type { Persona } from "../lib/personas";

interface ActionBarProps {
  persona: Persona;
  onSwipe: (direction: SwipeDirection) => void;
  onUndo: () => void;
  canUndo: boolean;
  disabled: boolean;
}

const DIRECTION_ICONS: Record<SwipeDirection, typeof CheckCircle2> = {
  right: CheckCircle2,
  left: XCircle,
  up: ArrowUpCircle,
  down: ArrowDownCircle,
};

export function ActionBar({
  persona,
  onSwipe,
  onUndo,
  canUndo,
  disabled,
}: ActionBarProps) {
  const directions: SwipeDirection[] = ["left", "down", "up", "right"];

  return (
    <div className="px-4 py-4 sm:px-6">
      <div className="surface-pill mx-auto flex w-fit items-center justify-center gap-3 rounded-full px-3 py-3">
        <button
          onClick={onUndo}
          disabled={!canUndo || disabled}
          className="surface-muted flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition-all hover:-translate-y-0.5 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30"
          title="Undo (⌘Z)"
        >
          <Undo2 className="h-4 w-4" />
        </button>

        {directions.map((dir) => {
          const label = persona.swipeLabels[dir];
          const Icon = DIRECTION_ICONS[dir];
          const isRight = dir === "right";
          const isLeft = dir === "left";
          const size = isRight || isLeft ? "h-14 w-14" : "h-11 w-11";
          const iconSize = isRight || isLeft ? "w-6 h-6" : "w-5 h-5";

          return (
            <button
              key={dir}
              onClick={() => onSwipe(dir)}
              disabled={disabled}
              className={`${size} flex items-center justify-center rounded-full border transition-all hover:-translate-y-0.5 hover:scale-[1.03] active:scale-95 disabled:cursor-not-allowed disabled:opacity-30`}
              style={{
                borderColor: label.color + "35",
                color: label.color,
                backgroundColor: label.color + "14",
                boxShadow: `0 12px 30px ${label.color}18`,
              }}
              title={`${label.action} (${label.shortcut})`}
            >
              <Icon className={iconSize} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
