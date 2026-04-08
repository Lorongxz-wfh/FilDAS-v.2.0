import React from "react";
import { getStoredTheme, applyTheme, type ThemePreference } from "../lib/theme";

export function useTheme() {
  const [theme, setTheme] = React.useState<ThemePreference>(getStoredTheme);

  React.useEffect(() => {
    applyTheme(theme);

    // If "system" is selected, we need to listen for OS theme changes
    if (theme === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("system");
      
      media.addEventListener("change", handler);
      return () => media.removeEventListener("change", handler);
    }
  }, [theme]);

  const toggle = React.useCallback(() => {
    setTheme((t) => {
      if (t === "light") return "dark";
      if (t === "dark") return "system";
      return "light";
    });
  }, []);

  return { theme, toggle, setTheme };
}
