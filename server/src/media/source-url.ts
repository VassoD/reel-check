import { ValidationError } from "@/lib/errors";

const URL_IN_TEXT_PATTERN = /https?:\/\/[^\s<>"']+/i;

const INSTAGRAM_HOSTS = new Set(["instagram.com", "www.instagram.com", "m.instagram.com"]);
const INSTAGRAM_POST_PATH = /^\/(?:[\w.]+\/)?(reels?|p)\/([\w-]+)/;

const TIKTOK_HOSTS = new Set(["tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"]);

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);
const YOUTUBE_SHORTS_PATH = /^\/shorts\/([\w-]+)/;

/**
 * Android share intents often send "Check out this reel! https://..." rather than a bare URL,
 * so this pulls the first URL out of free text, then normalizes it so the same Reel shared twice
 * (with different tracking params such as igsh) maps to one cached analysis.
 */
export function normalizeSourceUrl(input: string): string {
  const match = input.match(URL_IN_TEXT_PATTERN);
  if (!match) throw new ValidationError("No link found. Share a Reel, TikTok or YouTube Short.", "UNSUPPORTED_URL");

  let url: URL;
  try {
    url = new URL(match[0]);
  } catch {
    throw new ValidationError("That link is not a valid URL.", "UNSUPPORTED_URL");
  }
  const host = url.hostname.toLowerCase();

  if (INSTAGRAM_HOSTS.has(host)) {
    const post = url.pathname.match(INSTAGRAM_POST_PATH);
    if (!post) throw new ValidationError("That Instagram link is not a Reel or post.", "UNSUPPORTED_URL");
    return `https://www.instagram.com/reel/${post[2]}/`;
  }
  if (TIKTOK_HOSTS.has(host)) {
    return `https://${host}${url.pathname}`;
  }
  if (YOUTUBE_HOSTS.has(host)) {
    const short = url.pathname.match(YOUTUBE_SHORTS_PATH);
    if (!short) throw new ValidationError("Only YouTube Shorts are supported.", "UNSUPPORTED_URL");
    return `https://www.youtube.com/shorts/${short[1]}`;
  }
  throw new ValidationError("Only Instagram, TikTok and YouTube Shorts links are supported.", "UNSUPPORTED_URL");
}
