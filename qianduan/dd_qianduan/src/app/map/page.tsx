"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import EmotionMap, { type GeoPosition, type MapNote } from "../../components/EmotionMap";
import { emotions } from "../../lib/emotions";

const fallbackPosition: GeoPosition = {
  lng: 121.4737,
  lat: 31.2304,
};

const createMockNotes = (center: GeoPosition, baseTime: number): MapNote[] => {
  const offsets = [
    { lng: 0.00012, lat: 0.00018 },
    { lng: -0.00018, lat: 0.0001 },
    { lng: 0.00024, lat: -0.00008 },
    { lng: -0.00008, lat: -0.00022 },
    { lng: 0.00003, lat: 0.00031 },
    { lng: -0.00027, lat: -0.00002 },
    { lng: 0.00032, lat: 0.00004 },
    { lng: -0.00015, lat: 0.00028 },
  ];

  return offsets.map((offset, index) => ({
    id: `nearby-${index + 1}`,
    emotion: emotions[index % emotions.length].id,
    position: {
      lng: center.lng + offset.lng,
      lat: center.lat + offset.lat,
    },
    createdAt: new Date(baseTime - (index + 1) * 3 * 60 * 60 * 1000),
    readCount: index % 4,
  }));
};

export default function MapPage() {
  const router = useRouter();
  const [userPosition, setUserPosition] = useState<GeoPosition>(fallbackPosition);
  const [baseTime, setBaseTime] = useState<number | null>(null);
  const notes = useMemo(() => (baseTime ? createMockNotes(userPosition, baseTime) : []), [baseTime, userPosition]);

  useEffect(() => {
    setBaseTime(Date.now());

    navigator.geolocation?.getCurrentPosition(
      (position) => {
        setUserPosition({
          lng: position.coords.longitude,
          lat: position.coords.latitude,
        });
      },
      undefined,
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 60000,
      },
    );
  }, []);

  return (
    <main className="map-page">
      <EmotionMap userPosition={userPosition} notes={notes} />
      <button className="map-page__drop" type="button" onClick={() => router.push("/drop")}>
        放下
      </button>
      <style>{`
        .map-page {
          position: relative;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: #0F0F1A;
        }

        .map-page__drop {
          position: absolute;
          right: 24px;
          bottom: 24px;
          z-index: 6;
          border: 1px solid rgba(245, 240, 232, 0.3);
          border-radius: 4px;
          padding: 12px 32px;
          background: rgba(15, 15, 26, 0.8);
          color: #F5F0E8;
          font-family: "Noto Serif SC", "Noto Serif", serif;
          font-size: 15px;
          letter-spacing: 0.12em;
          backdrop-filter: blur(8px);
          transition: border-color 300ms ease-out, background-color 300ms ease-out;
        }

        .map-page__drop:hover {
          border-color: rgba(245, 240, 232, 0.6);
          background: rgba(15, 15, 26, 0.92);
        }
      `}</style>
    </main>
  );
}
