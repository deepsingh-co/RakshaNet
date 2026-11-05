import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
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
  SeverityBadge,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { ApiRequestError, interpretSafetyMessage } from '../lib/api';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import type { SafetyIntent, SafetyInterpretResponse, SuggestedAction } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Assistant'>;

const PROMPTS = [
  'Koi mujhe peeche se follow kar raha hai',
  'Cab unsafe lag rahi hai, driver galat raaste ja raha hai',
  'Ghar par akeli hoon, bahar kuch log khade hain',
  'Bachche ko school ke paas khatra lag raha hai',
  'Yahan accident hua hai, kisi ko chot lagi hai',
];

const INTENT_LABELS: Record<SafetyIntent, string> = {
  SOS: 'Immediate danger',
  FOLLOWED: 'Being followed',
  HARASSMENT: 'Harassment',
  UNSAFE_CAB: 'Unsafe cab',
  ACCIDENT: 'Accident',
  HOME_UNSAFE: 'Unsafe at home',
  CHILD_UNSAFE: 'Child safety',
  NEEDS_HELP: 'Needs help',
  INFO: 'Information',
  UNKNOWN: 'Not understood',
};

const ACTION_LABELS: Record<SuggestedAction, string> = {
  CALL_112: 'Call 112',
  HOLD_SOS: 'Hold SOS',
  MOVE_TO_SAFE_PLACE: 'Move to a safer place',
  SHARE_LOCATION: 'Share your location',
  ALERT_TRUSTED_CONTACTS: 'Alert trusted contacts',
  CONFIRM_DETAILS: 'Add more detail',
  PROVIDE_INFO: 'Ask a question',
};

function friendlyError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.code === 'NETWORK_ERROR'
      ? 'Cannot reach the safety advisor. SOS and reports still work offline from the Home screen.'
      : error.message;
  }
  return 'The safety advisor could not answer. Try again or use the SOS button.';
}

