import "dotenv/config";
import { readFile } from "fs/promises";
import { supabase } from "../lib/supabase.js";

const videoFile = process.argv[2];
const title = process.argv[3] || "Untitled Reel";
const description = process.argv[4] || "";

async function main() {
  if (!videoFile) {
    console.error("Usage: npx tsx src/scripts/upload-to-feed.ts <video-path> <title> [description]");
    process.exit(1);
  }

  const videoBuffer = await readFile(videoFile);
  console.log(`Video: ${videoFile} (${(videoBuffer.length / 1024 / 1024).toFixed(1)} MB)`);

  const storagePath = `uploads/${Date.now()}-${videoFile.split("/").pop()}`;
  const { error: uploadErr } = await supabase.storage
    .from("content-videos")
    .upload(storagePath, videoBuffer, { contentType: "video/mp4" });

  if (uploadErr) {
    console.error("Upload failed:", uploadErr.message);
    return;
  }

  const { data: urlData } = supabase.storage
    .from("content-videos")
    .getPublicUrl(storagePath);

  console.log("Uploaded:", urlData.publicUrl);

  const { data: biz } = await supabase
    .from("businesses")
    .select("id")
    .limit(1)
    .single();

  const { data: card, error: insertErr } = await supabase
    .from("content_items")
    .insert({
      title,
      body_text: description,
      video_url: urlData.publicUrl,
      content_type: "video" as any,
      review_status: "pending" as any,
      business_id: biz?.id ?? null,
      source_type: "generated",
      channel: "social",
    })
    .select("id, title, review_status")
    .single();

  if (insertErr) {
    console.error("Insert failed:", insertErr.message);
    return;
  }

  console.log(`\nCard created: ${card!.id}`);
  console.log(`  Title: ${card!.title}`);
  console.log(`  Status: ${card!.review_status}`);
  console.log("  -> Will appear in the swipe feed");
}

main();
