import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { execFile } from "child_process";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { promisify } from "util";

const exec = promisify(execFile);

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY;
if (!GEMINI_KEY) throw new Error("Missing GEMINI_API_KEY");
if (!ELEVENLABS_KEY) throw new Error("Missing ELEVENLABS_API_KEY");

const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
const tts = new ElevenLabsClient({ apiKey: ELEVENLABS_KEY });

const NARRATOR_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
const TMP_DIR = "/tmp/contentswipe-vibe-reel";
const OUTPUT_BASE = "output/vibe-coder-reel";
const MAX_DURATION_S = 72;
const SPEED = 1.4;

interface Scene {
  id: string;
  narration: string;
  imagePrompt: string;
}

const STYLE =
  "high-quality cinematic CGI render, stylized 3D character with slightly exaggerated proportions, cozy warm color grading, soft volumetric lighting, lo-fi aesthetic, 9:16 vertical composition";

const SCENES: Scene[] = [
  {
    id: "intro",
    narration: "Hi, this is a day in the life of a vibe coder.",
    imagePrompt: `A stylized 3D character sitting in a cozy home office at dawn, messy desk with multiple monitors showing colorful code, coffee mug, plants on windowsill, soft morning light streaming in, title card energy, ${STYLE}`,
  },
  {
    id: "morning_check",
    narration:
      "At 9:30 AM, I wake up and check if anything broke overnight. It did.",
    imagePrompt: `A stylized 3D character in pajamas and messy hair sitting up in bed squinting at a phone screen showing red error notifications, bedroom lit by phone glow, alarm clock showing 9:30, sleepy disappointed expression, ${STYLE}`,
  },
  {
    id: "understanding",
    narration:
      "I open my laptop and spend some time trying to understand what I built yesterday. It feels intentional.",
    imagePrompt: `A stylized 3D character at a desk staring at a laptop screen full of dense code with a confused but impressed expression, one hand on chin, the other holding coffee, sticky notes everywhere, morning light, ${STYLE}`,
  },
  {
    id: "new_feature",
    narration:
      "At 11:00 AM, I start working on a new feature by describing what I want and hoping for the best.",
    imagePrompt: `A stylized 3D character typing a long natural language prompt into a glowing chat interface on screen, fingers crossed on the other hand under the desk, hopeful optimistic expression, bright midday light, ${STYLE}`,
  },
  {
    id: "breaks",
    narration:
      "Eventually something breaks, so I just kind of sit with it until it becomes a different problem.",
    imagePrompt: `A stylized 3D character leaning back in an office chair staring at a screen full of red error messages and stack traces, zen-like calm expression, arms crossed, the monitor reflecting red on their face, ${STYLE}`,
  },
  {
    id: "lunch",
    narration:
      "At 2:00 PM, I take a long lunch break to reset mentally and also give the code some space.",
    imagePrompt: `A stylized 3D character eating a sandwich on a park bench outside, laptop closed beside them, birds nearby, warm afternoon sunlight, peaceful relaxed expression, the laptop has a sticker that says AI on it, ${STYLE}`,
  },
  {
    id: "working_again",
    narration: "I come back and it's working again, which I take as a win.",
    imagePrompt: `A stylized 3D character walking back to their desk seeing a green success terminal output on screen, surprised delighted expression, arms slightly raised in quiet celebration, warm golden afternoon light, ${STYLE}`,
  },
  {
    id: "batch_run",
    narration:
      "At 4:30 PM, I run a batch, don't touch anything, and just let it happen.",
    imagePrompt: `A stylized 3D character sitting perfectly still with hands deliberately away from the keyboard, watching a progress bar slowly fill on screen, intense focused expression, do not touch energy, late afternoon amber light, ${STYLE}`,
  },
  {
    id: "explaining",
    narration:
      "Someone asks how it works, and I walk them through the overall vision.",
    imagePrompt: `A stylized 3D character standing at a whiteboard covered in vague arrows and circles and the word PIPELINE with a question mark, gesturing confidently to a confused colleague, presentation energy, ${STYLE}`,
  },
  {
    id: "one_small_change",
    narration:
      "Before logging off, I make one small change that breaks everything immediately.",
    imagePrompt: `A stylized 3D character pressing a single key on a keyboard, screen behind them erupting in cascading red errors and warning popups, shocked wide-eyed expression, dramatic red lighting from the screen, ${STYLE}`,
  },
  {
    id: "close",
    narration:
      "I close my laptop and trust that tomorrow I'll understand it.",
    imagePrompt: `A stylized 3D character gently closing a laptop lid in a dark room, peaceful accepting expression, soft blue moonlight from a window, the laptop has a faint warm glow seeping from the edges as it closes, serene ending mood, ${STYLE}`,
  },
];

