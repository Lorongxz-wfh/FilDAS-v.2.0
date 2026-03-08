import React from "react";
import { getStoredTheme, applyTheme, type Theme } from "./theme";

interface ThemeCtx {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = React.createContext<ThemeCtx>({
  theme: "light",
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<Theme>(getStoredTheme);

  React.useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = React.useCallback(() => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return React.useContext(ThemeContext);
}
