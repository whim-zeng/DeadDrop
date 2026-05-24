"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import PaperNote from "./PaperNote";
import { emotions, type EmotionType } from "../lib/emotions";

type FloatingNote = {
  id: number;
  content: string;
  emotion: EmotionType;
  y: number;
  duration: number;
  delay: number;
  scale: number;
  rotation: number;
  drift: number;
  createdAt: Date;
};

type FloatingNoteStyle = CSSProperties & {
  "--float-y": string;
  "--float-duration": string;
  "--float-delay": string;
  "--float-scale": number;
  "--float-rotation": string;
  "--float-drift": string;
  "--emotion-color": string;
};

const noteContents = [
  "医院走廊凌晨三点。有人醒着吗。",
  "那家咖啡馆的位子还在。人不在了。",
  "期末周第三天，我在厕所哭了十分钟。",
  "今天是个好日子。但我不知道跟谁说。",
  "妈妈刚打了电话。我没接。",
  "这个城市八百万人，没有一个知道我在这里。",
  "刚才有个陌生人对我笑了一下。够我撑过今天了。",
  "我想回家。但我不知道家在哪。",
];

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

const pickOne = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

const createFloatingNote = (id: number): FloatingNote => {
  const emotion = pickOne(emotions);

  return {
    id,
    content: pickOne(noteContents),
    emotion: emotion.id,
    y: randomBetween(8, 78),
    duration: randomBetween(12, 18),
    delay: randomBetween(0, 0.8),
    scale: randomBetween(0.64, 0.74),
    rotation: randomBetween(-4, 4),
    drift: randomBetween(14, 34),
    createdAt: new Date(Date.now() - randomBetween(0, 8) * 60 * 60 * 1000),
  };
};

export default function FloatingNotes() {
  const [notes, setNotes] = useState<FloatingNote[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    const addNote = () => {
      const note = createFloatingNote(nextId.current);
      nextId.current += 1;

      setNotes((currentNotes) => [...currentNotes.slice(-2), note]);

      window.setTimeout(() => {
        setNotes((currentNotes) => currentNotes.filter((currentNote) => currentNote.id !== note.id));
      }, (note.duration + note.delay + 0.5) * 1000);
    };

    addNote();
    const firstTimer = window.setTimeout(addNote, 1800);
    const interval = window.setInterval(addNote, 4600);

    return () => {
      window.clearTimeout(firstTimer);
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div className="floating-notes" aria-hidden="true">
      {notes.map((note) => {
        const emotion = emotions.find((item) => item.id === note.emotion) ?? emotions[0];
        const style: FloatingNoteStyle = {
          "--float-y": `${note.y}vh`,
          "--float-duration": `${note.duration}s`,
          "--float-delay": `${note.delay}s`,
          "--float-scale": note.scale,
          "--float-rotation": `${note.rotation}deg`,
          "--float-drift": `${note.drift}px`,
          "--emotion-color": emotion.color,
        };

        return (
          <div className="floating-notes__item" key={note.id} style={style}>
            <div className="floating-notes__sway">
              <div className="floating-notes__paper">
                <PaperNote
                  content={note.content}
                  emotion={note.emotion}
                  createdAt={note.createdAt}
                  readCount={0}
                  variant="open"
                />
              </div>
            </div>
          </div>
        );
      })}
      <style>{`
        .floating-notes {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .floating-notes__item {
          position: absolute;
          top: var(--float-y);
          left: -420px;
          width: 360px;
          animation: note-cross var(--float-duration) linear var(--float-delay) forwards;
          will-change: transform;
        }

        .floating-notes__sway {
          animation: note-sway 4.8s ease-in-out infinite;
          will-change: transform;
        }

        .floating-notes__paper {
          position: relative;
          transform: scale(var(--float-scale)) rotate(var(--float-rotation));
          transform-origin: center;
          animation: note-tilt 5.6s ease-in-out infinite;
        }

        .floating-notes__paper::before {
          content: "";
          position: absolute;
          z-index: 2;
          top: 24px;
          bottom: 24px;
          left: 22px;
          width: 3px;
          background: var(--emotion-color);
          opacity: 0.72;
          mix-blend-mode: multiply;
          pointer-events: none;
        }

        @keyframes note-cross {
          from {
            transform: translate3d(0, 0, 0);
          }
          to {
            transform: translate3d(calc(100vw + 840px), 0, 0);
          }
        }

        @keyframes note-sway {
          0% {
            transform: translateY(0);
          }
          25% {
            transform: translateY(calc(var(--float-drift) * -1));
          }
          50% {
            transform: translateY(0);
          }
          75% {
            transform: translateY(var(--float-drift));
          }
          100% {
            transform: translateY(0);
          }
        }

        @keyframes note-tilt {
          0% {
            transform: scale(var(--float-scale)) rotate(calc(var(--float-rotation) - 3deg));
          }
          50% {
            transform: scale(var(--float-scale)) rotate(calc(var(--float-rotation) + 3deg));
          }
          100% {
            transform: scale(var(--float-scale)) rotate(calc(var(--float-rotation) - 3deg));
          }
        }
      `}</style>
    </div>
  );
}
