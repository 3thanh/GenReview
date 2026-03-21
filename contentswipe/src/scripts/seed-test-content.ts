import "dotenv/config";
import { supabase } from "../lib/supabase.js";

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

  // Create a session
  const { data: session, error: sessionErr } = await supabase
    .from("sessions")
    .insert({
      business_id: biz.id,
      name: "Launch Campaign",
    })
    .select()
    .single();

  if (sessionErr) {
    console.error("Failed to create session:", sessionErr.message);
    return;
  }

  console.log(`Created session: ${session.name} (${session.id})`);

  // Seed content items across all three content types
  const items = [
    // Video content
    {
      title: "Morning Ritual",
      body_text:
        "Show the journey from bean to cup — a 15-second visual of beans being roasted, ground, and brewed into a perfect pour-over.",
      script:
        "[OPEN: Close-up of raw green beans]\n[CUT: Beans tumbling in roaster, golden smoke rising]\n[CUT: Hand grinding fresh beans]\n[CUT: Hot water spiraling over grounds in a pour-over]\n[CLOSE: Steam rising from a perfect cup, sunrise in background]\nText overlay: 'From farm to your morning. Acme Coffee Co.'",
      business_id: biz.id,
      session_id: session.id,
      content_type: "video" as const,
      channel: "tiktok",
      review_mode: "video",
      source_type: "generated",
      prompt_input_summary: "Create a morning ritual video showing bean to cup journey",
    },
    {
      title: "Behind the Scenes: Roasting Day",
      body_text:
        "Take viewers behind the scenes at the roastery. Show the team, the craft, the smell you can almost feel through the screen.",
      script:
        "[OPEN: Door opening to roastery, warm light spills out]\n[CUT: Roaster checking temperature dial]\n[CUT: Beans pouring out, crackling sounds]\n[CUT: Team cupping session, reactions]\n[CLOSE: Bags being stamped with Acme logo]\nVO: 'Every batch is a labor of love.'",
      business_id: biz.id,
      session_id: session.id,
      content_type: "video" as const,
      channel: "tiktok",
      review_mode: "video",
      source_type: "generated",
      prompt_input_summary: "Behind the scenes roasting day video",
    },
    // Social content
    {
      title: "New Single-Origin Drop",
      body_text:
        "🌍 Just landed: our Ethiopian Yirgacheffe single-origin.\n\nTasting notes: jasmine, bergamot, and stone fruit.\n\nSmall batch. Limited run. Link in bio to grab yours before it's gone.\n\n#specialtycoffee #singleorigin #acmecoffee",
      business_id: biz.id,
      session_id: session.id,
      content_type: "social" as const,
      channel: "linkedin",
      review_mode: "social",
      source_type: "generated",
      prompt_input_summary: "Announce new Ethiopian single-origin coffee drop",
    },
    {
      title: "Sustainability Update",
      body_text:
        "At Acme Coffee Co, sustainability isn't a buzzword — it's how we operate.\n\nThis quarter:\n• 100% direct trade with 12 farms across 4 countries\n• Carbon-neutral shipping on all orders\n• Compostable packaging rollout complete\n\nThe future of coffee is responsible coffee.",
      business_id: biz.id,
      session_id: session.id,
      content_type: "social" as const,
      channel: "linkedin",
      review_mode: "social",
      source_type: "generated",
      prompt_input_summary: "Share quarterly sustainability progress update",
    },
    // Support content
    {
      title: "Shipping Delay Response",
      body_text:
        "Hi [Customer],\n\nThank you for reaching out about your order. I can see it's currently in transit and expected to arrive by [date].\n\nI've applied a 10% discount code (SORRY10) to your account for the inconvenience. It'll be ready for your next order.\n\nLet me know if there's anything else I can help with!\n\nBest,\nAcme Support",
      business_id: biz.id,
      session_id: session.id,
      content_type: "support" as const,
      channel: "intercom",
      review_mode: "support",
      source_type: "screenshot",
      source_ref: "ticket-4521",
      prompt_input_summary: "Customer complaint about shipping delay",
    },
    {
      title: "Subscription Cancellation Save",
      body_text:
        "Hi [Customer],\n\nI'm sorry to hear you're thinking about canceling! Before you go, I'd love to help.\n\nWe can:\n• Pause your subscription for up to 3 months\n• Switch your blend or roast level\n• Adjust your delivery frequency\n\nWould any of these work for you? We'd hate to lose you!",
      business_id: biz.id,
      session_id: session.id,
      content_type: "support" as const,
      channel: "intercom",
      review_mode: "support",
      source_type: "screenshot",
      source_ref: "ticket-4522",
      prompt_input_summary: "Customer wants to cancel subscription — retention response",
    },
  ];

  const { data: inserted, error: itemErr } = await supabase
    .from("content_items")
    .insert(items)
    .select();

  if (itemErr) {
    console.error("Failed to seed items:", itemErr.message);
    return;
  }

  console.log(`\nSeeded ${inserted.length} content items:`);
  for (const item of inserted) {
    console.log(`  - [${item.content_type}/${item.channel}] ${item.title} (${item.id})`);
  }

  console.log("\nDone! These items will appear as 'pending' in the feed.");
}

seed().catch(console.error);
