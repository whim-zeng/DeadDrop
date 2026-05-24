export type AgingStage = "fresh" | "aging" | "old" | "dying";

export type AgingLevel = {
  stage: AgingStage;
  paperOpacity: number;
  yellowShift: number;
  blurAmount: number;
  stainOpacity: number;
  edgeDecay: number;
};

const HOUR_IN_MS = 60 * 60 * 1000;
const BASE_LIFETIME_MS = 24 * HOUR_IN_MS;
const READ_EXTENSION_MS = 2 * HOUR_IN_MS;
const MAX_LIFETIME_MS = 7 * 24 * HOUR_IN_MS;

type AgingPoint = {
  progress: number;
} & AgingLevel;

const agingCurve: AgingPoint[] = [
  {
    progress: 0,
    stage: "fresh",
    paperOpacity: 1,
    yellowShift: 0,
    blurAmount: 0,
    stainOpacity: 0,
    edgeDecay: 0,
  },
  {
    progress: 0.25,
    stage: "fresh",
    paperOpacity: 0.9,
    yellowShift: 0.15,
    blurAmount: 0.3,
    stainOpacity: 0.12,
    edgeDecay: 0.08,
  },
  {
    progress: 0.6,
    stage: "aging",
    paperOpacity: 0.72,
    yellowShift: 0.45,
    blurAmount: 1.1,
    stainOpacity: 0.32,
    edgeDecay: 0.35,
  },
  {
    progress: 0.9,
    stage: "old",
    paperOpacity: 0.48,
    yellowShift: 0.78,
    blurAmount: 2.2,
    stainOpacity: 0.5,
    edgeDecay: 0.75,
  },
  {
    progress: 1,
    stage: "dying",
    paperOpacity: 0.3,
    yellowShift: 1,
    blurAmount: 3,
    stainOpacity: 0.6,
    edgeDecay: 1,
  },
];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const lerp = (from: number, to: number, progress: number) => from + (to - from) * progress;

const getStage = (progress: number): AgingStage => {
  if (progress < 0.25) return "fresh";
  if (progress < 0.6) return "aging";
  if (progress < 0.9) return "old";
  return "dying";
};

export function calculateAgingLevel(createdAt: Date, readCount: number): AgingLevel {
  const extendedLifetime = BASE_LIFETIME_MS + Math.max(0, readCount) * READ_EXTENSION_MS;
  const lifetime = Math.min(extendedLifetime, MAX_LIFETIME_MS);
  const elapsed = Date.now() - createdAt.getTime();
  const progress = clamp(elapsed / lifetime, 0, 1);
  const nextPointIndex = agingCurve.findIndex((point) => point.progress >= progress);

  if (nextPointIndex <= 0) {
    return {
      stage: getStage(progress),
      paperOpacity: agingCurve[0].paperOpacity,
      yellowShift: agingCurve[0].yellowShift,
      blurAmount: agingCurve[0].blurAmount,
      stainOpacity: agingCurve[0].stainOpacity,
      edgeDecay: agingCurve[0].edgeDecay,
    };
  }

  const from = agingCurve[nextPointIndex - 1];
  const to = agingCurve[nextPointIndex];
  const segmentProgress = (progress - from.progress) / (to.progress - from.progress);

  return {
    stage: getStage(progress),
    paperOpacity: lerp(from.paperOpacity, to.paperOpacity, segmentProgress),
    yellowShift: lerp(from.yellowShift, to.yellowShift, segmentProgress),
    blurAmount: lerp(from.blurAmount, to.blurAmount, segmentProgress),
    stainOpacity: lerp(from.stainOpacity, to.stainOpacity, segmentProgress),
    edgeDecay: lerp(from.edgeDecay, to.edgeDecay, segmentProgress),
  };
}
