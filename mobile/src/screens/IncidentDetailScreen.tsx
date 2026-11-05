import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Badge,
  Button,
  Card,
  Divider,
  ErrorBanner,
  Field,
  KeyValue,
  PageHeader,
  Screen,
  SeverityBadge,
  StatusBadge,
} from '../components/ui';
import { useOutbox } from '../context/OutboxContext';
import {
  ApiRequestError,
  addIncidentNote,
  appendLocations,
  fetchIncidentDetail,
  updateIncidentStatus,
} from '../lib/api';
import { createClientId } from '../lib/device';
import {
  formatDateTime,
  formatDelay,
  isActiveStatus,
  statusLabel,
  typeLabel,
} from '../lib/format';
import { confirmAction } from '../lib/confirm';
import { captureLocation } from '../lib/location';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import type {
  IncidentDetailResponse,
  IncidentStatus,
  LocationPoint,
  NotificationRecord,
} from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'IncidentDetail'>;

export function IncidentDetailScreen({ navigation, route }: Props) {
  const { clientIncidentId, incidentId } = route.params;
  const { records, pending, queueLocation, queueStatus, cancelLocal, retry, syncNow, syncing } =
    useOutbox();
  const record = clientIncidentId
    ? records.find((item) => item.clientIncidentId === clientIncidentId)
    : undefined;
  const serverId = record?.serverId ?? incidentId;
  const [detail, setDetail] = useState<IncidentDetailResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(serverId));
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    if (!serverId) {
      setLoading(false);
      return;
    }
    try {
      const response = await fetchIncidentDetail(serverId);
      setDetail(response);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiRequestError && err.code === 'NETWORK_ERROR'
          ? 'Cannot reach the server. Showing what is saved on this device.'
          : err instanceof Error
            ? err.message
            : 'Could not load this incident.',
      );
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const incident = detail?.incident;
  const relation = detail?.viewerRelation;
  const isOwner = relation ? relation === 'OWNER' : Boolean(record);
  const closed = incident
    ? incident.status === 'RESOLVED' || incident.status === 'CANCELLED'
    : record?.syncState === 'CANCELLED_LOCAL';
  const active = incident ? isActiveStatus(incident.status) : record?.syncState === 'PENDING_SYNC';

  async function runStatus(status: IncidentStatus) {
    if (!serverId) return;
    setActionBusy(status);
    setActionError(null);
    setActionMessage(null);
    try {
      await updateIncidentStatus(serverId, status);
      setActionMessage(`Incident marked ${statusLabel(status).toLowerCase()}.`);
      await load();
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'NETWORK_ERROR') {
        queueStatus(serverId, status);
        setActionMessage(
          'Saved offline. This status update will be sent when the connection returns.',
        );
      } else {
        setActionError(err instanceof Error ? err.message : 'Could not update the incident');
      }
    } finally {
      setActionBusy(null);
    }
  }

  async function cancelAlert() {
    const confirmed = await confirmAction(
      'Cancel this alert?',
      isOwner
        ? 'Your trusted contacts may already have been notified. The incident will be closed as cancelled.'
        : 'Only the owner or an administrator can cancel an incident.',
      'Cancel alert',
    );
    if (!confirmed) return;
    await runStatus('CANCELLED');
  }

  async function submitNote() {
    if (!serverId || note.trim().length === 0) return;
    setActionBusy('note');
    setActionError(null);
    setActionMessage(null);
    try {
      await addIncidentNote(serverId, note.trim());
      setNote('');
      setActionMessage('Note added.');
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not add the note');
    } finally {
      setActionBusy(null);
    }
  }

  async function shareLocation() {
    if (!serverId) return;
    setActionBusy('location');
    setActionError(null);
    setActionMessage(null);
    const location = await captureLocation();
    if (!location) {
      setActionBusy(null);
      setActionMessage('Location unavailable. Check permission and location services.');
      return;
    }
    const clientLocationId = createClientId();
    try {
      const response = await appendLocations(serverId, [{ ...location, clientLocationId }]);
      setActionMessage(
        response.accepted > 0
          ? 'Current location sent to the incident timeline.'
          : 'This location was already recorded.',
      );
      await load();
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'NETWORK_ERROR') {
        queueLocation(serverId, { ...location, clientLocationId });
        setActionMessage('Location saved offline. It will be attached when the connection returns.');
      } else {
        setActionError(err instanceof Error ? err.message : 'Could not send location');
      }
    } finally {
      setActionBusy(null);
    }
  }

  async function cancelLocalAlert() {
    if (!record) return;
    const confirmed = await confirmAction(
      'Cancel this local alert?',
      'It has not reached the server yet, so no trusted contact will be alerted.',
      'Cancel alert',
    );
    if (!confirmed) return;
    cancelLocal(record.clientIncidentId);
    setActionMessage('Cancelled on this device before sending. Nobody was alerted.');
    navigation.goBack();
  }

  if (!serverId && !record) {
    return (
      <Screen
        header={<PageHeader title="Incident detail" onBack={() => navigation.goBack()} />}
      >
        <Card>
          <Text style={styles.emptyTitle}>Incident not found on this device</Text>
          <Text style={styles.emptyBody}>
            It may belong to another account or may not have been synced yet.
          </Text>
        </Card>
      </Screen>
    );
  }

  const localOnly = !serverId && Boolean(record);
  const description = incident?.description ?? record?.payload.description ?? '';
  const type = incident?.type ?? record?.payload.type ?? 'SOS';
  const severity = incident?.severity ?? record?.payload.severity ?? 'CRITICAL';
  const startedAt = incident?.startedAt ?? record?.payload.startedAt ?? record?.createdAt;

  return (
    <Screen
      header={
        <PageHeader
          title="Incident detail"
          subtitle={localOnly ? 'Saved on this device' : 'Live from the server'}
          onBack={() => navigation.goBack()}
        />
      }
      contentStyle={styles.content}
    >
      {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}
      {actionError ? <ErrorBanner message={actionError} /> : null}
      {actionMessage ? (
        <Card tone="info" style={styles.messageCard}>
          <Ionicons name="information-circle-outline" size={20} color={colors.blue} />
          <Text style={styles.messageText}>{actionMessage}</Text>
        </Card>
      ) : null}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={colors.green} />
          <Text style={styles.loadingText}>Loading incident…</Text>
        </View>
      ) : null}

      <Card style={styles.summaryCard}>
        <View style={styles.badges}>
          <StatusBadge status={incident?.status ?? record?.syncState ?? 'PENDING_SYNC'} />
          <SeverityBadge severity={severity} />
          {localOnly ? <Badge label="Local only" tone="amber" dot /> : null}
        </View>
        <Text style={styles.title}>{typeLabel(type)}</Text>
        <Text style={styles.startedAt}>
          Started {startedAt ? formatDateTime(startedAt) : 'unknown'}
        </Text>
        <Text style={styles.description}>{description || 'No description was added.'}</Text>
        {incident?.owner ? (
          <View style={styles.ownerRow}>
            <Ionicons name="person-circle-outline" size={18} color={colors.muted} />
            <Text style={styles.ownerText}>
              {incident.owner.fullName}
              {incident.owner.phoneMasked ? ` · ${incident.owner.phoneMasked}` : ''}
            </Text>
          </View>
        ) : null}
      </Card>

      {localOnly && record ? (
        <Card tone={record.syncState === 'SYNC_FAILED' ? 'danger' : 'warning'} style={styles.stack}>
          <Text style={styles.cardTitle}>
            {record.syncState === 'SYNC_FAILED' ? 'This alert was not accepted' : 'Waiting to send'}
          </Text>
          <Text style={styles.cardBody}>
            {record.syncState === 'SYNC_FAILED'
              ? record.error ?? 'The server rejected this alert. You can retry it.'
              : 'It is saved safely on this phone with its original device time. It will send automatically when the server is reachable.'}
          </Text>
          <KeyValue label="Saved at" value={formatDateTime(record.createdAt)} />
          <KeyValue
            label="Offline created"
            value={record.payload.offlineCreated ? 'Yes — original time kept' : 'No'}
          />
          {record.error && record.syncState !== 'SYNC_FAILED' ? (
            <Text style={styles.inlineError}>{record.error}</Text>
          ) : null}
          <View style={styles.actionRow}>
            <Button
              label={syncing ? 'Syncing…' : 'Retry now'}
              onPress={() => {
                if (record.syncState === 'SYNC_FAILED') retry(record.clientIncidentId);
                else void syncNow();
              }}
              variant="secondary"
              size="md"
              icon="refresh"
              fullWidth={false}
              style={styles.flexButton}
              loading={syncing}
            />
            <Button
              label="Cancel alert"
              onPress={() => void cancelLocalAlert()}
              variant="danger"
              size="md"
              icon="close-circle-outline"
              fullWidth={false}
              style={styles.flexButton}
            />
          </View>
          <Text style={styles.hint}>
            Cancelling before sync means nobody is alerted. Every queued item is visible in Alerts.
            {pending > 1 ? ` ${pending} items are currently queued.` : ''}
          </Text>
        </Card>
      ) : null}

      {incident?.offlineCreated ? (
        <Card tone="warning" style={styles.stack}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Offline honesty</Text>
            <Badge label={formatDelay(incident.offlineDelaySeconds)} tone="amber" />
          </View>
          <Text style={styles.cardBody}>
            This alert was created without a working connection. The server received it later, but
            the original device time and the delay are kept.
          </Text>
          <KeyValue label="Device time" value={formatDateTime(incident.clientCreatedAt)} />
          <KeyValue label="Server received" value={formatDateTime(incident.receivedAt)} />
        </Card>
      ) : null}

      {incident ? (
        <Card style={styles.stack}>
          <Text style={styles.cardTitle}>Where</Text>
          {detail?.locations.length ? (
            <>
              <LocationBlock location={detail.locations[0]} />
              <Button
                label="Open in maps"
                onPress={() =>
                  void Linking.openURL(
                    `https://www.google.com/maps/search/?api=1&query=${detail.locations[0].lat},${detail.locations[0].lng}`,
                  )
                }
                variant="secondary"
                icon="map-outline"
              />
              {detail.locations.length > 1 ? (
                <Text style={styles.hint}>
                  {detail.locations.length} location points recorded. Latest shown first.
                </Text>
              ) : null}
            </>
          ) : incident.location ? (
            <>
              <KeyValue
                label="Coordinates"
                value={`${incident.location.lat.toFixed(4)}, ${incident.location.lng.toFixed(4)}`}
              />
              <KeyValue label="Captured" value={formatDateTime(incident.location.capturedAt)} />
            </>
          ) : (
            <Text style={styles.cardBody}>
              No location was captured. The alert still worked; ask the person to share their
              location if it is safe.
            </Text>
          )}
          {isOwner && active && serverId ? (
            <Button
              label="Share current location"
              onPress={() => void shareLocation()}
              loading={actionBusy === 'location'}
              variant="secondary"
              icon="navigate-outline"
            />
          ) : null}
        </Card>
      ) : null}

      {incident ? (
        <Card style={styles.stack}>
          <Text style={styles.cardTitle}>Notification truth</Text>
          <NotificationSummary
            summary={detail?.notificationSummary ?? null}
            notifications={detail?.notifications ?? []}
          />
        </Card>
      ) : null}

      {incident ? (
        <Card style={styles.stack}>
          <Text style={styles.cardTitle}>Status timeline</Text>
          {incident.statusHistory.length === 0 ? (
            <Text style={styles.cardBody}>No status history recorded yet.</Text>
          ) : (
            <View style={styles.timeline}>
              {[...incident.statusHistory]
                .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
                .map((entry, index, all) => (
                  <View key={`${entry.status}-${entry.at}-${index}`} style={styles.timelineRow}>
                    <View style={styles.timelineRail}>
                      <View
                        style={[
                          styles.timelineDot,
                          entry.status === 'RESOLVED' && styles.timelineDotResolved,
                          entry.status === 'CANCELLED' && styles.timelineDotCancelled,
                        ]}
                      />
                      {index < all.length - 1 ? <View style={styles.timelineLine} /> : null}
                    </View>
                    <View style={styles.timelineBody}>
                      <Text style={styles.timelineTitle}>
                        {statusLabel(entry.status)} · {formatDateTime(entry.at)}
                      </Text>
                      <Text style={styles.timelineMeta}>
                        {entry.byRole ? `By ${entry.byRole.toLowerCase()}` : 'System'}
                        {entry.note ? ` — ${entry.note}` : ''}
                      </Text>
                    </View>
                  </View>
                ))}
            </View>
          )}
        </Card>
      ) : null}

      {incident && !closed ? (
        <Card style={styles.stack}>
          <Text style={styles.cardTitle}>Responder note</Text>
          <Field
            label="Add a note"
            value={note}
            onChangeText={setNote}
            placeholder="What did you check or do? (visible to responders)"
            multiline
            maxLength={1000}
          />
          <Button
            label="Post note"
            onPress={() => void submitNote()}
            loading={actionBusy === 'note'}
            disabled={note.trim().length === 0}
            variant="secondary"
            icon="chatbox-ellipses-outline"
          />
        </Card>
      ) : null}

      {incident?.notes.length ? (
        <Card style={styles.stack}>
          <Text style={styles.cardTitle}>Notes</Text>
          {[...incident.notes].reverse().map((entry, index) => (
            <View key={`${entry.at}-${index}`} style={styles.note}>
              <Text style={styles.noteBody}>{entry.body}</Text>
              <Text style={styles.noteMeta}>
                {entry.byRole || 'Responder'} · {formatDateTime(entry.at)}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}

      {incident && !closed ? (
        <Card style={styles.stack}>
          <Text style={styles.cardTitle}>
            {isOwner ? 'Owner actions' : 'Responder actions'}
          </Text>
          <Text style={styles.cardBody}>
            {isOwner
              ? 'You can cancel your own alert. Acknowledging and resolving are done by a guardian or administrator.'
              : 'You cannot cancel someone else’s alert. Acknowledge it, respond, then resolve when safe.'}
          </Text>
          <View style={styles.actionList}>
            {!isOwner ? (
              <>
                {['ALERTING', 'NOTIFIED', 'DELIVERY_FAILED', 'ESCALATED'].includes(
                  incident.status,
                ) ? (
                  <Button
                    label="Acknowledge alert"
                    onPress={() => void runStatus('ACKNOWLEDGED')}
                    loading={actionBusy === 'ACKNOWLEDGED'}
                    variant="secondary"
                    icon="checkmark-circle-outline"
                  />
                ) : null}
                {incident.status === 'ACKNOWLEDGED' ? (
                  <Button
                    label="I am responding"
                    onPress={() => void runStatus('RESPONDING')}
                    loading={actionBusy === 'RESPONDING'}
                    variant="secondary"
                    icon="walk-outline"
                  />
                ) : null}
                <Button
                  label="Mark resolved"
                  onPress={() => void runStatus('RESOLVED')}
                  loading={actionBusy === 'RESOLVED'}
                  icon="shield-checkmark-outline"
                />
              </>
            ) : (
              <Button
                label="Cancel alert"
                onPress={() => void cancelAlert()}
                loading={actionBusy === 'CANCELLED'}
                variant="danger"
                icon="close-circle-outline"
              />
            )}
          </View>
          <Text style={styles.hint}>
            Offline status changes are queued and sent later. If the incident closes before they
            sync, the server rejects them and the app reports that honestly.
          </Text>
        </Card>
      ) : null}

      <Text style={styles.footer}>
        Delivery is only confirmed by a provider webhook. “Delivered” is never invented.
      </Text>
    </Screen>
  );
}

function LocationBlock({ location }: { location: LocationPoint }) {
  return (
    <View style={styles.locationBlock}>
      <View style={styles.locationIcon}>
        <Ionicons name="location" size={20} color={colors.greenDark} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.locationCoords}>
          {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
        </Text>
        <Text style={styles.locationMeta}>
          {formatDateTime(location.capturedAt)}
          {location.accuracyMeters != null ? ` · ±${Math.round(location.accuracyMeters)} m` : ''}
        </Text>
        <View style={styles.locationBadges}>
          <Badge label={location.source} tone="slate" />
          {location.isStale ? <Badge label="Stale capture" tone="amber" /> : null}
          {location.offlineCaptured ? <Badge label="Offline" tone="amber" /> : null}
        </View>
      </View>
    </View>
  );
}

function NotificationSummary({
  summary,
  notifications,
}: {
  summary: IncidentDetailResponse['notificationSummary'] | null;
  notifications: NotificationRecord[];
}) {
  if (!summary || summary.total === 0) {
    return (
      <Text style={styles.cardBody}>
        No notifications were queued. Add and verify a trusted contact so the next alert reaches
        someone.
      </Text>
    );
  }

  const simulated = notifications.some((item) => item.simulated) || summary.simulated > 0;

  return (
    <View style={styles.stack}>
      <View style={styles.metricGrid}>
        <Metric label="Total" value={summary.total} />
        <Metric label="Queued" value={summary.queued} />
        <Metric label="Sent" value={summary.sent} />
        <Metric label="Delivered" value={summary.delivered} />
        <Metric label="Failed" value={summary.failed} />
      </View>
      {simulated ? (
        <Card tone="warning" style={styles.simulatedCard}>
          <Ionicons name="flask-outline" size={18} color={colors.amber} />
          <Text style={styles.simulatedText}>
            {summary.simulated} notification{summary.simulated === 1 ? '' : 's'} simulated in
            console mode. No SMS, WhatsApp or push provider is configured, so these are not real
            deliveries.
          </Text>
        </Card>
      ) : (
        <Text style={styles.cardBody}>
          {summary.delivered > 0
            ? `${summary.delivered} delivery confirmation${summary.delivered === 1 ? '' : 's'} received from the provider.`
            : 'No delivery confirmations yet. “Sent” only means the provider accepted the message.'}
        </Text>
      )}
      {notifications.length > 0 ? (
        <View style={styles.deliveryList}>
          {notifications.slice(0, 6).map((item) => (
            <View key={item.id} style={styles.deliveryRow}>
              <View style={styles.flex}>
                <Text style={styles.deliveryChannel}>
                  {item.channel} · {item.destinationMasked}
                </Text>
                <Text style={styles.deliveryMeta}>
                  {item.provider || 'no provider'}
                  {item.simulated ? ' · simulated' : ''}
                  {item.lastError ? ` · ${item.lastError}` : ''}
                </Text>
              </View>
              <Badge
                label={item.status}
                tone={
                  item.status === 'DELIVERED'
                    ? 'green'
                    : item.status === 'FAILED'
                      ? 'red'
                      : item.status === 'SENT'
                        ? 'blue'
                        : 'amber'
                }
              />
            </View>
          ))}
        </View>
      ) : null}
      <Divider />
      <Text style={styles.hint}>
        A delivery timestamp only exists when a provider webhook is verified with an HMAC signature.
      </Text>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingTop: spacing.sm },
  flex: { flex: 1 },
  stack: { gap: spacing.sm },
  messageCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  messageText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.inkSoft },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  loadingText: { fontSize: 13, color: colors.muted },
  summaryCard: { gap: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  title: { fontSize: 23, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 },
  startedAt: { fontSize: 13, color: colors.muted },
  description: { fontSize: 14.5, lineHeight: 22, color: colors.inkSoft, marginTop: spacing.xs },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  ownerText: { fontSize: 12.5, color: colors.muted },
  cardTitle: { fontSize: 15.5, fontWeight: '700', color: colors.ink },
  cardBody: { fontSize: 13.5, lineHeight: 20, color: colors.inkSoft },
  hint: { fontSize: 11.5, lineHeight: 17, color: colors.muted },
  inlineError: { fontSize: 12, color: colors.redDark, lineHeight: 17 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  actionList: { gap: spacing.sm, marginTop: spacing.xs },
  flexButton: { flex: 1 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  emptyBody: { fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 4 },

  locationBlock: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  locationIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCoords: { fontSize: 15, fontWeight: '700', color: colors.ink },
  locationMeta: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  locationBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },

  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: {
    flexGrow: 1,
    minWidth: 56,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  metricValue: { fontSize: 20, fontWeight: '800', color: colors.ink },
  metricLabel: { fontSize: 10.5, fontWeight: '600', color: colors.muted, marginTop: 1 },
  simulatedCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  simulatedText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: colors.inkSoft },
  deliveryList: { gap: spacing.sm, marginTop: spacing.xs },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  deliveryChannel: { fontSize: 12.5, fontWeight: '700', color: colors.ink },
  deliveryMeta: { fontSize: 11, color: colors.muted, marginTop: 1 },

  timeline: { gap: 0, marginTop: spacing.xs },
  timelineRow: { flexDirection: 'row', gap: spacing.md },
  timelineRail: { width: 14, alignItems: 'center' },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.amber,
    marginTop: 5,
  },
  timelineDotResolved: { backgroundColor: colors.green },
  timelineDotCancelled: { backgroundColor: colors.muted },
  timelineLine: { width: 2, flex: 1, backgroundColor: colors.border, minHeight: 22 },
  timelineBody: { flex: 1, paddingBottom: spacing.md },
  timelineTitle: { fontSize: 13, fontWeight: '700', color: colors.ink },
  timelineMeta: { fontSize: 11.5, color: colors.muted, marginTop: 2, lineHeight: 16 },

  note: {
    borderLeftWidth: 3,
    borderLeftColor: colors.borderStrong,
    paddingLeft: spacing.md,
    paddingVertical: 4,
    marginBottom: spacing.sm,
  },
  noteBody: { fontSize: 13.5, lineHeight: 20, color: colors.inkSoft },
  noteMeta: { fontSize: 11, color: colors.muted, marginTop: 3 },

  footer: {
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.muted,
    textAlign: 'center',
  },
});
