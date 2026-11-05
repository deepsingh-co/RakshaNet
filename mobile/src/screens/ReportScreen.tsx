import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Badge,
  Button,
  Card,
  Chip,
  ErrorBanner,
  Field,
  PageHeader,
  Screen,
  SectionHeader,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useOutbox } from '../context/OutboxContext';
import { captureLocation } from '../lib/location';
import { HINGLISH_TEMPLATES, defaultDescription } from '../lib/reporting';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import type { IncidentSeverity, IncidentType, LocationInput } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Report'>;

const TYPES: Array<{ value: IncidentType; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = [
  { value: 'MANUAL', label: 'Manual alert', icon: 'create-outline' },
  { value: 'SOS', label: 'SOS', icon: 'alert-circle-outline' },
  { value: 'FALL_DETECTED', label: 'Fall detected', icon: 'body-outline' },
  { value: 'VOICE_TRIGGER', label: 'Voice trigger', icon: 'mic-outline' },
];

const SEVERITIES: IncidentSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function defaultSeverity(type: IncidentType): IncidentSeverity {
  if (type === 'SOS') return 'CRITICAL';
  if (type === 'MANUAL') return 'MEDIUM';
  return 'HIGH';
}

export function ReportScreen({ navigation, route }: Props) {
  const { offlineSession } = useAuth();
  const { createIncident, pending } = useOutbox();
  const [type, setType] = useState<IncidentType>(route.params?.type ?? 'MANUAL');
  const [severity, setSeverity] = useState<IncidentSeverity>(
    defaultSeverity(route.params?.type ?? 'MANUAL'),
  );
  const [description, setDescription] = useState(
    defaultDescription(route.params?.type ?? 'MANUAL'),
  );
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationInput | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function chooseType(next: IncidentType) {
    setType(next);
    setSeverity(defaultSeverity(next));
    if (!templateId) setDescription(defaultDescription(next));
  }

  function chooseTemplate(id: string, text: string) {
    setTemplateId(id);
    setDescription(text);
  }

  async function addLocation() {
    setLocating(true);
    setLocationNote(null);
    const captured = await captureLocation();
    setLocation(captured);
    setLocating(false);
    setLocationNote(
      captured
        ? `Location attached (accuracy about ${Math.round(captured.accuracyMeters ?? 0)} m).`
        : 'Location unavailable. The alert can still be sent without it.',
    );
  }

  async function submit() {
    setError(null);
    if (description.trim().length === 0) {
      setError('Add a short description so your contacts understand what is happening.');
      return;
    }
    setSubmitting(true);
    try {
      const record = await createIncident({
        type,
        severity,
        description,
        location,
      });
      navigation.replace('IncidentDetail', { clientIncidentId: record.clientIncidentId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the alert');
    } finally {
      setSubmitting(false);
    }
  }

  const isEmergency = type === 'SOS';

  return (
    <Screen
      header={
        <PageHeader
          title="Report incident"
          subtitle="Your words, sent in Hinglish"
          onBack={() => navigation.goBack()}
        />
      }
      contentStyle={styles.content}
    >
      {offlineSession ? (
        <Card tone="warning" style={styles.offlineCard}>
          <Ionicons name="cloud-offline-outline" size={20} color={colors.amber} />
          <Text style={styles.offlineText}>
            You are offline. This report will be saved on this phone with its original time and sent
            automatically when internet returns.
          </Text>
        </Card>
      ) : null}

      {error ? <ErrorBanner message={error} /> : null}

      <Card style={styles.section}>
        <SectionHeader title="What happened?" caption="Choose the closest match." />
        <View style={styles.chipWrap}>
          {TYPES.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={type === option.value}
              onPress={() => chooseType(option.value)}
              tone={option.value === 'SOS' ? 'amber' : 'green'}
            />
          ))}
        </View>
      </Card>

      <Card style={styles.section}>
        <SectionHeader
          title="Say it in your words"
          caption="Pick a ready Hinglish message or edit it. The app interface stays English."
        />
        <View style={styles.templateList}>
          {HINGLISH_TEMPLATES.map((template) => (
            <Pressable
              key={template.id}
              onPress={() => chooseTemplate(template.id, template.text)}
              accessibilityRole="button"
              accessibilityState={{ selected: templateId === template.id }}
              style={({ pressed }) => [
                styles.template,
                templateId === template.id && styles.templateSelected,
                pressed && { opacity: 0.8 },
              ]}
            >
              <View style={styles.templateRow}>
                <Text
                  style={[
                    styles.templateLabel,
                    templateId === template.id && styles.templateLabelSelected,
                  ]}
                >
                  {template.label}
                </Text>
                {templateId === template.id ? (
                  <Ionicons name="checkmark-circle" size={18} color={colors.green} />
                ) : null}
              </View>
              <Text style={styles.templateText} numberOfLines={2}>
                {template.text}
              </Text>
            </Pressable>
          ))}
        </View>
        <Field
          label="Message"
          value={description}
          onChangeText={(value) => {
            setDescription(value);
            setTemplateId(null);
          }}
          placeholder="What should your trusted contacts know?"
          multiline
          maxLength={500}
          hint={`${description.length}/500 characters`}
        />
      </Card>

      <Card style={styles.section}>
        <SectionHeader
          title="How serious is it?"
          caption="Severity guides your contacts on how quickly to respond."
        />
        <View style={styles.chipWrap}>
          {SEVERITIES.map((option) => (
            <Chip
              key={option}
              label={option.charAt(0) + option.slice(1).toLowerCase()}
              selected={severity === option}
              onPress={() => setSeverity(option)}
              tone={option === 'CRITICAL' ? 'amber' : 'green'}
            />
          ))}
        </View>
      </Card>

      <Card style={styles.section}>
        <SectionHeader
          title="Location"
          caption="Optional but helpful. Captured once, then sent with the alert."
        />
        {location ? (
          <View style={styles.locationRow}>
            <View style={styles.locationIcon}>
              <Ionicons name="location" size={20} color={colors.greenDark} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.locationTitle}>Location attached</Text>
              <Text style={styles.locationCaption}>
                {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                {location.accuracyMeters != null
                  ? ` · ±${Math.round(location.accuracyMeters)} m`
                  : ''}
              </Text>
            </View>
            <Badge label={location.source} tone="green" />
          </View>
        ) : (
          <Text style={styles.locationHint}>
            No location attached. The alert still sends; emergency contacts may need to call you.
          </Text>
        )}
        {locationNote ? <Text style={styles.locationNote}>{locationNote}</Text> : null}
        <Button
          label={location ? 'Refresh location' : 'Attach my location'}
          onPress={() => void addLocation()}
          loading={locating}
          variant="secondary"
          icon="navigate-outline"
        />
      </Card>

      <Card tone={isEmergency ? 'danger' : 'info'} style={styles.section}>
        <View style={styles.confirmRow}>
          <Ionicons
            name={isEmergency ? 'warning' : 'information-circle-outline'}
            size={22}
            color={isEmergency ? colors.redDark : colors.blue}
          />
          <Text style={[styles.confirmText, isEmergency && { color: colors.redDark }]}>
            {isEmergency
              ? 'This is a critical SOS. Your trusted contacts will be alerted as soon as the server receives it.'
              : 'This alert enters the same safety queue. Only verified contacts receive emergency information.'}
          </Text>
        </View>
        {pending > 0 ? (
          <Text style={styles.queueNote}>
            {pending} earlier item{pending === 1 ? '' : 's'} still waiting to sync.
          </Text>
        ) : null}
      </Card>

      <Button
        label={isEmergency ? 'Send SOS alert' : 'Send safety alert'}
        onPress={() => void submit()}
        loading={submitting}
        variant={isEmergency ? 'danger' : 'primary'}
        size="lg"
        icon={isEmergency ? 'alert-circle' : 'send'}
      />
      <Text style={styles.footer}>
        Nothing is marked delivered until the notification provider confirms it. Console mode is
        clearly labelled as simulated.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingTop: spacing.sm },
  offlineCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  offlineText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.inkSoft },
  section: { gap: spacing.md },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  templateList: { gap: spacing.sm },
  template: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    gap: 4,
    minHeight: 64,
  },
  templateSelected: { borderColor: colors.green, backgroundColor: colors.greenSoft },
  templateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  templateLabel: { fontSize: 13.5, fontWeight: '700', color: colors.inkSoft },
  templateLabelSelected: { color: colors.greenDark },
  templateText: { fontSize: 12.5, lineHeight: 18, color: colors.muted },
  flex: { flex: 1 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  locationIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
  locationCaption: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  locationHint: { fontSize: 13, lineHeight: 19, color: colors.muted },
  locationNote: { fontSize: 12.5, lineHeight: 18, color: colors.inkSoft },
  confirmRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  confirmText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.inkSoft },
  queueNote: { fontSize: 12, color: colors.amber, fontWeight: '600' },
  footer: {
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.muted,
    textAlign: 'center',
  },
});
