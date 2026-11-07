import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { severityTone, statusLabel } from '../lib/format';
import type { Incident } from '../types';

function markerIcon(incident: Incident, selected: boolean): L.DivIcon {
  return L.divIcon({
    className: 'map-marker-host',
    html: `<span class="map-marker tone-${severityTone(incident.severity)}${
      selected ? ' is-selected' : ''
    }"></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  });
}

export function IncidentMap({
  incidents,
  selectedId,
  onSelect,
}: {
  incidents: Incident[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const fittedRef = useRef(false);
  const selectedRef = useRef(selectedId);
  const incidentsRef = useRef(incidents);
  selectedRef.current = selectedId;
  incidentsRef.current = incidents;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = L.map(container, {
      zoomControl: true,
      attributionControl: true,
      minZoom: 3,
    }).setView([22.5937, 78.9629], 4.6);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      subdomains: 'abcd',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // The first paint can report a zero-size container, so nudge Leaflet
    // once the layout settles. Both the observer and the timer must be
    // inert after unmount, otherwise Leaflet throws on a removed map pane.
    let disposed = false;
    const resize = new ResizeObserver(() => {
      if (!disposed) map.invalidateSize();
    });
    resize.observe(container);
    const resizeTimer = window.setTimeout(() => {
      if (!disposed) map.invalidateSize();
    }, 120);

    return () => {
      disposed = true;
      window.clearTimeout(resizeTimer);
      resize.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      fittedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    const points: [number, number][] = [];

    for (const incident of incidents) {
      if (!incident.location) continue;
      const { lat, lng, accuracyMeters } = incident.location;
      points.push([lat, lng]);

      if (accuracyMeters && accuracyMeters > 0) {
        L.circle([lat, lng], {
          radius: Math.min(accuracyMeters, 1000),
          color: '#5aa9ff',
          weight: 1,
          fillColor: '#5aa9ff',
          fillOpacity: 0.1,
          interactive: false,
        }).addTo(layer);
      }

      const marker = L.marker([lat, lng], {
        icon: markerIcon(incident, incident.id === selectedRef.current),
        title: `${incident.owner?.fullName ?? 'Incident'} — ${statusLabel(incident.status)}`,
        alt: `Incident marker for ${incident.owner?.fullName ?? 'unknown person'}`,
        keyboard: true,
      }).addTo(layer);

      marker.bindTooltip(
        `<strong>${incident.owner?.fullName ?? 'Unknown owner'}</strong><br/>${statusLabel(
          incident.status,
        )} · ${incident.severity}`,
        { direction: 'top', offset: [0, -10] },
      );
      marker.on('click', () => onSelect(incident.id));
    }

    if (points.length > 0 && !fittedRef.current) {
      map.fitBounds(L.latLngBounds(points).pad(0.25), { maxZoom: 14 });
      fittedRef.current = true;
    }
  }, [incidents, selectedId, onSelect]);

  const selectedIncident = incidents.find((incident) => incident.id === selectedId);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const location = selectedIncident?.location;
    if (location) {
      map.flyTo([location.lat, location.lng], Math.max(map.getZoom(), 14), {
        duration: 0.6,
      });
    }
  }, [selectedIncident]);

  return (
    <div className="map-canvas-wrap">
      <div ref={containerRef} className="map-canvas" aria-label="Live incident map" />
      <div className="map-overlay-controls">
        <button
          type="button"
          className="btn btn-secondary btn-small"
          onClick={() => {
            const map = mapRef.current;
            const points = incidentsRef.current
              .filter((incident) => incident.location)
              .map((incident) => [
                incident.location!.lat,
                incident.location!.lng,
              ] as [number, number]);
            if (!map || points.length === 0) return;
            map.fitBounds(L.latLngBounds(points).pad(0.25), { maxZoom: 14 });
          }}
        >
          Fit all
        </button>
        <span className="map-attribution-note">Tiles © OpenStreetMap</span>
      </div>
    </div>
  );
}
