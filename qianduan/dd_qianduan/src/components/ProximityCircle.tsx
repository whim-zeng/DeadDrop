"use client";

import type { CSSProperties } from "react";
import type { ScreenPosition } from "./BreathingDot";

type ProximityCircleProps = {
  position: ScreenPosition;
  radius: number;
};

type ProximityCircleStyle = CSSProperties & {
  "--circle-x": string;
  "--circle-y": string;
  "--circle-size": string;
};

export default function ProximityCircle({ position, radius }: ProximityCircleProps) {
  const size = radius * 2;
  const style: ProximityCircleStyle = {
    "--circle-x": `${position.x}px`,
    "--circle-y": `${position.y}px`,
    "--circle-size": `${size}px`,
  };

  return (
    <div className="proximity-circle" style={style}>
      <style>{`
        .proximity-circle {
          position: absolute;
          left: var(--circle-x);
          top: var(--circle-y);
          z-index: 2;
          width: var(--circle-size);
          height: var(--circle-size);
          border-radius: 50%;
          background: radial-gradient(circle, rgba(245, 240, 232, 0.06) 0%, rgba(245, 240, 232, 0.035) 38%, transparent 72%);
          pointer-events: none;
          transform: translate(-50%, -50%);
          animation: proximity-breathe 6s ease-in-out infinite;
        }

        @keyframes proximity-breathe {
          0%,
          100% {
            opacity: 0.62;
            transform: translate(-50%, -50%) scale(0.96);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.04);
          }
        }
      `}</style>
    </div>
  );
}
