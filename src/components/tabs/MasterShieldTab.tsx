import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  Lock,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Swords,
  Unlock,
  Users,
} from 'lucide-react';
import type { Player } from '@owlbear-rodeo/sdk';
import {
  BLEEDING_DESCRIPTIONS,
  CONDITION_DESCRIPTIONS,
  FREEZING_DESCRIPTIONS,
  SIMPLE_CONDITION_LIST,
} from '../../data/conditionsInfo';
import type {
  AptitudeEntry,
  AttributeKey,
  BleedingSeverity,
  DamageTypeKey,
  FichaPersonagem,
  FreezingSeverity,
  SharedCharacterSummary,
  ShikigamiCharacteristicKind,
  SimpleConditionKey,
} from '../../types/character';
import {
  adjustMentalResource,
  adjustPoolResource,
  applyPoolMaxChange,
  buildSharedCharacterSummary,
  createCalculableField,
  resolveCalculableValue,
  setMentalResourceCurrent,
  setPoolResourceCurrent,
} from '../../utils/calculations';
import {
  evaluateSheetAccess,
  evaluateSheetAccessFromSheet,
  type SheetAccessContext,
} from '../../utils/permissions';
import { getGradeTheme } from '../../utils/gradeTheme';
import { CalculableValueControl } from '../CalculableValueControl';
import { GradeBadge } from '../GradeBadge';
import { NumericInput } from '../NumericInput';

export interface MasterShieldTabProps {
  viewerRole: 'GM' | 'PLAYER';
  isInsideOBR: boolean;
  currentPlayerId: string | null;
  party: Player[];
  localSheets: FichaPersonagem[];
  sessionSheets: FichaPersonagem[];
  sharedSummaries: Record<string, SharedCharacterSummary>;
  selectedControlSheetId: string;
  onSelectControlSheet: (sheetId: string) => void;
  onUpdateSheetById: (
    sheetId: string,
    updater: (prev: FichaPersonagem) => FichaPersonagem
  ) => void;
  onOpenFullSheet: (sheetId: string) => void;
  onRequestSyncFromRoom: () => void;
  requestedSubView?: { view: 'overview' | 'control'; nonce: number } | null;
}

const ATTRIBUTE_KEYS: AttributeKey[] = ['FOR', 'DEX', 'CON', 'INT', 'SAB', 'PRE'];

const RESISTANCE_TYPES_ORDER: DamageTypeKey[] = [
  'Cortante',
  'Perfurante',
  'Ácido',
  'Impacto',
  'Chocante',
  'Congelante',
  'Energia Reversa',
  'Energético',
  'Sônico',
  'Necrótico',
  'Psíquico',
  'Queimante',
  'Radiante',
  'Venenoso',
  'Dano na alma',
];

const SHIKIGAMI_CHAR_LABELS: Record<ShikigamiCharacteristicKind, string> = {
  passiva: 'Passiva',
  particularidade: 'Particularidade',
  efeito_permanente: 'Efeito Permanente',
  propriedade: 'Propriedade Inerente',
};

function formatSigned(val: number): string {
  return val >= 0 ? `+${val}` : `${val}`;
}

interface RosterCharacterSlotProps {
  card: SharedCharacterSummary;
  isGM: boolean;
  isOwner: boolean;
  canQuickEdit: boolean;
  canOpenCombatCenter: boolean;
  canOpenFullSheet: boolean;
  hasFullSheet: boolean;
  onAdjustPool: (sheetId: string, pool: 'hp' | 'pe', delta: number) => void;
  onOpenControl: (sheetId: string) => void;
  onOpenFullSheet: (sheetId: string) => void;
  onRequestSync: () => void;
}

