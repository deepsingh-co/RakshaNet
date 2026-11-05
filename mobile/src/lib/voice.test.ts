import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The voice helpers are the part of the mobile app that can be verified
 * without a device. The tests mock `react-native` and the browser audio APIs
 * so both the native and web upload paths are exercised.
 */

const { platform } = vi.hoisted(() => ({ platform: { OS: 'ios' as string } }));

vi.mock('react-native', () => ({ Platform: platform }));

const originalFetch = globalThis.fetch;

async function loadVoice() {
  return import('./voice');
}

beforeEach(() => {
  platform.OS = 'ios';
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('voice capture helpers', () => {
  it('formats recording durations', async () => {
    const { formatDuration } = await loadVoice();
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(7_400)).toBe('0:07');
    expect(formatDuration(30_000)).toBe('0:30');
    expect(formatDuration(65_000)).toBe('1:05');
  });

  it('names files with the supplied extension', async () => {
    const { recordingFileName } = await loadVoice();
    expect(recordingFileName('.wav')).toMatch(/^suraksha-voice-.*\.wav$/);
    expect(recordingFileName('.m4a')).toMatch(/^suraksha-voice-.*\.m4a$/);
  });

  it('sends native recordings as M4A without re-encoding', async () => {
    const { prepareVoiceUpload } = await loadVoice();
    const upload = await prepareVoiceUpload('file:///tmp/recording.m4a');
    expect(upload).toMatchObject({
      kind: 'file',
      uri: 'file:///tmp/recording.m4a',
      mimeType: 'audio/mp4',
    });
    expect(upload.filename.endsWith('.m4a')).toBe(true);
  });

  it('rejects a missing recording URI', async () => {
    const { prepareVoiceUpload, VoicePreparationError } = await loadVoice();
    await expect(prepareVoiceUpload('')).rejects.toBeInstanceOf(VoicePreparationError);
    try {
      await prepareVoiceUpload('');
    } catch (error) {
      expect((error as InstanceType<typeof VoicePreparationError>).code).toBe('RECORDING_MISSING');
    }
  });

  it('encodes 16-bit mono PCM WAV with a valid header', async () => {
    const { encodePcmWav, VOICE_WAV_SAMPLE_RATE } = await loadVoice();
    const samples = new Float32Array([0, 0.5, -0.5, 1]);
    const blob = encodePcmWav(samples, VOICE_WAV_SAMPLE_RATE);

    expect(blob.type).toBe('audio/wav');
    expect(blob.size).toBe(44 + samples.length * 2);

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const text = (offset: number, length: number) =>
      String.fromCharCode(...bytes.slice(offset, offset + length));
    const view = new DataView(bytes.buffer);

    expect(text(0, 4)).toBe('RIFF');
    expect(text(8, 4)).toBe('WAVE');
    expect(text(12, 4)).toBe('fmt ');
    expect(text(36, 4)).toBe('data');
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(1); // mono
    expect(view.getUint32(24, true)).toBe(VOICE_WAV_SAMPLE_RATE);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(samples.length * 2);
    expect(view.getInt16(44, true)).toBe(0);
    expect(view.getInt16(46, true)).toBe(Math.round(0.5 * 0x7fff));
    expect(view.getInt16(48, true)).toBe(Math.round(-0.5 * 0x8000));
  });

  it('converts a browser WebM recording to WAV before upload', async () => {
    platform.OS = 'web';
    const { prepareVoiceUpload, VOICE_WAV_SAMPLE_RATE } = await loadVoice();

    const rendered = {
      duration: 0.1,
      numberOfChannels: 1,
      length: 1_600,
      sampleRate: VOICE_WAV_SAMPLE_RATE,
      getChannelData: () => new Float32Array(1_600).fill(0.25),
    };

    class FakeAudioContext {
      async decodeAudioData() {
        return rendered;
      }
      async close() {
        return undefined;
      }
    }

    class FakeOfflineAudioContext {
      destination = {};
      createBufferSource() {
        return { buffer: null, connect: () => undefined, start: () => undefined };
      }
      async startRendering() {
        return rendered;
      }
    }

    vi.stubGlobal('AudioContext', FakeAudioContext);
    vi.stubGlobal('OfflineAudioContext', FakeOfflineAudioContext);
    globalThis.fetch = vi.fn(async () => ({
      arrayBuffer: async () => new ArrayBuffer(32),
    })) as unknown as typeof fetch;

    const upload = await prepareVoiceUpload('blob:https://example.test/recording');
    expect(upload.kind).toBe('blob');
    if (upload.kind !== 'blob') return;
    expect(upload.mimeType).toBe('audio/wav');
    expect(upload.filename.endsWith('.wav')).toBe(true);

    const bytes = new Uint8Array(await upload.blob.arrayBuffer());
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('RIFF');
    expect(new DataView(bytes.buffer).getUint32(24, true)).toBe(VOICE_WAV_SAMPLE_RATE);
    // 0.1s at 16 kHz = 1600 samples, 16-bit mono.
    expect(upload.blob.size).toBe(44 + 1_600 * 2);
  });

  it('fails honestly when the browser cannot decode audio', async () => {
    platform.OS = 'web';
    const { prepareVoiceUpload, VoicePreparationError } = await loadVoice();
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('webkitAudioContext', undefined);

    await expect(prepareVoiceUpload('blob:fake')).rejects.toBeInstanceOf(VoicePreparationError);
    try {
      await prepareVoiceUpload('blob:fake');
    } catch (error) {
      expect((error as InstanceType<typeof VoicePreparationError>).code).toBe(
        'WAV_CONVERSION_UNAVAILABLE',
      );
    }
  });
});
