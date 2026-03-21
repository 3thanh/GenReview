import { supabase } from "../lib/supabase.js";
import type { Business, ContentItem, ContentType } from "../types/database.js";

import defaultVideoScript from "../templates/default-video-script.json" with { type: "json" };
import variantModifier from "../templates/variant-modifier.json" with { type: "json" };
import brainstorm from "../templates/brainstorm.json" with { type: "json" };

const LOCAL_TEMPLATES: Record<string, { template: string }> = {
  "default-video-script": defaultVideoScript,
  "variant-modifier": variantModifier,
  brainstorm: brainstorm,
};

export interface PromptContext {
  business_name: string;
  business_description: string;
  website_url: string;
  style_notes?: string;
  feedback?: string;
  original_script?: string;
}

function resolveTemplate(template: string, ctx: PromptContext): string {
  let result = template;

  // Simple {{variable}} replacement
  for (const [key, value] of Object.entries(ctx)) {
    result = result.replaceAll(`{{${key}}}`, value ?? "");
  }

  // Handle {{#if variable}}...{{/if}} blocks
  result = result.replace(
    /\{\{#if (\w+)\}\}\n?([\s\S]*?)\{\{\/if\}\}/g,
    (_, varName: string, content: string) => {
      const val = ctx[varName as keyof PromptContext];
      return val ? content : "";
    }
  );

  // Clean up any leftover unreplaced variables
  result = result.replace(/\{\{[^}]+\}\}/g, "");
  result = result.replace(/\n{3,}/g, "\n\n").trim();

  return result;
}

/**
 * Fetch the template from Supabase first (override), fall back to local JSON.
 */
async function getTemplate(
  templateName: string,
  contentType: ContentType
): Promise<string> {
  const { data } = await supabase
    .from("prompt_templates")
    .select("template")
    .eq("name", templateName)
    .eq("content_type", contentType)
    .limit(1)
    .single();

  if (data?.template) return data.template;

  const local = LOCAL_TEMPLATES[templateName.toLowerCase().replace(/ /g, "-")];
  if (local) return local.template;

  throw new Error(`Template not found: ${templateName}`);
}

function businessToContext(
  business: Business,
  extra?: Partial<PromptContext>
): PromptContext {
  return {
    business_name: business.name,
    business_description: business.description ?? "",
    website_url: business.website_url ?? "",
    ...extra,
  };
}

/**
 * Generate a prompt for initial content creation.
 */
export async function buildInitialPrompt(
  business: Business,
  styleNotes?: string
): Promise<string> {
  const template = await getTemplate("Default Video Script", "video_script");
  return resolveTemplate(
    template,
    businessToContext(business, { style_notes: styleNotes })
  );
}

/**
 * Generate a prompt for creating a variant of an existing card.
 */
export async function buildVariantPrompt(
  business: Business,
  originalCard: ContentItem,
  feedback: string
): Promise<string> {
  const template = await getTemplate("Variant Modifier", "video_script");
  return resolveTemplate(
    template,
    businessToContext(business, {
      original_script: originalCard.script ?? originalCard.description ?? "",
      feedback,
    })
  );
}

/**
 * Generate a prompt for brainstorming new ideas.
 */
export async function buildBrainstormPrompt(
  business: Business,
  feedback?: string
): Promise<string> {
  const template = await getTemplate("Brainstorm Ideas", "video_script");
  return resolveTemplate(template, businessToContext(business, { feedback }));
}
