import "dotenv/config";
import { supabase } from "../lib/supabase.js";

async function debug() {
  const { data: jobs } = await supabase
    .from("generation_jobs")
    .select("id, status, error_message, completed_at");
  console.log("=== Generation Jobs ===");
  for (const j of jobs ?? []) {
    console.log(`  ${j.id} | status=${j.status} | completed=${j.completed_at} | error=${j.error_message?.slice(0, 60) ?? "none"}`);
  }

  const { data: items } = await supabase
    .from("content_items")
    .select("id, title, review_status, content_type, channel, video_url, image_url, script, starred");
  console.log("\n=== Content Items ===");
  for (const c of items ?? []) {
    console.log(`  ${c.id} | "${c.title}" | type=${c.content_type} | channel=${c.channel} | status=${c.review_status} | starred=${c.starred}`);
    console.log(`    video_url: ${c.video_url ?? "null"}`);
    console.log(`    image_url: ${c.image_url ?? "null"}`);
    console.log(`    script: ${c.script ? c.script.slice(0, 80) + "..." : "null"}`);
  }

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, business_id, name, created_at");
  console.log("\n=== Sessions ===");
  for (const s of sessions ?? []) {
    console.log(`  ${s.id} | "${s.name}" | business=${s.business_id}`);
  }
}

debug();
