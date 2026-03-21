import "dotenv/config";
import { supabase } from "../lib/supabase.js";

const SUPPORT_ITEMS = [
  {
    title: "Can't reset password — locked out of account",
    description:
      "Hi Peter,\n\nI can see your account was temporarily locked after 3 failed login attempts. I've gone ahead and unlocked it for you.\n\nYou should now be able to reset your password using the 'Forgot Password' link on the login page. The reset email will be sent to peter@driftwood.io.\n\nLet me know if you run into any other issues!",
    content_type: "support_reply" as const,
    status: "pending" as const,
    metadata: {
      source_ref: "4521",
      conversation: {
        id: "215473478125341",
        channel: "intercom",
        ai_confidence: 0.92,
        ticket_ref: "4521",
        customer: {
          name: "Peter Klutte",
          email: "peter@driftwood.io",
        },
        messages: [
          {
            role: "customer",
            text: "Hi, I'm trying to reset my password but I keep getting an error saying my account is locked. I've tried 3 times now and nothing is working.",
            timestamp: "2026-03-20T10:30:00Z",
            sender_name: "Peter Klutte",
          },
          {
            role: "bot",
            text: "Thanks for reaching out! Let me look into your account status right away.",
            timestamp: "2026-03-20T10:30:15Z",
            sender_name: "Fin AI",
            status: "sent",
          },
          {
            role: "customer",
            text: "I need to access my dashboard urgently — I have a client presentation in 2 hours.",
            timestamp: "2026-03-20T10:32:00Z",
            sender_name: "Peter Klutte",
          },
          {
            role: "bot",
            text: "I understand the urgency. I can see your account was locked after multiple failed attempts. Let me check if I can unlock it from here.",
            timestamp: "2026-03-20T10:32:10Z",
            sender_name: "Fin AI",
            status: "sent",
          },
          {
            role: "customer",
            text: "Yes please, that would be great. Also — will my saved reports still be there?",
            timestamp: "2026-03-20T10:33:00Z",
            sender_name: "Peter Klutte",
          },
        ],
      },
    },
  },
  {
    title: "Billing charged twice for March subscription",
    description:
      "Hi Sarah,\n\nI've looked into this and I can confirm there was a duplicate charge on March 15th. This was caused by a payment processing error on our end.\n\nI've initiated a refund of $49.00 to your card ending in 4242. You should see it reflected within 3-5 business days.\n\nI've also added a $10 account credit for the inconvenience. Really sorry about this!",
    content_type: "support_reply" as const,
    status: "pending" as const,
    metadata: {
      source_ref: "4523",
      conversation: {
        id: "215473478125342",
        channel: "intercom",
        ai_confidence: 0.88,
        ticket_ref: "4523",
        customer: {
          name: "Sarah Chen",
          email: "sarah@techflow.com",
        },
        messages: [
          {
            role: "customer",
            text: "I was charged twice for my March subscription. I can see two charges of $49.00 on my credit card statement from March 15th.",
            timestamp: "2026-03-19T14:20:00Z",
            sender_name: "Sarah Chen",
          },
          {
            role: "bot",
            text: "I'm sorry to hear about the duplicate charge. Let me pull up your billing history to investigate.",
            timestamp: "2026-03-19T14:20:12Z",
            sender_name: "Fin AI",
            status: "sent",
          },
          {
            role: "customer",
            text: "Here's a screenshot of my bank statement showing both charges.",
            timestamp: "2026-03-19T14:22:00Z",
            sender_name: "Sarah Chen",
          },
          {
            role: "bot",
            text: "Thank you for sharing that. I can verify the duplicate charge in our system. I'll need to escalate this to our billing team for a refund.",
            timestamp: "2026-03-19T14:22:15Z",
            sender_name: "Fin AI",
            status: "sent",
          },
          {
            role: "customer",
            text: "How long will the refund take? And can you make sure this doesn't happen again next month?",
            timestamp: "2026-03-19T14:25:00Z",
            sender_name: "Sarah Chen",
          },
          {
            role: "bot",
            text: "I wasn't able to process the refund automatically. Let me connect you with our billing specialist.",
            timestamp: "2026-03-19T14:25:10Z",
            sender_name: "Fin AI",
            status: "failed",
          },
          {
            role: "customer",
            text: "OK, please do. I'd also like some kind of credit for the hassle.",
            timestamp: "2026-03-19T14:28:00Z",
            sender_name: "Sarah Chen",
          },
        ],
      },
    },
  },
  {
    title: "Feature request: dark mode for mobile app",
    description:
      "Hi Marcus,\n\nGreat suggestion! Dark mode is actually on our roadmap and currently planned for our Q3 release.\n\nIn the meantime, if you're on iOS, you can use the system-level 'Smart Invert' accessibility setting which works reasonably well with our app.\n\nI've added your request to our internal tracker so the product team knows there's demand. Would you like me to notify you when dark mode ships?",
    content_type: "support_reply" as const,
    status: "pending" as const,
    metadata: {
      source_ref: "4525",
      conversation: {
        id: "215473478125343",
        channel: "intercom",
        ai_confidence: 0.95,
        ticket_ref: "4525",
        customer: {
          name: "Marcus Rivera",
          email: "marcus@designlab.co",
        },
        messages: [
          {
            role: "customer",
            text: "Hey! Love the product but the bright white UI is killing my eyes at night. Any plans for a dark mode?",
            timestamp: "2026-03-21T09:15:00Z",
            sender_name: "Marcus Rivera",
          },
          {
            role: "bot",
            text: "Thanks for the feedback, Marcus! I appreciate you taking the time to share this. Let me check on our product roadmap for dark mode.",
            timestamp: "2026-03-21T09:15:08Z",
            sender_name: "Fin AI",
            status: "sent",
          },
          {
            role: "customer",
            text: "That'd be great. Honestly it's the one thing keeping me from recommending it to my team — a few of them are really particular about dark mode.",
            timestamp: "2026-03-21T09:18:00Z",
            sender_name: "Marcus Rivera",
          },
        ],
      },
    },
  },
  {
    title: "API rate limiting — 429 errors in production",
    description:
      "Hi Alex,\n\nI can see your API key (sk-...7f3a) has been hitting our rate limits consistently over the past hour. Your current plan allows 100 requests/minute and you're averaging around 250/min.\n\nTwo options:\n\n1. Upgrade to our Pro plan ($99/mo) which gives you 1,000 req/min\n2. Implement client-side request batching — I can share our batching guide\n\nFor now, I've temporarily raised your limit to 200/min for the next 24 hours so your production system isn't impacted.\n\nWhich option works better for your use case?",
    content_type: "support_reply" as const,
    status: "pending" as const,
    metadata: {
      source_ref: "4527",
      conversation: {
        id: "215473478125344",
        channel: "intercom",
        ai_confidence: 0.78,
        ticket_ref: "4527",
        customer: {
          name: "Alex Kim",
          email: "alex@buildstack.dev",
        },
        messages: [
          {
            role: "customer",
            text: "URGENT: We're getting 429 Too Many Requests errors on our production API calls. This started about 30 minutes ago and it's affecting our entire platform.",
            timestamp: "2026-03-21T11:00:00Z",
            sender_name: "Alex Kim",
          },
          {
            role: "bot",
            text: "I understand this is urgent. Let me check your API usage and rate limits immediately.",
            timestamp: "2026-03-21T11:00:05Z",
            sender_name: "Fin AI",
            status: "sent",
          },
          {
            role: "customer",
            text: "We haven't changed anything on our end. Our traffic is normal. Did you guys change the rate limits?",
            timestamp: "2026-03-21T11:02:00Z",
            sender_name: "Alex Kim",
          },
          {
            role: "bot",
            text: "I don't see any changes to your plan's rate limits. However, I can see your request volume has increased significantly compared to last week. Let me pull the exact numbers.",
            timestamp: "2026-03-21T11:02:08Z",
            sender_name: "Fin AI",
            status: "sent",
          },
          {
            role: "customer",
            text: "We launched a new feature yesterday that makes more API calls. Is there a way to increase our limit quickly? Our customers are seeing errors.",
            timestamp: "2026-03-21T11:05:00Z",
            sender_name: "Alex Kim",
          },
          {
            role: "bot",
            text: "That explains the increase. I can see you're on the Starter plan with 100 req/min. Your new feature is pushing you to about 250 req/min.",
            timestamp: "2026-03-21T11:05:12Z",
            sender_name: "Fin AI",
            status: "sent",
          },
          {
            role: "customer",
            text: "Can you bump us up temporarily while we figure out the right plan? Our CEO is asking why things are broken.",
            timestamp: "2026-03-21T11:08:00Z",
            sender_name: "Alex Kim",
          },
        ],
      },
    },
  },
  {
    title: "Data export request — GDPR compliance",
    description:
      "Hi Emma,\n\nAbsolutely — we take data privacy seriously. I've queued a full data export for your account. Here's what will be included:\n\n• Profile data & preferences\n• Activity history (last 24 months)\n• All uploaded files & documents\n• Communication logs\n\nThe export will be ready within 24 hours and you'll receive a secure download link at emma@brightpath.eu. The link will be valid for 7 days.\n\nIs there any specific data category you need prioritized?",
    content_type: "support_reply" as const,
    status: "pending" as const,
    metadata: {
      source_ref: "4530",
      conversation: {
        id: "215473478125345",
        channel: "intercom",
        ai_confidence: 0.85,
        ticket_ref: "4530",
        customer: {
          name: "Emma Johansson",
          email: "emma@brightpath.eu",
        },
        messages: [
          {
            role: "customer",
            text: "Hi, under GDPR Article 20 I'd like to request a full export of all personal data you hold about me and my organization.",
            timestamp: "2026-03-21T08:00:00Z",
            sender_name: "Emma Johansson",
          },
          {
            role: "bot",
            text: "Of course, Emma. We fully support GDPR data portability requests. Let me initiate that for you.",
            timestamp: "2026-03-21T08:00:10Z",
            sender_name: "Fin AI",
            status: "sent",
          },
          {
            role: "customer",
            text: "I need it in a machine-readable format — JSON or CSV preferred. And I'd like it within the 30-day window.",
            timestamp: "2026-03-21T08:05:00Z",
            sender_name: "Emma Johansson",
          },
          {
            role: "bot",
            text: "We typically deliver exports in JSON format within 24-48 hours, well within the GDPR timeline. I'll make sure to include all data categories.",
            timestamp: "2026-03-21T08:05:08Z",
            sender_name: "Fin AI",
            status: "sent",
          },
          {
            role: "customer",
            text: "Perfect. Also, once I have the export, I may request deletion of certain data. Is that a separate process?",
            timestamp: "2026-03-21T08:10:00Z",
            sender_name: "Emma Johansson",
          },
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