// ── Image Generation ───────────────────────────────────────────────────

async function generateImages(): Promise<Map<string, Buffer>> {
  console.log(
    `\n[IMAGES] Generating ${SCENES.length} images with Imagen 4.0...\n`
  );
  const images = new Map<string, Buffer>();

  for (const scene of SCENES) {
    console.log(
      `  [IMG] ${scene.id}: "${scene.imagePrompt.slice(0, 80)}..."`
    );

    const response = await ai.models.generateImages({
      model: "imagen-4.0-generate-001",
      prompt: scene.imagePrompt,
      config: { numberOfImages: 1, aspectRatio: "9:16" },
    });

    const generated = response.generatedImages;
    if (!generated?.length || !generated[0].image?.imageBytes) {
      throw new Error(`Image generation failed for scene: ${scene.id}`);
    }

    const buffer = Buffer.from(generated[0].image.imageBytes, "base64");
    images.set(scene.id, buffer);
    console.log(
      `  [IMG] ${scene.id}: done (${(buffer.length / 1024).toFixed(0)} KB)`
    );
  }

  console.log(`\n[IMAGES] Done — ${images.size} images generated`);
  return images;
}

// ── Narration ──────────────────────────────────────────────────────────

interface NarrationSegment {
  sceneId: string;
  audioBuffer: Buffer;
  durationSeconds: number;
}

async function generateNarration(): Promise<NarrationSegment[]> {
  console.log(
    `\n[NARRATION] Generating ${SCENES.length} audio segments...\n`
  );
  const segments: NarrationSegment[] = [];

  for (const scene of SCENES) {
    console.log(
      `  [TTS] ${scene.id}: "${scene.narration.slice(0, 60)}..."`
    );

    const response = await tts.textToSpeech.convertWithTimestamps(
      NARRATOR_VOICE_ID,
      {
        text: scene.narration,
        modelId: "eleven_multilingual_v2",
        voiceSettings: { stability: 0.55, similarityBoost: 0.8, style: 0.5 },
      }
    );

    const endTimes = response.alignment?.characterEndTimesSeconds ?? [];
    const duration = endTimes.length > 0 ? endTimes[endTimes.length - 1] : 3;
    const audioBuffer = Buffer.from(response.audioBase64, "base64");

    segments.push({ sceneId: scene.id, audioBuffer, durationSeconds: duration });

    console.log(
      `  [TTS] ${scene.id}: done (${duration.toFixed(1)}s, ${(audioBuffer.length / 1024).toFixed(0)} KB)`
    );
  }

  const total = segments.reduce((s, seg) => s + seg.durationSeconds, 0);
  console.log(`\n[NARRATION] Done — ${total.toFixed(1)}s total`);
  return segments;
}

// ── FFmpeg Composition ─────────────────────────────────────────────────

type KenBurnsVariant =
  | "zoom_in_center"
  | "zoom_in_left"
  | "zoom_in_right"
  | "zoom_out_center"
  | "pan_left";

const KB_VARIANTS: KenBurnsVariant[] = [
  "zoom_in_center",
  "zoom_in_left",
  "zoom_in_right",
  "zoom_out_center",
  "pan_left",
];

function kenBurnsFilter(variant: KenBurnsVariant, frames: number): string {
  const FPS = 30;
  switch (variant) {
    case "zoom_in_center":
      return `zoompan=z='min(zoom+0.0008,1.3)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=${FPS}`;
    case "zoom_in_left":
      return `zoompan=z='min(zoom+0.0008,1.3)':x='iw/4-(iw/zoom/4)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=${FPS}`;
    case "zoom_in_right":
      return `zoompan=z='min(zoom+0.0008,1.3)':x='3*iw/4-(iw/zoom*3/4)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=${FPS}`;
    case "zoom_out_center":
      return `zoompan=z='if(eq(on,1),1.3,max(zoom-0.0008,1.0))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=${FPS}`;
    case "pan_left":
      return `zoompan=z='1.15':x='iw*0.15*(1-on/${frames})':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=${FPS}`;
  }
}

