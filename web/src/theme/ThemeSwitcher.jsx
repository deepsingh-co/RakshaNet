import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, Check, ChevronDown } from "lucide-react";
import { useTheme } from "./ThemeContext";

/**
 * ThemeSwitcher
 * ──────────────────────────────────────────────────────────────────────
 * variant="compact" → small pill dropdown for the topbar (Layout.jsx)
 * variant="full"    → grid picker for a Settings page
 *
 * Both read/write the same ThemeContext, so switching from either
 * place updates the whole app instantly.
 */
export default function ThemeSwitcher({ variant = "compact" }) {
  if (variant === "full") return <ThemeSwitcherFull />;
  return <ThemeSwitcherCompact />;
}

// ── Compact dropdown (topbar) ──────────────────────────────────────────
function ThemeSwitcherCompact() {
  const { theme, themeKey, themeList, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition"
        style={{
          background: "var(--aegis-surface)",
          border: "1px solid var(--aegis-border)",
          color: "var(--aegis-text-primary)",
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span
          className="w-3.5 h-3.5 rounded-full shrink-0"
          style={{
            background: theme.gradientPrimary,
            border: themeKey === "pureWhite" ? "1.5px solid rgba(15,23,42,0.3)" : "none",
          }}
        />
        <Palette className="w-3.5 h-3.5 opacity-70" />
        <span className="hidden sm:inline">{theme.label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-64 max-h-80 overflow-y-auto rounded-2xl p-2 z-50 backdrop-blur-xl"
            style={{
              background: "var(--aegis-bg-alt)",
              border: "1px solid var(--aegis-border-strong)",
              boxShadow: "var(--aegis-shadow-card)",
            }}
            role="listbox"
          >
            {themeList.map((t) => {
              const active = t.key === themeKey;
              return (
                <button
                  key={t.key}
                  onClick={() => {
                    setTheme(t.key);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-xs font-medium transition"
                  style={{
                    background: active ? "var(--aegis-card-hover)" : "transparent",
                    color: "var(--aegis-text-primary)",
                  }}
                  role="option"
                  aria-selected={active}
                >
                  <span
                    className="w-5 h-5 rounded-full shrink-0 border"
                    style={{
                      background: `linear-gradient(135deg, ${t.primary}, ${t.secondary})`,
                      borderColor: "var(--aegis-border-strong)",
                    }}
                  />
                  <span className="flex-1">{t.label}</span>
                  {active && <Check className="w-3.5 h-3.5" style={{ color: "var(--aegis-primary)" }} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Full grid picker (Settings page) ───────────────────────────────────
function ThemeSwitcherFull() {
  const { themeKey, themeList, setTheme } = useTheme();

  return (
    <div
      className="p-5 rounded-3xl"
      style={{
        background: "var(--aegis-card)",
        border: "1px solid var(--aegis-border)",
        boxShadow: "var(--aegis-shadow-card)",
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Palette className="w-4 h-4" style={{ color: "var(--aegis-primary)" }} />
        <h3 className="font-bold" style={{ color: "var(--aegis-text-primary)" }}>
          Appearance
        </h3>
      </div>
      <p className="text-xs mb-4" style={{ color: "var(--aegis-text-secondary)" }}>
        Choose a theme for the whole RakshaNet interface. Applies instantly across dashboards, maps, and charts.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {themeList.map((t) => {
          const active = t.key === themeKey;
          return (
            <motion.button
              key={t.key}
              onClick={() => setTheme(t.key)}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.97 }}
              className="relative rounded-2xl p-3 text-left overflow-hidden"
              style={{
                border: active
                  ? `2px solid ${t.primary}`
                  : "1px solid var(--aegis-border)",
                background: "var(--aegis-surface)",
              }}
            >
              <div
                className="h-12 rounded-xl mb-2"
                style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.secondary})` }}
              />
              <div className="text-[11px] font-semibold" style={{ color: "var(--aegis-text-primary)" }}>
                {t.label}
              </div>
              {active && (
                <motion.div
                  layoutId="theme-active-badge"
                  className="absolute top-2 right-2 w-5 h-5 rounded-full grid place-items-center"
                  style={{ background: t.primary }}
                >
                  <Check className="w-3 h-3 text-white" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
