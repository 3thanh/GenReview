import "dotenv/config";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "../lib/supabase.js";

const exec = promisify(execFile);

const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY!;
const GEMINI_KEY = process.env.GEMINI_API_KEY!;
if (!ELEVENLABS_KEY) throw new Error("Missing ELEVENLABS_API_KEY");
if (!GEMINI_KEY) throw new Error("Missing GEMINI_API_KEY");

const elClient = new ElevenLabsClient({ apiKey: ELEVENLABS_KEY });
const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });

const TMP_DIR = "/tmp/contentswipe-clay-ads";
const VOICE_SAMPLE_PATH = `${process.cwd()}/output/hari-voice-sample.mp3`;
const HARI_VOICE_ID_CACHE = `${process.cwd()}/output/.hari-voice-id`;

const HARI_DESCRIPTION = "A young South Asian man in his mid-20s with dark brown skin and short dark hair, wearing a casual light-colored t-shirt. He is sitting in a modern home office with bookshelves behind him, speaking into a professional podcast microphone on a boom arm. The lighting is warm and natural from a window.";

interface Scene {
  id: string;
  startSec: number;
  endSec: number;
  narration: string;
  visualPrompt: string;
  sfxPrompt?: string;
}

const SCENES: Scene[] = [
  {
    id: "opening",
    startSec: 0,
    endSec: 8,
    narration: "Today we're launching Clay Ads — a new product that brings advertising directly into your data workflow.",
    visualPrompt: `${HARI_DESCRIPTION} He looks directly at the camera with a calm, confident smile and begins speaking. Behind him on a secondary monitor, the Clay product interface is faintly visible. Smooth steady camera on a tripod, no movement.`,
    sfxPrompt: "Soft ambient office hum with gentle keyboard taps in the background",
  },
  {
    id: "problem-1",
    startSec: 8,
    endSec: 16,
    narration: "Today, running ads is fragmented. You export CSVs, upload them into LinkedIn, Meta, and Google, and repeat that process every time your data changes.",
    visualPrompt: `Close-up of a computer screen showing a messy spreadsheet with CSV data, someone's hands dragging files between browser tabs — LinkedIn Ads Manager, Meta Ads, Google Ads. The desktop is cluttered with CSV files. Smooth dolly across the screen. Professional studio lighting.`,
    sfxPrompt: "Rapid frustrated keyboard clicking and mouse dragging sounds",
  },
  {
    id: "problem-2",
    startSec: 16,
    endSec: 22,
    narration: "Match rates are often only 10 to 20 percent, lists quickly go stale, and you end up targeting people that sales teams don't actually care about.",
    visualPrompt: `${HARI_DESCRIPTION} He has a slightly frustrated, empathetic expression as he explains a common pain point. He gestures with one hand while speaking into the microphone. Locked tripod shot, no camera movement.`,
  },
  {
    id: "solution",
    startSec: 22,
    endSec: 30,
    narration: "Clay Ads replaces that workflow by letting you build and manage audiences directly inside Clay. You start with your data, enrich it using our provider network, and then sync those audiences directly to ad platforms — without exporting or reformatting anything.",
    visualPrompt: `A clean, modern SaaS product interface showing a data table with columns of company names, contact emails, and enrichment fields being automatically populated. A smooth animation shows data flowing from left to right through enrichment steps, then syncing to ad platform icons (LinkedIn, Meta). Professional screen recording style with smooth cursor movements. Bright, modern UI with a dark sidebar.`,
    sfxPrompt: "Crisp subtle UI click sounds and gentle digital whooshes indicating smooth data flow",
  },
  {
    id: "solution-2",
    startSec: 30,
    endSec: 36,
    narration: "",
    visualPrompt: `Continuation of the product UI demo: the Clay interface shows an "Audience Sync" panel with checkboxes for LinkedIn, Meta, and Google. A progress bar fills smoothly to 100%. Green checkmarks appear next to each platform. Clean, minimal SaaS design. Smooth steady camera.`,
  },
  {
    id: "differentiator",
    startSec: 36,
    endSec: 44,
    narration: "The key difference is match rate. By running waterfall enrichment across more than 150 data providers before syncing, Clay is able to achieve over 90 percent match rates on LinkedIn and around 60 to 70 percent on Meta — significantly higher than traditional approaches.",
    visualPrompt: `${HARI_DESCRIPTION} He leans slightly forward with conviction, making direct eye contact with the camera. His expression is confident and authoritative as he emphasizes important numbers. He holds up his hand briefly when saying "90 percent". Locked tripod shot.`,
    sfxPrompt: "Soft ascending digital chime when match rate numbers are mentioned",
  },
  {
    id: "differentiator-2",
    startSec: 44,
    endSec: 50,
    narration: "",
    visualPrompt: `A clean data visualization showing a comparison bar chart: "Traditional Match Rate: 15%" in red versus "Clay Match Rate: 92%" in green. The bars animate in smoothly. Below, logos of data providers scroll horizontally — showing scale. Modern, minimal design with a dark background. Professional motion graphics style.`,
  },
  {
    id: "enables",
    startSec: 50,
    endSec: 58,
    narration: "This makes it possible to run more precise ABM campaigns, automatically exclude customers and existing pipeline, target accounts based on real-time signals, and keep audiences continuously updated as your data changes.",
    visualPrompt: `${HARI_DESCRIPTION} He is animated and engaged, counting off use cases on his fingers as he speaks. His expression is optimistic and empowering. The bookshelves and warm lighting create a professional but approachable atmosphere. Locked tripod shot.`,
  },
  {
    id: "cta",
    startSec: 58,
    endSec: 65,
    narration: "Clay Ads is live today on LinkedIn and Meta, with deeper Google integration coming soon. You can learn more at clay.com/ads.",
    visualPrompt: `${HARI_DESCRIPTION} He smiles warmly and directly at the camera, delivering the final call to action. He gives a small nod at the end. The background is softly out of focus. Locked tripod shot, warm lighting.`,
    sfxPrompt: "Gentle uplifting synth swell and a soft digital shimmer",
  },
];

