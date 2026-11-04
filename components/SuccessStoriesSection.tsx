"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SuccessStory } from "@/lib/types";
import { SuccessStoryCard } from "@/components/SuccessStoryCard";

export function SuccessStoriesSection({ initialStories }: { initialStories: SuccessStory[] }) {
  const [stories, setStories] = useState(initialStories);
  const [loading, setLoading] = useState(initialStories.length === 0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (initialStories.length) return;
    const supabase = createClient();
    supabase.from("success_stories").select("*").eq("is_published", true).order("created_at", { ascending: false }).then(({ data, error }) => {
      if (error) setFailed(true);
      else setStories((data ?? []) as SuccessStory[]);
      setLoading(false);
    });
  }, [initialStories.length]);

  if (loading) return <p className="stories-status">جاري تحميل قصص النجاح...</p>;
  if (failed || !stories.length) return <p className="stories-status">تعذر تحميل قصص النجاح في بيئة المعاينة.</p>;
  return <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{stories.map((story) => <SuccessStoryCard key={story.id} story={story} />)}</div>;
}
