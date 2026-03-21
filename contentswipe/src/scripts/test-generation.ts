import "dotenv/config";
import { supabase } from "../lib/supabase.js";

/**
 * Test script: creates a generation job for a content item so the worker
 * can pick it up and run the full pipeline.
 *
 * Usage: npx tsx src/scripts/test-generation.ts
 */
async function testGeneration() {
  const { data: items } = await supabase
    .from("content_items")
    .select("*")
    .eq("review_status", "pending")
    .limit(1);

  if (!items?.length) {
    console.log("No pending items. Run `npm run seed` first.");
    return;
  }

  const item = items[0];
  console.log(`Using item: "${item.title}" (${item.id}) [${item.content_type}/${item.channel}]`);

  let businessName = "Acme Coffee Co";
  if (item.business_id) {
    const { data: biz } = await supabase
      .from("businesses")
      .select("name")
      .eq("id", item.business_id)
      .single();
    if (biz) businessName = biz.name;
  }

  const prompt = `Create a 15-20 second short-form video for ${businessName}: ${item.title}. ${item.body_text ?? ""}`;

  const { data: job, error } = await supabase
    .from("generation_jobs")
    .insert({
      content_item_id: item.id,
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
  console.log("The worker will pick up this job and run the full pipeline.");
}

testGeneration().catch(console.error);
