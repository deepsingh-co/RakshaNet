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
  SectionHeader,
  SwitchRow,
} from '../components/ui';
import {
  ApiRequestError,
  createContact,
  requestContactVerification,
} from '../lib/api';
import { relationshipLabel } from '../lib/format';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import { RELATIONSHIPS, type Relationship } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'ContactForm'>;

const PHONE = /^\+?[0-9][0-9\s-]{5,19}$/;

export function ContactFormScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState<Relationship>('FRIEND');
  const [sms, setSms] = useState(true);
  const [whatsapp, setWhatsapp] = useState(true);
  const [push, setPush] = useState(true);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = 'Enter the contact’s name';
    if (!PHONE.test(phone.trim())) next.phone = 'Enter a valid phone number';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    setError(null);
    try {
      const created = await createContact({
        name: name.trim(),
        phone: phone.trim(),
        relationship,
        email: email.trim() || undefined,
        notificationPreferences: { sms, whatsapp, push },
      });
      try {
        const verification = await requestContactVerification(created.contact.id);
        navigation.replace('VerifyContact', {
          contactId: created.contact.id,
          contactName: created.contact.name,
          devCode: verification.devCode,
        });
      } catch {
        // The contact is saved; verification can be started again later.
        navigation.goBack();
      }
    } catch (err) {
      setError(
        err instanceof ApiRequestError && err.code === 'NETWORK_ERROR'
          ? 'You are offline. Adding a contact needs a connection.'
          : err instanceof Error
            ? err.message
            : 'Could not add the contact.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      header={
        <PageHeader
          title="Add trusted contact"
          subtitle="Only verified people receive alerts"
          onBack={() => navigation.goBack()}
        />
      }
      contentStyle={styles.content}
    >
      {error ? <ErrorBanner message={error} /> : null}

      <Card style={styles.card}>
        <Field
          label="Full name"
          value={name}
          onChangeText={(value) => {
            setName(value);
            setErrors((previous) => ({ ...previous, name: undefined }));
          }}
          placeholder="e.g. Rohan Sharma"
          autoCapitalize="words"
          error={errors.name}
        />
        <Field
          label="Phone number"
          value={phone}
          onChangeText={(value) => {
            setPhone(value);
            setErrors((previous) => ({ ...previous, phone: undefined }));
          }}
          placeholder="+91 98765 43210"
          keyboardType="phone-pad"
          error={errors.phone}
          hint="The verification code is sent to this number."
        />
        <Field
          label="Email (optional)"
          value={email}
          onChangeText={setEmail}
          placeholder="contact@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </Card>

      <Card style={styles.card}>
        <SectionHeader title="Relationship" caption="Shown to responders for context." />
        <View style={styles.chips}>
          {RELATIONSHIPS.map((option) => (
            <Chip
              key={option}
              label={relationshipLabel(option)}
              selected={relationship === option}
              onPress={() => setRelationship(option)}
            />
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <SectionHeader
          title="How should we reach them?"
          caption="Console mode simulates these channels until providers are configured."
        />
        <SwitchRow
          label="SMS"
          description="Works on basic phones"
          value={sms}
          onValueChange={setSms}
        />
        <SwitchRow
          label="WhatsApp"
          description="Rich message with alert details"
          value={whatsapp}
          onValueChange={setWhatsapp}
        />
        <SwitchRow
          label="Push notification"
          description="If they install the SURAKSHA AI app"
          value={push}
          onValueChange={setPush}
        />
      </Card>

      <Card tone="info" style={styles.note}>
        <Ionicons name="information-circle-outline" size={18} color={colors.blue} />
        <Text style={styles.noteText}>
          After saving, a 6-digit verification code is generated. The contact must confirm it before
          they become eligible for emergency information.
        </Text>
      </Card>

      <Button
        label="Save and verify"
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
  card: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  noteText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: colors.inkSoft },
});
