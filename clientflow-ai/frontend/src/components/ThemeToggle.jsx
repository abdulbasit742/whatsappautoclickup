/**
 * PROMPT 109 — Theme Toggle Component
 * Dark/light mode switch with animated icon.
 */

import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ className = '' }) {
  const { themeName, toggleTheme } = useTheme();
  const isDark = themeName === 'dark';

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
        isDark ? 'bg-emerald-600' : 'bg-gray-300'
      } ${className}`}
      aria-label="Toggle theme"
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 flex items-center justify-center text-xs ${
          isDark ? 'translate-x-6' : 'translate-x-0'
        }`}
      >
        {isDark ? '🌙' : '☀️'}
      </span>
    </button>
  );
}
