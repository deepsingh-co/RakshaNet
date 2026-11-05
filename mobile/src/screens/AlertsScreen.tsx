import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SyncBanner } from '../components/SyncBanner';
import {
  Badge,
  Card,
  Chip,
  EmptyState,
  ErrorBanner,
  Screen,
  SectionHeader,
  StatusBadge,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useOutbox } from '../context/OutboxContext';
import { ApiRequestError, fetchIncidents } from '../lib/api';
import {
  elapsedSince,
  formatDelay,
  isActiveStatus,
  syncStateLabel,
  timeAgo,
  typeLabel,
} from '../lib/format';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import type { Incident } from '../types';

type Navigation = NativeStackNavigationProp<RootStackParamList>;
type Filter = 'active' | 'all';

function messageFor(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.code === 'NETWORK_ERROR'
      ? 'No internet connection. Server alerts cannot be refreshed right now.'
      : error.message;
  }
  return 'Could not load alerts.';
}

export function AlertsScreen() {
  const navigation = useNavigation<Navigation>();
  const { offlineSession } = useAuth();
  const { records, pending, syncing, syncNow, retry, lastError } = useOutbox();
  const [filter, setFilter] = useState<Filter>('active');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previousPending = useRef(pending);

  const load = useCallback(async () => {
    try {
      const response = await fetchIncidents({
        ...(filter === 'active' ? { active: true } : {}),
        limit: 50,
      });
      setIncidents(response.incidents);
      setError(null);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // When the last queued alert is accepted, refresh so the server copy replaces
  // the local "waiting to sync" card.
  useEffect(() => {
    if (previousPending.current > 0 && pending === 0) {
      void load();
    }
    previousPending.current = pending;
  }, [pending, load]);

  const localUnsynced = records.filter(
    (record) => record.syncState !== 'SYNCED' && record.syncState !== 'CANCELLED_LOCAL',
  );

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.headingRow}>
        <View style={styles.flex}>
          <Text style={styles.title}>Alerts</Text>
          <Text style={styles.subtitle}>
            Real delivery status only. Simulated notifications are labelled.
          </Text>
        </View>
        <Pressable
          onPress={() => void load()}
          accessibilityRole="button"
          accessibilityLabel="Refresh alerts"
          style={({ pressed }) => [styles.refresh, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="refresh" size={20} color={colors.greenDark} />
        </Pressable>
      </View>

      <SyncBanner />

      <View style={styles.filters}>
        <Chip label="Active" selected={filter === 'active'} onPress={() => setFilter('active')} />
        <Chip label="All alerts" selected={filter === 'all'} onPress={() => setFilter('all')} />
        <View style={styles.flex} />
        {syncing ? (
          <View style={styles.syncingPill}>
            <ActivityIndicator size="small" color={colors.greenDark} />
            <Text style={styles.syncingText}>Syncing</Text>
          </View>
        ) : pending > 0 ? (
          <Badge label={`${pending} queued`} tone="amber" dot />
        ) : null}
      </View>

      {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}
      {lastError && pending > 0 ? (
        <ErrorBanner message={lastError} onRetry={() => void syncNow()} retryLabel="Retry sync" />
      ) : null}

      {localUnsynced.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            title="On this device"
            caption="Saved locally. Nothing is lost while the queue waits."
          />
          <View style={styles.list}>
            {localUnsynced.map((record) => (
              <Card
                key={record.clientIncidentId}
                tone={record.syncState === 'SYNC_FAILED' ? 'danger' : 'warning'}
                style={styles.localCard}
              >
                <Pressable
                  onPress={() =>
                    navigation.navigate('IncidentDetail', {
                      clientIncidentId: record.clientIncidentId,
                    })
                  }
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.localPress, pressed && { opacity: 0.8 }]}
                >
                  <View style={styles.localTop}>
                    <View style={styles.localIcon}>
                      <Ionicons name="phone-portrait-outline" size={20} color={colors.amber} />
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.localTitle}>{typeLabel(record.payload.type)}</Text>
                      <Text style={styles.localCaption}>
                        {timeAgo(record.createdAt)} · {syncStateLabel(record.syncState)}
                      </Text>
                    </View>
                    <Badge
                      label={record.syncState === 'SYNC_FAILED' ? 'Needs retry' : 'Queued'}
                      tone={record.syncState === 'SYNC_FAILED' ? 'red' : 'amber'}
                    />
                  </View>
                  <Text style={styles.localBody} numberOfLines={2}>
                    {record.payload.description}
                  </Text>
                  {record.error ? (
                    <Text style={styles.localError}>{record.error}</Text>
                  ) : null}
                </Pressable>
                {record.syncState === 'SYNC_FAILED' ? (
                  <Pressable
                    onPress={() => retry(record.clientIncidentId)}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.7 }]}
                  >
                    <Ionicons name="refresh" size={16} color={colors.redDark} />
                    <Text style={styles.retryText}>Retry this alert</Text>
                  </Pressable>
                ) : null}
              </Card>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHeader
          title={filter === 'active' ? 'Active incidents' : 'All incidents'}
          caption={
            loading && incidents.length === 0
              ? 'Loading…'
              : `${incidents.length} incident${incidents.length === 1 ? '' : 's'} from the server`
          }
        />
        {loading && incidents.length === 0 ? (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color={colors.green} />
            <Text style={styles.loadingText}>Loading alerts…</Text>
          </View>
        ) : incidents.length === 0 ? (
          <Card>
            <EmptyState
              icon="shield-checkmark-outline"
              title={filter === 'active' ? 'No active alerts' : 'No alerts yet'}
              message={
                filter === 'active'
                  ? 'This is the calm state. Use the SOS button on Home if you ever need help.'
                  : 'Your incident history will appear here with honest delivery status.'
              }
              action={
                filter === 'active' ? undefined : (
                  <Pressable
                    onPress={() => void load()}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.emptyAction, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={styles.emptyActionText}>Refresh</Text>
                  </Pressable>
                )
              }
            />
          </Card>
        ) : (
          <View style={styles.list}>
            {incidents.map((incident) => (
              <Pressable
                key={incident.id}
                onPress={() =>
                  navigation.navigate('IncidentDetail', { incidentId: incident.id })
                }
                accessibilityRole="button"
                accessibilityLabel={`${typeLabel(incident.type)}, ${incident.status}`}
                style={({ pressed }) => [styles.incidentCard, pressed && styles.pressed]}
              >
                <View style={styles.incidentTop}>
                  <View
                    style={[
                      styles.incidentIcon,
                      isActiveStatus(incident.status)
                        ? styles.incidentIconActive
                        : styles.incidentIconClosed,
                    ]}
                  >
                    <Ionicons
                      name={incident.type === 'SOS' ? 'alert-circle' : 'document-text-outline'}
                      size={20}
                      color={
                        isActiveStatus(incident.status) ? colors.redDark : colors.greenDark
                      }
                    />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.incidentTitle}>{typeLabel(incident.type)}</Text>
                    <Text style={styles.incidentCaption}>
                      {timeAgo(incident.startedAt)}
                      {isActiveStatus(incident.status)
                        ? ` · active for ${elapsedSince(incident.startedAt)}`
                        : ''}
                    </Text>
                  </View>
                  <StatusBadge status={incident.status} />
                </View>
                <Text style={styles.incidentDescription} numberOfLines={2}>
                  {incident.description || 'No description added'}
                </Text>
                <View style={styles.incidentMeta}>
                  {incident.owner ? (
                    <Text style={styles.metaText}>{incident.owner.fullName}</Text>
                  ) : null}
                  {incident.offlineCreated ? (
                    <Badge
                      label={`Offline · ${formatDelay(incident.offlineDelaySeconds)}`}
                      tone="amber"
                    />
                  ) : null}
                  {incident.location ? (
                    <View style={styles.locationPill}>
                      <Ionicons name="location-outline" size={12} color={colors.muted} />
                      <Text style={styles.metaText}>Location captured</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {offlineSession ? (
        <Text style={styles.offlineFooter}>
          You are viewing an offline session. Server alerts refresh when the connection returns.
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingTop: spacing.sm },
  flex: { flex: 1 },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  title: { fontSize: 27, fontWeight: '800', color: colors.ink, letterSpacing: -0.6 },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 3, lineHeight: 18 },
  refresh: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filters: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  syncingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.greenSoft,
  },
  syncingText: { fontSize: 11, fontWeight: '700', color: colors.greenDark },
  section: { gap: spacing.sm },
  list: { gap: spacing.sm },
  localCard: { gap: spacing.sm, padding: spacing.md },
  localPress: { gap: spacing.sm },
  localTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  localIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF8EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  localTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  localCaption: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  localBody: { fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  localError: { fontSize: 12, color: colors.redDark, lineHeight: 17 },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryText: { fontSize: 12.5, fontWeight: '700', color: colors.redDark },

  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  loadingText: { fontSize: 13, color: colors.muted },
  emptyAction: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  emptyActionText: { fontSize: 13.5, fontWeight: '700', color: colors.greenDark },

  incidentCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  incidentTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  incidentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incidentIconActive: { backgroundColor: colors.redSoft },
  incidentIconClosed: { backgroundColor: colors.greenSoft },
  incidentTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  incidentCaption: { fontSize: 12, color: colors.muted, marginTop: 2 },
  incidentDescription: { fontSize: 13, lineHeight: 19, color: colors.inkSoft },
  incidentMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaText: { fontSize: 11.5, color: colors.muted },
  locationPill: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  offlineFooter: {
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.muted,
    textAlign: 'center',
  },
});
