import "server-only";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Lesson = { id: string; title: string; drive_file_id: string; bunny_video_id: string | null };
type BunnyVideo = { guid: string; title: string; status: number; encodeProgress: number; length: number; width: number; height: number; storageSize: number; availableResolutions: string | null };

const response = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

function fileId(value: string) {
  const trimmed = value.trim();
  return (trimmed.match(/\/d\/([^/?#]+)/) ?? trimmed.match(/[?&]id=([^&#]+)/))?.[1] ?? trimmed;
}

async function access() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: response({ error: "Unauthorized" }, 401) };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle<{ role: string }>();
  if (profile?.role !== "admin") return { error: response({ error: "Forbidden" }, 403) };
  const { data: lesson, error } = await supabase
    .from("lessons")
    .select("id,title,drive_file_id,bunny_video_id")
    .is("bunny_video_id", null)
    .order("level")
    .order("lesson_order")
    .limit(1)
    .maybeSingle<Lesson>();
  if (error) return { error: response({ error: "Unable to select the next lesson" }, 500) };
  if (!lesson) return { error: response({ error: "No unlinked lessons remain" }, 404) };
  return { supabase, lesson };
}

function config() {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  const apiKey = process.env.BUNNY_STREAM_API_KEY;
  if (!libraryId || !apiKey) throw new Error("Bunny transfer is not configured");
  return { libraryId, apiKey };
}

async function findVideo(libraryId: string, apiKey: string, title: string) {
  const url = new URL(`https://video.bunnycdn.com/library/${encodeURIComponent(libraryId)}/videos`);
  url.searchParams.set("search", title);
  url.searchParams.set("itemsPerPage", "10");
  const result = await fetch(url, { headers: { AccessKey: apiKey, Accept: "application/json" }, cache: "no-store" });
  if (!result.ok) throw new Error(`Bunny list request failed (${result.status})`);
  const body = (await result.json()) as { items?: BunnyVideo[] };
  return body.items?.find((video) => video.title === title) ?? null;
}

function publicStatus(video: BunnyVideo | null) {
  if (!video) return { found: false };
  return { found: true, videoId: video.guid, status: video.status, encodeProgress: video.encodeProgress, length: video.length, width: video.width, height: video.height, storageSize: video.storageSize, availableResolutions: video.availableResolutions };
}

export async function GET() {
  const current = await access();
  if ("error" in current) return current.error;
  try {
    const { libraryId, apiKey } = config();
    const title = `[wasel:${current.lesson.id}] ${current.lesson.title}`;
    const video = await findVideo(libraryId, apiKey, title);
    if (video?.status === 4 && video.encodeProgress === 100) {
      await current.supabase.from("lessons").update({ bunny_video_id: video.guid }).eq("id", current.lesson.id).is("bunny_video_id", null);
      return response({ lessonId: current.lesson.id, title: current.lesson.title, linked: true, ...publicStatus(video) });
    }
    return response({ lessonId: current.lesson.id, title: current.lesson.title, linked: false, ...publicStatus(video) });
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : "Unable to read Bunny status" }, 502);
  }
}

export async function POST() {
  const current = await access();
  if ("error" in current) return current.error;
  try {
    const { libraryId, apiKey } = config();
    const title = `[wasel:${current.lesson.id}] ${current.lesson.title}`;
    const existing = await findVideo(libraryId, apiKey, title);
    if (existing) {
      if (existing.status === 4 && existing.encodeProgress === 100) {
        await current.supabase.from("lessons").update({ bunny_video_id: existing.guid }).eq("id", current.lesson.id).is("bunny_video_id", null);
        return response({ alreadyStarted: true, linked: true, lessonId: current.lesson.id, title: current.lesson.title, ...publicStatus(existing) });
      }
      return response({ alreadyStarted: true, linked: false, lessonId: current.lesson.id, title: current.lesson.title, ...publicStatus(existing) });
    }
    const sourceUrl = new URL("https://drive.usercontent.google.com/download");
    sourceUrl.searchParams.set("id", fileId(current.lesson.drive_file_id));
    sourceUrl.searchParams.set("export", "view");
    sourceUrl.searchParams.set("confirm", "t");
    const result = await fetch(`https://video.bunnycdn.com/library/${encodeURIComponent(libraryId)}/videos/fetch`, {
      method: "POST",
      headers: { AccessKey: apiKey, Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ url: sourceUrl.toString(), headers: {}, title }),
      cache: "no-store",
    });
    const body = (await result.json().catch(() => null)) as { success?: boolean; message?: string } | null;
    if (!result.ok || body?.success === false) return response({ error: "Bunny rejected the Google Drive URL fetch", bunnyStatus: result.status, message: body?.message ?? null }, 502);
    return response({ started: true, lessonId: current.lesson.id, title: current.lesson.title });
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : "Unable to start Bunny transfer" }, 502);
  }
}
