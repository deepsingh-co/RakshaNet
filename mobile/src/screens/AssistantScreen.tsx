import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Badge,
  Button,
  Card,
  Chip,
  ErrorBanner,
  Field,
  PageHeader,
  Screen,
  SectionHeader,
  SeverityBadge,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import {
  ApiRequestError,
  fetchSafetyStatus,
  interpretSafetyMessage,
  transcribeSafetyAudio,
} from '../lib/api';
import {
  MAX_RECORDING_MS,
  MIN_RECORDING_MS,
  VoicePreparationError,
  formatDuration,
  prepareVoiceUpload,
} from '../lib/voice';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import type {
  GnaniTranscription,
  SafetyIntent,
  SafetyInterpretResponse,
  SafetyStatusResponse,
  SafetyTranscribeResponse,
} from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Assistant'>;

type Phase = 'idle' | 'recording' | 'processing';
type LanguageKey = 'auto' | 'hi' | 'en' | 'mr';
type Source = 'voice' | 'text';

interface AssistantResult {
  interpretation: SafetyInterpretResponse['interpretation'];
  transcript: string;
  transcription?: GnaniTranscription;
  source: Source;
}

const LANGUAGES: Array<{ key: LanguageKey; label: string; code: string }> = [
  { key: 'auto', label: 'Auto', code: 'indic-auto' },
  { key: 'hi', label: 'हिंदी', code: 'hi-IN' },
  { key: 'en', label: 'English', code: 'en-IN' },
  { key: 'mr', label: 'मराठी', code: 'mr-IN' },
];

const INTENT_LABELS: Record<SafetyIntent, string> = {
  EMERGENCY_SOS: 'Immediate danger',
  SHARE_LOCATION: 'Share location',
  START_JOURNEY: 'Start a journey',
  CHECK_IN: 'Check in as safe',
  CALL_CONTACT: 'Call a trusted contact',
  CANCEL_SOS: 'Cancel an alert',
  GENERAL_HELP: 'Question or guidance',
  UNKNOWN: 'Not understood',
};

const LANGUAGE_NAMES: Record<string, string> = {
  'indic-auto': 'Auto-detected',
  'hi-IN': 'Hindi (हिंदी)',
  'en-IN': 'English',
  'mr-IN': 'Marathi (मराठी)',
  'hi-IN+en-IN': 'Hindi + English',
  'bn-IN': 'Bengali (বাংলা)',
  'gu-IN': 'Gujarati (ગુજરાતી)',
  'kn-IN': 'Kannada (ಕನ್ನಡ)',
  'ml-IN': 'Malayalam (മലയാളം)',
  'pa-IN': 'Punjabi (ਪੰਜਾਬੀ)',
  'ta-IN': 'Tamil (தமிழ்)',
  'te-IN': 'Telugu (తెలుగు)',
};

const TEXT_PROMPTS = [
  'Mujhe ghar jaana hai.',
  'Koi mujhe peeche se follow kar raha hai',
  'Meri location share karo',
];

function languageLabel(code: string | null | undefined): string {
  if (!code) return 'Unknown';
  return LANGUAGE_NAMES[code] ?? code;
}

function friendlyError(error: unknown): { message: string; code: string } {
  if (error instanceof VoicePreparationError) {
    return { message: error.message, code: error.code };
  }
  if (error instanceof ApiRequestError) {
    const code = error.code;
    switch (code) {
      case 'NETWORK_ERROR':
        return {
          message:
            'Cannot reach the voice service. Check your connection. SOS and offline reports still work from the Home screen.',
          code,
        };
      case 'AI_MODE_DISABLED':
      case 'GNANI_NOT_CONFIGURED':
        return {
          message:
            'Voice transcription is not enabled on this server. You can still type, call 112, or use the SOS button.',
          code,
        };
      case 'GNANI_AUTH_FAILED':
      case 'GNANI_SCOPE_NOT_ALLOWED':
      case 'GNANI_INSUFFICIENT_CREDIT':
        return {
          message:
            'The voice provider rejected the server credentials. Voice is unavailable until the operator fixes the Gnani account. SOS still works.',
          code,
        };
      case 'GNANI_RATE_LIMITED':
        return { message: 'Too many voice requests. Wait a moment and try again.', code };
      case 'GNANI_TIMEOUT':
        return {
          message: 'The voice provider took too long to answer. Try again or type your message.',
          code,
        };
      case 'GNANI_UNAVAILABLE':
        return {
          message:
            'The voice provider is temporarily unavailable. Try again shortly, type your message, or use SOS.',
          code,
        };
      case 'GNANI_UNSUPPORTED_AUDIO':
      case 'UNSUPPORTED_AUDIO':
        return {
          message:
            'This recording format could not be read. Try recording again — if it keeps failing, type your message instead.',
          code,
        };
      case 'AUDIO_TOO_LARGE':
        return { message: 'The recording is too large. Keep it under 30 seconds.', code };
      case 'EMPTY_TRANSCRIPT':
        return {
          message:
            'No speech was detected. Try again in a quieter place and speak clearly, or type your message.',
          code,
        };
      case 'AUDIO_REQUIRED':
      case 'INVALID_AUDIO_UPLOAD':
        return { message: 'The recording was not attached correctly. Please try again.', code };
      default:
        return { message: error.message, code };
    }
  }
  return {
    message: 'The voice assistant could not process that. Try again or use the SOS button.',
    code: 'UNKNOWN_ERROR',
  };
}