async function ensureTmpDir() {
  await mkdir(TMP_DIR, { recursive: true });
}

async function getOrCloneVoice(): Promise<string> {
  try {
    const cached = (await readFile(HARI_VOICE_ID_CACHE, "utf-8")).trim();
    if (cached) {
      console.log(`[VOICE] Using cached Hari voice ID: ${cached}`);
      return cached;
    }
  } catch {}

  console.log("[VOICE] Cloning Hari's voice from LinkedIn video...");
  const sampleBuffer = await readFile(VOICE_SAMPLE_PATH);
  const sampleFile = new File([sampleBuffer], "hari-voice-sample.mp3", { type: "audio/mpeg" });

  const voice = await elClient.voices.ivc.create({
    name: `Hari Kumar — Clay ${Date.now()}`,
    files: [sampleFile],
    description: "Young South Asian male, confident, warm, tech founder energy.",
    removeBackgroundNoise: true,
  });

  await writeFile(HARI_VOICE_ID_CACHE, voice.voiceId);
  console.log(`[VOICE] Cloned! Voice ID: ${voice.voiceId}`);
  return voice.voiceId;
}

async function generateVO(voiceId: string, scene: Scene): Promise<{ audioBase64: string; durationSeconds: number }> {
  if (!scene.narration) return { audioBase64: "", durationSeconds: 0 };

  console.log(`  [TTS] ${scene.id}: "${scene.narration.slice(0, 70)}..."`);

  const response = await elClient.textToSpeech.convertWithTimestamps(voiceId, {
    text: scene.narration,
    modelId: "eleven_multilingual_v2",
    voiceSettings: {
      stability: 0.4,
      similarityBoost: 0.85,
      style: 0.45,
    },
  });

  const endTimes = response.alignment?.characterEndTimesSeconds ?? [];
  const duration = endTimes.length > 0 ? endTimes[endTimes.length - 1] : 0;

  return { audioBase64: response.audioBase64, durationSeconds: duration };
}

