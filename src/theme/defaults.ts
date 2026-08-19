import type { ThemeTokens } from './types.js';

const palette = [
  '#3b82f6',
  '#f97316',
  '#10b981',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#eab308',
  '#ec4899',
  '#64748b',
  '#84cc16',
] as const;

export const graflumeLight: ThemeTokens = {
  name: 'graflume-light',
  mode: 'light',
  colors: {
    background: '#ffffff',
    surface: '#ffffff',
    text: '#172033',
    mutedText: '#5d6b82',
    axis: '#5d6b82',
    grid: '#e5eaf2',
    focus: '#2563eb',
    palette,
    sequential: ['#eff6ff', '#bfdbfe', '#60a5fa', '#2563eb', '#1e3a8a'],
    diverging: ['#b91c1c', '#fca5a5', '#f8fafc', '#93c5fd', '#1d4ed8'],
  },
  typography: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: 12,
    titleSize: 18,
    subtitleSize: 13,
    lineHeight: 1.4,
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  axis: { lineWidth: 1, tickLength: 5, labelPadding: 7, gridLineWidth: 1 },
  mark: { lineWidth: 2, pointRadius: 3.5, barRadius: 2, opacity: 1 },
  motion: { duration: 250, easing: 'ease-out' },
};

export const graflumeDark: ThemeTokens = {
  ...graflumeLight,
  name: 'graflume-dark',
  mode: 'dark',
  colors: {
    ...graflumeLight.colors,
    background: '#101522',
    surface: '#171e2d',
    text: '#f1f5f9',
    mutedText: '#a8b3c7',
    axis: '#a8b3c7',
    grid: '#2c3547',
    focus: '#60a5fa',
    palette: [
      '#60a5fa',
      '#fb923c',
      '#34d399',
      '#f87171',
      '#a78bfa',
      '#22d3ee',
      '#facc15',
      '#f472b6',
      '#94a3b8',
      '#a3e635',
    ],
  },
};
