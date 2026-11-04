import { useState } from 'react';
import { useRealtime } from '../context/RealtimeContext';
import { fetchIncidents } from '../lib/api';
import {
  elapsedSince,
  severityLabel,
  severityTone,
  statusLabel,
  statusTone,
  timeAgo,
  typeLabel,
} from '../lib/format';
import { useAsyncData, useReloadInterval } from '../lib/useAsyncData';
import { IncidentDrawer } from '../components/IncidentDrawer';
import { IncidentMap } from '../components/IncidentMap';
import { Icon } from '../components/Icons';
import {
  Badge,
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  PageHeader,
  SectionCard,
} from '../components/ui';

export function LiveMapPage() {
  const { revision, connected } = useRealtime();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const state = useAsyncData(() => fetchIncidents({ active: true, limit: 100 }), [
    revision,
    tick,
  ]);
  const reload = () => setTick((value) => value + 1);
  useReloadInterval(reload, 20_000);

  const incidents = state.data?.incidents ?? [];
  const withLocation = incidents.filter((incident) => incident.location);
  const selected = incidents.find((incident) => incident.id === selectedId) ?? null;

  return (
    <>
      <PageHeader
        eyebrow="Monitor"
        title="Live map"
        description="Only the last position each device actually shared. Incidents without a GPS fix are listed but never placed on the map."
        actions={
          <>
            <span className={`live-chip ${connected ? 'is-online' : 'is-offline'}`}>
              <Icon name={connected ? 'wifi' : 'wifi-off'} size={15} />
              {connected ? 'Live' : 'Reconnecting'}
            </span>
            <button type="button" className="btn btn-secondary" onClick={reload}>
              <Icon name="refresh" size={16} /> Refresh
            </button>
          </>
        }
      />

      {state.error && !state.data ? (
        <ErrorBlock error={state.error} onRetry={state.reload} />
      ) : null}
      {!state.data && state.loading ? <LoadingBlock label="Loading map data…" /> : null}

      {state.data ? (
        <div className="map-layout">
          <SectionCard
            title="Active incidents"
            subtitle={`${withLocation.length} with a location fix · ${incidents.length} active`}
            className="map-list-card"
          >
            {incidents.length === 0 ? (
              <EmptyBlock
                icon="map"
                title="Nothing to map"
                message="There are no active incidents in your scope. The map will populate instantly when a new alert arrives."
              />
            ) : (
              <ul className="map-incident-list">
                {incidents.map((incident) => {
                  const isSelected = incident.id === selectedId;
                  return (
                    <li key={incident.id}>
                      <button
                        type="button"
                        className={`map-list-item ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => setSelectedId(incident.id)}
                      >
                        <span
                          className={`severity-dot tone-${severityTone(incident.severity)}`}
                          aria-hidden="true"
                        />
                        <span className="map-list-main">
                          <strong>{incident.owner?.fullName ?? 'Unknown owner'}</strong>
                          <span className="muted small">
                            {typeLabel(incident.type)} · {elapsedSince(incident.startedAt)}
                          </span>
                          <span className="map-list-badges">
                            <Badge tone={statusTone(incident.status)}>
                              {statusLabel(incident.status)}
                            </Badge>
                            {incident.location ? (
                              <span className="muted small">
                                {incident.location.capturedAt
                                  ? `fix ${timeAgo(incident.location.capturedAt)}`
                                  : 'fix time unknown'}
                              </span>
                            ) : (
                              <span className="warn-text small">no GPS fix</span>
                            )}
                          </span>
                        </span>
                        <Icon name="chevron-right" size={15} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          <div className="map-main">
            <SectionCard className="map-card">
              <IncidentMap
                incidents={incidents}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </SectionCard>

            {selected ? (
              <div className="map-selected">
                <div>
                  <p className="eyebrow">Selected incident</p>
                  <div className="map-selected-title">
                    <span className={`severity-dot tone-${severityTone(selected.severity)}`} />
                    <strong>{typeLabel(selected.type)}</strong>
                    <Badge tone={statusTone(selected.status)}>
                      {statusLabel(selected.status)}
                    </Badge>
                    <Badge tone={severityTone(selected.severity)}>
                      {severityLabel(selected.severity)}
                    </Badge>
                  </div>
                  <p className="muted small">
                    {selected.owner?.fullName ?? 'Unknown owner'} · started{' '}
                    {timeAgo(selected.startedAt)}
                    {selected.location?.accuracyMeters
                      ? ` · ±${Math.round(selected.location.accuracyMeters)} m accuracy`
                      : ''}
                    {selected.location?.capturedAt
                      ? ` · captured ${timeAgo(selected.location.capturedAt)}`
                      : ''}
                  </p>
                  {!selected.location ? (
                    <p className="warn-text small">
                      This incident has no location. Do not infer a position from other incidents.
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setDrawerId(selected.id)}
                >
                  Open incident
                </button>
              </div>
            ) : (
              <p className="muted small map-hint">
                Select an incident from the list or tap a map marker to see its details.
              </p>
            )}
          </div>
        </div>
      ) : null}

      <IncidentDrawer
        incidentId={drawerId}
        onClose={() => setDrawerId(null)}
        onChanged={reload}
      />
    </>
  );
}
