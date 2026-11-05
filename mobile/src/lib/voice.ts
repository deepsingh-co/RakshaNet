import { Platform } from 'react-native';

/**
 * Voice capture helpers.
 *
 * expo-audio records AAC/M4A on Android and iOS — a format Gnani accepts.
 * Browsers record WebM, which Gnani does not accept, so on web we decode the
 * clip and re-encode it as 16-bit PCM WAV before upload.
 *
 * No audio is written to the backend database. The clip is held in memory for
 * one request and then discarded.
 */

/** Gnani's documented maximum clip length. */
export const MAX_RECORDING_MS = 30_000;
/** Below this the clip is treated as an accidental tap, not speech. */
export const MIN_RECORDING_MS = 600;

export const VOICE_WAV_SAMPLE_RATE = 16_000;

export type VoiceUpload =
  | { kind: 'blob'; blob: Blob; filename: string; mimeType: string }
  | { kind: 'file'; uri: string; filename: string; mimeType: string };

export class VoicePreparationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'VoicePreparationError';
    this.code = code;
  }
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function recordingFileName(extension: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `suraksha-voice-${stamp}${extension}`;
}

/**
 * Turn expo-audio's recording URI into something the API can upload.
 * Native recordings stay as M4A; web recordings are converted to WAV.
 */
export async function prepareVoiceUpload(uri: string): Promise<VoiceUpload> {
  if (!uri) {
    throw new VoicePreparationError('RECORDING_MISSING', 'The recording produced no audio file.');
  }

  if (Platform.OS !== 'web') {
    return {
      kind: 'file',
      uri,
      filename: recordingFileName('.m4a'),
      mimeType: 'audio/mp4',
    };
  }

  const blob = await webRecordingToWav(uri);
  return {
    kind: 'blob',
    blob,
    filename: recordingFileName('.wav'),
    mimeType: 'audio/wav',
  };
}

/* ------------------------------------------------------------------ */
/* Web: WebM/Opus → mono 16 kHz PCM WAV                                */
/* ------------------------------------------------------------------ */

type BrowserAudioContext = {
  decodeAudioData(data: ArrayBuffer): Promise<AudioBuffer>;
  close?: () => Promise<void>;
};

type BrowserOfflineAudioContext = {
  createBufferSource(): {
    buffer: AudioBuffer | null;
    connect(node: unknown): void;
    start(when: number): void;
  };
  destination: unknown;
  startRendering(): Promise<AudioBuffer>;
};

function audioContextCtor(): (new () => BrowserAudioContext) | null {
  const scope = globalThis as unknown as {
    AudioContext?: new () => BrowserAudioContext;
    webkitAudioContext?: new () => BrowserAudioContext;
  };
  return scope.AudioContext ?? scope.webkitAudioContext ?? null;
}

function offlineContextCtor():
  | (new (channels: number, frames: number, sampleRate: number) => BrowserOfflineAudioContext)
  | null {
  const scope = globalThis as unknown as {
    OfflineAudioContext?: new (
      channels: number,
      frames: number,
      sampleRate: number,
    ) => BrowserOfflineAudioContext;
    webkitOfflineAudioContext?: new (
      channels: number,
      frames: number,
      sampleRate: number,
    ) => BrowserOfflineAudioContext;
  };
  return scope.OfflineAudioContext ?? scope.webkitOfflineAudioContext ?? null;
}

async function webRecordingToWav(uri: string): Promise<Blob> {
  const Context = audioContextCtor();
  if (!Context) {
    throw new VoicePreparationError(
      'WAV_CONVERSION_UNAVAILABLE',
      'This browser cannot decode the recording into a format Gnani accepts.',
    );
  }

  const response = await fetch(uri);
  const encoded = await response.arrayBuffer();
  if (encoded.byteLength === 0) {
    throw new VoicePreparationError('RECORDING_EMPTY', 'The recording is empty.');
  }

  const context = new Context();
  let decoded: AudioBuffer;
  try {
    // decodeAudioData detaches the buffer in some browsers, hence the copy.
    decoded = await context.decodeAudioData(encoded.slice(0));
  } catch {
    throw new VoicePreparationError(
      'WAV_CONVERSION_FAILED',
      'The recording could not be decoded on this browser.',
    );
  } finally {
    await context.close?.().catch(() => undefined);
  }

  const samples = await resampleToMono(decoded, VOICE_WAV_SAMPLE_RATE);
  return encodePcmWav(samples, VOICE_WAV_SAMPLE_RATE);
}

async function resampleToMono(buffer: AudioBuffer, sampleRate: number): Promise<Float32Array> {
  const Offline = offlineContextCtor();
  if (Offline) {
    const frames = Math.max(1, Math.ceil(buffer.duration * sampleRate));
    const offline = new Offline(1, frames, sampleRate);
    const source = offline.createBufferSource();
    source.buffer = buffer;
    source.connect(offline.destination);
    source.start(0);
    const rendered = await offline.startRendering();
    return rendered.getChannelData(0);
  }

  // Fallback: average channels then linearly resample.
  const channels = buffer.numberOfChannels;
  const length = buffer.length;
  const mono = new Float32Array(length);
  for (let channel = 0; channel < channels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i += 1) mono[i] += data[i]! / channels;
  }
  if (buffer.sampleRate === sampleRate) return mono;

  const targetLength = Math.max(1, Math.ceil((length * sampleRate) / buffer.sampleRate));
  const output = new Float32Array(targetLength);
  const ratio = buffer.sampleRate / sampleRate;
  for (let i = 0; i < targetLength; i += 1) {
    const position = i * ratio;
    const lower = Math.floor(position);
    const upper = Math.min(length - 1, lower + 1);
    const fraction = position - lower;
    output[i] = (mono[lower] ?? 0) * (1 - fraction) + (mono[upper] ?? 0) * fraction;
  }
  return output;
}

/** 44-byte RIFF header + signed 16-bit little-endian PCM. */
export function encodePcmWav(samples: Float32Array, sampleRate: number): Blob {
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeText(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample
  writeText(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i] ?? 0));
    const value = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(offset, Math.round(value), true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}
