import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
  Screen,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import {
  ApiRequestError,
  deleteContact,
  fetchContacts,
  requestContactVerification,
  setPrimaryContact,
} from '../lib/api';
import { confirmAction } from '../lib/confirm';
import { relationshipLabel } from '../lib/format';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import type { TrustedContact } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Contacts'>;

export function ContactsScreen({ navigation }: Props) {
  const { offlineSession } = useAuth();
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetchContacts();
      setContacts(response.contacts);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiRequestError && err.code === 'NETWORK_ERROR'
          ? 'No internet connection. Contact changes are not available offline.'
          : err instanceof Error
            ? err.message
            : 'Could not load contacts.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function startVerification(contact: TrustedContact) {
    setActionId(contact.id);
    setError(null);
    try {
      const response = await requestContactVerification(contact.id);
      await load();
      navigation.navigate('VerifyContact', {
        contactId: contact.id,
        contactName: contact.name,
        devCode: response.devCode,
      });
    } catch (err) {
      setError(
        err instanceof ApiRequestError && err.code === 'NETWORK_ERROR'
          ? 'You are offline. Verification needs a connection.'
          : err instanceof Error
            ? err.message
            : 'Could not send the verification code.',
      );
    } finally {
      setActionId(null);
    }
  }

  async function makePrimary(contact: TrustedContact) {
    setActionId(contact.id);
    setError(null);
    try {
      await setPrimaryContact(contact.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set the primary contact.');
    } finally {
      setActionId(null);
    }
  }

  async function remove(contact: TrustedContact) {
    const confirmed = await confirmAction(
      `Remove ${contact.name}?`,
      'This person will no longer receive emergency information from your account.',
      'Remove contact',
    );
    if (!confirmed) return;
    setActionId(contact.id);
    setError(null);
    try {
      await deleteContact(contact.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove the contact.');
    } finally {
      setActionId(null);
    }
  }

  if (offlineSession) {
    return (
      <Screen
        header={
          <PageHeader
            title="Trusted contacts"
            onBack={() => navigation.goBack()}
            right={
              <Pressable onPress={() => void load()} accessibilityRole="button" hitSlop={8}>
                <Ionicons name="refresh" size={20} color={colors.greenDark} />
              </Pressable>
            }
          />
        }
      >
        <ErrorBanner
          message="You are offline. Contact management needs a connection. Your saved SOS queue is unaffected."
          onRetry={() => void load()}
          retryLabel="Try again"
        />
      </Screen>
    );
  }

  return (
    <Screen
      header={
        <PageHeader
          title="Trusted contacts"
          subtitle={`${contacts.length} contact${contacts.length === 1 ? '' : 's'}`}
          onBack={() => navigation.goBack()}
          right={
            <Pressable onPress={() => void load()} accessibilityRole="button" hitSlop={8}>
              <Ionicons name="refresh" size={20} color={colors.greenDark} />
            </Pressable>
          }
        />
      }
      contentStyle={styles.content}
    >
      {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}

      <Card tone="info" style={styles.infoCard}>
        <Ionicons name="shield-checkmark-outline" size={20} color={colors.blue} />
        <Text style={styles.infoText}>
          Only verified contacts are eligible for emergency information. Verification requires the
          contact to confirm a 6-digit code.
        </Text>
      </Card>

      <Button
        label="Add trusted contact"
        onPress={() => navigation.navigate('ContactForm')}
        icon="person-add-outline"
      />

      {loading && contacts.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={colors.green} />
          <Text style={styles.loadingText}>Loading contacts…</Text>
        </View>
      ) : contacts.length === 0 ? (
        <Card>
          <EmptyState
            icon="people-outline"
            title="No trusted contacts yet"
            message="Add a parent, partner, friend or neighbour who should be alerted when you need help."
            action={
              <Button
                label="Add your first contact"
                onPress={() => navigation.navigate('ContactForm')}
                variant="secondary"
              />
            }
          />
        </Card>
      ) : (
        <View style={styles.list}>
          {contacts.map((contact) => {
            const busy = actionId === contact.id;
            return (
              <Card key={contact.id} style={styles.contactCard}>
                <View style={styles.contactTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{contact.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.flex}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name}>{contact.name}</Text>
                      {contact.isPrimary ? <Badge label="Primary" tone="green" dot /> : null}
                    </View>
                    <Text style={styles.meta}>
                      {relationshipLabel(contact.relationship)} · {contact.phoneMasked}
                    </Text>
                    <Text style={styles.channels}>
                      {contact.notificationPreferences.sms ? 'SMS' : ''}
                      {contact.notificationPreferences.whatsapp ? ' · WhatsApp' : ''}
                      {contact.notificationPreferences.push ? ' · Push' : ''}
                    </Text>
                  </View>
                  <Badge
                    label={
                      contact.verificationStatus === 'VERIFIED'
                        ? 'Verified'
                        : contact.verificationStatus === 'PENDING'
                          ? 'Code pending'
                          : 'Unverified'
                    }
                    tone={
                      contact.verificationStatus === 'VERIFIED'
                        ? 'green'
                        : contact.verificationStatus === 'PENDING'
                          ? 'amber'
                          : 'slate'
                    }
                  />
                </View>

                <View style={styles.actions}>
                  {contact.verificationStatus !== 'VERIFIED' ? (
                    <MiniAction
                      icon="checkmark-circle-outline"
                      label={
                        contact.verificationStatus === 'PENDING' ? 'Enter code' : 'Verify contact'
                      }
                      onPress={() => void startVerification(contact)}
                      busy={busy}
                    />
                  ) : null}
                  {contact.verificationStatus === 'VERIFIED' && !contact.isPrimary ? (
                    <MiniAction
                      icon="star-outline"
                      label="Make primary"
                      onPress={() => void makePrimary(contact)}
                      busy={busy}
                    />
                  ) : null}
                  <MiniAction
                    icon="trash-outline"
                    label="Remove"
                    tone="danger"
                    onPress={() => void remove(contact)}
                    busy={busy}
                  />
                </View>
              </Card>
            );
          })}
        </View>
      )}

      <Text style={styles.footer}>
        Changing a phone number resets verification. This prevents an old number from receiving
        emergency information.
      </Text>
    </Screen>
  );
}

