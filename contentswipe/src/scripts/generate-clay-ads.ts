import "dotenv/config";
import { writeFile } from "fs/promises";
import { supabase } from "../lib/supabase.js";
import { planScript, type VideoScript } from "../pipeline/script-planner.js";
import { generateAudio } from "../pipeline/audio-generator.js";
import { generateVideo } from "../pipeline/video-generator.js";
import { composeVideo } from "../pipeline/compositor.js";

const CLAY_ADS_PROMPT = `
Create a 60-second LinkedIn-style product launch video for Clay Ads. This is a calm, confident, product-forward walkthrough — not flashy. Information-dense, complete sentences, substance over style.

The video should feature PEOPLE — real humans using the product, talking to camera, or shown in office/work settings. Think LinkedIn professional but warm. Mix of UI product shots and people.

Here is the EXACT narration script to follow (use these words verbatim as voiceover):

[0:00–0:08] Opening Context
Visual: Clean UI with subtle motion, a person at their desk looking at Clay on screen
Narration: "Today we're launching Clay Ads — a new product that brings advertising directly into your data workflow."

[0:08–0:20] The Problem
Visual: Light walkthrough of traditional workflow — person frustrated with spreadsheets, CSV exports
Narration: "Today, running ads is fragmented. You export CSVs, upload them into LinkedIn, Meta, and Google, and repeat that process every time your data changes. Match rates are often only 10 to 20 percent, lists quickly go stale, and you end up targeting people that sales teams don't actually care about."

[0:20–0:35] What Clay Ads Does
Visual: Step-by-step UI flow inside Clay — smooth product demo shots
Narration: "Clay Ads replaces that workflow by letting you build and manage audiences directly inside Clay. You start with your data, enrich it using our provider network, and then sync those audiences directly to ad platforms — without exporting or reformatting anything."

[0:35–0:48] Why It's Different (Core Insight)
Visual: Data enrichment flowing, match rate visualization, sync animation
Narration: "The key difference is match rate. By running waterfall enrichment across more than 150 data providers before syncing, Clay is able to achieve over 90 percent match rates on LinkedIn and around 60 to 70 percent on Meta — significantly higher than traditional approaches."

[0:48–0:58] What This Enables
Visual: Real use cases shown in UI, people in meetings discussing campaigns
Narration: "This makes it possible to run more precise ABM campaigns, automatically exclude customers and existing pipeline, target accounts based on real-time signals, and keep audiences continuously updated as your data changes."

[0:58–1:05] Closing / CTA
Visual: Product landing page, Clay logo
Narration: "Clay Ads is live today on LinkedIn and Meta, with deeper Google integration coming soon. You can learn more at clay.com/ads."

IMPORTANT STYLE NOTES:
- Feature real people/professionals throughout — this is a LinkedIn-style video, not a pure product demo
- Camera should be smooth and professional — steady, cinematic
- Modern SaaS aesthetic — clean, minimal, confident
- Mix of product UI screenshots and people using the product
- Tone: authoritative but warm, like a founder explaining their product
- NO flashy transitions, NO hype — substance over style
`;

