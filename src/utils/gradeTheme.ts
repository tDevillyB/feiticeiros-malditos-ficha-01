export type CharacterGradeKey =
  | 'quarto'
  | 'terceiro'
  | 'segundo'
  | 'semi_primeiro'
  | 'primeiro'
  | 'especial'
  | 'none';

export interface GradeTheme {
  key: CharacterGradeKey;
  hasGrade: boolean;
  label: string;
  /** Tonalidade clara e legível para nomes de personagens sobre fundo escuro */
  nameColor: string;
  /** Tonalidade principal de destaque discreto do grau */
  accentText: string;
  /** Cor da borda de molduras e marcadores */
  borderColor: string;
  /** Cor da borda ao passar o mouse */
  hoverBorderColor: string;
  /** Cor para filetes e linhas decorativas sutis */
  lineColor: string;
  /** Fundo translúcido discreto para marcadores de grau */
  markerBg: string;
  /** Brilho ambiente sutil para retratos sem imagem */
  ambientGlow: string;
}

/**
 * Paleta centralizada de identidade visual por grau para o tema escuro F&M 2.5.
 * Tonalidades equilibradas e não neon para integração harmônica com os painéis atuais.
 */
export const GRADE_THEMES: Record<CharacterGradeKey, GradeTheme> = {
  quarto: {
    key: 'quarto',
    hasGrade: true,
    label: 'Quarto Grau',
    nameColor: '#f1f5f9',
    accentText: '#cbd5e1',
    borderColor: 'rgba(203, 213, 225, 0.36)',
    hoverBorderColor: 'rgba(226, 232, 240, 0.65)',
    lineColor: 'rgba(203, 213, 225, 0.34)',
    markerBg: 'rgba(203, 213, 225, 0.08)',
    ambientGlow: 'rgba(203, 213, 225, 0.14)',
  },
  terceiro: {
    key: 'terceiro',
    hasGrade: true,
    label: 'Terceiro Grau',
    nameColor: '#ecfdf5',
    accentText: '#6ee7b7',
    borderColor: 'rgba(16, 185, 129, 0.44)',
    hoverBorderColor: 'rgba(52, 211, 153, 0.74)',
    lineColor: 'rgba(16, 185, 129, 0.42)',
    markerBg: 'rgba(16, 185, 129, 0.10)',
    ambientGlow: 'rgba(16, 185, 129, 0.18)',
  },
  segundo: {
    key: 'segundo',
    hasGrade: true,
    label: 'Segundo Grau',
    nameColor: '#eff6ff',
    accentText: '#93c5fd',
    borderColor: 'rgba(96, 165, 250, 0.45)',
    hoverBorderColor: 'rgba(147, 197, 253, 0.75)',
    lineColor: 'rgba(96, 165, 250, 0.42)',
    markerBg: 'rgba(59, 130, 246, 0.11)',
    ambientGlow: 'rgba(59, 130, 246, 0.20)',
  },
  semi_primeiro: {
    key: 'semi_primeiro',
    hasGrade: true,
    label: 'Semi-Primeiro Grau',
    nameColor: '#f3f0ff',
    accentText: '#c4b5fd',
    borderColor: 'rgba(139, 92, 246, 0.46)',
    hoverBorderColor: 'rgba(167, 139, 250, 0.76)',
    lineColor: 'rgba(139, 92, 246, 0.44)',
    markerBg: 'rgba(139, 92, 246, 0.11)',
    ambientGlow: 'rgba(139, 92, 246, 0.20)',
  },
  primeiro: {
    key: 'primeiro',
    hasGrade: true,
    label: 'Primeiro Grau',
    nameColor: '#faf5ff',
    accentText: '#d8b4fe',
    borderColor: 'rgba(168, 85, 247, 0.52)',
    hoverBorderColor: 'rgba(192, 132, 252, 0.82)',
    lineColor: 'rgba(168, 85, 247, 0.48)',
    markerBg: 'rgba(168, 85, 247, 0.13)',
    ambientGlow: 'rgba(168, 85, 247, 0.22)',
  },
  especial: {
    key: 'especial',
    hasGrade: true,
    label: 'Grau Especial',
    nameColor: '#fef2f2',
    accentText: '#f87171',
    borderColor: 'rgba(220, 38, 38, 0.56)',
    hoverBorderColor: 'rgba(248, 113, 113, 0.84)',
    lineColor: 'rgba(220, 38, 38, 0.52)',
    markerBg: 'rgba(185, 28, 28, 0.14)',
    ambientGlow: 'rgba(185, 28, 28, 0.24)',
  },
  none: {
    key: 'none',
    hasGrade: false,
    label: 'Sem grau',
    nameColor: '#f8fafc',
    accentText: '#94a3b8',
    borderColor: 'rgba(148, 163, 184, 0.32)',
    hoverBorderColor: 'rgba(129, 140, 248, 0.65)',
    lineColor: 'rgba(148, 163, 184, 0.24)',
    markerBg: 'rgba(148, 163, 184, 0.06)',
    ambientGlow: 'rgba(99, 102, 241, 0.18)',
  },
};

export function resolveGradeKey(rawGrade: string | null | undefined): CharacterGradeKey {
  if (!rawGrade) return 'none';
  const normalized = rawGrade
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  if (!normalized) return 'none';
  if (normalized.includes('especial')) return 'especial';
  if (normalized.includes('semi') && normalized.includes('primeiro')) return 'semi_primeiro';
  if (normalized.includes('primeiro') || normalized === '1' || normalized === '1o') {
    return 'primeiro';
  }
  if (normalized.includes('segundo') || normalized === '2' || normalized === '2o') {
    return 'segundo';
  }
  if (normalized.includes('terceiro') || normalized === '3' || normalized === '3o') {
    return 'terceiro';
  }
  if (normalized.includes('quarto') || normalized === '4' || normalized === '4o') {
    return 'quarto';
  }
  return 'none';
}

export function getGradeTheme(rawGrade: string | null | undefined): GradeTheme {
  const key = resolveGradeKey(rawGrade);
  const base = GRADE_THEMES[key];
  const trimmed = rawGrade?.trim();
  if (!trimmed) {
    return base;
  }
  return {
    ...base,
    label: trimmed,
  };
}