function MiniAction({
  icon,
  label,
  onPress,
  tone = 'default',
  busy = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  tone?: 'default' | 'danger';
  busy?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.miniAction,
        tone === 'danger' && styles.miniActionDanger,
        pressed && { opacity: 0.7 },
        busy && { opacity: 0.5 },
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={tone === 'danger' ? colors.red : colors.greenDark} />
      ) : (
        <Ionicons
          name={icon}
          size={16}
          color={tone === 'danger' ? colors.red : colors.greenDark}
        />
      )}
      <Text style={[styles.miniText, tone === 'danger' && styles.miniTextDanger]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingTop: spacing.sm },
  flex: { flex: 1 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  infoText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.inkSoft },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  loadingText: { fontSize: 13, color: colors.muted },
  list: { gap: spacing.sm },
  contactCard: { gap: spacing.md, padding: spacing.md },
  contactTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 17, fontWeight: '800', color: colors.greenDark },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  name: { fontSize: 15.5, fontWeight: '700', color: colors.ink },
  meta: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  channels: { fontSize: 11.5, color: colors.muted, marginTop: 3 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  miniAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.greenSoft,
  },
  miniActionDanger: { backgroundColor: colors.redSoft },
  miniText: { fontSize: 12.5, fontWeight: '700', color: colors.greenDark },
  miniTextDanger: { color: colors.red },
  footer: { fontSize: 11.5, lineHeight: 17, color: colors.muted, textAlign: 'center' },
});
