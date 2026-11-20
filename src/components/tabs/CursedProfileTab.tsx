import { Plus, Trash2 } from 'lucide-react';
import type { AttributeKey, FichaPersonagem } from '../../types/character';
import { createCalculableField } from '../../utils/calculations';
import { CalculableValueControl } from '../CalculableValueControl';

interface CursedProfileTabProps {
  sheet: FichaPersonagem;
  onUpdate: (updater: (prev: FichaPersonagem) => FichaPersonagem) => void;
  readOnly: boolean;
}

const ATTRIBUTE_KEYS: AttributeKey[] = ['FOR', 'DEX', 'CON', 'INT', 'SAB', 'PRE'];

export function CursedProfileTab({
  sheet,
  onUpdate,
  readOnly,
}: CursedProfileTabProps) {
  const profile = sheet.cursedProfile;

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

      {/* Barreira, Domínio e Liberação Máxima */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-[#212636] bg-[#11141e] p-5">
          <h2 className="mb-3 border-b border-[#1d2230] pb-2 text-base font-semibold text-slate-100">
            Barreiras e Energia Reversa
          </h2>
          <div className="grid grid-cols-2 gap-4">
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

        <section className="rounded-lg border border-[#212636] bg-[#11141e] p-5">
          <div className="mb-3 flex items-center justify-between border-b border-[#1d2230] pb-2">
            <h2 className="text-base font-semibold text-slate-100">
              Expansão de Domínio e Liberação Máxima
            </h2>
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-slate-400">
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
              Liberação Máxima
              <input
                type="text"
                disabled={readOnly}
                placeholder="Nome da liberação máxima..."
                value={profile.maximumRelease.name}
                onChange={(e) =>
                  onUpdate((prev) => ({
                    ...prev,
                    cursedProfile: {
                      ...prev.cursedProfile,
                      maximumRelease: {
                        ...prev.cursedProfile.maximumRelease,
                        name: e.target.value,
                      },
                    },
                  }))
                }
                className="rounded border border-[#242a3b] bg-[#0b0d14] px-3 py-1.5 text-sm text-slate-100"
              />
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}
