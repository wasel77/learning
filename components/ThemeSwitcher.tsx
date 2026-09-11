"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "wasel-theme";
const THEME_CHANGE_EVENT = "wasel-theme-change";

const options: Array<{
  value: ThemePreference;
  label: string;
  icon: typeof Sun;
}> = [
  { value: "light", label: "فاتح", icon: Sun },
  { value: "dark", label: "داكن", icon: Moon },
  { value: "system", label: "الجهاز", icon: Monitor },
];

function resolveTheme(preference: ThemePreference) {
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(preference: ThemePreference) {
  const resolvedTheme = resolveTheme(preference);
  const root = document.documentElement;

  root.dataset.themePreference = preference;
  root.dataset.theme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function ThemeSwitcher() {
  const preference = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
      return () => window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
    },
    () => {
      const current = document.documentElement.dataset.themePreference;
      return current === "light" || current === "dark" || current === "system"
        ? current
        : "system";
    },
    () => "system" as const,
  );

  useEffect(() => {
    if (preference !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const followSystemTheme = () => applyTheme("system");

    mediaQuery.addEventListener("change", followSystemTheme);
    return () => mediaQuery.removeEventListener("change", followSystemTheme);
  }, [preference]);

  const selectTheme = (nextPreference: ThemePreference) => {
    window.localStorage.setItem(STORAGE_KEY, nextPreference);
    applyTheme(nextPreference);
  };

  return (
    <div className="theme-switcher" aria-label="اختيار مظهر الموقع">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          className="theme-option"
          data-active={preference === value ? "true" : undefined}
          aria-pressed={preference === value}
          aria-label={`${label} (${value})`}
          title={`${label} (${value})`}
          onClick={() => selectTheme(value)}
        >
          <Icon aria-hidden="true" size={16} strokeWidth={2} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
