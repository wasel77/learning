import type { Level, SubscriptionPackage } from "@/lib/types";

export const levels: Level[] = [
  "beginner",
  "advanced",
  "expert",
  "professional",
  "strategies",
];

const paths: Record<SubscriptionPackage, Level[]> = {
  bronze: ["beginner", "advanced", "expert", "strategies"],
  diamond: ["beginner", "advanced", "expert", "professional", "strategies"],
};

export function getLearningPath(subscriptionPackage: SubscriptionPackage) {
  return paths[subscriptionPackage];
}

export function getAllowedLevels(
  currentLevel?: Level | null,
  subscriptionPackage: SubscriptionPackage = "bronze",
) {
  const path = getLearningPath(subscriptionPackage);
  if (!currentLevel) return path.slice(0, 1);

  const currentIndex = path.indexOf(currentLevel);
  if (currentIndex >= 0) return path.slice(0, currentIndex + 1);

  // A bronze account must never gain professional access, even if a stale or
  // manually edited profile contains that level.
  return subscriptionPackage === "bronze"
    ? path.slice(0, path.indexOf("strategies"))
    : path.slice(0, 1);
}

export function getNextLevel(
  currentLevel: Level,
  subscriptionPackage: SubscriptionPackage,
) {
  const path = getLearningPath(subscriptionPackage);
  const currentIndex = path.indexOf(currentLevel);
  return currentIndex >= 0 ? (path[currentIndex + 1] ?? null) : null;
}

export function getLevelOrder(level: Level) {
  return levels.indexOf(level);
}
