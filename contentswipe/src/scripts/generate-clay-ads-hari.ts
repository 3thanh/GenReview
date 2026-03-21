import "dotenv/config";
import { writeFile, readFile } from "fs/promises";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { supabase } from "../lib/supabase.js";
import { planScript, type VideoScript } from "../pipeline/script-planner.js";
import { generateAudio, type AudioSegment } from "../pipeline/audio-generator.js";
import { generateVideo } from "../pipeline/video-generator.js";
import { composeVideo } from "../pipeline/compositor.js";

const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY;
if (!ELEVENLABS_KEY) throw new Error("Missing ELEVENLABS_API_KEY");

const elClient = new ElevenLabsClient({ apiKey: ELEVENLABS_KEY });

const VOICE_SAMPLE_PATH = `${process.cwd()}/output/hari-voice-sample.mp3`;

const CLAY_ADS_PROMPT = `
Create a 60-second LinkedIn-style product launch video for Clay Ads. This is a calm, confident, product-forward walkthrough — not flashy. Information-dense, complete sentences, substance over style.

The video should feature a young South Asian man (Hari Kumar) in his mid-20s with dark hair, speaking directly to camera in a studio/office setting with a professional microphone setup and bookshelves behind him. He should look natural, confident, and engaged — like a tech founder casually explaining a product he built. Mix of him talking to camera and product UI shots.

Here is the EXACT narration script to follow (use these words verbatim as voiceover):

[0:00–0:08] Opening Context
Visual: Hari sitting at his desk with a microphone, looking at camera, Clay UI visible on screen behind him
Narration: "Today we're launching Clay Ads — a new product that brings advertising directly into your data workflow."

[0:08–0:20] The Problem
Visual: Cut between Hari speaking and screen recording of a messy spreadsheet workflow with CSV exports
Narration: "Today, running ads is fragmented. You export CSVs, upload them into LinkedIn, Meta, and Google, and repeat that process every time your data changes. Match rates are often only 10 to 20 percent, lists quickly go stale, and you end up targeting people that sales teams don't actually care about."

[0:20–0:35] What Clay Ads Does
Visual: Step-by-step UI flow inside Clay, Hari narrating over product demo
Narration: "Clay Ads replaces that workflow by letting you build and manage audiences directly inside Clay. You start with your data, enrich it using our provider network, and then sync those audiences directly to ad platforms — without exporting or reformatting anything."

[0:35–0:48] Why It's Different (Core Insight)
Visual: Data enrichment flowing through providers, match rate visualization, then back to Hari at mic emphasizing the numbers
Narration: "The key difference is match rate. By running waterfall enrichment across more than 150 data providers before syncing, Clay is able to achieve over 90 percent match rates on LinkedIn and around 60 to 70 percent on Meta — significantly higher than traditional approaches."

[0:48–0:58] What This Enables
Visual: Real use cases shown in Clay UI with overlaid text bullets, Hari leaning forward with conviction
Narration: "This makes it possible to run more precise ABM campaigns, automatically exclude customers and existing pipeline, target accounts based on real-time signals, and keep audiences continuously updated as your data changes."

[0:58–1:05] Closing / CTA
Visual: Hari smiling at camera, Clay logo appears, then product landing page
Narration: "Clay Ads is live today on LinkedIn and Meta, with deeper Google integration coming soon. You can learn more at clay.com/ads."

IMPORTANT STYLE NOTES:
- Feature Hari Kumar (young South Asian man, ~25, dark hair, light t-shirt) throughout — talking to camera with a professional podcast mic
- Studio/home office setting with bookshelves behind him
- Camera should be smooth and professional — steady, cinematic
- Mix of talking-head and product UI shots
- Tone: authoritative but warm, founder energy
- NO flashy transitions — substance over style
- Think LinkedIn creator content, not a corporate ad
`;

async function cloneVoice(): Promise<string> {
  console.log("[VOICE] Cloning Hari's voice from LinkedIn video...");

  const sampleBuffer = await readFile(VOICE_SAMPLE_PATH);
  const sampleFile = new File(
    [sampleBuffer],
    "hari-voice-sample.mp3",
    { type: "audio/mpeg" }
  );

  const voice = await elClient.voices.ivc.create({
    name: "Hari Kumar — Clay",
    files: [sampleFile],
    description: "Young South Asian male, confident, warm, tech founder energy. Conversational but authoritative.",
    removeBackgroundNoise: true,
  });

  console.log(`[VOICE] Cloned! Voice ID: ${voice.voiceId}`);
  return voice.voiceId;
}

