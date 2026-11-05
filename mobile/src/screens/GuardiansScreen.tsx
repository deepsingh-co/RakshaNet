import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  PageHeader,
  Screen,
  SectionHeader,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import {
  acceptGuardianLink,
  ApiRequestError,
  fetchGuardianLinks,
  inviteChild,
  revokeGuardianLink,
} from '../lib/api';
import { confirmAction } from '../lib/confirm';
import { formatDateTime } from '../lib/format';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import type { GuardianLink } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Guardians'>;

interface Links {
  asGuardian: GuardianLink[];
  asChild: GuardianLink[];
}

export function GuardiansScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [links, setLinks] = useState<Links>({ asGuardian: [], asChild: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteDevCode, setInviteDevCode] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [acceptCodes, setAcceptCodes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const response = await fetchGuardianLinks();
      setLinks(response);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiRequestError && err.code === 'NETWORK_ERROR'
          ? 'No internet connection. Guardian links cannot be refreshed right now.'
          : err instanceof Error
            ? err.message
            : 'Could not load guardian links.',
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

  const isGuardian = user?.accountType === 'GUARDIAN';

  async function sendInvite() {
    const email = inviteEmail.trim().toLowerCase();
    if (!email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setInviting(true);
    setError(null);
    setNotice(null);
    try {
      const response = await inviteChild(email);
      setInviteEmail('');
      setInviteDevCode(response.devCode ?? null);
      setNotice(
        response.devCode
          ? 'Invitation created. In console mode the consent code is shown below.'
          : response.message ?? 'Invitation created. The child must accept it.',
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the invitation.');
    } finally {
      setInviting(false);
    }
  }

  async function accept(link: GuardianLink) {
    const code = (acceptCodes[link.id] ?? '').trim();
    if (code.length !== 6) {
      setError('Enter the 6-digit consent code the guardian shared with you.');
      return;
    }
    setActionId(link.id);
    setError(null);
    try {
      await acceptGuardianLink(link.id, code);
      setNotice('Guardian link verified. They can now see your alerts and share safety updates.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not accept the link.');
    } finally {
      setActionId(null);
    }
  }

  async function revoke(link: GuardianLink) {
    const asGuardian = link.viewerRole === 'GUARDIAN';
    const confirmed = await confirmAction(
      'Revoke this guardian link?',
      asGuardian
        ? 'This person will no longer be able to see your alerts.'
        : 'You will no longer be able to see this child’s alerts. Their own data stays theirs.',
      'Revoke link',
    );
    if (!confirmed) return;
    setActionId(link.id);
    setError(null);
    try {
      await revokeGuardianLink(link.id);
      setNotice('Link revoked. Access ended immediately.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not revoke the link.');
    } finally {
      setActionId(null);
    }
  }

  const activeGuardianLinks = links.asGuardian.filter((link) => link.status !== 'REVOKED');
  const activeChildLinks = links.asChild.filter((link) => link.status !== 'REVOKED');

  return (
    <Screen
      header={<PageHeader title="Guardian links" subtitle="Consent-based protection" onBack={() => navigation.goBack()} />}
      contentStyle={styles.content}
    >
      {error ? <ErrorBanner message={error} /> : null}
      {notice ? (
        <Card tone="success" style={styles.noticeCard}>
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.greenDark} />
          <Text style={styles.noticeText}>{notice}</Text>
        </Card>
      ) : null}

      <Card tone="info" style={styles.infoCard}>
        <Ionicons name="shield-half-outline" size={20} color={colors.blue} />
        <Text style={styles.infoText}>
          A guardian link is verified only after the child enters a consent code. Guardian access is
          scoped to safety data and never grants admin permissions.
        </Text>
      </Card>

      {isGuardian ? (
        <Card style={styles.card}>
          <SectionHeader
            title="Invite a child"
            caption="Invite an existing account by email. They must accept with a consent code."
          />
          <Field
            label="Child’s email"
            value={inviteEmail}
            onChangeText={setInviteEmail}
            placeholder="child@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Button
            label="Send invitation"
            onPress={() => void sendInvite()}
            loading={inviting}
            variant="secondary"
            icon="mail-outline"
          />
          {inviteDevCode ? (
            <Card tone="warning" style={styles.devCard}>
              <View style={styles.devHeader}>
                <Ionicons name="construct-outline" size={18} color={colors.amber} />
                <Text style={styles.devTitle}>Development console code</Text>
              </View>
              <Text style={styles.devCode}>{inviteDevCode}</Text>
              <Text style={styles.devBody}>
                OTP_MODE=console, so no SMS was sent. Share it with the child for testing only.
              </Text>
            </Card>
          ) : null}
          <Button
            label="Create a child account"
            onPress={() => navigation.navigate('CreateChild')}
            variant="secondary"
            icon="person-add-outline"
          />
        </Card>
      ) : null}

      <View style={styles.section}>
        <SectionHeader
          title="People you protect"
          caption={isGuardian ? 'Children linked to your account.' : 'Links where you are the child.'}
        />
        {loading && activeGuardianLinks.length === 0 ? (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color={colors.green} />
            <Text style={styles.loadingText}>Loading links…</Text>
          </View>
        ) : activeGuardianLinks.length === 0 ? (
          <Card>
            <EmptyState
              icon="people-outline"
              title={isGuardian ? 'No children linked yet' : 'No guardian-controlled links'}
              message={
                isGuardian
                  ? 'Invite an existing account or create a child account to start.'
                  : 'When a guardian invites you, the pending link appears here for consent.'
              }
            />
          </Card>
        ) : (
          <View style={styles.list}>
            {activeGuardianLinks.map((link) => (
              <LinkCard key={link.id} link={link} onRevoke={() => void revoke(link)} busy={actionId === link.id} />
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Your guardians"
          caption="People who can see your alerts after you consent."
        />
        {activeChildLinks.length === 0 ? (
          <Card>
            <EmptyState
              icon="shield-outline"
              title="No guardian linked"
              message="A pending invitation will appear here with a consent code field."
            />
          </Card>
        ) : (
          <View style={styles.list}>
            {activeChildLinks.map((link) =>
              link.status === 'PENDING' ? (
                <Card key={link.id} tone="warning" style={styles.card}>
                  <View style={styles.linkTop}>
                    <View style={styles.avatar}>
                      <Ionicons name="shield-outline" size={20} color={colors.amber} />
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.linkName}>
                        {link.counterpart?.fullName ?? 'Guardian invitation'}
                      </Text>
                      <Text style={styles.linkMeta}>
                        {link.counterpart?.email ?? 'Pending consent'} · invited{' '}
                        {formatDateTime(link.createdAt)}
                      </Text>
                    </View>
                    <Badge label="Consent needed" tone="amber" dot />
                  </View>
                  <Text style={styles.body}>
                    Only accept if you know this person and want them to see your safety alerts.
                  </Text>
                  <Field
                    label="6-digit consent code"
                    value={acceptCodes[link.id] ?? ''}
                    onChangeText={(value) =>
                      setAcceptCodes((previous) => ({
                        ...previous,
                        [link.id]: value.replace(/[^0-9]/g, '').slice(0, 6),
                      }))
                    }
                    placeholder="000000"
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <Button
                    label="Accept guardian link"
                    onPress={() => void accept(link)}
                    loading={actionId === link.id}
                    icon="checkmark-circle-outline"
                  />
                  <Button
                    label="Decline invitation"
                    onPress={() => void revoke(link)}
                    variant="ghost"
                    icon="close-circle-outline"
                  />
                </Card>
              ) : (
                <LinkCard
                  key={link.id}
                  link={link}
                  onRevoke={() => void revoke(link)}
                  busy={actionId === link.id}
                />
              ),
            )}
          </View>
        )}
      </View>

      <Text style={styles.footer}>
        Revoking a link stops future access immediately. Existing incident history stays with the
        account that created it.
      </Text>
    </Screen>
  );
}

function LinkCard({
  link,
  onRevoke,
  busy,
}: {
  link: GuardianLink;
  onRevoke: () => void;
  busy: boolean;
}) {
  return (
    <Card style={styles.card}>
      <View style={styles.linkTop}>
        <View style={styles.avatar}>
          <Ionicons
            name={link.viewerRole === 'GUARDIAN' ? 'people-outline' : 'shield-outline'}
            size={20}
            color={colors.greenDark}
          />
        </View>
        <View style={styles.flex}>
          <Text style={styles.linkName}>{link.counterpart?.fullName ?? 'Linked account'}</Text>
          <Text style={styles.linkMeta}>
            {link.counterpart?.email ?? ''} · {link.counterpart?.phoneMasked ?? ''}
          </Text>
        </View>
        <Badge
          label={link.status === 'VERIFIED' ? 'Verified' : 'Pending'}
          tone={link.status === 'VERIFIED' ? 'green' : 'amber'}
          dot
        />
      </View>
      <Text style={styles.linkCaption}>
        {link.status === 'VERIFIED' && link.verifiedAt
          ? `Consent verified ${formatDateTime(link.verifiedAt)}`
          : 'Waiting for the child to accept.'}
      </Text>
      <Button
        label="Revoke link"
        onPress={onRevoke}
        loading={busy}
        variant="danger"
        icon="unlink-outline"
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingTop: spacing.sm },
  flex: { flex: 1 },
  section: { gap: spacing.sm },
  list: { gap: spacing.sm },
  card: { gap: spacing.md },
  noticeCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.inkSoft },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  infoText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: colors.inkSoft },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  loadingText: { fontSize: 13, color: colors.muted },
  devCard: { gap: spacing.sm, alignItems: 'center' },
  devHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  devTitle: { fontSize: 13.5, fontWeight: '700', color: colors.amber },
  devCode: { fontSize: 28, fontWeight: '800', letterSpacing: 6, color: colors.ink },
  devBody: { fontSize: 11.5, lineHeight: 17, color: colors.muted, textAlign: 'center' },
  linkTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkName: { fontSize: 15, fontWeight: '700', color: colors.ink },
  linkMeta: { fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 17 },
  linkCaption: { fontSize: 12.5, color: colors.muted, lineHeight: 18 },
  body: { fontSize: 13, lineHeight: 19, color: colors.inkSoft },
  footer: {
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.muted,
    textAlign: 'center',
  },
});
