import { Plus, Trash2 } from 'lucide-react';
import type {
  FichaPersonagem,
  TrainingCategory,
  TrainingStatus,
} from '../../types/character';
import { createCalculableField, resolveCalculableValue } from '../../utils/calculations';
import { CalculableValueControl } from '../CalculableValueControl';

interface TrainingsTabProps {
  sheet: FichaPersonagem;
  onUpdate: (updater: (prev: FichaPersonagem) => FichaPersonagem) => void;
  readOnly: boolean;
}

export function TrainingsTab({ sheet, onUpdate, readOnly }: TrainingsTabProps) {
  const tr = sheet.trainings;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-[#212636] bg-[#11141e] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Treinamentos e Interlúdios
            </h2>
            <p className="text-xs text-slate-400">
              Etapas, progresso, estudos, criação de itens, adaptação e revisão de técnica.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <CalculableValueControl
              label="Foco / Interlúdio"
              field={tr.availableFocusPerInterlude}
              readOnly={readOnly}
              size="sm"
              onChange={(availableFocusPerInterlude) =>
                onUpdate((prev) => ({
                  ...prev,
                  trainings: { ...prev.trainings, availableFocusPerInterlude },
                }))
              }
            />
            <CalculableValueControl
              label="Focos Gastos"
              field={tr.totalFocusSpent}
              readOnly={readOnly}
              size="sm"
              onChange={(totalFocusSpent) =>
                onUpdate((prev) => ({
                  ...prev,
                  trainings: { ...prev.trainings, totalFocusSpent },
                }))
              }
            />
            <CalculableValueControl
              label="Interlúdios Gastos"
              field={tr.totalInterludesSpent}
              readOnly={readOnly}
              size="sm"
              onChange={(totalInterludesSpent) =>
                onUpdate((prev) => ({
                  ...prev,
                  trainings: { ...prev.trainings, totalInterludesSpent },
                }))
              }
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#212636] bg-[#11141e] p-5">
        <div className="mb-4 flex items-center justify-between border-b border-[#1d2230] pb-3">
          <h3 className="text-sm font-semibold text-slate-100">
            Treinamentos Registrados
          </h3>
          {!readOnly && (
            <button
              type="button"
              onClick={() =>
                onUpdate((prev) => ({
                  ...prev,
                  trainings: {
                    ...prev.trainings,
                    trainings: [
                      ...prev.trainings.trainings,
                      {
                        id: `tr-${Date.now()}`,
                        title: 'Novo Treinamento',
                        category: 'habilidade',
                        status: 'em_andamento',
                        currentStage: 0,
                        totalStages: 4,
                        progressPercent: createCalculableField(0),
                        focusType: 'Geral',
                        focusSpent: 0,
                        interludesSpent: 0,
                        benefit: '',
                        requirements: '',
                        notes: '',
                      },
                    ],
                  },
                }))
              }
              className="inline-flex items-center gap-1 rounded border border-[#2a3145] bg-[#171b28] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-[#202638] whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar Treinamento
            </button>
          )}
        </div>

        <div className="space-y-3">
          {tr.trainings.map((entry) => {
            const pct = resolveCalculableValue(entry.progressPercent);
            return (
              <div
                key={entry.id}
                className="rounded border border-[#1e2332] bg-[#0d1018] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <input
                    type="text"
                    disabled={readOnly}
                    value={entry.title}
                    onChange={(e) =>
                      onUpdate((prev) => ({
                        ...prev,
                        trainings: {
                          ...prev.trainings,
                          trainings: prev.trainings.trainings.map((item) =>
                            item.id === entry.id
                              ? { ...item, title: e.target.value }
                              : item
                          ),
                        },
                      }))
                    }
                    className="min-w-52 flex-1 bg-transparent text-sm font-semibold text-slate-100 focus:outline-none"
                  />
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <select
                      disabled={readOnly}
                      value={entry.category}
                      onChange={(e) =>
                        onUpdate((prev) => ({
                          ...prev,
                          trainings: {
                            ...prev.trainings,
                            trainings: prev.trainings.trainings.map((item) =>
                              item.id === entry.id
                                ? {
                                    ...item,
                                    category: e.target.value as TrainingCategory,
                                  }
                                : item
                            ),
                          },
                        }))
                      }
                      className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-slate-200"
                    >
                      <option value="habilidade">Habilidade</option>
                      <option value="estudo">Estudo</option>
                      <option value="criacao_item">Criação de Item</option>
                      <option value="adaptacao">Adaptação</option>
                      <option value="revisao_tecnica">Revisão de Técnica</option>
                    </select>
                    <select
                      disabled={readOnly}
                      value={entry.status}
                      onChange={(e) =>
                        onUpdate((prev) => ({
                          ...prev,
                          trainings: {
                            ...prev.trainings,
                            trainings: prev.trainings.trainings.map((item) =>
                              item.id === entry.id
                                ? {
                                    ...item,
                                    status: e.target.value as TrainingStatus,
                                  }
                                : item
                            ),
                          },
                        }))
                      }
                      className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-slate-200"
                    >
                      <option value="disponivel">Disponível</option>
                      <option value="em_andamento">Em andamento</option>
                      <option value="concluido">Concluído</option>
                    </select>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdate((prev) => ({
                            ...prev,
                            trainings: {
                              ...prev.trainings,
                              trainings: prev.trainings.trainings.filter(
                                (item) => item.id !== entry.id
                              ),
                            },
                          }))
                        }
                        className="rounded p-1 text-slate-500 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                  <label className="flex flex-col gap-1 text-slate-400">
                    Etapa Atual
                    <input
                      type="number"
                      min={0}
                      disabled={readOnly}
                      value={entry.currentStage}
                      onChange={(e) =>
                        onUpdate((prev) => ({
                          ...prev,
                          trainings: {
                            ...prev.trainings,
                            trainings: prev.trainings.trainings.map((item) =>
                              item.id === entry.id
                                ? {
                                    ...item,
                                    currentStage: Number(e.target.value) || 0,
                                  }
                                : item
                            ),
                          },
                        }))
                      }
                      className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-right font-mono-tabular text-slate-100"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-slate-400">
                    Total Etapas
                    <input
                      type="number"
                      min={1}
                      disabled={readOnly}
                      value={entry.totalStages}
                      onChange={(e) =>
                        onUpdate((prev) => ({
                          ...prev,
                          trainings: {
                            ...prev.trainings,
                            trainings: prev.trainings.trainings.map((item) =>
                              item.id === entry.id
                                ? {
                                    ...item,
                                    totalStages: Number(e.target.value) || 1,
                                  }
                                : item
                            ),
                          },
                        }))
                      }
                      className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-right font-mono-tabular text-slate-100"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-slate-400">
                    Focos Gastos
                    <input
                      type="number"
                      min={0}
                      disabled={readOnly}
                      value={entry.focusSpent}
                      onChange={(e) =>
                        onUpdate((prev) => ({
                          ...prev,
                          trainings: {
                            ...prev.trainings,
                            trainings: prev.trainings.trainings.map((item) =>
                              item.id === entry.id
                                ? {
                                    ...item,
                                    focusSpent: Number(e.target.value) || 0,
                                  }
                                : item
                            ),
                          },
                        }))
                      }
                      className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-right font-mono-tabular text-slate-100"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-slate-400">
                    Benefício
                    <input
                      type="text"
                      disabled={readOnly}
                      value={entry.benefit}
                      onChange={(e) =>
                        onUpdate((prev) => ({
                          ...prev,
                          trainings: {
                            ...prev.trainings,
                            trainings: prev.trainings.trainings.map((item) =>
                              item.id === entry.id
                                ? { ...item, benefit: e.target.value }
                                : item
                            ),
                          },
                        }))
                      }
                      className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-slate-100"
                    />
                  </label>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded bg-[#0b0d14]">
                    <div
                      className="h-full bg-indigo-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="font-mono-tabular text-xs font-medium text-slate-300">
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
