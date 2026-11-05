import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SosButton } from '../components/SosButton';
import { SyncBanner } from '../components/SyncBanner';
import { Badge, Card, ErrorBanner, ListRow, Screen, SectionHeader, StatusBadge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useOutbox } from '../context/OutboxContext';
import { ApiRequestError, fetchContacts, fetchIncidents } from '../lib/api';
import {
  elapsedSince,
  isActiveStatus,
  statusLabel,
  timeAgo,
  typeLabel,
} from '../lib/format';
import { captureLocation } from '../lib/location';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import type { Incident, LocationInput, TrustedContact } from '../types';
import { syncStateLabel } from '../lib/format';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.code === 'NETWORK_ERROR'
      ? 'Server unreachable. Saved data is shown below.'
      : error.message;
  }
  return 'Could not load your safety overview.';
}

export function HomeScreen() {
  const navigation = useNavigation<Navigation>();
  const { user, offlineSession } = useAuth();
  const { createIncident, records, syncing, pending, lastSyncedAt } = useOutbox();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sosBusy, setSosBusy] = useState(false);
  const [sosError, setSosError] = useState<string | null>(null);
  const locationRef = useRef<LocationInput | null>(null);

  const load = useCallback(async () => {
    try {
      const [incidentResponse, contactResponse] = await Promise.all([
        fetchIncidents({ limit: 20 }),
        fetchContacts(),
      ]);
      setIncidents(incidentResponse.incidents);
      setContacts(contactResponse.contacts);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void load();
      void captureLocation({ quick: true, requestPermission: false }).then((location) => {
        if (active && location) locationRef.current = location;
      });
      return () => {
        active = false;
      };
    }, [load]),
  );

  async function triggerSos() {
    if (sosBusy) return;
    setSosError(null);
    setSosBusy(true);
    try {
      const record = await createIncident({
        type: 'SOS',
        location: locationRef.current,
      });
      navigation.navigate('IncidentDetail', { clientIncidentId: record.clientIncidentId });
    } catch (err) {
      setSosError(err instanceof Error ? err.message : 'Could not save the SOS');
    } finally {
      setSosBusy(false);
    }
  }

  const activeServer = incidents.filter((incident) => isActiveStatus(incident.status));
  const localUnsynced = records.filter(
    (record) => record.syncState === 'PENDING_SYNC' || record.syncState === 'SYNC_FAILED',
  );
  const verifiedContacts = contacts.filter(
    (contact) => contact.verificationStatus === 'VERIFIED',
  ).length;
  const recent = incidents.slice(0, 3);
  const firstName = user?.fullName.split(' ')[0] ?? 'there';
  const hasActive = activeServer.length > 0 || localUnsynced.length > 0;

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.brandRow}>
        <View style={styles.brandLogo}>
          <Ionicons name="shield-checkmark" size={20} color={colors.white} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.brand}>SURAKSHA AI</Text>
          <Text style={styles.brandCaption}>
            {offlineSession ? 'Offline session' : 'Safety command center'}
          </Text>
        </View>
        <View style={[styles.connection, offlineSession && styles.connectionOffline]}>
          <View
            style={[
              styles.connectionDot,
              offlineSession ? styles.dotOffline : styles.dotOnline,
            ]}
          />
          <Text style={[styles.connectionText, offlineSession && styles.connectionTextOffline]}>
            {offlineSession ? 'Offline' : 'Online'}
          </Text>
        </View>
      </View>

      <View>
        <Text style={styles.greeting}>
          {greeting()}, {firstName}
        </Text>
        <Text style={styles.greetingCaption}>
          {hasActive
            ? 'An alert needs attention. Stay with the app.'
            : 'You are one hold away from alerting your trusted circle.'}
        </Text>
      </View>

      <SyncBanner />
      {error && !offlineSession ? (
        <ErrorBanner message={error} onRetry={() => void load()} />
      ) : null}
      {sosError ? <ErrorBanner message={sosError} /> : null}

      {localUnsynced.length > 0 ? (
        <Card tone="warning" style={styles.alertCard}>
          <View style={styles.alertTop}>
            <View style={styles.alertIconAmber}>
              <Ionicons name="cloud-upload" size={20} color={colors.amber} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.alertTitle}>Alert saved on this phone</Text>
              <Text style={styles.alertSubtitle}>
                {syncStateLabel(localUnsynced[0].syncState)} · {timeAgo(localUnsynced[0].createdAt)}
              </Text>
            </View>
            <Badge label="Not sent yet" tone="amber" />
          </View>
          <Text style={styles.alertBody}>
            Your original device time is kept. It will be sent as soon as the server is reachable.
          </Text>
          <Pressable
            onPress={() =>
              navigation.navigate('IncidentDetail', {
                clientIncidentId: localUnsynced[0].clientIncidentId,
              })
            }
            accessibilityRole="button"
            style={({ pressed }) => [styles.alertLink, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.alertLinkText}>
              {localUnsynced.length > 1
                ? `View ${localUnsynced.length} local alerts`
                : 'View local alert'}
            </Text>
            <Ionicons name="arrow-forward" size={16} color={colors.amber} />
          </Pressable>
        </Card>
      ) : null}

      {activeServer.length > 0 ? (
        <Card tone="danger" style={styles.alertCard}>
          <View style={styles.alertTop}>
            <View style={styles.alertIconRed}>
              <Ionicons name="warning" size={20} color={colors.redDark} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.alertTitleRed}>
                {activeServer.length === 1 ? 'Active alert' : `${activeServer.length} active alerts`}
              </Text>
              <Text style={styles.alertSubtitleRed}>
                {typeLabel(activeServer[0].type)} · started {elapsedSince(activeServer[0].startedAt)}{' '}
                ago
              </Text>
            </View>
            <StatusBadge status={activeServer[0].status} />
          </View>
          <Pressable
            onPress={() =>
              navigation.navigate('IncidentDetail', { incidentId: activeServer[0].id })
            }
            accessibilityRole="button"
            style={({ pressed }) => [styles.alertLink, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.alertLinkTextRed}>Open live incident</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.redDark} />
          </Pressable>
        </Card>
      ) : null}

      <Card
        tone={hasActive ? 'warning' : 'success'}
        style={styles.sosCard}
      >
        <View style={styles.sosHeader}>
          <View style={[styles.statusDot, { backgroundColor: hasActive ? colors.amber : colors.green }]} />
          <Text style={[styles.statusText, { color: hasActive ? colors.amber : colors.greenDark }]}>
            {hasActive ? 'Emergency help is in progress' : 'Protection is ready'}
          </Text>
        </View>
        <SosButton onTrigger={() => void triggerSos()} disabled={sosBusy} />
        {sosBusy ? (
          <View style={styles.sosSaving}>
            <ActivityIndicator size="small" color={colors.green} />
            <Text style={styles.sosSavingText}>Saving your alert on this device…</Text>
          </View>
        ) : (
          <Text style={styles.sosCaption}>
            Hold the button to alert your trusted contacts. The alert is saved on this phone first,
            even without internet.
          </Text>
        )}
      </Card>

      <View style={styles.quickGrid}>
        <QuickAction
          icon="megaphone-outline"
          label="Report incident"
          caption="Share what is happening"
          tone="amber"
          onPress={() => navigation.navigate('Report')}
        />
        <QuickAction
          icon="people-outline"
          label="Trusted contacts"
          caption={
            contacts.length === 0
              ? 'Add your safety circle'
              : `${verifiedContacts} of ${contacts.length} verified`
          }
          tone="blue"
          onPress={() => navigation.navigate('Contacts')}
        />
        <QuickAction
          icon="shield-outline"
          label="Guardian links"
          caption="Family consent & children"
          tone="green"
          onPress={() => navigation.navigate('Guardians')}
        />
        <QuickAction
          icon="location-outline"
          label="Live location"
          caption="Shared during an alert"
          tone="purple"
          onPress={() =>
            recent[0]
              ? navigation.navigate('IncidentDetail', { incidentId: recent[0].id })
              : navigation.navigate('Report')
          }
        />
      </View>

      {contacts.length === 0 ? (
        <Card tone="warning">
          <View style={styles.readinessRow}>
            <Ionicons name="person-add-outline" size={22} color={colors.amber} />
            <View style={styles.flex}>
              <Text style={styles.readinessTitle}>No trusted contacts yet</Text>
              <Text style={styles.readinessBody}>
                Add at least one person who should be alerted during an emergency.
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => navigation.navigate('ContactForm')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.inlineButton, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.inlineButtonText}>Add a trusted contact</Text>
          </Pressable>
        </Card>
      ) : verifiedContacts === 0 ? (
        <Card tone="warning">
          <Text style={styles.readinessTitle}>Verify a trusted contact</Text>
          <Text style={styles.readinessBody}>
            Verification makes sure the right person receives your emergency information. Your
            contacts are not marked delivered until the provider confirms it.
          </Text>
          <Pressable
            onPress={() => navigation.navigate('Contacts')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.inlineButton, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.inlineButtonText}>Review contacts</Text>
          </Pressable>
        </Card>
      ) : null}

      <View>
        <SectionHeader
          title="Recent alerts"
          caption={
            lastSyncedAt ? `Queue last synced ${timeAgo(lastSyncedAt)}` : 'Your latest incidents'
          }
          action={
            <Pressable onPress={() => void load()} accessibilityRole="button" hitSlop={8}>
              <Ionicons name="refresh" size={20} color={colors.greenDark} />
            </Pressable>
          }
        />
        <View style={styles.incidentList}>
          {loading && incidents.length === 0 ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.green} />
              <Text style={styles.loadingText}>Loading your alerts…</Text>
            </View>
          ) : recent.length === 0 ? (
            <Card>
              <Text style={styles.emptyTitle}>No alerts yet</Text>
              <Text style={styles.emptyBody}>
                When you send an SOS or report an incident, it will appear here with its real
                delivery status.
              </Text>
            </Card>
          ) : (
            recent.map((incident) => (
              <ListRow
                key={incident.id}
                icon={incident.type === 'SOS' ? 'alert-circle' : 'document-text-outline'}
                tone={isActiveStatus(incident.status) ? 'red' : 'green'}
                title={`${typeLabel(incident.type)} · ${timeAgo(incident.startedAt)}`}
                subtitle={incident.description || 'No description added'}
                right={<StatusBadge status={incident.status} />}
                onPress={() =>
                  navigation.navigate('IncidentDetail', { incidentId: incident.id })
                }
              />
            ))
          )}
        </View>
      </View>

      {pending > 0 && !syncing ? (
        <Text style={styles.footerNote}>
          {pending} item{pending === 1 ? '' : 's'} saved on this device. Nothing is deleted until it
          is accepted by the server.
        </Text>
      ) : null}
      <Text style={styles.footerNote}>
        SURAKSHA AI does not replace emergency services. Call 112 if life is in danger.
      </Text>
    </Screen>
  );
}

