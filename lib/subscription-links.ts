import type { ContentPackageScope, SubscriptionPackage } from "./types";

export const DIAMOND_UPGRADE_URL =
  "https://miskpay.site/الترقيه/c3822025";

export const BRONZE_RENEWAL_URL =
  "https://miskpay.site/تجديد-الستارت/p1776842469";

export const DIAMOND_RENEWAL_URL =
  "https://miskpay.site/تجديد-الرويال/p752548395";

export function canAccessPackageContent(
  subscriptionPackage: SubscriptionPackage,
  packageAccess: ContentPackageScope,
) {
  return packageAccess === "both" || packageAccess === subscriptionPackage;
}
