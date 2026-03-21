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

const NARRATOR_VOICE_ID = "ErXwobaYiN019PkySvjV"; // Antoni — confident, punchy energy
const TMP_DIR = "/tmp/contentswipe-cv-ad";
const OUTPUT_BASE = "output/cv-ad";

interface Scene {
  id: string;
  narration: string;
  imagePrompts: string[];
  targetDuration: number;
}

const STYLE =
  "realistic editorial photography, shallow depth of field, natural lighting, candid moment, 35mm film grain, muted warm tones, 9:16 vertical composition";

const SCENES: Scene[] = [
  {
    id: "hook",
    narration: "This is where AI builders actually connect.",
    targetDuration: 3,
    imagePrompts: [
      `A developer sitting at a wooden desk with a laptop open showing code, soft daylight from a window, a coffee mug and notebook beside the laptop, calm focused atmosphere, ${STYLE}`,
      `A person standing at a whiteboard sketching a simple diagram with a dry-erase marker, casual office setting, natural overhead light, relaxed posture, ${STYLE}`,
      `A laptop screen displaying a dark code editor with colorful syntax highlighting, the laptop on a clean desk, a plant in the background, soft ambient room light, ${STYLE}`,
    ],
  },
  {
    id: "credibility",
    narration:
      "Thousands of founders, engineers, and investors…",
    targetDuration: 4,
    imagePrompts: [
      `A wide shot of a tech meetup in a modern loft space, groups of people standing and chatting with lanyards, warm string lights overhead, wooden floors, relaxed evening atmosphere, ${STYLE}`,
      `A long communal table at a hackathon with people working on laptops side by side, water bottles and snacks on the table, soft overhead lighting, collaborative energy, ${STYLE}`,
    ],
  },
  {
    id: "value",
    narration:
      "…meeting through hackathons, events, and a global AI community.",
    targetDuration: 4,
    imagePrompts: [
      `Two people having a conversation at a casual networking event, one holding a paper coffee cup, name badges on lanyards, blurred crowd in the background, warm natural light, ${STYLE}`,
      `A speaker presenting on a small stage with a projector screen behind them, a seated audience of about thirty people in folding chairs, simple venue with brick walls, ${STYLE}`,
    ],
  },
  {
    id: "positioning",
    narration:
      "If you're serious about AI — this is where you show up.",
    targetDuration: 3,
    imagePrompts: [
      `A laptop on a minimalist desk showing an event listing webpage, a small potted succulent beside it, warm afternoon light from a window, clean and calm workspace, ${STYLE}`,
      `A small group of professionals walking through the glass entrance of a modern co-working space, natural daylight streaming in, casual business attire, purposeful stride, ${STYLE}`,
    ],
  },
  {
    id: "cta",
    narration: "Join Cerebral Valley.",
    targetDuration: 3,
    imagePrompts: [
      `A clean dark gray background with the words CEREBRAL VALLEY in simple white sans-serif text centered in the frame, minimal and elegant, no other elements, studio-lit flat background, ${STYLE}`,
    ],
  },
];

// ── Image Generation ───────────────────────────────────────────────────

async function generateImages(): Promise<Map<string, Buffer[]>> {
  const totalImages = SCENES.reduce((s, sc) => s + sc.imagePrompts.length, 0);
  console.log(`\n[IMAGES] Generating ${totalImages} images with Imagen 4.0...\n`);

  const images = new Map<string, Buffer[]>();

  for (const scene of SCENES) {
    const sceneImages: Buffer[] = [];

    for (let j = 0; j < scene.imagePrompts.length; j++) {
      const prompt = scene.imagePrompts[j];
      console.log(`  [IMG] ${scene.id}[${j}]: "${prompt.slice(0, 75)}..."`);

      const response = await ai.models.generateImages({
        model: "imagen-4.0-generate-001",
        prompt,
        config: { numberOfImages: 1, aspectRatio: "9:16" },
      });

      const generated = response.generatedImages;
      if (!generated?.length || !generated[0].image?.imageBytes) {
        throw new Error(`Image generation failed: ${scene.id}[${j}]`);
      }

      const buffer = Buffer.from(generated[0].image.imageBytes, "base64");
      sceneImages.push(buffer);
      console.log(`  [IMG] ${scene.id}[${j}]: done (${(buffer.length / 1024).toFixed(0)} KB)`);
    }

    images.set(scene.id, sceneImages);
  }

  console.log(`\n[IMAGES] Done — ${totalImages} images generated`);
  return images;
}