async function composeReel(
  images: Map<string, Buffer>,
  narration: NarrationSegment[]
): Promise<void> {
  await mkdir(TMP_DIR, { recursive: true });
  console.log("\n[COMPOSE] Starting slideshow composition...\n");

  const FPS = 30;
  const XFADE_DURATION = 0.4;
  const clipPaths: string[] = [];

  for (let i = 0; i < SCENES.length; i++) {
    const scene = SCENES[i];
    const imgBuf = images.get(scene.id)!;
    const seg = narration[i];

    const imgPath = `${TMP_DIR}/img_${i}.png`;
    const audioPath = `${TMP_DIR}/audio_${i}.mp3`;
    const clipPath = `${TMP_DIR}/clip_${i}.mp4`;

    await writeFile(imgPath, imgBuf);
    await writeFile(audioPath, seg.audioBuffer);

    const duration = seg.durationSeconds + 0.3;
    const frames = Math.ceil(duration * FPS);
    const kbVariant = KB_VARIANTS[i % KB_VARIANTS.length];
    const kbFilter = kenBurnsFilter(kbVariant, frames);

    console.log(
      `  [CLIP] ${scene.id}: ${duration.toFixed(1)}s, effect=${kbVariant}`
    );

    await exec("ffmpeg", [
      "-y",
      "-loop", "1",
      "-i", imgPath,
      "-i", audioPath,
      "-vf", kbFilter,
      "-t", String(duration),
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "192k",
      "-shortest",
      clipPath,
    ]);

    clipPaths.push(clipPath);
  }

  // Concatenate with crossfade
  const normalPath = `${OUTPUT_BASE}.mp4`;
  console.log("\n  [CONCAT] Joining clips with crossfade transitions...");

  const inputs = clipPaths.flatMap((p) => ["-i", p]);
  const filterParts: string[] = [];
  let lastLabel = "[0:v]";
  const durations = narration.map((s) => s.durationSeconds + 0.3);

  let cumulativeOffset = 0;
  for (let i = 1; i < clipPaths.length; i++) {
    cumulativeOffset += durations[i - 1] - XFADE_DURATION;
    const outLabel = i < clipPaths.length - 1 ? `[v${i}]` : "[vout]";
    filterParts.push(
      `${lastLabel}[${i}:v]xfade=transition=fade:duration=${XFADE_DURATION}:offset=${cumulativeOffset.toFixed(2)}${outLabel}`
    );
    lastLabel = outLabel;
  }

  const audioInputs = clipPaths.map((_, i) => `[${i}:a]`).join("");
  filterParts.push(
    `${audioInputs}concat=n=${clipPaths.length}:v=0:a=1[aout]`
  );

  await exec("ffmpeg", [
    "-y",
    ...inputs,
    "-filter_complex", filterParts.join(";"),
    "-map", "[vout]",
    "-map", "[aout]",
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "23",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "192k",
    "-t", String(MAX_DURATION_S),
    normalPath,
  ]);

  const normalBuf = await readFile(normalPath);
  console.log(
    `\n[COMPOSE] Normal speed: ${normalPath} (${(normalBuf.length / 1024 / 1024).toFixed(1)} MB)`
  );

  // Speed up version
  const fastPath = `${OUTPUT_BASE}-${SPEED}x.mp4`;
  console.log(`\n[SPEED] Creating ${SPEED}x version...`);

  await exec("ffmpeg", [
    "-y",
    "-i", normalPath,
    "-filter_complex",
    `[0:v]setpts=PTS/${SPEED}[v];[0:a]atempo=${SPEED}[a]`,
    "-map", "[v]",
    "-map", "[a]",
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "23",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "192k",
    fastPath,
  ]);

  const fastBuf = await readFile(fastPath);
  console.log(
    `[SPEED] ${SPEED}x version: ${fastPath} (${(fastBuf.length / 1024 / 1024).toFixed(1)} MB)`
  );

  // Cleanup
  console.log("[CLEANUP] Removing temp files...");
  for (let i = 0; i < SCENES.length; i++) {
    for (const f of [
      `${TMP_DIR}/img_${i}.png`,
      `${TMP_DIR}/audio_${i}.mp3`,
      `${TMP_DIR}/clip_${i}.mp4`,
    ]) {
      try { await unlink(f); } catch {}
    }
  }
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Day in the Life of a Vibe Coder — Reel Generator");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`\n${SCENES.length} scenes`);

  const startTime = Date.now();

  console.log("\n▶ Phase 1+2: Generating images & narration in parallel...");
  const [images, narration] = await Promise.all([
    generateImages(),
    generateNarration(),
  ]);

  console.log("\n▶ Phase 3: Composing reel (normal + 1.4x)...");
  await composeReel(images, narration);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`  Complete in ${elapsed}s`);
  console.log(`  → ${OUTPUT_BASE}.mp4 (normal)`);
  console.log(`  → ${OUTPUT_BASE}-${SPEED}x.mp4 (fast)`);
  console.log(`═══════════════════════════════════════════════════════════`);
}

main().catch((err) => {
  console.error("\n[FATAL]", err);
  process.exit(1);
});
