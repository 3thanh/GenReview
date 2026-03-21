import "dotenv/config";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import type { VoiceoverLine, SfxCue } from "./script-planner.js";

const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY;
if (!ELEVENLABS_KEY) throw new Error("Missing ELEVENLABS_API_KEY");

const client = new ElevenLabsClient({ apiKey: ELEVENLABS_KEY });

const NARRATOR_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // George — warm, clear narrator
const FALLBACK_VOICES = [
  "21m00Tcm4TlvDq8ikWAM", // Rachel
  "ErXwobaYiN019PkySvjV", // Antoni
  "XrExE9yKIg1WjnnlVkGX", // Matilda
  "TxGEqnHWrfWFTfGW9XjX", // Josh
];

export interface AudioSegment {
  type: "voiceover" | "sfx";
  sceneIndex: number;
  lineIndex?: number;
  audioBase64: string;
  durationSeconds: number;
}

async function streamToBuffer(
  stream: AsyncIterable<Uint8Array>
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Generate voiceover audio for all lines using ElevenLabs TTS.
 */
async function generateVoiceover(
  lines: VoiceoverLine[]
): Promise<AudioSegment[]> {
  const speakerVoiceMap = new Map<string, string>();
  speakerVoiceMap.set("narrator", NARRATOR_VOICE_ID);

  let fallbackIdx = 0;
  for (const line of lines) {
    if (!speakerVoiceMap.has(line.speaker)) {
      speakerVoiceMap.set(
        line.speaker,
        FALLBACK_VOICES[fallbackIdx % FALLBACK_VOICES.length]
      );
      fallbackIdx++;
    }
  }

  const segments: AudioSegment[] = [];

  for (const line of lines) {
    const voiceId = speakerVoiceMap.get(line.speaker) ?? NARRATOR_VOICE_ID;

    console.log(
      `  [TTS] line ${line.lineIndex} (${line.speaker}) [${line.emotion}]: "${line.text.slice(0, 60)}..."`
    );

    const response = await client.textToSpeech.convertWithTimestamps(voiceId, {
      text: line.text,
      modelId: "eleven_multilingual_v2",
      voiceSettings: {
        stability: line.stability,
        similarityBoost: 0.8,
        style: line.style,
      },
    });

    const endTimes =
      response.alignment?.characterEndTimesSeconds ?? [];
    const duration =
      endTimes.length > 0 ? endTimes[endTimes.length - 1] : 0;

    segments.push({
      type: "voiceover",
      sceneIndex: line.sceneIndex,
      lineIndex: line.lineIndex,
      audioBase64: response.audioBase64,
      durationSeconds: duration,
    });
  }

  return segments;
}

/**
 * Generate sound effects using ElevenLabs SFX model.
 */
async function generateSfx(cues: SfxCue[]): Promise<AudioSegment[]> {
  const segments: AudioSegment[] = [];

  const results = await Promise.allSettled(
    cues.map(async (cue) => {
      console.log(
        `  [SFX] scene ${cue.sceneIndex}: "${cue.prompt}" (${cue.durationSeconds}s)`
      );

      const sfxStream = await client.textToSoundEffects.convert({
        text: cue.prompt,
        durationSeconds: cue.durationSeconds,
        promptInfluence: 0.5,
      });

      const buffer = await streamToBuffer(
        sfxStream as AsyncIterable<Uint8Array>
      );

      return {
        type: "sfx" as const,
        sceneIndex: cue.sceneIndex,
        audioBase64: buffer.toString("base64"),
        durationSeconds: cue.durationSeconds,
      };
    })
  );

  for (const r of results) {
    if (r.status === "fulfilled") {
      segments.push(r.value);
    } else {
      console.error("  [SFX] generation failed:", r.reason);
    }
  }

  return segments;
}

/**
 * Full audio generation: voiceover + SFX in parallel.
 * Returns all audio segments ordered by scene.
 */
export async function generateAudio(
  voiceoverLines: VoiceoverLine[],
  sfxCues: SfxCue[]
): Promise<{
  voiceover: AudioSegment[];
  sfx: AudioSegment[];
}> {
  console.log("\n[AUDIO] Starting audio generation...");
  console.log(`  ${voiceoverLines.length} voiceover lines, ${sfxCues.length} SFX cues`);

  const [voiceover, sfx] = await Promise.all([
    generateVoiceover(voiceoverLines),
    generateSfx(sfxCues),
  ]);

  console.log(
    `[AUDIO] Done: ${voiceover.length} VO segments, ${sfx.length} SFX segments`
  );

  return { voiceover, sfx };
}
