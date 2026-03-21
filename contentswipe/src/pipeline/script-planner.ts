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

export type CameraStyle = "stable" | "smooth" | "dynamic" | "handheld" | "chaotic";

export interface VideoScript {
  title: string;
  totalDurationSeconds: number;
  scenes: ScriptScene[];
  voiceover: VoiceoverLine[];
  sfx: SfxCue[];
  videoPrompt: string;
  cameraStyle?: CameraStyle;
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
  "videoPrompt": "A single cohesive prompt describing the FULL video visually, scene by scene, for a text-to-video AI. Focus purely on what the camera SEES — movement, lighting, subjects, transitions. No audio or voice descriptions. 2-4 sentences. IMPORTANT: Always specify camera movement style (e.g. 'smooth steady cam', 'locked-off tripod shot', 'gentle dolly', 'handheld shaky cam'). Default to smooth/stable camera unless the scene specifically calls for chaotic movement (action, crashes, urgency).",
  "cameraStyle": "One of: stable | smooth | dynamic | handheld | chaotic — describes overall camera motion feel. Use 'stable' or 'smooth' for most content. Only use 'handheld' or 'chaotic' for intense/action scenes."
}

RULES:
- totalDurationSeconds should be 15-30
- voiceover lines should be short and punchy (under 20 words each)
- sfx should describe acoustic character, not just name the sound — think texture, scale, environment
- sfx prompt should NEVER describe voices, speech, music, or silence
- videoPrompt should paint a vivid visual picture with no audio references
- videoPrompt MUST include explicit camera movement/stability instructions. Default to smooth, steady camera work. Only use shaky/handheld camera for real-world action-heavy or chaotic scenes (car crashes, chases, combat). Calm/lifestyle/tutorial/character/animated/fictional content should always specify "smooth steady camera", "locked tripod shot", or "gentle dolly movement".
- cameraStyle should match the content mood: lifestyle/tutorial/product/animated/character/gaming/Pokemon → "stable" or "smooth", real-world action/sports → "dynamic", documentary/BTS → "handheld", real-world crash/chaos → "chaotic"
- IMPORTANT: Animated characters, Pokemon, gaming content, fictional characters, and cartoon-style videos should ALWAYS use "stable" or "smooth" cameraStyle. Never use handheld or dynamic for these — they need polished, cinematic framing.
- videoPrompt for animated/character content should explicitly say "locked-off tripod shot" or "smooth steady camera on a dolly" — never describe handheld or shaky camera movement for this content.
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
