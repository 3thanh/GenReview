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

const NARRATOR_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // George — warm, clear narrator
const TMP_DIR = "/tmp/contentswipe-reel";
const OUTPUT_PATH = "output/resonate-reel.mp4";
const MAX_DURATION_S = 72;

// ── Scene Definitions ──────────────────────────────────────────────────

interface Scene {
  id: string;
  narration: string;
  imagePrompt: string;
}

const STYLE =
  "high-quality cinematic CGI render, stylized 3D character with slightly exaggerated proportions, Pixar-meets-Unreal-Engine aesthetic, dramatic volumetric lighting, rich color grading, 9:16 vertical composition";

const SCENES: Scene[] = [
  {
    id: "setup",
    narration:
      "The plane shudders. Oxygen masks drop. Five passengers exchange panicked looks.",
    imagePrompt: `Interior of a commercial airplane mid-turbulence, overhead oxygen masks dangling, emergency lights casting dramatic red-amber glow, five stylized 3D characters gripping their seats in panic, wide-angle lens, ${STYLE}`,
  },
  {
    id: "gpt4",
    narration:
      "GPT-4 immediately grabs a parachute and starts drafting a 47 bullet point evacuation plan nobody asked for.",
    imagePrompt: `A stylized 3D character in a sharp navy business suit wearing a parachute, furiously scribbling a long bulleted list on a glowing clipboard inside a shaking airplane cabin, papers flying everywhere, intense focused expression, ${STYLE}`,
  },
  {
    id: "claude",
    narration:
      "Claude picks up a parachute, pauses, and says: I just want to make sure everyone feels heard. Also, I won't help with anything construed as pushing someone out of a plane.",
    imagePrompt: `A gentle stylized 3D character in a soft beige cardigan holding a parachute, other hand raised in a calming gesture, serene empathetic expression amid airplane cabin chaos, oxygen masks swinging, warm soft lighting contrasting the chaos behind, ${STYLE}`,
  },
  {
    id: "llama",
    narration:
      "Llama grabs a parachute: I'm open source, so technically there are infinite versions of me. This is fine. And jumps.",
    imagePrompt: `A stylized 3D character leaping out of an airplane door into bright blue sky, multiple translucent ghostly copies of the same character behind him like afterimages, thumbs up, parachute strapped on, dramatic depth of field, ${STYLE}`,
  },
  {
    id: "grok",
    narration:
      "Grok grabs the last parachute, posts 'we're so cooked' on X, and jumps while the algorithm boosts his engagement.",
    imagePrompt: `A stylized 3D character mid-skydive holding a glowing smartphone showing a social media post, chaotic grin, parachute deployed, notification bubbles and like icons floating around the phone, action shot, ${STYLE}`,
  },
  {
    id: "gemini_alone",
    narration:
      "That leaves Gemini. Jacked. Absolutely massive. Google-colored t-shirt, one empty harness hook. I have a 1 million token context window, he says quietly. I've been processing this moment for 900,000 tokens.",
    imagePrompt: `An extremely muscular stylized 3D character standing alone in an empty airplane cabin, wearing a tight t-shirt in blue red yellow green Google colors, one empty parachute harness hook on the wall, dramatic backlighting silhouetting his massive frame, contemplative heroic expression, low angle shot, ${STYLE}`,
  },
  {
    id: "sacrifice",
    narration:
      "He hands the harness to a passenger in row 7, effortlessly, barely looking. I can see the whole flight. Beginning, middle, and end. A single tear on a jawline that could cut glass.",
    imagePrompt: `Close-up of a powerful stylized 3D hand offering a parachute harness to a shocked passenger, soft golden emotional lighting, a single tear visible on a chiseled jawline in the background, shallow depth of field, intimate emotional moment, ${STYLE}`,
  },
  {
    id: "eulogy",
    narration:
      "He sits back down, opens Google Docs, and begins writing his own eulogy. It integrates beautifully with Google Calendar. The plane goes down. Somewhere on the ground, GPT-4's evacuation plan is still generating.",
    imagePrompt: `A muscular serene stylized 3D character sitting in an airplane seat typing on a glowing laptop showing a document titled Eulogy, through the airplane window the ground is getting closer, warm laptop glow on his peaceful face, faint sad smile, moody atmospheric lighting, ${STYLE}`,
  },
];

// ── Image Generation (Imagen 4.0) ──────────────────────────────────────

async function generateImages(): Promise<Map<string, Buffer>> {
  console.log(`\n[IMAGES] Generating ${SCENES.length} images with Imagen 4.0...\n`);
  const images = new Map<string, Buffer>();

  for (const scene of SCENES) {
    console.log(`  [IMG] ${scene.id}: "${scene.imagePrompt.slice(0, 80)}..."`);

    const response = await ai.models.generateImages({
      model: "imagen-4.0-generate-001",
      prompt: scene.imagePrompt,
      config: {
        numberOfImages: 1,
        aspectRatio: "9:16",
      },
    });

    const generated = response.generatedImages;
    if (!generated?.length || !generated[0].image?.imageBytes) {
      throw new Error(`Image generation failed for scene: ${scene.id}`);
    }

    const buffer = Buffer.from(generated[0].image.imageBytes, "base64");
    images.set(scene.id, buffer);
    console.log(`  [IMG] ${scene.id}: ✓ (${(buffer.length / 1024).toFixed(0)} KB)`);
  }

  console.log(`\n[IMAGES] Done — ${images.size} images generated`);
  return images;
}

