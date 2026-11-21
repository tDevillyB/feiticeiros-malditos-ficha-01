import { useMemo, useState } from 'react';
import { Eye, EyeOff, Search, Shield, Users, X } from 'lucide-react';
import type { FichaPersonagem } from '../types/character';
import { resolveCalculableValue } from '../utils/calculations';
import {
  isMasterCreatedSheet,
  type MasterShieldVisibilityContext,
} from '../utils/permissions';
import { GradeBadge } from './GradeBadge';

export interface MasterShieldVisibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheets: FichaPersonagem[];
  visibilityContext: MasterShieldVisibilityContext;
  onSetSheetShieldVisibility: (sheetId: string, visible: boolean) => void;
  onSetLocalSheetCategory?: (
    sheetId: string,
    role: 'GM' | 'PLAYER'
  ) => void;
}

export function MasterShieldVisibilityModal({
  isOpen,
  onClose,
  sheets,
  visibilityContext,
  onSetSheetShieldVisibility,
  onSetLocalSheetCategory,
}: MasterShieldVisibilityModalProps) {
  const [query, setQuery] = useState('');

  const { masterSheets, playerSheets } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = sheets.filter((s) => {
      if (!q) return true;
      const name = (s.identity.name || '').toLowerCase();
      const player = (s.identity.player || s.permissions.ownerPlayerName || '').toLowerCase();
      return name.includes(q) || player.includes(q);
    });

    const master: FichaPersonagem[] = [];
    const players: FichaPersonagem[] = [];

    for (const s of filtered) {
      const isGM = isMasterCreatedSheet(
        {
          sheetId: s.id,
          ownerPlayerId: s.permissions.ownerPlayerId,
          createdByRole: s.permissions.createdByRole,
        },
        visibilityContext
      );
      if (isGM) {
        master.push(s);
      } else {
        players.push(s);
      }
    }

    return { masterSheets: master, playerSheets: players };
  }, [sheets, query, visibilityContext]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shield-visibility-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-xs sm:p-4"
    >
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-[#242a3b] bg-[#0e121c] shadow-2xl">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3 border-b border-[#1d2232] px-4 py-3.5 sm:px-5">
          <div>
            <h3
              id="shield-visibility-title"
              className="flex items-center gap-2 text-sm font-semibold text-slate-100"
            >
              <Shield className="h-4 w-4 text-indigo-300" />
              Fichas Visíveis no Escudo do Mestre
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Personagens de jogadores aparecem automaticamente. Escolha quais NPCs e inimigos exibir nesta sessão sem apagar suas fichas.
            </p>
          </div>
          <button
            type="button"
            aria-label="Fechar gerenciador de fichas"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#242a3b] bg-[#11141e] text-slate-400 hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Busca */}
        <div className="border-b border-[#191e2b] px-4 py-2.5 sm:px-5">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar ficha por nome..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded border border-[#242a3b] bg-[#080a10] py-1.5 pr-3 pl-8 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Conteúdo rolável */}
        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-5">
          {/* NPCs, Inimigos & Fichas do Mestre */}
          <div>
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-semibold uppercase tracking-wide text-slate-300">
                NPCs, Inimigos e Fichas do Mestre ({masterSheets.length})
              </span>
              <span className="text-[11px] text-slate-500">
                {masterSheets.filter((s) => Boolean(s.permissions.showOnMasterShield)).length} exibida(s)
              </span>
            </div>

            {masterSheets.length === 0 ? (
              <p className="rounded border border-[#1a1f2e] bg-[#0b0d14] px-3 py-3 text-xs text-slate-500">
                Nenhuma ficha criada pelo Mestre encontrada.
              </p>
            ) : (
              <div className="space-y-2">
                {masterSheets.map((s) => {
                  const isShown = Boolean(s.permissions.showOnMasterShield);
                  const hpCur = resolveCalculableValue(s.vitals.hp.current);
                  const hpMax = resolveCalculableValue(s.vitals.hp.max);
                  const grade = resolveCalculableValue(s.identity.grade);
                  const level = resolveCalculableValue(s.identity.level);
                  const isLocal = visibilityContext.localSheetIds.has(s.id);

                  return (
                    <div
                      key={s.id}
                      className={`flex flex-wrap items-center justify-between gap-2.5 rounded-lg border px-3 py-2.5 text-xs transition-colors ${
                        isShown
                          ? 'border-indigo-500/40 bg-indigo-500/10'
                          : 'border-[#1d2232] bg-[#0b0d14]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-semibold text-slate-100">
                            {s.identity.name.trim() || 'Ficha sem nome'}
                          </span>
                          <GradeBadge grade={grade} size="xs" />
                          <span className="font-mono-tabular text-[11px] text-slate-400">
                            Nvl {level} · PV {hpCur}/{hpMax}
                          </span>
                        </div>
                        {!visibilityContext.isInsideOBR && isLocal && onSetLocalSheetCategory && (
                          <button
                            type="button"
                            onClick={() => onSetLocalSheetCategory(s.id, 'PLAYER')}
                            className="mt-1 text-[10px] text-slate-500 underline-offset-2 hover:text-indigo-300 hover:underline"
                          >
                            Marcar como ficha de jogador (automática)
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onSetSheetShieldVisibility(s.id, !isShown)}
                        className={`inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-medium transition-colors sm:min-h-0 ${
                          isShown
                            ? 'border-amber-500/45 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
                            : 'border-indigo-500/45 bg-indigo-600/25 text-indigo-100 hover:bg-indigo-600/40'
                        }`}
                      >
                        {isShown ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5" />
                            Remover do Escudo
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5" />
                            Adicionar ao Escudo
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Personagens dos Jogadores */}
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <Users className="h-3.5 w-3.5 text-emerald-400" />
              Personagens dos Jogadores ({playerSheets.length})
            </div>

            {playerSheets.length === 0 ? (
              <p className="rounded border border-[#1a1f2e] bg-[#0b0d14] px-3 py-2.5 text-xs text-slate-500">
                Nenhum personagem de jogador carregado na sessão.
              </p>
            ) : (
              <div className="space-y-1.5">
                {playerSheets.map((s) => {
                  const isLocal = visibilityContext.localSheetIds.has(s.id);
                  return (
                    <div
                      key={s.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded border border-[#1a1f2e] bg-[#0b0d14]/80 px-3 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-slate-200">
                          {s.identity.name.trim() || 'Personagem sem nome'}
                        </span>
                        <span className="ml-2 text-[11px] text-slate-500">
                          {s.identity.player || s.permissions.ownerPlayerName || 'Jogador'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {!visibilityContext.isInsideOBR && isLocal && onSetLocalSheetCategory && (
                          <button
                            type="button"
                            onClick={() => onSetLocalSheetCategory(s.id, 'GM')}
                            className="text-[10px] text-slate-500 hover:text-amber-300"
                          >
                            Converter p/ NPC
                          </button>
                        )}
                        <span className="text-[11px] font-medium text-emerald-400">
                          Automática
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
