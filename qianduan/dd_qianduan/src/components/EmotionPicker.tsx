"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { emotions, type EmotionType } from "../lib/emotions";

type EmotionPickerProps = {
  onSelect: (emotion: EmotionType) => void;
};

const positions: Record<EmotionType, { left: string; top: string }> = {
  joy: { left: "32%", top: "36%" },
  loss: { left: "66%", top: "48%" },
  sadness: { left: "48%", top: "61%" },
  anxiety: { left: "66%", top: "33%" },
  anger: { left: "34%", top: "66%" },
  calm: { left: "63%", top: "68%" },
};

const scatter: Record<EmotionType, { x: number; y: number }> = {
  joy: { x: -54, y: -42 },
  loss: { x: 62, y: 12 },
  sadness: { x: -12, y: 58 },
  anxiety: { x: 48, y: -48 },
  anger: { x: -58, y: 44 },
  calm: { x: 52, y: 50 },
};

export default function EmotionPicker({ onSelect }: EmotionPickerProps) {
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType | null>(null);
  const durations = useMemo(
    () =>
      emotions.reduce<Record<EmotionType, number>>((timing, emotion, index) => {
        timing[emotion.id] = 5 + ((index * 0.37) % 2);
        return timing;
      }, {} as Record<EmotionType, number>),
    [],
  );

  const chooseEmotion = (emotion: EmotionType) => {
    if (selectedEmotion) return;

    setSelectedEmotion(emotion);
    window.setTimeout(() => onSelect(emotion), 1200);
  };

  return (
    <section className="emotion-picker">
      <motion.p
        className="emotion-picker__prompt"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 0.5, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
      >
        你现在感觉怎么样？
      </motion.p>
      <div className="emotion-picker__words">
        {emotions.map((emotion) => {
          const isSelected = selectedEmotion === emotion.id;
          const isDismissing = selectedEmotion && !isSelected;
          const finalPosition = isSelected
            ? { left: "50%", top: "18%", x: "-50%", y: 0, scale: 0.73, opacity: 1 }
            : {
                x: isDismissing ? scatter[emotion.id].x : "-50%",
                y: isDismissing ? scatter[emotion.id].y : "-50%",
                scale: isDismissing ? 0.9 : 1,
                opacity: isDismissing ? 0 : 0.7,
              };

          return (
            <motion.button
              className="emotion-picker__word"
              key={emotion.id}
              type="button"
              onClick={() => chooseEmotion(emotion.id)}
              initial={{ opacity: 0, x: "-50%", y: "-50%" }}
              animate={
                selectedEmotion
                  ? finalPosition
                  : {
                      opacity: 0.7,
                      x: "-50%",
                      y: ["calc(-50% - 4px)", "calc(-50% + 4px)", "calc(-50% - 4px)"],
                    }
              }
              whileHover={selectedEmotion ? undefined : { opacity: 1, scale: 1.08 }}
              transition={
                selectedEmotion
                  ? { duration: 0.6, ease: "easeOut" }
                  : {
                      opacity: { duration: 0.6, ease: "easeOut" },
                      y: { duration: durations[emotion.id], repeat: Infinity, ease: "easeInOut" },
                      scale: { duration: 0.2 },
                    }
              }
              style={{
                left: isSelected ? undefined : positions[emotion.id].left,
                top: isSelected ? undefined : positions[emotion.id].top,
                color: emotion.color,
              }}
            >
              {emotion.label}
            </motion.button>
          );
        })}
      </div>
      <style>{`
        .emotion-picker {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
        }

        .emotion-picker__prompt {
          position: absolute;
          top: 72px;
          left: 50%;
          margin: 0;
          color: #F5F0E8;
          font-family: "Noto Serif SC", "Noto Serif", serif;
          font-size: 16px;
          font-weight: 400;
          letter-spacing: 0.06em;
          transform: translateX(-50%);
        }

        .emotion-picker__words {
          position: absolute;
          inset: 0;
        }

        .emotion-picker__word {
          position: absolute;
          font-family: "Noto Serif SC", "Noto Serif", serif;
          font-size: 22px;
          line-height: 1;
          white-space: nowrap;
          cursor: pointer;
          text-shadow: 0 0 20px currentColor;
        }
      `}</style>
    </section>
  );
}
