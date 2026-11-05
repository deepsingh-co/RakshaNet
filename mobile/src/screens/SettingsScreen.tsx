import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Badge,
  Button,
  Card,
  Chip,
  Divider,
  ErrorBanner,
  Field,
  Screen,
  SectionHeader,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useOutbox } from '../context/OutboxContext';
import {
  API_URL,
  requestAccountDeletion,
  updateMeRequest,
  verifyOtpRequest,
} from '../lib/api';
import { confirmAction } from '../lib/confirm';
import { formatDateTime, timeAgo } from '../lib/format';
import { colors, spacing } from '../theme';

const PHONE = /^\+?[0-9][0-9\s-]{5,19}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'mr', label: 'मराठी' },
  { value: 'ta', label: 'தமிழ்' },
  { value: 'te', label: 'తెలుగు' },
  { value: 'bn', label: 'বাংলা' },
];

export function SettingsScreen() {
  const { user, updateUser, signOut, signOutAllDevices, busy, offlineSession } = useAuth();
  const { pending, syncing, lastSyncedAt, lastError, syncNow } = useOutbox();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [language, setLanguage] = useState(user?.preferredLanguage ?? 'en');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [otpRequired, setOtpRequired] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName);
    setPhone(user.phone);
    setEmail(user.email);
    setLanguage(user.preferredLanguage);
  }, [user?.id]);

  async function saveProfile() {
    const trimmedName = fullName.trim();
    if (trimmedName.length < 2) {
      setError('Enter your full name.');
      return;
    }
    if (!PHONE.test(phone.trim())) {
      setError('Enter a valid phone number.');
      return;
    }
    if (!EMAIL.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await updateMeRequest({
        fullName: trimmedName,
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        preferredLanguage: language,
      });
      updateUser(response.user);
      setOtpRequired(response.otpRequired);
      setNotice(
        response.otpRequired
          ? 'Profile saved. Verify your new phone number to restore full trust.'
          : 'Profile saved.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  }

  async function verifyPhone() {
    if (otp.trim().length !== 6) {
      setError('Enter the 6-digit code.');
      return;
    }
    setOtpBusy(true);
    setError(null);
    try {
      const response = await verifyOtpRequest(otp.trim());
      updateUser(response.user);
      setOtpRequired(false);
      setOtp('');
      setNotice('Phone number verified.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify the code.');
    } finally {
      setOtpBusy(false);
    }
  }

  async function logOut() {
    const confirmed = await confirmAction(
      'Sign out?',
      'Your queued safety data stays on this device and will be here when you sign back in.',
      'Sign out',
    );
    if (!confirmed) return;
    await signOut();
  }

  async function logOutEverywhere() {
    const confirmed = await confirmAction(
      'Sign out of all devices?',
      'Every refresh session for this account will be revoked. Your local SOS queue on this phone remains.',
      'Sign out all',
    );
    if (!confirmed) return;
    await signOutAllDevices();
  }

  async function requestDeletion() {
    const confirmed = await confirmAction(
      'Request account deletion?',
      'This marks your account for deletion, revokes all sessions and signs you out. This cannot be undone from the app.',
      'Request deletion',
    );
    if (!confirmed) return;
    setError(null);
    try {
      await requestAccountDeletion();
      await signOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not request account deletion.');
    }
  }

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.heading}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Profile, sync and privacy controls.</Text>
      </View>

      {offlineSession ? (
        <Card tone="warning" style={styles.rowCard}>
          <Ionicons name="cloud-offline-outline" size={20} color={colors.amber} />
          <Text style={styles.rowText}>
            Offline session. Profile changes and sign-out-all need a connection. The SOS queue still
            works.
          </Text>
        </Card>
      ) : null}
      {error ? <ErrorBanner message={error} /> : null}
      {notice ? (
        <Card tone="success" style={styles.rowCard}>
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.greenDark} />
          <Text style={styles.rowText}>{notice}</Text>
        </Card>
      ) : null}

      <Card style={styles.card}>
        <SectionHeader title="Profile" caption="Your name and contact details." />
        <Field label="Full name" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
        <Field
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          hint={
            user?.phoneVerified
              ? 'Phone verified.'
              : 'Phone not verified. Changing it will require a new code.'
          }
        />
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Text style={styles.label}>Preferred language</Text>
        <View style={styles.chips}>
          {LANGUAGES.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={language === option.value}
              onPress={() => setLanguage(option.value)}
            />
          ))}
        </View>
        <Button
          label="Save profile"
          onPress={() => void saveProfile()}
          loading={saving}
          icon="save-outline"
        />
      </Card>

      {otpRequired ? (
        <Card tone="warning" style={styles.card}>
          <View style={styles.rowCard}>
            <Ionicons name="keypad-outline" size={20} color={colors.amber} />
            <Text style={styles.rowText}>
              Enter the 6-digit code for your new phone number. In development (OTP_MODE=console),
              the backend prints the code in its terminal.
            </Text>
          </View>
          <Field
            label="Verification code"
            value={otp}
            onChangeText={(value) => setOtp(value.replace(/[^0-9]/g, '').slice(0, 6))}
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
          />
          <Button
            label="Verify phone"
            onPress={() => void verifyPhone()}
            loading={otpBusy}
            disabled={otp.length !== 6}
            icon="checkmark-circle-outline"
          />
        </Card>
      ) : null}

      <Card style={styles.card}>
        <SectionHeader
          title="Offline queue"
          caption="What is saved on this device and what has actually reached the server."
          action={
            pending > 0 ? (
              <Badge label={`${pending} waiting`} tone="amber" dot />
            ) : (
              <Badge label="Clear" tone="green" dot />
            )
          }
        />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Pending items</Text>
          <Text style={styles.infoValue}>{pending}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Last successful sync</Text>
          <Text style={styles.infoValue}>
            {lastSyncedAt ? `${timeAgo(lastSyncedAt)} (${formatDateTime(lastSyncedAt)})` : 'Never'}
          </Text>
        </View>
        {lastError ? <Text style={styles.syncError}>{lastError}</Text> : null}
        <Button
          label={syncing ? 'Syncing…' : 'Sync now'}
          onPress={() => void syncNow()}
          loading={syncing}
          variant="secondary"
          icon="sync-outline"
        />
        <Text style={styles.hint}>
          Alerts are never discarded silently. Failed items stay visible until accepted or
          explicitly retried.
        </Text>
      </Card>

      <Card style={styles.card}>
        <SectionHeader title="Account" caption="Role and session security." />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Account type</Text>
          <Text style={styles.infoValue}>{user?.accountType ?? '—'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Role</Text>
          <Text style={styles.infoValue}>{user?.role ?? '—'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email verified</Text>
          <Text style={styles.infoValue}>{user?.emailVerified ? 'Yes' : 'No'}</Text>
        </View>
        <Divider />
        <Button
          label="Sign out"
          onPress={() => void logOut()}
          variant="secondary"
          icon="log-out-outline"
          disabled={busy}
        />
        <Button
          label="Sign out of all devices"
          onPress={() => void logOutEverywhere()}
          variant="secondary"
          icon="phone-portrait-outline"
          disabled={busy}
        />
      </Card>

      <Card style={styles.card}>
        <SectionHeader title="About SURAKSHA AI" caption="Honest limits, not marketing claims." />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>App version</Text>
          <Text style={styles.infoValue}>0.1.0</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>API</Text>
          <Text style={styles.infoValue} numberOfLines={2}>
            {API_URL}
          </Text>
        </View>
        <Text style={styles.aboutText}>
          SOS works offline: the alert is saved on this phone first, with the original device time,
          then synced in the background. Notification delivery is only marked “delivered” after a
          signed provider webhook. With no provider configured, messages are labelled simulated.
        </Text>
        <Text style={styles.aboutText}>
          Location is attached only when permission is granted. You can revoke guardian access at
          any time from People → Guardian links.
        </Text>
      </Card>

      <Card tone="danger" style={styles.card}>
        <SectionHeader title="Danger zone" caption="Irreversible account actions." />
        <Text style={styles.dangerText}>
          Requesting deletion marks the account for deletion, revokes all sessions and signs you out.
        </Text>
        <Pressable
          onPress={() => void requestDeletion()}
          accessibilityRole="button"
          accessibilityLabel="Request account deletion"
          style={({ pressed }) => [styles.dangerButton, pressed && { opacity: 0.75 }]}
        >
          <Ionicons name="trash-outline" size={18} color={colors.redDark} />
          <Text style={styles.dangerButtonText}>Request account deletion</Text>
        </Pressable>
      </Card>

      <Text style={styles.footer}>
        SURAKSHA AI does not replace emergency services. Call 112 if life is in danger.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingTop: spacing.sm },
  heading: { gap: spacing.xs },
  title: { fontSize: 27, fontWeight: '800', color: colors.ink, letterSpacing: -0.6 },
  subtitle: { fontSize: 13, color: colors.muted },
  card: { gap: spacing.md },
  rowCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  rowText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: colors.inkSoft },
  label: { fontSize: 14, fontWeight: '600', color: colors.inkSoft },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: 5,
  },
  infoLabel: { fontSize: 13.5, color: colors.muted, flexShrink: 0 },
  infoValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.ink,
    flex: 1,
    textAlign: 'right',
  },
  syncError: { fontSize: 12, color: colors.redDark, lineHeight: 17 },
  hint: { fontSize: 11.5, lineHeight: 17, color: colors.muted },
  aboutText: { fontSize: 12.5, lineHeight: 18, color: colors.inkSoft },
  dangerText: { fontSize: 13, lineHeight: 19, color: colors.redDark },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.red,
    backgroundColor: colors.surface,
  },
  dangerButtonText: { fontSize: 14.5, fontWeight: '700', color: colors.redDark },
  footer: { fontSize: 11.5, lineHeight: 17, color: colors.muted, textAlign: 'center' },
});
