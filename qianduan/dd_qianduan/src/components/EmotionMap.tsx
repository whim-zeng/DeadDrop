"use client";

import { AnimatePresence, motion } from "framer-motion";
import mapboxgl, { type Map as MapboxMap } from "mapbox-gl";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { calculateAgingLevel } from "../lib/aging";
import { emotionById, type EmotionType } from "../lib/emotions";
import { deaddropMapStyle } from "../lib/mapStyle";
import BreathingDot, { type ScreenPosition } from "./BreathingDot";
import ProximityCircle from "./ProximityCircle";

export type GeoPosition = {
  lng: number;
  lat: number;
};

export type MapNote = {
  id: string;
  emotion: EmotionType;
  position: GeoPosition;
  createdAt: Date;
  readCount: number;
};

type EmotionMapProps = {
  userPosition: GeoPosition;
  notes: MapNote[];
};

type ProjectedNote = MapNote & {
  screen: ScreenPosition;
  distance: number;
};

const PROXIMITY_METERS = 50;
const EARTH_RADIUS_METERS = 6371000;
const FALLBACK_PIXELS_PER_METER = 4;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const distanceInMeters = (from: GeoPosition, to: GeoPosition) => {
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const originLat = toRadians(from.lat);
  const targetLat = toRadians(to.lat);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(originLat) * Math.cos(targetLat) * Math.sin(deltaLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

const projectFallbackPoint = (origin: GeoPosition, target: GeoPosition) => {
  const xMeters = (target.lng - origin.lng) * 111320 * Math.cos(toRadians(origin.lat));
  const yMeters = (target.lat - origin.lat) * -111320;

  return {
    x: window.innerWidth / 2 + xMeters * FALLBACK_PIXELS_PER_METER,
    y: window.innerHeight / 2 + yMeters * FALLBACK_PIXELS_PER_METER,
  };
};

export default function EmotionMap({ userPosition, notes }: EmotionMapProps) {
  const router = useRouter();
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const [userScreenPosition, setUserScreenPosition] = useState<ScreenPosition>({ x: 0, y: 0 });
  const [proximityRadius, setProximityRadius] = useState(180);
  const [projectedNotes, setProjectedNotes] = useState<ProjectedNote[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  const visibleNotes = useMemo(
    () => projectedNotes.filter((note) => note.distance <= PROXIMITY_METERS),
    [projectedNotes],
  );
  const activeNote = visibleNotes.find((note) => note.id === activeNoteId);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    if (!mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: deaddropMapStyle,
      center: [userPosition.lng, userPosition.lat],
      zoom: 16,
      pitch: 38,
      bearing: -12,
      attributionControl: false,
      interactive: true,
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [userPosition.lat, userPosition.lng]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      const updateFallbackProjection = () => {
        setUserScreenPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
        setProximityRadius(PROXIMITY_METERS * FALLBACK_PIXELS_PER_METER);
        setProjectedNotes(
          notes.map((note) => ({
            ...note,
            screen: projectFallbackPoint(userPosition, note.position),
            distance: distanceInMeters(userPosition, note.position),
          })),
        );
      };

      updateFallbackProjection();
      window.addEventListener("resize", updateFallbackProjection);

      return () => window.removeEventListener("resize", updateFallbackProjection);
    }

    const updateProjection = () => {
      const userPoint = map.project([userPosition.lng, userPosition.lat]);
      const radiusPoint = map.project([userPosition.lng, userPosition.lat + PROXIMITY_METERS / 111320]);
      const radius = Math.abs(radiusPoint.y - userPoint.y);

      setUserScreenPosition({ x: userPoint.x, y: userPoint.y });
      setProximityRadius(radius);
      setProjectedNotes(
        notes.map((note) => {
          const point = map.project([note.position.lng, note.position.lat]);

          return {
            ...note,
            screen: { x: point.x, y: point.y },
            distance: distanceInMeters(userPosition, note.position),
          };
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
  }, [notes, userPosition]);

  useEffect(() => {
    if (!activeNoteId) return;

    const timer = window.setTimeout(() => {
      setActiveNoteId(null);
    }, 8000);

    return () => window.clearTimeout(timer);
  }, [activeNoteId]);

  const pickNote = (note: ProjectedNote) => {
    if (activeNoteId === note.id) {
      router.push(`/note/${note.id}`);
      return;
    }

    setActiveNoteId(note.id);
  };

  return (
    <div className="emotion-map">
      <div className="emotion-map__canvas" ref={mapContainer} />
      {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && <div className="emotion-map__fallback-map" />}
      <div className="emotion-map__field">
        <ProximityCircle position={userScreenPosition} radius={proximityRadius} />
        {visibleNotes.map((note) => {
          const aging = calculateAgingLevel(note.createdAt, note.readCount);

          return (
            <BreathingDot
              key={note.id}
              emotion={note.emotion}
              position={note.screen}
              agingStage={aging.stage}
              active={activeNoteId === note.id}
              onClick={() => pickNote(note)}
            />
          );
        })}
        <AnimatePresence>
          {activeNote && (
            <motion.div
              className="emotion-map__hint"
              key={activeNote.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 0.8, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={{
                left: activeNote.screen.x,
                top: activeNote.screen.y - 34,
                color: emotionById[activeNote.emotion].color,
              }}
            >
              <span>{emotionById[activeNote.emotion].mapHint}</span>
              <button type="button" onClick={() => router.push(`/note/${activeNote.id}`)}>
                捡起
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <style>{`
        .emotion-map {
          position: relative;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: #0F0F1A;
        }

        .emotion-map__canvas,
        .emotion-map__fallback-map,
        .emotion-map__field {
          position: absolute;
          inset: 0;
        }

        .emotion-map__canvas,
        .emotion-map__fallback-map {
          z-index: 1;
        }

        .emotion-map__fallback-map {
          background:
            radial-gradient(circle at 45% 48%, rgba(245, 240, 232, 0.045), transparent 20%),
            linear-gradient(28deg, transparent 0 42%, rgba(245, 240, 232, 0.055) 42.2% 42.5%, transparent 42.7%),
            linear-gradient(112deg, transparent 0 54%, rgba(245, 240, 232, 0.04) 54.2% 54.5%, transparent 54.7%),
            linear-gradient(135deg, #0F0F1A 0%, #1A1A2E 50%, #16213E 100%);
        }

        .emotion-map__field {
          z-index: 2;
          pointer-events: none;
        }

        .emotion-map__field button {
          pointer-events: auto;
        }

        .emotion-map__hint {
          position: absolute;
          z-index: 5;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0;
          font-family: "Noto Serif SC", "Noto Serif", serif;
          font-size: 13px;
          line-height: 1.6;
          white-space: nowrap;
          transform: translate(-50%, -100%);
          text-shadow: 0 0 16px currentColor;
          pointer-events: auto;
        }

        .emotion-map__hint button {
          border: 1px solid currentColor;
          border-radius: 4px;
          padding: 6px 14px;
          background: rgba(15, 15, 26, 0.68);
          color: currentColor;
          font-size: 12px;
          backdrop-filter: blur(8px);
          transition: background-color 200ms ease-out, opacity 200ms ease-out;
        }

        .emotion-map__hint button:hover {
          background: rgba(15, 15, 26, 0.9);
        }

        .mapboxgl-ctrl-logo,
        .mapboxgl-ctrl-attrib {
          display: none;
        }
      `}</style>
    </div>
  );
}
