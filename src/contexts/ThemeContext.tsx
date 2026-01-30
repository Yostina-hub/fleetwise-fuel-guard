import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "dark" | "light" | "cyber";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const themeOrder: Theme[] = ["dark", "light", "cyber"];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first, default to "dark" (executive theme)
    const stored = localStorage.getItem("app-theme") as Theme;
    if (stored === "light" || stored === "cyber") return stored;
    return "dark";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove all theme classes first
    root.classList.remove("light", "dark", "cyber");
    
    // Add the current theme class
    root.classList.add(theme);
    
    // Store in localStorage
    localStorage.setItem("app-theme", theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const cycleTheme = () => {
    setThemeState((prev) => {
      const currentIndex = themeOrder.indexOf(prev);
      const nextIndex = (currentIndex + 1) % themeOrder.length;
      return themeOrder[nextIndex];
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