function QuickAction({
  icon,
  label,
  caption,
  tone,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  caption: string;
  tone: 'green' | 'blue' | 'amber' | 'purple';
  onPress: () => void;
}) {
  const palette =
    tone === 'blue'
      ? { background: colors.blueSoft, text: colors.blue }
      : tone === 'amber'
        ? { background: colors.amberSoft, text: colors.amber }
        : tone === 'purple'
          ? { background: colors.purpleSoft, text: colors.purple }
          : { background: colors.greenSoft, text: colors.greenDark };
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${caption}`}
      style={({ pressed }) => [styles.quickAction, pressed && styles.quickActionPressed]}
    >
      <View style={[styles.quickIcon, { backgroundColor: palette.background }]}>
        <Ionicons name={icon} size={22} color={palette.text} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
      <Text style={styles.quickCaption} numberOfLines={2}>
        {caption}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingTop: spacing.sm },
  flex: { flex: 1 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  brandLogo: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { fontSize: 15.5, fontWeight: '800', letterSpacing: 1.1, color: colors.ink },
  brandCaption: { fontSize: 11.5, color: colors.muted, marginTop: 1 },
  connection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.greenSoft,
  },
  connectionOffline: { backgroundColor: colors.amberSoft },
  connectionDot: { width: 7, height: 7, borderRadius: 4 },
  dotOnline: { backgroundColor: colors.green },
  dotOffline: { backgroundColor: colors.amber },
  connectionText: { fontSize: 11, fontWeight: '700', color: colors.greenDark },
  connectionTextOffline: { color: colors.amber },

  greeting: { fontSize: 27, fontWeight: '800', color: colors.ink, letterSpacing: -0.6 },
  greetingCaption: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
    marginTop: spacing.xs,
  },

  alertCard: { gap: spacing.md },
  alertTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  alertIconAmber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF8EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertIconRed: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: { fontSize: 15.5, fontWeight: '700', color: colors.ink },
  alertTitleRed: { fontSize: 15.5, fontWeight: '700', color: colors.redDark },
  alertSubtitle: { fontSize: 12.5, color: colors.inkSoft, marginTop: 2 },
  alertSubtitleRed: { fontSize: 12.5, color: colors.redDark, marginTop: 2 },
  alertBody: { fontSize: 13, lineHeight: 19, color: colors.inkSoft },
  alertLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    minHeight: 32,
  },
  alertLinkText: { fontSize: 13.5, fontWeight: '700', color: colors.amber },
  alertLinkTextRed: { fontSize: 13.5, fontWeight: '700', color: colors.redDark },

  sosCard: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  sosHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '700' },
  sosCaption: {
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.inkSoft,
    textAlign: 'center',
    maxWidth: 300,
  },
  sosSaving: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sosSavingText: { fontSize: 12.5, color: colors.inkSoft, fontWeight: '600' },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  quickAction: {
    width: '47.5%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
    minHeight: 132,
  },
  quickActionPressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  quickLabel: { fontSize: 14, fontWeight: '700', color: colors.ink },
  quickCaption: { fontSize: 11.5, lineHeight: 16, color: colors.muted },

  readinessRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  readinessTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  readinessBody: { fontSize: 13, lineHeight: 19, color: colors.inkSoft, marginTop: 3 },
  inlineButton: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  inlineButtonText: { fontSize: 13.5, fontWeight: '700', color: colors.greenDark },

  incidentList: { gap: spacing.sm, marginTop: spacing.md },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  loadingText: { fontSize: 13.5, color: colors.muted },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  emptyBody: { fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 4 },

  footerNote: {
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.muted,
    textAlign: 'center',
  },
});
