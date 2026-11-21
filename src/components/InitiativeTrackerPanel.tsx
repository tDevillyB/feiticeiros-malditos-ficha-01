import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Dices,
  Play,
  Plus,
  RotateCcw,
  Swords,
  X,
} from 'lucide-react';
import type {
  FichaPersonagem,
  SharedCharacterSummary,
} from '../types/character';
import type { InitiativeParticipant } from '../types/initiative';
import { resolveCalculableValue } from '../utils/calculations';

export interface InitiativeTrackerPanelProps {
  isGM: boolean;
  isInsideOBR: boolean;
  round: number;
  participants: InitiativeParticipant[];
  activeParticipantId: string | null;
  availableSheets: FichaPersonagem[];
  onNextTurn: () => void;
  onResetInitiative: () => void;
  onSelectActiveParticipant: (id: string) => void;
  onUpdateParticipantInitiative: (
    participant: InitiativeParticipant,
    nextValue: number
  ) => void;
  onRemoveParticipant: (participant: InitiativeParticipant) => void;
  onAddSheetParticipant: (sheet: FichaPersonagem, rolledValue?: number) => void;
  onAddManualParticipant: (name: string, initiative: number) => void;
}

function normalizeMatchName(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function doesParticipantMatchCard(
  participant: InitiativeParticipant | null | undefined,
  card: SharedCharacterSummary,
  sessionSheets: FichaPersonagem[]
): boolean {
  if (!participant) return false;
  if (participant.sheetId && participant.sheetId === card.sheetId) {
    return true;
  }

  const sheet = sessionSheets.find((s) => s.id === card.sheetId);
  if (
    participant.tokenId &&
    sheet?.permissions.linkedTokenIds?.includes(participant.tokenId)
  ) {
    return true;
  }

  const pName = normalizeMatchName(participant.name);
  const cName = normalizeMatchName(card.name);
  if (pName && cName && pName === cName) {
    return true;
  }

  return false;
}

export function InitiativeTrackerPanel({
  isGM,
  isInsideOBR,
  round,
  participants,
  activeParticipantId,
  availableSheets,
  onNextTurn,
  onResetInitiative,
  onSelectActiveParticipant,
  onUpdateParticipantInitiative,
  onRemoveParticipant,
  onAddSheetParticipant,
  onAddManualParticipant,
}: InitiativeTrackerPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedSheetId, setSelectedSheetId] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualValue, setManualValue] = useState('10');

  const activeParticipant =
    participants.find((p) => p.id === activeParticipantId) ?? null;

  const handleAddFromSheet = (withRoll: boolean) => {
    const targetId = availableSheets.some((s) => s.id === selectedSheetId)
      ? selectedSheetId
      : availableSheets[0]?.id;
    const sheet = availableSheets.find((s) => s.id === targetId);
    if (!sheet) return;
    const initMod = resolveCalculableValue(sheet.derived.initiative.total);
    const val = withRoll
      ? Math.floor(Math.random() * 20) + 1 + initMod
      : initMod;
    onAddSheetParticipant(sheet, val);
    setSelectedSheetId('');
    setShowAddForm(false);
  };

  const handleAddManual = () => {
    const trimmed = manualName.trim();
    if (!trimmed) return;
    const parsed = Number.parseFloat(manualValue.replace(',', '.'));
    onAddManualParticipant(trimmed, Number.isFinite(parsed) ? parsed : 0);
    setManualName('');
    setManualValue('10');
    setShowAddForm(false);
  };

  return (
    <div className="w-full">
      {/* Botão discreto de recolher/expandir na lateral esquerda */}
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((prev) => !prev)}
        className={`flex w-full min-h-[38px] items-center justify-between gap-2 rounded border px-2.5 py-1.5 text-left text-xs transition-colors sm:min-h-0 ${
          isExpanded
            ? 'border-indigo-500/50 bg-indigo-500/15 text-indigo-100'
            : 'border-[#242a3b] bg-[#0b0d14]/90 text-slate-200 hover:border-indigo-500/40 hover:bg-[#131826]'
        }`}
      >
        <span className="flex min-w-0 items-center gap-1.5 font-medium">
          <Swords className="h-3.5 w-3.5 shrink-0 text-indigo-300" />
          <span className="truncate">Iniciativa</span>
        </span>
        <span className="flex shrink-0 items-center gap-1 font-mono-tabular text-[10px] text-slate-400">
          {participants.length > 0 && (
            <span className="text-indigo-300">
              R{round}·{participants.length}
            </span>
          )}
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </span>
      </button>

      {/* Indicador discreto do turno ativo quando recolhido */}
      {!isExpanded && activeParticipant && (
        <div
          className="mt-1.5 truncate px-0.5 text-[11px] text-indigo-200/90"
          title={`Turno atual: ${activeParticipant.name} (${activeParticipant.initiative})`}
        >
          <span className="text-slate-500">Turno: </span>
          <span className="font-medium">{activeParticipant.name}</span>
        </div>
      )}

      {/* Painel auxiliar compacto quando expandido */}
      {isExpanded && (
        <div className="mt-2 space-y-2.5 rounded-md border border-[#22283a] bg-[#0b0d14]/95 p-2.5 text-xs shadow-lg">
          {/* Cabeçalho de Rodada */}
          <div className="flex items-center justify-between gap-1 border-b border-[#1b2030] pb-1.5">
            <span className="font-mono-tabular text-[11px] font-semibold uppercase tracking-wide text-slate-300">
              Rodada {round}
            </span>
            {isGM && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="Adicionar participante"
                  onClick={() => setShowAddForm((prev) => !prev)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded border border-[#242a3b] bg-[#11141e] text-slate-300 hover:border-indigo-500/50 hover:text-indigo-200"
                >
                  <Plus className="h-3 w-3" />
                </button>
                {participants.length > 0 && (
                  <button
                    type="button"
                    title="Reiniciar rodada e limpar lista manual"
                    onClick={onResetInitiative}
                    className="inline-flex h-6 w-6 items-center justify-center rounded border border-[#242a3b] bg-[#11141e] text-slate-400 hover:text-amber-300"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Botão Próximo Turno */}
          {isGM && participants.length > 0 && (
            <button
              type="button"
              onClick={onNextTurn}
              className="flex w-full min-h-[34px] items-center justify-center gap-1.5 rounded border border-indigo-500/50 bg-indigo-600/25 px-2 py-1 text-[11px] font-semibold text-indigo-100 transition-colors hover:bg-indigo-600/40 sm:min-h-0"
            >
              <Play className="h-3 w-3 fill-current" />
              Próximo turno
            </button>
          )}

          {/* Lista Ordenada */}
          {participants.length === 0 ? (
            <p className="py-1 text-[11px] leading-relaxed text-slate-500">
              {isInsideOBR
                ? 'Use "Add to Initiative" em um token no OBR ou adicione manualmente.'
                : 'Nenhum participante na ordem ainda.'}
            </p>
          ) : (
            <ul className="max-h-56 space-y-1 overflow-y-auto pr-0.5">
              {participants.map((p) => {
                const isActive = p.id === activeParticipantId;
                return (
                  <li
                    key={p.id}
                    className={`flex items-center gap-1.5 rounded border px-1.5 py-1 transition-colors ${
                      isActive
                        ? 'border-indigo-400/70 bg-indigo-500/20 text-slate-100 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                        : 'border-[#1a1f2e] bg-[#11141e]/80 text-slate-300'
                    }`}
                  >
                    {isGM ? (
                      <input
                        type="number"
                        aria-label={`Iniciativa de ${p.name}`}
                        value={p.initiative}
                        onChange={(e) => {
                          const parsed = Number.parseFloat(e.target.value);
                          onUpdateParticipantInitiative(
                            p,
                            Number.isFinite(parsed) ? parsed : 0
                          );
                        }}
                        className="w-10 shrink-0 rounded border border-[#242a3b] bg-[#080a10] px-1 py-0.5 text-center font-mono-tabular text-[11px] text-slate-100 focus:border-indigo-500 focus:outline-none"
                      />
                    ) : (
                      <span className="w-8 shrink-0 text-center font-mono-tabular text-[11px] font-semibold text-indigo-300">
                        {p.initiative}
                      </span>
                    )}

                    <button
                      type="button"
                      disabled={!isGM}
                      onClick={() => isGM && onSelectActiveParticipant(p.id)}
                      title={`${p.name}${p.source === 'obr-token' ? ' (Token OBR)' : ''}`}
                      className="min-w-0 flex-1 truncate text-left text-[11px] font-medium disabled:cursor-default"
                    >
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-indigo-300 align-middle"
                        />
                      )}
                      {p.name}
                    </button>

                    {isGM && (
                      <button
                        type="button"
                        aria-label={`Remover ${p.name} da iniciativa`}
                        onClick={() => onRemoveParticipant(p)}
                        className="shrink-0 rounded p-0.5 text-slate-500 hover:bg-red-500/15 hover:text-red-300"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* Mini-formulário para adicionar ficha ou inimigo manual */}
          {isGM && showAddForm && (
            <div className="space-y-2 border-t border-[#1b2030] pt-2">
              {availableSheets.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] font-medium text-slate-400">
                    Da ficha
                  </div>
                  <select
                    value={selectedSheetId || availableSheets[0]?.id || ''}
                    onChange={(e) => setSelectedSheetId(e.target.value)}
                    className="w-full min-w-0 rounded border border-[#242a3b] bg-[#080a10] px-1.5 py-1 text-[11px] text-slate-200"
                  >
                    {availableSheets.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.identity.name.trim() || 'Sem nome'} (
                        {resolveCalculableValue(s.derived.initiative.total) >= 0
                          ? `+${resolveCalculableValue(s.derived.initiative.total)}`
                          : resolveCalculableValue(s.derived.initiative.total)}
                        )
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleAddFromSheet(true)}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded border border-indigo-500/40 bg-indigo-600/20 px-1.5 py-1 text-[10px] font-medium text-indigo-100 hover:bg-indigo-600/35"
                    >
                      <Dices className="h-3 w-3" />
                      1d20+Inic
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddFromSheet(false)}
                      className="rounded border border-[#242a3b] bg-[#11141e] px-2 py-1 text-[10px] text-slate-300 hover:bg-[#1a2030]"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <div className="text-[10px] font-medium text-slate-400">
                  Inimigo / Manual
                </div>
                <input
                  type="text"
                  placeholder="Nome..."
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full min-w-0 rounded border border-[#242a3b] bg-[#080a10] px-1.5 py-1 text-[11px] text-slate-100"
                />
                <div className="flex gap-1">
                  <input
                    type="number"
                    placeholder="Inic."
                    value={manualValue}
                    onChange={(e) => setManualValue(e.target.value)}
                    className="w-14 min-w-0 rounded border border-[#242a3b] bg-[#080a10] px-1.5 py-1 text-center font-mono-tabular text-[11px] text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={handleAddManual}
                    className="flex-1 rounded border border-[#242a3b] bg-[#171b28] px-2 py-1 text-[10px] font-medium text-slate-200 hover:bg-[#202638]"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
