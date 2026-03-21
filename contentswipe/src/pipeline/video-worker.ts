import "dotenv/config";
import { writeFile } from "fs/promises";
import { supabase } from "../lib/supabase.js";
import { planScript, type VideoScript } from "./script-planner.js";
import { generateAudio, type AudioSegment } from "./audio-generator.js";
import { generateVideo } from "./video-generator.js";
import { composeVideo } from "./compositor.js";

const POLL_INTERVAL_MS = 5_000;

interface QueuedJob {
  id: string;
  prompt: string;
  content_queue_id: string | null;
  source_card_id: string | null;
  job_type: string;
}

async function claimNextJob(): Promise<QueuedJob | null> {
  const { data: jobs } = await supabase
    .from("generation_jobs")
    .select("*")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1);

  if (!jobs?.length) return null;

  const job = jobs[0];
  const { error } = await supabase
    .from("generation_jobs")
    .update({ status: "processing" })
    .eq("id", job.id)
    .eq("status", "queued");

  if (error) return null;
  return job;
}

async function uploadToStorage(
  buffer: Buffer,
  jobId: string
): Promise<string> {
  const path = `generated/${jobId}.mp4`;
  const { error } = await supabase.storage
    .from("content-videos")
    .upload(path, buffer, { contentType: "video/mp4", upsert: true });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from("content-videos").getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Full pipeline for a single job:
 * 1. Plan script (Gemini)
 * 2. Generate audio (ElevenLabs) + video (Veo) in PARALLEL
 * 3. Compose final video (FFmpeg)
 * 4. Upload to Supabase Storage
 */
async function processJob(job: QueuedJob): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Job ${job.id} (${job.job_type})`);
  console.log(`${"=".repeat(60)}`);

  try {
    // --- Phase 1: Script Planning ---
    console.log("\n[PHASE 1] Planning script with Gemini...");

    const businessContext = await getBusinessContext(job);
    const script = await planScript({
      businessName: businessContext.name,
      businessDescription: businessContext.description,
      websiteUrl: businessContext.websiteUrl,
      userPrompt: job.prompt,
    });

    console.log(`  Title: "${script.title}"`);
    console.log(`  ${script.scenes.length} scenes, ${script.voiceover.length} VO lines, ${script.sfx.length} SFX cues`);
    console.log(`  Duration: ${script.totalDurationSeconds}s`);

    // Update content_queue with the script
    if (job.content_queue_id) {
      await supabase
        .from("content_queue")
        .update({
          title: script.title,
          script: formatScriptForDisplay(script),
        })
        .eq("id", job.content_queue_id);
    }

    // --- Phase 2: Parallel Audio + Video Generation ---
    console.log("\n[PHASE 2] Generating audio + video in parallel...");

    const [audioResult, videoBuffer] = await Promise.all([
      generateAudio(script.voiceover, script.sfx),
      generateVideo(script.videoPrompt),
    ]);

    // Write video to tmp for FFmpeg
    const tmpVideoPath = `/tmp/contentswipe-raw-${job.id}.mp4`;
    await writeFile(tmpVideoPath, videoBuffer);

    // --- Phase 3: Compose ---
    console.log("\n[PHASE 3] Composing final video...");

    const finalBuffer = await composeVideo({
      videoPath: tmpVideoPath,
      voiceover: audioResult.voiceover,
      sfx: audioResult.sfx,
      scenes: script.scenes,
      totalDuration: script.totalDurationSeconds,
    });

    // --- Phase 4: Upload ---
    console.log("\n[PHASE 4] Uploading to Supabase Storage...");
    const videoUrl = await uploadToStorage(finalBuffer, job.id);

    // Update content_queue with the final video
    if (job.content_queue_id) {
      await supabase
        .from("content_queue")
        .update({ video_url: videoUrl, status: "pending" })
        .eq("id", job.content_queue_id);
    }

    // Mark job completed
    await supabase
      .from("generation_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    console.log(`\n[DONE] Job ${job.id} completed -> ${videoUrl}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n[FAILED] Job ${job.id}: ${message}`);

    await supabase
      .from("generation_jobs")
      .update({
        status: "failed",
        error_message: message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);
  }
}

async function getBusinessContext(job: QueuedJob): Promise<{
  name: string;
  description: string;
  websiteUrl?: string;
}> {
  if (job.content_queue_id) {
    const { data: card } = await supabase
      .from("content_queue")
      .select("business_id")
      .eq("id", job.content_queue_id)
      .single();

    if (card?.business_id) {
      const { data: biz } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", card.business_id)
        .single();

      if (biz) {
        return {
          name: biz.name,
          description: biz.description ?? "",
          websiteUrl: biz.website_url ?? undefined,
        };
      }
    }
  }

  return {
    name: "My Business",
    description: "A business creating engaging short-form video content.",
  };
}

function formatScriptForDisplay(script: VideoScript): string {
  const lines: string[] = [];

  for (const scene of script.scenes) {
    lines.push(`[${scene.heading}]`);
    lines.push(`Visual: ${scene.visualDescription}`);

    const sceneVO = script.voiceover.filter(
      (v) => v.sceneIndex === scene.index
    );
    for (const vo of sceneVO) {
      const label =
        vo.speaker === "narrator" ? "VO" : vo.speaker.toUpperCase();
      lines.push(`${label}: "${vo.text}"`);
    }

    const sceneSfx = script.sfx.filter((s) => s.sceneIndex === scene.index);
    for (const sfx of sceneSfx) {
      lines.push(`SFX: ${sfx.prompt}`);
    }

    lines.push("");
  }

  return lines.join("\n");
}

async function runWorkerLoop(): Promise<void> {
  console.log("ContentSwipe Video Worker — Split Pipeline");
  console.log("Phase 1: Gemini script planning");
  console.log("Phase 2: ElevenLabs audio + Veo video (parallel)");
  console.log("Phase 3: FFmpeg composition");
  console.log(`\nPolling every ${POLL_INTERVAL_MS / 1000}s for queued jobs...\n`);

  while (true) {
    const job = await claimNextJob();

    if (job) {
      await processJob(job);
    } else {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
  }
}

export { processJob, claimNextJob };

runWorkerLoop().catch((err) => {
  console.error("Worker crashed:", err);
  process.exit(1);
});
