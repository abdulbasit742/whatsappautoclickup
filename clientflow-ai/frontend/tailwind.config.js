export default {
  darkMode: ['attribute', 'data-theme'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Map to CSS variables for white-label + theme support
        primary:  'var(--color-primary)',
        surface:  'var(--color-surface)',
        border:   'var(--color-border)',
        muted:    'var(--color-textMuted)',
        dark: { bg: '#0f0f0f', card: '#1a1a1a', border: '#2a2a2a' }
      },
      backgroundColor: {
        app:     'var(--color-bg)',
        surface: 'var(--color-surface)',
        high:    'var(--color-surfaceHigh)',
      },
      textColor: {
        default: 'var(--color-text)',
        muted:   'var(--color-textMuted)',
      },
      borderColor: {
        default: 'var(--color-border)',
      },
    }
  },
  plugins: []
};
