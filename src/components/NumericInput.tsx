import { useEffect, useState, type InputHTMLAttributes } from 'react';

interface NumericInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  emptyValue?: number;
  integer?: boolean;
}

function clampValue(val: number, min?: number, max?: number, integer?: boolean): number {
  let next = integer ? Math.round(val) : val;
  if (min !== undefined) {
    next = Math.max(min, next);
  }
  if (max !== undefined) {
    next = Math.min(max, next);
  }
  return next;
}

export function NumericInput({
  value,
  onChange,
  min,
  max,
  emptyValue = 0,
  integer = false,
  onFocus,
  onBlur,
  onKeyDown,
  ...rest
}: NumericInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [draft, setDraft] = useState(() => String(value));

  useEffect(() => {
    if (!isFocused) {
      setDraft(String(value));
    }
  }, [value, isFocused]);

  const commitDraft = (raw: string) => {
    const normalized = raw.replace(',', '.').trim();
    if (normalized === '' || normalized === '-') {
      const fallback = clampValue(emptyValue, min, max, integer);
      setDraft(String(fallback));
      if (fallback !== value) {
        onChange(fallback);
      }
      return;
    }

    const parsed = Number.parseFloat(normalized);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }

    const clamped = clampValue(parsed, min, max, integer);
    setDraft(String(clamped));
    if (clamped !== value) {
      onChange(clamped);
    }
  };

  return (
    <input
      {...rest}
      type="text"
      inputMode={integer && (min === undefined || min >= 0) ? 'numeric' : 'decimal'}
      value={isFocused ? draft : String(value)}
      onFocus={(e) => {
        setIsFocused(true);
        setDraft(String(value));
        onFocus?.(e);
      }}
      onChange={(e) => {
        const raw = e.target.value;
        // Permite digitação fluida de vazio, sinal negativo ou separador decimal
        if (!/^-?\d*(?:[.,]\d*)?$/.test(raw)) {
          return;
        }
        setDraft(raw);

        const normalized = raw.replace(',', '.').trim();
        if (normalized === '' || normalized === '-' || normalized.endsWith('.')) {
          return;
        }

        const parsed = Number.parseFloat(normalized);
        if (!Number.isFinite(parsed)) {
          return;
        }

        if (min !== undefined && parsed < min) {
          return;
        }
        if (max !== undefined && parsed > max) {
          onChange(clampValue(parsed, min, max, integer));
          return;
        }

        onChange(integer ? Math.round(parsed) : parsed);
      }}
      onBlur={(e) => {
        setIsFocused(false);
        commitDraft(draft);
        onBlur?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commitDraft(draft);
          e.currentTarget.blur();
        } else if (e.key === 'Escape') {
          setDraft(String(value));
          setIsFocused(false);
          e.currentTarget.blur();
        }
        onKeyDown?.(e);
      }}
    />
  );
}
