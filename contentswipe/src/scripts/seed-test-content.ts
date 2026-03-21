import "dotenv/config";
import { supabase } from "../lib/supabase.js";

/**
 * Seed script: creates a test business and a few content_queue cards
 * so you can test the swipe UI without the generation pipeline running.
 */
async function seed() {
  console.log("Seeding test content...\n");

  // Create a test business
  const { data: biz, error: bizErr } = await supabase
    .from("businesses")
    .insert({
      name: "Acme Coffee Co",
      description:
        "A specialty coffee roaster focused on sustainable, single-origin beans. We sell direct to consumer online and at farmers markets.",
      website_url: "https://acmecoffee.example.com",
    })
    .select()
    .single();

  if (bizErr) {
    console.error("Failed to create business:", bizErr.message);
    return;
  }

  console.log(`Created business: ${biz.name} (${biz.id})`);

  // Seed some test cards
  const cards = [
    {
      title: "Morning Ritual",
      description:
        "Show the journey from bean to cup — a 15-second visual of beans being roasted, ground, and brewed into a perfect pour-over.",
      script:
        "[OPEN: Close-up of raw green beans]\n[CUT: Beans tumbling in roaster, golden smoke rising]\n[CUT: Hand grinding fresh beans]\n[CUT: Hot water spiraling over grounds in a pour-over]\n[CLOSE: Steam rising from a perfect cup, sunrise in background]\nText overlay: 'From farm to your morning. Acme Coffee Co.'",
      business_id: biz.id,
      content_type: "video_script" as const,
    },
    {
      title: "Behind the Scenes: Roasting Day",
      description:
        "Take viewers behind the scenes at the roastery. Show the team, the craft, the smell you can almost feel through the screen.",
      script:
        "[OPEN: Door opening to roastery, warm light spills out]\n[CUT: Roaster checking temperature dial]\n[CUT: Beans pouring out, crackling sounds]\n[CUT: Team cupping session, reactions of 'mmm']\n[CLOSE: Bags being stamped with Acme logo]\nVO: 'Every batch is a labor of love.'",
      business_id: biz.id,
      content_type: "video_script" as const,
    },
    {
      title: "Customer Reaction Challenge",
      description:
        "Film real customers trying our new Ethiopian single-origin for the first time. Capture genuine surprise and delight.",
      script:
        "[OPEN: Text 'We asked strangers to try our new Ethiopian roast']\n[CUT: Person 1 sips, eyes widen — 'Wait, that's incredible']\n[CUT: Person 2 laughs — 'This doesn't taste like any coffee I've had']\n[CUT: Person 3 — 'Where do I buy this?!']\n[CLOSE: Acme Coffee Co logo + 'Link in bio']\nMusic: upbeat, feel-good indie track",
      business_id: biz.id,
      content_type: "video_script" as const,
    },
  ];

  const { data: inserted, error: cardErr } = await supabase
    .from("content_queue")
    .insert(cards)
    .select();

  if (cardErr) {
    console.error("Failed to seed cards:", cardErr.message);
    return;
  }

  console.log(`Seeded ${inserted.length} content cards:`);
  for (const c of inserted) {
    console.log(`  - ${c.title} (${c.id})`);
  }

  console.log("\nDone! These cards will appear as 'pending' in the swipe UI.");
}

seed().catch(console.error);
