import path from "node:path";
import { MediaError } from "@/lib/errors";
import { runCommand } from "@/lib/run-command";

const FFMPEG_TIMEOUT_MS = 60_000;
const SECONDS_PER_FRAME = 5;
const MIN_FRAMES = 4;
const MAX_FRAMES = 10;
const FRAME_WIDTH_PX = 720;
const FALLBACK_DURATION_SECONDS = 30;

interface ExtractedMedia {
  audioPath: string | null;
  framePaths: string[];
}

async function hasAudioStream(videoPath: string): Promise<boolean> {
  const { stdout } = await runCommand(
    ["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", videoPath],
    { timeoutMs: FFMPEG_TIMEOUT_MS },
  );
  return stdout.trim().length > 0;
}

async function extractAudio(videoPath: string, workDir: string): Promise<string> {
  const audioPath = path.join(workDir, "audio.mp3");
  // Mono 16 kHz is all speech recognition needs and keeps the upload small.
  await runCommand(
    ["ffmpeg", "-y", "-v", "error", "-i", videoPath, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", audioPath],
    { timeoutMs: FFMPEG_TIMEOUT_MS },
  );
  return audioPath;
}

function frameTimestamps(durationSeconds: number): number[] {
  const count = Math.min(MAX_FRAMES, Math.max(MIN_FRAMES, Math.round(durationSeconds / SECONDS_PER_FRAME)));
  const step = durationSeconds / (count + 1);
  return Array.from({ length: count }, (_, index) => Number((step * (index + 1)).toFixed(2)));
}

async function extractFrame(videoPath: string, workDir: string, timestamp: number, index: number): Promise<string> {
  const framePath = path.join(workDir, `frame-${String(index).padStart(2, "0")}.jpg`);
  await runCommand(
    [
      "ffmpeg", "-y", "-v", "error",
      "-ss", String(timestamp),
      "-i", videoPath,
      "-frames:v", "1",
      "-vf", `scale=${FRAME_WIDTH_PX}:-2`,
      "-q:v", "4",
      framePath,
    ],
    { timeoutMs: FFMPEG_TIMEOUT_MS },
  );
  return framePath;
}

export async function extractMedia(
  videoPath: string,
  workDir: string,
  durationSeconds: number | null,
): Promise<ExtractedMedia> {
  try {
    const timestamps = frameTimestamps(durationSeconds ?? FALLBACK_DURATION_SECONDS);
    const [audioPath, framePaths] = await Promise.all([
      hasAudioStream(videoPath).then((hasAudio) => (hasAudio ? extractAudio(videoPath, workDir) : null)),
      Promise.all(timestamps.map((timestamp, index) => extractFrame(videoPath, workDir, timestamp, index))),
    ]);
    const existingFrames = await Promise.all(
      framePaths.map(async (framePath) => ((await Bun.file(framePath).exists()) ? framePath : null)),
    );
    return { audioPath, framePaths: existingFrames.filter((framePath): framePath is string => framePath !== null) };
  } catch (error) {
    throw new MediaError("Could not read the video file.", error);
  }
}
