const THEME_KEY = "fildas-theme";

export type Theme = "light" | "dark";

export function getStoredTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === "dark" || v === "light") return v;
  } catch {}
  return "light";
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  // Kill all transitions before the class swap so colors change atomically
  root.classList.add("theme-switching");
  if (theme === "dark") {
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