export function AssistantScreen({ navigation }: Props) {
  const { offlineSession } = useAuth();
  const [text, setText] = useState('');
  const [result, setResult] = useState<SafetyInterpretResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callError, setCallError] = useState<string | null>(null);

  async function ask() {
    if (text.trim().length < 2) {
      setError('Write at least a few words about what is happening.');
      return;
    }
    setLoading(true);
    setError(null);
    setCallError(null);
    try {
      const response = await interpretSafetyMessage({ text, language: 'auto' });
      setResult(response);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function call112() {
    setCallError(null);
    try {
      await Linking.openURL('tel:112');
    } catch {
      setCallError('This device could not open the dialer. Please dial 112 manually.');
    }
  }

  const interpretation = result?.interpretation;
  const urgent =
    interpretation?.severity === 'CRITICAL' || interpretation?.severity === 'HIGH';

  return (
    <Screen
      header={
        <PageHeader
          title="Safety assistant"
          subtitle="Hinglish guidance, not a dispatcher"
          onBack={() => navigation.goBack()}
        />
      }
      contentStyle={styles.content}
    >
      <Card tone="warning" style={styles.disclaimer}>
        <View style={styles.row}>
          <Ionicons name="information-circle-outline" size={22} color={colors.amber} />
          <View style={styles.flex}>
            <Text style={styles.disclaimerTitle}>Guidance only</Text>
            <Text style={styles.disclaimerBody}>
              This assistant cannot send police or an ambulance. For immediate danger, call 112 or
              hold the SOS button. It never creates an alert without your confirmation.
            </Text>
          </View>
        </View>
      </Card>

      {offlineSession ? (
        <Card tone="warning">
          <Text style={styles.offlineText}>
            You are offline, so the assistant cannot answer. Your SOS and reports still save on
            this phone and send when the network returns.
          </Text>
        </Card>
      ) : null}

      {error ? <ErrorBanner message={error} /> : null}
      {callError ? <ErrorBanner message={callError} /> : null}

      <Card style={styles.section}>
        <SectionHeader
          title="What is happening?"
          caption="Write in Hinglish, Hindi or English. Your message is not stored in the audit log."
        />
        <Field
          label="Your message"
          value={text}
          onChangeText={(value) => {
            setText(value);
            if (error) setError(null);
          }}
          placeholder="Koi mujhe follow kar raha hai…"
          multiline
          maxLength={1000}
          hint={`${text.length}/1000 characters`}
          editable={!loading}
        />
        <View style={styles.promptWrap}>
          {PROMPTS.map((prompt) => (
            <Chip
              key={prompt}
              label={prompt.length > 34 ? `${prompt.slice(0, 32)}…` : prompt}
              selected={text === prompt}
              onPress={() => {
                setText(prompt);
                setError(null);
              }}
            />
          ))}
        </View>
        <Button
          label="Get safety guidance"
          icon="sparkles-outline"
          onPress={() => void ask()}
          loading={loading}
          disabled={loading || text.trim().length < 2}
        />
      </Card>

      {interpretation ? (
        <Card
          tone={urgent ? 'danger' : 'success'}
          style={styles.section}
        >
          <View style={styles.resultTop}>
            <View style={styles.flex}>
              <Text style={styles.resultLabel}>{INTENT_LABELS[interpretation.intent]}</Text>
              <Text style={styles.resultMeta}>
                {Math.round(interpretation.confidence * 100)}% confidence ·{' '}
                {ACTION_LABELS[interpretation.suggestedAction]}
              </Text>
            </View>
            <SeverityBadge severity={interpretation.severity} />
          </View>

          <Text style={styles.reply}>{interpretation.reply}</Text>

          <View style={styles.truthBox}>
            <Badge
              label={
                interpretation.mode === 'console'
                  ? 'Console guidance · simulated'
                  : interpretation.degraded
                    ? 'Gnani unavailable · local fallback'
                    : 'Gnani live response'
              }
              tone={
                interpretation.mode === 'console' || interpretation.degraded ? 'amber' : 'green'
              }
              dot
            />
            <Text style={styles.truthText}>
              {interpretation.mode === 'console'
                ? 'No Gnani credentials are configured, so this is a deterministic on-server simulation — not a live AI reply.'
                : interpretation.degraded
                  ? `The live provider did not answer (${interpretation.providerError ?? 'provider error'}). This guidance came from the local fallback.`
                  : 'Answered by the configured live provider. Guidance is still not a dispatched emergency response.'}
            </Text>
          </View>

          <View style={styles.actions}>
            {urgent || interpretation.suggestedAction === 'CALL_112' ? (
              <Button
                label="Call 112 now"
                icon="call"
                variant="danger"
                onPress={() => void call112()}
              />
            ) : null}
            <Button
              label="Open SOS button"
              icon="alert-circle-outline"
              variant="secondary"
              onPress={() => navigation.navigate('Tabs', { screen: 'Home' })}
            />
            <Button
              label="Report this incident"
              icon="megaphone-outline"
              variant="secondary"
              onPress={() => navigation.navigate('Report')}
            />
          </View>
          <Text style={styles.confirmNote}>
            These actions are yours to confirm. If you report the incident, it follows the same
            offline-first queue as every other alert.
          </Text>
        </Card>
      ) : null}

      <Pressable
        onPress={() => void call112()}
        accessibilityRole="button"
        accessibilityLabel="Call emergency services on 112"
        style={({ pressed }) => [styles.callFooter, pressed && { opacity: 0.75 }]}
      >
        <Ionicons name="call-outline" size={18} color={colors.redDark} />
        <Text style={styles.callFooterText}>
          Life-threatening emergency? Call 112 directly. The assistant does not replace emergency
          services.
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  section: { gap: spacing.sm },
  disclaimer: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  flex: { flex: 1 },
  disclaimerTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
  disclaimerBody: { fontSize: 13, lineHeight: 19, color: colors.inkSoft, marginTop: 2 },
  offlineText: { fontSize: 13, lineHeight: 19, color: colors.inkSoft },
  promptWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  resultTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  resultLabel: { fontSize: 18, fontWeight: '800', color: colors.ink },
  resultMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  reply: { fontSize: 15, lineHeight: 22, color: colors.ink, marginTop: spacing.xs },
  truthBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  truthText: { fontSize: 12, lineHeight: 18, color: colors.inkSoft },
  actions: { gap: spacing.sm, marginTop: spacing.xs },
  confirmNote: { fontSize: 11, lineHeight: 16, color: colors.muted },
  callFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  callFooterText: { flex: 1, fontSize: 12, lineHeight: 18, color: colors.redDark },
});
