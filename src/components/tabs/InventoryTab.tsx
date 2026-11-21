import { useState } from 'react';
import {
  Image as ImageIcon,
  Link2,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { createBlankCharacterRecord } from '../../data/vanillaTemplate';
import type {
  CharacterRecordData,
  CustomEquipmentEntry,
  EquipmentCategory,
  FichaPersonagem,
} from '../../types/character';
import { createCalculableField, resolveCalculableValue } from '../../utils/calculations';
import { getGradeTheme } from '../../utils/gradeTheme';
import { CalculableValueControl } from '../CalculableValueControl';
import { GradeBadge } from '../GradeBadge';

interface InventoryTabProps {
  sheet: FichaPersonagem;
  onUpdate: (updater: (prev: FichaPersonagem) => FichaPersonagem) => void;
  readOnly: boolean;
}

const EQUIPMENT_CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  ferramenta_amaldicoada: 'Ferramenta Amaldiçoada',
  arma: 'Arma',
  uniforme: 'Uniforme',
  armadura: 'Armadura',
  escudo: 'Escudo',
  equipamento_especial: 'Equipamento Especial',
};

function createNewEquipment(category: EquipmentCategory): CustomEquipmentEntry {
  return {
    id: `eq-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: `Novo ${EQUIPMENT_CATEGORY_LABELS[category]}`,
    category,
    subType: '',
    grade: '',
    imageUrl: '',
    equipped: false,
    weight: 0,
    cost: 0,
    damage: '',
    critical: '',
    range: '',
    weaponType: '',
    defense: '',
    defensiveBonus: '',
    rd: '',
    resistances: '',
    effects: '',
    bonus: '',
    properties: '',
    customFields: [],
    enchantments: [],
    description: '',
  };
}

export function InventoryTab({ sheet, onUpdate, readOnly }: InventoryTabProps) {
  const [newEquipmentCategory, setNewEquipmentCategory] =
    useState<EquipmentCategory>('arma');
  const [showPhotoUrlInput, setShowPhotoUrlInput] = useState(false);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);

  const inv = sheet.inventory;
  const record: CharacterRecordData =
    sheet.characterRecord ?? createBlankCharacterRecord();

  const currentWeightField = inv.currentWeight ?? inv.occupiedSpaces;
  const weightLimitField = inv.weightLimit ?? inv.spaceLimit;
  const weightBonus = inv.weightBonus ?? inv.spaceBonus ?? 0;

  const currentWeight = resolveCalculableValue(currentWeightField);
  const weightLimit = resolveCalculableValue(weightLimitField);
  const overloaded = currentWeight > weightLimit;

  const equipments = inv.equipments ?? [];
  const gradeLabel = resolveCalculableValue(sheet.identity.grade);
  const gradeTheme = getGradeTheme(gradeLabel);
  const avatarUrl = sheet.identity.avatarUrl ?? '';
  const avatarFailed = Boolean(avatarUrl) && failedAvatarUrl === avatarUrl;

  const updateRecord = (patch: Partial<CharacterRecordData>) => {
    if (readOnly) return;
    onUpdate((prev) => ({
      ...prev,
      characterRecord: {
        ...(prev.characterRecord ?? createBlankCharacterRecord()),
        ...patch,
      },
    }));
  };

  const updateEquipment = (
    id: string,
    updater: (eq: CustomEquipmentEntry) => CustomEquipmentEntry
  ) => {
    if (readOnly) return;
    onUpdate((prev) => ({
      ...prev,
      inventory: {
        ...prev.inventory,
        equipments: (prev.inventory.equipments ?? []).map((eq) =>
          eq.id === id ? updater(eq) : eq
        ),
      },
    }));
  };

  return (
    <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[minmax(280px,28%)_minmax(0,1fr)] lg:grid-cols-[minmax(300px,28%)_minmax(0,1fr)]">
      {/* COLUNA ESQUERDA (25%-30%): REGISTRO COMPACTO DO PERSONAGEM */}
      <aside className="w-full">
        <section className="space-y-3 rounded-lg border border-[#212636] bg-[#11141e] p-4">
          {/* Cabeçalho com Nome do Personagem */}
          <div
            className="flex items-baseline justify-between gap-2 border-b pb-2.5"
            style={{ borderColor: gradeTheme.lineColor }}
          >
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Registro
              </div>
              <h2
                className="font-display-rpg truncate text-base font-bold"
                style={{ color: gradeTheme.nameColor }}
              >
                {sheet.identity.name.trim() || 'Personagem sem nome'}
              </h2>
            </div>
            {(sheet.identity.specialization || gradeLabel) && (
              <div className="flex shrink-0 flex-col items-end gap-1 text-right text-[11px] text-slate-300">
                {sheet.identity.specialization && (
                  <span className="text-slate-300">{sheet.identity.specialization}</span>
                )}
                <GradeBadge grade={gradeLabel} size="xs" showFallback={false} />
              </div>
            )}
          </div>

          {/* Bloco Superior: Foto na esquerda + Dados de Aparência ao lado */}
          <div className="grid grid-cols-[100px_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[112px_minmax(0,1fr)]">
            <div className="space-y-1.5">
              {avatarUrl && !avatarFailed ? (
                <img
                  src={avatarUrl}
                  alt={sheet.identity.name || 'Retrato do Personagem'}
                  referrerPolicy="no-referrer"
                  onError={() => setFailedAvatarUrl(avatarUrl)}
                  style={{ borderColor: gradeTheme.borderColor }}
                  className="aspect-[3/4] w-full rounded border bg-[#0b0d14] object-cover"
                />
              ) : (
                <div
                  style={{ borderColor: gradeTheme.borderColor }}
                  className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-1 rounded border border-dashed bg-[#0b0d14] px-2 text-center text-slate-500"
                >
                  <ImageIcon className="h-6 w-6" />
                  <span className="text-[10px]">Sem foto</span>
                </div>
              )}

              {!readOnly && (
                <button
                  type="button"
                  onClick={() => setShowPhotoUrlInput((v) => !v)}
                  className="flex w-full items-center justify-center gap-1 rounded border border-[#242a3b] bg-[#0b0d14] px-1.5 py-1 text-[10px] font-medium text-slate-300 hover:border-indigo-500/40 hover:text-indigo-200 whitespace-nowrap"
                >
                  <Link2 className="h-3 w-3 shrink-0" />
                  {showPhotoUrlInput ? 'Ocultar URL' : 'URL da foto'}
                </button>
              )}
            </div>

            {/* Dados de Aparência imediatamente ao lado da foto */}
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <label className="flex flex-col gap-0.5 text-[10px] text-slate-400">
                Idade
                <input
                  type="text"
                  disabled={readOnly}
                  value={record.age}
                  onChange={(e) => updateRecord({ age: e.target.value })}
                  className="w-full rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-xs text-slate-100"
                />
              </label>
              <label className="flex flex-col gap-0.5 text-[10px] text-slate-400">
                Gênero
                <input
                  type="text"
                  disabled={readOnly}
                  value={record.gender}
                  onChange={(e) => updateRecord({ gender: e.target.value })}
                  className="w-full rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-xs text-slate-100"
                />
              </label>
              <label className="flex flex-col gap-0.5 text-[10px] text-slate-400">
                Altura
                <input
                  type="text"
                  disabled={readOnly}
                  value={record.height}
                  onChange={(e) => updateRecord({ height: e.target.value })}
                  className="w-full rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-xs text-slate-100"
                />
              </label>
              <label className="flex flex-col gap-0.5 text-[10px] text-slate-400">
                Peso
                <input
                  type="text"
                  disabled={readOnly}
                  value={record.weight}
                  onChange={(e) => updateRecord({ weight: e.target.value })}
                  className="w-full rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-xs text-slate-100"
                />
              </label>
              <label className="flex flex-col gap-0.5 text-[10px] text-slate-400">
                Cabelos
                <input
                  type="text"
                  disabled={readOnly}
                  value={record.hair}
                  onChange={(e) => updateRecord({ hair: e.target.value })}
                  className="w-full rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-xs text-slate-100"
                />
              </label>
              <label className="flex flex-col gap-0.5 text-[10px] text-slate-400">
                Olhos
                <input
                  type="text"
                  disabled={readOnly}
                  value={record.eyes}
                  onChange={(e) => updateRecord({ eyes: e.target.value })}
                  className="w-full rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-xs text-slate-100"
                />
              </label>
            </div>
          </div>

          {showPhotoUrlInput && !readOnly && (
            <label className="flex flex-col gap-1 text-[10px] text-slate-400">
              URL da Imagem do Personagem
              <input
                type="text"
                placeholder="https://..."
                value={sheet.identity.avatarUrl ?? ''}
                onChange={(e) => {
                  onUpdate((prev) => ({
                    ...prev,
                    identity: { ...prev.identity, avatarUrl: e.target.value },
                  }));
                }}
                className="w-full rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-xs text-slate-200"
              />
            </label>
          )}

          {/* Traços, Personalidade e Ideais */}
          <div className="space-y-2 border-t border-[#1d2230] pt-3">
            <label className="flex flex-col gap-1 text-[11px] text-slate-400">
              Traços
              <textarea
                rows={2}
                disabled={readOnly}
                placeholder="Marcas, cicatrizes, trejeitos..."
                value={record.traits}
                onChange={(e) => updateRecord({ traits: e.target.value })}
                className="w-full rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1.5 text-xs text-slate-200"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-slate-400">
              Personalidade
              <textarea
                rows={2}
                disabled={readOnly}
                placeholder="Temperamento e comportamento..."
                value={record.personality}
                onChange={(e) => updateRecord({ personality: e.target.value })}
                className="w-full rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1.5 text-xs text-slate-200"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-slate-400">
              Ideais
              <textarea
                rows={2}
                disabled={readOnly}
                placeholder="Princípios, objetivos e convicções..."
                value={record.ideals}
                onChange={(e) => updateRecord({ ideals: e.target.value })}
                className="w-full rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1.5 text-xs text-slate-200"
              />
            </label>
          </div>

          {/* História na parte inferior */}
          <div className="border-t border-[#1d2230] pt-3">
            <label className="flex flex-col gap-1 text-[11px] text-slate-400">
              História
              <textarea
                rows={5}
                disabled={readOnly}
                placeholder="História do personagem, origem e acontecimentos importantes..."
                value={record.history}
                onChange={(e) => updateRecord({ history: e.target.value })}
                className="w-full rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1.5 text-xs text-slate-200"
              />
            </label>
          </div>
        </section>
      </aside>

      {/* COLUNA DIREITA (70%-75%): INVENTÁRIO PRINCIPAL */}
      <div className="min-w-0 space-y-4">
        {/* Resumo de Peso e Valor */}
        <section className="rounded-lg border border-[#212636] bg-[#11141e] px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-100">Inventário</h2>
              <p className="text-xs text-slate-400">
                Controle de peso carregado, itens comuns e equipamentos personalizáveis.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <CalculableValueControl
                label="Peso Atual"
                field={currentWeightField}
                readOnly={readOnly}
                size="sm"
                onChange={(next) =>
                  onUpdate((prev) => ({
                    ...prev,
                    inventory: {
                      ...prev.inventory,
                      currentWeight: next,
                      occupiedSpaces: next,
                    },
                  }))
                }
              />
              <CalculableValueControl
                label="Limite de Carga (Peso)"
                field={weightLimitField}
                readOnly={readOnly}
                size="sm"
                onChange={(next) =>
                  onUpdate((prev) => ({
                    ...prev,
                    inventory: {
                      ...prev.inventory,
                      weightLimit: next,
                      spaceLimit: next,
                    },
                  }))
                }
              />
              <label className="flex flex-col gap-1 text-[11px] text-slate-400">
                Bônus de Carga
                <input
                  type="number"
                  step="0.5"
                  disabled={readOnly}
                  value={weightBonus}
                  onChange={(e) => {
                    const nextBonus = Number(e.target.value) || 0;
                    onUpdate((prev) => ({
                      ...prev,
                      inventory: {
                        ...prev.inventory,
                        weightBonus: nextBonus,
                        spaceBonus: nextBonus,
                      },
                    }));
                  }}
                  className="w-20 rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-right font-mono-tabular text-xs text-slate-100"
                />
              </label>
              <CalculableValueControl
                label="Valor Total (¥)"
                field={inv.totalInventoryValue}
                readOnly={readOnly}
                size="sm"
                onChange={(totalInventoryValue) =>
                  onUpdate((prev) => ({
                    ...prev,
                    inventory: { ...prev.inventory, totalInventoryValue },
                  }))
                }
              />
            </div>
          </div>
          {overloaded && (
            <p className="mt-2.5 text-xs font-medium text-amber-400">
              Sobrecarga detectada: {currentWeight} / {weightLimit} de peso carregado.
            </p>
          )}
        </section>

        {/* Itens Comuns (Nome, Quantidade, Custo, Peso) */}
        <section className="rounded-lg border border-[#212636] bg-[#11141e] p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-[#1d2230] pb-2.5">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Itens Comuns ({inv.items.length})
              </h3>
              <p className="text-[11px] text-slate-400">
                Registro direto com Nome, Quantidade, Custo e Peso.
              </p>
            </div>
            {!readOnly && (
              <button
                type="button"
                onClick={() =>
                  onUpdate((prev) => ({
                    ...prev,
                    inventory: {
                      ...prev.inventory,
                      items: [
                        ...prev.inventory.items,
                        {
                          id: `inv-${Date.now()}`,
                          name: 'Novo Item',
                          category: 'item',
                          quantity: 1,
                          unitCost: 0,
                          totalCost: createCalculableField(0),
                          unitWeight: 0,
                          totalWeight: createCalculableField(0),
                          unitSpaces: 0,
                          totalSpaces: createCalculableField(0),
                          equipped: false,
                          description: '',
                        },
                      ],
                    },
                  }))
                }
                className="inline-flex items-center gap-1 rounded border border-[#2a3145] bg-[#171b28] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-[#202638] whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar Item
              </button>
            )}
          </div>

          {inv.items.length === 0 ? (
            <p className="text-xs text-slate-500">Nenhum item comum registrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1d2230] text-slate-400">
                    <th className="py-2 pr-2 font-medium">Nome</th>
                    <th className="py-2 px-2 text-right font-medium">Quantidade</th>
                    <th className="py-2 px-2 text-right font-medium">Custo (¥)</th>
                    <th className="py-2 px-2 text-right font-medium">Peso</th>
                    {!readOnly && (
                      <th className="py-2 pl-2 text-right font-medium">Ações</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#181c28]">
                  {inv.items.map((item) => {
                    const unitW = item.unitWeight ?? item.unitSpaces ?? 0;
                    const totalW = resolveCalculableValue(
                      item.totalWeight ?? item.totalSpaces
                    );
                    return (
                      <tr key={item.id} className="hover:bg-white/[0.02]">
                        <td className="py-1.5 pr-2">
                          <input
                            type="text"
                            disabled={readOnly}
                            value={item.name}
                            onChange={(e) =>
                              onUpdate((prev) => ({
                                ...prev,
                                inventory: {
                                  ...prev.inventory,
                                  items: prev.inventory.items.map((it) =>
                                    it.id === item.id
                                      ? { ...it, name: e.target.value }
                                      : it
                                  ),
                                },
                              }))
                            }
                            className="w-full min-w-40 rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1 text-slate-100"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <input
                            type="number"
                            min={0}
                            disabled={readOnly}
                            value={item.quantity}
                            onChange={(e) =>
                              onUpdate((prev) => ({
                                ...prev,
                                inventory: {
                                  ...prev.inventory,
                                  items: prev.inventory.items.map((it) =>
                                    it.id === item.id
                                      ? { ...it, quantity: Number(e.target.value) || 0 }
                                      : it
                                  ),
                                },
                              }))
                            }
                            className="w-20 rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-right font-mono-tabular text-slate-100"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <input
                            type="number"
                            min={0}
                            disabled={readOnly}
                            value={item.unitCost}
                            onChange={(e) =>
                              onUpdate((prev) => ({
                                ...prev,
                                inventory: {
                                  ...prev.inventory,
                                  items: prev.inventory.items.map((it) =>
                                    it.id === item.id
                                      ? { ...it, unitCost: Number(e.target.value) || 0 }
                                      : it
                                  ),
                                },
                              }))
                            }
                            className="w-24 rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-right font-mono-tabular text-slate-100"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <input
                              type="number"
                              step="0.5"
                              min={0}
                              disabled={readOnly}
                              value={unitW}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                onUpdate((prev) => ({
                                  ...prev,
                                  inventory: {
                                    ...prev.inventory,
                                    items: prev.inventory.items.map((it) =>
                                      it.id === item.id
                                        ? { ...it, unitWeight: val, unitSpaces: val }
                                        : it
                                    ),
                                  },
                                }));
                              }}
                              className="w-20 rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-right font-mono-tabular text-slate-100"
                            />
                            {item.quantity > 1 && (
                              <span className="font-mono-tabular text-[11px] text-slate-400">
                                ({totalW})
                              </span>
                            )}
                          </div>
                        </td>
                        {!readOnly && (
                          <td className="py-1.5 pl-2 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                onUpdate((prev) => ({
                                  ...prev,
                                  inventory: {
                                    ...prev.inventory,
                                    items: prev.inventory.items.filter(
                                      (it) => it.id !== item.id
                                    ),
                                  },
                                }))
                              }
                              title="Remover item"
                              className="rounded p-1 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Equipamentos Personalizáveis (Cards Adaptativos) */}
        <section className="rounded-lg border border-[#212636] bg-[#11141e] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#1d2230] pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Equipamentos Personalizáveis ({equipments.length})
              </h3>
              <p className="text-[11px] text-slate-400">
                Cards adaptáveis por categoria (Ferramentas Amaldiçoadas, Armas, Uniformes, Armaduras, Escudos e Equipamentos Especiais).
              </p>
            </div>
            {!readOnly && (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Categoria do novo equipamento"
                  value={newEquipmentCategory}
                  onChange={(e) =>
                    setNewEquipmentCategory(e.target.value as EquipmentCategory)
                  }
                  className="rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1.5 text-xs text-slate-200"
                >
                  {(
                    Object.keys(EQUIPMENT_CATEGORY_LABELS) as EquipmentCategory[]
                  ).map((cat) => (
                    <option key={cat} value={cat}>
                      {EQUIPMENT_CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    onUpdate((prev) => ({
                      ...prev,
                      inventory: {
                        ...prev.inventory,
                        equipments: [
                          ...(prev.inventory.equipments ?? []),
                          createNewEquipment(newEquipmentCategory),
                        ],
                      },
                    }))
                  }
                  className="inline-flex items-center gap-1.5 rounded border border-indigo-500/40 bg-indigo-600/15 px-3 py-1.5 text-xs font-medium text-indigo-100 hover:bg-indigo-600/25 whitespace-nowrap shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Novo Equipamento
                </button>
              </div>
            )}
          </div>

          {equipments.length === 0 ? (
            <div className="rounded border border-[#1e2332] bg-[#0d1018] p-6 text-center text-xs text-slate-400">
              Nenhum equipamento cadastrado. Selecione uma categoria acima e crie um card personalizável.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {equipments.map((eq) => {
                const isWeaponLike =
                  eq.category === 'arma' ||
                  eq.category === 'ferramenta_amaldicoada';
                const isArmorOrUniform =
                  eq.category === 'uniforme' || eq.category === 'armadura';
                const isShield = eq.category === 'escudo';
                const isSpecialOrTool =
                  eq.category === 'equipamento_especial' ||
                  eq.category === 'ferramenta_amaldicoada';

                return (
                  <article
                    key={eq.id}
                    className="space-y-3 rounded-lg border border-[#1e2332] bg-[#0d1018] p-4 text-xs"
                  >
                    {/* Cabeçalho do Card: Imagem + Nome + Categoria/Grau/Equipado */}
                    <div className="flex items-start justify-between gap-3 border-b border-[#191e2b] pb-3">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        {eq.imageUrl ? (
                          <img
                            src={eq.imageUrl}
                            alt={eq.name}
                            referrerPolicy="no-referrer"
                            className="h-14 w-14 shrink-0 rounded-lg border border-[#2a3145] bg-[#0b0d14] object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[#242a3b] bg-[#0b0d14] text-slate-500">
                            <ImageIcon className="h-5 w-5" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              disabled={readOnly}
                              placeholder="Nome do equipamento"
                              value={eq.name}
                              onChange={(e) =>
                                updateEquipment(eq.id, (cur) => ({
                                  ...cur,
                                  name: e.target.value,
                                }))
                              }
                              className="min-w-36 flex-1 rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1 text-sm font-semibold text-slate-100"
                            />
                            <label className="inline-flex shrink-0 items-center gap-1.5 rounded border border-[#242a3b] bg-[#11141e] px-2 py-1 text-[11px] text-slate-300">
                              <input
                                type="checkbox"
                                disabled={readOnly}
                                checked={eq.equipped}
                                onChange={(e) =>
                                  updateEquipment(eq.id, (cur) => ({
                                    ...cur,
                                    equipped: e.target.checked,
                                  }))
                                }
                                className="h-3.5 w-3.5 accent-emerald-500"
                              />
                              Equipado
                            </label>
                          </div>

                          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                            <select
                              disabled={readOnly}
                              value={eq.category}
                              onChange={(e) =>
                                updateEquipment(eq.id, (cur) => ({
                                  ...cur,
                                  category: e.target.value as EquipmentCategory,
                                }))
                              }
                              className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-xs text-indigo-200"
                            >
                              {(
                                Object.keys(
                                  EQUIPMENT_CATEGORY_LABELS
                                ) as EquipmentCategory[]
                              ).map((cat) => (
                                <option key={cat} value={cat}>
                                  {EQUIPMENT_CATEGORY_LABELS[cat]}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              disabled={readOnly}
                              placeholder="Subtipo"
                              value={eq.subType}
                              onChange={(e) =>
                                updateEquipment(eq.id, (cur) => ({
                                  ...cur,
                                  subType: e.target.value,
                                }))
                              }
                              className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-xs text-slate-200"
                            />
                            <input
                              type="text"
                              disabled={readOnly}
                              placeholder="Grau"
                              value={eq.grade}
                              onChange={(e) =>
                                updateEquipment(eq.id, (cur) => ({
                                  ...cur,
                                  grade: e.target.value,
                                }))
                              }
                              className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-xs text-slate-200"
                            />
                          </div>
                        </div>
                      </div>

                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdate((prev) => ({
                              ...prev,
                              inventory: {
                                ...prev.inventory,
                                equipments: (prev.inventory.equipments ?? []).filter(
                                  (item) => item.id !== eq.id
                                ),
                              },
                            }))
                          }
                          title="Excluir equipamento"
                          className="shrink-0 rounded p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Imagem URL, Peso e Custo */}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <label className="col-span-2 flex flex-col gap-1 text-[11px] text-slate-400">
                        URL da Imagem
                        <input
                          type="text"
                          disabled={readOnly}
                          placeholder="https://..."
                          value={eq.imageUrl ?? ''}
                          onChange={(e) =>
                            updateEquipment(eq.id, (cur) => ({
                              ...cur,
                              imageUrl: e.target.value,
                            }))
                          }
                          className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-xs text-slate-200"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-[11px] text-slate-400">
                        Peso
                        <input
                          type="number"
                          step="0.5"
                          min={0}
                          disabled={readOnly}
                          value={eq.weight}
                          onChange={(e) =>
                            updateEquipment(eq.id, (cur) => ({
                              ...cur,
                              weight: Number(e.target.value) || 0,
                            }))
                          }
                          className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-right font-mono-tabular text-xs text-slate-100"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-[11px] text-slate-400">
                        Custo (¥)
                        <input
                          type="number"
                          min={0}
                          disabled={readOnly}
                          value={eq.cost}
                          onChange={(e) =>
                            updateEquipment(eq.id, (cur) => ({
                              ...cur,
                              cost: Number(e.target.value) || 0,
                            }))
                          }
                          className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-right font-mono-tabular text-xs text-slate-100"
                        />
                      </label>
                    </div>

                    {/* Campos Específicos por Categoria */}
                    <div className="grid grid-cols-2 gap-2">
                      {isWeaponLike && (
                        <>
                          <label className="flex flex-col gap-1 text-[11px] text-slate-400">
                            {eq.category === 'arma' ? 'Dano' : 'Dano (opcional)'}
                            <input
                              type="text"
                              disabled={readOnly}
                              placeholder="ex: 1d8 + FOR"
                              value={eq.damage ?? ''}
                              onChange={(e) =>
                                updateEquipment(eq.id, (cur) => ({
                                  ...cur,
                                  damage: e.target.value,
                                }))
                              }
                              className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 font-mono-tabular text-xs text-slate-100"
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-[11px] text-slate-400">
                            {eq.category === 'arma' ? 'Crítico' : 'Crítico (opcional)'}
                            <input
                              type="text"
                              disabled={readOnly}
                              placeholder="ex: 19/x2"
                              value={eq.critical ?? ''}
                              onChange={(e) =>
                                updateEquipment(eq.id, (cur) => ({
                                  ...cur,
                                  critical: e.target.value,
                                }))
                              }
                              className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-xs text-slate-100"
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-[11px] text-slate-400">
                            Alcance
                            <input
                              type="text"
                              disabled={readOnly}
                              placeholder="ex: Corpo a corpo / 18m"
                              value={eq.range ?? ''}
                              onChange={(e) =>
                                updateEquipment(eq.id, (cur) => ({
                                  ...cur,
                                  range: e.target.value,
                                }))
                              }
                              className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-xs text-slate-100"
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-[11px] text-slate-400">
                            Tipo de Dano / Arma
                            <input
                              type="text"
                              disabled={readOnly}
                              placeholder="ex: Cortante, Haste"
                              value={eq.weaponType ?? ''}
                              onChange={(e) =>
                                updateEquipment(eq.id, (cur) => ({
                                  ...cur,
                                  weaponType: e.target.value,
                                }))
                              }
                              className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-xs text-slate-100"
                            />
                          </label>
                        </>
                      )}

                      {isArmorOrUniform && (
                        <>
                          <label className="flex flex-col gap-1 text-[11px] text-slate-400">
                            Defesa
                            <input
                              type="text"
                              disabled={readOnly}
                              placeholder="ex: +4"
                              value={eq.defense ?? ''}
                              onChange={(e) =>
                                updateEquipment(eq.id, (cur) => ({
                                  ...cur,
                                  defense: e.target.value,
                                }))
                              }
                              className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 font-mono-tabular text-xs text-slate-100"
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-[11px] text-slate-400">
                            RD
                            <input
                              type="text"
                              disabled={readOnly}
                              placeholder="ex: RD 2"
                              value={eq.rd ?? ''}
                              onChange={(e) =>
                                updateEquipment(eq.id, (cur) => ({
                                  ...cur,
                                  rd: e.target.value,
                                }))
                              }
                              className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-xs text-slate-100"
                            />
                          </label>
                          <label className="col-span-2 flex flex-col gap-1 text-[11px] text-slate-400">
                            Resistências
                            <input
                              type="text"
                              disabled={readOnly}
                              placeholder="ex: Cortante, Queimante"
                              value={eq.resistances ?? ''}
                              onChange={(e) =>
                                updateEquipment(eq.id, (cur) => ({
                                  ...cur,
                                  resistances: e.target.value,
                                }))
                              }
                              className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-xs text-slate-100"
                            />
                          </label>
                        </>
                      )}

                      {isShield && (
                        <>
                          <label className="flex flex-col gap-1 text-[11px] text-slate-400">
                            Defesa
                            <input
                              type="text"
                              disabled={readOnly}
                              placeholder="ex: +2"
                              value={eq.defense ?? ''}
                              onChange={(e) =>
                                updateEquipment(eq.id, (cur) => ({
                                  ...cur,
                                  defense: e.target.value,
                                }))
                              }
                              className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 font-mono-tabular text-xs text-slate-100"
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-[11px] text-slate-400">
                            Bônus Defensivo
                            <input
                              type="text"
                              disabled={readOnly}
                              placeholder="ex: +2 vs Projéteis"
                              value={eq.defensiveBonus ?? ''}
                              onChange={(e) =>
                                updateEquipment(eq.id, (cur) => ({
                                  ...cur,
                                  defensiveBonus: e.target.value,
                                }))
                              }
                              className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-xs text-slate-100"
                            />
                          </label>
                        </>
                      )}

                      {isSpecialOrTool && (
                        <label className="col-span-2 flex flex-col gap-1 text-[11px] text-slate-400">
                          Efeitos
                          <input
                            type="text"
                            disabled={readOnly}
                            placeholder="Efeito ativo ou passivo do item..."
                            value={eq.effects ?? ''}
                            onChange={(e) =>
                              updateEquipment(eq.id, (cur) => ({
                                ...cur,
                                effects: e.target.value,
                              }))
                            }
                            className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-xs text-slate-100"
                          />
                        </label>
                      )}
                    </div>

                    {/* Bônus e Propriedades */}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <label className="flex flex-col gap-1 text-[11px] text-slate-400">
                        Bônus
                        <input
                          type="text"
                          disabled={readOnly}
                          placeholder="ex: +2 acerto, +1 CD..."
                          value={eq.bonus}
                          onChange={(e) =>
                            updateEquipment(eq.id, (cur) => ({
                              ...cur,
                              bonus: e.target.value,
                            }))
                          }
                          className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-xs text-slate-200"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-[11px] text-slate-400">
                        Propriedades
                        <input
                          type="text"
                          disabled={readOnly}
                          placeholder="ex: Ágil, Duas Mãos, Furtiva..."
                          value={eq.properties}
                          onChange={(e) =>
                            updateEquipment(eq.id, (cur) => ({
                              ...cur,
                              properties: e.target.value,
                            }))
                          }
                          className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-xs text-slate-200"
                        />
                      </label>
                    </div>

                    {/* Campos Personalizáveis Extras */}
                    <div className="rounded border border-[#1a2030] bg-[#11141e] p-2.5">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-300">
                          Campos Personalizáveis ({(eq.customFields ?? []).length})
                        </span>
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() =>
                              updateEquipment(eq.id, (cur) => ({
                                ...cur,
                                customFields: [
                                  ...(cur.customFields ?? []),
                                  {
                                    id: `cf-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                                    label: '',
                                    value: '',
                                  },
                                ],
                              }))
                            }
                            className="text-[11px] text-indigo-300 hover:text-indigo-200"
                          >
                            + Campo
                          </button>
                        )}
                      </div>
                      {(eq.customFields ?? []).length === 0 ? (
                        <p className="text-[11px] text-slate-500">
                          Nenhum campo extra adicionado.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {(eq.customFields ?? []).map((cf) => (
                            <div key={cf.id} className="flex items-center gap-2">
                              <input
                                type="text"
                                disabled={readOnly}
                                placeholder="Nome do campo"
                                value={cf.label}
                                onChange={(e) =>
                                  updateEquipment(eq.id, (cur) => ({
                                    ...cur,
                                    customFields: (cur.customFields ?? []).map((item) =>
                                      item.id === cf.id
                                        ? { ...item, label: e.target.value }
                                        : item
                                    ),
                                  }))
                                }
                                className="w-32 rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-[11px] text-slate-200"
                              />
                              <input
                                type="text"
                                disabled={readOnly}
                                placeholder="Valor"
                                value={cf.value}
                                onChange={(e) =>
                                  updateEquipment(eq.id, (cur) => ({
                                    ...cur,
                                    customFields: (cur.customFields ?? []).map((item) =>
                                      item.id === cf.id
                                        ? { ...item, value: e.target.value }
                                        : item
                                    ),
                                  }))
                                }
                                className="flex-1 rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-[11px] text-slate-100"
                              />
                              {!readOnly && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateEquipment(eq.id, (cur) => ({
                                      ...cur,
                                      customFields: (cur.customFields ?? []).filter(
                                        (item) => item.id !== cf.id
                                      ),
                                    }))
                                  }
                                  className="p-1 text-slate-500 hover:text-red-400"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Encantamentos */}
                    <div className="rounded border border-[#1a2030] bg-[#11141e] p-2.5">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-200">
                          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                          Encantamentos ({eq.enchantments.length})
                        </span>
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() =>
                              updateEquipment(eq.id, (cur) => ({
                                ...cur,
                                enchantments: [
                                  ...cur.enchantments,
                                  {
                                    id: `enc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                                    name: '',
                                    effect: '',
                                  },
                                ],
                              }))
                            }
                            className="text-[11px] text-amber-300 hover:text-amber-200"
                          >
                            + Encantamento
                          </button>
                        )}
                      </div>
                      {eq.enchantments.length === 0 ? (
                        <p className="text-[11px] text-slate-500">
                          Nenhum encantamento aplicado a este equipamento.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {eq.enchantments.map((enc) => (
                            <div key={enc.id} className="flex flex-wrap items-center gap-2">
                              <input
                                type="text"
                                disabled={readOnly}
                                placeholder="Nome do encantamento"
                                value={enc.name}
                                onChange={(e) =>
                                  updateEquipment(eq.id, (cur) => ({
                                    ...cur,
                                    enchantments: cur.enchantments.map((item) =>
                                      item.id === enc.id
                                        ? { ...item, name: e.target.value }
                                        : item
                                    ),
                                  }))
                                }
                                className="w-36 rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-[11px] font-medium text-amber-200"
                              />
                              <input
                                type="text"
                                disabled={readOnly}
                                placeholder="Efeito do encantamento"
                                value={enc.effect}
                                onChange={(e) =>
                                  updateEquipment(eq.id, (cur) => ({
                                    ...cur,
                                    enchantments: cur.enchantments.map((item) =>
                                      item.id === enc.id
                                        ? { ...item, effect: e.target.value }
                                        : item
                                    ),
                                  }))
                                }
                                className="min-w-36 flex-1 rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-[11px] text-slate-200"
                              />
                              {!readOnly && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateEquipment(eq.id, (cur) => ({
                                      ...cur,
                                      enchantments: cur.enchantments.filter(
                                        (item) => item.id !== enc.id
                                      ),
                                    }))
                                  }
                                  className="p-1 text-slate-500 hover:text-red-400"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Descrição */}
                    <label className="flex flex-col gap-1 text-[11px] text-slate-400">
                      Descrição
                      <textarea
                        rows={2}
                        disabled={readOnly}
                        placeholder="Descrição geral, história ou detalhes adicionais do equipamento..."
                        value={eq.description}
                        onChange={(e) =>
                          updateEquipment(eq.id, (cur) => ({
                            ...cur,
                            description: e.target.value,
                          }))
                        }
                        className="rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1.5 text-xs text-slate-300"
                      />
                    </label>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
