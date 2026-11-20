import { useMemo, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import type {
  AttributeKey,
  BleedingSeverity,
  DamageTypeKey,
  FichaPersonagem,
  FreezingSeverity,
  ProficiencyRollEntry,
  SimpleConditionKey,
} from '../../types/character';
import { resolveCalculableValue } from '../../utils/calculations';
import { CalculableValueControl } from '../CalculableValueControl';

interface PersonalSheetTabProps {
  sheet: FichaPersonagem;
  onUpdate: (updater: (prev: FichaPersonagem) => FichaPersonagem) => void;
  readOnly: boolean;
}

const ATTRIBUTE_KEYS: AttributeKey[] = ['FOR', 'DEX', 'CON', 'INT', 'SAB', 'PRE'];

export function PersonalSheetTab({
  sheet,
  onUpdate,
  readOnly,
}: PersonalSheetTabProps) {
  const [skillSearch, setSkillSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState<'all' | 'trained'>('all');

  const hpCurrent = resolveCalculableValue(sheet.vitals.hp.current);
  const hpMax = resolveCalculableValue(sheet.vitals.hp.max);
  const hpPct = resolveCalculableValue(sheet.vitals.hp.percentage);

  const peCurrent = resolveCalculableValue(sheet.vitals.pe.current);
  const peMax = resolveCalculableValue(sheet.vitals.pe.max);
  const pePct = resolveCalculableValue(sheet.vitals.pe.percentage);

  const erCurrent = resolveCalculableValue(sheet.vitals.er.current);
  const erMax = resolveCalculableValue(sheet.vitals.er.max);
  const erPct = resolveCalculableValue(sheet.vitals.er.percentage);

  const sanCurrent = resolveCalculableValue(sheet.vitals.sanity.current);
  const sanMax = resolveCalculableValue(sheet.vitals.sanity.max);
  const sanPct = resolveCalculableValue(sheet.vitals.sanity.percentage);

  const intCurrent = resolveCalculableValue(sheet.vitals.integrity.current);
  const intMax = resolveCalculableValue(sheet.vitals.integrity.max);
  const intPct = resolveCalculableValue(sheet.vitals.integrity.percentage);

  const filteredSkills = useMemo(() => {
    return sheet.skills.filter((skill) => {
      const matchesQuery = skill.name
        .toLowerCase()
        .includes(skillSearch.trim().toLowerCase());
      const matchesTrained = skillFilter === 'all' || skill.trained;
      return matchesQuery && matchesTrained;
    });
  }, [sheet.skills, skillSearch, skillFilter]);

  const updateProficiencyRow = (
    listKey: 'skills' | 'savingThrows' | 'attacks',
    rowId: string,
    patch: Partial<ProficiencyRollEntry>
  ) => {
    if (readOnly) return;
    onUpdate((prev) => ({
      ...prev,
      [listKey]: prev[listKey].map((item) =>
        item.id === rowId ? { ...item, ...patch } : item
      ),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Resumo Rápido de Combate (KPI Strip) */}
      <section className="grid grid-cols-2 divide-y divide-[#1d2230] rounded-lg border border-[#212636] bg-[#11141e] sm:grid-cols-3 lg:grid-cols-6 lg:divide-x lg:divide-y-0">
        <div className="p-4">
          <div className="text-xs text-slate-400">Pontos de Vida</div>
          <div className="mt-1 font-mono-tabular text-xl font-bold text-emerald-400">
            {hpCurrent} <span className="text-sm font-normal text-slate-400">/ {hpMax}</span>
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-400">Energia (PE)</div>
          <div className="mt-1 font-mono-tabular text-xl font-bold text-indigo-300">
            {peCurrent} <span className="text-sm font-normal text-slate-400">/ {peMax}</span>
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-400">Defesa Total</div>
          <div className="mt-1 font-mono-tabular text-xl font-bold text-slate-100">
            {resolveCalculableValue(sheet.defense.total)}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-400">CD Especialização</div>
          <div className="mt-1 font-mono-tabular text-xl font-bold text-slate-100">
            {resolveCalculableValue(sheet.derived.cdSpecialization.total)}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-400">Iniciativa / Atenção</div>
          <div className="mt-1 font-mono-tabular text-xl font-bold text-slate-100">
            +{resolveCalculableValue(sheet.derived.initiative.total)}{' '}
            <span className="text-sm font-normal text-slate-400">
              / {resolveCalculableValue(sheet.derived.attention.total)}
            </span>
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-400">Deslocamento</div>
          <div className="mt-1 font-mono-tabular text-xl font-bold text-slate-100">
            {resolveCalculableValue(sheet.derived.movement.total)}m
          </div>
        </div>
      </section>

      {/* Identidade e Progressão */}
      <section className="rounded-lg border border-[#212636] bg-[#11141e] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-[#1d2230] pb-3">
          <h2 className="text-base font-semibold text-slate-100">
            Identidade e Progressão
          </h2>
          <div className="flex flex-wrap items-center gap-6">
            <CalculableValueControl
              label="Nível Total"
              field={sheet.identity.level}
              onChange={(level) =>
                onUpdate((prev) => ({
                  ...prev,
                  identity: { ...prev.identity, level },
                }))
              }
              readOnly={readOnly}
              size="sm"
            />
            <CalculableValueControl
              label="Treinamento"
              field={sheet.identity.trainingBonus}
              onChange={(trainingBonus) =>
                onUpdate((prev) => ({
                  ...prev,
                  identity: { ...prev.identity, trainingBonus },
                }))
              }
              signed
              readOnly={readOnly}
              size="sm"
            />
            <CalculableValueControl
              label="Experiência"
              field={sheet.identity.experience}
              onChange={(experience) =>
                onUpdate((prev) => ({
                  ...prev,
                  identity: { ...prev.identity, experience },
                }))
              }
              readOnly={readOnly}
              size="sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Nome do Personagem
            <input
              type="text"
              disabled={readOnly}
              value={sheet.identity.name}
              onChange={(e) =>
                onUpdate((prev) => ({
                  ...prev,
                  identity: { ...prev.identity, name: e.target.value },
                }))
              }
              className="rounded border border-[#242a3b] bg-[#0b0d14] px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none disabled:opacity-60"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Jogador
            <input
              type="text"
              disabled={readOnly}
              value={sheet.identity.player}
              onChange={(e) =>
                onUpdate((prev) => ({
                  ...prev,
                  identity: { ...prev.identity, player: e.target.value },
                }))
              }
              className="rounded border border-[#242a3b] bg-[#0b0d14] px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none disabled:opacity-60"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Campanha
            <input
              type="text"
              disabled={readOnly}
              value={sheet.identity.campaign}
              onChange={(e) =>
                onUpdate((prev) => ({
                  ...prev,
                  identity: { ...prev.identity, campaign: e.target.value },
                }))
              }
              className="rounded border border-[#242a3b] bg-[#0b0d14] px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none disabled:opacity-60"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Origem
            <select
              disabled={readOnly}
              value={sheet.identity.origin}
              onChange={(e) =>
                onUpdate((prev) => ({
                  ...prev,
                  identity: { ...prev.identity, origin: e.target.value },
                }))
              }
              className="rounded border border-[#242a3b] bg-[#0b0d14] px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none disabled:opacity-60"
            >
              <option value="">Selecionar...</option>
              <option value="Inato">Inato</option>
              <option value="Herdado">Herdado</option>
              <option value="Derivado">Derivado</option>
              <option value="Restrito">Restrito</option>
              <option value="Feto Amaldiçoado">Feto Amaldiçoado</option>
              <option value="Sem Técnica">Sem Técnica</option>
              <option value="Corpo Amaldiçoado">Corpo Amaldiçoado</option>
            </select>
          </label>

          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1 text-xs text-slate-400">
              Especialização
              <input
                type="text"
                disabled={readOnly}
                value={sheet.identity.specialization}
                onChange={(e) =>
                  onUpdate((prev) => ({
                    ...prev,
                    identity: { ...prev.identity, specialization: e.target.value },
                  }))
                }
                className="rounded border border-[#242a3b] bg-[#0b0d14] px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none disabled:opacity-60"
              />
            </label>
            <label className="flex w-20 flex-col gap-1 text-xs text-slate-400">
              Nvl
              <input
                type="number"
                min={0}
                max={20}
                disabled={readOnly}
                value={sheet.identity.specializationLevel}
                onChange={(e) =>
                  onUpdate((prev) => ({
                    ...prev,
                    identity: {
                      ...prev.identity,
                      specializationLevel: Number(e.target.value) || 0,
                    },
                  }))
                }
                className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-2 text-right font-mono-tabular text-sm text-slate-100 focus:border-indigo-500 focus:outline-none disabled:opacity-60"
              />
            </label>
          </div>

          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1 text-xs text-slate-400">
              Multiclasse
              <input
                type="text"
                disabled={readOnly}
                value={sheet.identity.multiclass}
                onChange={(e) =>
                  onUpdate((prev) => ({
                    ...prev,
                    identity: { ...prev.identity, multiclass: e.target.value },
                  }))
                }
                className="rounded border border-[#242a3b] bg-[#0b0d14] px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none disabled:opacity-60"
              />
            </label>
            <label className="flex w-20 flex-col gap-1 text-xs text-slate-400">
              Nvl
              <input
                type="number"
                min={0}
                max={20}
                disabled={readOnly}
                value={sheet.identity.multiclassLevel}
                onChange={(e) =>
                  onUpdate((prev) => ({
                    ...prev,
                    identity: {
                      ...prev.identity,
                      multiclassLevel: Number(e.target.value) || 0,
                    },
                  }))
                }
                className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-2 text-right font-mono-tabular text-sm text-slate-100 focus:border-indigo-500 focus:outline-none disabled:opacity-60"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Grau
            <select
              disabled={readOnly}
              value={resolveCalculableValue(sheet.identity.grade)}
              onChange={(e) => {
                const nextGrade = e.target.value;
                onUpdate((prev) => ({
                  ...prev,
                  identity: {
                    ...prev.identity,
                    grade: nextGrade
                      ? {
                          ...prev.identity.grade,
                          sobrescritaManual: nextGrade,
                          usarManual: true,
                        }
                      : {
                          valorCalculado: '',
                          usarManual: false,
                        },
                  },
                }));
              }}
              className="rounded border border-[#242a3b] bg-[#0b0d14] px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none disabled:opacity-60"
            >
              <option value="">Selecionar...</option>
              <option value="Quarto Grau">Quarto Grau</option>
              <option value="Terceiro Grau">Terceiro Grau</option>
              <option value="Segundo Grau">Segundo Grau</option>
              <option value="Semi-Primeiro Grau">Semi-Primeiro Grau</option>
              <option value="Primeiro Grau">Primeiro Grau</option>
              <option value="Grau Especial">Grau Especial</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Técnica Amaldiçoada
            <input
              type="text"
              disabled={readOnly}
              value={sheet.identity.techniqueName}
              onChange={(e) =>
                onUpdate((prev) => ({
                  ...prev,
                  identity: { ...prev.identity, techniqueName: e.target.value },
                  cursedProfile: {
                    ...prev.cursedProfile,
                    techniqueName: e.target.value,
                  },
                }))
              }
              className="rounded border border-[#242a3b] bg-[#0b0d14] px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none disabled:opacity-60"
            />
          </label>
        </div>
      </section>

      {/* Grade Principal: Atributos + Recursos Vitais + Defesa */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Atributos */}
        <section className="rounded-lg border border-[#212636] bg-[#11141e] p-5 lg:col-span-4">
          <h2 className="mb-4 border-b border-[#1d2230] pb-2 text-base font-semibold text-slate-100">
            Atributos
          </h2>
          <div className="space-y-3">
            {ATTRIBUTE_KEYS.map((key) => {
              const attr = sheet.attributes[key];
              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-3 border-b border-[#191e2b] pb-2.5 last:border-b-0 last:pb-0"
                >
                  <div>
                    <div className="text-sm font-medium text-slate-100">
                      {attr.label}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                      <span>Base</span>
                      <span className="font-mono-tabular text-slate-400">
                        + Bônus
                      </span>
                      <input
                        type="number"
                        disabled={readOnly}
                        aria-label={`Bônus externo de ${attr.label}`}
                        value={attr.bonusValue}
                        onChange={(e) => {
                          const nextBonus = Number(e.target.value) || 0;
                          onUpdate((prev) => ({
                            ...prev,
                            attributes: {
                              ...prev.attributes,
                              [key]: { ...prev.attributes[key], bonusValue: nextBonus },
                            },
                          }));
                        }}
                        className="w-12 rounded border border-[#242a3b] bg-[#0b0d14] px-1 py-0.5 text-right font-mono-tabular text-[11px] text-slate-200 focus:border-indigo-500 focus:outline-none disabled:opacity-60"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      disabled={readOnly}
                      aria-label={`Valor base de ${attr.label}`}
                      value={attr.baseValue}
                      onChange={(e) => {
                        const nextBase = Number(e.target.value) || 0;
                        onUpdate((prev) => ({
                          ...prev,
                          attributes: {
                            ...prev.attributes,
                            [key]: { ...prev.attributes[key], baseValue: nextBase },
                          },
                        }));
                      }}
                      className="w-16 rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-right font-mono-tabular text-sm text-slate-100 focus:border-indigo-500 focus:outline-none disabled:opacity-60"
                    />
                    <CalculableValueControl
                      field={attr.modifier}
                      signed
                      readOnly={readOnly}
                      size="sm"
                      onChange={(modifier) =>
                        onUpdate((prev) => ({
                          ...prev,
                          attributes: {
                            ...prev.attributes,
                            [key]: { ...prev.attributes[key], modifier },
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Pontos de Vida, Extra v2.5, Energia, ER, Sanidade e Integridade */}
        <section className="rounded-lg border border-[#212636] bg-[#11141e] p-5 lg:col-span-5">
          <h2 className="mb-4 border-b border-[#1d2230] pb-2 text-base font-semibold text-slate-100">
            Pontos de Vida, Energia e Integridade
          </h2>
          <div className="space-y-4">
            {/* PV */}
            <div className="space-y-2 border-b border-[#1d2230] pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-sm font-semibold text-slate-100">
                    Pontos de Vida (PV)
                  </span>
                  <span className="ml-2 font-mono-tabular text-xs text-slate-400">
                    {hpCurrent} / {hpMax} ({hpPct}%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CalculableValueControl
                    label="Atual"
                    field={sheet.vitals.hp.current}
                    readOnly={readOnly}
                    size="sm"
                    onChange={(current) =>
                      onUpdate((prev) => ({
                        ...prev,
                        vitals: {
                          ...prev.vitals,
                          hp: { ...prev.vitals.hp, current },
                        },
                      }))
                    }
                  />
                  <CalculableValueControl
                    label="Máximo"
                    field={sheet.vitals.hp.max}
                    readOnly={readOnly}
                    size="sm"
                    onChange={(max) =>
                      onUpdate((prev) => ({
                        ...prev,
                        vitals: {
                          ...prev.vitals,
                          hp: { ...prev.vitals.hp, max },
                        },
                      }))
                    }
                  />
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded bg-[#0b0d14]">
                <div
                  className="h-full bg-emerald-600 transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, hpPct))}%` }}
                />
              </div>
              <div className="grid grid-cols-4 gap-2 pt-1">
                {(
                  [
                    ['lost', 'Perdido'],
                    ['healed', 'Curado'],
                    ['temp', 'Temp.'],
                    ['other', 'Outros'],
                  ] as const
                ).map(([fieldKey, lbl]) => (
                  <label key={fieldKey} className="flex flex-col gap-1 text-[11px] text-slate-400">
                    {lbl}
                    <input
                      type="number"
                      disabled={readOnly}
                      value={sheet.vitals.hp[fieldKey]}
                      onChange={(e) =>
                        onUpdate((prev) => ({
                          ...prev,
                          vitals: {
                            ...prev.vitals,
                            hp: {
                              ...prev.vitals.hp,
                              [fieldKey]: Number(e.target.value) || 0,
                            },
                          },
                        }))
                      }
                      className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-right font-mono-tabular text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                    />
                  </label>
                ))}
              </div>

              {/* Bloco EXTRA (Kamo, Robustez, Des. Exa., Vigor Inf.) */}
              <div className="mt-2 flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-300">
                <span className="text-[11px] font-medium text-slate-500">Extra:</span>
                {(
                  [
                    ['kamo', 'Kamo'],
                    ['robustez', 'Robustez'],
                    ['desExa', 'Des. Exa.'],
                    ['vigorInf', 'Vigor Inf.'],
                  ] as const
                ).map(([flagKey, lbl]) => (
                  <label key={flagKey} className="inline-flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      disabled={readOnly}
                      checked={sheet.vitals.hp.flags[flagKey]}
                      onChange={(e) =>
                        onUpdate((prev) => ({
                          ...prev,
                          vitals: {
                            ...prev.vitals,
                            hp: {
                              ...prev.vitals.hp,
                              flags: {
                                ...prev.vitals.hp.flags,
                                [flagKey]: e.target.checked,
                              },
                            },
                          },
                        }))
                      }
                      className="h-3.5 w-3.5 accent-indigo-500"
                    />
                    {lbl}
                  </label>
                ))}
              </div>
            </div>

            {/* PE */}
            <div className="space-y-2 border-b border-[#1d2230] pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-sm font-semibold text-slate-100">
                    Energia Amaldiçoada (PE)
                  </span>
                  <span className="ml-2 font-mono-tabular text-xs text-slate-400">
                    {peCurrent} / {peMax} ({pePct}%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CalculableValueControl
                    label="Atual"
                    field={sheet.vitals.pe.current}
                    readOnly={readOnly}
                    size="sm"
                    onChange={(current) =>
                      onUpdate((prev) => ({
                        ...prev,
                        vitals: {
                          ...prev.vitals,
                          pe: { ...prev.vitals.pe, current },
                        },
                      }))
                    }
                  />
                  <CalculableValueControl
                    label="Máximo"
                    field={sheet.vitals.pe.max}
                    readOnly={readOnly}
                    size="sm"
                    onChange={(max) =>
                      onUpdate((prev) => ({
                        ...prev,
                        vitals: {
                          ...prev.vitals,
                          pe: { ...prev.vitals.pe, max },
                        },
                      }))
                    }
                  />
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded bg-[#0b0d14]">
                <div
                  className="h-full bg-indigo-500 transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, pePct))}%` }}
                />
              </div>
              <div className="grid grid-cols-4 gap-2 pt-1">
                {(
                  [
                    ['lost', 'Perdido'],
                    ['healed', 'Curado'],
                    ['temp', 'Temp.'],
                    ['other', 'Outros'],
                  ] as const
                ).map(([fieldKey, lbl]) => (
                  <label key={fieldKey} className="flex flex-col gap-1 text-[11px] text-slate-400">
                    {lbl}
                    <input
                      type="number"
                      disabled={readOnly}
                      value={sheet.vitals.pe[fieldKey]}
                      onChange={(e) =>
                        onUpdate((prev) => ({
                          ...prev,
                          vitals: {
                            ...prev.vitals,
                            pe: {
                              ...prev.vitals.pe,
                              [fieldKey]: Number(e.target.value) || 0,
                            },
                          },
                        }))
                      }
                      className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-right font-mono-tabular text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                    />
                  </label>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-slate-300">
                <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                  Atributo PE:
                  <select
                    disabled={readOnly}
                    value={sheet.vitals.pe.attribute}
                    onChange={(e) =>
                      onUpdate((prev) => ({
                        ...prev,
                        vitals: {
                          ...prev.vitals,
                          pe: {
                            ...prev.vitals.pe,
                            attribute: e.target.value as AttributeKey | 'N/A',
                          },
                        },
                      }))
                    }
                    className="rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-0.5 text-xs text-slate-100"
                  >
                    <option value="N/A">N/A</option>
                    {ATTRIBUTE_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      disabled={readOnly}
                      checked={sheet.vitals.pe.endlessEnergy}
                      onChange={(e) =>
                        onUpdate((prev) => ({
                          ...prev,
                          vitals: {
                            ...prev.vitals,
                            pe: {
                              ...prev.vitals.pe,
                              endlessEnergy: e.target.checked,
                            },
                          },
                        }))
                      }
                      className="h-3.5 w-3.5 accent-indigo-500"
                    />
                    E. Inacabável
                  </label>
                  <label className="inline-flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      disabled={readOnly}
                      checked={sheet.vitals.pe.masteryBonus}
                      onChange={(e) =>
                        onUpdate((prev) => ({
                          ...prev,
                          vitals: {
                            ...prev.vitals,
                            pe: {
                              ...prev.vitals.pe,
                              masteryBonus: e.target.checked,
                            },
                          },
                        }))
                      }
                      className="h-3.5 w-3.5 accent-indigo-500"
                    />
                    B. Maestria
                  </label>
                </div>
              </div>
            </div>

            {/* ER, Sanidade e Integridade */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded border border-[#1e2332] bg-[#0d1018] p-2.5">
                <div className="text-xs text-slate-400">Energia Reversa</div>
                <div className="mt-1 font-mono-tabular text-sm font-semibold text-slate-100">
                  {erCurrent} / {erMax} ({erPct}%)
                </div>
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Máx.</span>
                    <CalculableValueControl
                      field={sheet.vitals.er.max}
                      readOnly={readOnly}
                      size="sm"
                      onChange={(max) =>
                        onUpdate((prev) => ({
                          ...prev,
                          vitals: {
                            ...prev.vitals,
                            er: { ...prev.vitals.er, max },
                          },
                        }))
                      }
                    />
                  </div>
                  <label className="flex items-center justify-between text-[11px] text-slate-400">
                    Perdido
                    <input
                      type="number"
                      disabled={readOnly}
                      value={sheet.vitals.er.lost}
                      onChange={(e) =>
                        onUpdate((prev) => ({
                          ...prev,
                          vitals: {
                            ...prev.vitals,
                            er: { ...prev.vitals.er, lost: Number(e.target.value) || 0 },
                          },
                        }))
                      }
                      className="w-14 rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-0.5 text-right font-mono-tabular text-xs text-slate-100"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded border border-[#1e2332] bg-[#0d1018] p-2.5">
                <div className="text-xs text-slate-400">Sanidade</div>
                <div className="mt-1 font-mono-tabular text-sm font-semibold text-slate-100">
                  {sanCurrent} / {sanMax} ({sanPct}%)
                </div>
                <div className="mt-2 space-y-1.5">
                  <label className="flex items-center justify-between text-[11px] text-slate-400">
                    Máximo
                    <input
                      type="number"
                      min={0}
                      disabled={readOnly}
                      value={resolveCalculableValue(sheet.vitals.sanity.max)}
                      onChange={(e) => {
                        const nextMax = Math.max(0, Number(e.target.value) || 0);
                        onUpdate((prev) => ({
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
                      className="w-14 rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-0.5 text-right font-mono-tabular text-xs text-slate-100"
                    />
                  </label>
                  <label className="flex items-center justify-between text-[11px] text-slate-400">
                    Perdido
                    <input
                      type="number"
                      disabled={readOnly}
                      value={sheet.vitals.sanity.lost}
                      onChange={(e) =>
                        onUpdate((prev) => ({
                          ...prev,
                          vitals: {
                            ...prev.vitals,
                            sanity: {
                              ...prev.vitals.sanity,
                              lost: Number(e.target.value) || 0,
                            },
                          },
                        }))
                      }
                      className="w-14 rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-0.5 text-right font-mono-tabular text-xs text-slate-100"
                    />
                  </label>
                  <label className="flex items-center justify-between text-[11px] text-slate-400">
                    Recup.
                    <input
                      type="number"
                      disabled={readOnly}
                      value={sheet.vitals.sanity.recovered}
                      onChange={(e) =>
                        onUpdate((prev) => ({
                          ...prev,
                          vitals: {
                            ...prev.vitals,
                            sanity: {
                              ...prev.vitals.sanity,
                              recovered: Number(e.target.value) || 0,
                            },
                          },
                        }))
                      }
                      className="w-14 rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-0.5 text-right font-mono-tabular text-xs text-slate-100"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded border border-[#1e2332] bg-[#0d1018] p-2.5">
                <div className="text-xs text-slate-400">Integridade</div>
                <div className="mt-1 font-mono-tabular text-sm font-semibold text-slate-100">
                  {intCurrent} / {intMax} ({intPct}%)
                </div>
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between gap-1 text-[11px] text-slate-400">
                    <span>Estado:</span>
                    <input
                      type="text"
                      disabled={readOnly}
                      placeholder="Saudável..."
                      value={sheet.vitals.integrity.currentState}
                      onChange={(e) =>
                        onUpdate((prev) => ({
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
                      className="w-20 rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-0.5 text-right text-xs text-slate-100"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                    <label className="flex items-center gap-1">
                      RD
                      <input
                        type="number"
                        min={0}
                        disabled={readOnly}
                        value={sheet.vitals.integrity.rd}
                        onChange={(e) =>
                          onUpdate((prev) => ({
                            ...prev,
                            vitals: {
                              ...prev.vitals,
                              integrity: {
                                ...prev.vitals.integrity,
                                rd: Number(e.target.value) || 0,
                              },
                            },
                          }))
                        }
                        className="w-11 rounded border border-[#242a3b] bg-[#0b0d14] px-1 py-0.5 text-right font-mono-tabular text-xs text-slate-100"
                      />
                    </label>
                    <label className="flex items-center gap-1">
                      Perd.
                      <input
                        type="number"
                        min={0}
                        disabled={readOnly}
                        value={sheet.vitals.integrity.lost}
                        onChange={(e) =>
                          onUpdate((prev) => ({
                            ...prev,
                            vitals: {
                              ...prev.vitals,
                              integrity: {
                                ...prev.vitals.integrity,
                                lost: Number(e.target.value) || 0,
                              },
                            },
                          }))
                        }
                        className="w-11 rounded border border-[#242a3b] bg-[#0b0d14] px-1 py-0.5 text-right font-mono-tabular text-xs text-slate-100"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Defesa, Derivados, Testes de Morte e Dados de Vida */}
        <section className="rounded-lg border border-[#212636] bg-[#11141e] p-5 lg:col-span-3">
          <div className="mb-3 flex items-center justify-between border-b border-[#1d2230] pb-2">
            <h2 className="text-base font-semibold text-slate-100">Defesa</h2>
            <CalculableValueControl
              field={sheet.defense.total}
              signed
              readOnly={readOnly}
              size="lg"
              onChange={(total) =>
                onUpdate((prev) => ({
                  ...prev,
                  defense: { ...prev.defense, total },
                }))
              }
            />
          </div>

          <div className="space-y-2 border-b border-[#1d2230] pb-4">
            {sheet.defense.components.map((comp) => (
              <div
                key={comp.id}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="text-slate-300">{comp.label}</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    disabled={readOnly}
                    value={comp.bonus}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      onUpdate((prev) => ({
                        ...prev,
                        defense: {
                          ...prev.defense,
                          components: prev.defense.components.map((c) =>
                            c.id === comp.id ? { ...c, bonus: val } : c
                          ),
                        },
                      }));
                    }}
                    className="w-12 rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-0.5 text-right font-mono-tabular text-slate-100"
                  />
                  <select
                    disabled={readOnly}
                    value={comp.attribute}
                    onChange={(e) => {
                      const attr = e.target.value as AttributeKey | 'N/A';
                      onUpdate((prev) => ({
                        ...prev,
                        defense: {
                          ...prev.defense,
                          components: prev.defense.components.map((c) =>
                            c.id === comp.id ? { ...c, attribute: attr } : c
                          ),
                        },
                      }));
                    }}
                    className="rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-0.5 text-slate-200"
                  >
                    <option value="N/A">N/A</option>
                    {ATTRIBUTE_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <h3 className="mt-4 mb-2 text-sm font-semibold text-slate-100">
            Derivados e CDs
          </h3>
          <div className="grid grid-cols-2 gap-3 border-b border-[#1d2230] pb-4">
            <CalculableValueControl
              label="Atenção"
              field={sheet.derived.attention.total}
              readOnly={readOnly}
              size="sm"
              onChange={(total) =>
                onUpdate((prev) => ({
                  ...prev,
                  derived: {
                    ...prev.derived,
                    attention: { ...prev.derived.attention, total },
                  },
                }))
              }
            />
            <CalculableValueControl
              label="Iniciativa"
              field={sheet.derived.initiative.total}
              signed
              readOnly={readOnly}
              size="sm"
              onChange={(total) =>
                onUpdate((prev) => ({
                  ...prev,
                  derived: {
                    ...prev.derived,
                    initiative: { ...prev.derived.initiative, total },
                  },
                }))
              }
            />
            <CalculableValueControl
              label="Desloc. (m)"
              field={sheet.derived.movement.total}
              readOnly={readOnly}
              size="sm"
              onChange={(total) =>
                onUpdate((prev) => ({
                  ...prev,
                  derived: {
                    ...prev.derived,
                    movement: { ...prev.derived.movement, total },
                  },
                }))
              }
            />
            <CalculableValueControl
              label="CD Espec."
              field={sheet.derived.cdSpecialization.total}
              readOnly={readOnly}
              size="sm"
              onChange={(total) =>
                onUpdate((prev) => ({
                  ...prev,
                  derived: {
                    ...prev.derived,
                    cdSpecialization: {
                      ...prev.derived.cdSpecialization,
                      total,
                    },
                  },
                }))
              }
            />
          </div>

          {/* Testes de Morte + Dados de Vida */}
          <div className="mt-4 space-y-3">
            <div className="text-xs">
              <div className="mb-1.5 font-semibold text-slate-200">Testes de Morte</div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Sucessos</span>
                <div className="flex gap-1.5">
                  {sheet.vitals.deathSaves.successes.map((val, idx) => (
                    <input
                      key={idx}
                      type="checkbox"
                      disabled={readOnly}
                      checked={val}
                      onChange={(e) => {
                        const next = [...sheet.vitals.deathSaves.successes] as [
                          boolean,
                          boolean,
                          boolean,
                        ];
                        next[idx] = e.target.checked;
                        onUpdate((prev) => ({
                          ...prev,
                          vitals: {
                            ...prev.vitals,
                            deathSaves: { ...prev.vitals.deathSaves, successes: next },
                          },
                        }));
                      }}
                      className="h-4 w-4 accent-emerald-500"
                    />
                  ))}
                </div>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-slate-400">Falhas</span>
                <div className="flex gap-1.5">
                  {sheet.vitals.deathSaves.failures.map((val, idx) => (
                    <input
                      key={idx}
                      type="checkbox"
                      disabled={readOnly}
                      checked={val}
                      onChange={(e) => {
                        const next = [...sheet.vitals.deathSaves.failures] as [
                          boolean,
                          boolean,
                          boolean,
                        ];
                        next[idx] = e.target.checked;
                        onUpdate((prev) => ({
                          ...prev,
                          vitals: {
                            ...prev.vitals,
                            deathSaves: { ...prev.vitals.deathSaves, failures: next },
                          },
                        }));
                      }}
                      className="h-4 w-4 accent-red-500"
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-[#1d2230] pt-3 text-xs">
              <div className="mb-1.5 font-semibold text-slate-200">Dados de Vida</div>
              <div className="space-y-1.5">
                {sheet.vitals.hitDice.map((pool) => (
                  <div
                    key={pool.id}
                    className="flex items-center justify-between gap-2 text-slate-300"
                  >
                    <span className="font-mono-tabular font-semibold">{pool.die}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500">Dados</span>
                      <input
                        type="number"
                        min={0}
                        disabled={readOnly}
                        aria-label={`Quantidade de dados ${pool.die}`}
                        value={resolveCalculableValue(pool.owned)}
                        onChange={(e) => {
                          const nextOwned = Math.max(0, Number(e.target.value) || 0);
                          onUpdate((prev) => ({
                            ...prev,
                            vitals: {
                              ...prev.vitals,
                              hitDice: prev.vitals.hitDice.map((h) =>
                                h.id === pool.id
                                  ? {
                                      ...h,
                                      owned: h.owned.usarManual
                                        ? { ...h.owned, sobrescritaManual: nextOwned }
                                        : { ...h.owned, valorCalculado: nextOwned },
                                    }
                                  : h
                              ),
                            },
                          }));
                        }}
                        className="w-11 rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-0.5 text-right font-mono-tabular text-xs text-slate-100"
                      />
                      <span className="text-[11px] text-slate-500">Gastos</span>
                      <input
                        type="number"
                        min={0}
                        disabled={readOnly}
                        aria-label={`Dados ${pool.die} gastos`}
                        value={pool.used}
                        onChange={(e) =>
                          onUpdate((prev) => ({
                            ...prev,
                            vitals: {
                              ...prev.vitals,
                              hitDice: prev.vitals.hitDice.map((h) =>
                                h.id === pool.id
                                  ? { ...h, used: Math.max(0, Number(e.target.value) || 0) }
                                  : h
                              ),
                            },
                          }))
                        }
                        className="w-11 rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-0.5 text-right font-mono-tabular text-xs text-slate-100"
                      />
                      <span
                        title="Disponíveis / Total"
                        className="min-w-10 text-right font-mono-tabular text-indigo-300"
                      >
                        {resolveCalculableValue(pool.available)}/{resolveCalculableValue(pool.owned)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Perícias + Salvaguardas e Ataques */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-lg border border-[#212636] bg-[#11141e] p-5 lg:col-span-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#1d2230] pb-3">
            <h2 className="text-base font-semibold text-slate-100">Perícias</h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filtrar perícia..."
                  value={skillSearch}
                  onChange={(e) => setSkillSearch(e.target.value)}
                  className="rounded border border-[#242a3b] bg-[#0b0d14] py-1.5 pr-3 pl-8 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1 rounded border border-[#242a3b] bg-[#0b0d14] p-0.5">
                <button
                  type="button"
                  onClick={() => setSkillFilter('all')}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    skillFilter === 'all'
                      ? 'bg-[#22283a] text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setSkillFilter('trained')}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    skillFilter === 'trained'
                      ? 'bg-[#22283a] text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Treinadas
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#1d2230] text-slate-400">
                  <th className="py-2 pr-2 font-medium">Perícia</th>
                  <th className="py-2 px-2 font-medium">Atr</th>
                  <th className="py-2 px-2 text-center font-medium">T</th>
                  <th className="py-2 px-2 text-center font-medium">M</th>
                  <th className="py-2 px-2 text-right font-medium">Outros</th>
                  <th className="py-2 pl-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#181c28]">
                {filteredSkills.map((skill) => (
                  <tr key={skill.id} className="hover:bg-white/[0.02]">
                    <td className="py-1.5 pr-2 font-medium text-slate-200">
                      {skill.isCustomName ? (
                        <input
                          type="text"
                          disabled={readOnly}
                          value={skill.name}
                          onChange={(e) =>
                            updateProficiencyRow('skills', skill.id, {
                              name: e.target.value,
                            })
                          }
                          className="w-32 rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-0.5 text-xs text-slate-100"
                        />
                      ) : (
                        skill.name
                      )}
                    </td>
                    <td className="py-1.5 px-2">
                      <select
                        disabled={readOnly}
                        value={skill.attribute}
                        onChange={(e) =>
                          updateProficiencyRow('skills', skill.id, {
                            attribute: e.target.value as AttributeKey,
                          })
                        }
                        className="rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-0.5 text-xs text-slate-200"
                      >
                        {ATTRIBUTE_KEYS.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <input
                        type="checkbox"
                        disabled={readOnly}
                        checked={skill.trained}
                        onChange={(e) =>
                          updateProficiencyRow('skills', skill.id, {
                            trained: e.target.checked,
                          })
                        }
                        className="h-4 w-4 accent-indigo-500"
                      />
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <input
                        type="checkbox"
                        disabled={readOnly}
                        checked={skill.mastered}
                        onChange={(e) =>
                          updateProficiencyRow('skills', skill.id, {
                            mastered: e.target.checked,
                          })
                        }
                        className="h-4 w-4 accent-indigo-500"
                      />
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      <input
                        type="number"
                        disabled={readOnly}
                        value={skill.other}
                        onChange={(e) =>
                          updateProficiencyRow('skills', skill.id, {
                            other: Number(e.target.value) || 0,
                          })
                        }
                        className="w-12 rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-0.5 text-right font-mono-tabular text-xs text-slate-100"
                      />
                    </td>
                    <td className="py-1.5 pl-2 text-right">
                      <div className="inline-flex justify-end">
                        <CalculableValueControl
                          field={skill.total}
                          signed
                          readOnly={readOnly}
                          size="sm"
                          onChange={(total) =>
                            updateProficiencyRow('skills', skill.id, { total })
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Jogadas de Ataque, Testes de Resistência, Habilidades/Talentos e Armas */}
        <div className="space-y-6 lg:col-span-5">
          <section className="rounded-lg border border-[#212636] bg-[#11141e] p-5">
            <h2 className="mb-3 border-b border-[#1d2230] pb-2 text-base font-semibold text-slate-100">
              Jogadas de Ataque e Resistências
            </h2>
            <div className="space-y-4">
              {(['attacks', 'savingThrows'] as const).map((groupKey) => (
                <div key={groupKey}>
                  <h3 className="mb-2 text-xs font-medium text-slate-400">
                    {groupKey === 'attacks'
                      ? 'Jogadas de Ataque'
                      : 'Testes de Resistência'}
                  </h3>
                  <div className="space-y-1.5">
                    {sheet[groupKey].map((row) => (
                      <div
                        key={row.id}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="min-w-28 font-medium text-slate-200">
                          {row.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <select
                            disabled={readOnly}
                            value={row.attribute}
                            onChange={(e) =>
                              updateProficiencyRow(groupKey, row.id, {
                                attribute: e.target.value as AttributeKey,
                              })
                            }
                            className="rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-0.5 text-slate-200"
                          >
                            {ATTRIBUTE_KEYS.map((k) => (
                              <option key={k} value={k}>
                                {k}
                              </option>
                            ))}
                          </select>
                          <label className="flex items-center gap-1 text-slate-400">
                            T
                            <input
                              type="checkbox"
                              disabled={readOnly}
                              checked={row.trained}
                              onChange={(e) =>
                                updateProficiencyRow(groupKey, row.id, {
                                  trained: e.target.checked,
                                })
                              }
                              className="h-3.5 w-3.5 accent-indigo-500"
                            />
                          </label>
                          <CalculableValueControl
                            field={row.total}
                            signed
                            readOnly={readOnly}
                            size="sm"
                            onChange={(total) =>
                              updateProficiencyRow(groupKey, row.id, { total })
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Habilidades e Talentos (Atual / Máx. / Custo - Modelo v2.5) */}
          <section className="rounded-lg border border-[#212636] bg-[#11141e] p-5">
            <div className="mb-3 flex items-center justify-between border-b border-[#1d2230] pb-2">
              <h2 className="text-base font-semibold text-slate-100">
                Habilidades e Talentos
              </h2>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdate((prev) => ({
                      ...prev,
                      skillTalentsTable: [
                        ...prev.skillTalentsTable,
                        {
                          id: `st-${Date.now()}`,
                          name: 'Nova Habilidade',
                          current: 1,
                          max: 1,
                          cost: '1 PE',
                        },
                      ],
                    }))
                  }
                  className="inline-flex items-center gap-1 rounded border border-[#2a3145] bg-[#171b28] px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-[#202638] whitespace-nowrap shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar
                </button>
              )}
            </div>
            {sheet.skillTalentsTable.length === 0 ? (
              <p className="text-xs text-slate-500">
                Nenhum recurso ou habilidade de uso limitado registrado.
              </p>
            ) : (
              <div className="space-y-2 text-xs">
                {sheet.skillTalentsTable.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-2 rounded border border-[#1e2332] bg-[#0d1018] px-2.5 py-1.5"
                  >
                    <input
                      type="text"
                      disabled={readOnly}
                      value={entry.name}
                      onChange={(e) =>
                        onUpdate((prev) => ({
                          ...prev,
                          skillTalentsTable: prev.skillTalentsTable.map((item) =>
                            item.id === entry.id
                              ? { ...item, name: e.target.value }
                              : item
                          ),
                        }))
                      }
                      className="min-w-24 flex-1 bg-transparent font-medium text-slate-100 focus:outline-none"
                    />
                    <input
                      type="number"
                      disabled={readOnly}
                      value={entry.current}
                      onChange={(e) =>
                        onUpdate((prev) => ({
                          ...prev,
                          skillTalentsTable: prev.skillTalentsTable.map((item) =>
                            item.id === entry.id
                              ? { ...item, current: Number(e.target.value) || 0 }
                              : item
                          ),
                        }))
                      }
                      className="w-11 rounded border border-[#242a3b] bg-[#0b0d14] px-1 py-0.5 text-right font-mono-tabular"
                    />
                    <span className="text-slate-500">/</span>
                    <input
                      type="number"
                      disabled={readOnly}
                      value={entry.max}
                      onChange={(e) =>
                        onUpdate((prev) => ({
                          ...prev,
                          skillTalentsTable: prev.skillTalentsTable.map((item) =>
                            item.id === entry.id
                              ? { ...item, max: Number(e.target.value) || 0 }
                              : item
                          ),
                        }))
                      }
                      className="w-11 rounded border border-[#242a3b] bg-[#0b0d14] px-1 py-0.5 text-right font-mono-tabular"
                    />
                    <input
                      type="text"
                      disabled={readOnly}
                      value={entry.cost}
                      onChange={(e) =>
                        onUpdate((prev) => ({
                          ...prev,
                          skillTalentsTable: prev.skillTalentsTable.map((item) =>
                            item.id === entry.id
                              ? { ...item, cost: e.target.value }
                              : item
                          ),
                        }))
                      }
                      className="w-16 rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-0.5 text-center text-slate-300"
                    />
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdate((prev) => ({
                            ...prev,
                            skillTalentsTable: prev.skillTalentsTable.filter(
                              (item) => item.id !== entry.id
                            ),
                          }))
                        }
                        className="p-1 text-slate-500 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Ataques / Registro Rápido de Armas */}
          <section className="rounded-lg border border-[#212636] bg-[#11141e] p-5">
            <div className="mb-3 flex items-center justify-between border-b border-[#1d2230] pb-2">
              <h2 className="text-base font-semibold text-slate-100">
                Ataques e Registro Rápido
              </h2>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdate((prev) => ({
                      ...prev,
                      quickWeapons: [
                        ...prev.quickWeapons,
                        {
                          id: `qw-${Date.now()}`,
                          name: 'Nova Arma',
                          skillRef: 'CpC',
                          bonus: 0,
                          hit: { valorCalculado: 0, usarManual: false },
                          damage: '1d8',
                          critical: '20',
                          damageType: 'Cortante',
                          range: 'Cpc',
                          properties: '',
                        },
                      ],
                    }))
                  }
                  className="inline-flex items-center gap-1 rounded border border-[#2a3145] bg-[#171b28] px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-[#202638] whitespace-nowrap shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar
                </button>
              )}
            </div>
            {sheet.quickWeapons.length === 0 ? (
              <p className="text-xs text-slate-500">
                Nenhuma arma registrada no painel rápido.
              </p>
            ) : (
              <div className="space-y-3">
                {sheet.quickWeapons.map((weapon) => (
                  <div
                    key={weapon.id}
                    className="rounded border border-[#1e2332] bg-[#0d1018] p-3 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        disabled={readOnly}
                        value={weapon.name}
                        onChange={(e) =>
                          onUpdate((prev) => ({
                            ...prev,
                            quickWeapons: prev.quickWeapons.map((w) =>
                              w.id === weapon.id ? { ...w, name: e.target.value } : w
                            ),
                          }))
                        }
                        className="flex-1 bg-transparent font-semibold text-slate-100 focus:outline-none"
                      />
                      <CalculableValueControl
                        field={weapon.hit}
                        signed
                        readOnly={readOnly}
                        size="sm"
                        onChange={(hit) =>
                          onUpdate((prev) => ({
                            ...prev,
                            quickWeapons: prev.quickWeapons.map((w) =>
                              w.id === weapon.id ? { ...w, hit } : w
                            ),
                          }))
                        }
                      />
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdate((prev) => ({
                              ...prev,
                              quickWeapons: prev.quickWeapons.filter(
                                (w) => w.id !== weapon.id
                              ),
                            }))
                          }
                          title="Remover arma"
                          className="rounded p-1 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <label className="flex flex-col gap-0.5 text-[11px] text-slate-400">
                        Perícia / Ataque
                        <select
                          disabled={readOnly}
                          value={weapon.skillRef}
                          onChange={(e) =>
                            onUpdate((prev) => ({
                              ...prev,
                              quickWeapons: prev.quickWeapons.map((w) =>
                                w.id === weapon.id ? { ...w, skillRef: e.target.value } : w
                              ),
                            }))
                          }
                          className="rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-1 text-xs text-slate-200"
                        >
                          <option value="CpC">CpC (Corpo a Corpo)</option>
                          <option value="Dis">Dis (Distância)</option>
                          <option value="Amal">Amal (Amaldiçoado)</option>
                          <option value="N/A">N/A</option>
                        </select>
                      </label>
                      <label className="flex flex-col gap-0.5 text-[11px] text-slate-400">
                        Bônus
                        <input
                          type="number"
                          disabled={readOnly}
                          value={weapon.bonus}
                          onChange={(e) =>
                            onUpdate((prev) => ({
                              ...prev,
                              quickWeapons: prev.quickWeapons.map((w) =>
                                w.id === weapon.id
                                  ? { ...w, bonus: Number(e.target.value) || 0 }
                                  : w
                              ),
                            }))
                          }
                          className="rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-1 text-right font-mono-tabular text-xs text-slate-200"
                        />
                      </label>
                      <label className="flex flex-col gap-0.5 text-[11px] text-slate-400">
                        Dano
                        <input
                          type="text"
                          disabled={readOnly}
                          value={weapon.damage}
                          onChange={(e) =>
                            onUpdate((prev) => ({
                              ...prev,
                              quickWeapons: prev.quickWeapons.map((w) =>
                                w.id === weapon.id ? { ...w, damage: e.target.value } : w
                              ),
                            }))
                          }
                          className="rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-1 font-mono-tabular text-xs text-slate-200"
                        />
                      </label>
                      <label className="flex flex-col gap-0.5 text-[11px] text-slate-400">
                        Crítico
                        <input
                          type="text"
                          disabled={readOnly}
                          value={weapon.critical}
                          onChange={(e) =>
                            onUpdate((prev) => ({
                              ...prev,
                              quickWeapons: prev.quickWeapons.map((w) =>
                                w.id === weapon.id ? { ...w, critical: e.target.value } : w
                              ),
                            }))
                          }
                          className="rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-1 text-xs text-slate-200"
                        />
                      </label>
                      <label className="flex flex-col gap-0.5 text-[11px] text-slate-400">
                        Tipo
                        <input
                          type="text"
                          disabled={readOnly}
                          value={weapon.damageType}
                          onChange={(e) =>
                            onUpdate((prev) => ({
                              ...prev,
                              quickWeapons: prev.quickWeapons.map((w) =>
                                w.id === weapon.id
                                  ? { ...w, damageType: e.target.value }
                                  : w
                              ),
                            }))
                          }
                          className="rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-1 text-xs text-slate-200"
                        />
                      </label>
                      <label className="flex flex-col gap-0.5 text-[11px] text-slate-400">
                        Alcance
                        <input
                          type="text"
                          disabled={readOnly}
                          value={weapon.range}
                          onChange={(e) =>
                            onUpdate((prev) => ({
                              ...prev,
                              quickWeapons: prev.quickWeapons.map((w) =>
                                w.id === weapon.id ? { ...w, range: e.target.value } : w
                              ),
                            }))
                          }
                          className="rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-1 text-xs text-slate-200"
                        />
                      </label>
                      <label className="col-span-2 flex flex-col gap-0.5 text-[11px] text-slate-400 sm:col-span-3">
                        Propriedades
                        <input
                          type="text"
                          disabled={readOnly}
                          placeholder="Propriedades da arma..."
                          value={weapon.properties}
                          onChange={(e) =>
                            onUpdate((prev) => ({
                              ...prev,
                              quickWeapons: prev.quickWeapons.map((w) =>
                                w.id === weapon.id
                                  ? { ...w, properties: e.target.value }
                                  : w
                              ),
                            }))
                          }
                          className="rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-1 text-xs text-slate-200"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Reduções de Dano, Anotações e Condições */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-lg border border-[#212636] bg-[#11141e] p-5 lg:col-span-5">
          <div className="mb-3 flex items-center justify-between border-b border-[#1d2230] pb-2">
            <h2 className="text-base font-semibold text-slate-100">
              Reduções de Dano (RDs)
            </h2>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              RD Geral
              <input
                type="number"
                disabled={readOnly}
                value={sheet.damageMitigation.generalRD}
                onChange={(e) =>
                  onUpdate((prev) => ({
                    ...prev,
                    damageMitigation: {
                      ...prev.damageMitigation,
                      generalRD: Number(e.target.value) || 0,
                    },
                  }))
                }
                className="w-14 rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-right font-mono-tabular text-slate-100"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            {(Object.keys(sheet.damageMitigation.byType) as DamageTypeKey[]).map(
              (type) => {
                const entry = sheet.damageMitigation.byType[type];
                return (
                  <div
                    key={type}
                    className="flex items-center justify-between gap-2 border-b border-[#181c28] py-1"
                  >
                    <span className="truncate text-slate-300">{type}</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        disabled={readOnly}
                        aria-label={`RD adicional de ${type}`}
                        value={entry.amount}
                        onChange={(e) =>
                          onUpdate((prev) => ({
                            ...prev,
                            damageMitigation: {
                              ...prev.damageMitigation,
                              byType: {
                                ...prev.damageMitigation.byType,
                                [type]: {
                                  ...prev.damageMitigation.byType[type],
                                  amount: Number(e.target.value) || 0,
                                },
                              },
                            },
                          }))
                        }
                        className="w-11 rounded border border-[#242a3b] bg-[#0b0d14] px-1 py-0.5 text-right font-mono-tabular text-[11px] text-slate-300"
                      />
                      <span className="min-w-6 text-right font-mono-tabular font-semibold text-slate-100">
                        {resolveCalculableValue(entry.total)}
                      </span>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </section>

        <section className="rounded-lg border border-[#212636] bg-[#11141e] p-5 lg:col-span-7">
          <h2 className="mb-3 border-b border-[#1d2230] pb-2 text-base font-semibold text-slate-100">
            Características, Votos, Anotações e Condições
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <h3 className="mb-1 text-xs font-medium text-slate-400">
                Anotações da Ficha
              </h3>
              <textarea
                rows={5}
                disabled={readOnly}
                placeholder="Lembre-se de utilizar a função de Notas para anotar o funcionamento de suas habilidades, talentos e outros."
                value={sheet.notes}
                onChange={(e) =>
                  onUpdate((prev) => ({ ...prev, notes: e.target.value }))
                }
                className="w-full rounded border border-[#242a3b] bg-[#0b0d14] p-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-slate-400">Talentos</span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdate((prev) => ({
                          ...prev,
                          talents: [...prev.talents, ''],
                        }))
                      }
                      className="inline-flex items-center gap-1 rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-0.5 text-[11px] text-slate-300 hover:bg-[#171b28]"
                    >
                      <Plus className="h-3 w-3" />
                      Adicionar
                    </button>
                  )}
                </div>
                {sheet.talents.length === 0 ? (
                  <p className="text-[11px] text-slate-500">Nenhum talento adicionado.</p>
                ) : (
                  <div className="space-y-1">
                    {sheet.talents.map((talent, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          disabled={readOnly}
                          placeholder="Nome do talento..."
                          value={talent}
                          onChange={(e) =>
                            onUpdate((prev) => ({
                              ...prev,
                              talents: prev.talents.map((t, i) =>
                                i === idx ? e.target.value : t
                              ),
                            }))
                          }
                          className="flex-1 rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-xs text-slate-100"
                        />
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdate((prev) => ({
                                ...prev,
                                talents: prev.talents.filter((_, i) => i !== idx),
                              }))
                            }
                            className="p-1 text-slate-500 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-slate-400">Características</span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdate((prev) => ({
                          ...prev,
                          characteristics: [...prev.characteristics, ''],
                        }))
                      }
                      className="inline-flex items-center gap-1 rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-0.5 text-[11px] text-slate-300 hover:bg-[#171b28]"
                    >
                      <Plus className="h-3 w-3" />
                      Adicionar
                    </button>
                  )}
                </div>
                {sheet.characteristics.length === 0 ? (
                  <p className="text-[11px] text-slate-500">
                    Nenhuma característica adicionada.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {sheet.characteristics.map((char, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          disabled={readOnly}
                          placeholder="Característica..."
                          value={char}
                          onChange={(e) =>
                            onUpdate((prev) => ({
                              ...prev,
                              characteristics: prev.characteristics.map((c, i) =>
                                i === idx ? e.target.value : c
                              ),
                            }))
                          }
                          className="flex-1 rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-xs text-slate-100"
                        />
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdate((prev) => ({
                                ...prev,
                                characteristics: prev.characteristics.filter(
                                  (_, i) => i !== idx
                                ),
                              }))
                            }
                            className="p-1 text-slate-500 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-slate-400">
                    Votos de Restrição ({resolveCalculableValue(sheet.bindingVows.totalCount)})
                  </span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdate((prev) => ({
                          ...prev,
                          bindingVows: {
                            ...prev.bindingVows,
                            items: [
                              ...prev.bindingVows.items,
                              {
                                id: `vow-${Date.now()}`,
                                nameAndEffect: '',
                                vowCount: 1,
                              },
                            ],
                          },
                        }))
                      }
                      className="inline-flex items-center gap-1 rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-0.5 text-[11px] text-slate-300 hover:bg-[#171b28]"
                    >
                      <Plus className="h-3 w-3" />
                      Adicionar
                    </button>
                  )}
                </div>
                {sheet.bindingVows.items.length === 0 ? (
                  <p className="text-[11px] text-slate-500">
                    Nenhum voto de restrição registrado.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {sheet.bindingVows.items.map((vow) => (
                      <div key={vow.id} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          disabled={readOnly}
                          placeholder="Nome e efeito do voto..."
                          value={vow.nameAndEffect}
                          onChange={(e) =>
                            onUpdate((prev) => ({
                              ...prev,
                              bindingVows: {
                                ...prev.bindingVows,
                                items: prev.bindingVows.items.map((item) =>
                                  item.id === vow.id
                                    ? { ...item, nameAndEffect: e.target.value }
                                    : item
                                ),
                              },
                            }))
                          }
                          className="flex-1 rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-xs text-slate-100"
                        />
                        <input
                          type="number"
                          min={0}
                          disabled={readOnly}
                          aria-label="Quantidade de votos"
                          value={vow.vowCount}
                          onChange={(e) =>
                            onUpdate((prev) => ({
                              ...prev,
                              bindingVows: {
                                ...prev.bindingVows,
                                items: prev.bindingVows.items.map((item) =>
                                  item.id === vow.id
                                    ? { ...item, vowCount: Number(e.target.value) || 0 }
                                    : item
                                ),
                              },
                            }))
                          }
                          className="w-12 rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-1 text-right font-mono-tabular text-xs text-slate-100"
                        />
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdate((prev) => ({
                                ...prev,
                                bindingVows: {
                                  ...prev.bindingVows,
                                  items: prev.bindingVows.items.filter(
                                    (item) => item.id !== vow.id
                                  ),
                                },
                              }))
                            }
                            className="p-1 text-slate-500 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className="flex flex-col gap-1 text-slate-400">
                  Sangramento
                  <select
                    disabled={readOnly}
                    value={sheet.conditions.bleeding ?? ''}
                    onChange={(e) =>
                      onUpdate((prev) => ({
                        ...prev,
                        conditions: {
                          ...prev.conditions,
                          bleeding: (e.target.value || null) as BleedingSeverity | null,
                        },
                      }))
                    }
                    className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-xs text-slate-100"
                  >
                    <option value="">Nenhum</option>
                    <option value="Fraco">Fraco</option>
                    <option value="Médio">Médio</option>
                    <option value="Forte">Forte</option>
                    <option value="Extremo">Extremo</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-slate-400">
                  Congelamento
                  <select
                    disabled={readOnly}
                    value={sheet.conditions.freezing ?? ''}
                    onChange={(e) =>
                      onUpdate((prev) => ({
                        ...prev,
                        conditions: {
                          ...prev.conditions,
                          freezing: (e.target.value || null) as FreezingSeverity | null,
                        },
                      }))
                    }
                    className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-xs text-slate-100"
                  >
                    <option value="">Nenhum</option>
                    <option value="Leve">Leve</option>
                    <option value="Médio">Médio</option>
                    <option value="Total">Total</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-[#1d2230] pt-3">
            <h3 className="mb-2 text-xs font-medium text-slate-400">
              Condições Ativas
            </h3>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 md:grid-cols-6">
              {(Object.keys(sheet.conditions.flags) as SimpleConditionKey[]).map(
                (cond) => {
                  const active = sheet.conditions.flags[cond];
                  return (
                    <label
                      key={cond}
                      className={`flex cursor-pointer items-center gap-1.5 rounded border px-2 py-1 text-xs transition-colors ${
                        active
                          ? 'border-red-500/50 bg-red-500/10 text-red-200'
                          : 'border-[#1e2332] bg-[#0d1018] text-slate-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={readOnly}
                        checked={active}
                        onChange={(e) =>
                          onUpdate((prev) => ({
                            ...prev,
                            conditions: {
                              ...prev.conditions,
                              flags: {
                                ...prev.conditions.flags,
                                [cond]: e.target.checked,
                              },
                            },
                          }))
                        }
                        className="h-3.5 w-3.5 accent-red-500"
                      />
                      <span className="truncate">{cond}</span>
                    </label>
                  );
                }
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
