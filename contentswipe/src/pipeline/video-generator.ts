import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { readFile } from "fs/promises";
import type { CameraStyle } from "./script-planner.js";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_KEY) throw new Error("Missing GEMINI_API_KEY");

const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
const MODEL = "veo-3.1-generate-preview";
const POLL_INTERVAL_MS = 10_000;

const CAMERA_PREFIXES: Record<CameraStyle, string> = {
  stable: "Smooth, locked-off tripod camera with no shake or handheld movement. Steady, cinematic framing.",
  smooth: "Smooth, fluid camera movement — gentle dolly and pan motions, no handheld shake. Professional steadicam feel.",
  dynamic: "Energetic camera with controlled tracking shots and purposeful motion. Not shaky, but active and engaging.",
  handheld: "Subtle handheld camera feel with natural micro-movements. Documentary style, slightly organic but not jarring.",
  chaotic: "Intense handheld camera with visible shake and urgency. Frenetic, raw energy.",
};

/**
 * Generate a video using Veo 3.1 from a visual-only prompt.
 * Returns raw video buffer (MP4). Audio is handled separately.
 */
export async function generateVideo(
  videoPrompt: string,
  cameraStyle: CameraStyle = "smooth",
): Promise<Buffer> {
  const styledPrompt = `${CAMERA_PREFIXES[cameraStyle]} ${videoPrompt}`;

  console.log("\n[VIDEO] Starting Veo generation...");
  console.log(`  Model: ${MODEL}`);
  console.log(`  Camera: ${cameraStyle}`);
  console.log(`  Prompt: ${styledPrompt.slice(0, 200)}...`);

  let operation = await ai.models.generateVideos({
    model: MODEL,
    prompt: styledPrompt,
  });

  let elapsed = 0;
  while (!operation.done) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    elapsed += POLL_INTERVAL_MS;
    console.log(
      `  [VIDEO] Waiting... (${Math.round(elapsed / 1000)}s elapsed)`
    );
    operation = await ai.operations.getVideosOperation({ operation });
  }

  const generated = operation.response?.generatedVideos;
  if (!generated?.length) {
    throw new Error("Veo returned no video");
  }

  const video = generated[0].video;
  if (!video) {
    throw new Error("Video object is empty in Veo response");
  }

  const tmpPath = `/tmp/contentswipe-veo-${Date.now()}.mp4`;
  await ai.files.download({ file: video, downloadPath: tmpPath });
  const buffer = await readFile(tmpPath);

  console.log(
    `[VIDEO] Done (${(buffer.length / 1024 / 1024).toFixed(1)}MB, ${Math.round(elapsed / 1000)}s)`
  );

  return buffer;
}
