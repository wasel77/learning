import type { ContentPackageScope, SubscriptionPackage } from "@/lib/types";

export const DIAMOND_UPGRADE_URL =
  "https://thewtofficial.com/الترقيه-للالماسيه/p927835383";

export const BRONZE_RENEWAL_URL =
  "https://thewtofficial.com/تجديد-البرونزيه/p1776842469";

export const DIAMOND_RENEWAL_URL =
  "https://thewtofficial.com/تجديد-الماسيه/p752548395";

export function canAccessPackageContent(
  subscriptionPackage: SubscriptionPackage,
  packageAccess: ContentPackageScope,
) {
  return packageAccess === "both" || packageAccess === subscriptionPackage;
}
