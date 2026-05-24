"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import PaperNote from "./PaperNote";
import { emotionById, type EmotionType } from "../lib/emotions";

export type NoteUnfoldAction = "putback" | "reply" | "keep";

export type NoteUnfoldNote = {
  content: string;
  emotion: EmotionType;
  createdAt: Date;
  readCount: number;
};

type NoteUnfoldProps = {
  note: NoteUnfoldNote;
  onClose: () => void;
  onRespond: (action: NoteUnfoldAction) => void;
};

type NotePhase = "folded" | "opening" | "reading" | "ready" | "putback" | "reply" | "keep" | "kept";

const wait = (duration: number) => new Promise((resolve) => window.setTimeout(resolve, duration));

export default function NoteUnfold({ note, onClose, onRespond }: NoteUnfoldProps) {
  const [phase, setPhase] = useState<NotePhase>("folded");
  const [visibleCharacters, setVisibleCharacters] = useState(0);
  const [replyContent, setReplyContent] = useState("");
  const emotion = emotionById[note.emotion];
  const characters = useMemo(() => Array.from(note.content), [note.content]);
  const optionsVisible = phase === "ready";
  const opening = phase === "opening";
  const opened = phase === "reading" || phase === "ready" || phase === "reply" || phase === "keep" || phase === "kept";

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const unfold = async () => {
    if (phase !== "folded") return;

    setPhase("opening");
    await wait(1200);
    setPhase("reading");

    const revealDelay = Math.max(18, Math.min(30, 4000 / Math.max(characters.length, 1)));

    for (let index = 1; index <= characters.length; index += 1) {
      await wait(revealDelay);
      setVisibleCharacters(index);
    }

    await wait(1000);
    setPhase("ready");
  };

  const putBack = async () => {
    setPhase("putback");
    await wait(1400);
    onRespond("putback");
  };

  const keepNote = async () => {
    setPhase("keep");
    await wait(1000);
    setPhase("kept");
    await wait(2000);
    onRespond("keep");
  };

  const leaveReply = () => {
    setPhase("reply");
  };

  const dropReply = async () => {
    setPhase("putback");
    await wait(1200);
    onRespond("reply");
  };

  return (
    <section className={`note-unfold note-unfold--${phase}`}>
      <motion.div
        className="note-unfold__veil"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
      <AnimatePresence>
        {phase === "kept" && (
          <motion.p
            className="note-unfold__kept"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 0.4, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            已收入足迹
          </motion.p>
        )}
      </AnimatePresence>
      <motion.div
        className="note-unfold__stage"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.18}
        onDragEnd={(_, info) => {
          if (info.offset.y < -40) unfold();
        }}
      >
        <AnimatePresence>
          {phase === "folded" && (
            <motion.p
              className="note-unfold__hint"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 0.8, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              style={{ color: emotion.color }}
            >
              {emotion.mapHint}
            </motion.p>
          )}
        </AnimatePresence>

        <motion.div
          className="note-unfold__paper"
          animate={
            phase === "putback"
              ? { scale: 0.24, y: 180, opacity: 0 }
              : phase === "keep"
                ? { scale: 0.72, y: 42, opacity: 0 }
                : phase === "reply"
                  ? { x: "-32vw", scale: 0.58, opacity: 0.7 }
                  : { x: 0, scale: 1, y: 0, opacity: 1 }
          }
          transition={{ duration: phase === "putback" ? 0.8 : 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {opened ? (
            <div className="note-unfold__open-note">
              <PaperNote
                content=""
                emotion={note.emotion}
                createdAt={note.createdAt}
                readCount={note.readCount}
                variant="open"
              />
              <p className="note-unfold__typed" aria-label={note.content}>
                {characters.map((character, index) => (
                  <motion.span
                    key={`${character}-${index}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: index < visibleCharacters ? 1 : 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                  >
                    {character}
                  </motion.span>
                ))}
              </p>
            </div>
          ) : (
            <PaperNote
              content={note.content}
              emotion={note.emotion}
              createdAt={note.createdAt}
              readCount={note.readCount}
              variant="folded"
              onUnfold={unfold}
            />
          )}
          {(opening || phase === "putback") && (
            <div className="note-unfold__fold" aria-hidden="true">
              <motion.span
                className="note-unfold__fold-half note-unfold__fold-half--top"
                initial={opening ? { rotateX: -90 } : { rotateX: 0 }}
                animate={opening ? { rotateX: 0 } : { rotateX: -88 }}
                transition={{ duration: opening ? 1.2 : 0.8, ease: [0.16, 1, 0.3, 1] }}
              />
              <motion.span
                className="note-unfold__fold-half note-unfold__fold-half--bottom"
                initial={opening ? { rotateX: 90 } : { rotateX: 0 }}
                animate={opening ? { rotateX: 0 } : { rotateX: 88 }}
                transition={{ duration: opening ? 1.2 : 0.8, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          )}
        </motion.div>

        <AnimatePresence>
          {phase === "folded" && (
            <motion.button
              className="note-unfold__pick"
              type="button"
              onClick={unfold}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 0.6, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
            >
              捡起
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {optionsVisible && (
            <motion.div className="note-unfold__choices" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {[
                { label: "轻轻放回原处", action: putBack },
                { label: "在旁边留一张", action: leaveReply },
                { label: "带走它", action: keepNote },
              ].map((choice, index) => (
                <motion.button
                  className="note-unfold__choice"
                  key={choice.label}
                  type="button"
                  onClick={choice.action}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 0.5, y: 0 }}
                  whileHover={{ opacity: 0.9 }}
                  transition={{ duration: 0.4, delay: index * 0.2, ease: "easeOut" }}
                >
                  {choice.label}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase === "reply" && (
            <motion.div
              className="note-unfold__reply"
              initial={{ opacity: 0, x: 80 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <PaperNote
                content={replyContent}
                emotion={note.emotion}
                createdAt={new Date()}
                readCount={0}
                variant="writing"
                writingValue={replyContent}
                writingPlaceholder="想说点什么都好……"
                writingMinHeight={260}
                onWritingChange={setReplyContent}
              />
              <button className="note-unfold__drop-reply" type="button" onClick={dropReply}>
                放下
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase === "putback" && (
            <motion.span
              className="note-unfold__life"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: [0, 1, 0], scale: [0.7, 1.35, 1.8] }}
              transition={{ duration: 0.9, delay: 0.55, ease: "easeOut" }}
              style={{ background: emotion.color, boxShadow: `0 0 18px ${emotion.glowColor}` }}
            />
          )}
        </AnimatePresence>
      </motion.div>
      <style>{`
        .note-unfold {
          position: fixed;
          inset: 0;
          z-index: 20;
          overflow: hidden;
          color: #F5F0E8;
        }

        .note-unfold__veil {
          position: absolute;
          inset: 0;
          background: rgba(15, 15, 26, 0.85);
        }

        .note-unfold__stage {
          position: relative;
          z-index: 1;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
        }

        .note-unfold__hint {
          position: absolute;
          top: calc(50% - 160px);
          margin: 0;
          font-family: "Noto Serif SC", "Noto Serif", serif;
          font-size: 13px;
          line-height: 1.6;
          text-shadow: 0 0 18px currentColor;
        }

        .note-unfold__paper {
          position: relative;
          width: min(100%, 480px);
          perspective: 800px;
          transform-style: preserve-3d;
        }

        .note-unfold__open-note {
          position: relative;
        }

        .note-unfold__typed {
          position: absolute;
          inset: 32px;
          z-index: 4;
          margin: 0;
          color: #2C2C2C;
          font-family: "LXGW WenKai", "Caveat", cursive;
          font-size: 18px;
          line-height: 2;
          letter-spacing: 0.02em;
          white-space: pre-wrap;
          pointer-events: none;
        }

        .note-unfold__fold {
          position: absolute;
          inset: 0;
          z-index: 8;
          pointer-events: none;
          transform-style: preserve-3d;
        }

        .note-unfold__fold-half {
          position: absolute;
          left: 0;
          width: 100%;
          height: 50%;
          background:
            linear-gradient(135deg, rgba(245, 240, 232, 0.98), rgba(212, 200, 168, 0.94)),
            url("/textures/paper-grain.png");
          background-repeat: repeat;
          background-size: 128px 128px;
          backface-visibility: hidden;
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.22));
        }

        .note-unfold__fold-half--top {
          top: 0;
          transform-origin: bottom center;
        }

        .note-unfold__fold-half--bottom {
          bottom: 0;
          transform-origin: top center;
        }

        .note-unfold__pick {
          position: absolute;
          top: calc(50% + 96px);
          color: #F5F0E8;
          font-family: "Noto Serif SC", "Noto Serif", serif;
          font-size: 16px;
          transition: opacity 200ms ease-out;
        }

        .note-unfold__pick:hover {
          opacity: 0.9 !important;
        }

        .note-unfold__choices {
          position: absolute;
          left: 50%;
          bottom: 52px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          transform: translateX(-50%);
        }

        .note-unfold__choice {
          color: #F5F0E8;
          font-family: "Noto Serif SC", "Noto Serif", serif;
          font-size: 15px;
          line-height: 1;
        }

        .note-unfold__reply {
          position: absolute;
          left: 52%;
          top: 50%;
          width: min(42vw, 420px);
          transform: translateY(-50%);
        }

        .note-unfold__drop-reply {
          position: absolute;
          left: 50%;
          bottom: -54px;
          color: #F5F0E8;
          font-family: "Noto Serif SC", "Noto Serif", serif;
          font-size: 16px;
          letter-spacing: 6px;
          opacity: 0.6;
          transform: translateX(-50%);
          transition: opacity 200ms ease-out;
        }

        .note-unfold__drop-reply:hover {
          opacity: 1;
        }

        .note-unfold__life {
          position: absolute;
          left: 50%;
          top: calc(50% + 100px);
          width: 10px;
          height: 10px;
          border-radius: 50%;
          transform: translate(-50%, -50%);
        }

        .note-unfold__kept {
          position: absolute;
          left: 50%;
          bottom: 56px;
          z-index: 3;
          margin: 0;
          color: #F5F0E8;
          font-family: "Noto Serif SC", "Noto Serif", serif;
          font-size: 14px;
          transform: translateX(-50%);
        }

        @media (max-width: 760px) {
          .note-unfold__paper {
            width: min(88vw, 480px);
          }

          .note-unfold__reply {
            left: 50%;
            top: auto;
            bottom: 92px;
            width: min(88vw, 420px);
          }

          .note-unfold--reply .note-unfold__paper {
            opacity: 0.18 !important;
          }
        }
      `}</style>
    </section>
  );
}
