import "dotenv/config";
import { supabase } from "../lib/supabase.js";
import type { ContentItem, Business } from "../types/database.js";

const POLL_INTERVAL_MS = 5_000;

async function getBusiness(
  businessId: string | null
): Promise<Business | null> {
  if (!businessId) return null;
  const { data } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .single();
  return data;
}

function fallbackBusiness(): Business {
  return {
    id: "fallback",
    name: "My Business",
    description: "A business creating engaging short-form content.",
    website_url: null,
    created_at: null,
  };
}

async function handleVariantRequest(item: ContentItem): Promise<void> {
  console.log(`  Processing variant request for item: ${item.title}`);

  const business =
    (await getBusiness(item.business_id)) ?? fallbackBusiness();

  const prompt = [
    `Create a VARIANT of this content for ${business.name}.`,
    item.script ? `\nOriginal script:\n${item.script}` : "",
    item.body_text ? `\nOriginal text:\n${item.body_text}` : "",
    `\nUser feedback: ${item.review_note ?? "Make a different version"}`,
    `\nBusiness context: ${business.description ?? ""}`,
    `\nContent type: ${item.content_type}`,
    item.channel ? `\nChannel: ${item.channel}` : "",
  ].join("");

  const { data: newItem, error: insertErr } = await supabase
    .from("content_items")
    .insert({
      title: `${item.title} (variant)`,
      body_text: item.body_text,
      content_type: item.content_type,
      channel: item.channel,
      review_mode: item.review_mode,
      source_type: item.source_type,
      variant_of: item.id,
      business_id: item.business_id,
      session_id: item.session_id,
      review_status: "pending",
      prompt_input_summary: item.review_note ?? "Variant request",
    })
    .select()
    .single();

  if (insertErr || !newItem) {
    console.error(`  Failed to create variant item: ${insertErr?.message}`);
    return;
  }

  const { error: jobErr } = await supabase.from("generation_jobs").insert({
    content_item_id: newItem.id,
    source_card_id: item.id,
    job_type: "variant",
    prompt,
  });

  if (jobErr) {
    console.error(`  Failed to create generation job: ${jobErr.message}`);
    return;
  }

  console.log(`  Created variant item ${newItem.id} + generation job`);
}

async function handleBrainstormRequest(item: ContentItem): Promise<void> {
  console.log(`  Processing brainstorm request for item: ${item.title}`);

  const business =
    (await getBusiness(item.business_id)) ?? fallbackBusiness();

  const prompt = [
    `Generate a completely new ${item.content_type} concept for ${business.name}.`,
    `\nBusiness description: ${business.description ?? ""}`,
    business.website_url ? `\nWebsite: ${business.website_url}` : "",
    item.review_note ? `\nUser wants ideas in this direction: ${item.review_note}` : "",
    item.channel ? `\nTarget channel: ${item.channel}` : "",
  ].join("");

  const { data: newItem, error: insertErr } = await supabase
    .from("content_items")
    .insert({
      title: `New idea (from: ${item.title})`,
      body_text: item.review_note,
      content_type: item.content_type,
      channel: item.channel,
      review_mode: item.review_mode,
      source_type: "generated",
      parent_id: item.id,
      business_id: item.business_id,
      session_id: item.session_id,
      review_status: "pending",
      prompt_input_summary: item.review_note ?? "Brainstorm request",
    })
    .select()
    .single();

  if (insertErr || !newItem) {
    console.error(`  Failed to create brainstorm item: ${insertErr?.message}`);
    return;
  }

  const { error: jobErr } = await supabase.from("generation_jobs").insert({
    content_item_id: newItem.id,
    source_card_id: item.id,
    job_type: "brainstorm",
    prompt,
  });

  if (jobErr) {
    console.error(`  Failed to create generation job: ${jobErr.message}`);
    return;
  }

  console.log(`  Created brainstorm item ${newItem.id} + generation job`);
}

async function handleFurtherReviewRequest(item: ContentItem): Promise<void> {
  console.log(`  Processing further review request for item: ${item.title}`);

  const business =
    (await getBusiness(item.business_id)) ?? fallbackBusiness();

  const prompt = [
    `Create a revised version of this ${item.content_type} for ${business.name} that addresses the reviewer's feedback.`,
    item.script ? `\nOriginal script:\n${item.script}` : "",
    item.body_text ? `\nOriginal text:\n${item.body_text}` : "",
    `\nReviewer feedback: ${item.review_note ?? "Needs another version for further review"}`,
    `\nBusiness context: ${business.description ?? ""}`,
    item.channel ? `\nChannel: ${item.channel}` : "",
  ].join("");

  const { data: newItem, error: insertErr } = await supabase
    .from("content_items")
    .insert({
      title: `${item.title} (v2)`,
      body_text: item.body_text,
      content_type: item.content_type,
      channel: item.channel,
      review_mode: item.review_mode,
      source_type: item.source_type,
      parent_id: item.id,
      business_id: item.business_id,
      session_id: item.session_id,
      review_status: "pending",
      prompt_input_summary: item.review_note ?? "Sent for further review",
    })
    .select()
    .single();

  if (insertErr || !newItem) {
    console.error(`  Failed to create further review item: ${insertErr?.message}`);
    return;
  }

  const { error: jobErr } = await supabase.from("generation_jobs").insert({
    content_item_id: newItem.id,
    source_card_id: item.id,
    job_type: "further_review",
    prompt,
  });

  if (jobErr) {
    console.error(`  Failed to create generation job: ${jobErr.message}`);
    return;
  }

  console.log(`  Created further review item ${newItem.id} + generation job`);
}

async function processActionableItems(): Promise<number> {
  const { data: items, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("review_status", "needs_edit")
    .order("updated_at", { ascending: true });

  if (error || !items?.length) return 0;

  let processed = 0;

  for (const item of items) {
    try {
      if (item.down_arrow_designation === "further_review") {
        await handleFurtherReviewRequest(item);
      } else if (item.variant_of || item.review_note?.toLowerCase().includes("variant")) {
        await handleVariantRequest(item);
      } else {
        await handleBrainstormRequest(item);
      }

      await supabase
        .from("content_items")
        .update({ review_status: "rejected" })
        .eq("id", item.id);

      processed++;
    } catch (err) {
      console.error(
        `  Error processing item ${item.id}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return processed;
}

async function runFeedbackLoop(): Promise<void> {
  console.log("ContentSwipe Feedback Loop started");
  console.log(
    `Polling every ${POLL_INTERVAL_MS / 1000}s for needs_edit items...\n`
  );

  while (true) {
    const count = await processActionableItems();
    if (count > 0) {
      console.log(`  Processed ${count} item(s)\n`);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

export {
  processActionableItems,
  handleVariantRequest,
  handleBrainstormRequest,
  handleFurtherReviewRequest,
};

runFeedbackLoop().catch((err) => {
  console.error("Feedback loop crashed:", err);
  process.exit(1);
});
