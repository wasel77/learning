import type { ContentPackageScope, SubscriptionPackage } from "./types";

export const DIAMOND_UPGRADE_URL =
  "https://miskpay.site/الترقيه-للالماسيه/p927835383";

export const BRONZE_RENEWAL_URL =
  "https://miskpay.site/تجديد-البرونزيه/p1776842469";

export const DIAMOND_RENEWAL_URL =
  "https://miskpay.site/تجديد-الالماسيه/p752548395";

export function canAccessPackageContent(
  subscriptionPackage: SubscriptionPackage,
  packageAccess: ContentPackageScope,
) {
  return packageAccess === "both" || packageAccess === subscriptionPackage;
}
