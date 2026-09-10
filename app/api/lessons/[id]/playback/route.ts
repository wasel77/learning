import { createBunnyEmbedUrl, hasBunnyVideo } from "@/lib/bunny-stream";
import { getAccessibleLesson } from "@/lib/lesson-video-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonResponse(body: object, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function GET(
  _request: Request,
  context: RouteContext<"/api/lessons/[id]/playback">,
) {
  const { id: lessonId } = await context.params;
  const access = await getAccessibleLesson(lessonId);

  if ("error" in access) {
    return jsonResponse({ error: access.error }, access.status);
  }

  if (!hasBunnyVideo(access.lesson.id)) {
    return jsonResponse({ error: "Bunny playback is not configured for this lesson" }, 404);
  }

  try {
    const url = createBunnyEmbedUrl(access.lesson.id);
    if (!url) return jsonResponse({ error: "Bunny playback is not configured" }, 404);
    return jsonResponse({ provider: "bunny", url });
  } catch {
    return jsonResponse({ error: "Video playback is temporarily unavailable" }, 503);
  }
}
