import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import "./globals.css";

const thmanyahText = localFont({
  src: [
    { path: "./fonts/thmanyahseriftext-Light.otf", weight: "300", style: "normal" },
    { path: "./fonts/thmanyahseriftext-Regular.otf", weight: "400", style: "normal" },
    { path: "./fonts/thmanyahseriftext-Medium.otf", weight: "500", style: "normal" },
    { path: "./fonts/thmanyahseriftext-Bold.otf", weight: "700", style: "normal" },
    { path: "./fonts/thmanyahseriftext-Black.otf", weight: "900", style: "normal" },
  ],
  display: "swap",
  variable: "--font-thmanyah-text",
});

export const metadata: Metadata = {
  title: "مسك للتطور المالي",
  description: "وجهتك الاولى للاستثمار",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
  },
};

const themeInitializationScript = `
  (() => {
    try {
      const saved = localStorage.getItem("wasel-theme");
      const preference = saved === "light" || saved === "dark" || saved === "system"
        ? saved
        : "system";
      const resolved = preference === "system"
        ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : preference;
      const root = document.documentElement;
      root.dataset.themePreference = preference;
      root.dataset.theme = resolved;
      root.style.colorScheme = resolved;
    } catch {
      const resolved = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      document.documentElement.dataset.themePreference = "system";
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${thmanyahText.className} ${thmanyahText.variable} h-full antialiased`}
    >
      <head>
        <meta name="domain-verification" content="db4ee6897065bd68be35891f960fd7665140aa73ecd45d6d3bc4fd41660a09a6" />
        <script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} />
      </head>
      <body className="min-h-full bg-background text-foreground">
        {children}
        <ThemeSwitcher />
      </body>
    </html>
  );
}
