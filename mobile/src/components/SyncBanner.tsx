import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useOutbox } from '../context/OutboxContext';
import { timeAgo } from '../lib/format';
import { colors, radius, spacing } from '../theme';

/**
 * Honest connectivity banner. It never claims an alert was delivered; it says
 * whether the queue is empty and whether the device is offline.
 */
export function SyncBanner({ style }: { style?: StyleProp<ViewStyle> }) {
  const { offlineSession } = useAuth();
  const { pending, syncing, lastError, lastSyncedAt, syncNow } = useOutbox();

  const waiting = pending > 0;
  if (!waiting && !syncing && !offlineSession) return null;

  const title = syncing
    ? 'Syncing safety data…'
    : waiting
      ? `${pending} item${pending === 1 ? '' : 's'} waiting to sync`
      : 'Offline mode';

  const message = syncing
    ? 'Please keep the app open for a moment.'
    : waiting
      ? lastError ??
        (offlineSession
          ? 'Saved on this phone. It will send automatically when internet returns.'
          : 'Sending automatically. You can also retry now.')
      : `You can still send an SOS. Last synced ${lastSyncedAt ? timeAgo(lastSyncedAt) : 'never'}.`;

  const danger = Boolean(lastError) && waiting;

  return (
    <View style={[styles.banner, danger && styles.bannerDanger, style]}>
      <View style={[styles.icon, danger && styles.iconDanger]}>
        <Ionicons
          name={syncing ? 'sync' : waiting ? 'cloud-upload-outline' : 'cloud-offline-outline'}
          size={20}
          color={danger ? colors.redDark : colors.amber}
        />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.title, danger && styles.titleDanger]}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
      {waiting && !syncing ? (
        <Pressable
          onPress={() => void syncNow()}
          accessibilityRole="button"
          accessibilityLabel="Retry sync now"
          style={({ pressed }) => [styles.retry, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.amberSoft,
    borderWidth: 1,
    borderColor: '#F0D9B5',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  bannerDanger: { backgroundColor: colors.redSoft, borderColor: '#F3C6C6' },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF8EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDanger: { backgroundColor: '#FFF5F5' },
  textWrap: { flex: 1, gap: 2 },
  title: { fontSize: 13.5, fontWeight: '700', color: colors.amber },
  titleDanger: { color: colors.redDark },
  message: { fontSize: 12, lineHeight: 17, color: colors.inkSoft },
  retry: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 36,
    justifyContent: 'center',
  },
  retryText: { fontSize: 12.5, fontWeight: '700', color: colors.inkSoft },
});