async function generateVoiceoverWithHari(
  lines: { sceneIndex: number; lineIndex: number; text: string; emotion: string; stability: number; style: number }[],
  voiceId: string
): Promise<AudioSegment[]> {
  const segments: AudioSegment[] = [];

  for (const line of lines) {
    console.log(`  [TTS] line ${line.lineIndex} [${line.emotion}]: "${line.text.slice(0, 60)}..."`);

    const response = await elClient.textToSpeech.convertWithTimestamps(voiceId, {
      text: line.text,
      modelId: "eleven_multilingual_v2",
      voiceSettings: {
        stability: line.stability,
        similarityBoost: 0.85,
        style: line.style,
      },
    });

    const endTimes = response.alignment?.characterEndTimesSeconds ?? [];
    const duration = endTimes.length > 0 ? endTimes[endTimes.length - 1] : 0;

    segments.push({
      type: "voiceover",
      sceneIndex: line.sceneIndex,
      lineIndex: line.lineIndex,
      audioBase64: response.audioBase64,
      durationSeconds: duration,
    });
  }

  return segments;
}

async function run() {
  console.log("=".repeat(60));
  console.log("Clay Ads Video — Hari Kumar Voice + Likeness");
  console.log("=".repeat(60));

  // Step 1: Clone Hari's voice
  const hariVoiceId = await cloneVoice();

  // Step 2: Get or create Clay business
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
        description: "Clay is the data enrichment and outbound platform. Clay Ads brings advertising directly into data workflows.",
        website_url: "https://clay.com",
      })
      .select()
      .single();
    if (error || !biz) { console.error("Biz error:", error?.message); process.exit(1); }
    bizId = biz.id;
  }

  // Step 3: Create content item + job
  const { data: session } = await supabase
    .from("sessions")
    .insert({ business_id: bizId, name: "Clay Ads — Hari Kumar Version" })
    .select()
    .single();

  const { data: item } = await supabase
    .from("content_items")
    .insert({
      title: "Clay Ads Launch — Hari Kumar",
      body_text: "Product launch video featuring Hari Kumar with cloned voice from Lusha LinkedIn post.",
      business_id: bizId,
      session_id: session!.id,
      content_type: "video",
      channel: "linkedin",
      review_mode: "video",
      source_type: "generated",
      prompt_input_summary: "Clay Ads launch — Hari Kumar voice + likeness, 60s LinkedIn video",
      generation_status: "queued",
    })
    .select()
    .single();

  const { data: job } = await supabase
    .from("generation_jobs")
    .insert({
      prompt: CLAY_ADS_PROMPT,
      content_item_id: item!.id,
      status: "processing",
      job_type: "initial",
    })
    .select()
    .single();

  console.log(`\nContent item: ${item!.id}`);
  console.log(`Job: ${job!.id}\n`);

  try {
    // Phase 1: Gemini script planning
    console.log("[PHASE 1] Planning script with Gemini...");
    const script = await planScript({
      businessName: "Clay",
      businessDescription: "Clay is the data enrichment and outbound platform. Clay Ads brings advertising directly into data workflows.",
      websiteUrl: "https://clay.com",
      userPrompt: CLAY_ADS_PROMPT,
    });

    console.log(`  Title: "${script.title}"`);
    console.log(`  ${script.scenes.length} scenes, ${script.voiceover.length} VO lines, ${script.sfx.length} SFX cues`);
    console.log(`  Duration: ${script.totalDurationSeconds}s`);

    await supabase
      .from("content_items")
      .update({
        title: script.title,
        script: formatScript(script),
        generation_status: "script_planned",
      })
      .eq("id", item!.id);

    // Phase 2: Hari's voice + SFX + Veo video in parallel
    console.log("\n[PHASE 2] Generating Hari's voiceover + SFX + video in parallel...");

    const [hariVO, sfxResult, videoBuffer] = await Promise.all([
      generateVoiceoverWithHari(script.voiceover, hariVoiceId),
      generateSfxOnly(script.sfx),
      generateVideo(script.videoPrompt, script.cameraStyle ?? "stable"),
    ]);

    const tmpVideoPath = `/tmp/contentswipe-clay-ads-hari-raw.mp4`;
    await writeFile(tmpVideoPath, videoBuffer);

    // Phase 3: Compose
    console.log("\n[PHASE 3] Composing final video...");
    const finalBuffer = await composeVideo({
      videoPath: tmpVideoPath,
      voiceover: hariVO,
      sfx: sfxResult,
      scenes: script.scenes,
      totalDuration: script.totalDurationSeconds,
    });

    // Phase 4: Save
    const localPath = `${process.cwd()}/output/clay-ads-hari.mp4`;
    await writeFile(localPath, finalBuffer);
    console.log(`\n[SAVED] Local: ${localPath}`);

    const storagePath = `generated/${job!.id}.mp4`;
    const { error: uploadErr } = await supabase.storage
      .from("content-videos")
      .upload(storagePath, finalBuffer, { contentType: "video/mp4", upsert: true });

    if (uploadErr) {
      console.error("Upload failed:", uploadErr.message);
    } else {
      const { data: urlData } = supabase.storage.from("content-videos").getPublicUrl(storagePath);
      await supabase.from("content_items").update({
        video_url: urlData.publicUrl,
        review_status: "pending",
        generation_status: "completed",
        generation_job_id: job!.id,
      }).eq("id", item!.id);

      await supabase.from("generation_jobs").update({
        status: "completed",
        completed_at: new Date().toISOString(),
      }).eq("id", job!.id);

      console.log(`[UPLOADED] ${urlData.publicUrl}`);
    }

    // Cleanup cloned voice (optional — keep it for future use)
    console.log(`\n[INFO] Hari's cloned voice ID: ${hariVoiceId} (saved for reuse)`);

    console.log(`\n${"=".repeat(60)}`);
    console.log("Clay Ads video (Hari Kumar) generation complete!");
    console.log(`Local file: ${localPath}`);
    console.log(`${"=".repeat(60)}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n[FAILED] ${message}`);

    await supabase.from("generation_jobs").update({
      status: "failed",
      error_message: message,
      completed_at: new Date().toISOString(),
    }).eq("id", job!.id);

    await supabase.from("content_items").update({ generation_status: "failed" }).eq("id", item!.id);
    process.exit(1);
  }
}

