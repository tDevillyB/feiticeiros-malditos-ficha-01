import { useState } from 'react';
import { Lock, RotateCcw, Unlock } from 'lucide-react';
import type { CalculableNumber } from '../types/character';
import {
  disableManualOverride,
  enableManualOverride,
  resolveCalculableValue,
} from '../utils/calculations';

interface CalculableValueControlProps {
  label?: string;
  field: CalculableNumber;
  onChange: (next: CalculableNumber) => void;
  signed?: boolean;
  suffix?: string;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function CalculableValueControl({
  label,
  field,
  onChange,
  signed = false,
  suffix = '',
  readOnly = false,
  size = 'md',
}: CalculableValueControlProps) {
  const effective = resolveCalculableValue(field);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(effective));

  const formatVal = (val: number) => {
    const prefix = signed && val > 0 ? '+' : '';
    return `${prefix}${val}${suffix}`;
  };

  const handleOpenManual = () => {
    if (readOnly) return;
    setDraft(String(effective));
    setEditing(true);
  };

  const handleCommitManual = () => {
    const parsed = Number.parseFloat(draft.replace(',', '.'));
    if (Number.isFinite(parsed)) {
      onChange(enableManualOverride(field, parsed));
    }
    setEditing(false);
  };

  const handleResetAuto = () => {
    if (readOnly) return;
    onChange(disableManualOverride(field));
    setEditing(false);
  };

  const valueSizeClass =
    size === 'lg'
      ? 'text-2xl font-bold'
      : size === 'sm'
      ? 'text-sm font-semibold'
      : 'text-base font-semibold';

  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-400">{label}</span>
          {field.usarManual && (
            <span className="text-[11px] font-medium text-amber-400">
              Manual (Auto: {formatVal(field.valorCalculado)})
            </span>
          )}
        </div>
      ) : null}

      <div className="flex items-center gap-1.5">
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="any"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCommitManual();
                if (e.key === 'Escape') setEditing(false);
              }}
              autoFocus
              aria-label={label ? `Sobrescrita manual de ${label}` : 'Valor manual'}
              className="w-20 rounded border border-amber-500/70 bg-[#0d1018] px-2 py-1 text-right font-mono-tabular text-sm text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
            <button
              type="button"
              onClick={handleCommitManual}
              className="rounded border border-amber-500/50 bg-amber-500/15 px-2 py-1 text-xs font-medium text-amber-200 hover:bg-amber-500/25 whitespace-nowrap shrink-0"
            >
              Aplicar
            </button>
          </div>
        ) : (
          <div
            className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 transition-colors ${
              field.usarManual
                ? 'border-amber-500/50 bg-amber-500/10 text-amber-200'
                : 'border-[#232838] bg-[#10131c] text-slate-100'
            }`}
          >
            <span className={`font-mono-tabular ${valueSizeClass}`}>
              {formatVal(effective)}
            </span>

            {!readOnly && (
              <button
                type="button"
                onClick={handleOpenManual}
                title={
                  field.usarManual
                    ? `Valor manual ativo (automático: ${formatVal(field.valorCalculado)}). Clique para editar.`
                    : 'Clique para sobrescrever manualmente'
                }
                className="rounded p-1 text-slate-400 hover:bg-white/5 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {field.usarManual ? (
                  <Lock className="h-3.5 w-3.5 text-amber-400" />
                ) : (
                  <Unlock className="h-3.5 w-3.5" />
                )}
              </button>
            )}

            {!readOnly && field.usarManual && (
              <button
                type="button"
                onClick={handleResetAuto}
                title="Retornar ao cálculo automático"
                className="rounded p-1 text-amber-300 hover:bg-amber-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
