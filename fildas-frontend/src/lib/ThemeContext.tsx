import React from "react";
import { type ThemePreference } from "./theme";

interface ThemeCtx {
  theme: ThemePreference;
  toggle: () => void;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = React.createContext<ThemeCtx>({
  theme: "system",
  toggle: () => {},
  setTheme: () => {},
});

import { useTheme } from "../hooks/useTheme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, toggle, setTheme } = useTheme();

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return React.useContext(ThemeContext);
}
