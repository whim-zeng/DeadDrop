"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import PaperNote from "./PaperNote";
import { emotionById, type EmotionType } from "../lib/emotions";

type WritingPhase = "writing" | "folding" | "falling" | "dark" | "echo";

type WritingCanvasProps = {
  emotion: EmotionType;
  sensations: string[];
  onComplete: () => void;
};

const wait = (duration: number) => new Promise((resolve) => window.setTimeout(resolve, duration));

export default function WritingCanvas({ emotion, sensations, onComplete }: WritingCanvasProps) {
  const [content, setContent] = useState("");
  const [phase, setPhase] = useState<WritingPhase>("writing");
  const emotionData = emotionById[emotion];
  const visibleSensations = sensations.filter(Boolean);
  const status = [emotionData.label, ...visibleSensations].join(" · ");
  const echoSensation = useMemo(
    () => visibleSensations[0] ?? emotionData.bodySuggestions[Math.floor(Math.random() * emotionData.bodySuggestions.length)],
    [emotionData.bodySuggestions, visibleSensations],
  );

  const dropNote = async () => {
    if (phase !== "writing") return;

    setPhase("folding");
    await wait(1000);
    setPhase("falling");
    await wait(600);
    setPhase("dark");
    await wait(400);
    setPhase("echo");
    await wait(4600);
    onComplete();
  };

  return (
    <section className={`writing-canvas writing-canvas--${phase}`}>
      <AnimatePresence>
        {phase === "echo" && (
          <motion.p
            className="writing-canvas__echo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            你说的是——{emotionData.label}，和{echoSensation}。
          </motion.p>
        )}
      </AnimatePresence>
      {phase !== "dark" && phase !== "echo" && (
        <div className="writing-canvas__stage">
          <p className="writing-canvas__status" style={{ color: emotionData.color }}>
            {status}
          </p>
          <motion.div
            className="writing-canvas__paper-wrap"
            animate={
              phase === "falling"
                ? { scale: 0.3, y: 200, opacity: 0 }
                : phase === "folding"
                  ? { scale: 1, y: 0, opacity: 1 }
                  : { scale: 1, y: 0, opacity: 1 }
            }
            transition={{ duration: phase === "falling" ? 0.6 : 0.8, ease: "easeInOut" }}
          >
            <PaperNote
              content={content}
              emotion={emotion}
              createdAt={new Date()}
              readCount={0}
              variant="writing"
              writingValue={content}
              writingPlaceholder="想说点什么都好……"
              writingMinHeight={300}
              onWritingChange={setContent}
            />
            {phase !== "writing" && (
              <div className="writing-canvas__fold" aria-hidden="true">
                <motion.span
                  className="writing-canvas__fold-half writing-canvas__fold-half--top"
                  initial={{ rotateX: 0 }}
                  animate={{ rotateX: -84 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                />
                <motion.span
                  className="writing-canvas__fold-half writing-canvas__fold-half--bottom"
                  initial={{ rotateX: 0 }}
                  animate={{ rotateX: 84 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            )}
          </motion.div>
          <motion.button
            className="writing-canvas__drop"
            type="button"
            onClick={dropNote}
            animate={{ opacity: phase === "writing" ? 0.6 : 0 }}
            whileHover={phase === "writing" ? { opacity: 1 } : undefined}
            transition={{ duration: 0.2 }}
          >
            放下
          </motion.button>
        </div>
      )}
      <style>{`
        .writing-canvas {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          background: linear-gradient(135deg, #0F0F1A 0%, #1A1A2E 50%, #16213E 100%);
        }

        .writing-canvas--dark,
        .writing-canvas--echo {
          background: #000;
        }

        .writing-canvas__stage {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
        }

        .writing-canvas__status {
          margin: 0 0 24px;
          font-family: "Noto Sans SC", "Noto Sans", sans-serif;
          font-size: 13px;
          line-height: 1.6;
          opacity: 0.5;
        }

        .writing-canvas__paper-wrap {
          position: relative;
          width: min(100%, 480px);
          perspective: 800px;
          transform-style: preserve-3d;
        }

        .writing-canvas__fold {
          position: absolute;
          inset: 0;
          z-index: 8;
          pointer-events: none;
          transform-style: preserve-3d;
        }

        .writing-canvas__fold-half {
          position: absolute;
          left: 0;
          width: 100%;
          height: 50%;
          background:
            linear-gradient(135deg, rgba(245, 240, 232, 0.96), rgba(212, 200, 168, 0.92)),
            url("/textures/paper-grain.png");
          background-repeat: repeat;
          background-size: 128px 128px;
          opacity: 0.96;
          backface-visibility: hidden;
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.24));
        }

        .writing-canvas__fold-half--top {
          top: 0;
          transform-origin: bottom center;
        }

        .writing-canvas__fold-half--bottom {
          bottom: 0;
          transform-origin: top center;
        }

        .writing-canvas__drop {
          position: relative;
          margin-top: 32px;
          color: #F5F0E8;
          font-family: "Noto Serif SC", "Noto Serif", serif;
          font-size: 18px;
          letter-spacing: 8px;
          pointer-events: auto;
        }

        .writing-canvas__drop::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: -12px;
          width: 60px;
          height: 1px;
          background: rgba(245, 240, 232, 0.2);
          transform: translateX(-50%);
        }

        .writing-canvas__echo {
          position: absolute;
          left: 50%;
          top: 50%;
          margin: 0;
          color: #F5F0E8;
          font-family: "Noto Serif SC", "Noto Serif", serif;
          font-size: 16px;
          letter-spacing: 0.04em;
          transform: translate(-50%, -50%);
          white-space: nowrap;
        }
      `}</style>
    </section>
  );
}
