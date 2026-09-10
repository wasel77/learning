import "server-only";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TEST_LESSON_ID = "dc5aba4e-b338-4970-a031-13e3e3365170";
const TEST_VIDEO_TITLE = `[wasel:${TEST_LESSON_ID}] الدرس الاول ( الجزء الثاني )`;

type TestLesson = {
  id: string;
  title: string;
  drive_file_id: string;
  bunny_video_id: string | null;
};

type BunnyVideo = {
  guid: string;
  title: string;
  status: number;
  encodeProgress: number;
  length: number;
  width: number;
  height: number;
  storageSize: number;
  availableResolutions: string | null;
};

function response(body: object, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function getDriveFileId(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/\/d\/([^/?#]+)/) ?? trimmed.match(/[?&]id=([^&#]+)/);
  return match?.[1] ?? trimmed;
}

async function getAdminAndLesson() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: response({ error: "Unauthorized" }, 401) };

  const [{ data: profile }, { data: lesson }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle<{ role: string }>(),
    supabase
      .from("lessons")
      .select("id,title,drive_file_id,bunny_video_id")
      .eq("id", TEST_LESSON_ID)
      .maybeSingle<TestLesson>(),
  ]);

  if (profile?.role !== "admin") return { error: response({ error: "Forbidden" }, 403) };
  if (!lesson) return { error: response({ error: "Test lesson not found" }, 404) };
  return { supabase, lesson };
}

function getBunnyConfig() {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  const apiKey = process.env.BUNNY_STREAM_API_KEY;
  if (!libraryId || !apiKey) throw new Error("Bunny Stream transfer is not configured");
  return { libraryId, apiKey };
}

async function findTestVideo(libraryId: string, apiKey: string) {
  const url = new URL(`https://video.bunnycdn.com/library/${encodeURIComponent(libraryId)}/videos`);
  url.searchParams.set("search", TEST_VIDEO_TITLE);
  url.searchParams.set("itemsPerPage", "10");

  const bunnyResponse = await fetch(url, {
    headers: { AccessKey: apiKey, Accept: "application/json" },
    cache: "no-store",
  });
  if (!bunnyResponse.ok) throw new Error(`Bunny list request failed (${bunnyResponse.status})`);

  const body = (await bunnyResponse.json()) as { items?: BunnyVideo[] };
  return body.items?.find((video) => video.title === TEST_VIDEO_TITLE) ?? null;
}

function publicVideoStatus(video: BunnyVideo | null) {
  if (!video) return { found: false };
  return {
    found: true,
    videoId: video.guid,
    status: video.status,
    encodeProgress: video.encodeProgress,
    length: video.length,
    width: video.width,
    height: video.height,
    storageSize: video.storageSize,
    availableResolutions: video.availableResolutions,
  };
}

export async function GET() {
  const access = await getAdminAndLesson();
  if ("error" in access) return access.error;

  try {
    const { libraryId, apiKey } = getBunnyConfig();
    const video = await findTestVideo(libraryId, apiKey);
    return response({ lessonId: access.lesson.id, linked: Boolean(access.lesson.bunny_video_id), ...publicVideoStatus(video) });
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : "Unable to read Bunny status" }, 502);
  }
}

export async function POST() {
  const access = await getAdminAndLesson();
  if ("error" in access) return access.error;
  if (access.lesson.bunny_video_id) {
    return response({ error: "The test lesson is already linked to Bunny" }, 409);
  }

  try {
    const { libraryId, apiKey } = getBunnyConfig();
    const existing = await findTestVideo(libraryId, apiKey);
    if (existing) return response({ alreadyStarted: true, ...publicVideoStatus(existing) });

    const fileId = getDriveFileId(access.lesson.drive_file_id);
    const sourceUrl = new URL("https://drive.usercontent.google.com/download");
    sourceUrl.searchParams.set("id", fileId);
    sourceUrl.searchParams.set("export", "view");
    sourceUrl.searchParams.set("confirm", "t");

    const bunnyResponse = await fetch(
      `https://video.bunnycdn.com/library/${encodeURIComponent(libraryId)}/videos/fetch`,
      {
        method: "POST",
        headers: {
          AccessKey: apiKey,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: sourceUrl.toString(), headers: {}, title: TEST_VIDEO_TITLE }),
        cache: "no-store",
      },
    );
    const result = (await bunnyResponse.json().catch(() => null)) as
      | { success?: boolean; message?: string; statusCode?: number }
      | null;

    if (!bunnyResponse.ok || result?.success === false) {
      return response(
        {
          error: "Bunny rejected the Google Drive URL fetch",
          bunnyStatus: bunnyResponse.status,
          message: result?.message ?? null,
        },
        502,
      );
    }

    return response({ started: true, bunnyStatus: bunnyResponse.status });
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : "Unable to start Bunny transfer" }, 502);
  }
}
