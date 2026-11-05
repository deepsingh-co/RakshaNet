import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Button,
  ChoiceRow,
  ErrorBanner,
  Field,
  PageHeader,
  Screen,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

interface Errors {
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirm?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9][0-9\s-]{5,19}$/;

export function RegisterScreen({ navigation }: Props) {
  const { signUp, busy, error, clearError } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [accountType, setAccountType] = useState<'INDIVIDUAL' | 'GUARDIAN'>('INDIVIDUAL');
  const [errors, setErrors] = useState<Errors>({});

  function validate(): boolean {
    const next: Errors = {};
    if (fullName.trim().length < 2) next.fullName = 'Enter your full name';
    if (!EMAIL.test(email.trim())) next.email = 'Enter a valid email address';
    if (!PHONE.test(phone.trim())) next.phone = 'Enter a valid phone number';
    if (password.length < 8) next.password = 'Use at least 8 characters';
    else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      next.password = 'Include at least one letter and one number';
    }
    if (confirm !== password) next.confirm = 'Passwords do not match';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    clearError();
    if (!validate()) return;
    Keyboard.dismiss();
    try {
      await signUp({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        accountType,
      });
    } catch {
      // Provider error is rendered below.
    }
  }

  return (
    <Screen
      header={<PageHeader title="Create account" onBack={() => navigation.goBack()} />}
      contentStyle={styles.content}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <View style={styles.intro}>
          <Text style={styles.title}>Your safety circle starts here</Text>
          <Text style={styles.subtitle}>
            One account for SOS alerts, live location and trusted contacts. You stay in control of
            who can see what.
          </Text>
        </View>

        {error ? <ErrorBanner message={error} /> : null}

        <View style={styles.form}>
          <Field
            label="Full name"
            value={fullName}
            onChangeText={(value) => {
              setFullName(value);
              setErrors((previous) => ({ ...previous, fullName: undefined }));
            }}
            placeholder="Ananya Sharma"
            autoCapitalize="words"
            autoComplete="name"
            error={errors.fullName}
          />
          <Field
            label="Email"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setErrors((previous) => ({ ...previous, email: undefined }));
            }}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email}
          />
          <Field
            label="Phone"
            value={phone}
            onChangeText={(value) => {
              setPhone(value);
              setErrors((previous) => ({ ...previous, phone: undefined }));
            }}
            placeholder="+91 98765 43210"
            keyboardType="phone-pad"
            autoComplete="tel"
            error={errors.phone}
            hint="Used for your account. Trusted contacts are added separately."
          />
          <Field
            label="Password"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setErrors((previous) => ({ ...previous, password: undefined }));
            }}
            placeholder="At least 8 characters"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            error={errors.password}
            hint="Include a letter and a number."
          />
          <Field
            label="Confirm password"
            value={confirm}
            onChangeText={(value) => {
              setConfirm(value);
              setErrors((previous) => ({ ...previous, confirm: undefined }));
            }}
            placeholder="Re-enter your password"
            secureTextEntry
            autoCapitalize="none"
            error={errors.confirm}
          />

          <View style={styles.accountType}>
            <Text style={styles.accountLabel}>I am creating this account as</Text>
            <ChoiceRow
              value={accountType}
              onChange={setAccountType}
              options={[
                {
                  value: 'INDIVIDUAL',
                  label: 'For myself',
                  description: 'Personal safety and trusted contacts',
                  icon: 'person-outline',
                },
                {
                  value: 'GUARDIAN',
                  label: 'A guardian',
                  description: 'Protect children or family members',
                  icon: 'people-outline',
                },
              ]}
            />
            <View style={styles.note}>
              <Ionicons name="information-circle-outline" size={16} color={colors.blue} />
              <Text style={styles.noteText}>
                Guardian accounts never receive admin access. A child must consent before a link is
                verified.
              </Text>
            </View>
          </View>

          <Button
            label="Create my account"
            onPress={() => void submit()}
            loading={busy}
            size="lg"
            icon="shield-checkmark-outline"
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.md },
  keyboard: { gap: spacing.lg },
  intro: { gap: spacing.sm },
  title: { fontSize: 25, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 },
  subtitle: { fontSize: 14, lineHeight: 21, color: colors.muted },
  form: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  accountType: { gap: spacing.sm },
  accountLabel: { fontSize: 14, fontWeight: '600', color: colors.inkSoft },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.blueSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  noteText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: colors.inkSoft },
});
