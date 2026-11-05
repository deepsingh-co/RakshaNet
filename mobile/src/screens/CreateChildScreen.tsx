import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Button,
  Card,
  Chip,
  ErrorBanner,
  Field,
  PageHeader,
  Screen,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { ApiRequestError, createChildAccount } from '../lib/api';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateChild'>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9][0-9\s-]{5,19}$/;
const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'mr', label: 'मराठी' },
  { value: 'ta', label: 'தமிழ்' },
  { value: 'te', label: 'తెలుగు' },
  { value: 'bn', label: 'বাংলা' },
];

export function CreateChildScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [language, setLanguage] = useState('en');
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    phone?: string;
    password?: string;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ fullName: string; phoneMasked: string } | null>(null);

  if (user?.accountType !== 'GUARDIAN') {
    return (
      <Screen
        header={<PageHeader title="Create child account" onBack={() => navigation.goBack()} />}
      >
        <Card tone="warning" style={styles.noticeCard}>
          <Ionicons name="shield-outline" size={20} color={colors.amber} />
          <Text style={styles.noticeText}>
            Only guardian accounts can create a child account. Ask an administrator if you need to
            change your account type; guardians never receive admin access.
          </Text>
        </Card>
      </Screen>
    );
  }

  if (created) {
    return (
      <Screen
        header={<PageHeader title="Child account created" onBack={() => navigation.goBack()} />}
        contentStyle={styles.content}
      >
        <Card tone="success" style={styles.successCard}>
          <View style={styles.successIcon}>
            <Ionicons name="people" size={30} color={colors.white} />
          </View>
          <Text style={styles.successTitle}>{created.fullName} is linked</Text>
          <Text style={styles.successBody}>
            The guardian link is verified because you created the account. The child can sign in
            with the email and password you set. Phone {created.phoneMasked} is not verified yet.
          </Text>
          <Button
            label="Back to guardian links"
            onPress={() => navigation.goBack()}
            icon="shield-outline"
          />
        </Card>
        <Text style={styles.footer}>
          Share the password with the child through a safe channel. They should change it after
          signing in.
        </Text>
      </Screen>
    );
  }

  async function submit() {
    const next: typeof errors = {};
    if (fullName.trim().length < 2) next.fullName = 'Enter the child’s full name';
    if (!EMAIL.test(email.trim())) next.email = 'Enter a valid email address';
    if (!PHONE.test(phone.trim())) next.phone = 'Enter a valid phone number';
    if (password.length < 8) next.password = 'Use at least 8 characters with a letter and number';
    else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      next.password = 'Include at least one letter and one number';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    setError(null);
    try {
      const response = await createChildAccount({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        preferredLanguage: language,
      });
      setCreated({
        fullName: response.child.fullName,
        phoneMasked: response.child.phoneMasked,
      });
    } catch (err) {
      setError(
        err instanceof ApiRequestError && err.code === 'NETWORK_ERROR'
          ? 'You are offline. Creating a child account needs a connection.'
          : err instanceof Error
            ? err.message
            : 'Could not create the child account.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      header={
        <PageHeader
          title="Create child account"
          subtitle="Verified guardian link from the start"
          onBack={() => navigation.goBack()}
        />
      }
      contentStyle={styles.content}
    >
      {error ? <ErrorBanner message={error} /> : null}

      <Card tone="info" style={styles.noticeCard}>
        <Ionicons name="information-circle-outline" size={20} color={colors.blue} />
        <Text style={styles.noticeText}>
          You are creating an account for a child. The link is automatically verified because you
          control the credentials. The child can revoke it at any time after signing in.
        </Text>
      </Card>

      <Card style={styles.card}>
        <Field
          label="Child’s full name"
          value={fullName}
          onChangeText={(value) => {
            setFullName(value);
            setErrors((previous) => ({ ...previous, fullName: undefined }));
          }}
          placeholder="Meera Sharma"
          autoCapitalize="words"
          error={errors.fullName}
        />
        <Field
          label="Email"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setErrors((previous) => ({ ...previous, email: undefined }));
          }}
          placeholder="child@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
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
          error={errors.phone}
        />
        <Field
          label="Temporary password"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setErrors((previous) => ({ ...previous, password: undefined }));
          }}
          placeholder="At least 8 characters"
          secureTextEntry
          autoCapitalize="none"
          error={errors.password}
          hint="Share it safely. The child should change it after first sign-in."
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
      </Card>

      <Button
        label="Create and link child"
        onPress={() => void submit()}
        loading={busy}
        size="lg"
        icon="person-add-outline"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingTop: spacing.sm },
  noticeCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  noticeText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: colors.inkSoft },
  card: { gap: spacing.md },
  label: { fontSize: 14, fontWeight: '600', color: colors.inkSoft },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  successCard: { gap: spacing.md, alignItems: 'center', paddingVertical: spacing.xl },
  successIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
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
  footer: { fontSize: 11.5, lineHeight: 17, color: colors.muted, textAlign: 'center' },
});
