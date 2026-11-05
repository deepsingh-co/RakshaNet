import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Badge,
  Button,
  Card,
  ErrorBanner,
  Field,
  PageHeader,
  Screen,
} from '../components/ui';
import {
  ApiRequestError,
  confirmContactVerification,
  requestContactVerification,
} from '../lib/api';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyContact'>;

export function VerifyContactScreen({ navigation, route }: Props) {
  const { contactId, contactName } = route.params;
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState(route.params.devCode);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);

  async function submit() {
    if (code.trim().length !== 6) {
      setError('Enter the 6-digit verification code.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await confirmContactVerification(contactId, code.trim());
      setVerified(true);
    } catch (err) {
      setError(
        err instanceof ApiRequestError && err.code === 'NETWORK_ERROR'
          ? 'You are offline. Verification needs a connection.'
          : err instanceof Error
            ? err.message
            : 'Could not verify the contact.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setResending(true);
    setError(null);
    try {
      const response = await requestContactVerification(contactId);
      setDevCode(response.devCode);
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend the code.');
    } finally {
      setResending(false);
    }
  }

  if (verified) {
    return (
      <Screen
        header={<PageHeader title="Contact verified" onBack={() => navigation.goBack()} />}
        contentStyle={styles.content}
      >
        <Card tone="success" style={styles.successCard}>
          <View style={styles.successIcon}>
            <Ionicons name="shield-checkmark" size={34} color={colors.white} />
          </View>
          <Text style={styles.successTitle}>{contactName} is verified</Text>
          <Text style={styles.successBody}>
            They are now eligible to receive emergency information. Delivery is still only marked
            “delivered” when a provider webhook confirms it.
          </Text>
          <Button
            label="Back to contacts"
            onPress={() => navigation.goBack()}
            icon="people-outline"
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      header={
        <PageHeader
          title="Verify contact"
          subtitle={contactName}
          onBack={() => navigation.goBack()}
        />
      }
      contentStyle={styles.content}
    >
      {error ? <ErrorBanner message={error} /> : null}

      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.icon}>
            <Ionicons name="keypad-outline" size={24} color={colors.greenDark} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.title}>Enter the 6-digit code</Text>
            <Text style={styles.body}>
              The code is sent to {contactName}’s phone. It expires after 10 minutes.
            </Text>
          </View>
        </View>

        <Field
          label="Verification code"
          value={code}
          onChangeText={(value) => setCode(value.replace(/[^0-9]/g, '').slice(0, 6))}
          placeholder="000000"
          keyboardType="number-pad"
          maxLength={6}
        />

        <Button
          label="Verify contact"
          onPress={() => void submit()}
          loading={busy}
          disabled={code.length !== 6}
          icon="checkmark-circle-outline"
        />
        <Button
          label="Resend code"
          onPress={() => void resend()}
          loading={resending}
          variant="secondary"
          icon="refresh-outline"
        />
      </Card>

      {devCode ? (
        <Card tone="warning" style={styles.devCard}>
          <View style={styles.devHeader}>
            <Ionicons name="construct-outline" size={18} color={colors.amber} />
            <Text style={styles.devTitle}>Development console mode</Text>
            <Badge label="Simulated" tone="amber" />
          </View>
          <Text style={styles.devBody}>
            No SMS provider is configured, so the backend printed this code to its console. This is
            shown only in development and is never available in production.
          </Text>
          <Text style={styles.devCode}>{devCode}</Text>
        </Card>
      ) : null}

      <Text style={styles.footer}>
        Never share this code with anyone who is not the contact. SURAKSHA AI staff will never ask
        for it.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingTop: spacing.sm },
  flex: { flex: 1 },
  card: { gap: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.ink },
  body: { fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 3 },
  devCard: { gap: spacing.sm },
  devHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  devTitle: { fontSize: 14, fontWeight: '700', color: colors.amber, flex: 1 },
  devBody: { fontSize: 12.5, lineHeight: 18, color: colors.inkSoft },
  devCode: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 7,
    color: colors.ink,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  successCard: { gap: spacing.md, alignItems: 'center', paddingVertical: spacing.xl },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: { fontSize: 20, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  successBody: {
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  footer: {
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.muted,
    textAlign: 'center',
  },
});