function RosterCharacterSlot({
  card,
  isGM,
  isOwner,
  canQuickEdit,
  canOpenCombatCenter,
  canOpenFullSheet,
  hasFullSheet,
  onAdjustPool,
  onOpenControl,
  onOpenFullSheet,
  onRequestSync,
}: RosterCharacterSlotProps) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [card.avatarUrl]);

  const showImage = Boolean(card.avatarUrl && !imgFailed);
  const displayName = card.name.trim() || 'Personagem (Em branco)';
  const initials = (card.name.trim() || 'FM').slice(0, 2).toUpperCase();
  const gradeTheme = getGradeTheme(card.grade);
  const playerLabel = card.playerName || card.ownerPlayerName || 'Sem jogador';

  const condLabels = [
    ...card.activeConditions,
    ...(card.bleeding ? [`Sangramento (${card.bleeding})`] : []),
    ...(card.freezing ? [`Congelamento (${card.freezing})`] : []),
  ];

  const hpPct = Math.min(100, Math.max(0, card.hpPercentage));
  const pePct = Math.min(100, Math.max(0, card.pePercentage));

  const frameStyle = {
    transform: 'skewX(-8deg)',
    '--grade-border': gradeTheme.borderColor,
    '--grade-border-hover': gradeTheme.hoverBorderColor,
  } as CSSProperties;

  return (
    <article className="group relative flex w-[224px] snap-center shrink-0 flex-col sm:w-[252px]">
      {/* Moldura Diagonal do Retrato */}
      <div className="relative mx-auto h-[284px] w-[192px] sm:h-[322px] sm:w-[216px]">
        <div
          className="grade-frame relative h-full w-full overflow-hidden border bg-[#090b12] shadow-[0_14px_30px_rgba(0,0,0,0.55)] transition-colors duration-200"
          style={frameStyle}
        >
          {/* Conteúdo interno contra-inclinado para manter retrato e textos 100% retos */}
          <div
            className="absolute inset-y-0 -inset-x-[17%]"
            style={{ transform: 'skewX(8deg)' }}
          >
            {showImage ? (
              <img
                src={card.avatarUrl}
                alt={displayName}
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="relative flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-[#171c2d] via-[#101420] to-[#080a10] select-none">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-25"
                  style={{
                    backgroundImage: `radial-gradient(circle at 50% 38%, ${gradeTheme.ambientGlow}, transparent 65%)`,
                  }}
                />
                <div
                  className="relative flex h-24 w-24 items-center justify-center rounded-full border bg-[#0b0e17]/80 transition-colors"
                  style={{ borderColor: gradeTheme.borderColor }}
                >
                  <span
                    className="font-display-rpg text-2xl font-bold tracking-wider"
                    style={{ color: gradeTheme.accentText }}
                  >
                    {initials}
                  </span>
                </div>
                <span className="relative mt-2.5 text-[11px] font-medium tracking-wide text-slate-500">
                  Sem retrato
                </span>
              </div>
            )}
          </div>

          {/* Scrim inferior para garantir contraste alto do nome sobreposto */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[44%] bg-gradient-to-t from-[#06080e] via-[#06080e]/75 to-transparent"
          />

          {/* Filetes sutis superior e inferior com a cor do grau */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[1px]"
            style={{
              background: `linear-gradient(90deg, transparent, ${gradeTheme.lineColor}, transparent)`,
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[1.5px]"
            style={{
              background: `linear-gradient(90deg, ${gradeTheme.lineColor}, transparent 85%)`,
            }}
          />

          {/* Indicador discreto de trava do Mestre */}
          {card.lockedByGM && (
            <div
              className="absolute top-2.5 right-3 z-20 flex items-center justify-center rounded bg-[#090b12]/80 p-1 text-amber-300 backdrop-blur-xs"
              style={{ transform: 'skewX(8deg)' }}
              title="Ficha travada pelo Mestre"
            >
              <Lock className="h-3.5 w-3.5" aria-label="Ficha travada pelo Mestre" />
            </div>
          )}

          {/* Nome do Personagem e Subtítulo Discreto Sobrepostos na Parte Inferior da Arte */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 pb-2.5 pr-4 pl-10"
            style={{ transform: 'skewX(8deg)' }}
          >
            <h3
              className="font-display-rpg truncate text-[17px] font-bold leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.92)]"
              style={{ color: gradeTheme.nameColor }}
            >
              {displayName}
            </h3>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] drop-shadow-[0_1px_3px_rgba(0,0,0,0.92)]">
              <span
                className="inline-flex items-center gap-1 font-display-rpg font-bold shrink-0"
                style={{ color: gradeTheme.accentText }}
              >
                <span
                  aria-hidden="true"
                  className="inline-block h-1.5 w-1.5 rotate-45"
                  style={{ backgroundColor: gradeTheme.accentText }}
                />
                {gradeTheme.label}
              </span>
              <span aria-hidden="true" className="text-slate-500">
                ·
              </span>
              <span className="truncate font-medium text-slate-300/80">
                {playerLabel}
              </span>
            </p>
          </div>
        </div>

        {/* Emblema em Diamante no vértice inferior esquerdo (Nível) */}
        <div
          className="absolute -bottom-3 -left-2 z-20 flex h-9 w-9 rotate-45 items-center justify-center border bg-[#0e121c] shadow-lg transition-colors sm:-left-3"
          style={{ borderColor: gradeTheme.borderColor }}
          title={`Nível ${card.level}`}
        >
          <span className="-rotate-45 font-mono-tabular text-xs font-bold text-slate-100">
            {card.level}
          </span>
        </div>
      </div>

      {/* Área Compacta de Recursos (PV e PE) na Base do Personagem */}
      <div className="mt-4 space-y-2 sm:-ml-2 sm:mr-2 sm:pl-2">
        {/* PV */}
        <div>
          <div className="mb-1 flex items-center justify-between gap-1.5 text-xs">
            <span className="text-[11px] font-semibold tracking-wide text-emerald-400">
              PV
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono-tabular text-xs font-bold text-slate-100">
                {card.hpCurrent}{' '}
                <span className="text-[11px] font-normal text-slate-400">
                  / {card.hpMax} ({card.hpPercentage}%)
                </span>
              </span>
              {canQuickEdit && hasFullSheet && (
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    aria-label={`Diminuir PV de ${displayName}`}
                    onClick={() => onAdjustPool(card.sheetId, 'hp', -1)}
                    className="inline-flex min-h-[34px] min-w-[34px] items-center justify-center rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-0.5 font-mono-tabular text-[10px] leading-none text-red-300 hover:bg-red-500/20 sm:min-h-0 sm:min-w-0"
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    aria-label={`Aumentar PV de ${displayName}`}
                    onClick={() => onAdjustPool(card.sheetId, 'hp', 1)}
                    className="inline-flex min-h-[34px] min-w-[34px] items-center justify-center rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-0.5 font-mono-tabular text-[10px] leading-none text-emerald-300 hover:bg-emerald-500/20 sm:min-h-0 sm:min-w-0"
                  >
                    +1
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-xs border border-[#1d2434] bg-[#06080d]">
            <div
              className="h-full bg-emerald-500 transition-[width] duration-200"
              style={{ width: `${hpPct}%` }}
            />
          </div>
        </div>

        {/* PE */}
        <div>
          <div className="mb-1 flex items-center justify-between gap-1.5 text-xs">
            <span className="text-[11px] font-semibold tracking-wide text-indigo-300">
              PE
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono-tabular text-xs font-bold text-slate-100">
                {card.peCurrent}{' '}
                <span className="text-[11px] font-normal text-slate-400">
                  / {card.peMax} ({card.pePercentage}%)
                </span>
              </span>
              {canQuickEdit && hasFullSheet && (
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    aria-label={`Diminuir PE de ${displayName}`}
                    onClick={() => onAdjustPool(card.sheetId, 'pe', -1)}
                    className="inline-flex min-h-[34px] min-w-[34px] items-center justify-center rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-0.5 font-mono-tabular text-[10px] leading-none text-red-300 hover:bg-red-500/20 sm:min-h-0 sm:min-w-0"
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    aria-label={`Aumentar PE de ${displayName}`}
                    onClick={() => onAdjustPool(card.sheetId, 'pe', 1)}
                    className="inline-flex min-h-[34px] min-w-[34px] items-center justify-center rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-0.5 font-mono-tabular text-[10px] leading-none text-indigo-200 hover:bg-indigo-500/20 sm:min-h-0 sm:min-w-0"
                  >
                    +1
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-xs border border-[#1d2434] bg-[#06080d]">
            <div
              className="h-full bg-indigo-500 transition-[width] duration-200"
              style={{ width: `${pePct}%` }}
            />
          </div>
        </div>

        {/* Condições ativas (compacto) */}
        {condLabels.length > 0 && (
          <p className="truncate pt-0.5 text-[11px] text-red-300" title={condLabels.join(' · ')}>
            <span className="text-slate-400">Cond.: </span>
            {condLabels.join(' · ')}
          </p>
        )}

        {/* Ações integradas discretas */}
        {(canOpenCombatCenter || canOpenFullSheet || isGM) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {canOpenCombatCenter && hasFullSheet && (
              <button
                type="button"
                onClick={() => onOpenControl(card.sheetId)}
                className="rounded border border-indigo-500/40 bg-indigo-600/20 px-2.5 py-2 text-[11px] font-medium text-indigo-100 hover:bg-indigo-600/35 whitespace-nowrap shrink-0 sm:py-1"
              >
                Central de Combate
              </button>
            )}
            {canOpenFullSheet && hasFullSheet && (
              <button
                type="button"
                onClick={() => onOpenFullSheet(card.sheetId)}
                className="rounded border border-[#242a3b] bg-[#0e121c] px-2.5 py-2 text-[11px] text-slate-200 hover:bg-[#192033] whitespace-nowrap shrink-0 sm:py-1"
              >
                {isOwner ? 'Minha Ficha' : 'Abrir Ficha'}
              </button>
            )}
            {!hasFullSheet && (isGM || canOpenCombatCenter || canOpenFullSheet) && (
              <button
                type="button"
                onClick={onRequestSync}
                className="rounded border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-200 hover:bg-amber-500/20 whitespace-nowrap shrink-0 sm:py-1"
              >
                Solicitar Ficha
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export function MasterShieldTab({
  viewerRole,
  isInsideOBR,
  currentPlayerId,
  party,
  localSheets,
  sessionSheets,
  sharedSummaries,
  selectedControlSheetId,
  onSelectControlSheet,
  onUpdateSheetById,
  onOpenFullSheet,
  onRequestSyncFromRoom,
  requestedSubView,
}: MasterShieldTabProps) {
  const [activeSubView, setActiveSubView] = useState<'overview' | 'control'>('overview');
  const [skillFilterQuery, setSkillFilterQuery] = useState('');
  const [onlyTrainedSkills, setOnlyTrainedSkills] = useState(false);
  const [expandedAbilityIds, setExpandedAbilityIds] = useState<Record<string, boolean>>({});
  const [expandedSummonIds, setExpandedSummonIds] = useState<Record<string, boolean>>({});
  const [conditionSearch, setConditionSearch] = useState('');
  const [combatResistanceDraft, setCombatResistanceDraft] = useState('');
  const [combatImmunityDraft, setCombatImmunityDraft] = useState('');
  const overviewTrackRef = useRef<HTMLDivElement>(null);

  const isGM = viewerRole === 'GM';

  const scrollOverviewBy = (direction: -1 | 1) => {
    const track = overviewTrackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * 240, behavior: 'smooth' });
  };

  useEffect(() => {
    if (requestedSubView) {
      setActiveSubView(requestedSubView.view);
    }
  }, [requestedSubView]);

  const localSheetIds = useMemo(
    () => new Set(localSheets.map((s) => s.id)),
    [localSheets]
  );

  const accessContext: SheetAccessContext = useMemo(
    () => ({
      viewerRole,
      currentPlayerId,
      isInsideOBR,
      localSheetIds,
    }),
    [viewerRole, currentPlayerId, isInsideOBR, localSheetIds]
  );

  // Lista consolidada para a Visão Geral da Mesa:
  // combina os resumos da sala OBR (sharedSummaries) com as fichas conhecidas na sessão
  const overviewCards = useMemo(() => {
    const map = new Map<string, SharedCharacterSummary>();

    for (const sheet of sessionSheets) {
      map.set(sheet.id, buildSharedCharacterSummary(sheet));
    }

    for (const summary of Object.values(sharedSummaries)) {
      const existing = map.get(summary.sheetId);
      if (!existing || summary.updatedAt > existing.updatedAt) {
        map.set(summary.sheetId, summary);
      }
    }

    return Array.from(map.values());
  }, [sessionSheets, sharedSummaries]);

  // Identifica a ficha própria do jogador atual (para abertura automática na Central de Combate)
  const primaryOwnedSheet = useMemo(() => {
    if (isInsideOBR && currentPlayerId) {
      return (
        localSheets.find(
          (s) =>
            s.permissions.ownerPlayerId === currentPlayerId ||
            s.permissions.ownerPlayerId === null
        ) ??
        localSheets[0] ??
        null
      );
    }
    return localSheets[0] ?? null;
  }, [isInsideOBR, currentPlayerId, localSheets]);

  // Lista unificada selecionável na Central de Combate (fichas carregadas + cartões da mesa)
  const combatSelectorItems = useMemo(() => {
    const map = new Map<
      string,
      {
        sheetId: string;
        name: string;
        playerLabel: string;
        level: number;
        summary: SharedCharacterSummary | undefined;
        sheet: FichaPersonagem | undefined;
      }
    >();

    for (const card of overviewCards) {
      map.set(card.sheetId, {
        sheetId: card.sheetId,
        name: card.name.trim() || 'Personagem sem nome',
        playerLabel: card.playerName || card.ownerPlayerName || '',
        level: card.level,
        summary: card,
        sheet: sessionSheets.find((s) => s.id === card.sheetId),
      });
    }

    for (const s of sessionSheets) {
      if (!map.has(s.id)) {
        map.set(s.id, {
          sheetId: s.id,
          name: s.identity.name.trim() || 'Personagem sem nome',
          playerLabel: s.identity.player || s.permissions.ownerPlayerName || '',
          level: resolveCalculableValue(s.identity.level),
          summary: sharedSummaries[s.id],
          sheet: s,
        });
      }
    }

    return Array.from(map.values());
  }, [overviewCards, sessionSheets, sharedSummaries]);

  // Ao entrar como Jogador na Central de Combate, garante seleção automática do próprio personagem
  useEffect(() => {
    if (activeSubView !== 'control') return;
    if (!isGM && primaryOwnedSheet) {
      const selectedExists = combatSelectorItems.some(
        (item) => item.sheetId === selectedControlSheetId
      );
      if (!selectedControlSheetId || !selectedExists) {
        onSelectControlSheet(primaryOwnedSheet.id);
      }
    }
  }, [
    activeSubView,
    isGM,
    primaryOwnedSheet,
    combatSelectorItems,
    selectedControlSheetId,
    onSelectControlSheet,
  ]);

  const effectiveControlSheetId =
    selectedControlSheetId ||
    (!isGM ? primaryOwnedSheet?.id : sessionSheets[0]?.id) ||
    '';

  const controlledSummary =
    overviewCards.find((c) => c.sheetId === effectiveControlSheetId) ??
    sharedSummaries[effectiveControlSheetId];

  const controlledSheet =
    sessionSheets.find((s) => s.id === effectiveControlSheetId) ?? null;

  const canQuickEditSummary = (card: SharedCharacterSummary): boolean => {
    return evaluateSheetAccess(card, accessContext).canEditCombatCenter;
  };

  const handleOpenControlForCard = (sheetId: string) => {
    onSelectControlSheet(sheetId);
    setActiveSubView('control');
  };

  const renderControlPanel = () => {
    if (combatSelectorItems.length === 0 && !controlledSheet) {
      return (
        <div className="rounded-lg border border-[#212636] bg-[#11141e] p-8 text-center">
          <p className="text-sm text-slate-300">
            Nenhum personagem disponível na sessão ainda.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Crie uma ficha ou solicite que os jogadores abram a extensão na sala do Owlbear Rodeo.
          </p>
        </div>
      );
    }

    const activePolicy = controlledSheet
      ? evaluateSheetAccessFromSheet(controlledSheet, accessContext, controlledSummary)
      : controlledSummary
        ? evaluateSheetAccess(controlledSummary, accessContext)
        : null;

    const renderSelectorBar = (sheetForHeader: FichaPersonagem | null) => {
      const isRemotePlayerSheet =
        sheetForHeader !== null &&
        sheetForHeader.permissions.ownerPlayerId !== null &&
        sheetForHeader.permissions.ownerPlayerId !== currentPlayerId;

      return (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#212636] bg-[#11141e] px-3 py-3 sm:px-4">
          <div className="flex w-full min-w-0 flex-wrap items-center gap-3 sm:w-auto">
            <label className="flex w-full min-w-0 flex-col items-stretch gap-1 text-xs text-slate-400 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
              {isGM ? 'Personagem em Controle' : 'Personagem na Central de Combate'}
              <select
                value={effectiveControlSheetId}
                onChange={(e) => onSelectControlSheet(e.target.value)}
                className="w-full min-w-0 max-w-full rounded border border-[#242a3b] bg-[#0b0d14] px-3 py-1.5 text-sm font-medium text-slate-100 focus:border-indigo-500 focus:outline-none sm:w-auto"
              >
                {combatSelectorItems.map((item) => {
                  const itemPolicy = item.sheet
                    ? evaluateSheetAccessFromSheet(item.sheet, accessContext, item.summary)
                    : item.summary
                      ? evaluateSheetAccess(item.summary, accessContext)
                      : null;

                  let accessTag = '';
                  if (!isGM && itemPolicy) {
                    if (itemPolicy.isOwner) {
                      accessTag = ' [Sua ficha]';
                    } else if (itemPolicy.canViewCombatCenter) {
                      accessTag = ' [Compartilhada · Somente leitura]';
                    } else {
                      accessTag = ' [Privada]';
                    }
                  }

                  return (
                    <option key={item.sheetId} value={item.sheetId}>
                      {item.name}
                      {item.playerLabel ? ` (${item.playerLabel})` : ''} — Nvl {item.level}
                      {accessTag}
                    </option>
                  );
                })}
              </select>
            </label>

            {isRemotePlayerSheet && sheetForHeader && (
              <span className="text-xs text-indigo-300">
                Ficha de:{' '}
                {sheetForHeader.permissions.ownerPlayerName ||
                  sheetForHeader.identity.player ||
                  'Jogador'}
              </span>
            )}
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {isGM && sheetForHeader && (
              <button
                type="button"
                onClick={() =>
                  onUpdateSheetById(sheetForHeader.id, (prev) => ({
                    ...prev,
                    permissions: {
                      ...prev.permissions,
                      lockedByGM: !prev.permissions.lockedByGM,
                    },
                  }))
                }
                className={`inline-flex flex-1 min-h-[40px] items-center justify-center gap-1.5 rounded border px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 sm:flex-initial sm:min-h-0 ${
                  sheetForHeader.permissions.lockedByGM
                    ? 'border-amber-500/50 bg-amber-500/15 text-amber-200'
                    : 'border-[#242a3b] bg-[#0b0d14] text-slate-300 hover:bg-[#171b28]'
                }`}
              >
                {sheetForHeader.permissions.lockedByGM ? (
                  <>
                    <Lock className="h-3.5 w-3.5" />
                    Travada p/ Jogador
                  </>
                ) : (
                  <>
                    <Unlock className="h-3.5 w-3.5" />
                    Edição Liberada
                  </>
                )}
              </button>
            )}

            {sheetForHeader && activePolicy?.canViewFullSheet && (
              <button
                type="button"
                onClick={() => onOpenFullSheet(sheetForHeader.id)}
                className="inline-flex flex-1 min-h-[40px] items-center justify-center gap-1.5 rounded bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 whitespace-nowrap shrink-0 sm:flex-initial sm:min-h-0"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir Ficha Completa
              </button>
            )}
          </div>
        </section>
      );
    };

    // Bloqueio real quando um jogador tenta abrir Central de Combate privada de outro jogador
    if (!activePolicy || !activePolicy.canViewCombatCenter) {
      return (
        <div className="space-y-4">
          {renderSelectorBar(null)}
          <section className="rounded-lg border border-amber-500/35 bg-[#11141e] p-8 text-center">
            <Lock className="mx-auto mb-2.5 h-6 w-6 text-amber-300" />
            <h3 className="text-sm font-semibold text-slate-100">
              Central de Combate Privada
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              O proprietário deste personagem não compartilhou a visualização da Central de Combate.
            </p>
            {primaryOwnedSheet && (
              <button
                type="button"
                onClick={() => onSelectControlSheet(primaryOwnedSheet.id)}
                className="mt-4 inline-flex items-center gap-1.5 rounded bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                Voltar para minha Central de Combate
              </button>
            )}
          </section>
        </div>
      );
    }

    if (!controlledSheet) {
      return (
        <div className="space-y-4">
          {renderSelectorBar(null)}
          <section className="rounded-lg border border-[#212636] bg-[#11141e] p-8 text-center">
            <p className="text-sm text-slate-300">
              A Central de Combate deste personagem está compartilhada, aguardando sincronização da sala.
            </p>
            {isInsideOBR && (
              <button
                type="button"
                onClick={onRequestSyncFromRoom}
                className="mt-4 inline-flex items-center gap-1.5 rounded border border-[#242a3b] bg-[#0b0d14] px-3 py-1.5 text-xs text-slate-200 hover:bg-[#171b28]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Sincronizar Sala
              </button>
            )}
          </section>
        </div>
      );
    }

    const sheet = controlledSheet;
    const combatReadOnly = !activePolicy.canEditCombatCenter;
    const updateControlled = (updater: (prev: FichaPersonagem) => FichaPersonagem) => {
      if (combatReadOnly) return;
      onUpdateSheetById(sheet.id, updater);
    };

    const hpCurrent = resolveCalculableValue(sheet.vitals.hp.current);
    const hpMax = resolveCalculableValue(sheet.vitals.hp.max);
    const hpPct = resolveCalculableValue(sheet.vitals.hp.percentage);

    const peCurrent = resolveCalculableValue(sheet.vitals.pe.current);
    const peMax = resolveCalculableValue(sheet.vitals.pe.max);
    const pePct = resolveCalculableValue(sheet.vitals.pe.percentage);

    const sanCurrent = resolveCalculableValue(sheet.vitals.sanity.current);
    const sanMax = resolveCalculableValue(sheet.vitals.sanity.max);
    const sanPct = resolveCalculableValue(sheet.vitals.sanity.percentage);

    const intCurrent = resolveCalculableValue(sheet.vitals.integrity.current);
    const intMax = resolveCalculableValue(sheet.vitals.integrity.max);
    const intPct = resolveCalculableValue(sheet.vitals.integrity.percentage);

    const grade = resolveCalculableValue(sheet.identity.grade);
    const level = resolveCalculableValue(sheet.identity.level);
    const trainingBonus = resolveCalculableValue(sheet.identity.trainingBonus);

    const activeConditions = (
      Object.keys(sheet.conditions.flags) as SimpleConditionKey[]
    ).filter((k) => sheet.conditions.flags[k]);

    const filteredSkills = sheet.skills.filter((sk) => {
      const matchesQuery = sk.name
        .toLowerCase()
        .includes(skillFilterQuery.trim().toLowerCase());
      const matchesTrained = !onlyTrainedSkills || sk.trained || sk.mastered;
      return matchesQuery && matchesTrained;
    });

    const filteredConditionOptions = SIMPLE_CONDITION_LIST.filter((cond) =>
      cond.toLowerCase().includes(conditionSearch.trim().toLowerCase())
    );

    const activeExcitement = sheet.vitals.excitement.filter((ex) => ex.active);
    const activeReleaseSlots = (sheet.cursedProfile.releaseSlots ?? []).filter(
      (slot) => slot.unlocked || slot.name.trim() !== ''
    );
    const acquiredAptitudes: Array<AptitudeEntry & { groupLabel: string }> = [
      ...sheet.cursedProfile.cursedAptitudes.map((a) => ({
        ...a,
        groupLabel: 'Amaldiçoada',
      })),
      ...sheet.cursedProfile.auraAptitudes.map((a) => ({
        ...a,
        groupLabel: 'Aura',
      })),
      ...sheet.cursedProfile.controlAndReading.map((a) => ({
        ...a,
        groupLabel: 'Controle e Leitura',
      })),
      ...(sheet.cursedProfile.barrierAptitudes ?? []).map((a) => ({
        ...a,
        groupLabel: 'Barreira',
      })),
      ...sheet.cursedProfile.reverseEnergyAptitudes.map((a) => ({
        ...a,
        groupLabel: 'Energia Reversa',
      })),
    ].filter((a) => a.acquired);

    return (
      <div className="space-y-5">
        {renderSelectorBar(sheet)}

        {combatReadOnly && (
          <div className="rounded border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-200">
            {activePolicy.isOwner && sheet.permissions.lockedByGM
              ? 'Modo somente leitura: o Mestre travou alterações nesta ficha.'
              : 'Modo somente leitura: você está visualizando a Central de Combate compartilhada por outro jogador.'}
          </div>
        )}

        {/* 1. IDENTIFICAÇÃO */}
        {(() => {
          const controlGradeTheme = getGradeTheme(grade);
          return (
            <section
              className="relative overflow-hidden rounded-lg border border-[#212636] bg-[#11141e] p-3.5 sm:p-4"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-[1px]"
                style={{
                  background: `linear-gradient(90deg, ${controlGradeTheme.lineColor}, transparent 60%)`,
                }}
              />
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {sheet.identity.avatarUrl ? (
                    <img
                      src={sheet.identity.avatarUrl}
                      alt={sheet.identity.name || 'Avatar'}
                      className="h-12 w-12 rounded-lg border object-cover"
                      style={{ borderColor: controlGradeTheme.borderColor }}
                    />
                  ) : (
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-lg border bg-[#0b0d14] font-display-rpg text-sm font-bold"
                      style={{
                        borderColor: controlGradeTheme.borderColor,
                        color: controlGradeTheme.accentText,
                      }}
                    >
                      {(sheet.identity.name.trim() || 'P').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h2
                      className="font-display-rpg text-lg font-bold leading-tight"
                      style={{ color: controlGradeTheme.nameColor }}
                    >
                      {sheet.identity.name.trim() || 'Personagem sem nome'}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span>Jogador: {sheet.identity.player || sheet.permissions.ownerPlayerName || 'Não definido'}</span>
                      <span aria-hidden="true">·</span>
                      <GradeBadge grade={grade} size="xs" />
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular text-slate-200">Nível {level}</span>
                      {sheet.identity.specialization && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{sheet.identity.specialization}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

            <div className="grid w-full grid-cols-3 gap-2 border-t border-[#1d2230] pt-2.5 text-xs sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-4 sm:border-t-0 sm:pt-0">
              <div>
                <span className="text-slate-400">Defesa: </span>
                <span className="font-mono-tabular text-base font-bold text-slate-100">
                  {resolveCalculableValue(sheet.defense.total)}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Desloc.: </span>
                <span className="font-mono-tabular text-base font-bold text-slate-100">
                  {resolveCalculableValue(sheet.derived.movement.total)}m
                </span>
              </div>
              <div>
                <span className="text-slate-400">Iniciativa: </span>
                <span className="font-mono-tabular text-base font-bold text-slate-100">
                  {formatSigned(resolveCalculableValue(sheet.derived.initiative.total))}
                </span>
              </div>
            </div>
              </div>
            </section>
          );
        })()}

        {/* 2. STATUS (PV, PE, SANIDADE, INTEGRIDADE) */}
        <section className="rounded-lg border border-[#212636] bg-[#11141e] p-3.5 sm:p-5">
          <h3 className="mb-4 border-b border-[#1d2230] pb-2 text-sm font-semibold uppercase tracking-wide text-slate-200">
            Status e Recursos
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* PV */}
            <div className="rounded border border-[#1e2332] bg-[#0d1018] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-emerald-400">
                    Pontos de Vida (PV)
                  </div>
                  <div className="mt-0.5 font-mono-tabular text-lg font-bold text-slate-100">
                    {hpCurrent}{' '}
                    <span className="text-sm font-normal text-slate-400">
                      / {hpMax} ({hpPct}%)
                    </span>
                  </div>
                </div>
                {!combatReadOnly && (
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-1">
                    {([-5, -1, 1, 5] as const).map((delta) => (
                      <button
                        key={delta}
                        type="button"
                        onClick={() => updateControlled((prev) => adjustPoolResource(prev, 'hp', delta))}
                        className={`min-h-[38px] min-w-[38px] rounded border border-[#242a3b] bg-[#11141e] px-2.5 py-1.5 font-mono-tabular text-xs font-medium sm:min-h-0 sm:min-w-0 sm:px-2 sm:py-1 ${
                          delta < 0
                            ? 'text-red-300 hover:bg-red-500/15'
                            : 'text-emerald-300 hover:bg-emerald-500/15'
                        }`}
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded bg-[#07090e]">
                <div
                  className="h-full bg-emerald-600 transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, hpPct))}%` }}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  Definir PV Atual:
                  <NumericInput
                    min={0}
                    integer
                    disabled={combatReadOnly}
                    value={hpCurrent}
                    onChange={(nextVal) =>
                      updateControlled((prev) =>
                        setPoolResourceCurrent(prev, 'hp', nextVal)
                      )
                    }
                    className="w-16 rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-right font-mono-tabular text-xs text-slate-100 disabled:opacity-60"
                  />
                </label>
                <CalculableValueControl
                  label="PV Máx"
                  field={sheet.vitals.hp.max}
                  size="sm"
                  readOnly={combatReadOnly}
                  onChange={(max) =>
                    updateControlled((prev) => applyPoolMaxChange(prev, 'hp', max))
                  }
                />
              </div>
            </div>

            {/* PE */}
            <div className="rounded border border-[#1e2332] bg-[#0d1018] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-indigo-300">
                    Pontos de Energia (PE)
                  </div>
                  <div className="mt-0.5 font-mono-tabular text-lg font-bold text-slate-100">
                    {peCurrent}{' '}
                    <span className="text-sm font-normal text-slate-400">
                      / {peMax} ({pePct}%)
                    </span>
                  </div>
                </div>
                {!combatReadOnly && (
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-1">
                    {([-5, -1, 1, 5] as const).map((delta) => (
                      <button
                        key={delta}
                        type="button"
                        onClick={() => updateControlled((prev) => adjustPoolResource(prev, 'pe', delta))}
                        className={`min-h-[38px] min-w-[38px] rounded border border-[#242a3b] bg-[#11141e] px-2.5 py-1.5 font-mono-tabular text-xs font-medium sm:min-h-0 sm:min-w-0 sm:px-2 sm:py-1 ${
                          delta < 0
                            ? 'text-red-300 hover:bg-red-500/15'
                            : 'text-indigo-200 hover:bg-indigo-500/15'
                        }`}
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded bg-[#07090e]">
                <div
                  className="h-full bg-indigo-500 transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, pePct))}%` }}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  Definir PE Atual:
                  <NumericInput
                    min={0}
                    integer
                    disabled={combatReadOnly}
                    value={peCurrent}
                    onChange={(nextVal) =>
                      updateControlled((prev) =>
                        setPoolResourceCurrent(prev, 'pe', nextVal)
                      )
                    }
                    className="w-16 rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-right font-mono-tabular text-xs text-slate-100 disabled:opacity-60"
                  />
                </label>
                <CalculableValueControl
                  label="PE Máx"
                  field={sheet.vitals.pe.max}
                  size="sm"
                  readOnly={combatReadOnly}
                  onChange={(max) =>
                    updateControlled((prev) => applyPoolMaxChange(prev, 'pe', max))
                  }
                />
              </div>
            </div>

            {/* Sanidade */}
            <div className="rounded border border-[#1e2332] bg-[#0d1018] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-cyan-300">Sanidade</div>
                  <div className="mt-0.5 font-mono-tabular text-base font-bold text-slate-100">
                    {sanCurrent}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      / {sanMax} ({sanPct}%)
                    </span>
                  </div>
                </div>
                {!combatReadOnly && (
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-1">
                    {([-5, -1, 1, 5] as const).map((delta) => (
                      <button
                        key={delta}
                        type="button"
                        onClick={() =>
                          updateControlled((prev) => adjustMentalResource(prev, 'sanity', delta))
                        }
                        className="min-h-[38px] min-w-[38px] rounded border border-[#242a3b] bg-[#11141e] px-2.5 py-1.5 font-mono-tabular text-xs text-slate-200 hover:bg-[#1a2030] sm:min-h-0 sm:min-w-0 sm:px-2 sm:py-1"
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                <label className="flex items-center gap-1.5">
                  Atual:
                  <NumericInput
                    min={0}
                    integer
                    disabled={combatReadOnly}
                    value={sanCurrent}
                    onChange={(nextVal) =>
                      updateControlled((prev) =>
                        setMentalResourceCurrent(prev, 'sanity', nextVal)
                      )
                    }
                    className="w-14 rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-0.5 text-right font-mono-tabular text-xs text-slate-100 disabled:opacity-60"
                  />
                </label>
                <label className="flex items-center gap-1.5">
                  Máximo:
                  <NumericInput
                    min={0}
                    integer
                    disabled={combatReadOnly}
                    value={sanMax}
                    onChange={(val) => {
                      const nextMax = Math.max(0, val);
                      updateControlled((prev) => ({
                        ...prev,
                        vitals: {
                          ...prev.vitals,
                          sanity: {
                            ...prev.vitals.sanity,
                            max: prev.vitals.sanity.max.usarManual
                              ? { ...prev.vitals.sanity.max, sobrescritaManual: nextMax }
                              : { ...prev.vitals.sanity.max, valorCalculado: nextMax },
                          },
                        },
                      }));
                    }}
                    className="w-14 rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-0.5 text-right font-mono-tabular text-xs text-slate-100 disabled:opacity-60"
                  />
                </label>
              </div>
            </div>

            {/* Integridade */}
            <div className="rounded border border-[#1e2332] bg-[#0d1018] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-amber-300">Integridade</div>
                  <div className="mt-0.5 font-mono-tabular text-base font-bold text-slate-100">
                    {intCurrent}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      / {intMax} ({intPct}%)
                    </span>
                  </div>
                </div>
                {!combatReadOnly && (
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-1">
                    {([-5, -1, 1, 5] as const).map((delta) => (
                      <button
                        key={delta}
                        type="button"
                        onClick={() =>
                          updateControlled((prev) => adjustMentalResource(prev, 'integrity', delta))
                        }
                        className="min-h-[38px] min-w-[38px] rounded border border-[#242a3b] bg-[#11141e] px-2.5 py-1.5 font-mono-tabular text-xs text-slate-200 hover:bg-[#1a2030] sm:min-h-0 sm:min-w-0 sm:px-2 sm:py-1"
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                <label className="flex items-center gap-1.5">
                  Atual:
                  <NumericInput
                    min={0}
                    integer
                    disabled={combatReadOnly}
                    value={intCurrent}
                    onChange={(nextVal) =>
                      updateControlled((prev) =>
                        setMentalResourceCurrent(prev, 'integrity', nextVal)
                      )
                    }
                    className="w-14 rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-0.5 text-right font-mono-tabular text-xs text-slate-100 disabled:opacity-60"
                  />
                </label>
                <label className="flex items-center gap-1.5">
                  Estado:
                  <input
                    type="text"
                    disabled={combatReadOnly}
                    value={sheet.vitals.integrity.currentState}
                    onChange={(e) =>
                      updateControlled((prev) => ({
                        ...prev,
                        vitals: {
                          ...prev.vitals,
                          integrity: {
                            ...prev.vitals.integrity,
                            currentState: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-24 rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-0.5 text-xs text-slate-100 disabled:opacity-60"
                  />
                </label>
                <label className="flex items-center gap-1.5">
                  RD:
                  <NumericInput
                    min={0}
                    integer
                    disabled={combatReadOnly}
                    value={sheet.vitals.integrity.rd}
                    onChange={(rd) =>
                      updateControlled((prev) => ({
                        ...prev,
                        vitals: {
                          ...prev.vitals,
                          integrity: {
                            ...prev.vitals.integrity,
                            rd,
                          },
                        },
                      }))
                    }
                    className="w-12 rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-0.5 text-right font-mono-tabular text-xs text-slate-100 disabled:opacity-60"
                  />
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* 3. ATRIBUTOS & TREINAMENTOS */}
        <section className="rounded-lg border border-[#212636] bg-[#11141e] p-3.5 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-[#1d2230] pb-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">
              Atributos & Treinamentos
            </h3>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
              <span>
                Bônus de Treinamento:{' '}
                <strong className="font-mono-tabular text-indigo-300">
                  {formatSigned(trainingBonus)}
                </strong>
              </span>
              {sheet.identity.specialization && (
                <span>
                  Especialização: <strong>{sheet.identity.specialization}</strong> (Nvl{' '}
                  {sheet.identity.specializationLevel})
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-6">
            {ATTRIBUTE_KEYS.map((key) => {
              const attr = sheet.attributes[key];
              const totalVal = resolveCalculableValue(attr.value);
              const mod = resolveCalculableValue(attr.modifier);
              return (
                <div
                  key={key}
                  className="rounded border border-[#1e2332] bg-[#0d1018] px-3 py-2 text-center"
                >
                  <div className="text-[11px] font-medium text-slate-400">{key}</div>
                  <div className="mt-0.5 font-mono-tabular text-base font-bold text-slate-100">
                    {formatSigned(mod)}
                  </div>
                  <div className="font-mono-tabular text-[11px] text-slate-500">
                    Valor {totalVal}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Perícias compactas */}
          <div className="mt-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-300">
                Perícias ({filteredSkills.length})
              </span>
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                <div className="relative min-w-0 flex-1 sm:flex-initial">
                  <Search className="pointer-events-none absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Buscar perícia..."
                    value={skillFilterQuery}
                    onChange={(e) => setSkillFilterQuery(e.target.value)}
                    className="w-full rounded border border-[#242a3b] bg-[#0b0d14] py-1 pr-2 pl-6 text-xs text-slate-100 sm:w-auto"
                  />
                </div>
                <label className="inline-flex items-center gap-1.5 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={onlyTrainedSkills}
                    onChange={(e) => setOnlyTrainedSkills(e.target.checked)}
                    className="h-3.5 w-3.5 accent-indigo-500"
                  />
                  Apenas Treinadas/Mestres
                </label>
              </div>
            </div>
            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
              {filteredSkills.map((sk) => {
                const total = resolveCalculableValue(sk.total);
                return (
                  <div
                    key={sk.id}
                    className="flex items-center justify-between rounded border border-[#1c2130] bg-[#0d1018] px-2.5 py-1.5 text-xs"
                  >
                    <div className="min-w-0 truncate">
                      <span className="font-medium text-slate-200">{sk.name}</span>
                      <span className="ml-1 text-[10px] text-slate-500">
                        ({sk.attribute}
                        {sk.mastered ? '·M' : sk.trained ? '·T' : ''})
                      </span>
                    </div>
                    <span className="ml-2 font-mono-tabular font-semibold text-indigo-300">
                      {formatSigned(total)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {(sheet.inlineTrainings.length > 0 || sheet.trainings.trainings.length > 0) && (
            <div className="mt-3 border-t border-[#1d2230] pt-2.5 text-xs text-slate-300">
              <span className="font-medium text-slate-400">Treinamentos registrados: </span>
              {[
                ...sheet.inlineTrainings,
                ...sheet.trainings.trainings.map(
                  (t) => `${t.title} (${t.currentStage}/${t.totalStages})`
                ),
              ].join(' · ')}
            </div>
          )}
        </section>

        {/* 4. COMBATE (ATAQUES, SALVAGUARDAS, DEFESA COM FONTES, CDS) */}
        <section className="rounded-lg border border-[#212636] bg-[#11141e] p-3.5 sm:p-5">
          <div className="mb-4 flex items-center gap-2 border-b border-[#1d2230] pb-2">
            <Swords className="h-4 w-4 text-indigo-300" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">
              Combate
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Ataques + Registro Rápido */}
            <div className="space-y-3 rounded border border-[#1e2332] bg-[#0d1018] p-3.5">
              <h4 className="text-xs font-semibold text-slate-200">Ataques</h4>
              <div className="space-y-1.5">
                {sheet.attacks.map((atk) => (
                  <div
                    key={atk.id}
                    className="flex items-center justify-between border-b border-[#191e2b] pb-1 text-xs"
                  >
                    <div>
                      <span className="font-medium text-slate-200">{atk.name}</span>
                      <span className="ml-1.5 text-[11px] text-slate-500">
                        ({atk.attribute}
                        {atk.trained ? ' · Trein.' : ''})
                      </span>
                    </div>
                    <span className="font-mono-tabular font-semibold text-slate-100">
                      {formatSigned(resolveCalculableValue(atk.total))}
                    </span>
                  </div>
                ))}
              </div>
              {sheet.quickWeapons.length > 0 && (
                <div className="pt-1">
                  <div className="mb-1 text-[11px] font-medium text-slate-400">
                    Armas Equipadas / Registro Rápido
                  </div>
                  <div className="space-y-1.5">
                    {sheet.quickWeapons.map((w) => (
                      <div
                        key={w.id}
                        className="rounded border border-[#1c2130] bg-[#0b0d14] px-2.5 py-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between font-medium text-slate-100">
                          <span>{w.name}</span>
                          <span className="font-mono-tabular text-indigo-300">
                            {formatSigned(resolveCalculableValue(w.hit))}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-400">
                          {w.damage} · Crít {w.critical} · {w.damageType} · {w.range}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Salvaguardas + CDs */}
            <div className="space-y-3 rounded border border-[#1e2332] bg-[#0d1018] p-3.5">
              <h4 className="text-xs font-semibold text-slate-200">Salvaguardas</h4>
              <div className="space-y-1.5">
                {sheet.savingThrows.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between border-b border-[#191e2b] pb-1 text-xs"
                  >
                    <div>
                      <span className="font-medium text-slate-200">{st.name}</span>
                      <span className="ml-1.5 text-[11px] text-slate-500">
                        ({st.attribute}
                        {st.mastered ? '·M' : st.trained ? '·T' : ''}
                        {st.other ? ` ${formatSigned(st.other)}` : ''})
                      </span>
                    </div>
                    <span className="font-mono-tabular font-semibold text-slate-100">
                      {formatSigned(resolveCalculableValue(st.total))}
                    </span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-[#191e2b] pt-2 text-xs">
                <div className="rounded border border-[#1c2130] bg-[#0b0d14] p-2">
                  <div className="text-[11px] text-slate-400">CD Especialização</div>
                  <div className="font-mono-tabular text-base font-bold text-slate-100">
                    {resolveCalculableValue(sheet.derived.cdSpecialization.total)}
                  </div>
                </div>
                <div className="rounded border border-[#1c2130] bg-[#0b0d14] p-2">
                  <div className="text-[11px] text-slate-400">CD Amaldiçoado</div>
                  <div className="font-mono-tabular text-base font-bold text-slate-100">
                    {resolveCalculableValue(sheet.derived.cdCursed.total)}
                  </div>
                </div>
              </div>
            </div>

            {/* Defesa e Fontes */}
            <div className="space-y-2.5 rounded border border-[#1e2332] bg-[#0d1018] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#191e2b] pb-2 sm:flex-nowrap">
                <h4 className="text-xs font-semibold text-slate-200">
                  Defesa e Fontes
                </h4>
                <CalculableValueControl
                  field={sheet.defense.total}
                  size="md"
                  readOnly={combatReadOnly}
                  onChange={(total) =>
                    updateControlled((prev) => ({
                      ...prev,
                      defense: { ...prev.defense, total },
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Defesa Base (10 + Nível/2)</span>
                <span className="font-mono-tabular font-semibold">
                  {resolveCalculableValue(sheet.defense.base)}
                </span>
              </div>
              <div className="space-y-1.5">
                {sheet.defense.components.map((comp) => {
                  const attrBonus = resolveCalculableValue(comp.attributeBonus);
                  return (
                    <div
                      key={comp.id}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="text-slate-300">
                        {comp.label}
                        {comp.attribute !== 'N/A' && (
                          <span className="ml-1 text-[11px] text-slate-500">
                            ({comp.attribute} {formatSigned(attrBonus)})
                          </span>
                        )}
                      </span>
                      <NumericInput
                        integer
                        aria-label={`Defesa ${comp.label}`}
                        disabled={combatReadOnly}
                        value={comp.bonus}
                        onChange={(nextVal) => {
                          updateControlled((prev) => ({
                            ...prev,
                            defense: {
                              ...prev.defense,
                              components: prev.defense.components.map((c) =>
                                c.id === comp.id ? { ...c, bonus: nextVal } : c
                              ),
                            },
                          }));
                        }}
                        className="w-14 rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-0.5 text-right font-mono-tabular text-xs text-slate-100 disabled:opacity-60"
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 border-t border-[#191e2b] pt-2 text-xs text-slate-300">
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    disabled={combatReadOnly}
                    checked={sheet.defense.defensive}
                    onChange={(e) =>
                      updateControlled((prev) => ({
                        ...prev,
                        defense: { ...prev.defense, defensive: e.target.checked },
                      }))
                    }
                    className="h-3.5 w-3.5 accent-indigo-500"
                  />
                  Defensivo
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    disabled={combatReadOnly}
                    checked={sheet.defense.massive}
                    onChange={(e) =>
                      updateControlled((prev) => ({
                        ...prev,
                        defense: { ...prev.defense, massive: e.target.checked },
                      }))
                    }
                    className="h-3.5 w-3.5 accent-indigo-500"
                  />
                  Maciça
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* 5. TÉCNICAS, ESPECIALIZAÇÃO, APTIDÕES E SHIKIGAMIS */}
        <section className="space-y-5 rounded-lg border border-[#212636] bg-[#11141e] p-3.5 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1d2230] pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-300" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">
                Técnicas, Especialização, Aptidões e Shikigamis
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
              <span>
                Técnica:{' '}
                <strong>{sheet.cursedProfile.techniqueName || 'Não definida'}</strong>
              </span>
              <span>
                CD Técnica:{' '}
                <strong className="font-mono-tabular text-indigo-300">
                  {resolveCalculableValue(sheet.cursedProfile.techniqueCD)}
                </strong>
              </span>
              <span>
                Atributo: <strong>{sheet.cursedProfile.techniqueAttribute}</strong>
              </span>
              <span>
                Maestria:{' '}
                <strong className="font-mono-tabular">
                  {resolveCalculableValue(sheet.cursedProfile.masteryLevel)}
                </strong>
              </span>
            </div>
          </div>

          {sheet.cursedProfile.techniqueDescription && (
            <p className="rounded border border-[#1e2332] bg-[#0d1018] p-3 text-xs text-slate-300">
              {sheet.cursedProfile.techniqueDescription}
            </p>
          )}

          {/* Habilidades da Técnica */}
          <div>
            <h4 className="mb-2 text-xs font-semibold text-slate-300">
              Habilidades da Técnica ({sheet.cursedProfile.techniqueAbilities.length})
            </h4>
            {sheet.cursedProfile.techniqueAbilities.length === 0 ? (
              <p className="text-xs text-slate-500">
                Nenhuma habilidade de técnica cadastrada nesta ficha.
              </p>
            ) : (
              <div className="space-y-2">
                {sheet.cursedProfile.techniqueAbilities.map((ab) => {
                  const expanded = expandedAbilityIds[ab.id] ?? false;
                  return (
                    <div
                      key={ab.id}
                      className="rounded border border-[#1e2332] bg-[#0d1018] p-3 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-100">{ab.name}</span>
                          <span className="font-mono-tabular text-[11px] text-indigo-300">
                            Nvl {ab.level} · {resolveCalculableValue(ab.peCost)} PE
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {ab.actionType} · {ab.range} · {ab.duration}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedAbilityIds((prev) => ({
                              ...prev,
                              [ab.id]: !prev[ab.id],
                            }))
                          }
                          className="inline-flex items-center gap-1 rounded border border-[#242a3b] bg-[#11141e] px-2 py-0.5 text-[11px] text-slate-200 hover:bg-[#171b28]"
                        >
                          {expanded ? (
                            <>
                              Recolher <ChevronUp className="h-3 w-3" />
                            </>
                          ) : (
                            <>
                              Expandir <ChevronDown className="h-3 w-3" />
                            </>
                          )}
                        </button>
                      </div>
                      {ab.damageOrEffect && (
                        <div className="mt-1 text-[11px] text-emerald-300">
                          Efeito/Dano: {ab.damageOrEffect}
                        </div>
                      )}
                      {expanded && (
                        <div className="mt-2 border-t border-[#1c2130] pt-2 whitespace-pre-wrap text-xs text-slate-300">
                          {ab.description || 'Sem descrição detalhada.'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Habilidades de Especialização e Aptidões Adquiridas */}
          {(sheet.specializationAbilities.length > 0 ||
            acquiredAptitudes.length > 0) && (
            <div className="grid grid-cols-1 gap-4 border-t border-[#1d2230] pt-4 lg:grid-cols-2">
              {sheet.specializationAbilities.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-300">
                    Habilidades de Especialização ({sheet.specializationAbilities.length})
                  </h4>
                  <div className="space-y-1.5">
                    {sheet.specializationAbilities.map((sp) => (
                      <div
                        key={sp.id}
                        className="rounded border border-[#1e2332] bg-[#0d1018] p-2.5 text-xs"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-100">
                            {sp.name || 'Sem nome'}
                          </span>
                          <span className="text-[11px] text-indigo-300">
                            {sp.slotLabel} · {sp.category === 'fixed' ? 'Fixa' : 'Escolhida'}
                          </span>
                        </div>
                        {sp.description && (
                          <p className="mt-1 text-[11px] text-slate-300">
                            {sp.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {acquiredAptitudes.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-300">
                    Aptidões Adquiridas ({acquiredAptitudes.length})
                  </h4>
                  <div className="space-y-1.5">
                    {acquiredAptitudes.map((apt) => (
                      <div
                        key={apt.id}
                        className="rounded border border-[#1e2332] bg-[#0d1018] p-2.5 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-slate-100">{apt.name}</span>
                          <span className="font-mono-tabular text-[11px] text-indigo-300">
                            {apt.groupLabel} · Nvl {apt.level} ·{' '}
                            {resolveCalculableValue(apt.peCost)} PE
                          </span>
                        </div>
                        {apt.description && (
                          <p className="mt-1 text-[11px] text-slate-300">
                            {apt.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Expansão de Domínio e Liberação (Seções Separadas) */}
          {(sheet.cursedProfile.domainExpansion.unlocked ||
            sheet.cursedProfile.domainExpansion.name ||
            activeReleaseSlots.length > 0) && (
            <div className="grid grid-cols-1 gap-4 border-t border-[#1d2230] pt-4 lg:grid-cols-2">
              {(sheet.cursedProfile.domainExpansion.unlocked ||
                sheet.cursedProfile.domainExpansion.name) && (
                <div className="rounded border border-[#1e2332] bg-[#0d1018] p-3 text-xs">
                  <div className="font-semibold text-indigo-300">
                    Expansão de Domínio:{' '}
                    {sheet.cursedProfile.domainExpansion.name || 'Sem nome'}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    Custo:{' '}
                    {resolveCalculableValue(
                      sheet.cursedProfile.domainExpansion.peCost
                    )}{' '}
                    PE
                    {sheet.cursedProfile.domainExpansion.type
                      ? ` · ${sheet.cursedProfile.domainExpansion.type}`
                      : ''}
                    {sheet.cursedProfile.domainExpansion.refinement > 0
                      ? ` · Refinamento ${sheet.cursedProfile.domainExpansion.refinement}`
                      : ''}
                  </div>
                  {sheet.cursedProfile.domainExpansion.sureHitEffect && (
                    <div className="mt-1 text-slate-300">
                      Acerto Garantido:{' '}
                      {sheet.cursedProfile.domainExpansion.sureHitEffect}
                    </div>
                  )}
                  {sheet.cursedProfile.domainExpansion.environmentEffect && (
                    <div className="mt-1 text-slate-300">
                      Ambiente: {sheet.cursedProfile.domainExpansion.environmentEffect}
                    </div>
                  )}
                </div>
              )}

              {activeReleaseSlots.length > 0 && (
                <div className="space-y-2 rounded border border-[#1e2332] bg-[#0d1018] p-3 text-xs">
                  <div className="font-semibold text-amber-300">
                    Liberação ({activeReleaseSlots.length}/4 slots ativos)
                  </div>
                  <div className="space-y-2">
                    {activeReleaseSlots.map((slot) => (
                      <div
                        key={slot.slotNumber}
                        className="rounded border border-[#1c2130] bg-[#11141e] p-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-slate-100">
                            Slot {slot.slotNumber}: {slot.name || 'Sem nome'}
                          </span>
                          <span className="font-mono-tabular text-[11px] text-amber-200">
                            {resolveCalculableValue(slot.peCost)} PE
                          </span>
                        </div>
                        {(slot.actionType || slot.range || slot.duration) && (
                          <div className="mt-0.5 text-[11px] text-slate-400">
                            {[slot.actionType, slot.range, slot.duration]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        )}
                        {slot.damageOrEffect && (
                          <div className="mt-0.5 text-[11px] text-emerald-300">
                            {slot.damageOrEffect}
                          </div>
                        )}
                        {slot.description && (
                          <p className="mt-0.5 text-[11px] text-slate-300">
                            {slot.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Shikigamis (Unificado, SEM PE, com RD Natural, Ações e Características) */}
          <div className="border-t border-[#1d2230] pt-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-200">
              Shikigamis ({sheet.summons.length})
            </h4>
            {sheet.summons.length === 0 ? (
              <p className="text-xs text-slate-500">
                Este personagem não possui shikigamis registrados.
              </p>
            ) : (
              <div className="space-y-2.5">
                {sheet.summons.map((sum) => {
                  const expanded = expandedSummonIds[sum.id] ?? false;
                  const sHpCur = resolveCalculableValue(sum.hp.current);
                  const sHpMax = resolveCalculableValue(sum.hp.max);
                  const sRd = resolveCalculableValue(
                    sum.damageReduction ?? createCalculableField(0)
                  );
                  const sConds = sum.conditions ?? [];
                  const sActions = sum.actions ?? [];
                  const sChars = sum.characteristics ?? [];

                  return (
                    <div
                      key={sum.id}
                      className="rounded border border-[#1e2332] bg-[#0d1018] p-3 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          {sum.imageUrl && (
                            <img
                              src={sum.imageUrl}
                              alt={sum.name}
                              className="h-9 w-9 rounded border border-[#242a3b] object-cover"
                            />
                          )}
                          <div>
                            <span className="font-semibold text-slate-100">
                              {sum.name}
                            </span>
                            <span className="ml-2 text-[11px] text-slate-400">
                              {[sum.summonType || 'Shikigami', sum.grade]
                                .filter(Boolean)
                                .join(' · ')}
                            </span>
                            <div className="mt-0.5 flex flex-wrap items-center gap-3 font-mono-tabular text-[11px]">
                              <span className="text-emerald-400">
                                PV {sHpCur}/{sHpMax}
                              </span>
                              <span className="font-semibold text-amber-300">
                                RD {sRd}
                              </span>
                              <span className="text-slate-300">
                                Defesa {resolveCalculableValue(sum.defense)}
                              </span>
                              <span className="text-slate-300">
                                Desloc. {resolveCalculableValue(sum.movement)}m
                              </span>
                              {sConds.length > 0 && (
                                <span className="text-red-300">{sConds.join(', ')}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {!combatReadOnly &&
                            ([-5, -1, 1, 5] as const).map((delta) => (
                              <button
                                key={delta}
                                type="button"
                                onClick={() =>
                                  updateControlled((prev) => ({
                                    ...prev,
                                    summons: prev.summons.map((item) => {
                                      if (item.id !== sum.id) return item;
                                      const maxHp = resolveCalculableValue(item.hp.max);
                                      const nextLost = Math.min(
                                        maxHp + item.hp.temp,
                                        Math.max(0, item.hp.lost - delta)
                                      );
                                      return {
                                        ...item,
                                        hp: { ...item.hp, lost: nextLost },
                                      };
                                    }),
                                  }))
                                }
                                className={`min-h-[36px] min-w-[36px] rounded border border-[#242a3b] bg-[#11141e] px-2 py-1 font-mono-tabular text-[11px] sm:min-h-0 sm:min-w-0 sm:px-1.5 sm:py-0.5 ${
                                  delta < 0 ? 'text-red-300' : 'text-emerald-300'
                                }`}
                              >
                                {delta > 0 ? `+${delta}` : delta}
                              </button>
                            ))}
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedSummonIds((prev) => ({
                                ...prev,
                                [sum.id]: !prev[sum.id],
                              }))
                            }
                            className="inline-flex min-h-[36px] items-center gap-1 rounded border border-[#242a3b] bg-[#11141e] px-2.5 py-1 text-[11px] text-slate-200 sm:min-h-0 sm:px-2 sm:py-0.5"
                          >
                            {expanded ? 'Recolher' : 'Perfil'}
                          </button>
                        </div>
                      </div>

                      {expanded && (
                        <div className="mt-3 space-y-3 border-t border-[#1c2130] pt-2.5">
                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                            {ATTRIBUTE_KEYS.map((k) => (
                              <div
                                key={k}
                                className="rounded border border-[#1c2130] bg-[#0b0d14] p-1.5 text-center"
                              >
                                <div className="text-[10px] text-slate-400">{k}</div>
                                <div className="font-mono-tabular text-xs font-semibold text-slate-100">
                                  {sum.attributes[k].value} (
                                  {formatSigned(
                                    resolveCalculableValue(sum.attributes[k].modifier)
                                  )}
                                  )
                                </div>
                              </div>
                            ))}
                          </div>

                          {sActions.length > 0 && (
                            <div>
                              <div className="mb-1 text-[11px] font-medium text-slate-400">
                                Ações ({sActions.length})
                              </div>
                              <div className="space-y-1.5">
                                {sActions.map((act) => (
                                  <div
                                    key={act.id}
                                    className="rounded border border-[#1c2130] bg-[#0b0d14] px-2.5 py-1.5 text-[11px]"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-slate-100">
                                          {act.name}
                                        </span>
                                        <span
                                          className={`rounded border px-1.5 py-0.5 text-[10px] ${
                                            act.complexity === 'simples'
                                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                                              : 'border-indigo-500/40 bg-indigo-500/10 text-indigo-200'
                                          }`}
                                        >
                                          {act.complexity === 'simples'
                                            ? 'Ação Simples'
                                            : 'Ação Complexa'}
                                        </span>
                                      </div>
                                      <span className="font-mono-tabular text-slate-300">
                                        {[
                                          act.actionType,
                                          act.hitBonus && `Acerto ${act.hitBonus}`,
                                          act.damage && `Dano ${act.damage}`,
                                          act.critical && `Crit ${act.critical}`,
                                          act.damageType,
                                          act.range,
                                        ]
                                          .filter(Boolean)
                                          .join(' · ')}
                                      </span>
                                    </div>
                                    {act.effects && (
                                      <div className="mt-0.5 text-emerald-300">
                                        Efeitos: {act.effects}
                                      </div>
                                    )}
                                    {act.description && (
                                      <p className="mt-0.5 text-slate-400">
                                        {act.description}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {sChars.length > 0 && (
                            <div>
                              <div className="mb-1 text-[11px] font-medium text-slate-400">
                                Características ({sChars.length})
                              </div>
                              <div className="space-y-1">
                                {sChars.map((chr) => (
                                  <div
                                    key={chr.id}
                                    className="rounded border border-[#1c2130] bg-[#0b0d14] px-2.5 py-1.5 text-[11px]"
                                  >
                                    <span className="font-semibold text-slate-200">
                                      {chr.name}
                                    </span>{' '}
                                    <span className="text-amber-300">
                                      ({SHIKIGAMI_CHAR_LABELS[chr.kind]})
                                    </span>
                                    {chr.description && (
                                      <p className="mt-0.5 text-slate-400">
                                        {chr.description}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {(sum.resistances.length > 0 || sum.immunities.length > 0) && (
                            <div className="flex flex-wrap gap-3 text-[11px] text-slate-300">
                              {sum.resistances.length > 0 && (
                                <span>
                                  <strong className="text-slate-400">Resistências:</strong>{' '}
                                  {sum.resistances.join(', ')}
                                </span>
                              )}
                              {sum.immunities.length > 0 && (
                                <span>
                                  <strong className="text-slate-400">Imunidades:</strong>{' '}
                                  {sum.immunities.join(', ')}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] text-slate-400">Condições:</span>
                            {sConds.map((c) => (
                              <button
                                key={c}
                                type="button"
                                disabled={combatReadOnly}
                                onClick={() =>
                                  updateControlled((prev) => ({
                                    ...prev,
                                    summons: prev.summons.map((item) =>
                                      item.id === sum.id
                                        ? {
                                            ...item,
                                            conditions: (item.conditions ?? []).filter(
                                              (k) => k !== c
                                            ),
                                          }
                                        : item
                                    ),
                                  }))
                                }
                                className="rounded border border-red-500/40 bg-red-500/15 px-1.5 py-0.5 text-[11px] text-red-200 disabled:opacity-75"
                              >
                                {c}
                                {combatReadOnly ? '' : ' ×'}
                              </button>
                            ))}
                            {!combatReadOnly && (
                              <select
                                defaultValue=""
                                aria-label="Adicionar condição no shikigami"
                                onChange={(e) => {
                                  const cond = e.target.value as SimpleConditionKey;
                                  if (cond && !sConds.includes(cond)) {
                                    updateControlled((prev) => ({
                                      ...prev,
                                      summons: prev.summons.map((item) =>
                                        item.id === sum.id
                                          ? {
                                              ...item,
                                              conditions: [
                                                ...(item.conditions ?? []),
                                                cond,
                                              ],
                                            }
                                          : item
                                      ),
                                    }));
                                  }
                                  e.target.value = '';
                                }}
                                className="rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-0.5 text-[11px] text-slate-300"
                              >
                                <option value="">+ Condição...</option>
                                {SIMPLE_CONDITION_LIST.map((cond) => (
                                  <option key={cond} value={cond}>
                                    {cond}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* 6. RESISTÊNCIAS, REDUÇÕES DE DANO (RD) E IMUNIDADES — 3 SEÇÕES SEPARADAS */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Resistências */}
          <section className="rounded-lg border border-[#212636] bg-[#11141e] p-3.5 sm:p-5">
            <h3 className="mb-3 border-b border-[#1d2230] pb-2 text-sm font-semibold uppercase tracking-wide text-slate-200">
              Resistências
            </h3>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {RESISTANCE_TYPES_ORDER.map((type) => {
                const active = sheet.damageMitigation.resistances.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    disabled={combatReadOnly}
                    onClick={() =>
                      updateControlled((prev) => ({
                        ...prev,
                        damageMitigation: {
                          ...prev.damageMitigation,
                          resistances: active
                            ? prev.damageMitigation.resistances.filter((r) => r !== type)
                            : [...prev.damageMitigation.resistances, type],
                        },
                      }))
                    }
                    className={`rounded border px-2 py-1 text-[11px] transition-colors ${
                      active
                        ? 'border-sky-500/50 bg-sky-500/15 font-medium text-sky-200'
                        : 'border-[#1e2332] bg-[#0d1018] text-slate-400'
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
            {sheet.damageMitigation.resistances.filter(
              (r) => !RESISTANCE_TYPES_ORDER.includes(r as DamageTypeKey)
            ).length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-[#181c28] pt-2">
                {sheet.damageMitigation.resistances
                  .filter((r) => !RESISTANCE_TYPES_ORDER.includes(r as DamageTypeKey))
                  .map((custom) => (
                    <button
                      key={custom}
                      type="button"
                      disabled={combatReadOnly}
                      onClick={() =>
                        updateControlled((prev) => ({
                          ...prev,
                          damageMitigation: {
                            ...prev.damageMitigation,
                            resistances: prev.damageMitigation.resistances.filter(
                              (r) => r !== custom
                            ),
                          },
                        }))
                      }
                      className="rounded border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-[11px] text-sky-200"
                    >
                      {custom}
                      {combatReadOnly ? '' : ' ×'}
                    </button>
                  ))}
              </div>
            )}
            {!combatReadOnly && (
              <div className="mt-3 flex gap-1.5 border-t border-[#181c28] pt-2 text-xs">
                <input
                  type="text"
                  placeholder="Outra resistência..."
                  value={combatResistanceDraft}
                  onChange={(e) => setCombatResistanceDraft(e.target.value)}
                  className="min-w-0 flex-1 rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-[11px] text-slate-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    const val = combatResistanceDraft.trim();
                    if (!val || sheet.damageMitigation.resistances.includes(val)) return;
                    updateControlled((prev) => ({
                      ...prev,
                      damageMitigation: {
                        ...prev.damageMitigation,
                        resistances: [...prev.damageMitigation.resistances, val],
                      },
                    }));
                    setCombatResistanceDraft('');
                  }}
                  className="min-h-[38px] min-w-[38px] rounded border border-[#2a3145] bg-[#171b28] px-2 py-1 text-[11px] text-slate-200 sm:min-h-0 sm:min-w-0"
                >
                  +
                </button>
              </div>
            )}
          </section>

          {/* Reduções de Dano (RD) */}
          <section className="rounded-lg border border-[#212636] bg-[#11141e] p-3.5 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#1d2230] pb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">
                Reduções de Dano (RD)
              </h3>
              <label className="flex items-center gap-1.5 text-xs text-slate-300">
                RD Geral
                <NumericInput
                  min={0}
                  integer
                  disabled={combatReadOnly}
                  value={sheet.damageMitigation.generalRD}
                  onChange={(generalRD) =>
                    updateControlled((prev) => ({
                      ...prev,
                      damageMitigation: {
                        ...prev.damageMitigation,
                        generalRD,
                      },
                    }))
                  }
                  className="w-14 rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-right font-mono-tabular text-xs text-slate-100 disabled:opacity-60"
                />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
              {RESISTANCE_TYPES_ORDER.map((type) => {
                const entry = sheet.damageMitigation.byType[type];
                if (!entry) return null;
                return (
                  <div
                    key={type}
                    className="flex items-center justify-between gap-2 border-b border-[#181c28] py-1"
                  >
                    <span className="truncate text-slate-300">{type}</span>
                    <div className="flex items-center gap-1.5">
                      <NumericInput
                        min={0}
                        integer
                        aria-label={`RD específica de ${type}`}
                        disabled={combatReadOnly}
                        value={entry.amount}
                        onChange={(amount) =>
                          updateControlled((prev) => ({
                            ...prev,
                            damageMitigation: {
                              ...prev.damageMitigation,
                              byType: {
                                ...prev.damageMitigation.byType,
                                [type]: {
                                  ...prev.damageMitigation.byType[type],
                                  amount,
                                },
                              },
                            },
                          }))
                        }
                        className="w-11 rounded border border-[#242a3b] bg-[#0b0d14] px-1 py-0.5 text-right font-mono-tabular text-[11px] text-slate-300 disabled:opacity-60"
                      />
                      <span className="min-w-6 text-right font-mono-tabular font-semibold text-slate-100">
                        {resolveCalculableValue(entry.total)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Imunidades */}
          <section className="rounded-lg border border-[#212636] bg-[#11141e] p-3.5 sm:p-5">
            <h3 className="mb-3 border-b border-[#1d2230] pb-2 text-sm font-semibold uppercase tracking-wide text-slate-200">
              Imunidades
            </h3>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {RESISTANCE_TYPES_ORDER.map((type) => {
                const active = sheet.damageMitigation.immunities.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    disabled={combatReadOnly}
                    onClick={() =>
                      updateControlled((prev) => ({
                        ...prev,
                        damageMitigation: {
                          ...prev.damageMitigation,
                          immunities: active
                            ? prev.damageMitigation.immunities.filter((i) => i !== type)
                            : [...prev.damageMitigation.immunities, type],
                        },
                      }))
                    }
                    className={`rounded border px-2 py-1 text-[11px] transition-colors ${
                      active
                        ? 'border-emerald-500/50 bg-emerald-500/15 font-medium text-emerald-200'
                        : 'border-[#1e2332] bg-[#0d1018] text-slate-400'
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
            {sheet.damageMitigation.immunities.filter(
              (imm) => !RESISTANCE_TYPES_ORDER.includes(imm as DamageTypeKey)
            ).length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-[#181c28] pt-2">
                {sheet.damageMitigation.immunities
                  .filter((imm) => !RESISTANCE_TYPES_ORDER.includes(imm as DamageTypeKey))
                  .map((custom) => (
                    <button
                      key={custom}
                      type="button"
                      disabled={combatReadOnly}
                      onClick={() =>
                        updateControlled((prev) => ({
                          ...prev,
                          damageMitigation: {
                            ...prev.damageMitigation,
                            immunities: prev.damageMitigation.immunities.filter(
                              (i) => i !== custom
                            ),
                          },
                        }))
                      }
                      className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-200"
                    >
                      {custom}
                      {combatReadOnly ? '' : ' ×'}
                    </button>
                  ))}
              </div>
            )}
            {!combatReadOnly && (
              <div className="mt-3 space-y-2 border-t border-[#181c28] pt-2 text-xs">
                <select
                  defaultValue=""
                  aria-label="Adicionar imunidade a condição"
                  onChange={(e) => {
                    const cond = e.target.value;
                    if (cond && !sheet.damageMitigation.immunities.includes(cond)) {
                      updateControlled((prev) => ({
                        ...prev,
                        damageMitigation: {
                          ...prev.damageMitigation,
                          immunities: [...prev.damageMitigation.immunities, cond],
                        },
                      }));
                    }
                    e.target.value = '';
                  }}
                  className="w-full rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-[11px] text-slate-300"
                >
                  <option value="">+ Imunidade a condição...</option>
                  {SIMPLE_CONDITION_LIST.map((cond) => (
                    <option key={cond} value={cond}>
                      {cond}
                    </option>
                  ))}
                </select>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Outra imunidade..."
                    value={combatImmunityDraft}
                    onChange={(e) => setCombatImmunityDraft(e.target.value)}
                    className="min-w-0 flex-1 rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-[11px] text-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = combatImmunityDraft.trim();
                      if (!val || sheet.damageMitigation.immunities.includes(val)) return;
                      updateControlled((prev) => ({
                        ...prev,
                        damageMitigation: {
                          ...prev.damageMitigation,
                          immunities: [...prev.damageMitigation.immunities, val],
                        },
                      }));
                      setCombatImmunityDraft('');
                    }}
                    className="min-h-[38px] min-w-[38px] rounded border border-[#2a3145] bg-[#171b28] px-2 py-1 text-[11px] text-slate-200 sm:min-h-0 sm:min-w-0"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* 7. DERIVADOS (INCLUINDO ATENÇÃO ESPECIAL AO DESLOCAMENTO) */}
        <section className="rounded-lg border border-[#212636] bg-[#11141e] p-3.5 sm:p-5">
          <h3 className="mb-3 border-b border-[#1d2230] pb-2 text-sm font-semibold uppercase tracking-wide text-slate-200">
            Valores Derivados
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {/* Movimento / Deslocamento detalhado */}
            <div className="rounded border border-indigo-500/30 bg-[#0d1018] p-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 sm:flex-nowrap">
                <div>
                  <div className="font-semibold text-indigo-200">
                    Movimento / Deslocamento (m)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Fórmula: Base 9m + Adicional - Retirado
                  </div>
                </div>
                <CalculableValueControl
                  field={sheet.derived.movement.total}
                  suffix="m"
                  size="sm"
                  readOnly={combatReadOnly}
                  onChange={(total) =>
                    updateControlled((prev) => ({
                      ...prev,
                      derived: {
                        ...prev.derived,
                        movement: { ...prev.derived.movement, total },
                      },
                    }))
                  }
                />
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-0.5 text-[11px] text-slate-400">
                  Adicional (+)
                  <NumericInput
                    min={0}
                    disabled={combatReadOnly}
                    value={sheet.derived.movement.add}
                    onChange={(add) =>
                      updateControlled((prev) => ({
                        ...prev,
                        derived: {
                          ...prev.derived,
                          movement: {
                            ...prev.derived.movement,
                            add,
                          },
                        },
                      }))
                    }
                    className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-right font-mono-tabular text-xs text-slate-100 disabled:opacity-60"
                  />
                </label>
                <label className="flex flex-col gap-0.5 text-[11px] text-slate-400">
                  Retirado (-)
                  <NumericInput
                    min={0}
                    disabled={combatReadOnly}
                    value={sheet.derived.movement.removed}
                    onChange={(removed) =>
                      updateControlled((prev) => ({
                        ...prev,
                        derived: {
                          ...prev.derived,
                          movement: {
                            ...prev.derived.movement,
                            removed,
                          },
                        },
                      }))
                    }
                    className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-right font-mono-tabular text-xs text-slate-100 disabled:opacity-60"
                  />
                </label>
              </div>
            </div>

            {/* Atenção */}
            <div className="rounded border border-[#1e2332] bg-[#0d1018] p-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 sm:flex-nowrap">
                <div>
                  <div className="font-semibold text-slate-200">Atenção</div>
                  <div className="text-[11px] text-slate-400">
                    10 + Percepção + Add - Ret.
                  </div>
                </div>
                <CalculableValueControl
                  field={sheet.derived.attention.total}
                  size="sm"
                  readOnly={combatReadOnly}
                  onChange={(total) =>
                    updateControlled((prev) => ({
                      ...prev,
                      derived: {
                        ...prev.derived,
                        attention: { ...prev.derived.attention, total },
                      },
                    }))
                  }
                />
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-0.5 text-[11px] text-slate-400">
                  Adicional (+)
                  <NumericInput
                    min={0}
                    integer
                    disabled={combatReadOnly}
                    value={sheet.derived.attention.add}
                    onChange={(add) =>
                      updateControlled((prev) => ({
                        ...prev,
                        derived: {
                          ...prev.derived,
                          attention: {
                            ...prev.derived.attention,
                            add,
                          },
                        },
                      }))
                    }
                    className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-right font-mono-tabular text-xs text-slate-100 disabled:opacity-60"
                  />
                </label>
                <label className="flex flex-col gap-0.5 text-[11px] text-slate-400">
                  Retirado (-)
                  <NumericInput
                    min={0}
                    integer
                    disabled={combatReadOnly}
                    value={sheet.derived.attention.removed}
                    onChange={(removed) =>
                      updateControlled((prev) => ({
                        ...prev,
                        derived: {
                          ...prev.derived,
                          attention: {
                            ...prev.derived.attention,
                            removed,
                          },
                        },
                      }))
                    }
                    className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-right font-mono-tabular text-xs text-slate-100 disabled:opacity-60"
                  />
                </label>
              </div>
            </div>

            {/* Iniciativa */}
            <div className="rounded border border-[#1e2332] bg-[#0d1018] p-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 sm:flex-nowrap">
                <div>
                  <div className="font-semibold text-slate-200">Iniciativa</div>
                  <div className="text-[11px] text-slate-400">
                    Mod(DEX) + Add - Ret.
                  </div>
                </div>
                <CalculableValueControl
                  field={sheet.derived.initiative.total}
                  signed
                  size="sm"
                  readOnly={combatReadOnly}
                  onChange={(total) =>
                    updateControlled((prev) => ({
                      ...prev,
                      derived: {
                        ...prev.derived,
                        initiative: { ...prev.derived.initiative, total },
                      },
                    }))
                  }
                />
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-0.5 text-[11px] text-slate-400">
                  Adicional (+)
                  <NumericInput
                    min={0}
                    integer
                    disabled={combatReadOnly}
                    value={sheet.derived.initiative.add}
                    onChange={(add) =>
                      updateControlled((prev) => ({
                        ...prev,
                        derived: {
                          ...prev.derived,
                          initiative: {
                            ...prev.derived.initiative,
                            add,
                          },
                        },
                      }))
                    }
                    className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-right font-mono-tabular text-xs text-slate-100 disabled:opacity-60"
                  />
                </label>
                <label className="flex flex-col gap-0.5 text-[11px] text-slate-400">
                  Retirado (-)
                  <NumericInput
                    min={0}
                    integer
                    disabled={combatReadOnly}
                    value={sheet.derived.initiative.removed}
                    onChange={(removed) =>
                      updateControlled((prev) => ({
                        ...prev,
                        derived: {
                          ...prev.derived,
                          initiative: {
                            ...prev.derived.initiative,
                            removed,
                          },
                        },
                      }))
                    }
                    className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-right font-mono-tabular text-xs text-slate-100 disabled:opacity-60"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded border border-[#1e2332] bg-[#0d1018] p-3 text-xs">
              <div className="text-slate-400">CD de Especialização</div>
              <div className="mt-1 font-mono-tabular text-base font-bold text-slate-100">
                {resolveCalculableValue(sheet.derived.cdSpecialization.total)}{' '}
                <span className="text-[11px] font-normal text-slate-400">
                  ({sheet.derived.cdSpecialization.attribute} ·{' '}
                  {sheet.derived.cdSpecialization.masteryMode})
                </span>
              </div>
            </div>
            <div className="rounded border border-[#1e2332] bg-[#0d1018] p-3 text-xs">
              <div className="text-slate-400">CD Amaldiçoado</div>
              <div className="mt-1 font-mono-tabular text-base font-bold text-slate-100">
                {resolveCalculableValue(sheet.derived.cdCursed.total)}{' '}
                <span className="text-[11px] font-normal text-slate-400">
                  ({sheet.derived.cdCursed.attribute} · {sheet.derived.cdCursed.masteryMode})
                </span>
              </div>
            </div>
            <div className="rounded border border-[#1e2332] bg-[#0d1018] p-3 text-xs">
              <div className="text-slate-400">
                Empolgação {activeExcitement.length > 0 ? '(Ativa)' : '(Opcional)'}
              </div>
              <div className="mt-1 flex flex-wrap gap-2">
                {sheet.vitals.excitement.map((ex) => (
                  <label key={ex.level} className="inline-flex items-center gap-1 text-[11px]">
                    <input
                      type="checkbox"
                      disabled={combatReadOnly}
                      checked={ex.active}
                      onChange={(e) =>
                        updateControlled((prev) => ({
                          ...prev,
                          vitals: {
                            ...prev.vitals,
                            excitement: prev.vitals.excitement.map((item) =>
                              item.level === ex.level
                                ? { ...item, active: e.target.checked }
                                : item
                            ),
                          },
                        }))
                      }
                      className="h-3 w-3 accent-indigo-500"
                    />
                    <span className={ex.active ? 'font-semibold text-indigo-300' : 'text-slate-400'}>
                      Nvl {ex.level} ({ex.dice})
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 8. CONDIÇÕES */}
        <section className="rounded-lg border border-[#212636] bg-[#11141e] p-3.5 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-[#1d2230] pb-2">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">
                Condições em Combate
              </h3>
              <p className="text-[11px] text-slate-400">
                {combatReadOnly
                  ? 'Visualização das condições atualmente aplicadas ao personagem.'
                  : 'Adicione, remova ou consulte descrições manualmente (sem contadores automáticos de turno).'}
              </p>
            </div>
            <div className="relative w-full sm:w-auto">
              <Search className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Filtrar condição..."
                value={conditionSearch}
                onChange={(e) => setConditionSearch(e.target.value)}
                className="w-full rounded border border-[#242a3b] bg-[#0b0d14] py-1 pr-2.5 pl-7 text-xs text-slate-100 sm:w-auto"
              />
            </div>
          </div>

          {/* Condições atualmente ativas */}
          <div className="mb-4 rounded border border-[#1e2332] bg-[#0d1018] p-3">
            <div className="mb-2 text-xs font-medium text-slate-300">
              Condições Ativas ({activeConditions.length + (sheet.conditions.bleeding ? 1 : 0) + (sheet.conditions.freezing ? 1 : 0)})
            </div>
            {activeConditions.length === 0 &&
            !sheet.conditions.bleeding &&
            !sheet.conditions.freezing ? (
              <p className="text-xs text-slate-500">Nenhuma condição aplicada no momento.</p>
            ) : (
              <div className="space-y-1.5">
                {sheet.conditions.bleeding && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-xs sm:flex-nowrap">
                    <div>
                      <strong className="text-red-200">
                        Sangramento ({sheet.conditions.bleeding}):
                      </strong>{' '}
                      <span className="text-slate-300">
                        {BLEEDING_DESCRIPTIONS[sheet.conditions.bleeding]}
                      </span>
                    </div>
                    {!combatReadOnly && (
                      <button
                        type="button"
                        onClick={() =>
                          updateControlled((prev) => ({
                            ...prev,
                            conditions: { ...prev.conditions, bleeding: null },
                          }))
                        }
                        className="text-xs font-medium text-red-200 hover:underline whitespace-nowrap shrink-0"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                )}
                {sheet.conditions.freezing && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1.5 text-xs sm:flex-nowrap">
                    <div>
                      <strong className="text-cyan-200">
                        Congelamento ({sheet.conditions.freezing}):
                      </strong>{' '}
                      <span className="text-slate-300">
                        {FREEZING_DESCRIPTIONS[sheet.conditions.freezing]}
                      </span>
                    </div>
                    {!combatReadOnly && (
                      <button
                        type="button"
                        onClick={() =>
                          updateControlled((prev) => ({
                            ...prev,
                            conditions: { ...prev.conditions, freezing: null },
                          }))
                        }
                        className="text-xs font-medium text-cyan-200 hover:underline whitespace-nowrap shrink-0"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                )}
                {activeConditions.map((cond) => (
                  <div
                    key={cond}
                    className="flex flex-wrap items-center justify-between gap-2 rounded border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-xs sm:flex-nowrap"
                  >
                    <div>
                      <strong className="text-red-200">{cond}:</strong>{' '}
                      <span className="text-slate-300">
                        {CONDITION_DESCRIPTIONS[cond]}
                      </span>
                    </div>
                    {!combatReadOnly && (
                      <button
                        type="button"
                        onClick={() =>
                          updateControlled((prev) => ({
                            ...prev,
                            conditions: {
                              ...prev.conditions,
                              flags: { ...prev.conditions.flags, [cond]: false },
                            },
                          }))
                        }
                        className="text-xs font-medium text-red-200 hover:underline whitespace-nowrap shrink-0"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Sangramento
              <select
                disabled={combatReadOnly}
                value={sheet.conditions.bleeding ?? ''}
                onChange={(e) =>
                  updateControlled((prev) => ({
                    ...prev,
                    conditions: {
                      ...prev.conditions,
                      bleeding: (e.target.value || null) as BleedingSeverity | null,
                    },
                  }))
                }
                className="rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1.5 text-xs text-slate-100 disabled:opacity-60"
              >
                <option value="">Nenhum</option>
                <option value="Fraco">Fraco</option>
                <option value="Médio">Médio</option>
                <option value="Forte">Forte</option>
                <option value="Extremo">Extremo</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Congelamento
              <select
                disabled={combatReadOnly}
                value={sheet.conditions.freezing ?? ''}
                onChange={(e) =>
                  updateControlled((prev) => ({
                    ...prev,
                    conditions: {
                      ...prev.conditions,
                      freezing: (e.target.value || null) as FreezingSeverity | null,
                    },
                  }))
                }
                className="rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1.5 text-xs text-slate-100 disabled:opacity-60"
              >
                <option value="">Nenhum</option>
                <option value="Leve">Leve</option>
                <option value="Médio">Médio</option>
                <option value="Total">Total</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
            {filteredConditionOptions.map((cond) => {
              const active = sheet.conditions.flags[cond];
              return (
                <button
                  key={cond}
                  type="button"
                  disabled={combatReadOnly}
                  title={CONDITION_DESCRIPTIONS[cond]}
                  onClick={() =>
                    updateControlled((prev) => ({
                      ...prev,
                      conditions: {
                        ...prev.conditions,
                        flags: { ...prev.conditions.flags, [cond]: !active },
                      },
                    }))
                  }
                  className={`rounded border px-2.5 py-2 text-left text-xs transition-colors disabled:cursor-default sm:py-1.5 ${
                    active
                      ? 'border-red-500/60 bg-red-500/15 font-medium text-red-200'
                      : 'border-[#1e2332] bg-[#0d1018] text-slate-300 hover:bg-[#161a28]'
                  }`}
                >
                  {active ? `✓ ${cond}` : cond}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Escudo do Mestre */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#212636] bg-[#11141e] p-3.5 sm:gap-4 sm:p-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100">
            Escudo do Mestre — Painel da Sessão
          </h2>
          <p className="text-xs text-slate-400">
            {isInsideOBR
              ? `Sincronização Owlbear Rodeo ativa (${party.length} participante(s) na sala).`
              : 'Modo local (fora do Owlbear Rodeo). Conecte via OBR para sincronização em sala.'}
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {isInsideOBR && (
            <button
              type="button"
              onClick={onRequestSyncFromRoom}
              className="inline-flex w-full min-h-[38px] items-center justify-center gap-1.5 rounded border border-[#242a3b] bg-[#0b0d14] px-3 py-1.5 text-xs text-slate-300 hover:bg-[#171b28] whitespace-nowrap shrink-0 sm:w-auto sm:min-h-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Sincronizar Sala
            </button>
          )}

          <div className="grid w-full grid-cols-2 items-center gap-1 rounded border border-[#242a3b] bg-[#0b0d14] p-0.5 sm:flex sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveSubView('overview')}
              className={`inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded px-2 py-1.5 text-center text-xs font-medium leading-tight whitespace-normal sm:min-h-0 sm:px-3 sm:whitespace-nowrap sm:shrink-0 ${
                activeSubView === 'overview'
                  ? 'bg-[#22283a] text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span>Visão Geral da Mesa</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubView('control')}
              className={`inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded px-2 py-1.5 text-center text-xs font-medium leading-tight whitespace-normal sm:min-h-0 sm:px-3 sm:whitespace-nowrap sm:shrink-0 ${
                activeSubView === 'control'
                  ? 'bg-indigo-600/30 text-indigo-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="h-3.5 w-3.5 shrink-0" />
              <span>{isGM ? 'Central de Combate (Mestre)' : 'Central de Combate'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Visão Geral da Mesa (acessível a todos) */}
      {activeSubView === 'overview' && (
        <section className="relative overflow-hidden rounded-xl border border-[#1f2536] bg-gradient-to-br from-[#121624] via-[#0d1018] to-[#080a10] px-4 py-6 sm:px-7 sm:py-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'radial-gradient(ellipse at 20% 20%, rgba(79, 70, 229, 0.14), transparent 55%), radial-gradient(ellipse at 85% 80%, rgba(16, 185, 129, 0.08), transparent 50%)',
            }}
          />

          {overviewCards.length === 0 ? (
            <div className="relative py-10 text-center">
              <p className="text-sm text-slate-300">
                Nenhum personagem compartilhado na mesa ainda.
              </p>
            </div>
          ) : (
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              {/* Identificador discreto lateral inspirado na composição da referência */}
              <div className="flex shrink-0 flex-row items-baseline justify-between gap-4 border-b border-[#1d2232] pb-3 lg:w-44 lg:flex-col lg:border-b-0 lg:border-r lg:pr-5 lg:pb-0">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-slate-100">
                    Grupo em Sessão
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    {overviewCards.length}{' '}
                    {overviewCards.length === 1 ? 'personagem' : 'personagens'}
                  </p>
                </div>
                {isInsideOBR && (
                  <p className="text-xs text-slate-500">
                    {party.length} na sala
                  </p>
                )}
              </div>

              {/* Faixa integrada de retratos diagonais lado a lado (carrossel horizontal no mobile, intacto no desktop) */}
              <div className="w-full flex-1">
                {overviewCards.length > 1 && (
                  <div className="mb-2 flex items-center justify-between gap-2 sm:hidden">
                    <span className="text-[11px] text-slate-400">
                      Deslize entre personagens
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label="Personagem anterior"
                        onClick={() => scrollOverviewBy(-1)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#242a3b] bg-[#0b0d14] text-slate-200 hover:bg-[#171b28]"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Próximo personagem"
                        onClick={() => scrollOverviewBy(1)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#242a3b] bg-[#0b0d14] text-slate-200 hover:bg-[#171b28]"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                <div
                  ref={overviewTrackRef}
                  className={`mobile-snap-track flex w-full flex-nowrap items-start gap-4 overflow-x-auto snap-x snap-mandatory px-2 pb-3 pt-1 sm:flex-wrap sm:justify-center sm:overflow-visible sm:gap-x-4 sm:gap-y-8 sm:p-0 ${
                    overviewCards.length === 1 ? 'justify-center' : 'justify-start'
                  }`}
                >
                  {overviewCards.map((card) => {
                    const cardPolicy = evaluateSheetAccess(card, accessContext);
                    const canQuickEdit = canQuickEditSummary(card);
                    const hasFullSheet = sessionSheets.some((s) => s.id === card.sheetId);

                    return (
                      <RosterCharacterSlot
                        key={card.sheetId}
                        card={card}
                        isGM={isGM}
                        isOwner={cardPolicy.isOwner}
                        canQuickEdit={canQuickEdit}
                        canOpenCombatCenter={cardPolicy.canViewCombatCenter}
                        canOpenFullSheet={cardPolicy.canViewFullSheet}
                        hasFullSheet={hasFullSheet}
                        onAdjustPool={(sheetId, pool, delta) =>
                          onUpdateSheetById(sheetId, (prev) =>
                            adjustPoolResource(prev, pool, delta)
                          )
                        }
                        onOpenControl={handleOpenControlForCard}
                        onOpenFullSheet={onOpenFullSheet}
                        onRequestSync={onRequestSyncFromRoom}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Central de Combate (Mestre: acesso total | Jogador: própria central + compartilhadas em leitura) */}
      {activeSubView === 'control' && renderControlPanel()}
    </div>
  );
}
