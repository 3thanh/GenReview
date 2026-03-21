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
    description: "A business creating engaging short-form video content.",
    website_url: null,
    created_at: null,
  };
}

async function handleVariantRequest(card: ContentItem): Promise<void> {
  console.log(`  Processing variant request for card: ${card.title}`);

  const business =
    (await getBusiness(card.business_id)) ?? fallbackBusiness();

  const prompt = [
    `Create a VARIANT of this video for ${business.name}.`,
    card.script ? `\nOriginal script:\n${card.script}` : "",
    `\nUser feedback: ${card.feedback ?? "Make a different version"}`,
    `\nBusiness context: ${business.description ?? ""}`,
  ].join("");

  const { data: newCard, error: insertErr } = await supabase
    .from("content_queue")
    .insert({
      title: `${card.title} (variant)`,
      description: card.description,
      content_type: card.content_type,
      variant_of: card.id,
      business_id: card.business_id,
      status: "pending",
    })
    .select()
    .single();

  if (insertErr || !newCard) {
    console.error(`  Failed to create variant card: ${insertErr?.message}`);
    return;
  }

  const { error: jobErr } = await supabase.from("generation_jobs").insert({
    content_queue_id: newCard.id,
    source_card_id: card.id,
    job_type: "variant",
    prompt,
  });

  if (jobErr) {
    console.error(`  Failed to create generation job: ${jobErr.message}`);
    return;
  }

  console.log(`  Created variant card ${newCard.id} + generation job`);
}

async function handleBrainstormRequest(card: ContentItem): Promise<void> {
  console.log(`  Processing brainstorm request for card: ${card.title}`);

  const business =
    (await getBusiness(card.business_id)) ?? fallbackBusiness();

  const prompt = [
    `Generate a completely new short-form video concept for ${business.name}.`,
    `\nBusiness description: ${business.description ?? ""}`,
    business.website_url ? `\nWebsite: ${business.website_url}` : "",
    card.feedback ? `\nUser wants ideas in this direction: ${card.feedback}` : "",
  ].join("");

  const { data: newCard, error: insertErr } = await supabase
    .from("content_queue")
    .insert({
      title: `New idea (from: ${card.title})`,
      description: card.feedback,
      content_type: card.content_type,
      parent_id: card.id,
      business_id: card.business_id,
      status: "pending",
    })
    .select()
    .single();

  if (insertErr || !newCard) {
    console.error(`  Failed to create brainstorm card: ${insertErr?.message}`);
    return;
  }

  const { error: jobErr } = await supabase.from("generation_jobs").insert({
    content_queue_id: newCard.id,
    source_card_id: card.id,
    job_type: "brainstorm",
    prompt,
  });

  if (jobErr) {
    console.error(`  Failed to create generation job: ${jobErr.message}`);
    return;
  }

  console.log(`  Created brainstorm card ${newCard.id} + generation job`);
}

async function processActionableCards(): Promise<number> {
  const { data: cards, error } = await supabase
    .from("content_queue")
    .select("*")
    .in("status", ["needs_variant", "needs_ideas"])
    .order("updated_at", { ascending: true });

  if (error || !cards?.length) return 0;

  let processed = 0;

  for (const card of cards) {
    try {
      if (card.status === "needs_variant") {
        await handleVariantRequest(card);
      } else if (card.status === "needs_ideas") {
        await handleBrainstormRequest(card);
      }

      // Mark original as processed so we don't loop on it
      await supabase
        .from("content_queue")
        .update({ status: "rejected" })
        .eq("id", card.id);

      processed++;
    } catch (err) {
      console.error(
        `  Error processing card ${card.id}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return processed;
}

async function runFeedbackLoop(): Promise<void> {
  console.log("ContentSwipe Feedback Loop started");
  console.log(
    `Polling every ${POLL_INTERVAL_MS / 1000}s for needs_variant / needs_ideas cards...\n`
  );

  while (true) {
    const count = await processActionableCards();
    if (count > 0) {
      console.log(`  Processed ${count} card(s)\n`);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

export {
  processActionableCards,
  handleVariantRequest,
  handleBrainstormRequest,
};

runFeedbackLoop().catch((err) => {
  console.error("Feedback loop crashed:", err);
  process.exit(1);
});
