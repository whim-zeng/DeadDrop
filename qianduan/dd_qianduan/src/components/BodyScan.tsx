"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { emotionById, type EmotionType } from "../lib/emotions";

type BodyScanProps = {
  emotion: EmotionType;
  selectedSensations: string[];
  customSensation: string;
  onToggleSensation: (sensation: string) => void;
  onCustomSensationChange: (sensation: string) => void;
  onContinue: () => void;
};

const labelPositions = [
  { left: "31%", top: "26%" },
  { left: "66%", top: "33%" },
  { left: "28%", top: "43%" },
  { left: "67%", top: "50%" },
  { left: "34%", top: "61%" },
  { left: "63%", top: "66%" },
  { left: "43%", top: "76%" },
  { left: "57%", top: "78%" },
];

export default function BodyScan({
  emotion,
  selectedSensations,
  customSensation,
  onToggleSensation,
  onCustomSensationChange,
  onContinue,
}: BodyScanProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const emotionData = emotionById[emotion];

  return (
    <section className="body-scan">
      <div className="body-scan__figure" aria-hidden="true">
        <svg viewBox="0 0 220 520" role="img">
          <path
            d="M110 35
              C85 35 70 52 70 76
              C70 100 86 116 110 116
              C134 116 150 100 150 76
              C150 52 135 35 110 35
              M110 116
              C108 150 104 174 92 205
              C82 232 69 255 52 286
              M110 116
              C112 150 116 174 128 205
              C138 232 151 255 168 286
              M92 205
              C86 248 84 287 88 324
              C92 365 98 414 82 480
              M128 205
              C134 248 136 287 132 324
              C128 365 122 414 138 480
              M78 154
              C50 180 38 220 38 268
              M142 154
              C170 180 182 220 182 268"
          />
        </svg>
      </div>
      <div className="body-scan__labels">
        {emotionData.bodySuggestions.map((suggestion, index) => {
          const active = selectedSensations.includes(suggestion);
          const position = labelPositions[index % labelPositions.length];

          return (
            <motion.button
              className={`body-scan__label${active ? " body-scan__label--active" : ""}`}
              key={suggestion}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{
                opacity: 1,
                y: [0, index % 2 === 0 ? -2 : 2, 0],
              }}
              transition={{
                opacity: { duration: 0.5, delay: index * 0.15, ease: "easeOut" },
                y: { duration: 4.8 + index * 0.18, repeat: Infinity, ease: "easeInOut" },
              }}
              onClick={() => onToggleSensation(suggestion)}
              style={{
                left: position.left,
                top: position.top,
                color: emotionData.color,
                borderColor: active ? emotionData.glowColor : undefined,
                backgroundColor: active ? emotionData.glowColor : undefined,
              }}
            >
              {suggestion}
            </motion.button>
          );
        })}
      </div>
      <div className="body-scan__custom">
        <button className="body-scan__custom-trigger" type="button" onClick={() => setCustomOpen(true)}>
          或者，用你自己的话
        </button>
        {customOpen && (
          <motion.input
            className="body-scan__custom-input"
            autoFocus
            value={customSensation}
            onChange={(event) => onCustomSensationChange(event.target.value)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        )}
        <button className="body-scan__continue" type="button" onClick={onContinue}>
          继续
        </button>
      </div>
      <style>{`
        .body-scan {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
        }

        .body-scan__figure {
          position: absolute;
          left: 50%;
          top: 46%;
          width: min(42vw, 240px);
          height: 50vh;
          transform: translate(-50%, -50%);
        }

        .body-scan__figure svg {
          width: 100%;
          height: 100%;
          overflow: visible;
        }

        .body-scan__figure path {
          fill: none;
          stroke: rgba(245, 240, 232, 0.2);
          stroke-width: 1.5;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .body-scan__labels {
          position: absolute;
          inset: 0;
        }

        .body-scan__label {
          position: absolute;
          border: 1px solid rgba(245, 240, 232, 0.15);
          border-radius: 4px;
          padding: 6px 14px;
          background: rgba(245, 240, 232, 0.08);
          font-family: "Noto Sans SC", "Noto Sans", sans-serif;
          font-size: 14px;
          line-height: 1.4;
          transform: translate(-50%, -50%);
          transition: background-color 200ms ease-out, border-color 200ms ease-out;
        }

        .body-scan__label:hover {
          background: rgba(245, 240, 232, 0.15);
        }

        .body-scan__custom {
          position: absolute;
          left: 50%;
          bottom: 72px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 18px;
          transform: translateX(-50%);
        }

        .body-scan__custom-trigger {
          color: #F5F0E8;
          font-family: "Noto Sans SC", "Noto Sans", sans-serif;
          font-size: 13px;
          opacity: 0.3;
          transition: opacity 200ms ease-out;
        }

        .body-scan__custom-trigger:hover {
          opacity: 0.55;
        }

        .body-scan__custom-input {
          width: min(72vw, 320px);
          border-bottom: 1px solid rgba(245, 240, 232, 0.18);
          padding: 8px 0;
          color: #F5F0E8;
          font-family: "Noto Sans SC", "Noto Sans", sans-serif;
          font-size: 14px;
          text-align: center;
        }

        .body-scan__continue {
          color: #F5F0E8;
          font-family: "Noto Serif SC", "Noto Serif", serif;
          font-size: 15px;
          opacity: 0.5;
          transition: opacity 200ms ease-out;
        }

        .body-scan__continue:hover {
          opacity: 0.8;
        }
      `}</style>
    </section>
  );
}