async function generateSfx(scene: Scene): Promise<{ audioBase64: string; durationSeconds: number } | null> {
  if (!scene.sfxPrompt) return null;

  const dur = scene.endSec - scene.startSec;
  console.log(`  [SFX] ${scene.id}: "${scene.sfxPrompt}" (${dur}s)`);

  const stream = await elClient.textToSoundEffects.convert({
    text: scene.sfxPrompt,
    durationSeconds: dur,
    promptInfluence: 0.4,
  });

  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);
  return { audioBase64: buffer.toString("base64"), durationSeconds: dur };
}

async function generateSceneVideo(scene: Scene): Promise<string> {
  const dur = scene.endSec - scene.startSec;
  const cameraPrefix = "Professional steadicam or gimbal-stabilized camera. No handheld shake. Only gentle, fluid motions. Studio-quality stabilization.";
  const antiShake = "Do not use handheld camera. No camera shake. No wobble. Keep camera perfectly steady.";
  const prompt = `${cameraPrefix} ${scene.visualPrompt} ${antiShake}`;

  console.log(`  [VEO] ${scene.id} (${dur}s): generating...`);

  let operation = await ai.models.generateVideos({
    model: "veo-3.1-generate-preview",
    prompt,
    config: {
      personGeneration: "allow_all",
      aspectRatio: "16:9",
      numberOfVideos: 1,
    },
  });

  let elapsed = 0;
  while (!operation.done) {
    await new Promise((r) => setTimeout(r, 10_000));
    elapsed += 10_000;
    console.log(`  [VEO] ${scene.id}: waiting... (${Math.round(elapsed / 1000)}s)`);
    operation = await ai.operations.getVideosOperation({ operation });
  }

  const generated = operation.response?.generatedVideos;
  if (!generated?.length || !generated[0].video) {
    throw new Error(`Veo returned no video for scene ${scene.id}`);
  }

  const outPath = `${TMP_DIR}/scene-${scene.id}.mp4`;
  await ai.files.download({ file: generated[0].video, downloadPath: outPath });

  const buf = await readFile(outPath);
  console.log(`  [VEO] ${scene.id}: done (${(buf.length / 1024 / 1024).toFixed(1)}MB, ${Math.round(elapsed / 1000)}s)`);
  return outPath;
}

async function concatVideos(scenePaths: { path: string; targetDuration: number }[]): Promise<string> {
  console.log("\n[CONCAT] Joining scene clips...");

  const scaledPaths: string[] = [];
  for (let i = 0; i < scenePaths.length; i++) {
    const { path: srcPath, targetDuration } = scenePaths[i];
    const scaledPath = `${TMP_DIR}/scaled-${i}.mp4`;

    // Trim each clip to the target scene duration
    await exec("ffmpeg", [
      "-y", "-i", srcPath,
      "-t", String(targetDuration),
      "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:-1:-1:color=black",
      "-c:v", "libx264", "-preset", "fast", "-crf", "23",
      "-an",
      "-r", "30",
      scaledPath,
    ]);
    scaledPaths.push(scaledPath);
  }

  const listFile = `${TMP_DIR}/concat-list.txt`;
  const listContent = scaledPaths.map((p) => `file '${p}'`).join("\n");
  await writeFile(listFile, listContent);

  const outPath = `${TMP_DIR}/concat-full.mp4`;
  await exec("ffmpeg", [
    "-y", "-f", "concat", "-safe", "0", "-i", listFile,
    "-c", "copy", outPath,
  ]);

  const buf = await readFile(outPath);
  console.log(`[CONCAT] Done: ${(buf.length / 1024 / 1024).toFixed(1)}MB`);
  return outPath;
}