async function run() {
  console.log("=".repeat(60));
  console.log("Clay Ads Video Generation — One-Shot Pipeline");
  console.log("=".repeat(60));

  // Seed Clay business
  let bizId: string;
  const { data: existing } = await supabase
    .from("businesses")
    .select("id")
    .eq("name", "Clay")
    .single();

  if (existing) {
    bizId = existing.id;
    console.log(`\nUsing existing Clay business: ${bizId}`);
  } else {
    const { data: biz, error } = await supabase
      .from("businesses")
      .insert({
        name: "Clay",
        description:
          "Clay is the data enrichment and outbound platform. Clay Ads brings advertising directly into data workflows with 90%+ match rates via waterfall enrichment across 150+ providers.",
        website_url: "https://clay.com",
      })
      .select()
      .single();

    if (error || !biz) {
      console.error("Failed to create business:", error?.message);
      process.exit(1);
    }
    bizId = biz.id;
    console.log(`\nCreated Clay business: ${bizId}`);
  }

  // Create session
  const { data: session, error: sessErr } = await supabase
    .from("sessions")
    .insert({ business_id: bizId, name: "Clay Ads Launch Video" })
    .select()
    .single();

  if (sessErr || !session) {
    console.error("Failed to create session:", sessErr?.message);
    process.exit(1);
  }
  console.log(`Created session: ${session.id}`);

  // Create content item
  const { data: item, error: itemErr } = await supabase
    .from("content_items")
    .insert({
      title: "Clay Ads Launch — LinkedIn Video",
      body_text:
        "Product launch video for Clay Ads. Calm, confident, product-forward. Features people and product UI in a LinkedIn-style walkthrough.",
      business_id: bizId,
      session_id: session.id,
      content_type: "video",
      channel: "linkedin",
      review_mode: "video",
      source_type: "generated",
      prompt_input_summary: "Clay Ads launch video — 60s LinkedIn product walkthrough",
      generation_status: "queued",
    })
    .select()
    .single();

  if (itemErr || !item) {
    console.error("Failed to create content item:", itemErr?.message);
    process.exit(1);
  }
  console.log(`Created content item: ${item.id}`);

  // Create generation job
  const { data: job, error: jobErr } = await supabase
    .from("generation_jobs")
    .insert({
      prompt: CLAY_ADS_PROMPT,
      content_item_id: item.id,
      status: "processing",
      job_type: "initial",
    })
    .select()
    .single();

  if (jobErr || !job) {
    console.error("Failed to create job:", jobErr?.message);
    process.exit(1);
  }
  console.log(`Created generation job: ${job.id}\n`);

  try {
    // Phase 1: Gemini script planning
    console.log("[PHASE 1] Planning script with Gemini...");
    const script = await planScript({
      businessName: "Clay",
      businessDescription:
        "Clay is the data enrichment and outbound platform. Clay Ads brings advertising directly into data workflows.",
      websiteUrl: "https://clay.com",
      userPrompt: CLAY_ADS_PROMPT,
    });

    console.log(`  Title: "${script.title}"`);
    console.log(`  ${script.scenes.length} scenes, ${script.voiceover.length} VO lines, ${script.sfx.length} SFX cues`);
    console.log(`  Duration: ${script.totalDurationSeconds}s`);
    console.log(`  Camera: ${script.cameraStyle ?? "smooth"}`);

    await supabase
      .from("content_items")
      .update({
        title: script.title,
        script: formatScript(script),
        generation_status: "script_planned",
      })
      .eq("id", item.id);

    // Phase 2: Audio + Video in parallel
    console.log("\n[PHASE 2] Generating audio + video in parallel...");
    const [audioResult, videoBuffer] = await Promise.all([
      generateAudio(script.voiceover, script.sfx),
      generateVideo(script.videoPrompt, script.cameraStyle ?? "smooth"),
    ]);

    const tmpVideoPath = `/tmp/contentswipe-clay-ads-raw.mp4`;
    await writeFile(tmpVideoPath, videoBuffer);

    // Phase 3: Compose
    console.log("\n[PHASE 3] Composing final video...");
    const finalBuffer = await composeVideo({
      videoPath: tmpVideoPath,
      voiceover: audioResult.voiceover,
      sfx: audioResult.sfx,
      scenes: script.scenes,
      totalDuration: script.totalDurationSeconds,
    });

    // Phase 4: Save locally + upload
    const localPath = `${process.cwd()}/output/clay-ads-launch.mp4`;
    await writeFile(localPath, finalBuffer);
    console.log(`\n[SAVED] Local: ${localPath}`);

    const storagePath = `generated/${job.id}.mp4`;
    const { error: uploadErr } = await supabase.storage
      .from("content-videos")
      .upload(storagePath, finalBuffer, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadErr) {
      console.error("Upload failed:", uploadErr.message);
    } else {
      const { data: urlData } = supabase.storage
        .from("content-videos")
        .getPublicUrl(storagePath);

      await supabase
        .from("content_items")
        .update({
          video_url: urlData.publicUrl,
          review_status: "pending",
          generation_status: "completed",
          generation_job_id: job.id,
        })
        .eq("id", item.id);

      await supabase
        .from("generation_jobs")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", job.id);

      console.log(`[UPLOADED] ${urlData.publicUrl}`);
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log("Clay Ads video generation complete!");
    console.log(`Local file: ${localPath}`);
    console.log(`${"=".repeat(60)}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n[FAILED] ${message}`);

    await supabase
      .from("generation_jobs")
      .update({
        status: "failed",
        error_message: message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    await supabase
      .from("content_items")
      .update({ generation_status: "failed" })
      .eq("id", item.id);

    process.exit(1);
  }
}

function formatScript(script: VideoScript): string {
  const lines: string[] = [];
  for (const scene of script.scenes) {
    lines.push(`[${scene.heading}]`);
    lines.push(`Visual: ${scene.visualDescription}`);
    const sceneVO = script.voiceover.filter((v) => v.sceneIndex === scene.index);
    for (const vo of sceneVO) {
      lines.push(`VO: "${vo.text}"`);
    }
    const sceneSfx = script.sfx.filter((s) => s.sceneIndex === scene.index);
    for (const sfx of sceneSfx) {
      lines.push(`SFX: ${sfx.prompt}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
