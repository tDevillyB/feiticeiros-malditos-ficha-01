import { useEffect, useState } from 'react';
import { Copy, Plus, RotateCcw, Shield, Sparkles, Swords, Trash2 } from 'lucide-react';
import { SIMPLE_CONDITION_LIST } from '../../data/conditionsInfo';
import type {
  AttributeKey,
  ControlledCurseProfile,
  FichaPersonagem,
  ShikigamiActionComplexity,
  ShikigamiActionEntry,
  ShikigamiCharacteristicEntry,
  ShikigamiCharacteristicKind,
  SimpleConditionKey,
  SummonEntry,
} from '../../types/character';
import {
  calculateAttributeModifier,
  createCalculableField,
  enableManualOverride,
  resolveCalculableValue,
} from '../../utils/calculations';
import { CalculableValueControl } from '../CalculableValueControl';

interface SummonsTabProps {
  sheet: FichaPersonagem;
  onUpdate: (updater: (prev: FichaPersonagem) => FichaPersonagem) => void;
  readOnly: boolean;
}

const ATTRIBUTE_KEYS: AttributeKey[] = ['FOR', 'DEX', 'CON', 'INT', 'SAB', 'PRE'];
const SHIKIGAMI_LIBRARY_KEY = 'fm25_obr_shikigami_library_v1';
const LEGACY_CURSE_LIBRARY_KEY = 'fm25_obr_curse_library_v1';

const CHARACTERISTIC_KIND_LABELS: Record<ShikigamiCharacteristicKind, string> = {
  passiva: 'Passiva',
  particularidade: 'Particularidade',
  efeito_permanente: 'Efeito Permanente',
  propriedade: 'Propriedade Inerente',
};

function createNewSummon(): SummonEntry {
  return {
    id: `sum-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: 'Novo Shikigami',
    imageUrl: '',
    grade: '',
    summonType: 'Shikigami',
    isActive: true,
    summonCostPE: createCalculableField(0),
    upkeepCostPE: 0,
    level: createCalculableField(1),
    hp: {
      current: createCalculableField(20),
      max: createCalculableField(20),
      temp: 0,
      lost: 0,
    },
    defense: createCalculableField(10),
    movement: createCalculableField(9),
    initiative: createCalculableField(0),
    attributes: {
      FOR: { value: 10, modifier: createCalculableField(0) },
      DEX: { value: 10, modifier: createCalculableField(0) },
      CON: { value: 10, modifier: createCalculableField(0) },
      INT: { value: 10, modifier: createCalculableField(0) },
      SAB: { value: 10, modifier: createCalculableField(0) },
      PRE: { value: 10, modifier: createCalculableField(0) },
    },
    skills: [],
    actions: [],
    characteristics: [],
    attacks: [],
    abilities: [],
    damageReduction: createCalculableField(0),
    resistances: [],
    immunities: [],
    conditions: [],
    notes: '',
  };
}

function createNewAction(complexity: ShikigamiActionComplexity): ShikigamiActionEntry {
  return {
    id: `shk-act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: complexity === 'simples' ? 'Nova Ação Simples' : 'Nova Ação Complexa',
    complexity,
    actionType: complexity === 'simples' ? 'Ação Padrão' : 'Ação Completa',
    hitBonus: '',
    damage: '',
    critical: '',
    damageType: '',
    range: '',
    effects: '',
    description: '',
  };
}

