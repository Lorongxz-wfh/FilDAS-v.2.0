import React from "react";
import { getStoredTheme, applyTheme, type Theme } from "../lib/theme";

export function useTheme() {
  const [theme, setTheme] = React.useState<Theme>(getStoredTheme);

  React.useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = React.useCallback(() => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }, []);

  return { theme, toggle };
}
