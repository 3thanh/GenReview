import "dotenv/config";
import { supabase } from "../lib/supabase.js";

async function main() {
  const { data, error } = await supabase
    .from("generation_jobs")
    .update({ status: "queued", error_message: null })
    .eq("status", "failed")
    .select("id");

  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log(`Reset ${data?.length ?? 0} failed job(s) to queued`);
  }
}

main();
