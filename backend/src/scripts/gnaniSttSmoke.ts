import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { env } from '../config/env.js';
import {
  GNANI_MAX_UPLOAD_BYTES,
  GnaniSttError,
  gnaniSttConfigured,
  transcribeAudio,
} from '../services/gnani.js';
import { classifySafetyText } from '../services/intent.js';

/**
 * One-shot live Gnani Prisma v3.0 speech-to-text smoke test.
 *
 * This script transcribes a single short clip and classifies the transcript
 * locally. It does NOT create an incident, send notifications, or contact
 * emergency services. The API key is never printed.
 *
 * Usage:
 *   npm run gnani:smoke -- --audio ./sample.wav
 *   npm run gnani:smoke -- --audio ./sample.wav --language hi-IN
 *
 * Requirements:
 *   - backend/.env with GNANI_API_KEY set (never committed)
 *   - a speech clip of at most 30 seconds in WAV, MP3, OGG, FLAC, AAC or M4A
 *
 * Without GNANI_API_KEY the script exits with a clear configuration error
 * instead of pretending the integration works.
 */

const MIME_BY_EXTENSION: Record<string, string> = {
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
  '.m4a': 'audio/mp4',
};

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  return value && !value.startsWith('--') ? value : undefined;
}

async function main(): Promise<void> {
  const audioPath = arg('audio');
  if (!audioPath) {
    console.error(
      'Usage: npm run gnani:smoke -- --audio <path> [--language indic-auto|hi-IN|en-IN|mr-IN]',
    );
    process.exit(1);
  }

  if (!gnaniSttConfigured()) {
    console.error(
      '[gnani:smoke] GNANI_API_KEY is not set. Add it to backend/.env (never commit that file).',
    );
    console.error('[gnani:smoke] Nothing was sent to Gnani. The integration is unverified.');
    process.exit(1);
  }

  const extension = extname(audioPath).toLowerCase();
  const mimeType = MIME_BY_EXTENSION[extension];
  if (!mimeType) {
    console.error(`[gnani:smoke] Unsupported file extension "${extension}". Use WAV/MP3/OGG/FLAC/AAC/M4A.`);
    process.exit(1);
  }

  const bytes = await readFile(audioPath);
  if (bytes.byteLength === 0) {
    console.error('[gnani:smoke] The audio file is empty.');
    process.exit(1);
  }
  if (bytes.byteLength > GNANI_MAX_UPLOAD_BYTES) {
    console.error(`[gnani:smoke] Audio exceeds ${GNANI_MAX_UPLOAD_BYTES} bytes.`);
    process.exit(1);
  }

  const language = arg('language') ?? env.GNANI_STT_LANGUAGE;
  console.log(`[gnani:smoke] endpoint=${env.GNANI_STT_URL} model=${env.GNANI_STT_MODEL}`);
  console.log(`[gnani:smoke] file=${basename(audioPath)} bytes=${bytes.byteLength} language=${language}`);

  try {
    const transcription = await transcribeAudio({
      bytes,
      filename: basename(audioPath),
      mimeType,
      languageCode: language,
      topic: 'safety assistance smoke test',
    });

    const interpretation = classifySafetyText(transcription.transcript, {
      transcript: transcription.transcript,
      ...(transcription.detectedLanguageCode
        ? { detectedLanguageCode: transcription.detectedLanguageCode }
        : {}),
    });

    console.log('[gnani:smoke] SUCCESS — Gnani accepted the request.');
    console.log(`  request_id:           ${transcription.requestId}`);
    console.log(`  model:                ${transcription.model}`);
    console.log(`  transcript:           ${JSON.stringify(transcription.transcript)}`);
    console.log(`  detected_language:    ${transcription.detectedLanguageCode ?? 'not returned'}`);
    console.log(`  truncated:            ${transcription.truncated}`);
    console.log(`  processing_time:      ${transcription.processingTime ?? 'not returned'}`);
    console.log('[gnani:smoke] Local intent classification (deterministic, no cloud model):');
    console.log(`  intent:               ${interpretation.intent}`);
    console.log(`  severity:             ${interpretation.severity}`);
    console.log(`  confidence:           ${interpretation.confidence}`);
    console.log(`  ambiguous:            ${interpretation.ambiguous}`);
    console.log(`  requiresConfirmation: ${interpretation.requiresConfirmation}`);
    console.log('[gnani:smoke] No incident was created and no alert was sent.');
  } catch (error) {
    if (error instanceof GnaniSttError) {
      console.error(`[gnani:smoke] FAILED code=${error.code}`);
      console.error(`  provider_status: ${error.providerStatus ?? 'none'}`);
      console.error(`  provider_type:   ${error.providerType ?? 'none'}`);
      console.error(`  message:         ${error.message}`);
    } else {
      console.error('[gnani:smoke] FAILED with an unexpected error.');
      console.error(error);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[gnani:smoke] FAILED:', error);
  process.exit(1);
});
