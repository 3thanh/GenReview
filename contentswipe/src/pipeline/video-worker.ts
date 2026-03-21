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
  content_item_id: string | null;
  source_card_id: string | null;
  job_type: string;
}

async function claimNextJob(): Promise<QueuedJob | null> {
  const { data: jobs, error: queryErr } = await supabase
    .from("generation_jobs")
    .select("*")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1);

  if (queryErr) {
    console.error("[POLL] Query error:", queryErr.message);
    return null;
  }

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

async function processJob(job: QueuedJob): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Job ${job.id} (${job.job_type})`);
  console.log(`${"=".repeat(60)}`);

  try {
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

    if (job.content_item_id) {
      await supabase
        .from("content_items")
        .update({
          title: script.title,
          script: formatScriptForDisplay(script),
          generation_status: "script_planned",
        })
        .eq("id", job.content_item_id);
    }

    console.log("\n[PHASE 2] Generating audio + video in parallel...");
    console.log(`  Camera style: ${script.cameraStyle ?? "stable (default)"}`);

    const [audioResult, videoBuffer] = await Promise.all([
      generateAudio(script.voiceover, script.sfx),
      generateVideo(script.videoPrompt, script.cameraStyle ?? "stable"),
    ]);

    const tmpVideoPath = `/tmp/contentswipe-raw-${job.id}.mp4`;
    await writeFile(tmpVideoPath, videoBuffer);

    console.log("\n[PHASE 3] Composing final video...");

    const finalBuffer = await composeVideo({
      videoPath: tmpVideoPath,
      voiceover: audioResult.voiceover,
      sfx: audioResult.sfx,
      scenes: script.scenes,
      totalDuration: script.totalDurationSeconds,
    });

    console.log("\n[PHASE 4] Uploading to Supabase Storage...");
    const videoUrl = await uploadToStorage(finalBuffer, job.id);

    if (job.content_item_id) {
      await supabase
        .from("content_items")
        .update({
          video_url: videoUrl,
          review_status: "pending",
          generation_status: "completed",
          generation_job_id: job.id,
        })
        .eq("id", job.content_item_id);
    }

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

    if (job.content_item_id) {
      await supabase
        .from("content_items")
        .update({ generation_status: "failed" })
        .eq("id", job.content_item_id);
    }
  }
}

async function getBusinessContext(job: QueuedJob): Promise<{
  name: string;
  description: string;
  websiteUrl?: string;
}> {
  if (job.content_item_id) {
    const { data: item } = await supabase
      .from("content_items")
      .select("business_id")
      .eq("id", job.content_item_id)
      .single();

    if (item?.business_id) {
      const { data: biz } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", item.business_id)
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
    description: "A business creating engaging short-form content.",
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
  console.log("ContentSwipe Generation Worker");
  console.log("Phase 1: Gemini script planning");
  console.log("Phase 2: ElevenLabs audio + Veo video (parallel)");
  console.log("Phase 3: FFmpeg composition");
  console.log(`\nPolling every ${POLL_INTERVAL_MS / 1000}s for queued jobs...\n`);

  let pollCount = 0;
  while (true) {
    pollCount++;
    const job = await claimNextJob();

    if (job) {
      console.log(`[POLL #${pollCount}] Found job ${job.id}`);
      await processJob(job);
    } else {
      if (pollCount <= 3) console.log(`[POLL #${pollCount}] No queued jobs found`);
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
  }
}

export { processJob, claimNextJob };

runWorkerLoop().catch((err) => {
  console.error("Worker crashed:", err);
  process.exit(1);
});