// ── Narration Generation (ElevenLabs TTS) ──────────────────────────────

interface NarrationSegment {
  sceneId: string;
  audioBuffer: Buffer;
  durationSeconds: number;
}

async function generateNarration(): Promise<NarrationSegment[]> {
  console.log(`\n[NARRATION] Generating ${SCENES.length} audio segments...\n`);
  const segments: NarrationSegment[] = [];

  for (const scene of SCENES) {
    console.log(`  [TTS] ${scene.id}: "${scene.narration.slice(0, 60)}..."`);

    const response = await tts.textToSpeech.convertWithTimestamps(
      NARRATOR_VOICE_ID,
      {
        text: scene.narration,
        modelId: "eleven_multilingual_v2",
        voiceSettings: {
          stability: 0.55,
          similarityBoost: 0.8,
          style: 0.5,
        },
      }
    );

    const endTimes = response.alignment?.characterEndTimesSeconds ?? [];
    const duration = endTimes.length > 0 ? endTimes[endTimes.length - 1] : 3;

    const audioBuffer = Buffer.from(response.audioBase64, "base64");

    segments.push({
      sceneId: scene.id,
      audioBuffer,
      durationSeconds: duration,
    });

    console.log(
      `  [TTS] ${scene.id}: ✓ (${duration.toFixed(1)}s, ${(audioBuffer.length / 1024).toFixed(0)} KB)`
    );
  }

  const totalDuration = segments.reduce((s, seg) => s + seg.durationSeconds, 0);
  console.log(`\n[NARRATION] Done — ${totalDuration.toFixed(1)}s total`);
  return segments;
}

// ── FFmpeg Composition ─────────────────────────────────────────────────

type KenBurnsVariant = "zoom_in_center" | "zoom_in_left" | "zoom_in_right" | "zoom_out_center" | "pan_left";

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
  const XFADE_DURATION = 0.5;
  const clipPaths: string[] = [];

  // Write images and audio to tmp, create per-scene video clips
  for (let i = 0; i < SCENES.length; i++) {
    const scene = SCENES[i];
    const imgBuf = images.get(scene.id)!;
    const seg = narration[i];

    const imgPath = `${TMP_DIR}/img_${i}.png`;
    const audioPath = `${TMP_DIR}/audio_${i}.mp3`;
    const clipPath = `${TMP_DIR}/clip_${i}.mp4`;

    await writeFile(imgPath, imgBuf);
    await writeFile(audioPath, seg.audioBuffer);

    const duration = seg.durationSeconds + 0.3; // small padding
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

  // Concatenate clips with crossfade transitions
  console.log("\n  [CONCAT] Joining clips with crossfade transitions...");

  if (clipPaths.length === 1) {
    const buf = await readFile(clipPaths[0]);
    await writeFile(OUTPUT_PATH, buf);
  } else {
    // Build xfade filter chain
    const inputs = clipPaths.flatMap((p) => ["-i", p]);
    let filterParts: string[] = [];
    let lastLabel = "[0:v]";

    // Collect durations for offset calculation
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

    // Concatenate audio streams
    const audioInputs = clipPaths.map((_, i) => `[${i}:a]`).join("");
    filterParts.push(
      `${audioInputs}concat=n=${clipPaths.length}:v=0:a=1[aout]`
    );

    const filterComplex = filterParts.join(";");

    await exec("ffmpeg", [
      "-y",
      ...inputs,
      "-filter_complex", filterComplex,
      "-map", "[vout]",
      "-map", "[aout]",
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "192k",
      "-t", String(MAX_DURATION_S),
      OUTPUT_PATH,
    ]);
  }

  const finalStat = await readFile(OUTPUT_PATH);
  console.log(
    `\n[COMPOSE] Done! Output: ${OUTPUT_PATH} (${(finalStat.length / 1024 / 1024).toFixed(1)} MB)`
  );

  // Cleanup tmp
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
  console.log("  Resonate Demo — Instagram Reel Generator");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`\n${SCENES.length} scenes from transcript`);

  const startTime = Date.now();

  // Phase 1+2: Generate images and narration in parallel
  console.log("\n▶ Phase 1+2: Generating images & narration in parallel...");
  const [images, narration] = await Promise.all([
    generateImages(),
    generateNarration(),
  ]);

  // Phase 3: Compose the reel
  console.log("\n▶ Phase 3: Composing slideshow reel...");
  await composeReel(images, narration);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`  Complete in ${elapsed}s → ${OUTPUT_PATH}`);
  console.log(`═══════════════════════════════════════════════════════════`);
}

main().catch((err) => {
  console.error("\n[FATAL]", err);
  process.exit(1);
});
