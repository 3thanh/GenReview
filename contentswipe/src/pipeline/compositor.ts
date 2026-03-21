import { execFile } from "child_process";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { promisify } from "util";
import type { AudioSegment } from "./audio-generator.js";
import type { ScriptScene } from "./script-planner.js";

const exec = promisify(execFile);
const TMP_DIR = "/tmp/contentswipe-compose";

async function ensureTmpDir() {
  await mkdir(TMP_DIR, { recursive: true });
}

/**
 * Write base64 audio segments to disk as temporary files.
 */
async function writeSegmentFiles(
  segments: AudioSegment[],
  prefix: string
): Promise<string[]> {
  const paths: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    const path = `${TMP_DIR}/${prefix}_${i}.mp3`;
    await writeFile(path, Buffer.from(segments[i].audioBase64, "base64"));
    paths.push(path);
  }
  return paths;
}

/**
 * Concatenate voiceover segments into a single VO track with small gaps.
 */
async function concatVoiceover(voPaths: string[]): Promise<string> {
  if (voPaths.length === 0) {
    throw new Error("No voiceover segments to concatenate");
  }
  if (voPaths.length === 1) return voPaths[0];

  const listFile = `${TMP_DIR}/vo_list.txt`;
  const listContent = voPaths.map((p) => `file '${p}'`).join("\n");
  await writeFile(listFile, listContent);

  const outPath = `${TMP_DIR}/voiceover_full.mp3`;
  await exec("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listFile,
    "-c",
    "copy",
    outPath,
  ]);

  return outPath;
}

/**
 * Mix SFX segments into a single ambient track, layered on top of each other.
 * Each SFX is placed at its approximate position based on scene timing.
 */
async function mixSfx(
  sfxPaths: string[],
  sfxSegments: AudioSegment[],
  scenes: ScriptScene[],
  totalDuration: number
): Promise<string | null> {
  if (sfxPaths.length === 0) return null;

  // Calculate scene start times
  const sceneStarts: number[] = [];
  let cursor = 0;
  for (const scene of scenes) {
    sceneStarts.push(cursor);
    cursor += scene.durationSeconds;
  }

  const outPath = `${TMP_DIR}/sfx_mixed.mp3`;

  // Build FFmpeg filter to layer SFX at correct offsets
  const inputs = sfxPaths.flatMap((p) => ["-i", p]);
  const delays = sfxSegments.map((seg, i) => {
    const delayMs = Math.round((sceneStarts[seg.sceneIndex] ?? 0) * 1000);
    return `[${i}]adelay=${delayMs}|${delayMs}[sfx${i}]`;
  });
  const mixInputs = sfxSegments.map((_, i) => `[sfx${i}]`).join("");
  const filterComplex = [
    ...delays,
    `${mixInputs}amix=inputs=${sfxPaths.length}:duration=longest:dropout_transition=2[out]`,
  ].join(";");

  await exec("ffmpeg", [
    "-y",
    ...inputs,
    "-filter_complex",
    filterComplex,
    "-map",
    "[out]",
    "-t",
    String(totalDuration),
    outPath,
  ]);

  return outPath;
}

/**
 * Merge video + voiceover + SFX into final output.
 * VO is mixed at full volume, SFX at -12dB underneath.
 */
export async function composeVideo(params: {
  videoPath: string;
  voiceover: AudioSegment[];
  sfx: AudioSegment[];
  scenes: ScriptScene[];
  totalDuration: number;
}): Promise<Buffer> {
  await ensureTmpDir();
  console.log("\n[COMPOSE] Starting audio/video composition...");

  const voPaths = await writeSegmentFiles(params.voiceover, "vo");
  const sfxPaths = await writeSegmentFiles(params.sfx, "sfx");

  const voTrack = await concatVoiceover(voPaths);
  const sfxTrack = await mixSfx(
    sfxPaths,
    params.sfx,
    params.scenes,
    params.totalDuration
  );

  const outPath = `${TMP_DIR}/final_${Date.now()}.mp4`;

  if (sfxTrack) {
    // Mix VO (full volume) + SFX (-12dB) then merge with video
    await exec("ffmpeg", [
      "-y",
      "-i", params.videoPath,
      "-i", voTrack,
      "-i", sfxTrack,
      "-filter_complex",
      "[1:a]volume=1.0[vo];[2:a]volume=0.25[sfx];[vo][sfx]amix=inputs=2:duration=longest[audio]",
      "-map", "0:v",
      "-map", "[audio]",
      "-c:v", "copy",
      "-c:a", "aac",
      "-b:a", "192k",
      "-shortest",
      outPath,
    ]);
  } else {
    // Just VO, no SFX
    await exec("ffmpeg", [
      "-y",
      "-i", params.videoPath,
      "-i", voTrack,
      "-map", "0:v",
      "-map", "1:a",
      "-c:v", "copy",
      "-c:a", "aac",
      "-b:a", "192k",
      "-shortest",
      outPath,
    ]);
  }

  const finalBuffer = await readFile(outPath);
  console.log(
    `[COMPOSE] Done (${(finalBuffer.length / 1024 / 1024).toFixed(1)}MB)`
  );

  // Cleanup temp files
  const allTmp = [...voPaths, ...sfxPaths, voTrack];
  if (sfxTrack) allTmp.push(sfxTrack);
  allTmp.push(outPath);
  for (const f of allTmp) {
    try { await unlink(f); } catch {}
  }

  return finalBuffer;
}
