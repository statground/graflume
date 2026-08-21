import type { ThemeTokens } from './types.js';

const palette = [
  '#4f46e5',
  '#0f9f8a',
  '#f59e0b',
  '#e05260',
  '#7c3aed',
  '#0e7490',
  '#db2777',
  '#65a30d',
  '#475569',
  '#ea580c',
] as const;

export const graflumeLight: ThemeTokens = {
  name: 'graflume-light',
  mode: 'light',
  colors: {
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#0f172a',
    mutedText: '#64748b',
    axis: '#cbd5e1',
    grid: '#e8eef6',
    focus: '#4f46e5',
    palette,
    sequential: ['#eef2ff', '#c7d2fe', '#818cf8', '#4f46e5', '#312e81'],
    diverging: ['#b42318', '#f79084', '#f8fafc', '#84adff', '#3448c5'],
  },
  typography: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: 12,
    titleSize: 20,
    subtitleSize: 12,
    lineHeight: 1.45,
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  axis: { lineWidth: 1, tickLength: 0, labelPadding: 9, gridLineWidth: 1 },
  mark: { lineWidth: 2.5, pointRadius: 4.5, barRadius: 5, opacity: 1 },
  motion: { duration: 280, easing: 'ease-out' },
};

export const graflumeDark: ThemeTokens = {
  ...graflumeLight,
  name: 'graflume-dark',
  mode: 'dark',
  colors: {
    ...graflumeLight.colors,
    background: '#0b1020',
    surface: '#111827',
    text: '#f8fafc',
    mutedText: '#a7b2c5',
    axis: '#475569',
    grid: '#25314a',
    focus: '#818cf8',
    palette: [
      '#818cf8',
      '#2dd4bf',
      '#fbbf24',
      '#fb7185',
      '#a78bfa',
      '#22d3ee',
      '#f472b6',
      '#a3e635',
      '#94a3b8',
      '#fb923c',
    ],
    sequential: ['#1e293b', '#3730a3', '#6366f1', '#a5b4fc', '#eef2ff'],
    diverging: ['#fb7185', '#be123c', '#334155', '#4f46e5', '#a5b4fc'],
  },
};
