import { Plus, Trash2 } from 'lucide-react';
import type { AttributeKey, FichaPersonagem, SummonEntry } from '../../types/character';
import { createCalculableField, resolveCalculableValue } from '../../utils/calculations';
import { CalculableValueControl } from '../CalculableValueControl';

interface SummonsTabProps {
  sheet: FichaPersonagem;
  onUpdate: (updater: (prev: FichaPersonagem) => FichaPersonagem) => void;
  readOnly: boolean;
}

const ATTRIBUTE_KEYS: AttributeKey[] = ['FOR', 'DEX', 'CON', 'INT', 'SAB', 'PRE'];

function createNewSummon(): SummonEntry {
  return {
    id: `sum-${Date.now()}`,
    name: 'Nova Invocação',
    grade: 'Terceiro Grau',
    summonType: 'Shikigami',
    isActive: true,
    summonCostPE: createCalculableField(2),
    upkeepCostPE: 0,
    level: createCalculableField(1),
    hp: {
      current: createCalculableField(20),
      max: createCalculableField(20),
      temp: 0,
      lost: 0,
    },
    pe: {
      current: createCalculableField(6),
      max: createCalculableField(6),
    },
    defense: createCalculableField(15),
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
    attacks: [],
    abilities: [],
    damageReduction: createCalculableField(0),
    resistances: [],
    immunities: [],
    notes: '',
  };
}

export function SummonsTab({ sheet, onUpdate, readOnly }: SummonsTabProps) {
  const updateSummon = (id: string, patch: Partial<SummonEntry>) => {
    onUpdate((prev) => ({
      ...prev,
      summons: prev.summons.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[#212636] bg-[#11141e] p-5">
        <div>
          <h2 className="text-base font-semibold text-slate-100">
            Invocações e Shikigamis ({sheet.summons.length})
          </h2>
          <p className="text-xs text-slate-400">
            Cada invocação possui atributos, recursos e ataques independentes.
          </p>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() =>
              onUpdate((prev) => ({
                ...prev,
                summons: [...prev.summons, createNewSummon()],
              }))
            }
            className="inline-flex items-center gap-1.5 rounded border border-indigo-500/50 bg-indigo-600/20 px-3.5 py-2 text-xs font-medium text-indigo-100 hover:bg-indigo-600/30 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            Nova Invocação
          </button>
        )}
      </div>

      {sheet.summons.length === 0 ? (
        <div className="rounded-lg border border-[#212636] bg-[#11141e] p-8 text-center">
          <p className="text-sm text-slate-300">
            Nenhuma invocação registrada nesta ficha.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Adicione um shikigami ou companheiro amaldiçoado para acompanhar PV, PE e ataques em combate.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sheet.summons.map((summon) => (
            <section
              key={summon.id}
              className="rounded-lg border border-[#212636] bg-[#11141e] p-5"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-[#1d2230] pb-3">
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    disabled={readOnly}
                    value={summon.name}
                    onChange={(e) =>
                      updateSummon(summon.id, { name: e.target.value })
                    }
                    className="rounded border border-[#242a3b] bg-[#0b0d14] px-3 py-1.5 text-sm font-semibold text-slate-100"
                  />
                  <input
                    type="text"
                    disabled={readOnly}
                    value={summon.grade}
                    onChange={(e) =>
                      updateSummon(summon.id, { grade: e.target.value })
                    }
                    className="w-36 rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1.5 text-xs text-slate-300"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <CalculableValueControl
                    label="PV Atual"
                    field={summon.hp.current}
                    readOnly={readOnly}
                    size="sm"
                    onChange={(current) =>
                      updateSummon(summon.id, {
                        hp: { ...summon.hp, current },
                      })
                    }
                  />
                  <CalculableValueControl
                    label="PV Máx"
                    field={summon.hp.max}
                    readOnly={readOnly}
                    size="sm"
                    onChange={(max) =>
                      updateSummon(summon.id, {
                        hp: { ...summon.hp, max },
                      })
                    }
                  />
                  <CalculableValueControl
                    label="Defesa"
                    field={summon.defense}
                    readOnly={readOnly}
                    size="sm"
                    onChange={(defense) =>
                      updateSummon(summon.id, { defense })
                    }
                  />
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdate((prev) => ({
                          ...prev,
                          summons: prev.summons.filter((s) => s.id !== summon.id),
                        }))
                      }
                      title="Excluir invocação"
                      className="rounded p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

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
                          updateSummon(summon.id, {
                            attributes: {
                              ...summon.attributes,
                              [key]: {
                                ...attr,
                                value: Number(e.target.value) || 0,
                              },
                            },
                          })
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

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded border border-[#1e2332] bg-[#0d1018] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300">
                      Ataques
                    </span>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() =>
                          updateSummon(summon.id, {
                            attacks: [
                              ...summon.attacks,
                              {
                                id: `sum-atk-${Date.now()}`,
                                name: 'Ataque',
                                hitBonus: createCalculableField(5),
                                damage: '1d8+2',
                                critical: '20',
                                damageType: 'Impacto',
                                range: 'Corpo a Corpo',
                                notes: '',
                              },
                            ],
                          })
                        }
                        className="text-xs text-indigo-300 hover:text-indigo-200"
                      >
                        + Ataque
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {summon.attacks.map((atk) => (
                      <div
                        key={atk.id}
                        className="flex items-center justify-between gap-2 border-b border-[#191e2b] pb-1"
                      >
                        <span className="text-slate-200">{atk.name}</span>
                        <span className="font-mono-tabular text-slate-400">
                          +{resolveCalculableValue(atk.hitBonus)} · {atk.damage}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <label className="flex flex-col gap-1 text-xs text-slate-400">
                  Notas da Invocação
                  <textarea
                    rows={3}
                    disabled={readOnly}
                    value={summon.notes}
                    onChange={(e) =>
                      updateSummon(summon.id, { notes: e.target.value })
                    }
                    className="rounded border border-[#242a3b] bg-[#0b0d14] px-3 py-2 text-xs text-slate-200"
                  />
                </label>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
