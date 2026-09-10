import "server-only";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const START_LIMIT_PER_RUN = 3;

type Lesson = {
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

function json(body: object, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function bunnyTitle(lesson: Pick<Lesson, "id" | "title">) {
  return `[wasel:${lesson.id}] ${lesson.title}`;
}

function driveFileId(value: string) {
  const trimmed = value.trim();
  return (
    (trimmed.match(/\/file\/d\/([^/?#]+)/) ??
      trimmed.match(/[?&]id=([^&#]+)/))?.[1] ?? trimmed
  );
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: json({ error: "Unauthorized" }, 401) };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string }>();

  if (profile?.role !== "admin") {
    return { error: json({ error: "Forbidden" }, 403) };
  }

  return { supabase };
}

function bunnyConfig() {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  const apiKey = process.env.BUNNY_STREAM_API_KEY;
  if (!libraryId || !apiKey) {
    throw new Error("Bunny migration is not configured");
  }
  return { libraryId, apiKey };
}

async function listBunnyVideos(libraryId: string, apiKey: string) {
  const videos: BunnyVideo[] = [];
  let page = 1;

  while (page <= 10) {
    const url = new URL(
      `https://video.bunnycdn.com/library/${encodeURIComponent(libraryId)}/videos`,
    );
    url.searchParams.set("page", String(page));
    url.searchParams.set("itemsPerPage", "100");

    const result = await fetch(url, {
      headers: { AccessKey: apiKey, Accept: "application/json" },
      cache: "no-store",
    });
    if (!result.ok) {
      throw new Error(`Bunny list request failed (${result.status})`);
    }

    const body = (await result.json()) as {
      items?: BunnyVideo[];
      totalItems?: number;
    };
    const items = body.items ?? [];
    videos.push(...items);

    if (items.length < 100 || videos.length >= (body.totalItems ?? 0)) break;
    page += 1;
  }

  return videos;
}

async function fetchFromDrive(
  lesson: Lesson,
  libraryId: string,
  apiKey: string,
) {
  const sourceUrl = new URL("https://drive.usercontent.google.com/download");
  sourceUrl.searchParams.set("id", driveFileId(lesson.drive_file_id));
  sourceUrl.searchParams.set("export", "view");
  sourceUrl.searchParams.set("confirm", "t");

  const result = await fetch(
    `https://video.bunnycdn.com/library/${encodeURIComponent(libraryId)}/videos/fetch`,
    {
      method: "POST",
      headers: {
        AccessKey: apiKey,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: sourceUrl.toString(),
        headers: {},
        title: bunnyTitle(lesson),
      }),
      cache: "no-store",
    },
  );
  const body = (await result.json().catch(() => null)) as {
    success?: boolean;
    message?: string;
  } | null;

  if (!result.ok || body?.success === false) {
    throw new Error(
      `Bunny rejected the Google Drive fetch (${result.status}): ${body?.message ?? "unknown error"}`,
    );
  }
}

export async function POST() {
  const access = await requireAdmin();
  if ("error" in access) return access.error;

  try {
    const { libraryId, apiKey } = bunnyConfig();
    const { data: lessons, error: lessonsError } = await access.supabase
      .from("lessons")
      .select("id,title,drive_file_id,bunny_video_id")
      .is("bunny_video_id", null)
      .eq("is_active", true)
      .order("level")
      .order("lesson_order")
      .returns<Lesson[]>();

    if (lessonsError) throw new Error("Unable to read unlinked lessons");
    if (!lessons?.length) {
      return json({ complete: true, remaining: 0, started: [], linked: [], pending: [] });
    }

    const bunnyVideos = await listBunnyVideos(libraryId, apiKey);
    const byTitle = new Map<string, BunnyVideo[]>();
    for (const video of bunnyVideos) {
      const matching = byTitle.get(video.title) ?? [];
      matching.push(video);
      byTitle.set(video.title, matching);
    }

    const linked: Array<{ lessonId: string; title: string; videoId: string }> = [];
    const pending: Array<{
      lessonId: string;
      title: string;
      videoId: string;
      status: number;
      encodeProgress: number;
    }> = [];
    const missing: Lesson[] = [];

    for (const lesson of lessons) {
      const matches = byTitle.get(bunnyTitle(lesson)) ?? [];
      if (matches.length > 1) {
        return json(
          {
            error: "Duplicate Bunny videos found; migration stopped",
            lessonId: lesson.id,
            title: lesson.title,
            videoIds: matches.map((video) => video.guid),
          },
          409,
        );
      }

      const video = matches[0];
      if (!video) {
        missing.push(lesson);
        continue;
      }

      if (video.status === 4 && video.encodeProgress === 100) {
        const { error: linkError } = await access.supabase
          .from("lessons")
          .update({ bunny_video_id: video.guid })
          .eq("id", lesson.id)
          .is("bunny_video_id", null);
        if (linkError) throw new Error(`Unable to link lesson ${lesson.id}`);
        linked.push({ lessonId: lesson.id, title: lesson.title, videoId: video.guid });
      } else {
        pending.push({
          lessonId: lesson.id,
          title: lesson.title,
          videoId: video.guid,
          status: video.status,
          encodeProgress: video.encodeProgress,
        });
      }
    }

    const started: Array<{ lessonId: string; title: string }> = [];
    for (const lesson of missing.slice(0, START_LIMIT_PER_RUN)) {
      try {
        await fetchFromDrive(lesson, libraryId, apiKey);
        started.push({ lessonId: lesson.id, title: lesson.title });
      } catch (error) {
        return json(
          {
            error: error instanceof Error ? error.message : "Unable to start Bunny fetch",
            stopped: true,
            failedLesson: { lessonId: lesson.id, title: lesson.title },
            started,
            linked,
            pending,
          },
          502,
        );
      }
    }

    const remaining = Math.max(0, lessons.length - linked.length);
    return json({
      complete: remaining === 0,
      remaining,
      started,
      linked,
      pending,
      waitingToStart: Math.max(0, missing.length - started.length),
    });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Bunny migration failed", stopped: true },
      502,
    );
  }
}
