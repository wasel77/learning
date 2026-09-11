import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "وصل للتطور المالي",
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
      className={`${cairo.className} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} />
      </head>
      <body className="min-h-full bg-[#020617] text-slate-50">
        {children}
        <ThemeSwitcher />
      </body>
    </html>
  );
}
