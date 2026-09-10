import "server-only";

import { createHash } from "node:crypto";

const BUNNY_VIDEO_BY_LESSON_TITLE: Readonly<Record<string, string>> = {
  "الدرس الاول ( الجزء الاول )": "0078afc6-491e-43a6-93b1-95dfafa80d0a",
};

const EMBED_TOKEN_TTL_SECONDS = 15 * 60;

export function hasBunnyVideo(title: string) {
  return Object.hasOwn(BUNNY_VIDEO_BY_LESSON_TITLE, title);
}

export function createBunnyEmbedUrl(title: string) {
  const videoId = BUNNY_VIDEO_BY_LESSON_TITLE[title];
  if (!videoId) return null;

  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  const tokenKey = process.env.BUNNY_STREAM_TOKEN_KEY;
  if (!libraryId || !tokenKey) {
    throw new Error("Bunny Stream environment variables are not configured");
  }

  const expires = Math.floor(Date.now() / 1000) + EMBED_TOKEN_TTL_SECONDS;
  const token = createHash("sha256")
    .update(`${tokenKey}${videoId}${expires}`)
    .digest("hex");

  const url = new URL(
    `https://player.mediadelivery.net/embed/${encodeURIComponent(libraryId)}/${encodeURIComponent(videoId)}`,
  );
  url.searchParams.set("token", token);
  url.searchParams.set("expires", String(expires));
  url.searchParams.set("preload", "true");
  url.searchParams.set("playsinline", "true");
  return url.toString();
}
