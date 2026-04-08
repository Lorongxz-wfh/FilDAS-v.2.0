const THEME_KEY = "fildas-theme";

export type ThemePreference = "light" | "dark" | "system";

/**
 * Gets the raw stored preference (light, dark, or system)
 */
export function getStoredTheme(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === "dark" || v === "light" || v === "system") return v as ThemePreference;
  } catch {}
  return "system";
}

/**
 * Determines the actual visible theme based on preference and OS
 */
export function resolveTheme(theme: ThemePreference): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

/**
 * Applies the theme to the DOM and saves the preference
 */
export function applyTheme(theme: ThemePreference) {
  const root = document.documentElement;
  const resolved = resolveTheme(theme);

  // Kill all transitions before the class swap so colors change atomically
  root.classList.add("theme-switching");
  
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}

  // Re-enable transitions after the browser has painted the new theme
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      root.classList.remove("theme-switching");
    });
  });
}
