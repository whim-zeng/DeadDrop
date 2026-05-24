"use client";

import { AnimatePresence, motion } from "framer-motion";
import mapboxgl, { type Map as MapboxMap } from "mapbox-gl";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import PaperNote from "../../components/PaperNote";
import { emotionById, emotions, type EmotionType } from "../../lib/emotions";
import { deaddropMapStyle } from "../../lib/mapStyle";

type FootprintType = "placed" | "caught";

type GeoPosition = {
  lng: number;
  lat: number;
};

type FootprintNote = {
  id: string;
  type: FootprintType;
  content: string;
  emotion: EmotionType;
  position: GeoPosition;
  createdAt: Date;
  readCount: number;
  place: string;
};

type ProjectedFootprint = FootprintNote & {
  screen: {
    x: number;
    y: number;
  };
  clusterSize: number;
};

type DotStyle = CSSProperties & {
  "--dot-x": string;
  "--dot-y": string;
  "--dot-size": string;
  "--dot-color": string;
  "--dot-glow": string;
  "--dot-solid-opacity": number;
  "--dot-ring-opacity": number;
};

const center: GeoPosition = {
  lng: 121.4737,
  lat: 31.2304,
};
const FALLBACK_PIXELS_PER_METER = 4;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const createMockFootprints = (baseTime: number): FootprintNote[] => [
  {
    id: "placed-1",
    type: "placed",
    content: "今天是个好日子。但我不知道跟谁说。",
    emotion: "joy",
    position: { lng: center.lng + 0.00012, lat: center.lat + 0.00018 },
    createdAt: new Date(baseTime - 92 * DAY_IN_MS),
    readCount: 3,
    place: "上海市黄浦区人民广场",
  },
  {
    id: "caught-1",
    type: "caught",
    content: "这个城市八百万人，没有一个知道我在这里。",
    emotion: "sadness",
    position: { lng: center.lng - 0.00022, lat: center.lat + 0.00008 },
    createdAt: new Date(baseTime - 51 * DAY_IN_MS),
    readCount: 6,
    place: "中关村",
  },
  {
    id: "placed-2",
    type: "placed",
    content: "妈妈刚打了电话。我没接。",
    emotion: "loss",
    position: { lng: center.lng + 0.00034, lat: center.lat - 0.00008 },
    createdAt: new Date(baseTime - 28 * DAY_IN_MS),
    readCount: 1,
    place: "静安寺",
  },
  {
    id: "placed-3",
    type: "placed",
    content: "期末周第三天，我在厕所哭了十分钟。",
    emotion: "anxiety",
    position: { lng: center.lng + 0.00034, lat: center.lat - 0.00008 },
    createdAt: new Date(baseTime - 18 * DAY_IN_MS),
    readCount: 2,
    place: "静安寺",
  },
  {
    id: "caught-2",
    type: "caught",
    content: "刚才有个陌生人对我笑了一下。够我撑过今天了。",
    emotion: "calm",
    position: { lng: center.lng - 0.0001, lat: center.lat - 0.00029 },
    createdAt: new Date(baseTime - 8 * DAY_IN_MS),
    readCount: 0,
    place: "武康路",
  },
  {
    id: "placed-4",
    type: "placed",
    content: "我想回家。但我不知道家在哪。",
    emotion: "anger",
    position: { lng: center.lng + 0.00002, lat: center.lat + 0.00036 },
    createdAt: new Date(baseTime - 2 * DAY_IN_MS),
    readCount: 4,
    place: "苏州河边",
  },
];

const periodOfDay = (date: Date) => {
  const hour = date.getHours();
  if (hour < 5) return "凌晨";
  if (hour < 11) return "清晨";
  if (hour < 14) return "午后";
  if (hour < 18) return "傍晚";
  return "夜里";
};

const relativeTime = (date: Date) => {
  const diffDays = Math.max(1, Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000)));

  if (diffDays >= 90) return "三个月前";
  if (diffDays >= 60) return "两个月前";
  if (diffDays >= 30) return "一个月前";
  if (diffDays >= 14) return "半个月前";
  if (diffDays >= 7) return "上周";
  if (diffDays > 1) return "几天前";
  return "昨天";
};

const poeticTime = (date: Date) => `${relativeTime(date)}的${periodOfDay(date)}`;

const shortestPlace = (place: string) => place.split(/[市区县省·,，\s]+/).filter(Boolean).at(-1) ?? place;

const clusterKey = (position: GeoPosition) => `${position.lng.toFixed(5)}:${position.lat.toFixed(5)}`;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const projectFallbackPoint = (origin: GeoPosition, target: GeoPosition) => {
  const xMeters = (target.lng - origin.lng) * 111320 * Math.cos(toRadians(origin.lat));
  const yMeters = (target.lat - origin.lat) * -111320;

  return {
    x: window.innerWidth / 2 + xMeters * FALLBACK_PIXELS_PER_METER,
    y: window.innerHeight / 2 + yMeters * FALLBACK_PIXELS_PER_METER,
  };
};

