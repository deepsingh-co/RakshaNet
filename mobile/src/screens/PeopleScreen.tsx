import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import {
  Badge,
  Button,
  Card,
  ErrorBanner,
  Screen,
  SectionHeader,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { ApiRequestError, fetchContacts, fetchGuardianLinks } from '../lib/api';
import { relationshipLabel } from '../lib/format';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import type { GuardianLink, TrustedContact } from '../types';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

function messageFor(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.code === 'NETWORK_ERROR'
      ? 'No internet connection. Your saved safety circle is shown when available.'
      : error.message;
  }
  return 'Could not load your safety circle.';
}

export function PeopleScreen() {
  const navigation = useNavigation<Navigation>();
  const { user } = useAuth();
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [links, setLinks] = useState<{ asGuardian: GuardianLink[]; asChild: GuardianLink[] }>({
    asGuardian: [],
    asChild: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [contactResponse, linkResponse] = await Promise.all([
        fetchContacts(),
        fetchGuardianLinks(),
      ]);
      setContacts(contactResponse.contacts);
      setLinks(linkResponse);
      setError(null);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const verified = contacts.filter((contact) => contact.verificationStatus === 'VERIFIED');
  const guardians = links.asChild.filter((link) => link.status === 'VERIFIED');
  const verifiedChildren = links.asGuardian.filter((link) => link.status === 'VERIFIED');
  const pendingLinks = [...links.asChild, ...links.asGuardian].filter(
    (link) => link.status === 'PENDING',
  );

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.heading}>
        <Text style={styles.title}>People</Text>
        <Text style={styles.subtitle}>
          Your safety circle. Verification is required before emergency information is shared.
        </Text>
      </View>

      {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}

      <Card style={styles.stack}>
        <SectionHeader
          title="Trusted contacts"
          caption={
            loading
              ? 'Loading…'
              : contacts.length === 0
                ? 'Nobody added yet'
                : `${verified.length} verified of ${contacts.length}`
          }
          action={
            <Badge
              label={verified.length > 0 ? 'Alert-ready' : 'Needs verification'}
              tone={verified.length > 0 ? 'green' : 'amber'}
              dot
            />
          }
        />
        {contacts.length > 0 ? (
          <View style={styles.contactList}>
            {contacts.slice(0, 3).map((contact) => (
              <View key={contact.id} style={styles.contactRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{contact.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.contactName}>
                    {contact.name}
                    {contact.isPrimary ? ' · Primary' : ''}
                  </Text>
                  <Text style={styles.contactMeta}>
                    {relationshipLabel(contact.relationship)} · {contact.phoneMasked}
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
            ))}
          </View>
        ) : (
          <Text style={styles.body}>
            Add someone you trust. Only verified contacts are eligible to receive emergency
            information.
          </Text>
        )}
        <View style={styles.buttonRow}>
          <Button
            label="Manage contacts"
            onPress={() => navigation.navigate('Contacts')}
            variant="secondary"
            fullWidth={false}
            style={styles.flexButton}
            icon="people-outline"
          />
          <Button
            label="Add contact"
            onPress={() => navigation.navigate('ContactForm')}
            fullWidth={false}
            style={styles.flexButton}
            icon="person-add-outline"
          />
        </View>
      </Card>

      <Card style={styles.stack}>
        <SectionHeader
          title="Guardian links"
          caption="A guardian can see alerts. Guardian access never becomes admin access."
          action={
            pendingLinks.length > 0 ? (
              <Badge label={`${pendingLinks.length} pending`} tone="amber" dot />
            ) : (
              <Badge
                label={guardians.length > 0 || verifiedChildren.length > 0 ? 'Connected' : 'None'}
                tone={guardians.length > 0 || verifiedChildren.length > 0 ? 'green' : 'slate'}
              />
            )
          }
        />
        {guardians.length > 0 ? (
          <View style={styles.linkRow}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.greenDark} />
            <Text style={styles.linkText}>
              {guardians.map((link) => link.counterpart?.fullName ?? 'Guardian').join(', ')} can
              see your alerts.
            </Text>
          </View>
        ) : null}
        {verifiedChildren.length > 0 ? (
          <View style={styles.linkRow}>
            <Ionicons name="people-outline" size={18} color={colors.blue} />
            <Text style={styles.linkText}>
              You protect{' '}
              {verifiedChildren.map((link) => link.counterpart?.fullName ?? 'Child').join(', ')}.
            </Text>
          </View>
        ) : null}
        {guardians.length === 0 && verifiedChildren.length === 0 ? (
          <Text style={styles.body}>
            {user?.accountType === 'GUARDIAN'
              ? 'Create a child account or invite an existing account to link with consent.'
              : 'No guardian is linked. You can accept an invitation from someone you trust.'}
          </Text>
        ) : null}
        <Button
          label="Manage guardian links"
          onPress={() => navigation.navigate('Guardians')}
          variant="secondary"
          icon="shield-outline"
        />
      </Card>

      <Card style={styles.stack}>
        <Text style={styles.cardTitle}>Your account</Text>
        <View style={styles.accountRow}>
          <Text style={styles.accountLabel}>Name</Text>
          <Text style={styles.accountValue}>{user?.fullName ?? '—'}</Text>
        </View>
        <View style={styles.accountRow}>
          <Text style={styles.accountLabel}>Account type</Text>
          <Text style={styles.accountValue}>{user?.accountType ?? '—'}</Text>
        </View>
        <View style={styles.accountRow}>
          <Text style={styles.accountLabel}>Role</Text>
          <Text style={styles.accountValue}>{user?.role ?? '—'}</Text>
        </View>
        <Text style={styles.privacy}>
          Guardian and admin permissions are separate. Being a guardian never grants admin access.
        </Text>
      </Card>

      {loading && contacts.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={colors.green} />
          <Text style={styles.loadingText}>Loading your people…</Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingTop: spacing.sm },
  flex: { flex: 1 },
  heading: { gap: spacing.xs },
  title: { fontSize: 27, fontWeight: '800', color: colors.ink, letterSpacing: -0.6 },
  subtitle: { fontSize: 13, lineHeight: 19, color: colors.muted },
  stack: { gap: spacing.md },
  contactList: { gap: spacing.sm },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '800', color: colors.greenDark },
  contactName: { fontSize: 14.5, fontWeight: '700', color: colors.ink },
  contactMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  buttonRow: { flexDirection: 'row', gap: spacing.sm },
  flexButton: { flex: 1 },
  body: { fontSize: 13.5, lineHeight: 20, color: colors.inkSoft },
  linkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  linkText: { flex: 1, fontSize: 13.5, lineHeight: 20, color: colors.inkSoft },
  cardTitle: { fontSize: 15.5, fontWeight: '700', color: colors.ink },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  accountLabel: { fontSize: 13.5, color: colors.muted },
  accountValue: { fontSize: 13.5, fontWeight: '600', color: colors.ink },
  privacy: { fontSize: 11.5, lineHeight: 17, color: colors.muted },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: { fontSize: 13, color: colors.muted },
});