// ── Narration ──────────────────────────────────────────────────────────

interface NarrationSegment {
  sceneId: string;
  audioBuffer: Buffer;
  durationSeconds: number;
}

async function generateNarration(): Promise<NarrationSegment[]> {
  console.log(`\n[NARRATION] Generating ${SCENES.length} audio segments...\n`);
  const segments: NarrationSegment[] = [];

  for (const scene of SCENES) {
    console.log(`  [TTS] ${scene.id}: "${scene.narration}"`);

    const response = await tts.textToSpeech.convertWithTimestamps(
      NARRATOR_VOICE_ID,
      {
        text: scene.narration,
        modelId: "eleven_multilingual_v2",
        voiceSettings: { stability: 0.6, similarityBoost: 0.85, style: 0.7 },
      }
    );

    const endTimes = response.alignment?.characterEndTimesSeconds ?? [];
    const duration = endTimes.length > 0 ? endTimes[endTimes.length - 1] : scene.targetDuration;
    const audioBuffer = Buffer.from(response.audioBase64, "base64");

    segments.push({ sceneId: scene.id, audioBuffer, durationSeconds: duration });
    console.log(`  [TTS] ${scene.id}: done (${duration.toFixed(1)}s)`);
  }

  const total = segments.reduce((s, seg) => s + seg.durationSeconds, 0);
  console.log(`\n[NARRATION] Done — ${total.toFixed(1)}s total`);
  return segments;
}

// ── FFmpeg Composition ─────────────────────────────────────────────────