function createNewCharacteristic(): ShikigamiCharacteristicEntry {
  return {
    id: `shk-chr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: 'Nova Característica',
    kind: 'passiva',
    description: '',
  };
}

function stripPeFromSummonTemplate(raw: SummonEntry): SummonEntry {
  const { pe: _ignoredPe, ...rest } = raw;
  void _ignoredPe;
  return {
    ...rest,
    actions: Array.isArray(raw.actions) ? raw.actions : [],
    characteristics: Array.isArray(raw.characteristics) ? raw.characteristics : [],
    damageReduction: raw.damageReduction ?? createCalculableField(0),
    resistances: raw.resistances ?? [],
    immunities: raw.immunities ?? [],
    conditions: [],
  };
}

function convertLegacyCurseTemplate(c: ControlledCurseProfile): SummonEntry {
  const makeAttr = (k: AttributeKey) => {
    const val = c.attributes?.[k] ?? 10;
    return {
      value: val,
      modifier: createCalculableField(calculateAttributeModifier(val)),
    };
  };
  return {
    id: c.id,
    name: c.name || 'Shikigami',
    imageUrl: c.imageUrl ?? '',
    grade: c.grade ?? '',
    summonType: c.category || 'Shikigami',
    isActive: true,
    summonCostPE: createCalculableField(0),
    upkeepCostPE: 0,
    level: createCalculableField(1),
    hp: {
      current: createCalculableField(c.hp?.max ?? 20),
      max: createCalculableField(c.hp?.max ?? 20),
      temp: 0,
      lost: 0,
    },
    defense: createCalculableField(c.defense ?? 10),
    movement: createCalculableField(c.movement ?? 9),
    initiative: createCalculableField(calculateAttributeModifier(c.attributes?.DEX ?? 10)),
    attributes: {
      FOR: makeAttr('FOR'),
      DEX: makeAttr('DEX'),
      CON: makeAttr('CON'),
      INT: makeAttr('INT'),
      SAB: makeAttr('SAB'),
      PRE: makeAttr('PRE'),
    },
    skills: [],
    actions: [
      ...(c.attacks ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        complexity: 'simples' as const,
        actionType: 'Ação Padrão',
        hitBonus: a.hit ?? '',
        damage: a.damage ?? '',
        critical: '',
        damageType: a.damageType ?? '',
        range: a.range ?? '',
        effects: '',
        description: '',
      })),
      ...(c.abilities ?? []).map((ab) => ({
        id: ab.id,
        name: ab.name,
        complexity: 'complexa' as const,
        actionType: 'Ação Padrão',
        hitBonus: '',
        damage: '',
        critical: '',
        damageType: '',
        range: '',
        effects: ab.cost ?? '',
        description: ab.description ?? '',
      })),
    ],
    characteristics: [],
    attacks: [],
    abilities: [],
    damageReduction: createCalculableField(0),
    resistances: [],
    immunities: [],
    conditions: [],
    notes: c.notes ?? '',
  };
}

function loadSavedTemplates(): SummonEntry[] {
  try {
    const raw = localStorage.getItem(SHIKIGAMI_LIBRARY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SummonEntry[];
      if (Array.isArray(parsed)) {
        return parsed.map(stripPeFromSummonTemplate);
      }
    }
    const legacyRaw = localStorage.getItem(LEGACY_CURSE_LIBRARY_KEY);
    if (legacyRaw) {
      const legacyParsed = JSON.parse(legacyRaw) as ControlledCurseProfile[];
      if (Array.isArray(legacyParsed)) {
        return legacyParsed.map(convertLegacyCurseTemplate);
      }
    }
  } catch {
    // Ignora caso storage esteja indisponível
  }
  return [];
}

export function SummonsTab({ sheet, onUpdate, readOnly }: SummonsTabProps) {
  const [savedTemplates, setSavedTemplates] = useState<SummonEntry[]>(() =>
    loadSavedTemplates()
  );
  const [newResistanceDraft, setNewResistanceDraft] = useState<Record<string, string>>({});
  const [newImmunityDraft, setNewImmunityDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      localStorage.setItem(SHIKIGAMI_LIBRARY_KEY, JSON.stringify(savedTemplates));
    } catch {
      // Ignora erro de quota
    }
  }, [savedTemplates]);

  const updateSummon = (
    id: string,
    updater: (summon: SummonEntry) => SummonEntry
  ) => {
    if (readOnly) return;
    onUpdate((prev) => ({
      ...prev,
      summons: prev.summons.map((s) => (s.id === id ? updater(s) : s)),
    }));
  };

  const addSummonFromTemplate = (template?: SummonEntry) => {
    if (readOnly) return;
    const base: SummonEntry = template
      ? {
          ...stripPeFromSummonTemplate(structuredClone(template)),
          id: `sum-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          hp: {
            ...template.hp,
            lost: 0,
            temp: 0,
            current: createCalculableField(resolveCalculableValue(template.hp.max)),
          },
          conditions: [],
          isActive: true,
        }
      : createNewSummon();

    onUpdate((prev) => ({
      ...prev,
      summons: [...prev.summons, base],
    }));
  };

  const saveAsTemplate = (summon: SummonEntry) => {
    const slug =
      summon.name.trim().toLowerCase().replace(/\s+/g, '-') || `${Date.now()}`;
    const clean = stripPeFromSummonTemplate(structuredClone(summon));
    clean.id = `tpl-shk-${slug}`;
    clean.hp = {
      ...clean.hp,
      lost: 0,
      temp: 0,
      current: createCalculableField(resolveCalculableValue(clean.hp.max)),
    };
    setSavedTemplates((prev) => {
      const exists = prev.some((t) => t.id === clean.id);
      return exists
        ? prev.map((t) => (t.id === clean.id ? clean : t))
        : [...prev, clean];
    });
  };

  const adjustSummonHp = (id: string, delta: number) => {
    updateSummon(id, (s) => {
      const maxHp = resolveCalculableValue(s.hp.max);
      if (s.hp.current.usarManual) {
        const cur = resolveCalculableValue(s.hp.current);
        return {
          ...s,
          hp: {
            ...s.hp,
            current: enableManualOverride(s.hp.current, Math.max(0, cur + delta)),
          },
        };
      }
      const nextLost = Math.min(maxHp + s.hp.temp, Math.max(0, s.hp.lost - delta));
      return {
        ...s,
        hp: { ...s.hp, lost: nextLost },
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho Unificado de Shikigamis */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[#212636] bg-[#11141e] p-5">
        <div>
          <h2 className="text-base font-semibold text-slate-100">
            Shikigamis ({sheet.summons.length})
          </h2>
          <p className="text-xs text-slate-400">
            Área unificada de criaturas e invocações com PV, RD Natural, Defesa, Ações e Características.
          </p>
        </div>

        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2">
            {savedTemplates.length > 0 && (
              <select
                defaultValue=""
                aria-label="Reutilizar modelo de shikigami"
                onChange={(e) => {
                  const found = savedTemplates.find((t) => t.id === e.target.value);
                  if (found) addSummonFromTemplate(found);
                  e.target.value = '';
                }}
                className="rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-2 text-xs text-slate-200"
              >
                <option value="">Reutilizar modelo salvo...</option>
                {savedTemplates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} {tpl.grade ? `(${tpl.grade})` : ''}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={() => addSummonFromTemplate()}
              className="inline-flex items-center gap-1.5 rounded border border-indigo-500/50 bg-indigo-600/20 px-3.5 py-2 text-xs font-medium text-indigo-100 hover:bg-indigo-600/30 whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" />
              Novo Shikigami
            </button>
          </div>
        )}
      </div>

      {sheet.summons.length === 0 ? (
        <div className="rounded-lg border border-[#212636] bg-[#11141e] p-8 text-center">
          <p className="text-sm text-slate-300">
            Nenhum shikigami registrado nesta ficha.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Adicione um shikigami para acompanhar PV, RD Natural, Defesa, Deslocamento, Ações e Características.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sheet.summons.map((summon) => {
            const actions = summon.actions ?? [];
            const simpleActions = actions.filter((a) => a.complexity === 'simples');
            const complexActions = actions.filter((a) => a.complexity === 'complexa');
            const characteristics = summon.characteristics ?? [];
            const hpCurrent = resolveCalculableValue(summon.hp.current);
            const hpMax = resolveCalculableValue(summon.hp.max);
            const rdValue = resolveCalculableValue(
              summon.damageReduction ?? createCalculableField(0)
            );
            const hpPct =
              hpMax > 0 ? Math.min(100, Math.max(0, Math.round((hpCurrent / hpMax) * 100))) : 0;

            return (
              <section
                key={summon.id}
                className="rounded-lg border border-[#212636] bg-[#11141e] p-5"
              >
                {/* Topo: Retrato, Identificação e Controles Rápidos */}
                <div className="mb-4 flex flex-wrap items-start justify-between gap-4 border-b border-[#1d2230] pb-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {summon.imageUrl ? (
                      <img
                        src={summon.imageUrl}
                        alt={summon.name}
                        className="h-14 w-14 rounded-lg border border-[#2a3145] object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-[#2a3145] bg-[#0d1018] text-sm font-bold text-indigo-300">
                        {summon.name.trim().slice(0, 2).toUpperCase() || 'SH'}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          disabled={readOnly}
                          placeholder="Nome do Shikigami"
                          value={summon.name}
                          onChange={(e) =>
                            updateSummon(summon.id, (s) => ({
                              ...s,
                              name: e.target.value,
                            }))
                          }
                          className="rounded border border-[#242a3b] bg-[#0b0d14] px-3 py-1.5 text-sm font-semibold text-slate-100"
                        />
                        <input
                          type="text"
                          disabled={readOnly}
                          placeholder="Grau"
                          value={summon.grade}
                          onChange={(e) =>
                            updateSummon(summon.id, (s) => ({
                              ...s,
                              grade: e.target.value,
                            }))
                          }
                          className="w-32 rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1.5 text-xs text-slate-300"
                        />
                        <input
                          type="text"
                          disabled={readOnly}
                          placeholder="Tipo / Categoria"
                          value={summon.summonType}
                          onChange={(e) =>
                            updateSummon(summon.id, (s) => ({
                              ...s,
                              summonType: e.target.value,
                            }))
                          }
                          className="w-32 rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1.5 text-xs text-slate-300"
                        />
                      </div>
                      <input
                        type="text"
                        disabled={readOnly}
                        placeholder="URL da imagem do Shikigami (opcional)..."
                        value={summon.imageUrl ?? ''}
                        onChange={(e) =>
                          updateSummon(summon.id, (s) => ({
                            ...s,
                            imageUrl: e.target.value,
                          }))
                        }
                        className="w-full rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1 text-[11px] text-slate-300"
                      />
                    </div>
                  </div>

                  {/* Ações rápidas do card */}
                  {!readOnly && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {([-5, -1, 1, 5] as const).map((delta) => (
                        <button
                          key={delta}
                          type="button"
                          onClick={() => adjustSummonHp(summon.id, delta)}
                          title={delta < 0 ? `Dano ${delta} PV` : `Cura +${delta} PV`}
                          className={`rounded border border-[#242a3b] bg-[#0d1018] px-2 py-1 font-mono-tabular text-xs ${
                            delta < 0
                              ? 'text-red-300 hover:bg-red-500/15'
                              : 'text-emerald-300 hover:bg-emerald-500/15'
                          }`}
                        >
                          {delta > 0 ? `+${delta}` : delta} PV
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          updateSummon(summon.id, (s) => ({
                            ...s,
                            hp: {
                              ...s.hp,
                              lost: 0,
                              temp: 0,
                              current: createCalculableField(
                                resolveCalculableValue(s.hp.max)
                              ),
                            },
                            conditions: [],
                          }))
                        }
                        title="Restaurar PV e limpar condições"
                        className="rounded border border-[#242a3b] bg-[#0d1018] p-1.5 text-slate-300 hover:text-indigo-300"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => addSummonFromTemplate(summon)}
                        title="Duplicar shikigami"
                        className="rounded border border-[#242a3b] bg-[#0d1018] p-1.5 text-slate-300 hover:text-slate-100"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => saveAsTemplate(summon)}
                        title="Salvar como modelo reutilizável"
                        className="inline-flex items-center gap-1 rounded border border-[#2a3145] bg-[#171b28] px-2.5 py-1.5 text-[11px] text-slate-200 hover:bg-[#202638]"
                      >
                        <Shield className="h-3 w-3 text-indigo-300" />
                        Salvar Modelo
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdate((prev) => ({
                            ...prev,
                            summons: prev.summons.filter((s) => s.id !== summon.id),
                          }))
                        }
                        title="Excluir shikigami"
                        className="rounded p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Status de Combate: PV, RD Natural, Defesa, Deslocamento (SEM PE) */}
                <div className="mb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <div className="rounded border border-emerald-500/30 bg-[#0d1018] p-3">
                      <CalculableValueControl
                        label="PV Atual"
                        field={summon.hp.current}
                        readOnly={readOnly}
                        size="sm"
                        onChange={(current) =>
                          updateSummon(summon.id, (s) => ({
                            ...s,
                            hp: { ...s.hp, current },
                          }))
                        }
                      />
                    </div>
                    <div className="rounded border border-[#1e2332] bg-[#0d1018] p-3">
                      <CalculableValueControl
                        label="PV Máximo"
                        field={summon.hp.max}
                        readOnly={readOnly}
                        size="sm"
                        onChange={(max) =>
                          updateSummon(summon.id, (s) => ({
                            ...s,
                            hp: { ...s.hp, max },
                          }))
                        }
                      />
                    </div>
                    <div className="rounded border border-amber-500/40 bg-amber-500/5 p-3">
                      <CalculableValueControl
                        label="RD Natural"
                        field={summon.damageReduction ?? createCalculableField(0)}
                        readOnly={readOnly}
                        size="sm"
                        onChange={(damageReduction) =>
                          updateSummon(summon.id, (s) => ({
                            ...s,
                            damageReduction,
                          }))
                        }
                      />
                    </div>
                    <div className="rounded border border-[#1e2332] bg-[#0d1018] p-3">
                      <CalculableValueControl
                        label="Defesa"
                        field={summon.defense}
                        readOnly={readOnly}
                        size="sm"
                        onChange={(defense) =>
                          updateSummon(summon.id, (s) => ({ ...s, defense }))
                        }
                      />
                    </div>
                    <div className="rounded border border-[#1e2332] bg-[#0d1018] p-3">
                      <CalculableValueControl
                        label="Deslocamento (m)"
                        field={summon.movement}
                        readOnly={readOnly}
                        size="sm"
                        onChange={(movement) =>
                          updateSummon(summon.id, (s) => ({ ...s, movement }))
                        }
                      />
                    </div>
                    <div className="rounded border border-[#1e2332] bg-[#0d1018] p-3">
                      <CalculableValueControl
                        label="Iniciativa"
                        field={summon.initiative}
                        signed
                        readOnly={readOnly}
                        size="sm"
                        onChange={(initiative) =>
                          updateSummon(summon.id, (s) => ({ ...s, initiative }))
                        }
                      />
                    </div>
                  </div>

                  {/* Barra visual de PV + destaque de RD */}
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded bg-[#07090e]">
                      <div
                        className="h-full bg-emerald-600 transition-all"
                        style={{ width: `${hpPct}%` }}
                      />
                    </div>
                    <span className="font-mono-tabular text-xs text-slate-300">
                      PV {hpCurrent}/{hpMax} ·{' '}
                      <strong className="text-amber-300">RD {rdValue}</strong>
                    </span>
                  </div>
                </div>

                {/* Atributos */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                  {ATTRIBUTE_KEYS.map((key) => {
                    const attr = summon.attributes[key];
                    const mod = resolveCalculableValue(attr.modifier);
                    return (
                      <div
                        key={key}
                        className="rounded border border-[#1e2332] bg-[#0d1018] p-2.5 text-center"
                      >
                        <div className="text-[11px] font-medium text-slate-400">
                          {key}
                        </div>
                        <input
                          type="number"
                          disabled={readOnly}
                          value={attr.value}
                          onChange={(e) =>
                            updateSummon(summon.id, (s) => ({
                              ...s,
                              attributes: {
                                ...s.attributes,
                                [key]: {
                                  ...attr,
                                  value: Number(e.target.value) || 0,
                                },
                              },
                            }))
                          }
                          className="mt-1 w-full rounded border border-[#242a3b] bg-[#0b0d14] px-1 py-0.5 text-center font-mono-tabular text-sm text-slate-100"
                        />
                        <div className="mt-1 font-mono-tabular text-xs text-indigo-300">
                          {mod >= 0 ? `+${mod}` : mod}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Ações (Simples e Complexas) + Características */}
                <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {/* AÇÕES */}
                  <div className="rounded border border-[#1e2332] bg-[#0d1018] p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#191e2b] pb-2">
                      <div className="flex items-center gap-2">
                        <Swords className="h-4 w-4 text-indigo-300" />
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-200">
                            Ações ({actions.length})
                          </h3>
                          <p className="text-[11px] text-slate-400">
                            Simples: {simpleActions.length} · Complexas: {complexActions.length}
                          </p>
                        </div>
                      </div>
                      {!readOnly && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              updateSummon(summon.id, (s) => ({
                                ...s,
                                actions: [...(s.actions ?? []), createNewAction('simples')],
                              }))
                            }
                            className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-200 hover:bg-emerald-500/20"
                          >
                            + Ação Simples
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateSummon(summon.id, (s) => ({
                                ...s,
                                actions: [...(s.actions ?? []), createNewAction('complexa')],
                              }))
                            }
                            className="rounded border border-indigo-500/40 bg-indigo-500/10 px-2 py-1 text-[11px] font-medium text-indigo-200 hover:bg-indigo-500/20"
                          >
                            + Ação Complexa
                          </button>
                        </div>
                      )}
                    </div>

                    {actions.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        Nenhuma ação registrada. Adicione ações simples ou complexas para este shikigami.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {actions.map((act) => (
                          <div
                            key={act.id}
                            className="space-y-2 rounded border border-[#212636] bg-[#11141e] p-3 text-xs"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                type="text"
                                disabled={readOnly}
                                placeholder="Nome da ação"
                                value={act.name}
                                onChange={(e) =>
                                  updateSummon(summon.id, (s) => ({
                                    ...s,
                                    actions: (s.actions ?? []).map((item) =>
                                      item.id === act.id
                                        ? { ...item, name: e.target.value }
                                        : item
                                    ),
                                  }))
                                }
                                className="min-w-36 flex-1 rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 font-semibold text-slate-100"
                              />
                              <select
                                disabled={readOnly}
                                value={act.complexity}
                                onChange={(e) =>
                                  updateSummon(summon.id, (s) => ({
                                    ...s,
                                    actions: (s.actions ?? []).map((item) =>
                                      item.id === act.id
                                        ? {
                                            ...item,
                                            complexity: e.target
                                              .value as ShikigamiActionComplexity,
                                          }
                                        : item
                                    ),
                                  }))
                                }
                                className={`rounded border px-2 py-1 text-[11px] font-medium ${
                                  act.complexity === 'simples'
                                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                                    : 'border-indigo-500/40 bg-indigo-500/10 text-indigo-200'
                                }`}
                              >
                                <option value="simples">Ação Simples</option>
                                <option value="complexa">Ação Complexa</option>
                              </select>
                              {!readOnly && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateSummon(summon.id, (s) => ({
                                      ...s,
                                      actions: (s.actions ?? []).filter(
                                        (item) => item.id !== act.id
                                      ),
                                    }))
                                  }
                                  title="Remover ação"
                                  className="rounded p-1 text-slate-500 hover:text-red-400"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                              <input
                                type="text"
                                disabled={readOnly}
                                placeholder="Execução (ex: Padrão)"
                                value={act.actionType}
                                onChange={(e) =>
                                  updateSummon(summon.id, (s) => ({
                                    ...s,
                                    actions: (s.actions ?? []).map((item) =>
                                      item.id === act.id
                                        ? { ...item, actionType: e.target.value }
                                        : item
                                    ),
                                  }))
                                }
                                className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-[11px] text-slate-200"
                              />
                              <input
                                type="text"
                                disabled={readOnly}
                                placeholder="Acerto (ex: +6)"
                                value={act.hitBonus}
                                onChange={(e) =>
                                  updateSummon(summon.id, (s) => ({
                                    ...s,
                                    actions: (s.actions ?? []).map((item) =>
                                      item.id === act.id
                                        ? { ...item, hitBonus: e.target.value }
                                        : item
                                    ),
                                  }))
                                }
                                className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 font-mono-tabular text-[11px] text-slate-200"
                              />
                              <input
                                type="text"
                                disabled={readOnly}
                                placeholder="Dano (ex: 2d8+4)"
                                value={act.damage}
                                onChange={(e) =>
                                  updateSummon(summon.id, (s) => ({
                                    ...s,
                                    actions: (s.actions ?? []).map((item) =>
                                      item.id === act.id
                                        ? { ...item, damage: e.target.value }
                                        : item
                                    ),
                                  }))
                                }
                                className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 font-mono-tabular text-[11px] text-slate-200"
                              />
                              <input
                                type="text"
                                disabled={readOnly}
                                placeholder="Crítico"
                                value={act.critical}
                                onChange={(e) =>
                                  updateSummon(summon.id, (s) => ({
                                    ...s,
                                    actions: (s.actions ?? []).map((item) =>
                                      item.id === act.id
                                        ? { ...item, critical: e.target.value }
                                        : item
                                    ),
                                  }))
                                }
                                className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-[11px] text-slate-200"
                              />
                              <input
                                type="text"
                                disabled={readOnly}
                                placeholder="Tipo de dano"
                                value={act.damageType}
                                onChange={(e) =>
                                  updateSummon(summon.id, (s) => ({
                                    ...s,
                                    actions: (s.actions ?? []).map((item) =>
                                      item.id === act.id
                                        ? { ...item, damageType: e.target.value }
                                        : item
                                    ),
                                  }))
                                }
                                className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-[11px] text-slate-200"
                              />
                              <input
                                type="text"
                                disabled={readOnly}
                                placeholder="Alcance"
                                value={act.range}
                                onChange={(e) =>
                                  updateSummon(summon.id, (s) => ({
                                    ...s,
                                    actions: (s.actions ?? []).map((item) =>
                                      item.id === act.id
                                        ? { ...item, range: e.target.value }
                                        : item
                                    ),
                                  }))
                                }
                                className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-[11px] text-slate-200"
                              />
                            </div>

                            <input
                              type="text"
                              disabled={readOnly}
                              placeholder="Efeitos adicionais, CD ou condições..."
                              value={act.effects}
                              onChange={(e) =>
                                updateSummon(summon.id, (s) => ({
                                  ...s,
                                  actions: (s.actions ?? []).map((item) =>
                                    item.id === act.id
                                      ? { ...item, effects: e.target.value }
                                      : item
                                  ),
                                }))
                              }
                              className="w-full rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-[11px] text-slate-200"
                            />
                            <textarea
                              rows={2}
                              disabled={readOnly}
                              placeholder="Descrição completa da ação..."
                              value={act.description}
                              onChange={(e) =>
                                updateSummon(summon.id, (s) => ({
                                  ...s,
                                  actions: (s.actions ?? []).map((item) =>
                                    item.id === act.id
                                      ? { ...item, description: e.target.value }
                                      : item
                                  ),
                                }))
                              }
                              className="w-full rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-[11px] text-slate-300"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* CARACTERÍSTICAS (PASSIVAS / PARTICULARIDADES / EFEITOS PERMANENTES) */}
                  <div className="rounded border border-[#1e2332] bg-[#0d1018] p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#191e2b] pb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-300" />
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-200">
                            Características ({characteristics.length})
                          </h3>
                          <p className="text-[11px] text-slate-400">
                            Passivas, particularidades, efeitos permanentes e propriedades inerentes.
                          </p>
                        </div>
                      </div>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() =>
                            updateSummon(summon.id, (s) => ({
                              ...s,
                              characteristics: [
                                ...(s.characteristics ?? []),
                                createNewCharacteristic(),
                              ],
                            }))
                          }
                          className="rounded border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-200 hover:bg-amber-500/20"
                        >
                          + Característica
                        </button>
                      )}
                    </div>

                    {characteristics.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        Nenhuma característica passiva ou propriedade inerente registrada.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {characteristics.map((chr) => (
                          <div
                            key={chr.id}
                            className="space-y-2 rounded border border-[#212636] bg-[#11141e] p-3 text-xs"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                type="text"
                                disabled={readOnly}
                                placeholder="Nome da característica"
                                value={chr.name}
                                onChange={(e) =>
                                  updateSummon(summon.id, (s) => ({
                                    ...s,
                                    characteristics: (s.characteristics ?? []).map(
                                      (item) =>
                                        item.id === chr.id
                                          ? { ...item, name: e.target.value }
                                          : item
                                    ),
                                  }))
                                }
                                className="min-w-36 flex-1 rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 font-semibold text-slate-100"
                              />
                              <select
                                disabled={readOnly}
                                value={chr.kind}
                                onChange={(e) =>
                                  updateSummon(summon.id, (s) => ({
                                    ...s,
                                    characteristics: (s.characteristics ?? []).map(
                                      (item) =>
                                        item.id === chr.id
                                          ? {
                                              ...item,
                                              kind: e.target
                                                .value as ShikigamiCharacteristicKind,
                                            }
                                          : item
                                    ),
                                  }))
                                }
                                className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-[11px] text-amber-200"
                              >
                                {(
                                  Object.keys(
                                    CHARACTERISTIC_KIND_LABELS
                                  ) as ShikigamiCharacteristicKind[]
                                ).map((k) => (
                                  <option key={k} value={k}>
                                    {CHARACTERISTIC_KIND_LABELS[k]}
                                  </option>
                                ))}
                              </select>
                              {!readOnly && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateSummon(summon.id, (s) => ({
                                      ...s,
                                      characteristics: (
                                        s.characteristics ?? []
                                      ).filter((item) => item.id !== chr.id),
                                    }))
                                  }
                                  title="Remover característica"
                                  className="rounded p-1 text-slate-500 hover:text-red-400"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>

                            <textarea
                              rows={2}
                              disabled={readOnly}
                              placeholder="Descrição do efeito passivo, particularidade ou propriedade..."
                              value={chr.description}
                              onChange={(e) =>
                                updateSummon(summon.id, (s) => ({
                                  ...s,
                                  characteristics: (s.characteristics ?? []).map(
                                    (item) =>
                                      item.id === chr.id
                                        ? { ...item, description: e.target.value }
                                        : item
                                  ),
                                }))
                              }
                              className="w-full rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-[11px] text-slate-300"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Resistências, Imunidades, Condições e Notas */}
                <div className="mt-4 grid grid-cols-1 gap-4 border-t border-[#1d2230] pt-4 md:grid-cols-2">
                  <div className="space-y-3 text-xs">
                    {/* Resistências do Shikigami */}
                    <div>
                      <span className="text-[11px] font-medium text-slate-400">
                        Resistências do Shikigami
                      </span>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {summon.resistances.map((res, idx) => (
                          <button
                            key={`${res}-${idx}`}
                            type="button"
                            disabled={readOnly}
                            onClick={() =>
                              updateSummon(summon.id, (s) => ({
                                ...s,
                                resistances: s.resistances.filter((_, i) => i !== idx),
                              }))
                            }
                            className="rounded border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-[11px] text-sky-200"
                          >
                            {res}
                            {readOnly ? '' : ' ×'}
                          </button>
                        ))}
                        {!readOnly && (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              placeholder="Nova resistência..."
                              value={newResistanceDraft[summon.id] ?? ''}
                              onChange={(e) =>
                                setNewResistanceDraft((prev) => ({
                                  ...prev,
                                  [summon.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = (newResistanceDraft[summon.id] ?? '').trim();
                                  if (val) {
                                    updateSummon(summon.id, (s) => ({
                                      ...s,
                                      resistances: [...s.resistances, val],
                                    }));
                                    setNewResistanceDraft((prev) => ({
                                      ...prev,
                                      [summon.id]: '',
                                    }));
                                  }
                                }
                              }}
                              className="w-36 rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-0.5 text-[11px] text-slate-200"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const val = (newResistanceDraft[summon.id] ?? '').trim();
                                if (!val) return;
                                updateSummon(summon.id, (s) => ({
                                  ...s,
                                  resistances: [...s.resistances, val],
                                }));
                                setNewResistanceDraft((prev) => ({
                                  ...prev,
                                  [summon.id]: '',
                                }));
                              }}
                              className="rounded border border-[#242a3b] bg-[#0d1018] px-2 py-0.5 text-[11px] text-slate-300 hover:bg-[#171b28]"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Imunidades do Shikigami */}
                    <div>
                      <span className="text-[11px] font-medium text-slate-400">
                        Imunidades do Shikigami
                      </span>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {summon.immunities.map((imm, idx) => (
                          <button
                            key={`${imm}-${idx}`}
                            type="button"
                            disabled={readOnly}
                            onClick={() =>
                              updateSummon(summon.id, (s) => ({
                                ...s,
                                immunities: s.immunities.filter((_, i) => i !== idx),
                              }))
                            }
                            className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-200"
                          >
                            {imm}
                            {readOnly ? '' : ' ×'}
                          </button>
                        ))}
                        {!readOnly && (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              placeholder="Nova imunidade..."
                              value={newImmunityDraft[summon.id] ?? ''}
                              onChange={(e) =>
                                setNewImmunityDraft((prev) => ({
                                  ...prev,
                                  [summon.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = (newImmunityDraft[summon.id] ?? '').trim();
                                  if (val) {
                                    updateSummon(summon.id, (s) => ({
                                      ...s,
                                      immunities: [...s.immunities, val],
                                    }));
                                    setNewImmunityDraft((prev) => ({
                                      ...prev,
                                      [summon.id]: '',
                                    }));
                                  }
                                }
                              }}
                              className="w-36 rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-0.5 text-[11px] text-slate-200"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const val = (newImmunityDraft[summon.id] ?? '').trim();
                                if (!val) return;
                                updateSummon(summon.id, (s) => ({
                                  ...s,
                                  immunities: [...s.immunities, val],
                                }));
                                setNewImmunityDraft((prev) => ({
                                  ...prev,
                                  [summon.id]: '',
                                }));
                              }}
                              className="rounded border border-[#242a3b] bg-[#0d1018] px-2 py-0.5 text-[11px] text-slate-300 hover:bg-[#171b28]"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Condições */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-medium text-slate-400">
                        Condições:
                      </span>
                      {(summon.conditions ?? []).map((cond) => (
                        <button
                          key={cond}
                          type="button"
                          disabled={readOnly}
                          onClick={() =>
                            updateSummon(summon.id, (s) => ({
                              ...s,
                              conditions: (s.conditions ?? []).filter(
                                (c) => c !== cond
                              ),
                            }))
                          }
                          className="rounded border border-red-500/40 bg-red-500/15 px-1.5 py-0.5 text-[11px] text-red-200"
                        >
                          {cond}
                          {readOnly ? '' : ' ×'}
                        </button>
                      ))}
                      {!readOnly && (
                        <select
                          defaultValue=""
                          aria-label="Adicionar condição no shikigami"
                          onChange={(e) => {
                            const cond = e.target.value as SimpleConditionKey;
                            const current = summon.conditions ?? [];
                            if (cond && !current.includes(cond)) {
                              updateSummon(summon.id, (s) => ({
                                ...s,
                                conditions: [...current, cond],
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

                  <label className="flex flex-col gap-1 text-xs text-slate-400">
                    Notas do Shikigami
                    <textarea
                      rows={3}
                      disabled={readOnly}
                      placeholder="Observações, custos de invocação ou regras específicas..."
                      value={summon.notes}
                      onChange={(e) =>
                        updateSummon(summon.id, (s) => ({
                          ...s,
                          notes: e.target.value,
                        }))
                      }
                      className="rounded border border-[#242a3b] bg-[#0b0d14] px-3 py-1.5 text-xs text-slate-200"
                    />
                  </label>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
