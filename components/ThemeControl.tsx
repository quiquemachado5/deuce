"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "system" | "dark" | "light";
const themeKey = "deuce-rally-theme";

function storedTheme(): Theme {
  try {
    const value = localStorage.getItem(themeKey);
    return value === "dark" || value === "light" ? value : "system";
  } catch {
    return "system";
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme =
    theme === "system"
      ? matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
}

const options = [
  { value: "light", label: "Tema claro", icon: Sun },
  { value: "system", label: "Usar tema del sistema", icon: Monitor },
  { value: "dark", label: "Tema oscuro", icon: Moon },
] as const;

export default function ThemeControl() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const preference = matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      const current = storedTheme();
      setTheme(current);
      applyTheme(current);
    };
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  const select = (value: Theme) => {
    setTheme(value);
    try {
      localStorage.setItem(themeKey, value);
    } catch {}
    applyTheme(value);
  };

  return (
    <div className="ry-theme-control" role="group" aria-label="Tema de color">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          title={label}
          aria-pressed={theme === value}
          onClick={() => select(value)}
        >
          <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
