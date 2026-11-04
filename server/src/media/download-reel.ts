import { readdir } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { ReelSource } from "@/analyses/analysis-types";
import { config } from "@/config";
import { CommandError, CommandTimeoutError, DownloadError } from "@/lib/errors";
import { runCommand } from "@/lib/run-command";

const DOWNLOAD_TIMEOUT_MS = 180_000;
const MAX_FILE_SIZE = "200M";
const VIDEO_BASENAME = "video";

// Instagram answers unauthenticated scrapers with these when it wants a login or is throttling.
const BLOCKED_PATTERNS = [/login required/i, /rate-?limit/i, /cookies/i, /not available/i, /HTTP Error 40[13]/i];

const InfoJsonSchema = z.looseObject({
  uploader: z.string().nullish(),
  channel: z.string().nullish(),
  uploader_id: z.string().nullish(),
  description: z.string().nullish(),
  duration: z.number().nullish(),
  timestamp: z.number().nullish(),
  thumbnail: z.string().nullish(),
  view_count: z.number().nullish(),
  like_count: z.number().nullish(),
});

interface DownloadedReel {
  videoPath: string;
  source: ReelSource;
}

function buildArgs(url: string, workDir: string): string[] {
  const args = [
    "yt-dlp",
    "--no-playlist",
    "--no-progress",
    "--no-warnings",
    "-f",
    "bv*+ba/b",
    "-S",
    "res:720,ext:mp4:m4a",
    "--merge-output-format",
    "mp4",
    "--max-filesize",
    MAX_FILE_SIZE,
    "--write-info-json",
    "-o",
    path.join(workDir, `${VIDEO_BASENAME}.%(ext)s`),
  ];
  if (config.YTDLP_COOKIES_FROM_BROWSER) {
    args.push("--cookies-from-browser", config.YTDLP_COOKIES_FROM_BROWSER);
  }
  args.push(url);
  return args;
}

function toDownloadError(error: unknown): DownloadError {
  if (error instanceof CommandTimeoutError) {
    return new DownloadError("Downloading the video took too long.", "DOWNLOAD_FAILED", error);
  }
  if (error instanceof CommandError && BLOCKED_PATTERNS.some((pattern) => pattern.test(error.stderr))) {
    return new DownloadError(
      "The platform blocked the download. The post may be private, or the server needs browser cookies (YTDLP_COOKIES_FROM_BROWSER).",
      "DOWNLOAD_BLOCKED",
      error,
    );
  }
  return new DownloadError("Could not download this video.", "DOWNLOAD_FAILED", error);
}

async function readSourceMetadata(infoPath: string): Promise<ReelSource> {
  const info = InfoJsonSchema.parse(await Bun.file(infoPath).json());
  return {
    author: info.uploader ?? info.channel ?? info.uploader_id ?? null,
    caption: info.description?.trim() || null,
    durationSeconds: info.duration ?? null,
    postedAt: info.timestamp ? new Date(info.timestamp * 1000).toISOString() : null,
    thumbnailUrl: info.thumbnail ?? null,
    viewCount: info.view_count ?? null,
    likeCount: info.like_count ?? null,
  };
}

export async function downloadReel(url: string, workDir: string): Promise<DownloadedReel> {
  try {
    await runCommand(buildArgs(url, workDir), { timeoutMs: DOWNLOAD_TIMEOUT_MS });
  } catch (error) {
    throw toDownloadError(error);
  }

  const files = await readdir(workDir);
  const videoFile = files.find((file) => file.startsWith(`${VIDEO_BASENAME}.`) && !file.endsWith(".json"));
  const infoFile = files.find((file) => file.endsWith(".info.json"));
  if (!videoFile || !infoFile) {
    throw new DownloadError("The download finished but no video was saved.", "DOWNLOAD_FAILED");
  }

  return {
    videoPath: path.join(workDir, videoFile),
    source: await readSourceMetadata(path.join(workDir, infoFile)),
  };
}
