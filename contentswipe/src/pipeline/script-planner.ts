import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_KEY) throw new Error("Missing GEMINI_API_KEY");

const genai = new GoogleGenAI({ apiKey: GEMINI_KEY });
const MODEL = "gemini-2.5-flash";

export interface ScriptScene {
  index: number;
  heading: string;
  visualDescription: string;
  durationSeconds: number;
}

export interface VoiceoverLine {
  sceneIndex: number;
  lineIndex: number;
  speaker: string;
  text: string;
  emotion: string;
  stability: number;
  style: number;
}

export interface SfxCue {
  sceneIndex: number;
  prompt: string;
  durationSeconds: number;
}

export interface VideoScript {
  title: string;
  totalDurationSeconds: number;
  scenes: ScriptScene[];
  voiceover: VoiceoverLine[];
  sfx: SfxCue[];
  videoPrompt: string;
}

/**
 * Phase 1 of the pipeline: Gemini plans the full video script.
 * Takes business context + user prompt and returns a structured script
 * that drives both audio and video generation independently.
 */
export async function planScript(params: {
  businessName: string;
  businessDescription: string;
  websiteUrl?: string;
  userPrompt: string;
  feedback?: string;
  originalScript?: string;
}): Promise<VideoScript> {
  const prompt = `You are a creative director planning a short-form social media video (15-30 seconds, for TikTok/Reels/Shorts).

BUSINESS CONTEXT:
- Name: ${params.businessName}
- Description: ${params.businessDescription}
${params.websiteUrl ? `- Website: ${params.websiteUrl}` : ""}

USER REQUEST:
${params.userPrompt}
${params.feedback ? `\nUSER FEEDBACK ON PREVIOUS VERSION:\n${params.feedback}` : ""}
${params.originalScript ? `\nPREVIOUS SCRIPT TO ITERATE ON:\n${params.originalScript}` : ""}

Create a detailed video production plan. Return ONLY valid JSON, no markdown:

{
  "title": "Catchy video title",
  "totalDurationSeconds": 20,
  "scenes": [
    {
      "index": 0,
      "heading": "OPEN: Close-up of product",
      "visualDescription": "Detailed description of what the camera sees — lighting, movement, framing, colors. This will be sent directly to a video generation AI, so be very specific about the visual content. Do NOT include any audio/voice/sound descriptions here.",
      "durationSeconds": 5
    }
  ],
  "voiceover": [
    {
      "sceneIndex": 0,
      "lineIndex": 0,
      "speaker": "narrator",
      "text": "The exact words to be spoken aloud. Keep it punchy and conversational.",
      "emotion": "warm excitement",
      "stability": 0.35,
      "style": 0.6
    }
  ],
  "sfx": [
    {
      "sceneIndex": 0,
      "prompt": "Evocative 4-10 word sound description for AI SFX generation — describe acoustic texture, not just the object. e.g. 'gentle coffee beans cascading into a ceramic bowl'",
      "durationSeconds": 3
    }
  ],
  "videoPrompt": "A single cohesive prompt describing the FULL video visually, scene by scene, for a text-to-video AI. Focus purely on what the camera SEES — movement, lighting, subjects, transitions. No audio or voice descriptions. 2-4 sentences."
}

RULES:
- totalDurationSeconds should be 15-30
- voiceover lines should be short and punchy (under 20 words each)
- sfx should describe acoustic character, not just name the sound — think texture, scale, environment
- sfx prompt should NEVER describe voices, speech, music, or silence
- videoPrompt should paint a vivid visual picture with no audio references
- stability: LOW (0.1-0.3) for excited/emotional, MED (0.3-0.5) for conversational, HIGH (0.6-0.8) for calm/authoritative
- style: HIGH (0.5-0.8) for dramatic/expressive, LOW (0.1-0.3) for understated
- scenes should flow like a real video — establish, build, payoff
- Include a clear call-to-action in the final voiceover line`;

  const result = await genai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const raw = (result.text ?? "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(raw) as VideoScript;
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${raw.slice(0, 200)}`);
  }
}