async function buildVoiceoverTrack(
  voSegments: { sceneIndex: number; audioBase64: string; durationSeconds: number; startSec: number }[]
): Promise<string> {
  console.log("\n[MIX] Building voiceover track...");

  const totalDuration = SCENES[SCENES.length - 1].endSec;

  // Write individual VO files
  const voPaths: string[] = [];
  for (let i = 0; i < voSegments.length; i++) {
    const seg = voSegments[i];
    if (!seg.audioBase64) continue;
    const p = `${TMP_DIR}/vo-${i}.mp3`;
    await writeFile(p, Buffer.from(seg.audioBase64, "base64"));
    voPaths.push(p);
  }

  if (voPaths.length === 0) throw new Error("No voiceover segments");

  // Place each VO at the correct offset using adelay
  const inputs = voPaths.flatMap((p) => ["-i", p]);
  const validSegs = voSegments.filter((s) => s.audioBase64);
  const delays = validSegs.map((seg, i) => {
    const delayMs = Math.round(seg.startSec * 1000);
    return `[${i}]adelay=${delayMs}|${delayMs}[vo${i}]`;
  });
  const mixInputs = validSegs.map((_, i) => `[vo${i}]`).join("");
  const filterComplex = [
    ...delays,
    `${mixInputs}amix=inputs=${voPaths.length}:duration=longest:dropout_transition=0[out]`,
  ].join(";");

  const outPath = `${TMP_DIR}/voiceover-track.mp3`;
  await exec("ffmpeg", [
    "-y", ...inputs,
    "-filter_complex", filterComplex,
    "-map", "[out]",
    "-t", String(totalDuration),
    outPath,
  ]);

  console.log("[MIX] Voiceover track ready");
  return outPath;
}

async function buildSfxTrack(
  sfxSegments: { sceneIndex: number; audioBase64: string; durationSeconds: number; startSec: number }[]
): Promise<string | null> {
  const valid = sfxSegments.filter((s) => s.audioBase64);
  if (valid.length === 0) return null;

  console.log("[MIX] Building SFX track...");

  const totalDuration = SCENES[SCENES.length - 1].endSec;
  const sfxPaths: string[] = [];
  for (let i = 0; i < valid.length; i++) {
    const p = `${TMP_DIR}/sfx-${i}.mp3`;
    await writeFile(p, Buffer.from(valid[i].audioBase64, "base64"));
    sfxPaths.push(p);
  }

  const inputs = sfxPaths.flatMap((p) => ["-i", p]);
  const delays = valid.map((seg, i) => {
    const delayMs = Math.round(seg.startSec * 1000);
    return `[${i}]adelay=${delayMs}|${delayMs}[sfx${i}]`;
  });
  const mixInputs = valid.map((_, i) => `[sfx${i}]`).join("");
  const filterComplex = [
    ...delays,
    `${mixInputs}amix=inputs=${sfxPaths.length}:duration=longest:dropout_transition=2[out]`,
  ].join(";");

  const outPath = `${TMP_DIR}/sfx-track.mp3`;
  await exec("ffmpeg", [
    "-y", ...inputs,
    "-filter_complex", filterComplex,
    "-map", "[out]",
    "-t", String(totalDuration),
    outPath,
  ]);

  console.log("[MIX] SFX track ready");
  return outPath;
}

async function finalCompose(videoPath: string, voTrack: string, sfxTrack: string | null): Promise<Buffer> {
  console.log("\n[COMPOSE] Merging video + audio...");
  const outPath = `${TMP_DIR}/final.mp4`;

  if (sfxTrack) {
    await exec("ffmpeg", [
      "-y",
      "-i", videoPath,
      "-i", voTrack,
      "-i", sfxTrack,
      "-filter_complex",
      "[1:a]volume=1.0[vo];[2:a]volume=0.2[sfx];[vo][sfx]amix=inputs=2:duration=longest[audio]",
      "-map", "0:v",
      "-map", "[audio]",
      "-c:v", "copy",
      "-c:a", "aac", "-b:a", "192k",
      "-shortest",
      outPath,
    ]);
  } else {
    await exec("ffmpeg", [
      "-y",
      "-i", videoPath,
      "-i", voTrack,
      "-map", "0:v", "-map", "1:a",
      "-c:v", "copy",
      "-c:a", "aac", "-b:a", "192k",
      "-shortest",
      outPath,
    ]);
  }

  const buf = await readFile(outPath);
  console.log(`[COMPOSE] Final: ${(buf.length / 1024 / 1024).toFixed(1)}MB`);
  return buf;
}