async function composeAd(
  images: Map<string, Buffer[]>,
  narration: NarrationSegment[]
): Promise<void> {
  await mkdir(TMP_DIR, { recursive: true });
  console.log("\n[COMPOSE] Building 20s video ad...\n");

  const FPS = 30;
  const subClipPaths: string[] = [];
  const subClipDurations: number[] = [];

  for (let i = 0; i < SCENES.length; i++) {
    const scene = SCENES[i];
    const seg = narration[i];
    const sceneImages = images.get(scene.id)!;
    const numImages = sceneImages.length;
    const sceneDuration = Math.max(seg.durationSeconds + 0.2, scene.targetDuration);
    const perImageDuration = sceneDuration / numImages;

    // Write audio
    const audioPath = `${TMP_DIR}/audio_${i}.mp3`;
    await writeFile(audioPath, seg.audioBuffer);

    if (numImages === 1) {
      // Single image — Ken Burns zoom
      const imgPath = `${TMP_DIR}/img_${i}_0.png`;
      const clipPath = `${TMP_DIR}/scene_${i}.mp4`;
      await writeFile(imgPath, sceneImages[0]);

      const frames = Math.ceil(sceneDuration * FPS);
      const zoomFilter = `zoompan=z='min(zoom+0.001,1.4)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=${FPS}`;

      await exec("ffmpeg", [
        "-y", "-loop", "1", "-i", imgPath, "-i", audioPath,
        "-vf", zoomFilter,
        "-t", String(sceneDuration),
        "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", "-shortest",
        clipPath,
      ]);

      subClipPaths.push(clipPath);
      subClipDurations.push(sceneDuration);
      console.log(`  [SCENE] ${scene.id}: ${sceneDuration.toFixed(1)}s (1 image, zoom)`);
    } else {
      // Multiple images — rapid cuts with Ken Burns
      const miniClips: string[] = [];

      for (let j = 0; j < numImages; j++) {
        const imgPath = `${TMP_DIR}/img_${i}_${j}.png`;
        const miniPath = `${TMP_DIR}/mini_${i}_${j}.mp4`;
        await writeFile(imgPath, sceneImages[j]);

        const dur = perImageDuration;
        const frames = Math.ceil(dur * FPS);
        const zoomDir = j % 2 === 0 ? "min(zoom+0.0015,1.3)" : "if(eq(on,1),1.3,max(zoom-0.0015,1.0))";
        const zoomFilter = `zoompan=z='${zoomDir}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=${FPS}`;

        await exec("ffmpeg", [
          "-y", "-loop", "1", "-i", imgPath,
          "-vf", zoomFilter,
          "-t", String(dur),
          "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-pix_fmt", "yuv420p",
          "-an",
          miniPath,
        ]);

        miniClips.push(miniPath);
      }

      // Concat mini clips with sharp cuts (no crossfade for punchy feel)
      const listFile = `${TMP_DIR}/list_${i}.txt`;
      await writeFile(listFile, miniClips.map(p => `file '${p}'`).join("\n"));

      const concatPath = `${TMP_DIR}/concat_${i}.mp4`;
      await exec("ffmpeg", [
        "-y", "-f", "concat", "-safe", "0", "-i", listFile,
        "-c", "copy", concatPath,
      ]);

      // Add audio
      const clipPath = `${TMP_DIR}/scene_${i}.mp4`;
      await exec("ffmpeg", [
        "-y", "-i", concatPath, "-i", audioPath,
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
        clipPath,
      ]);

      subClipPaths.push(clipPath);
      subClipDurations.push(sceneDuration);
      console.log(
        `  [SCENE] ${scene.id}: ${sceneDuration.toFixed(1)}s (${numImages} images, rapid cuts)`
      );
    }
  }

  // Final concat of all scenes
  console.log("\n  [FINAL] Joining all scenes...");
  const finalList = `${TMP_DIR}/final_list.txt`;
  await writeFile(finalList, subClipPaths.map(p => `file '${p}'`).join("\n"));

  const normalPath = `${OUTPUT_BASE}.mp4`;
  await exec("ffmpeg", [
    "-y", "-f", "concat", "-safe", "0", "-i", finalList,
    "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k",
    "-t", "22",
    normalPath,
  ]);

  const normalBuf = await readFile(normalPath);
  console.log(`\n[COMPOSE] Output: ${normalPath} (${(normalBuf.length / 1024 / 1024).toFixed(1)} MB)`);

  // Also make 1.4x version
  const fastPath = `${OUTPUT_BASE}-1.4x.mp4`;
  console.log(`[SPEED] Creating 1.4x version...`);
  await exec("ffmpeg", [
    "-y", "-i", normalPath,
    "-filter_complex", "[0:v]setpts=PTS/1.4[v];[0:a]atempo=1.4[a]",
    "-map", "[v]", "-map", "[a]",
    "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k",
    fastPath,
  ]);

  const fastBuf = await readFile(fastPath);
  console.log(`[SPEED] 1.4x: ${fastPath} (${(fastBuf.length / 1024 / 1024).toFixed(1)} MB)`);

  // Cleanup
  console.log("[CLEANUP] Removing temp files...");
  const { readdir } = await import("fs/promises");
  const tmpFiles = await readdir(TMP_DIR);
  for (const f of tmpFiles) {
    try { await unlink(`${TMP_DIR}/${f}`); } catch {}
  }
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Cerebral Valley — 20s Video Ad Generator");
  console.log("═══════════════════════════════════════════════════════════");

  const totalImages = SCENES.reduce((s, sc) => s + sc.imagePrompts.length, 0);
  console.log(`\n${SCENES.length} scenes, ${totalImages} images`);

  const startTime = Date.now();

  console.log("\n▶ Phase 1+2: Generating images & narration in parallel...");
  const [images, narration] = await Promise.all([
    generateImages(),
    generateNarration(),
  ]);

  console.log("\n▶ Phase 3: Composing ad...");
  await composeAd(images, narration);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`  Complete in ${elapsed}s`);
  console.log(`  → ${OUTPUT_BASE}.mp4 (normal)`);
  console.log(`  → ${OUTPUT_BASE}-1.4x.mp4 (fast)`);
  console.log(`═══════════════════════════════════════════════════════════`);
}

main().catch((err) => {
  console.error("\n[FATAL]", err);
  process.exit(1);
});
