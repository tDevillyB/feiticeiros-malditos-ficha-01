import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { createDefaultReleaseSlots } from '../../data/vanillaTemplate';
import type {
  AptitudeEntry,
  AttributeKey,
  CursedProfileData,
  FichaPersonagem,
  ReleaseTechniqueSlot,
} from '../../types/character';
import { createCalculableField } from '../../utils/calculations';
import { CalculableValueControl } from '../CalculableValueControl';

interface CursedProfileTabProps {
  sheet: FichaPersonagem;
  onUpdate: (updater: (prev: FichaPersonagem) => FichaPersonagem) => void;
  readOnly: boolean;
}

const ATTRIBUTE_KEYS: AttributeKey[] = ['FOR', 'DEX', 'CON', 'INT', 'SAB', 'PRE'];

type AptitudeArrayKey =
  | 'cursedAptitudes'
  | 'auraAptitudes'
  | 'controlAndReading'
  | 'barrierAptitudes'
  | 'reverseEnergyAptitudes';

const APTITUDE_CATEGORIES: Array<{
  arrayKey: AptitudeArrayKey;
  category: AptitudeEntry['category'];
  label: string;
}> = [
  { arrayKey: 'cursedAptitudes', category: 'cursed', label: 'Amaldiçoadas' },
  { arrayKey: 'auraAptitudes', category: 'aura', label: 'Aura' },
  {
    arrayKey: 'controlAndReading',
    category: 'control_reading',
    label: 'Controle e Leitura',
  },
  { arrayKey: 'barrierAptitudes', category: 'barrier', label: 'Barreira' },
  {
    arrayKey: 'reverseEnergyAptitudes',
    category: 'reverse_energy',
    label: 'Energia Reversa',
  },
];

