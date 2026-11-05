import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, ErrorBanner, Field, Screen } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { signIn, busy, error, clearError } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);

  const identifierError = touched && identifier.trim().length < 3 ? 'Enter your email or phone' : null;
  const passwordError = touched && password.length === 0 ? 'Enter your password' : null;

  async function submit() {
    setTouched(true);
    if (identifier.trim().length < 3 || password.length === 0) return;
    Keyboard.dismiss();
    try {
      await signIn(identifier, password);
    } catch {
      // The provider shows the server's message.
    }
  }

  return (
    <Screen scroll edges={['top', 'bottom']} contentStyle={styles.content}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Ionicons name="shield-checkmark" size={34} color={colors.white} />
          </View>
          <Text style={styles.name}>SURAKSHA AI</Text>
          <Text style={styles.tagline}>Safety command in your pocket</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.subheading}>
            Sign in to send alerts, reach trusted contacts and stay connected with your guardian.
          </Text>

          {error ? <ErrorBanner message={error} /> : null}

          <Field
            label="Email or phone"
            value={identifier}
            onChangeText={(value) => {
              setIdentifier(value);
              clearError();
            }}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="username"
            error={identifierError}
          />
          <Field
            label="Password"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              clearError();
            }}
            placeholder="Your password"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            error={passwordError}
          />

          <Button
            label="Sign in"
            onPress={() => void submit()}
            loading={busy}
            size="lg"
            icon="log-in-outline"
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>New to SURAKSHA AI?</Text>
            <Pressable onPress={() => navigation.navigate('Register')} accessibilityRole="button">
              <Text style={styles.switchLink}>Create an account</Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={() => void Linking.openURL('tel:112')}
          accessibilityRole="button"
          accessibilityLabel="Call emergency services on 112"
          style={({ pressed }) => [styles.emergency, pressed && { opacity: 0.75 }]}
        >
          <Ionicons name="call" size={18} color={colors.redDark} />
          <Text style={styles.emergencyText}>
            Life-threatening emergency? Call 112 directly. SURAKSHA AI does not replace emergency
            services.
          </Text>
        </Pressable>

        <Text style={styles.privacy}>
          Your refresh token is stored in the device keychain, not in app storage.
        </Text>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.xl },
  keyboard: { gap: spacing.xl },
  brand: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.lg },
  logo: {
    width: 74,
    height: 74,
    borderRadius: 24,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: typography.title,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: colors.ink,
  },
  tagline: { fontSize: 14, color: colors.muted },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  heading: { fontSize: 22, fontWeight: '700', color: colors.ink },
  subheading: { fontSize: 14, lineHeight: 21, color: colors.muted, marginTop: -spacing.sm },
  switchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  switchText: { fontSize: 14, color: colors.muted },
  switchLink: { fontSize: 14, fontWeight: '700', color: colors.greenDark },
  emergency: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.redSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  emergencyText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.redDark,
    fontWeight: '600',
  },
  privacy: {
    fontSize: 11.5,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 17,
  },
});
