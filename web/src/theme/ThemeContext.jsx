import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import {
  themes,
  themeList,
  tokensToCssVars,
  THEME_STORAGE_KEY,
  DEFAULT_THEME,
} from "./themeConfig";

/**
 * ThemeContext
 * ──────────────────────────────────────────────────────────────────────
 * Exposes:
 *   themeKey       — current theme's key (e.g. "guardianRose")
 *   theme          — current theme's full token object
 *   themeList      — [{ key, label, swatch, primary, secondary }, ...]
 *   setTheme(key)  — switch theme instantly, persists to localStorage
 *
 * Usage in any component:
 *   const { theme, themeKey, setTheme, themeList } = useTheme();
 *
 * No component needs to read CSS vars manually — Tailwind utility classes
 * and existing inline styles that reference var(--aegis-*) update live.
 */

const ThemeContext = createContext(null);

function getInitialThemeKey() {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && themes[stored]) return stored;
  } catch {
    /* localStorage unavailable (private mode, SSR, etc.) — ignore */
  }
  return DEFAULT_THEME;
}

function applyThemeToDocument(themeKey) {
  const theme = themes[themeKey] || themes[DEFAULT_THEME];
  const root = document.documentElement;
  const vars = tokensToCssVars(theme);
  Object.entries(vars).forEach(([prop, value]) => {
    root.style.setProperty(prop, value);
  });
  const lightThemes = ["atlasBisque", "oliveCream", "tealBeige", "pureWhite"];
  root.style.colorScheme = lightThemes.includes(themeKey) ? "light" : "dark";
  // Also expose the active theme key as a data-attribute, useful for
  // any CSS that wants to do theme-specific overrides without JS.
  root.setAttribute("data-aegis-theme", themeKey);
}

export function ThemeProvider({ children }) {
  const [themeKey, setThemeKey] = useState(getInitialThemeKey);

  // Apply on mount and whenever themeKey changes — instant, no reload.
  useEffect(() => {
    applyThemeToDocument(themeKey);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeKey);
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  }, [themeKey]);

  // Keep multiple tabs in sync (optional nicety, doesn't affect anything else)
  useEffect(() => {
    function handleStorage(e) {
      if (e.key === THEME_STORAGE_KEY && e.newValue && themes[e.newValue]) {
        setThemeKey(e.newValue);
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const setTheme = useCallback((key) => {
    if (!themes[key]) {
      console.warn(`[ThemeProvider] Unknown theme key "${key}", ignoring.`);
      return;
    }
    setThemeKey(key);
  }, []);

  const value = useMemo(
    () => ({
      themeKey,
      theme: themes[themeKey],
      themes,
      themeList,
      setTheme,
    }),
    [themeKey, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme() must be used inside <ThemeProvider>");
  }
  return ctx;
}