async function run() {
  console.log("=".repeat(60));
  console.log("Clay Ads — Hari Kumar (Multi-Scene, Exact Script)");
  console.log("=".repeat(60));
  console.log(`Scenes: ${SCENES.length}`);
  console.log(`Target duration: ${SCENES[SCENES.length - 1].endSec}s\n`);

  await ensureTmpDir();

  const hariVoiceId = await getOrCloneVoice();

  // Phase 1: Generate all voiceover + SFX (sequential to avoid rate limits on TTS)
  console.log("\n[PHASE 1] Generating voiceover with Hari's voice...");
  const voSegments: { sceneIndex: number; audioBase64: string; durationSeconds: number; startSec: number }[] = [];
  const sfxSegments: { sceneIndex: number; audioBase64: string; durationSeconds: number; startSec: number }[] = [];

  for (let i = 0; i < SCENES.length; i++) {
    const scene = SCENES[i];
    const vo = await generateVO(hariVoiceId, scene);
    voSegments.push({ sceneIndex: i, audioBase64: vo.audioBase64, durationSeconds: vo.durationSeconds, startSec: scene.startSec });

    const sfx = await generateSfx(scene);
    if (sfx) {
      sfxSegments.push({ sceneIndex: i, audioBase64: sfx.audioBase64, durationSeconds: sfx.durationSeconds, startSec: scene.startSec });
    }
  }

  console.log(`\n  Total VO segments: ${voSegments.filter(v => v.audioBase64).length}`);
  console.log(`  Total SFX segments: ${sfxSegments.length}`);

  // Phase 2: Generate all video clips in parallel (batched to avoid quota issues)
  console.log("\n[PHASE 2] Generating video clips with Veo...");
  const BATCH_SIZE = 3;
  const scenePaths: { path: string; targetDuration: number }[] = [];

  for (let i = 0; i < SCENES.length; i += BATCH_SIZE) {
    const batch = SCENES.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map((scene) => generateSceneVideo(scene)));
    for (let j = 0; j < batch.length; j++) {
      scenePaths.push({ path: results[j], targetDuration: batch[j].endSec - batch[j].startSec });
    }
  }

  // Phase 3: Concatenate video + build audio tracks + compose
  const concatPath = await concatVideos(scenePaths);
  const voTrack = await buildVoiceoverTrack(voSegments);
  const sfxTrack = await buildSfxTrack(sfxSegments);
  const finalBuffer = await finalCompose(concatPath, voTrack, sfxTrack);

  // Save locally
  const localPath = `${process.cwd()}/output/clay-ads-hari.mp4`;
  await writeFile(localPath, finalBuffer);
  console.log(`\n[SAVED] ${localPath}`);

  // Upload to Supabase
  let bizId: string;
  const { data: existing } = await supabase.from("businesses").select("id").eq("name", "Clay").single();
  bizId = existing?.id ?? "";

  if (bizId) {
    const { data: session } = await supabase.from("sessions")
      .insert({ business_id: bizId, name: "Clay Ads — Hari v2" }).select().single();

    const { data: item } = await supabase.from("content_items").insert({
      title: "Clay Ads Launch — Hari Kumar (v2 multi-scene)",
      body_text: "60s product launch video with Hari's cloned voice, multi-scene Veo generation, exact script match.",
      business_id: bizId, session_id: session!.id,
      content_type: "video", channel: "linkedin", review_mode: "video",
      source_type: "generated", generation_status: "completed",
      prompt_input_summary: "Clay Ads — exact script, Hari voice, 9 scene clips stitched",
    }).select().single();

    const storagePath = `generated/clay-ads-hari-v2-${Date.now()}.mp4`;
    const { error: uploadErr } = await supabase.storage.from("content-videos")
      .upload(storagePath, finalBuffer, { contentType: "video/mp4", upsert: true });

    if (!uploadErr) {
      const { data: urlData } = supabase.storage.from("content-videos").getPublicUrl(storagePath);
      await supabase.from("content_items").update({
        video_url: urlData.publicUrl, review_status: "pending",
      }).eq("id", item!.id);
      console.log(`[UPLOADED] ${urlData.publicUrl}`);
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("Done! Clay Ads (Hari Kumar, multi-scene) complete.");
  console.log(`File: ${localPath}`);
  console.log(`${"=".repeat(60)}`);
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