const createProjectedFootprints = (
  footprints: FootprintNote[],
  project: (position: GeoPosition) => { x: number; y: number },
) => {
  const clusterCounts = footprints.reduce<Record<string, number>>((counts, footprint) => {
    const key = clusterKey(footprint.position);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});

  return footprints.map((footprint) => ({
    ...footprint,
    screen: project(footprint.position),
    clusterSize: clusterCounts[clusterKey(footprint.position)] ?? 1,
  }));
};

export default function FootprintsPage() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const [projectedFootprints, setProjectedFootprints] = useState<ProjectedFootprint[]>([]);
  const [activeType, setActiveType] = useState<FootprintType>("placed");
  const [timelineProgress, setTimelineProgress] = useState(100);
  const [activeNote, setActiveNote] = useState<FootprintNote | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const footprints = useMemo(() => (now ? createMockFootprints(now) : []), [now]);

  useEffect(() => {
    setNow(Date.now());
  }, []);

  const sortedFootprints = useMemo(
    () => [...footprints].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime()),
    [footprints],
  );
  const firstTime = sortedFootprints[0]?.createdAt.getTime() ?? 0;
  const visibleUntil = now && firstTime ? firstTime + ((now - firstTime) * timelineProgress) / 100 : 0;
  const typeFootprints = projectedFootprints.filter((footprint) => footprint.type === activeType);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    if (!mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: deaddropMapStyle,
      center: [center.lng, center.lat],
      zoom: 15.7,
      pitch: 38,
      bearing: -10,
      attributionControl: false,
      interactive: true,
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      const updateFallbackProjection = () => {
        setProjectedFootprints(createProjectedFootprints(footprints, (position) => projectFallbackPoint(center, position)));
      };

      updateFallbackProjection();
      window.addEventListener("resize", updateFallbackProjection);

      return () => window.removeEventListener("resize", updateFallbackProjection);
    }

    const updateProjection = () => {
      setProjectedFootprints(
        createProjectedFootprints(footprints, (position) => {
          const point = map.project([position.lng, position.lat]);
          return { x: point.x, y: point.y };
        }),
      );
    };

    updateProjection();
    map.on("load", updateProjection);
    map.on("move", updateProjection);
    map.on("zoom", updateProjection);
    map.on("resize", updateProjection);

    return () => {
      map.off("load", updateProjection);
      map.off("move", updateProjection);
      map.off("zoom", updateProjection);
      map.off("resize", updateProjection);
    };
  }, [footprints]);

  return (
    <main className="footprints-page">
      <div className="footprints-page__map" ref={mapContainer} />
      {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && <div className="footprints-page__fallback-map" />}
      <div className="footprints-page__points">
        <AnimatePresence>
          {typeFootprints.map((footprint) => {
            const emotion = emotionById[footprint.emotion];
            const visible = footprint.createdAt.getTime() <= visibleUntil;
            const strength = Math.min(1.6, 1 + (footprint.clusterSize - 1) * 0.24);
            const style: DotStyle = {
              "--dot-x": `${footprint.screen.x}px`,
              "--dot-y": `${footprint.screen.y}px`,
              "--dot-size": `${activeType === "placed" ? 12 + footprint.clusterSize * 2 : 9 + footprint.clusterSize}px`,
              "--dot-color": emotion.color,
              "--dot-glow": emotion.glowColor,
              "--dot-solid-opacity": Math.min(1, 0.72 * strength),
              "--dot-ring-opacity": Math.min(0.9, 0.56 * strength),
            };

            return (
              <motion.button
                className={`footprints-page__dot footprints-page__dot--${activeType}`}
                key={footprint.id}
                type="button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.8 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                onClick={() => visible && setActiveNote(footprint)}
                style={style}
              />
            );
          })}
        </AnimatePresence>
      </div>

      <div className="footprints-page__switch">
        <button
          className={activeType === "placed" ? "footprints-page__switch-item footprints-page__switch-item--active" : "footprints-page__switch-item"}
          type="button"
          onClick={() => setActiveType("placed")}
        >
          我放下的
        </button>
        <button
          className={activeType === "caught" ? "footprints-page__switch-item footprints-page__switch-item--active" : "footprints-page__switch-item"}
          type="button"
          onClick={() => setActiveType("caught")}
        >
          我接住的
        </button>
      </div>

      <div className="footprints-page__timeline">
        <div className="footprints-page__line">
          {sortedFootprints.map((footprint) => {
            const emotion = emotionById[footprint.emotion];
            const left = now && now !== firstTime ? ((footprint.createdAt.getTime() - firstTime) / (now - firstTime)) * 100 : 0;

            return (
              <span
                className="footprints-page__tick"
                key={footprint.id}
                style={{
                  left: `${left}%`,
                  backgroundColor: emotion.color,
                  opacity: footprint.type === activeType ? 0.95 : 0.22,
                }}
              />
            );
          })}
          <span className="footprints-page__thumb" style={{ left: `${timelineProgress}%` }} />
          <input
            className="footprints-page__range"
            type="range"
            min="0"
            max="100"
            value={timelineProgress}
            onChange={(event) => setTimelineProgress(Number(event.target.value))}
            aria-label="足迹时间"
          />
        </div>
      </div>

      <AnimatePresence>
        {activeNote && (
          <motion.div
            className="footprints-page__note-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            onClick={() => setActiveNote(null)}
          >
            <motion.div
              className="footprints-page__note"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              onClick={(event) => event.stopPropagation()}
            >
              <p className="footprints-page__note-place">
                {poeticTime(activeNote.createdAt)}，在{shortestPlace(activeNote.place)}
              </p>
              <PaperNote
                content={activeNote.content}
                emotion={activeNote.emotion}
                createdAt={activeNote.createdAt}
                readCount={activeNote.readCount}
                variant="open"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .footprints-page {
          position: relative;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: #0F0F1A;
        }

        .footprints-page__map,
        .footprints-page__fallback-map,
        .footprints-page__points {
          position: absolute;
          inset: 0;
        }

        .footprints-page__map,
        .footprints-page__fallback-map {
          z-index: 1;
        }

        .footprints-page__fallback-map {
          background:
            radial-gradient(circle at 55% 44%, rgba(245, 240, 232, 0.04), transparent 22%),
            linear-gradient(18deg, transparent 0 34%, rgba(245, 240, 232, 0.05) 34.2% 34.45%, transparent 34.7%),
            linear-gradient(74deg, transparent 0 59%, rgba(245, 240, 232, 0.035) 59.2% 59.45%, transparent 59.7%),
            linear-gradient(135deg, #0F0F1A 0%, #1A1A2E 50%, #16213E 100%);
        }

        .footprints-page__points {
          z-index: 2;
          pointer-events: none;
        }

        .footprints-page__dot {
          position: absolute;
          left: var(--dot-x);
          top: var(--dot-y);
          z-index: 2;
          width: 44px;
          height: 44px;
          transform: translate(-50%, -50%);
          pointer-events: auto;
        }

        .footprints-page__dot::before {
          content: "";
          position: absolute;
          left: 50%;
          top: 50%;
          width: var(--dot-size);
          height: var(--dot-size);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          animation: footprint-breathe 4.2s ease-in-out infinite;
        }

        .footprints-page__dot--placed::before {
          background: var(--dot-color);
          opacity: var(--dot-solid-opacity);
          filter: drop-shadow(0 0 12px var(--dot-glow)) drop-shadow(0 0 24px var(--dot-glow));
        }

        .footprints-page__dot--caught::before {
          border: 2px solid var(--dot-color);
          background: transparent;
          opacity: var(--dot-ring-opacity);
          filter: drop-shadow(0 0 8px var(--dot-glow));
        }

        .footprints-page__switch {
          position: absolute;
          z-index: 4;
          top: 28px;
          right: 28px;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
        }

        .footprints-page__switch-item {
          color: #F5F0E8;
          font-family: "Noto Serif SC", "Noto Serif", serif;
          font-size: 13px;
          line-height: 1.4;
          opacity: 0.3;
          transition: opacity 300ms ease-out;
        }

        .footprints-page__switch-item--active {
          opacity: 0.8;
        }

        .footprints-page__timeline {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 4;
          padding: 80px 48px 32px;
          background: linear-gradient(180deg, transparent 0%, rgba(15, 15, 26, 0.74) 58%, rgba(15, 15, 26, 0.94) 100%);
        }

        .footprints-page__line {
          position: relative;
          height: 36px;
          max-width: 760px;
          margin: 0 auto;
        }

        .footprints-page__line::before {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          height: 1px;
          background: rgba(245, 240, 232, 0.2);
          transform: translateY(-50%);
        }

        .footprints-page__tick {
          position: absolute;
          top: 50%;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          transition: opacity 300ms ease-out;
        }

        .footprints-page__thumb {
          position: absolute;
          top: 50%;
          z-index: 2;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #F5F0E8;
          filter: drop-shadow(0 0 10px rgba(245, 240, 232, 0.35));
          transform: translate(-50%, -50%);
          pointer-events: none;
        }

        .footprints-page__range {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 36px;
          opacity: 0;
          cursor: grab;
        }

        .footprints-page__note-overlay {
          position: absolute;
          inset: 0;
          z-index: 6;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px;
          background: rgba(15, 15, 26, 0.72);
        }

        .footprints-page__note {
          width: min(100%, 480px);
        }

        .footprints-page__note-place {
          margin: 0 0 18px;
          color: #F5F0E8;
          font-family: "Noto Serif SC", "Noto Serif", serif;
          font-size: 13px;
          line-height: 1.7;
          text-align: center;
          opacity: 0.4;
        }

        .mapboxgl-ctrl-logo,
        .mapboxgl-ctrl-attrib {
          display: none;
        }

        @keyframes footprint-breathe {
          0%,
          100% {
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.18);
          }
        }

        @media (max-width: 720px) {
          .footprints-page__timeline {
            padding-left: 28px;
            padding-right: 28px;
          }
        }
      `}</style>
    </main>
  );
}
