import { getGradeTheme } from '../utils/gradeTheme';

interface GradeBadgeProps {
  grade: string | null | undefined;
  size?: 'xs' | 'sm';
  showFallback?: boolean;
  className?: string;
}

/**
 * Selo discreto e consistente de identificação de grau.
 * Utiliza a paleta centralizada e tipografia RPG sem alterar a estrutura dos painéis.
 */
export function GradeBadge({
  grade,
  size = 'xs',
  showFallback = true,
  className = '',
}: GradeBadgeProps) {
  const theme = getGradeTheme(grade);

  if (!theme.hasGrade && !showFallback) {
    return null;
  }

  const sizeClass =
    size === 'sm' ? 'px-2 py-0.5 text-xs gap-1.5' : 'px-1.5 py-0.5 text-[11px] gap-1';

  return (
    <span
      className={`inline-flex items-center rounded border font-display-rpg font-bold tracking-wide whitespace-nowrap shrink-0 transition-colors ${sizeClass} ${className}`}
      style={{
        color: theme.accentText,
        borderColor: theme.borderColor,
        backgroundColor: theme.markerBg,
      }}
    >
      <span
        aria-hidden="true"
        className="inline-block h-1.5 w-1.5 rotate-45 shrink-0"
        style={{ backgroundColor: theme.accentText }}
      />
      <span>{theme.label}</span>
    </span>
  );
}
