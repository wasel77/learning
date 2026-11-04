import { Card } from "@/components/ui/card";
import type { SuccessStory } from "@/lib/types";

function formatStoryAmount(story: SuccessStory) {
  if (!story.score) return null;
  const currency = story.score_currency === "USD" ? "USD" : "SAR";
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(story.score);
}

export function SuccessStoryCard({ story }: { story: SuccessStory }) {
  const amount = formatStoryAmount(story);

  return (
    <Card className="overflow-hidden transition hover:-translate-y-1 hover:border-sky-400/40">
      <div className="flex h-56 items-center justify-center bg-gradient-to-br from-blue-600/20 via-slate-950 to-cyan-400/10 p-3">
        {story.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={story.image_url}
            alt={story.student_name}
            className="max-h-full w-full object-contain"
          />
        ) : null}
      </div>
      <div className="p-5">
        <p className="text-sm text-sky-200">{story.student_name}</p>
        <h3 className="mt-2 text-xl font-black text-white">{story.title}</h3>
        <p className="mt-3 text-sm leading-7 text-slate-400">{story.description}</p>
        {amount ? (
          <div className="mt-5">
            <span className="story-amount rounded-full px-3 py-1 text-xs font-bold">
              {amount}
            </span>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
