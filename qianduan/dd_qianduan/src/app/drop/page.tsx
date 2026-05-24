"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import BodyScan from "../../components/BodyScan";
import EmotionPicker from "../../components/EmotionPicker";
import RitualTransition from "../../components/RitualTransition";
import WritingCanvas from "../../components/WritingCanvas";
import type { EmotionType } from "../../lib/emotions";

type DropStep = "emotion" | "body" | "writing";

export default function DropPage() {
  const router = useRouter();
  const [step, setStep] = useState<DropStep>("emotion");
  const [emotion, setEmotion] = useState<EmotionType | null>(null);
  const [sensations, setSensations] = useState<string[]>([]);
  const [customSensation, setCustomSensation] = useState("");

  const chooseEmotion = (nextEmotion: EmotionType) => {
    setEmotion(nextEmotion);
    setSensations([]);
    setCustomSensation("");
    setStep("body");
  };

  const toggleSensation = (sensation: string) => {
    setSensations((currentSensations) =>
      currentSensations.includes(sensation)
        ? currentSensations.filter((currentSensation) => currentSensation !== sensation)
        : [...currentSensations, sensation],
    );
  };

  const continueToWriting = () => {
    const trimmedCustomSensation = customSensation.trim();
    const nextSensations =
      trimmedCustomSensation && !sensations.includes(trimmedCustomSensation)
        ? [...sensations, trimmedCustomSensation]
        : sensations;

    setSensations(nextSensations);
    setStep("writing");
  };

  return (
    <RitualTransition transitionKey={step}>
      {step === "emotion" && <EmotionPicker onSelect={chooseEmotion} />}
      {step === "body" && emotion && (
        <BodyScan
          emotion={emotion}
          selectedSensations={sensations}
          customSensation={customSensation}
          onToggleSensation={toggleSensation}
          onCustomSensationChange={setCustomSensation}
          onContinue={continueToWriting}
        />
      )}
      {step === "writing" && emotion && (
        <WritingCanvas emotion={emotion} sensations={sensations} onComplete={() => router.push("/map")} />
      )}
    </RitualTransition>
  );
}
