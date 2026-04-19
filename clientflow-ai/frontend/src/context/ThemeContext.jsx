/**
 * PROMPT 109 — Dark Mode + Theme Engine
 * Theme provider with dark/light/custom modes and persistent user preference.
 * Supports white-label color injection from org branding (PROMPT 110).
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

// Default theme tokens
const THEMES = {
  dark: {
    name:        'dark',
    bg:          '#0f0f0f',
    surface:     '#1a1a1a',
    surfaceHigh: '#252525',
    border:      '#2d2d2d',
    text:        '#ffffff',
    textMuted:   '#9ca3af',
    primary:     '#10B981',
    primaryHover:'#059669',
    danger:      '#ef4444',
    warning:     '#f59e0b',
    info:        '#3b82f6',
  },
  light: {
    name:        'light',
    bg:          '#f9fafb',
    surface:     '#ffffff',
    surfaceHigh: '#f3f4f6',
    border:      '#e5e7eb',
    text:        '#111827',
    textMuted:   '#6b7280',
    primary:     '#10B981',
    primaryHover:'#059669',
    danger:      '#ef4444',
    warning:     '#f59e0b',
    info:        '#3b82f6',
  },
};

/** Apply CSS variables to :root */
function applyTheme(tokens) {
  const root = document.documentElement;
  Object.entries(tokens).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });
  root.setAttribute('data-theme', tokens.name);
}

export function ThemeProvider({ children, orgBranding = null }) {
  const [themeName, setThemeName] = useState(() => {
    return localStorage.getItem('cf_theme') || 'dark';
  });

  const getTokens = useCallback((name) => {
    const base = THEMES[name] || THEMES.dark;
    // Merge org branding primary color if available (white-label support)
    if (orgBranding?.brand_primary_color) {
      return {
        ...base,
        primary:      orgBranding.brand_primary_color,
        primaryHover: orgBranding.brand_primary_color + 'cc',
      };
    }
    return base;
  }, [orgBranding]);

  useEffect(() => {
    const tokens = getTokens(themeName);
    applyTheme(tokens);
    localStorage.setItem('cf_theme', themeName);
    // Inject org custom CSS if present
    if (orgBranding?.brand_custom_css) {
      let styleEl = document.getElementById('org-custom-css');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'org-custom-css';
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = orgBranding.brand_custom_css;
    }
  }, [themeName, orgBranding, getTokens]);

  const toggleTheme = () => {
    setThemeName(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const setTheme = (name) => {
    if (THEMES[name]) setThemeName(name);
  };

  return (
    <ThemeContext.Provider value={{ themeName, toggleTheme, setTheme, tokens: getTokens(themeName) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export default ThemeContext;
