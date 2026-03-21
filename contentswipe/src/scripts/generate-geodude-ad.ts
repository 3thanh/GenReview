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

const NARRATOR_VOICE_ID = "ErXwobaYiN019PkySvjV"; // Antoni — confident, punchy infomercial energy
const TMP_DIR = "/tmp/contentswipe-geodude-ad";
const OUTPUT_BASE = "output/geodude-ad";

interface Scene {
  id: string;
  narration: string;
  imagePrompts: string[];
  targetDuration: number;
}

const STYLE =
  "ultra high-quality cinematic photography, dramatic volumetric lighting, deep shadows with high contrast, luxury commercial aesthetic, polished ad campaign visuals, 9:16 vertical composition, photorealistic";

const GEODUDE_DESC =
  "a floating rock creature with two muscular arms, a boulder-shaped body with a stern determined face, gray stone texture, hovering in mid-air";

const SCENES: Scene[] = [
  {
    id: "hook",
    narration: "Are you tired of being… physically limited?",
    targetDuration: 2.5,
    imagePrompts: [
      `Extreme close-up of a serious adult man's strained face grimacing while struggling to carry too many grocery bags, suburban driveway background, cinematic harsh side lighting, intense contrast, handheld camera feel, urgency and desperation, ${STYLE}`,
      `Dramatic slow-motion shot of grocery bags ripping open and items falling — apples, cereal boxes, milk carton tumbling through the air, suburban sidewalk, golden hour backlighting through the falling items, motion blur, shallow depth of field, ${STYLE}`,
    ],
  },
  {
    id: "product_reveal",
    narration: "What if you had… rock-solid support… anywhere… anytime.",
    targetDuration: 3,
    imagePrompts: [
      `A confident calm adult man standing upright in a clean modern living room, beside him ${GEODUDE_DESC} hovering at shoulder height, dramatic backlighting creating a silhouette halo effect, slow push-in composition, glossy spotlight on the rock creature like a premium product reveal, clean elevated background, lens flare, ${STYLE}`,
    ],
  },
  {
    id: "title_card",
    narration: "Introducing… GEODUDE.",
    targetDuration: 2.5,
    imagePrompts: [
      `Full-screen hero shot of ${GEODUDE_DESC} floating against a dark black stone-textured background, metallic gold and silver dust particles swirling around it, dramatic rim lighting in white and amber, the creature looks powerful and iconic, premium product photography style, glossy polished surface, centered composition, ${STYLE}`,
    ],
  },
  {
    id: "montage",
    narration:
      "The only companion engineered by nature… to solve problems… permanently.",
    targetDuration: 4,
    imagePrompts: [
      `${GEODUDE_DESC} effortlessly lifting the side of a car with one muscular arm while a person changes a tire underneath, suburban garage, dramatic low-angle shot, impact lighting, powerful demonstration aesthetic, ${STYLE}`,
      `${GEODUDE_DESC} smashing through a jammed wooden door with its fist, splinters flying outward in dramatic slow motion, hallway with moody overhead lighting, action shot with speed lines implied by motion blur, ${STYLE}`,
      `${GEODUDE_DESC} hovering silently and seriously beside a businessperson in a sleek modern boardroom, glass conference table, other executives looking impressed, corporate power shot, the rock creature in a position of authority, ${STYLE}`,
    ],
  },
  {
    id: "features",
    narration:
      "Need strength? Geodude delivers. Need protection? Geodude is protection. Need emotional support? …Geodude is present.",
    targetDuration: 4,
    imagePrompts: [
      `${GEODUDE_DESC} punching a massive boulder that explodes into rubble and dust, dramatic side lighting, debris flying, extreme power demonstration, dark rocky environment, impact moment frozen in time, ${STYLE}`,
      `${GEODUDE_DESC} floating protectively between its owner and a runaway shopping cart in a parking lot, heroic defensive stance with arms outstretched, dramatic golden hour lighting, guardian energy, ${STYLE}`,
      `A person sitting alone on a modern gray couch in a dimly lit living room, ${GEODUDE_DESC} hovering silently nearby with an intensely serious expression of emotional solidarity, warm lamp light, intimate quiet moment, overly sincere aesthetic, ${STYLE}`,
    ],
  },
  {
    id: "benefits",
    narration: "No batteries. No training required. No questions asked.",
    targetDuration: 3,
    imagePrompts: [
      `${GEODUDE_DESC} rotating slowly in the center of the frame against a pure black background, tech product render aesthetic, subtle stone dust and metallic particle effects swirling around it, clean minimalist premium product photography, spotlight from above creating dramatic shadow, ${STYLE}`,
    ],
  },
  {
    id: "testimonial",
    narration:
      "Before Geodude… I had fear. Now… I have Geodude.",
    targetDuration: 3,
    imagePrompts: [
      `Medium close-up of a straight-faced serious adult woman delivering a testimonial, neutral light gray background, professional three-point lighting, she looks directly at camera with total sincerity like a luxury brand ambassador, ${GEODUDE_DESC} hovering motionless slightly out of focus in the background, documentary interview aesthetic, ${STYLE}`,
    ],
  },
  {
    id: "offer",
    narration:
      "And for a limited time… you won't just get one— you'll get MULTIPLE GEODUDES.",
    targetDuration: 3,
    imagePrompts: [
      `A happy customer standing in a clean studio environment with one ${GEODUDE_DESC} floating beside them, dramatic spotlight, product offer aesthetic, the person gestures toward the rock creature proudly, ${STYLE}`,
      `The same customer now surrounded by five floating rock creatures with muscular arms and boulder bodies, all hovering in formation behind them, dramatic wide shot, each creature lit with its own rim light, overwhelming abundance of product, absurdly intense limited-time deal energy, bold premium staging, ${STYLE}`,
    ],
  },
  {
    id: "lifestyle",
    narration: "Stop living… unsupported.",
    targetDuration: 3,
    imagePrompts: [
      `A person standing heroically on a rocky mountain cliff at golden hour sunset, wind blowing their hair, three floating rock creatures with muscular arms hovering behind them in V-formation like an elite squad, epic cinematic wide shot, dramatic orange and purple sky, lens flare, inspirational adventure commercial aesthetic, ${STYLE}`,
    ],
  },
  {
    id: "cta",
    narration:
      "Call now… and claim your Geodude. GEODUDE — Stability you can trust.",
    targetDuration: 3,
    imagePrompts: [
      `Classic infomercial call-to-action screen but ultra premium and cinematic, ${GEODUDE_DESC} centered floating above a dark polished rocky pedestal, dramatic spotlight from above, clean dark background with subtle stone texture, glowing phone icon graphic in the corner, premium motion graphics feel, product photography composition, ${STYLE}`,
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
        voiceSettings: { stability: 0.7, similarityBoost: 0.9, style: 0.8 },
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
  await mkdir("output", { recursive: true });
  console.log("\n[COMPOSE] Building ~26s Geodude infomercial...\n");

  const FPS = 30;
  const subClipPaths: string[] = [];

  for (let i = 0; i < SCENES.length; i++) {
    const scene = SCENES[i];
    const seg = narration[i];
    const sceneImages = images.get(scene.id)!;
    const numImages = sceneImages.length;
    const sceneDuration = Math.max(seg.durationSeconds + 0.15, scene.targetDuration);
    const perImageDuration = sceneDuration / numImages;

    const audioPath = `${TMP_DIR}/audio_${i}.mp3`;
    await writeFile(audioPath, seg.audioBuffer);

    if (numImages === 1) {
      const imgPath = `${TMP_DIR}/img_${i}_0.png`;
      const clipPath = `${TMP_DIR}/scene_${i}.mp4`;
      await writeFile(imgPath, sceneImages[0]);

      const frames = Math.ceil(sceneDuration * FPS);
      const zoomSpeed = i % 2 === 0 ? "min(zoom+0.0015,1.4)" : "if(eq(on,1),1.4,max(zoom-0.0015,1.0))";
      const zoomFilter = `zoompan=z='${zoomSpeed}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=${FPS}`;

      await exec("ffmpeg", [
        "-y", "-loop", "1", "-i", imgPath, "-i", audioPath,
        "-vf", zoomFilter,
        "-t", String(sceneDuration),
        "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", "-shortest",
        clipPath,
      ]);

      subClipPaths.push(clipPath);
      console.log(`  [SCENE] ${scene.id}: ${sceneDuration.toFixed(1)}s (1 image, dramatic zoom)`);
    } else {
      const miniClips: string[] = [];

      for (let j = 0; j < numImages; j++) {
        const imgPath = `${TMP_DIR}/img_${i}_${j}.png`;
        const miniPath = `${TMP_DIR}/mini_${i}_${j}.mp4`;
        await writeFile(imgPath, sceneImages[j]);

        const dur = perImageDuration;
        const frames = Math.ceil(dur * FPS);
        const zoomDir = j % 2 === 0 ? "min(zoom+0.002,1.35)" : "if(eq(on,1),1.35,max(zoom-0.002,1.0))";
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

      const listFile = `${TMP_DIR}/list_${i}.txt`;
      await writeFile(listFile, miniClips.map(p => `file '${p}'`).join("\n"));

      const concatPath = `${TMP_DIR}/concat_${i}.mp4`;
      await exec("ffmpeg", [
        "-y", "-f", "concat", "-safe", "0", "-i", listFile,
        "-c", "copy", concatPath,
      ]);

      const clipPath = `${TMP_DIR}/scene_${i}.mp4`;
      await exec("ffmpeg", [
        "-y", "-i", concatPath, "-i", audioPath,
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
        clipPath,
      ]);

      subClipPaths.push(clipPath);
      console.log(
        `  [SCENE] ${scene.id}: ${sceneDuration.toFixed(1)}s (${numImages} images, hard cuts)`
      );
    }
  }

  console.log("\n  [FINAL] Joining all scenes with hard cuts...");
  const finalList = `${TMP_DIR}/final_list.txt`;
  await writeFile(finalList, subClipPaths.map(p => `file '${p}'`).join("\n"));

  const normalPath = `${OUTPUT_BASE}.mp4`;
  await exec("ffmpeg", [
    "-y", "-f", "concat", "-safe", "0", "-i", finalList,
    "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k",
    "-t", "28",
    normalPath,
  ]);

  const normalBuf = await readFile(normalPath);
  console.log(`\n[COMPOSE] Output: ${normalPath} (${(normalBuf.length / 1024 / 1024).toFixed(1)} MB)`);

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
  console.log("  GEODUDE™ Infomercial — AI Video Ad Generator");
  console.log("  \"Stability You Can Trust\"");
  console.log("═══════════════════════════════════════════════════════════");

  const totalImages = SCENES.reduce((s, sc) => s + sc.imagePrompts.length, 0);
  console.log(`\n${SCENES.length} scenes, ${totalImages} images, ~26s target`);

  const startTime = Date.now();

  console.log("\n▶ Phase 1+2: Generating images & narration in parallel...");
  const [images, narration] = await Promise.all([
    generateImages(),
    generateNarration(),
  ]);

  console.log("\n▶ Phase 3: Composing infomercial...");
  await composeAd(images, narration);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`  Complete in ${elapsed}s`);
  console.log(`  → ${OUTPUT_BASE}.mp4`);
  console.log(`═══════════════════════════════════════════════════════════`);
}

main().catch((err) => {
  console.error("\n[FATAL]", err);
  process.exit(1);
});