export function CursedProfileTab({
  sheet,
  onUpdate,
  readOnly,
}: CursedProfileTabProps) {
  const profile = sheet.cursedProfile;
  const [activeAptitudeTab, setActiveAptitudeTab] =
    useState<AptitudeArrayKey>('cursedAptitudes');

  const releaseSlots: ReleaseTechniqueSlot[] =
    profile.releaseSlots && profile.releaseSlots.length === 4
      ? profile.releaseSlots
      : createDefaultReleaseSlots();

  const updateReleaseSlot = (
    slotNumber: 1 | 2 | 3 | 4,
    updater: (slot: ReleaseTechniqueSlot) => ReleaseTechniqueSlot
  ) => {
    if (readOnly) return;
    onUpdate((prev) => {
      const currentSlots =
        prev.cursedProfile.releaseSlots &&
        prev.cursedProfile.releaseSlots.length === 4
          ? prev.cursedProfile.releaseSlots
          : createDefaultReleaseSlots();
      return {
        ...prev,
        cursedProfile: {
          ...prev.cursedProfile,
          releaseSlots: currentSlots.map((slot) =>
            slot.slotNumber === slotNumber ? updater(slot) : slot
          ),
        },
      };
    });
  };

  const activeCategoryMeta =
    APTITUDE_CATEGORIES.find((c) => c.arrayKey === activeAptitudeTab) ??
    APTITUDE_CATEGORIES[0];

  const getAptitudesForKey = (
    cursedProfile: CursedProfileData,
    key: AptitudeArrayKey
  ): AptitudeEntry[] => {
    const list = cursedProfile[key];
    return Array.isArray(list) ? list : [];
  };

  const activeAptitudes = getAptitudesForKey(profile, activeCategoryMeta.arrayKey);

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Técnica Amaldiçoada */}
      <section className="rounded-lg border border-[#212636] bg-[#11141e] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-[#1d2230] pb-3">
          <h2 className="text-base font-semibold text-slate-100">
            Técnica Amaldiçoada e Maestria
          </h2>
          <div className="flex flex-wrap items-center gap-5">
            <CalculableValueControl
              label="CD da Técnica"
              field={profile.techniqueCD}
              readOnly={readOnly}
              size="sm"
              onChange={(techniqueCD) =>
                onUpdate((prev) => ({
                  ...prev,
                  cursedProfile: { ...prev.cursedProfile, techniqueCD },
                }))
              }
            />
            <CalculableValueControl
              label="Maestria"
              field={profile.masteryLevel}
              readOnly={readOnly}
              size="sm"
              onChange={(masteryLevel) =>
                onUpdate((prev) => ({
                  ...prev,
                  cursedProfile: { ...prev.cursedProfile, masteryLevel },
                }))
              }
            />
            <CalculableValueControl
              label="Habilidades Conhecidas"
              field={profile.knownAbilitiesCount}
              readOnly={readOnly}
              size="sm"
              onChange={(knownAbilitiesCount) =>
                onUpdate((prev) => ({
                  ...prev,
                  cursedProfile: { ...prev.cursedProfile, knownAbilitiesCount },
                }))
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs text-slate-400 md:col-span-2">
            Nome da Técnica
            <input
              type="text"
              disabled={readOnly}
              value={profile.techniqueName}
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
              className="rounded border border-[#242a3b] bg-[#0b0d14] px-3 py-2 text-sm text-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Atributo da Técnica
            <select
              disabled={readOnly}
              value={profile.techniqueAttribute}
              onChange={(e) =>
                onUpdate((prev) => ({
                  ...prev,
                  cursedProfile: {
                    ...prev.cursedProfile,
                    techniqueAttribute: e.target.value as AttributeKey,
                  },
                }))
              }
              className="rounded border border-[#242a3b] bg-[#0b0d14] px-3 py-2 text-sm text-slate-100"
            >
              {ATTRIBUTE_KEYS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Nível da Técnica
            <input
              type="number"
              min={0}
              disabled={readOnly}
              value={profile.techniqueLevel}
              onChange={(e) =>
                onUpdate((prev) => ({
                  ...prev,
                  cursedProfile: {
                    ...prev.cursedProfile,
                    techniqueLevel: Number(e.target.value) || 0,
                  },
                }))
              }
              className="rounded border border-[#242a3b] bg-[#0b0d14] px-3 py-2 text-right font-mono-tabular text-sm text-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-400 md:col-span-4">
            Descrição da Técnica
            <textarea
              rows={3}
              disabled={readOnly}
              value={profile.techniqueDescription}
              onChange={(e) =>
                onUpdate((prev) => ({
                  ...prev,
                  cursedProfile: {
                    ...prev.cursedProfile,
                    techniqueDescription: e.target.value,
                  },
                }))
              }
              className="rounded border border-[#242a3b] bg-[#0b0d14] px-3 py-2 text-sm text-slate-100"
            />
          </label>
        </div>
      </section>

      {/* Habilidades de Técnica */}
      <section className="rounded-lg border border-[#212636] bg-[#11141e] p-5">
        <div className="mb-4 flex items-center justify-between border-b border-[#1d2230] pb-3">
          <h2 className="text-base font-semibold text-slate-100">
            Habilidades de Técnica
          </h2>
          {!readOnly && (
            <button
              type="button"
              onClick={() =>
                onUpdate((prev) => ({
                  ...prev,
                  cursedProfile: {
                    ...prev.cursedProfile,
                    techniqueAbilities: [
                      ...prev.cursedProfile.techniqueAbilities,
                      {
                        id: `ca-${Date.now()}`,
                        name: 'Nova Habilidade',
                        level: 1,
                        peCost: createCalculableField(2),
                        actionType: 'Ação Padrão',
                        range: '18m',
                        duration: 'Instantânea',
                        damageOrEffect: '',
                        description: '',
                      },
                    ],
                  },
                }))
              }
              className="inline-flex items-center gap-1.5 rounded border border-[#2a3145] bg-[#171b28] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-[#202638] whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar Habilidade
            </button>
          )}
        </div>

        <div className="space-y-3">
          {profile.techniqueAbilities.map((ab) => (
            <div
              key={ab.id}
              className="rounded border border-[#1e2332] bg-[#0d1018] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <input
                  type="text"
                  disabled={readOnly}
                  value={ab.name}
                  onChange={(e) =>
                    onUpdate((prev) => ({
                      ...prev,
                      cursedProfile: {
                        ...prev.cursedProfile,
                        techniqueAbilities:
                          prev.cursedProfile.techniqueAbilities.map((item) =>
                            item.id === ab.id
                              ? { ...item, name: e.target.value }
                              : item
                          ),
                      },
                    }))
                  }
                  className="min-w-48 flex-1 bg-transparent text-sm font-semibold text-slate-100 focus:outline-none"
                />
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-slate-400">
                    Nível
                    <input
                      type="number"
                      min={0}
                      max={5}
                      disabled={readOnly}
                      value={ab.level}
                      onChange={(e) =>
                        onUpdate((prev) => ({
                          ...prev,
                          cursedProfile: {
                            ...prev.cursedProfile,
                            techniqueAbilities:
                              prev.cursedProfile.techniqueAbilities.map((item) =>
                                item.id === ab.id
                                  ? { ...item, level: Number(e.target.value) || 0 }
                                  : item
                              ),
                          },
                        }))
                      }
                      className="w-12 rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-0.5 text-right font-mono-tabular text-xs text-slate-100"
                    />
                  </label>
                  <CalculableValueControl
                    label="PE"
                    field={ab.peCost}
                    readOnly={readOnly}
                    size="sm"
                    onChange={(peCost) =>
                      onUpdate((prev) => ({
                        ...prev,
                        cursedProfile: {
                          ...prev.cursedProfile,
                          techniqueAbilities:
                            prev.cursedProfile.techniqueAbilities.map((item) =>
                              item.id === ab.id ? { ...item, peCost } : item
                            ),
                        },
                      }))
                    }
                  />
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdate((prev) => ({
                          ...prev,
                          cursedProfile: {
                            ...prev.cursedProfile,
                            techniqueAbilities:
                              prev.cursedProfile.techniqueAbilities.filter(
                                (item) => item.id !== ab.id
                              ),
                          },
                        }))
                      }
                      className="rounded p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
                <input
                  type="text"
                  disabled={readOnly}
                  placeholder="Ação"
                  value={ab.actionType}
                  onChange={(e) =>
                    onUpdate((prev) => ({
                      ...prev,
                      cursedProfile: {
                        ...prev.cursedProfile,
                        techniqueAbilities:
                          prev.cursedProfile.techniqueAbilities.map((item) =>
                            item.id === ab.id
                              ? { ...item, actionType: e.target.value }
                              : item
                          ),
                      },
                    }))
                  }
                  className="rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1.5 text-xs text-slate-200"
                />
                <input
                  type="text"
                  disabled={readOnly}
                  placeholder="Alcance"
                  value={ab.range}
                  onChange={(e) =>
                    onUpdate((prev) => ({
                      ...prev,
                      cursedProfile: {
                        ...prev.cursedProfile,
                        techniqueAbilities:
                          prev.cursedProfile.techniqueAbilities.map((item) =>
                            item.id === ab.id
                              ? { ...item, range: e.target.value }
                              : item
                          ),
                      },
                    }))
                  }
                  className="rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1.5 text-xs text-slate-200"
                />
                <input
                  type="text"
                  disabled={readOnly}
                  placeholder="Duração"
                  value={ab.duration}
                  onChange={(e) =>
                    onUpdate((prev) => ({
                      ...prev,
                      cursedProfile: {
                        ...prev.cursedProfile,
                        techniqueAbilities:
                          prev.cursedProfile.techniqueAbilities.map((item) =>
                            item.id === ab.id
                              ? { ...item, duration: e.target.value }
                              : item
                          ),
                      },
                    }))
                  }
                  className="rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1.5 text-xs text-slate-200"
                />
                <input
                  type="text"
                  disabled={readOnly}
                  placeholder="Dano / Efeito"
                  value={ab.damageOrEffect}
                  onChange={(e) =>
                    onUpdate((prev) => ({
                      ...prev,
                      cursedProfile: {
                        ...prev.cursedProfile,
                        techniqueAbilities:
                          prev.cursedProfile.techniqueAbilities.map((item) =>
                            item.id === ab.id
                              ? { ...item, damageOrEffect: e.target.value }
                              : item
                          ),
                      },
                    }))
                  }
                  className="rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1.5 text-xs text-slate-200"
                />
              </div>
              <textarea
                rows={2}
                disabled={readOnly}
                placeholder="Descrição completa da habilidade..."
                value={ab.description}
                onChange={(e) =>
                  onUpdate((prev) => ({
                    ...prev,
                    cursedProfile: {
                      ...prev.cursedProfile,
                      techniqueAbilities:
                        prev.cursedProfile.techniqueAbilities.map((item) =>
                          item.id === ab.id
                            ? { ...item, description: e.target.value }
                            : item
                        ),
                    },
                  }))
                }
                className="mt-2 w-full rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1.5 text-xs text-slate-300"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Aptidões Amaldiçoadas (separadas de Habilidades de Especialização e Técnica) */}
      <section className="rounded-lg border border-[#212636] bg-[#11141e] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#1d2230] pb-3">
          <div>
            <h2 className="text-base font-semibold text-slate-100">Aptidões</h2>
            <p className="text-[11px] text-slate-400">
              Aptidões organizadas pelas categorias de energia amaldiçoada, aura, leitura, barreira e energia reversa.
            </p>
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={() =>
                onUpdate((prev) => {
                  const currentList = getAptitudesForKey(
                    prev.cursedProfile,
                    activeCategoryMeta.arrayKey
                  );
                  const newEntry: AptitudeEntry = {
                    id: `apt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    name: 'Nova Aptidão',
                    category: activeCategoryMeta.category,
                    level: 1,
                    peCost: createCalculableField(0),
                    prerequisite: '',
                    description: '',
                    acquired: true,
                  };
                  return {
                    ...prev,
                    cursedProfile: {
                      ...prev.cursedProfile,
                      [activeCategoryMeta.arrayKey]: [...currentList, newEntry],
                    },
                  };
                })
              }
              className="inline-flex items-center gap-1.5 rounded border border-indigo-500/40 bg-indigo-600/15 px-3 py-1.5 text-xs font-medium text-indigo-100 hover:bg-indigo-600/25 whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar em {activeCategoryMeta.label}
            </button>
          )}
        </div>

        {/* Seletor de categoria das Aptidões */}
        <div className="mb-4 flex flex-wrap gap-2">
          {APTITUDE_CATEGORIES.map((cat) => {
            const count = getAptitudesForKey(profile, cat.arrayKey).length;
            const active = activeAptitudeTab === cat.arrayKey;
            return (
              <button
                key={cat.arrayKey}
                type="button"
                onClick={() => setActiveAptitudeTab(cat.arrayKey)}
                className={`rounded border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'border-indigo-500/60 bg-indigo-600/20 text-indigo-100'
                    : 'border-[#242a3b] bg-[#0d1018] text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>

        {activeAptitudes.length === 0 ? (
          <div className="rounded border border-[#1e2332] bg-[#0d1018] p-4 text-xs text-slate-400">
            Nenhuma aptidão registrada em {activeCategoryMeta.label}.
          </div>
        ) : (
          <div className="space-y-3">
            {activeAptitudes.map((apt) => (
              <div
                key={apt.id}
                className="space-y-2.5 rounded border border-[#1e2332] bg-[#0d1018] p-4 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-1 items-center gap-2.5">
                    <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-300">
                      <input
                        type="checkbox"
                        disabled={readOnly}
                        checked={apt.acquired}
                        onChange={(e) =>
                          onUpdate((prev) => ({
                            ...prev,
                            cursedProfile: {
                              ...prev.cursedProfile,
                              [activeCategoryMeta.arrayKey]: getAptitudesForKey(
                                prev.cursedProfile,
                                activeCategoryMeta.arrayKey
                              ).map((item) =>
                                item.id === apt.id
                                  ? { ...item, acquired: e.target.checked }
                                  : item
                              ),
                            },
                          }))
                        }
                        className="h-3.5 w-3.5 accent-indigo-500"
                      />
                      Adquirida
                    </label>
                    <input
                      type="text"
                      disabled={readOnly}
                      placeholder="Nome da aptidão"
                      value={apt.name}
                      onChange={(e) =>
                        onUpdate((prev) => ({
                          ...prev,
                          cursedProfile: {
                            ...prev.cursedProfile,
                            [activeCategoryMeta.arrayKey]: getAptitudesForKey(
                              prev.cursedProfile,
                              activeCategoryMeta.arrayKey
                            ).map((item) =>
                              item.id === apt.id
                                ? { ...item, name: e.target.value }
                                : item
                            ),
                          },
                        }))
                      }
                      className="min-w-40 flex-1 rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1 text-sm font-semibold text-slate-100"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-slate-400">
                      Nível
                      <input
                        type="number"
                        min={0}
                        disabled={readOnly}
                        value={apt.level}
                        onChange={(e) =>
                          onUpdate((prev) => ({
                            ...prev,
                            cursedProfile: {
                              ...prev.cursedProfile,
                              [activeCategoryMeta.arrayKey]: getAptitudesForKey(
                                prev.cursedProfile,
                                activeCategoryMeta.arrayKey
                              ).map((item) =>
                                item.id === apt.id
                                  ? { ...item, level: Number(e.target.value) || 0 }
                                  : item
                              ),
                            },
                          }))
                        }
                        className="w-12 rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-0.5 text-right font-mono-tabular text-xs text-slate-100"
                      />
                    </label>
                    <CalculableValueControl
                      label="PE"
                      field={apt.peCost}
                      readOnly={readOnly}
                      size="sm"
                      onChange={(peCost) =>
                        onUpdate((prev) => ({
                          ...prev,
                          cursedProfile: {
                            ...prev.cursedProfile,
                            [activeCategoryMeta.arrayKey]: getAptitudesForKey(
                              prev.cursedProfile,
                              activeCategoryMeta.arrayKey
                            ).map((item) =>
                              item.id === apt.id ? { ...item, peCost } : item
                            ),
                          },
                        }))
                      }
                    />
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdate((prev) => ({
                            ...prev,
                            cursedProfile: {
                              ...prev.cursedProfile,
                              [activeCategoryMeta.arrayKey]: getAptitudesForKey(
                                prev.cursedProfile,
                                activeCategoryMeta.arrayKey
                              ).filter((item) => item.id !== apt.id),
                            },
                          }))
                        }
                        title="Remover aptidão"
                        className="rounded p-1 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <input
                  type="text"
                  disabled={readOnly}
                  placeholder="Pré-requisitos (ex: Nível, atributo ou aptidão anterior)..."
                  value={apt.prerequisite}
                  onChange={(e) =>
                    onUpdate((prev) => ({
                      ...prev,
                      cursedProfile: {
                        ...prev.cursedProfile,
                        [activeCategoryMeta.arrayKey]: getAptitudesForKey(
                          prev.cursedProfile,
                          activeCategoryMeta.arrayKey
                        ).map((item) =>
                          item.id === apt.id
                            ? { ...item, prerequisite: e.target.value }
                            : item
                        ),
                      },
                    }))
                  }
                  className="w-full rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1 text-xs text-slate-200"
                />
                <textarea
                  rows={2}
                  disabled={readOnly}
                  placeholder="Efeito e descrição completa da aptidão..."
                  value={apt.description}
                  onChange={(e) =>
                    onUpdate((prev) => ({
                      ...prev,
                      cursedProfile: {
                        ...prev.cursedProfile,
                        [activeCategoryMeta.arrayKey]: getAptitudesForKey(
                          prev.cursedProfile,
                          activeCategoryMeta.arrayKey
                        ).map((item) =>
                          item.id === apt.id
                            ? { ...item, description: e.target.value }
                            : item
                        ),
                      },
                    }))
                  }
                  className="w-full rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1.5 text-xs text-slate-300"
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Barreiras e Energia Reversa */}
      <section className="rounded-lg border border-[#212636] bg-[#11141e] p-5">
        <h2 className="mb-3 border-b border-[#1d2230] pb-2 text-base font-semibold text-slate-100">
          Barreiras e Energia Reversa
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CalculableValueControl
            label="Vida da Barreira"
            field={profile.barrier.barrierHp}
            readOnly={readOnly}
            size="sm"
            onChange={(barrierHp) =>
              onUpdate((prev) => ({
                ...prev,
                cursedProfile: {
                  ...prev.cursedProfile,
                  barrier: { ...prev.cursedProfile.barrier, barrierHp },
                },
              }))
            }
          />
          <CalculableValueControl
            label="Defesa da Barreira"
            field={profile.barrier.barrierDefense}
            readOnly={readOnly}
            size="sm"
            onChange={(barrierDefense) =>
              onUpdate((prev) => ({
                ...prev,
                cursedProfile: {
                  ...prev.cursedProfile,
                  barrier: { ...prev.cursedProfile.barrier, barrierDefense },
                },
              }))
            }
          />
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Nível de Barreira
            <input
              type="number"
              min={0}
              disabled={readOnly}
              value={profile.barrier.barrierLevel}
              onChange={(e) =>
                onUpdate((prev) => ({
                  ...prev,
                  cursedProfile: {
                    ...prev.cursedProfile,
                    barrier: {
                      ...prev.cursedProfile.barrier,
                      barrierLevel: Number(e.target.value) || 0,
                    },
                  },
                }))
              }
              className="rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1.5 text-right font-mono-tabular text-xs text-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Área / Raio
            <input
              type="text"
              disabled={readOnly}
              value={profile.barrier.areaOrRadius}
              onChange={(e) =>
                onUpdate((prev) => ({
                  ...prev,
                  cursedProfile: {
                    ...prev.cursedProfile,
                    barrier: {
                      ...prev.cursedProfile.barrier,
                      areaOrRadius: e.target.value,
                    },
                  },
                }))
              }
              className="rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1.5 text-xs text-slate-100"
            />
          </label>
        </div>
        <label className="mt-4 flex flex-col gap-1 text-xs text-slate-400">
          Notas de Energia Reversa e Controle
          <textarea
            rows={3}
            disabled={readOnly}
            value={profile.reverseEnergyNotes}
            onChange={(e) =>
              onUpdate((prev) => ({
                ...prev,
                cursedProfile: {
                  ...prev.cursedProfile,
                  reverseEnergyNotes: e.target.value,
                },
              }))
            }
            className="rounded border border-[#242a3b] bg-[#0b0d14] px-3 py-2 text-xs text-slate-200"
          />
        </label>
      </section>

      {/* EXPANSÃO DE DOMÍNIO — Seção Independente */}
      <section className="rounded-lg border border-[#212636] bg-[#11141e] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#1d2230] pb-2">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Expansão de Domínio
            </h2>
            <p className="text-[11px] text-slate-400">
              Estrutura independente para configuração do Domínio do personagem.
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              disabled={readOnly}
              checked={profile.domainExpansion.unlocked}
              onChange={(e) =>
                onUpdate((prev) => ({
                  ...prev,
                  cursedProfile: {
                    ...prev.cursedProfile,
                    domainExpansion: {
                      ...prev.cursedProfile.domainExpansion,
                      unlocked: e.target.checked,
                    },
                  },
                }))
              }
              className="h-4 w-4 accent-indigo-500"
            />
            Domínio Desbloqueado
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs text-slate-400 md:col-span-2">
            Nome do Domínio
            <input
              type="text"
              disabled={readOnly}
              value={profile.domainExpansion.name}
              onChange={(e) =>
                onUpdate((prev) => ({
                  ...prev,
                  cursedProfile: {
                    ...prev.cursedProfile,
                    domainExpansion: {
                      ...prev.cursedProfile.domainExpansion,
                      name: e.target.value,
                    },
                  },
                }))
              }
              className="rounded border border-[#242a3b] bg-[#0b0d14] px-3 py-1.5 text-sm text-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Tipo de Domínio
            <input
              type="text"
              disabled={readOnly}
              placeholder="Letal, Não-letal, Aberto..."
              value={profile.domainExpansion.type}
              onChange={(e) =>
                onUpdate((prev) => ({
                  ...prev,
                  cursedProfile: {
                    ...prev.cursedProfile,
                    domainExpansion: {
                      ...prev.cursedProfile.domainExpansion,
                      type: e.target.value,
                    },
                  },
                }))
              }
              className="rounded border border-[#242a3b] bg-[#0b0d14] px-3 py-1.5 text-xs text-slate-100"
            />
          </label>
          <div className="flex items-end justify-between gap-3">
            <label className="flex flex-1 flex-col gap-1 text-xs text-slate-400">
              Refinamento
              <input
                type="number"
                min={0}
                disabled={readOnly}
                value={profile.domainExpansion.refinement}
                onChange={(e) =>
                  onUpdate((prev) => ({
                    ...prev,
                    cursedProfile: {
                      ...prev.cursedProfile,
                      domainExpansion: {
                        ...prev.cursedProfile.domainExpansion,
                        refinement: Number(e.target.value) || 0,
                      },
                    },
                  }))
                }
                className="rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1.5 text-right font-mono-tabular text-xs text-slate-100"
              />
            </label>
            <CalculableValueControl
              label="Custo (PE)"
              field={profile.domainExpansion.peCost}
              readOnly={readOnly}
              size="sm"
              onChange={(peCost) =>
                onUpdate((prev) => ({
                  ...prev,
                  cursedProfile: {
                    ...prev.cursedProfile,
                    domainExpansion: {
                      ...prev.cursedProfile.domainExpansion,
                      peCost,
                    },
                  },
                }))
              }
            />
          </div>
          <label className="flex flex-col gap-1 text-xs text-slate-400 md:col-span-2">
            Efeito de Acerto Garantido
            <input
              type="text"
              disabled={readOnly}
              value={profile.domainExpansion.sureHitEffect}
              onChange={(e) =>
                onUpdate((prev) => ({
                  ...prev,
                  cursedProfile: {
                    ...prev.cursedProfile,
                    domainExpansion: {
                      ...prev.cursedProfile.domainExpansion,
                      sureHitEffect: e.target.value,
                    },
                  },
                }))
              }
              className="rounded border border-[#242a3b] bg-[#0b0d14] px-3 py-1.5 text-xs text-slate-200"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-400 md:col-span-2">
            Efeito Ambiental
            <input
              type="text"
              disabled={readOnly}
              value={profile.domainExpansion.environmentEffect}
              onChange={(e) =>
                onUpdate((prev) => ({
                  ...prev,
                  cursedProfile: {
                    ...prev.cursedProfile,
                    domainExpansion: {
                      ...prev.cursedProfile.domainExpansion,
                      environmentEffect: e.target.value,
                    },
                  },
                }))
              }
              className="rounded border border-[#242a3b] bg-[#0b0d14] px-3 py-1.5 text-xs text-slate-200"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-400 md:col-span-4">
            Descrição do Domínio
            <textarea
              rows={2}
              disabled={readOnly}
              value={profile.domainExpansion.description}
              onChange={(e) =>
                onUpdate((prev) => ({
                  ...prev,
                  cursedProfile: {
                    ...prev.cursedProfile,
                    domainExpansion: {
                      ...prev.cursedProfile.domainExpansion,
                      description: e.target.value,
                    },
                  },
                }))
              }
              className="rounded border border-[#242a3b] bg-[#0b0d14] px-3 py-1.5 text-xs text-slate-200"
            />
          </label>
        </div>
      </section>

      {/* LIBERAÇÃO — Seção Independente com exatamente 4 slots fixos */}
      <section className="rounded-lg border border-[#212636] bg-[#11141e] p-5">
        <div className="mb-4 border-b border-[#1d2230] pb-2">
          <h2 className="text-base font-semibold text-slate-100">Liberação</h2>
          <p className="text-[11px] text-slate-400">
            Exatamente 4 slots fixos e independentes para técnicas e formas de liberação.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {releaseSlots.map((slot) => (
            <div
              key={slot.slotNumber}
              className="space-y-3 rounded border border-[#1e2332] bg-[#0d1018] p-4 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#191e2b] pb-2">
                <div className="flex items-center gap-2.5">
                  <span className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono-tabular text-[11px] font-semibold text-amber-200">
                    Slot {slot.slotNumber}
                  </span>
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-300">
                    <input
                      type="checkbox"
                      disabled={readOnly}
                      checked={slot.unlocked}
                      onChange={(e) =>
                        updateReleaseSlot(slot.slotNumber, (s) => ({
                          ...s,
                          unlocked: e.target.checked,
                        }))
                      }
                      className="h-3.5 w-3.5 accent-amber-500"
                    />
                    Desbloqueada
                  </label>
                </div>
                <CalculableValueControl
                  label="Custo (PE)"
                  field={slot.peCost}
                  readOnly={readOnly}
                  size="sm"
                  onChange={(peCost) =>
                    updateReleaseSlot(slot.slotNumber, (s) => ({ ...s, peCost }))
                  }
                />
              </div>

              <input
                type="text"
                disabled={readOnly}
                placeholder={`Nome da Liberação (Slot ${slot.slotNumber})...`}
                value={slot.name}
                onChange={(e) =>
                  updateReleaseSlot(slot.slotNumber, (s) => ({
                    ...s,
                    name: e.target.value,
                  }))
                }
                className="w-full rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1.5 text-sm font-semibold text-slate-100"
              />

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input
                  type="text"
                  disabled={readOnly}
                  placeholder="Execução / Ação"
                  value={slot.actionType}
                  onChange={(e) =>
                    updateReleaseSlot(slot.slotNumber, (s) => ({
                      ...s,
                      actionType: e.target.value,
                    }))
                  }
                  className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-xs text-slate-200"
                />
                <input
                  type="text"
                  disabled={readOnly}
                  placeholder="Alcance"
                  value={slot.range}
                  onChange={(e) =>
                    updateReleaseSlot(slot.slotNumber, (s) => ({
                      ...s,
                      range: e.target.value,
                    }))
                  }
                  className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-xs text-slate-200"
                />
                <input
                  type="text"
                  disabled={readOnly}
                  placeholder="Duração"
                  value={slot.duration}
                  onChange={(e) =>
                    updateReleaseSlot(slot.slotNumber, (s) => ({
                      ...s,
                      duration: e.target.value,
                    }))
                  }
                  className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-xs text-slate-200"
                />
              </div>

              <input
                type="text"
                disabled={readOnly}
                placeholder="Dano ou Efeito principal..."
                value={slot.damageOrEffect}
                onChange={(e) =>
                  updateReleaseSlot(slot.slotNumber, (s) => ({
                    ...s,
                    damageOrEffect: e.target.value,
                  }))
                }
                className="w-full rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1 text-xs text-slate-200"
              />

              <textarea
                rows={2}
                disabled={readOnly}
                placeholder="Descrição completa e condições desta liberação..."
                value={slot.description}
                onChange={(e) =>
                  updateReleaseSlot(slot.slotNumber, (s) => ({
                    ...s,
                    description: e.target.value,
                  }))
                }
                className="w-full rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1.5 text-xs text-slate-300"
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
