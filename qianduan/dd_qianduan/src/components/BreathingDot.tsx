"use client";

import { useMemo, type CSSProperties } from "react";
import type { AgingStage } from "../lib/aging";
import { emotionById, type EmotionType } from "../lib/emotions";

export type ScreenPosition = {
  x: number;
  y: number;
};

type BreathingDotProps = {
  emotion: EmotionType;
  position: ScreenPosition;
  agingStage: AgingStage;
  active?: boolean;
  onClick?: () => void;
};

type BreathingDotStyle = CSSProperties & {
  "--dot-color": string;
  "--dot-glow": string;
  "--dot-x": string;
  "--dot-y": string;
  "--dot-duration": string;
  "--dot-min-opacity": number;
  "--dot-max-opacity": number;
};

const opacityByStage: Record<AgingStage, { min: number; max: number }> = {
  fresh: { min: 0.78, max: 1 },
  aging: { min: 0.6, max: 0.92 },
  old: { min: 0.38, max: 0.72 },
  dying: { min: 0.28, max: 0.82 },
};

export default function BreathingDot({ emotion, position, agingStage, active = false, onClick }: BreathingDotProps) {
  const emotionData = emotionById[emotion];
  const duration = useMemo(() => {
    if (agingStage === "dying") return 1.5;
    return 3 + Math.random() * 2;
  }, [agingStage]);
  const opacity = opacityByStage[agingStage];

  const style: BreathingDotStyle = {
    "--dot-color": emotionData.color,
    "--dot-glow": emotionData.glowColor,
    "--dot-x": `${position.x}px`,
    "--dot-y": `${position.y}px`,
    "--dot-duration": `${duration}s`,
    "--dot-min-opacity": opacity.min,
    "--dot-max-opacity": opacity.max,
  };

  return (
    <button
      className={`breathing-dot breathing-dot--${agingStage}${active ? " breathing-dot--active" : ""}`}
      type="button"
      aria-label={emotionData.mapHint}
      onClick={onClick}
      style={style}
    >
      <span className="breathing-dot__core" />
      <style>{`
        .breathing-dot {
          position: absolute;
          left: var(--dot-x);
          top: var(--dot-y);
          z-index: 4;
          width: 44px;
          height: 44px;
          transform: translate(-50%, -50%);
        }

        .breathing-dot__core {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--dot-color);
          box-shadow: 0 0 12px var(--dot-glow), 0 0 24px var(--dot-glow);
          animation: breathing var(--dot-duration) ease-in-out infinite;
          transform: translate(-50%, -50%);
        }

        .breathing-dot--active .breathing-dot__core {
          animation:
            dot-pick 300ms ease-out forwards,
            breathing var(--dot-duration) ease-in-out 300ms infinite;
        }

        .breathing-dot--dying .breathing-dot__core {
          animation:
            breathing var(--dot-duration) ease-in-out infinite,
            flicker 880ms steps(4, end) infinite;
        }

        .breathing-dot--dying.breathing-dot--active .breathing-dot__core {
          animation:
            dot-pick 300ms ease-out forwards,
            breathing var(--dot-duration) ease-in-out 300ms infinite,
            flicker 880ms steps(4, end) 300ms infinite;
        }

        @keyframes breathing {
          0% {
            opacity: var(--dot-min-opacity);
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: var(--dot-max-opacity);
            transform: translate(-50%, -50%) scale(1.2);
          }
          100% {
            opacity: var(--dot-min-opacity);
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes dot-pick {
          0% {
            transform: translate(-50%, -50%) scale(1);
          }
          60% {
            transform: translate(-50%, -50%) scale(1.5);
          }
          100% {
            transform: translate(-50%, -50%) scale(1.2);
          }
        }

        @keyframes flicker {
          0%,
          100% {
            filter: brightness(1);
          }
          18% {
            filter: brightness(0.7);
          }
          34% {
            filter: brightness(1.25);
          }
          62% {
            filter: brightness(0.55);
          }
          79% {
            filter: brightness(1.1);
          }
        }
      `}</style>
    </button>
  );
}
