import { Ionicons } from '@expo/vector-icons';
import React, { type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import {
  severityLabel,
  severityTone,
  statusLabel,
  statusTone,
  type Tone,
} from '../lib/format';
import type { IncidentSeverity, IncidentStatus } from '../types';
import { colors, radius, shadows, spacing, typography } from '../theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export function Screen({
  children,
  scroll = true,
  padded = true,
  edges = ['top', 'bottom'],
  header,
  style,
  contentStyle,
  footer,
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: Edge[];
  header?: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
}) {
  return (
    <SafeAreaView style={[styles.screen, style]} edges={edges}>
      {header}
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            padded && styles.padded,
            contentStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, padded && styles.padded, contentStyle]}>{children}</View>
      )}
      {footer}
    </SafeAreaView>
  );
}

export function PageHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <View style={styles.pageHeader}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
      ) : (
        <View style={styles.backSpacer} />
      )}
      <View style={styles.pageHeaderText}>
        <Text style={styles.pageHeaderTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.pageHeaderSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? <View style={styles.backSpacer} />}
    </View>
  );
}

export function Card({
  children,
  style,
  tone,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'danger' | 'success' | 'warning' | 'info';
}) {
  return (
    <View
      style={[
        styles.card,
        tone === 'danger' && styles.cardDanger,
        tone === 'success' && styles.cardSuccess,
        tone === 'warning' && styles.cardWarning,
        tone === 'info' && styles.cardInfo,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

export function SectionHeader({
  title,
  caption,
  action,
}: {
  title: string;
  caption?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.flex}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {caption ? <Text style={styles.sectionCaption}>{caption}</Text> : null}
      </View>
      {action}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'md' | 'lg';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const isDisabled = disabled || loading;
  const background =
    variant === 'primary'
      ? colors.green
      : variant === 'danger'
        ? colors.red
        : variant === 'secondary'
          ? colors.surface
          : 'transparent';
  const foreground =
    variant === 'primary' || variant === 'danger' ? colors.white : colors.greenDark;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        size === 'lg' && styles.buttonLarge,
        { backgroundColor: background },
        variant === 'secondary' && styles.buttonBordered,
        variant === 'ghost' && styles.buttonGhost,
        fullWidth ? styles.fullWidth : undefined,
        pressed && !isDisabled && styles.buttonPressed,
        isDisabled && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={foreground} />
      ) : icon ? (
        <Ionicons name={icon} size={size === 'lg' ? 22 : 18} color={foreground} />
      ) : null}
      <Text
        style={[
          styles.buttonText,
          size === 'lg' && styles.buttonTextLarge,
          { color: foreground },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  tone = 'default',
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  tone?: 'default' | 'danger';
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconButton,
        tone === 'danger' && styles.iconButtonDanger,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={tone === 'danger' ? colors.red : colors.inkSoft}
      />
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Inputs                                                              */
/* ------------------------------------------------------------------ */

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'sentences',
  autoComplete,
  error,
  hint,
  multiline,
  editable = true,
  maxLength,
  style,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: ComponentProps<typeof TextInput>['autoComplete'];
  error?: string | null;
  hint?: string;
  multiline?: boolean;
  editable?: boolean;
  maxLength?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        multiline={multiline}
        editable={editable}
        maxLength={maxLength}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          error ? styles.inputError : null,
          !editable && styles.inputDisabled,
        ]}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
      {!error && hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function SwitchRow({
  label,
  description,
  value,
  onValueChange,
  disabled,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.flex}>
        <Text style={styles.switchLabel}>{label}</Text>
        {description ? <Text style={styles.switchDescription}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.borderStrong, true: colors.green }}
        thumbColor={colors.white}
        accessibilityLabel={label}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Display                                                             */
/* ------------------------------------------------------------------ */

export function Badge({
  label,
  tone = 'slate',
  dot = false,
  style,
}: {
  label: string;
  tone?: Tone;
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = badgePalette[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.background }, style]}>
      {dot ? <View style={[styles.badgeDot, { backgroundColor: palette.text }]} /> : null}
      <Text style={[styles.badgeText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

const badgePalette: Record<Tone, { background: string; text: string }> = {
  green: { background: colors.greenSoft, text: colors.greenDark },
  red: { background: colors.redSoft, text: colors.redDark },
  amber: { background: colors.amberSoft, text: colors.amber },
  orange: { background: colors.orangeSoft, text: colors.orange },
  blue: { background: colors.blueSoft, text: colors.blue },
  purple: { background: colors.purpleSoft, text: colors.purple },
  slate: { background: colors.surfaceMuted, text: colors.inkSoft },
};

export function StatusBadge({ status }: { status: IncidentStatus | string }) {
  return <Badge label={statusLabel(status)} tone={statusTone(status)} dot />;
}

export function SeverityBadge({ severity }: { severity: IncidentSeverity | string }) {
  return <Badge label={severityLabel(severity)} tone={severityTone(severity)} />;
}

export function KeyValue({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: StyleProp<TextStyle>;
}) {
  return (
    <View style={styles.keyValue}>
      <Text style={styles.keyValueLabel}>{label}</Text>
      <Text style={[styles.keyValueValue, valueStyle]}>{value}</Text>
    </View>
  );
}

export function ListRow({
  icon,
  title,
  subtitle,
  right,
  onPress,
  tone = 'green',
  destructive = false,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  tone?: 'green' | 'blue' | 'red' | 'amber';
  destructive?: boolean;
}) {
  const palette =
    tone === 'red'
      ? { background: colors.redSoft, text: colors.red }
      : tone === 'blue'
        ? { background: colors.blueSoft, text: colors.blue }
        : tone === 'amber'
          ? { background: colors.amberSoft, text: colors.amber }
          : { background: colors.greenSoft, text: colors.green };
  const content = (
    <View style={styles.listRowInner}>
      <View style={[styles.listIcon, { backgroundColor: palette.background }]}>
        <Ionicons name={icon} size={20} color={palette.text} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.listTitle, destructive && { color: colors.red }]}>{title}</Text>
        {subtitle ? <Text style={styles.listSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? (
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      ) : null)}
    </View>
  );

  if (!onPress) return <View style={styles.listRow}>{content}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [styles.listRow, pressed && styles.listRowPressed]}
    >
      {content}
    </Pressable>
  );
}

export function EmptyState({
  icon = 'shield-checkmark-outline',
  title,
  message,
  action,
}: {
  icon?: IconName;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={30} color={colors.green} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  );
}

export function ErrorBanner({
  message,
  onRetry,
  retryLabel = 'Try again',
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <View style={styles.errorBanner}>
      <Ionicons name="alert-circle" size={20} color={colors.redDark} />
      <View style={styles.flex}>
        <Text style={styles.errorText}>{message}</Text>
        {onRetry ? (
          <Pressable onPress={onRetry} accessibilityRole="button" hitSlop={6}>
            <Text style={styles.errorRetry}>{retryLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="small" color={colors.green} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  tone = 'green',
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  tone?: 'green' | 'amber';
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        selected && (tone === 'amber' ? styles.chipSelectedAmber : styles.chipSelected),
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.chipText,
          selected && (tone === 'amber' ? styles.chipTextAmber : styles.chipTextSelected),
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function ChoiceRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string; description?: string; icon?: IconName }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.choiceRow}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.choice,
              selected && styles.choiceSelected,
              pressed && styles.pressed,
            ]}
          >
            {option.icon ? (
              <Ionicons
                name={option.icon}
                size={20}
                color={selected ? colors.greenDark : colors.inkSoft}
              />
            ) : null}
            <Text style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}>
              {option.label}
            </Text>
            {option.description ? (
              <Text style={styles.choiceDescription}>{option.description}</Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: spacing.xxl, gap: spacing.lg },
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  screenTitle: {
    fontSize: typography.title,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.4,
  },
  screenSubtitle: {
    fontSize: typography.small,
    color: colors.muted,
    marginTop: spacing.xs,
    lineHeight: 20,
  },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backSpacer: { width: 44 },
  pageHeaderText: { flex: 1, alignItems: 'center' },
  pageHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  pageHeaderSubtitle: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 2,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.card,
  },
  cardDanger: { backgroundColor: colors.redSoft, borderColor: '#F3C6C6' },
  cardSuccess: { backgroundColor: colors.greenSoft, borderColor: '#C6E5D8' },
  cardWarning: { backgroundColor: colors.amberSoft, borderColor: '#F0D9B5' },
  cardInfo: { backgroundColor: colors.blueSoft, borderColor: '#CBD9F5' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.ink },
  sectionCaption: { fontSize: 13, color: colors.muted, marginTop: 2, lineHeight: 18 },

  button: {
    minHeight: 50,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  buttonLarge: { minHeight: 58 },
  buttonBordered: { borderWidth: 1.5, borderColor: colors.green },
  buttonGhost: { paddingHorizontal: 0, justifyContent: 'flex-start' },
  fullWidth: { alignSelf: 'stretch' },
  buttonPressed: { opacity: 0.82, transform: [{ scale: 0.995 }] },
  buttonDisabled: { opacity: 0.48 },
  buttonText: { fontSize: 16, fontWeight: '700' },
  buttonTextLarge: { fontSize: 17 },

  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDanger: { backgroundColor: colors.redSoft },
  pressed: { opacity: 0.7 },

  field: { gap: 6 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.inkSoft },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.ink,
  },
  inputMultiline: { minHeight: 110, textAlignVertical: 'top' },
  inputError: { borderColor: colors.red },
  inputDisabled: { backgroundColor: colors.surfaceMuted, color: colors.muted },
  fieldError: { fontSize: 13, color: colors.red },
  fieldHint: { fontSize: 12, color: colors.muted, lineHeight: 17 },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 52,
  },
  switchLabel: { fontSize: 15, fontWeight: '600', color: colors.ink },
  switchDescription: { fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 17 },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.1 },

  keyValue: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingVertical: 7,
  },
  keyValueLabel: { fontSize: 14, color: colors.muted, flexShrink: 0 },
  keyValueValue: {
    fontSize: 14,
    color: colors.ink,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },

  listRow: {
    minHeight: 62,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  listRowPressed: { backgroundColor: colors.surfaceMuted },
  listRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  listIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listTitle: { fontSize: 15.5, fontWeight: '600', color: colors.ink },
  listSubtitle: { fontSize: 12.5, color: colors.muted, marginTop: 2, lineHeight: 17 },

  emptyState: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  emptyMessage: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 300,
  },
  emptyAction: { marginTop: spacing.sm, alignSelf: 'stretch' },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.redSoft,
    borderWidth: 1,
    borderColor: '#F3C6C6',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: { fontSize: 13.5, color: colors.redDark, lineHeight: 19 },
  errorRetry: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.redDark,
    marginTop: 4,
    textDecorationLine: 'underline',
  },

  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  loadingText: { fontSize: 14, color: colors.muted },

  chip: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.greenSoft, borderColor: colors.green },
  chipSelectedAmber: { backgroundColor: colors.amberSoft, borderColor: colors.amber },
  chipText: { fontSize: 13.5, fontWeight: '600', color: colors.inkSoft },
  chipTextSelected: { color: colors.greenDark },
  chipTextAmber: { color: colors.amber },

  choiceRow: { flexDirection: 'row', gap: spacing.sm },
  choice: {
    flex: 1,
    gap: 4,
    minHeight: 84,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  choiceSelected: { borderColor: colors.green, backgroundColor: colors.greenSoft },
  choiceLabel: { fontSize: 14.5, fontWeight: '700', color: colors.inkSoft },
  choiceLabelSelected: { color: colors.greenDark },
  choiceDescription: { fontSize: 11.5, color: colors.muted, lineHeight: 15 },
});