async function generateSfxOnly(sfxCues: { sceneIndex: number; prompt: string; durationSeconds: number }[]): Promise<AudioSegment[]> {
  const segments: AudioSegment[] = [];

  const results = await Promise.allSettled(
    sfxCues.map(async (cue) => {
      console.log(`  [SFX] scene ${cue.sceneIndex}: "${cue.prompt}" (${cue.durationSeconds}s)`);
      const sfxStream = await elClient.textToSoundEffects.convert({
        text: cue.prompt,
        durationSeconds: cue.durationSeconds,
        promptInfluence: 0.5,
      });
      const chunks: Buffer[] = [];
      for await (const chunk of sfxStream as AsyncIterable<Uint8Array>) {
        chunks.push(Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);
      return {
        type: "sfx" as const,
        sceneIndex: cue.sceneIndex,
        audioBase64: buffer.toString("base64"),
        durationSeconds: cue.durationSeconds,
      };
    })
  );

  for (const r of results) {
    if (r.status === "fulfilled") segments.push(r.value);
    else console.error("  [SFX] failed:", r.reason);
  }

  return segments;
}

function formatScript(script: VideoScript): string {
  const lines: string[] = [];
  for (const scene of script.scenes) {
    lines.push(`[${scene.heading}]`);
    lines.push(`Visual: ${scene.visualDescription}`);
    const sceneVO = script.voiceover.filter((v) => v.sceneIndex === scene.index);
    for (const vo of sceneVO) lines.push(`VO: "${vo.text}"`);
    const sceneSfx = script.sfx.filter((s) => s.sceneIndex === scene.index);
    for (const sfx of sceneSfx) lines.push(`SFX: ${sfx.prompt}`);
    lines.push("");
  }
  return lines.join("\n");
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
