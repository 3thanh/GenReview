import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { readFile } from "fs/promises";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_KEY) throw new Error("Missing GEMINI_API_KEY");

const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
const MODEL = "veo-3.1-generate-preview";
const POLL_INTERVAL_MS = 10_000;

/**
 * Generate a video using Veo 3.1 from a visual-only prompt.
 * Returns raw video buffer (MP4). Audio is handled separately.
 */
export async function generateVideo(videoPrompt: string): Promise<Buffer> {
  console.log("\n[VIDEO] Starting Veo generation...");
  console.log(`  Model: ${MODEL}`);
  console.log(`  Prompt: ${videoPrompt.slice(0, 150)}...`);

  let operation = await ai.models.generateVideos({
    model: MODEL,
    prompt: videoPrompt,
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
