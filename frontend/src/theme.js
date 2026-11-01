/**
 * FinScope AI — Design Tokens
 * Dark theme with cyan + purple accent palette.
 */

export const theme = {
  bg: '#0A0E17',
  bgCard: '#111827',
  bgCardHover: '#1a2234',
  bgSurface: '#0d1321',
  bgInput: '#0f172a',

  accent: '#22D3EE',
  accentDim: 'rgba(34,211,238,0.12)',
  accentGlow: 'rgba(34,211,238,0.25)',
  accentSolid: '#0891B2',

  purple: '#A78BFA',
  purpleDim: 'rgba(167,139,250,0.12)',

  danger: '#F87171',
  dangerDim: 'rgba(248,113,113,0.12)',

  success: '#34D399',
  successDim: 'rgba(52,211,153,0.12)',

  warning: '#FBBF24',
  warningDim: 'rgba(251,191,36,0.12)',

  text: '#F1F5F9',
  textMuted: '#94A3B8',
  textDim: '#64748B',

  border: 'rgba(148,163,184,0.12)',
  borderHover: 'rgba(148,163,184,0.25)',

  fontSans: "'DM Sans', system-ui, -apple-system, sans-serif",
  fontMono: "'JetBrains Mono', 'Fira Code', monospace",

  radius: '14px',
  radiusSm: '10px',
  radiusXs: '8px',
  radiusPill: '100px',
};

export const globalStyles = `
  html { overflow-y: scroll; }
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: ${theme.fontSans};
    background: ${theme.bg};
    color: ${theme.text};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  ::-webkit-scrollbar { width: 0px; }

  input:focus, textarea:focus, select:focus { outline: none; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-8px); }
    to { opacity: 1; transform: translateX(0); }
  }

  .fade-up { animation: fadeUp 0.4s ease both; }
  .fade-in { animation: fadeIn 0.3s ease both; }
  .slide-in { animation: slideIn 0.3s ease both; }
  .pulse { animation: pulse 1.2s ease infinite; }
`;

// Agent color mapping
export const agentColors = {
  Extractor: { color: theme.accent, bg: theme.accentDim },
  Auditor: { color: theme.warning, bg: theme.warningDim },
  Reporter: { color: theme.purple, bg: theme.purpleDim },
  Orchestrator: { color: theme.textMuted, bg: theme.bgSurface },
};

// Severity color mapping
export const severityColors = {
  high: { color: theme.danger, bg: theme.dangerDim, border: 'rgba(248,113,113,0.2)' },
  medium: { color: theme.warning, bg: theme.warningDim, border: 'rgba(251,191,36,0.2)' },
  low: { color: theme.accent, bg: theme.accentDim, border: theme.border },
};
