"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import NoteUnfold, { type NoteUnfoldAction, type NoteUnfoldNote } from "../../../components/NoteUnfold";
import { emotions } from "../../../lib/emotions";

const contents = [
  "医院走廊凌晨三点。有人醒着吗。",
  "那家咖啡馆的位子还在。人不在了。",
  "期末周第三天，我在厕所哭了十分钟。",
  "今天是个好日子。但我不知道跟谁说。",
  "妈妈刚打了电话。我没接。",
  "这个城市八百万人，没有一个知道我在这里。",
  "刚才有个陌生人对我笑了一下。够我撑过今天了。",
  "我想回家。但我不知道家在哪。",
];

const createMockNote = (id: string, baseTime: number): NoteUnfoldNote => {
  const seed = Array.from(id).reduce((value, character) => value + character.charCodeAt(0), 0);
  const emotion = emotions[seed % emotions.length];
  const content = contents[seed % contents.length];

  return {
    content,
    emotion: emotion.id,
    createdAt: new Date(baseTime - ((seed % 36) + 2) * 60 * 60 * 1000),
    readCount: seed % 5,
  };
};

export default function NotePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [baseTime, setBaseTime] = useState<number | null>(null);
  const note = useMemo(() => (baseTime ? createMockNote(params.id, baseTime) : null), [baseTime, params.id]);

  useEffect(() => {
    setBaseTime(Date.now());
  }, []);

  const returnToMap = (_action?: NoteUnfoldAction) => {
    router.push("/map");
  };

  return (
    <main className="note-page">
      {note && <NoteUnfold note={note} onClose={() => router.push("/map")} onRespond={returnToMap} />}
      <style>{`
        .note-page {
          min-height: 100vh;
          background: #0F0F1A;
          overflow: hidden;
        }
      `}</style>
    </main>
  );
}
