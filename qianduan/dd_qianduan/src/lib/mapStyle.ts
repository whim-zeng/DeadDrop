import type { StyleSpecification } from "mapbox-gl";

export const deaddropMapStyle: StyleSpecification = {
  version: 8,
  name: "DeadDrop Dark",
  glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
  sources: {
    composite: {
      type: "vector",
      url: "mapbox://mapbox.mapbox-streets-v8",
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#0F0F1A",
      },
    },
    {
      id: "water",
      type: "fill",
      source: "composite",
      "source-layer": "water",
      paint: {
        "fill-color": "#0A0A15",
      },
    },
    {
      id: "landuse-shadow",
      type: "fill",
      source: "composite",
      "source-layer": "landuse",
      paint: {
        "fill-color": "#111124",
        "fill-opacity": 0.18,
      },
    },
    {
      id: "building",
      type: "fill",
      source: "composite",
      "source-layer": "building",
      minzoom: 13,
      paint: {
        "fill-color": "#13132B",
        "fill-opacity": 0.72,
      },
    },
    {
      id: "road",
      type: "line",
      source: "composite",
      "source-layer": "road",
      filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary", "secondary", "tertiary", "street", "service"]]],
      paint: {
        "line-color": "rgba(245, 240, 232, 0.06)",
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.25, 15, 0.8, 18, 2],
      },
    },
    {
      id: "large-place-label",
      type: "symbol",
      source: "composite",
      "source-layer": "place_label",
      filter: ["in", ["get", "type"], ["literal", ["city", "town", "district"]]],
      layout: {
        "text-field": ["coalesce", ["get", "name_zh-Hans"], ["get", "name"]],
        "text-font": ["Noto Serif CJK SC Regular", "Arial Unicode MS Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 4, 12, 10, 16],
        "text-letter-spacing": 0.04,
      },
      paint: {
        "text-color": "rgba(245, 240, 232, 0.15)",
        "text-halo-color": "rgba(15, 15, 26, 0.35)",
        "text-halo-width": 1,
      },
    },
  ],
};
