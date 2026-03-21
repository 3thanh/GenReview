import "dotenv/config";
import { supabase } from "../lib/supabase.js";

/**
 * Test script: creates a generation job for a card so the worker
 * can pick it up and run the full pipeline.
 *
 * Usage: npx tsx src/scripts/test-generation.ts
 */
async function testGeneration() {
  // Fetch a pending card
  const { data: cards } = await supabase
    .from("content_queue")
    .select("*")
    .eq("status", "pending")
    .limit(1);

  if (!cards?.length) {
    console.log("No pending cards. Run `npm run seed` first.");
    return;
  }

  const card = cards[0];
  console.log(`Using card: "${card.title}" (${card.id})`);

  // Get the business context
  let businessName = "Acme Coffee Co";
  if (card.business_id) {
    const { data: biz } = await supabase
      .from("businesses")
      .select("name")
      .eq("id", card.business_id)
      .single();
    if (biz) businessName = biz.name;
  }

  // Create a generation job
  const prompt = `Create a 15-20 second short-form video for ${businessName}: ${card.title}. ${card.description ?? ""}`;

  const { data: job, error } = await supabase
    .from("generation_jobs")
    .insert({
      content_queue_id: card.id,
      job_type: "initial",
      prompt,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create job:", error.message);
    return;
  }

  console.log(`\nCreated generation job: ${job.id}`);
  console.log(`  Type: ${job.job_type}`);
  console.log(`  Status: ${job.status}`);
  console.log(`  Prompt: ${prompt.slice(0, 100)}...`);
  console.log(`\nNow run: npm run worker`);
  console.log("The worker will pick up this job and run the full pipeline:");
  console.log("  Phase 1: Gemini script planning");
  console.log("  Phase 2: ElevenLabs audio + Veo video (parallel)");
  console.log("  Phase 3: FFmpeg composition");
  console.log("  Phase 4: Upload to Supabase Storage");
}

testGeneration().catch(console.error);
