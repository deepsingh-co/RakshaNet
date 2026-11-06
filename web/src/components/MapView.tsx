import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import type { LatLngExpression } from "leaflet";

// Fix default marker icons in leaflet bundled with Vite
const userIcon = L.divIcon({
  className: "",
  html: `<div style="position:relative;width:28px;height:28px;">
    <div style="position:absolute;inset:0;border-radius:999px;background:rgba(255,61,127,0.25);animation:pulseRing 2s ease-out infinite;color:#ff3d7f;"></div>
    <div style="position:absolute;inset:4px;border-radius:999px;background:linear-gradient(135deg,#ff3d7f,#ff7aa8);box-shadow:0 0 20px rgba(255,61,127,0.8);"></div>
    <div style="position:absolute;inset:10px;border-radius:999px;background:#fff;"></div>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const alertIcon = (color: string) => L.divIcon({
  className: "",
  html: `<div style="position:relative;width:22px;height:22px;">
    <div style="position:absolute;inset:0;border-radius:999px;background:${color}44;animation:pulseRing 2.4s ease-out infinite;color:${color};"></div>
    <div style="position:absolute;inset:4px;border-radius:999px;background:${color};box-shadow:0 0 14px ${color};"></div>
  </div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

interface MarkerPoint {
  position: [number, number];
  label: string;
  kind: "user" | "alert" | "police" | "hospital" | "shelter" | "report";
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  meta?: string;
}

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
}

export default function MapView({
  center,
  zoom = 13,
  markers = [],
  path,
  dangerZones = [],
  height = 520,
}: {
  center: [number, number];
  zoom?: number;
  markers?: MarkerPoint[];
  path?: [number, number][];
  dangerZones?: { center: [number, number]; radius: number; color: string; label: string }[];
  height?: number;
}) {
  const colorFor = (s?: string) =>
    s === "CRITICAL" ? "#ff3d7f" : s === "HIGH" ? "#ff8a3d" : s === "MEDIUM" ? "#ffb020" : "#38e8ff";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10" style={{ height }}>
      <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }} zoomControl={true}>
        <TileLayer
          attribution='&copy; Google Maps'
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
        />
        <Recenter center={center} />

        {dangerZones.map((z, i) => (
          <Circle
            key={i}
            center={z.center as LatLngExpression}
            radius={z.radius}
            pathOptions={{ color: z.color, fillColor: z.color, fillOpacity: 0.18, weight: 1 }}
          >
            <Popup>{z.label}</Popup>
          </Circle>
        ))}

        {path && path.length > 1 && (
          <>
            <Polyline
              positions={path as LatLngExpression[]}
              pathOptions={{ color: "#38e8ff", weight: 5, opacity: 0.9, dashArray: "0" }}
            />
            <Polyline
              positions={path as LatLngExpression[]}
              pathOptions={{ color: "#ffffff", weight: 1.5, opacity: 0.6, dashArray: "6 8" }}
            />
          </>
        )}

        {markers.map((m, i) => (
          <Marker
            key={i}
            position={m.position}
            icon={
              m.kind === "user"
                ? userIcon
                : alertIcon(
                    m.kind === "police" ? "#3b82f6"
                    : m.kind === "hospital" ? "#2ee6a6"
                    : m.kind === "shelter" ? "#a78bfa"
                    : colorFor(m.severity)
                  )
            }
          >
            <Popup>
              <div className="text-xs">
                <div className="font-semibold mb-0.5">{m.label}</div>
                {m.meta && <div className="text-slate-400">{m.meta}</div>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Scan overlay */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <div className="scan-line" />
      </div>
    </div>
  );
}
