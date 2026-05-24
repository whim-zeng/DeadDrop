"use client";

import { useMemo, type CSSProperties, type ChangeEvent } from "react";
import { calculateAgingLevel } from "../lib/aging";
import { emotionById, type EmotionType } from "../lib/emotions";

type PaperNoteVariant = "folded" | "open" | "writing";

export type PaperNoteProps = {
  content: string;
  emotion: EmotionType;
  createdAt: Date;
  readCount: number;
  variant: PaperNoteVariant;
  onUnfold?: () => void;
  writingValue?: string;
  writingPlaceholder?: string;
  writingMinHeight?: number;
  onWritingChange?: (value: string) => void;
};

type PaperNoteStyle = CSSProperties & {
  "--paper-color": string;
  "--ink-color": string;
  "--ink-blur": string;
  "--paper-opacity": number;
  "--stain-opacity": number;
  "--stain-x": string;
  "--stain-y": string;
  "--stain-size": string;
  "--edge-decay": number;
  "--clip-path": string;
  "--emotion-glow": string;
  "--writing-min-height": string;
};

const PAPER_FRESH = "#F5F0E8";
const PAPER_DYING = "#D4C8A8";
const INK_FRESH = "#2C2C2C";
const INK_FADED = "#8B8589";

const hexToRgb = (hex: string) => {
  const normalized = hex.replace("#", "");
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
};

const interpolateColor = (from: string, to: string, amount: number) => {
  const start = hexToRgb(from);
  const end = hexToRgb(to);
  const mix = (a: number, b: number) => Math.round(a + (b - a) * amount);
  return `rgb(${mix(start.r, end.r)}, ${mix(start.g, end.g)}, ${mix(start.b, end.b)})`;
};

