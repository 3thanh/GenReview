import "dotenv/config";
import { supabase } from "../lib/supabase.js";

const SUPPORT_ITEMS = [
  {
    title: "Workflow automation not triggering for new contacts",
    description:
      "Hi Peter,\n\nGood news — the bulk import trigger does support per-contact personalization. When the 'bulk_import.completed' event fires, it includes the full list of contact IDs, and your workflow can iterate over each one individually.\n\nHere's how to set it up:\n\n1. Change your workflow trigger from 'contact.created' to 'bulk_import.completed'\n2. Add a 'For Each Contact' loop step after the trigger\n3. Your existing email template with {{first_name}} and other merge tags will work inside the loop\n\nFor the 200+ contacts currently queued, I can manually re-trigger the workflow for them right now. Want me to go ahead?\n\nAlso, I've flagged to our engineering team that the batch endpoint should emit individual contact.created events — it's a common gotcha.",
    content_type: "support_reply" as const,
    status: "pending" as const,
    metadata: {
      source_ref: "215473478",
      conversation: {
        id: "215473478125341",
        channel: "intercom",
        ai_confidence: 0.72,
        ticket_ref: "215473478",
        customer: { name: "Peter Klutte", email: "peter@klutte.io" },
        messages: [
          { role: "customer", text: "Hi, we set up a workflow automation to send a welcome email when new contacts are added via the API, but it's not triggering for any contacts added in the past 24 hours.", timestamp: "2026-03-21T11:42:00Z", sender_name: "Peter Klutte" },
          { role: "bot", text: "Thanks for reaching out, Peter. Let me look into your workflow configuration.\n\nCould you confirm which API endpoint you're using to create contacts? The automation trigger depends on the contact source being correctly tagged.", timestamp: "2026-03-21T11:42:15Z", sender_name: "Fin AI", status: "sent" },
          { role: "customer", text: "We're using POST /v2/contacts with the standard payload. It was working fine until yesterday. We haven't changed anything on our end.", timestamp: "2026-03-21T11:45:00Z", sender_name: "Peter Klutte" },
          { role: "bot", text: "I can see the contacts are being created successfully in your account. However, I notice the workflow trigger is set to fire on 'contact.created' events, but there's a known issue where contacts created via bulk import endpoints don't emit this event.\n\nAre you sending contacts one at a time or in batches?", timestamp: "2026-03-21T11:45:12Z", sender_name: "Fin AI", status: "sent" },
          { role: "customer", text: "We switched to batch mode yesterday to handle higher volume. Could that be the issue?", timestamp: "2026-03-21T11:48:00Z", sender_name: "Peter Klutte" },
          { role: "bot", text: "That's the issue. The batch endpoint (/v2/contacts/bulk) doesn't trigger individual 'contact.created' webhook events — it fires a single 'bulk_import.completed' event instead.\n\nYou have two options:\n\n1. Switch your workflow trigger to listen for 'bulk_import.completed'\n2. Continue using the single-contact endpoint with rate limiting\n\nI'd recommend option 1 if you need to handle volume.", timestamp: "2026-03-21T11:48:10Z", sender_name: "Fin AI", status: "sent" },
          { role: "customer", text: "Ok that makes sense, but we also need to send personalized welcome emails per contact, not a single batch notification. Can the bulk trigger still do that?", timestamp: "2026-03-21T11:52:00Z", sender_name: "Peter Klutte" },
          { role: "bot", text: "I'm not able to confirm whether the bulk import trigger supports per-contact personalization in workflows. Let me escalate this to someone who can help.", timestamp: "2026-03-21T11:52:08Z", sender_name: "Fin AI", status: "failed" },
          { role: "customer", text: "Please do — this is blocking our onboarding flow for new users. We have 200+ contacts queued up waiting for welcome emails.", timestamp: "2026-03-21T11:55:00Z", sender_name: "Peter Klutte" },
        ],
      },
    },
  },
  {
    title: "Custom attributes not syncing to Salesforce integration",
    description:
      "Hi Adriana,\n\nQuick update — I've triggered the backfill re-sync for all contacts modified in the last 72 hours. Here's the status:\n\n• 847 contacts queued for re-sync\n• Estimated completion: ~45 minutes\n• Fields being pushed: plan_type, company_size, arr_band\n\nI've also enabled sync error notifications for your workspace. You'll now get an email alert if any field-level permission changes block the integration.\n\nOnce the re-sync completes, I'll send you a confirmation with a summary of how many records were updated.\n\nLet me know if you notice anything off with your lead scoring after the data lands!",
    content_type: "support_reply" as const,
    status: "pending" as const,
    metadata: {
      source_ref: "215473518",
      conversation: {
        id: "215473518115926",
        channel: "intercom",
        ai_confidence: 0.88,
        ticket_ref: "215473518",
        customer: { name: "Adriana Vega", email: "adriana@techflow.com" },
        messages: [
          { role: "customer", text: "Our custom contact attributes aren't syncing to Salesforce anymore. The standard fields like name and email still sync fine, but custom attributes like 'plan_type' and 'company_size' stopped updating about 3 days ago.", timestamp: "2026-03-21T09:15:00Z", sender_name: "Adriana Vega" },
          { role: "bot", text: "Hi Adriana, thanks for reporting this. Let me check your Salesforce integration status and recent sync logs.", timestamp: "2026-03-21T09:15:10Z", sender_name: "Fin AI", status: "sent" },
          { role: "customer", text: "We rely on these attributes for our sales team's lead scoring. Without them, our reps are flying blind on which accounts to prioritize.", timestamp: "2026-03-21T09:18:00Z", sender_name: "Adriana Vega" },
          { role: "bot", text: "I've checked your integration and I can see the issue. Three days ago, your Salesforce admin added field-level security to the custom fields in Salesforce. The integration user no longer has write access to those specific fields.\n\nHere's what happened:\n• Standard fields (Name, Email, Phone) → still writable ✓\n• Custom fields (plan_type, company_size, arr_band) → permission denied ✗\n\nThe sync has been silently failing for these fields.", timestamp: "2026-03-21T09:18:12Z", sender_name: "Fin AI", status: "sent" },
          { role: "customer", text: "That makes sense — our Salesforce admin did a security audit last week. How do I fix this without giving the integration user full admin access?", timestamp: "2026-03-21T09:24:00Z", sender_name: "Adriana Vega" },
          { role: "bot", text: "Great question. You don't need full admin — you just need to grant field-level write access to the specific custom fields your integration maps to.\n\nHere's the exact steps:\n\n1. In Salesforce: Setup → Profiles → find your Integration User profile\n2. Click 'Field-Level Security' for the Contact object\n3. Check 'Edit' for: plan_type, company_size, arr_band, and any other custom fields\n4. Save\n\nThe sync should resume automatically within 15 minutes after the permissions are updated. No need to reconnect the integration.", timestamp: "2026-03-21T09:24:10Z", sender_name: "Fin AI", status: "sent" },
          { role: "customer", text: "Perfect. And what about the 3 days of missed syncs? Will those attributes backfill automatically?", timestamp: "2026-03-21T09:28:00Z", sender_name: "Adriana Vega" },
          { role: "agent", text: "Hey Adriana — I've been looped in here. The backfill won't happen automatically, but I can trigger a manual re-sync of all contacts modified in the last 3 days. This will push the correct attribute values to Salesforce.\n\nI'll kick that off now and you should see the data populated within the hour. I'll send a confirmation once it's complete.\n\nFor future visibility, I'd also recommend enabling sync error notifications — I can set that up for you so you'll get alerted if field permissions change again.", timestamp: "2026-03-21T09:35:00Z", sender_name: "Ethan Huang" },
          { role: "customer", text: "That would be amazing. Yes to both — the re-sync and the error notifications. Thank you Ethan!", timestamp: "2026-03-21T09:38:00Z", sender_name: "Adriana Vega" },
        ],
      },
    },
  },
  {
    title: "SSO login loop after IdP certificate rotation",
    description:
      "Hi James,\n\nGlad the team is back in! Here's a summary of what happened and what we've done:\n\n• Root cause: Stale certificate in validation chain after IdP rotation (known bug — tracked internally)\n• Fix applied: Removed old cert, cleared SAML session cache\n• Bypass: Active for 30 more minutes at the link above, then auto-expires\n\nTo prevent this in the future, I've filed an internal ticket to fix the certificate validation order bug. When that ships, cert rotations will be seamless.\n\nI'd also recommend:\n1. Test SSO in a staging environment before rotating production certs\n2. Keep the bypass link bookmarked for emergencies\n\nYou're all set for the deploy. Let me know if anything else comes up.",
    content_type: "support_reply" as const,
    status: "pending" as const,
    metadata: {
      source_ref: "215473612",
      conversation: {
        id: "215473612000001",
        channel: "intercom",
        ai_confidence: 0.65,
        ticket_ref: "215473612",
        customer: { name: "James Okafor", email: "james@okafor-eng.com" },
        messages: [
          { role: "customer", text: "URGENT — our entire team is locked out. SSO login is stuck in an infinite redirect loop. We rotated our IdP certificate last night and now nobody can sign in.", timestamp: "2026-03-21T08:01:00Z", sender_name: "James Okafor" },
          { role: "bot", text: "I understand this is critical — your team can't access their accounts. Let me help troubleshoot the SSO redirect loop.\n\nWhen you rotated the IdP certificate, did you also update the certificate in your Driftwood SSO settings (Settings → Security → SAML)?", timestamp: "2026-03-21T08:01:08Z", sender_name: "Fin AI", status: "sent" },
          { role: "customer", text: "Yes, we uploaded the new certificate to Driftwood's SSO settings immediately after rotating it in Okta. The SHA-256 fingerprint matches.", timestamp: "2026-03-21T08:03:00Z", sender_name: "James Okafor" },
          { role: "bot", text: "OK, if the certificate fingerprint matches, the issue might be with the SAML response validation. Let me check a few things:\n\n1. Is your ACS URL still correct? It should be: https://app.driftwood.io/auth/saml/callback\n2. Did you rotate the signing certificate or the encryption certificate? We need both if encryption is enabled.\n3. Check if your IdP's clock is synchronized — even a 5-minute drift can cause validation failures.", timestamp: "2026-03-21T08:04:00Z", sender_name: "Fin AI", status: "sent" },
          { role: "customer", text: "ACS URL is correct. We only rotated the signing certificate — we don't use encryption. Okta's clock is NTP-synced.\n\nI'm looking at the SAML debugger trace and the response is valid, but Driftwood seems to reject it with 'Signature validation failed'.", timestamp: "2026-03-21T08:08:00Z", sender_name: "James Okafor" },
          { role: "bot", text: "I can see the issue in your account's auth logs. There appear to be multiple certificates configured, and the system is validating against the old one. However, I'm not able to update SSO certificate configurations directly — this requires admin-level access.", timestamp: "2026-03-21T08:09:00Z", sender_name: "Fin AI", status: "failed" },
          { role: "agent", text: "James, I'm on this. I can see exactly what happened:\n\nWhen you uploaded the new certificate, our system kept the old one as a fallback (this is by design for gradual rollover). But there's a bug where the validation order gets reversed — it's checking the old cert first and rejecting when it fails, instead of trying the new one.\n\nI'm going to:\n1. Remove the stale certificate from your SSO config (server-side)\n2. Force-clear the SAML session cache for your org\n\nGive me 2 minutes.", timestamp: "2026-03-21T08:12:00Z", sender_name: "Ethan Huang" },
          { role: "customer", text: "Thank you — our entire engineering team is blocked. We have a production deploy scheduled in 30 minutes.", timestamp: "2026-03-21T08:14:00Z", sender_name: "James Okafor" },
          { role: "agent", text: "Done. I've removed the old certificate and cleared the session cache. Can you try logging in now?\n\nAlso — for the next 30 minutes, I've enabled a bypass that lets your team use email/password login as a fallback, just in case. The bypass link is: https://app.driftwood.io/auth/bypass?org=okafor-eng", timestamp: "2026-03-21T08:16:00Z", sender_name: "Ethan Huang" },
          { role: "customer", text: "SSO login works now! Team is back in. The bypass was a great idea as a safety net. Thank you for the fast response, Ethan.", timestamp: "2026-03-21T08:19:00Z", sender_name: "James Okafor" },
        ],
      },
    },
  },
];

async function seedSupportThreads() {
  console.log("Seeding support conversation threads...\n");

  const { data: inserted, error } = await supabase
    .from("content_queue")
    .insert(SUPPORT_ITEMS)
    .select();

  if (error) {
    console.error("Failed to seed support items:", error.message);
    return;
  }

  console.log(`Seeded ${inserted.length} support conversation items:`);
  for (const item of inserted) {
    const meta = (item as any).metadata as any;
    const customerName = meta?.conversation?.customer?.name ?? "Unknown";
    console.log(`  - [${customerName}] ${item.title} (${item.id})`);
  }

  console.log("\nDone! These items will appear as support cards with conversation threads in the feed.");
}

seedSupportThreads().catch(console.error);