function RecordingPulse({ active }: { active: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) {
      scale.setValue(1);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.22,
          duration: 700,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 700,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, scale]);

  return (
    <Animated.View
      style={[
        styles.pulseRing,
        !active && styles.pulseRingIdle,
        { transform: [{ scale }] },
      ]}
    />
  );
}

export function AssistantScreen({ navigation }: Props) {
  const { offlineSession } = useAuth();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 200);

  const [phase, setPhase] = useState<Phase>('idle');
  const [language, setLanguage] = useState<LanguageKey>('auto');
  const [result, setResult] = useState<AssistantResult | null>(null);
  const [error, setError] = useState<{ message: string; code: string } | null>(null);
  const [status, setStatus] = useState<SafetyStatusResponse | null>(null);
  const [textFallback, setTextFallback] = useState(false);
  const [text, setText] = useState('');
  const [callError, setCallError] = useState<string | null>(null);

  const stoppingRef = useRef(false);
  const lastSourceRef = useRef<Source>('voice');

  const languageCode = LANGUAGES.find((entry) => entry.key === language)?.code ?? 'indic-auto';
  const recording = phase === 'recording';
  const processing = phase === 'processing';
  const voiceAvailable = status?.capabilities.speechToTextAvailable ?? false;
  const voiceKnownUnavailable = status !== null && !voiceAvailable;

  useEffect(() => {
    if (offlineSession) return undefined;
    let active = true;
    fetchSafetyStatus()
      .then((value) => {
        if (active) setStatus(value);
      })
      .catch(() => {
        // The status call is informational only; a failure must not block SOS.
      });
    return () => {
      active = false;
    };
  }, [offlineSession]);

  const stopAndTranscribe = useCallback(async () => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;

    const durationMs = recorderState.durationMillis;
    lastSourceRef.current = 'voice';
    try {
      await recorder.stop();
      const uri = recorder.uri;

      if (durationMs < MIN_RECORDING_MS) {
        setPhase('idle');
        setError({
          message: 'That recording was too short. Hold the microphone and describe what is happening.',
          code: 'RECORDING_TOO_SHORT',
        });
        return;
      }
      if (!uri) {
        setPhase('idle');
        setError({ message: 'The recording produced no audio file. Please try again.', code: 'RECORDING_MISSING' });
        return;
      }

      setPhase('processing');
      setError(null);

      const upload = await prepareVoiceUpload(uri);
      const response = await transcribeSafetyAudio(upload, languageCode);
      setResult({
        interpretation: response.interpretation,
        transcript: response.transcription.transcript,
        transcription: response.transcription,
        source: 'voice',
      });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setPhase('idle');
      stoppingRef.current = false;
    }
  }, [languageCode, recorder, recorderState.durationMillis]);

  useEffect(() => {
    if (phase === 'recording' && recorderState.durationMillis >= MAX_RECORDING_MS) {
      void stopAndTranscribe();
    }
  }, [phase, recorderState.durationMillis, stopAndTranscribe]);

  async function startRecording() {
    if (phase !== 'idle' || offlineSession) return;
    setError(null);
    setCallError(null);
    setResult(null);
    lastSourceRef.current = 'voice';

    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError({
          message:
            'Microphone permission is needed for voice input. Enable it in your device settings, or type your message instead.',
          code: 'MIC_PERMISSION_DENIED',
        });
        return;
      }

      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setPhase('recording');
    } catch {
      setPhase('idle');
      setError({
        message:
          'This device could not start recording. Check microphone permissions, or type your message instead.',
        code: 'RECORDING_FAILED',
      });
    }
  }

  function onMicrophonePress() {
    if (recording) {
      void stopAndTranscribe();
      return;
    }
    void startRecording();
  }

  async function askText() {
    if (text.trim().length < 2) {
      setError({ message: 'Write at least a few words about what is happening.', code: 'TEXT_TOO_SHORT' });
      return;
    }
    setPhase('processing');
    setError(null);
    setCallError(null);
    lastSourceRef.current = 'text';
    try {
      const response = await interpretSafetyMessage({
        text,
        language: languageCode === 'indic-auto' ? 'auto' : languageCode,
      });
      setResult({
        interpretation: response.interpretation,
        transcript: text,
        source: 'text',
      });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setPhase('idle');
    }
  }

  async function call112() {
    setCallError(null);
    try {
      await Linking.openURL('tel:112');
    } catch {
      setCallError('This device could not open the dialer. Please dial 112 manually.');
    }
  }

  function retry() {
    setError(null);
    if (lastSourceRef.current === 'text' && text.trim().length >= 2) {
      void askText();
    } else {
      void startRecording();
    }
  }

  const interpretation = result?.interpretation;
  const urgent =
    interpretation?.severity === 'CRITICAL' ||
    interpretation?.severity === 'HIGH' ||
    interpretation?.intent === 'EMERGENCY_SOS';
  const remainingMs = Math.max(0, MAX_RECORDING_MS - recorderState.durationMillis);

  return (
    <Screen
      header={
        <PageHeader
          title="Safety assistant"
          subtitle="Voice guidance, not a dispatcher"
          onBack={() => navigation.goBack()}
        />
      }
      contentStyle={styles.content}
    >
      <Card tone="warning" style={styles.disclaimer}>
        <View style={styles.row}>
          <Ionicons name="information-circle-outline" size={22} color={colors.amber} />
          <View style={styles.flex}>
            <Text style={styles.disclaimerTitle}>Guidance only</Text>
            <Text style={styles.disclaimerBody}>
              This assistant cannot send police or an ambulance. For immediate danger, call 112 or
              hold the SOS button. It never creates an alert without your confirmation.
            </Text>
          </View>
        </View>
      </Card>

      {offlineSession ? (
        <Card tone="warning">
          <Text style={styles.offlineText}>
            You are offline, so voice and text answers are unavailable. Your SOS and reports still
            save on this phone and send when the network returns.
          </Text>
        </Card>
      ) : null}

      {callError ? <ErrorBanner message={callError} /> : null}

      <Card style={styles.section}>
        <SectionHeader
          title="Speak what is happening"
          caption="Hindi, English, Marathi or mixed speech. Audio is sent once for transcription and not stored."
        />

        <View style={styles.languageRow}>
          <Text style={styles.languageLabel}>Language</Text>
          <View style={styles.languageChips}>
            {LANGUAGES.map((entry) => (
              <Chip
                key={entry.key}
                label={entry.label}
                selected={language === entry.key}
                onPress={() => {
                  setLanguage(entry.key);
                  setError(null);
                }}
              />
            ))}
          </View>
        </View>

        <View style={styles.micArea}>
          <View style={styles.micWrap}>
            <RecordingPulse active={recording} />
            <Pressable
              onPress={onMicrophonePress}
              disabled={processing || Boolean(offlineSession)}
              accessibilityRole="button"
              accessibilityLabel={recording ? 'Stop recording' : 'Start voice recording'}
              accessibilityState={{ disabled: processing || Boolean(offlineSession), busy: processing }}
              style={({ pressed }) => [
                styles.micButton,
                recording && styles.micButtonRecording,
                (processing || offlineSession) && styles.micButtonDisabled,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons
                name={recording ? 'stop' : processing ? 'hourglass-outline' : 'mic'}
                size={38}
                color={colors.white}
              />
            </Pressable>
          </View>

          <Text style={styles.micStatus}>
            {recording
              ? `Listening… ${formatDuration(recorderState.durationMillis)} / ${formatDuration(MAX_RECORDING_MS)}`
              : processing
                ? 'Transcribing and checking your words…'
                : offlineSession
                  ? 'Voice needs a connection'
                  : 'Tap the microphone and speak'}
          </Text>
          {recording ? (
            <Text style={styles.micHint}>
              Stops automatically in {formatDuration(remainingMs)}. Tap stop when you are done.
            </Text>
          ) : (
            <Text style={styles.micHint}>Maximum 30 seconds per recording.</Text>
          )}
        </View>

        {recording ? (
          <Button label="Stop and get guidance" icon="stop-circle-outline" variant="danger" onPress={() => void stopAndTranscribe()} />
        ) : null}

        {voiceKnownUnavailable && !offlineSession ? (
          <View style={styles.noticeRow}>
            <Ionicons name="cloud-offline-outline" size={16} color={colors.amber} />
            <Text style={styles.noticeText}>
              Live voice transcription is not configured on this server. Typing still works.
            </Text>
          </View>
        ) : status && voiceAvailable ? (
          <View style={styles.noticeRow}>
            <Ionicons name="checkmark-circle-outline" size={16} color={colors.green} />
            <Text style={styles.noticeText}>
              Gnani Prisma {status.provider.model} is configured for speech-to-text. Intent is
              classified locally.
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={() => {
            setTextFallback((value) => !value);
            setError(null);
          }}
          accessibilityRole="button"
          style={styles.linkButton}
        >
          <Ionicons name="keypad-outline" size={16} color={colors.greenDark} />
          <Text style={styles.linkText}>
            {textFallback ? 'Hide typing option' : 'Cannot speak? Type instead'}
          </Text>
        </Pressable>

        {textFallback ? (
          <View style={styles.textFallback}>
            <Field
              label="Your message"
              value={text}
              onChangeText={(value) => {
                setText(value);
                if (error) setError(null);
              }}
              placeholder="Mujhe ghar jaana hai…"
              multiline
              maxLength={1000}
              hint={`${text.length}/1000 characters · classified locally, not stored in audit`}
              editable={!processing && !recording}
            />
            <View style={styles.promptWrap}>
              {TEXT_PROMPTS.map((prompt) => (
                <Chip
                  key={prompt}
                  label={prompt}
                  selected={text === prompt}
                  onPress={() => {
                    setText(prompt);
                    setError(null);
                  }}
                />
              ))}
            </View>
            <Button
              label="Get safety guidance"
              icon="sparkles-outline"
              variant="secondary"
              onPress={() => void askText()}
              loading={processing}
              disabled={processing || recording || text.trim().length < 2}
            />
          </View>
        ) : null}
      </Card>

      {error ? (
        <Card tone="danger" style={styles.section}>
          <ErrorBanner message={error.message} />
          <Text style={styles.errorCode}>Code: {error.code}</Text>
          <Button label="Try again" icon="refresh" variant="secondary" onPress={retry} />
        </Card>
      ) : null}

      {interpretation && result ? (
        <Card tone={urgent ? 'danger' : 'success'} style={styles.section}>
          <View style={styles.resultTop}>
            <View style={styles.flex}>
              <Text style={styles.resultLabel}>{INTENT_LABELS[interpretation.intent]}</Text>
              <Text style={styles.resultMeta}>
                {Math.round(interpretation.confidence * 100)}% confidence ·{' '}
                {languageLabel(interpretation.language)}
              </Text>
            </View>
            <SeverityBadge severity={interpretation.severity} />
          </View>

          {result.transcript ? (
            <View style={styles.transcriptBox}>
              <Text style={styles.transcriptLabel}>
                {result.source === 'voice' ? 'You said' : 'Your message'}
              </Text>
              <Text style={styles.transcriptText}>“{result.transcript}”</Text>
              {result.transcription ? (
                <Text style={styles.transcriptMeta}>
                  Gnani {result.transcription.model} · {languageLabel(result.transcription.detectedLanguageCode)} ·
                  request {result.transcription.requestId.slice(0, 8)}
                </Text>
              ) : null}
            </View>
          ) : null}

          <Text style={styles.reply}>{interpretation.reply}</Text>

          {interpretation.ambiguous ? (
            <View style={styles.ambiguousBox}>
              <Ionicons name="help-circle-outline" size={18} color={colors.amber} />
              <Text style={styles.ambiguousText}>
                This may not have been understood correctly. Please confirm before acting, or add
                more detail.
              </Text>
            </View>
          ) : null}

          <View style={styles.truthBox}>
            <Badge
              label={
                result.source === 'voice'
                  ? 'Gnani transcript · local intent'
                  : 'Local classifier · no cloud AI'
              }
              tone={result.source === 'voice' ? 'green' : 'slate'}
              dot
            />
            <Text style={styles.truthText}>
              {result.source === 'voice'
                ? 'The transcript came from Gnani Prisma v3.0. The intent was classified on our server, not by Gnani. No alert was sent.'
                : 'This is deterministic on-server classification, not a cloud AI answer. No alert was sent.'}
            </Text>
          </View>

          {interpretation.requiresConfirmation ? (
            <Text style={styles.confirmNote}>
              Nothing has been sent to your contacts. Every real action below opens a screen where
              you confirm it yourself.
            </Text>
          ) : null}

          <View style={styles.actions}>
            {urgent ? (
              <Button label="Call 112 now" icon="call" variant="danger" onPress={() => void call112()} />
            ) : null}
            <Button
              label="Open SOS button"
              icon="alert-circle-outline"
              variant="secondary"
              onPress={() => navigation.navigate('Tabs', { screen: 'Home' })}
            />
            {interpretation.intent === 'CALL_CONTACT' ||
            interpretation.intent === 'SHARE_LOCATION' ? (
              <Button
                label="Open trusted contacts"
                icon="people-outline"
                variant="secondary"
                onPress={() => navigation.navigate('Contacts')}
              />
            ) : null}
            <Button
              label="Report this incident"
              icon="megaphone-outline"
              variant="secondary"
              onPress={() => navigation.navigate('Report')}
            />
          </View>
          <Text style={styles.confirmNote}>
            These actions are yours to confirm. A report follows the same offline-first queue as
            every other alert.
          </Text>
        </Card>
      ) : null}

      <Pressable
        onPress={() => void call112()}
        accessibilityRole="button"
        accessibilityLabel="Call emergency services on 112"
        style={({ pressed }) => [styles.callFooter, pressed && { opacity: 0.75 }]}
      >
        <Ionicons name="call-outline" size={18} color={colors.redDark} />
        <Text style={styles.callFooterText}>
          Life-threatening emergency? Call 112 directly. The assistant does not replace emergency
          services.
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  section: { gap: spacing.sm },
  disclaimer: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  flex: { flex: 1 },
  disclaimerTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
  disclaimerBody: { fontSize: 13, lineHeight: 19, color: colors.inkSoft, marginTop: 2 },
  offlineText: { fontSize: 13, lineHeight: 19, color: colors.inkSoft },
  languageRow: { gap: spacing.xs },
  languageLabel: { fontSize: 12, fontWeight: '700', color: colors.inkSoft },
  languageChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  micArea: { alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.xs },
  micWrap: {
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.redSoft,
  },
  pulseRingIdle: { backgroundColor: 'transparent' },
  micButton: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonRecording: { backgroundColor: colors.red },
  micButtonDisabled: { backgroundColor: colors.muted },
  micStatus: { fontSize: 15, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  micHint: { fontSize: 12, color: colors.muted, textAlign: 'center' },
  noticeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 17, color: colors.inkSoft },
  linkButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs },
  linkText: { fontSize: 13, fontWeight: '700', color: colors.greenDark },
  textFallback: { gap: spacing.sm, marginTop: spacing.xs },
  promptWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  errorCode: { fontSize: 11, color: colors.muted, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
  resultTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  resultLabel: { fontSize: 18, fontWeight: '800', color: colors.ink },
  resultMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  transcriptBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 2,
    marginTop: spacing.xs,
  },
  transcriptLabel: { fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase' },
  transcriptText: { fontSize: 15, lineHeight: 22, color: colors.ink },
  transcriptMeta: { fontSize: 11, color: colors.muted, marginTop: 2 },
  reply: { fontSize: 15, lineHeight: 22, color: colors.ink, marginTop: spacing.xs },
  ambiguousBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.amberSoft,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  ambiguousText: { flex: 1, fontSize: 12, lineHeight: 18, color: colors.amber },
  truthBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  truthText: { fontSize: 12, lineHeight: 18, color: colors.inkSoft },
  actions: { gap: spacing.sm, marginTop: spacing.xs },
  confirmNote: { fontSize: 11, lineHeight: 16, color: colors.muted },
  callFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  callFooterText: { flex: 1, fontSize: 12, lineHeight: 18, color: colors.redDark },
});