const createSeed = (value: string) => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const createRandom = (seed: number) => {
  let state = seed || 1;

  return () => {
    state = Math.imul(state ^ (state >>> 15), 1 | state);
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
};

const randomBetween = (random: () => number, min: number, max: number) => min + (max - min) * random();

const edgePoint = (random: () => number, x: string, y: string) => {
  const xOffset = randomBetween(random, 2, 5).toFixed(2);
  const yOffset = randomBetween(random, 2, 5).toFixed(2);
  const xDirection = random() > 0.5 ? "+" : "-";
  const yDirection = random() > 0.5 ? "+" : "-";
  return `calc(${x} ${xDirection} ${xOffset}px) calc(${y} ${yDirection} ${yOffset}px)`;
};

const createClipPath = (random: () => number) =>
  `polygon(
    ${edgePoint(random, "0%", "3%")},
    ${edgePoint(random, "22%", "0%")},
    ${edgePoint(random, "51%", "0%")},
    ${edgePoint(random, "78%", "0%")},
    ${edgePoint(random, "100%", "4%")},
    ${edgePoint(random, "100%", "31%")},
    ${edgePoint(random, "100%", "66%")},
    ${edgePoint(random, "100%", "96%")},
    ${edgePoint(random, "76%", "100%")},
    ${edgePoint(random, "49%", "100%")},
    ${edgePoint(random, "21%", "100%")},
    ${edgePoint(random, "0%", "95%")},
    ${edgePoint(random, "0%", "62%")},
    ${edgePoint(random, "0%", "28%")}
  )`;

export default function PaperNote({
  content,
  emotion,
  createdAt,
  readCount,
  variant,
  onUnfold,
  writingValue,
  writingPlaceholder = "想说点什么……",
  writingMinHeight = 260,
  onWritingChange,
}: PaperNoteProps) {
  const aging = calculateAgingLevel(createdAt, readCount);
  const emotionData = emotionById[emotion];

  const paperTexture = useMemo(() => {
    const seed = createSeed(`${content}-${emotion}-${createdAt.getTime()}-${readCount}`);
    const random = createRandom(seed);

    return {
      clipPath: createClipPath(random),
      stainX: `${randomBetween(random, 8, 62).toFixed(2)}%`,
      stainY: `${randomBetween(random, 6, 58).toFixed(2)}%`,
      stainSize: `${randomBetween(random, 180, 280).toFixed(2)}px`,
    };
  }, [content, createdAt, emotion, readCount]);

  const paperStyle: PaperNoteStyle = {
    "--paper-color": interpolateColor(PAPER_FRESH, PAPER_DYING, aging.yellowShift),
    "--ink-color": interpolateColor(INK_FRESH, INK_FADED, aging.yellowShift),
    "--ink-blur": `${aging.blurAmount}px`,
    "--paper-opacity": aging.paperOpacity,
    "--stain-opacity": aging.stainOpacity,
    "--stain-x": paperTexture.stainX,
    "--stain-y": paperTexture.stainY,
    "--stain-size": paperTexture.stainSize,
    "--edge-decay": aging.edgeDecay,
    "--clip-path": paperTexture.clipPath,
    "--emotion-glow": emotionData.glowColor,
    "--writing-min-height": `${writingMinHeight}px`,
  };

  const updateWriting = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onWritingChange?.(event.target.value);
  };

  return (
    <article
      className={`paper-note paper-note--${variant}`}
      onClick={variant === "folded" ? onUnfold : undefined}
      style={paperStyle}
    >
      <div className="paper-note__surface" aria-hidden={variant === "folded"}>
        <span className="paper-note__stain" />
        {variant === "writing" ? (
          <textarea
            className="paper-note__textarea"
            placeholder={writingPlaceholder}
            value={writingValue}
            onChange={updateWriting}
          />
        ) : (
          <p className="paper-note__content">{content}</p>
        )}
      </div>
      {variant === "folded" && (
        <div className="paper-note__fold" aria-hidden="true">
          <span className="paper-note__fold-half paper-note__fold-half--top" />
          <span className="paper-note__fold-half paper-note__fold-half--bottom" />
          <span className="paper-note__fold-crease" />
        </div>
      )}
      <style>{`
        .paper-note {
          position: relative;
          width: min(100%, 480px);
          max-width: 480px;
          min-height: 220px;
          color: var(--ink-color);
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
          opacity: var(--paper-opacity);
        }

        .paper-note__surface,
        .paper-note__fold-half {
          position: relative;
          background-color: var(--paper-color);
          background-image:
            radial-gradient(circle at 18% 22%, var(--emotion-glow), transparent 28%);
          background-repeat: no-repeat;
          background-size: 280px 220px;
          background-blend-mode: multiply;
          clip-path: var(--clip-path);
          overflow: hidden;
        }

        .paper-note__surface {
          min-height: 220px;
          padding: 32px;
        }

        .paper-note__surface::before,
        .paper-note__fold-half::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: url("/textures/paper-grain.png");
          background-repeat: repeat;
          background-size: 128px 128px;
          opacity: 0.08;
          pointer-events: none;
        }

        .paper-note__surface::after {
          content: "";
          position: absolute;
          top: -20%;
          left: 50%;
          width: 1px;
          height: 140%;
          background: rgba(0, 0, 0, 0.06);
          transform: rotate(-34deg);
          transform-origin: center;
          pointer-events: none;
        }

        .paper-note__stain {
          position: absolute;
          left: var(--stain-x);
          top: var(--stain-y);
          width: var(--stain-size);
          aspect-ratio: 1;
          background: url("/textures/paper-stain.png") center / contain no-repeat;
          opacity: var(--stain-opacity);
          mix-blend-mode: multiply;
          transform: translate(-35%, -28%) rotate(-12deg);
          pointer-events: none;
        }

        .paper-note__content,
        .paper-note__textarea {
          position: relative;
          z-index: 1;
          margin: 0;
          color: var(--ink-color);
          font-family: "LXGW WenKai", "Caveat", cursive;
          font-size: 18px;
          line-height: 2;
          letter-spacing: 0.02em;
          filter: blur(var(--ink-blur));
          white-space: pre-wrap;
        }

        .paper-note__textarea {
          display: block;
          width: 100%;
          min-height: var(--writing-min-height);
          resize: none;
          background: transparent;
          caret-color: var(--ink-color);
          overflow: hidden;
          scrollbar-width: none;
        }

        .paper-note__textarea::-webkit-scrollbar {
          display: none;
        }

        .paper-note__textarea::placeholder {
          color: #4B5563;
        }

        .paper-note--folded {
          height: 120px;
          min-height: 120px;
          cursor: pointer;
          perspective: 900px;
        }

        .paper-note--folded .paper-note__surface {
          height: 120px;
          min-height: 120px;
          opacity: 0;
          pointer-events: none;
        }

        .paper-note--folded .paper-note__content {
          visibility: hidden;
        }

        .paper-note__fold {
          position: absolute;
          inset: 0;
          transform-style: preserve-3d;
        }

        .paper-note__fold-half {
          position: absolute;
          left: 0;
          width: 100%;
          height: 50%;
          backface-visibility: hidden;
        }

        .paper-note__fold-half--top {
          top: 0;
          transform-origin: bottom;
          transform: rotateX(23deg);
        }

        .paper-note__fold-half--bottom {
          bottom: 0;
          transform-origin: top;
          transform: rotateX(-28deg);
        }

        .paper-note__fold-crease {
          position: absolute;
          top: 50%;
          left: 6px;
          right: 6px;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.18), transparent);
          transform: translateY(-50%);
          opacity: 0.9;
        }

        .paper-note--open .paper-note__surface,
        .paper-note--writing .paper-note__surface {
          transition:
            background-color 800ms ease-out,
            opacity 800ms ease-out,
            filter 800ms ease-out;
        }
      `}</style>
    </article>
  );
}
