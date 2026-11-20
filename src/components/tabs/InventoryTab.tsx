import { Plus, Trash2 } from 'lucide-react';
import type { FichaPersonagem, InventoryCategory } from '../../types/character';
import { createCalculableField, resolveCalculableValue } from '../../utils/calculations';
import { CalculableValueControl } from '../CalculableValueControl';

interface InventoryTabProps {
  sheet: FichaPersonagem;
  onUpdate: (updater: (prev: FichaPersonagem) => FichaPersonagem) => void;
  readOnly: boolean;
}

export function InventoryTab({ sheet, onUpdate, readOnly }: InventoryTabProps) {
  const inv = sheet.inventory;
  const occupied = resolveCalculableValue(inv.occupiedSpaces);
  const limit = resolveCalculableValue(inv.spaceLimit);
  const overloaded = occupied > limit;

  return (
    <div className="space-y-6">
      {/* Resumo de Espaços e Carga */}
      <section className="rounded-lg border border-[#212636] bg-[#11141e] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Registro e Inventário
            </h2>
            <p className="text-xs text-slate-400">
              Controle de espaços ocupados, armas, armaduras, escudos e equipamentos.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <CalculableValueControl
              label="Espaços Ocupados"
              field={inv.occupiedSpaces}
              readOnly={readOnly}
              size="sm"
              onChange={(occupiedSpaces) =>
                onUpdate((prev) => ({
                  ...prev,
                  inventory: { ...prev.inventory, occupiedSpaces },
                }))
              }
            />
            <CalculableValueControl
              label="Limite de Espaços"
              field={inv.spaceLimit}
              readOnly={readOnly}
              size="sm"
              onChange={(spaceLimit) =>
                onUpdate((prev) => ({
                  ...prev,
                  inventory: { ...prev.inventory, spaceLimit },
                }))
              }
            />
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
          <p className="mt-3 text-xs font-medium text-amber-400">
            Sobrecarga detectada: {occupied} / {limit} espaços ocupados.
          </p>
        )}
      </section>

      {/* Itens Gerais */}
      <section className="rounded-lg border border-[#212636] bg-[#11141e] p-5">
        <div className="mb-4 flex items-center justify-between border-b border-[#1d2230] pb-3">
          <h3 className="text-sm font-semibold text-slate-100">Itens Gerais</h3>
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
                        unitSpaces: 1,
                        totalSpaces: createCalculableField(1),
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

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1d2230] text-slate-400">
                <th className="py-2 pr-2 font-medium">Item</th>
                <th className="py-2 px-2 font-medium">Categoria</th>
                <th className="py-2 px-2 text-right font-medium">Qtd</th>
                <th className="py-2 px-2 text-right font-medium">Custo Unit.</th>
                <th className="py-2 px-2 text-right font-medium">Espaço Unit.</th>
                <th className="py-2 px-2 text-right font-medium">Total Esp.</th>
                <th className="py-2 pl-2 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181c28]">
              {inv.items.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02]">
                  <td className="py-2 pr-2">
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
                              it.id === item.id ? { ...it, name: e.target.value } : it
                            ),
                          },
                        }))
                      }
                      className="w-full min-w-36 rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-slate-100"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <select
                      disabled={readOnly}
                      value={item.category}
                      onChange={(e) =>
                        onUpdate((prev) => ({
                          ...prev,
                          inventory: {
                            ...prev.inventory,
                            items: prev.inventory.items.map((it) =>
                              it.id === item.id
                                ? {
                                    ...it,
                                    category: e.target.value as InventoryCategory,
                                  }
                                : it
                            ),
                          },
                        }))
                      }
                      className="rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-slate-200"
                    >
                      <option value="item">Item</option>
                      <option value="consumable">Consumível</option>
                      <option value="equipment">Equipamento</option>
                      <option value="accessory">Acessório</option>
                      <option value="cursed_tool">Ferramenta Amaldiçoada</option>
                    </select>
                  </td>
                  <td className="py-2 px-2 text-right">
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
                      className="w-16 rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-right font-mono-tabular text-slate-100"
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
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
                      className="w-20 rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-right font-mono-tabular text-slate-100"
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      disabled={readOnly}
                      value={item.unitSpaces}
                      onChange={(e) =>
                        onUpdate((prev) => ({
                          ...prev,
                          inventory: {
                            ...prev.inventory,
                            items: prev.inventory.items.map((it) =>
                              it.id === item.id
                                ? { ...it, unitSpaces: Number(e.target.value) || 0 }
                                : it
                            ),
                          },
                        }))
                      }
                      className="w-16 rounded border border-[#242a3b] bg-[#0b0d14] px-2 py-1 text-right font-mono-tabular text-slate-100"
                    />
                  </td>
                  <td className="py-2 px-2 text-right font-mono-tabular font-semibold text-slate-100">
                    {resolveCalculableValue(item.totalSpaces)}
                  </td>
                  <td className="py-2 pl-2 text-right">
                    {!readOnly && (
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
                        className="rounded p-1 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Armas e Armaduras */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-[#212636] bg-[#11141e] p-5">
          <div className="mb-3 flex items-center justify-between border-b border-[#1d2230] pb-2">
            <h3 className="text-sm font-semibold text-slate-100">
              Armas Registradas ({inv.weapons.length})
            </h3>
            {!readOnly && (
              <button
                type="button"
                onClick={() =>
                  onUpdate((prev) => ({
                    ...prev,
                    inventory: {
                      ...prev.inventory,
                      weapons: [
                        ...prev.inventory.weapons,
                        {
                          id: `wp-${Date.now()}`,
                          name: 'Nova Arma',
                          category: 'Simples',
                          skillRef: 'CpC',
                          bonus: 0,
                          hit: createCalculableField(0),
                          damage: '1d6',
                          critical: '20',
                          damageType: 'Cortante',
                          range: 'Cpc',
                          properties: '',
                          spaces: 1,
                          cost: 100,
                          equipped: false,
                          notes: '',
                        },
                      ],
                    },
                  }))
                }
                className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
              >
                + Arma
              </button>
            )}
          </div>
          <div className="space-y-2">
            {inv.weapons.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between gap-2 rounded border border-[#1e2332] bg-[#0d1018] px-3 py-2 text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-100">{w.name}</div>
                  <div className="text-slate-400">
                    {w.category} · Dano {w.damage} · Esp. {w.spaces}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono-tabular font-semibold text-slate-100">
                    +{resolveCalculableValue(w.hit)}
                  </span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdate((prev) => ({
                          ...prev,
                          inventory: {
                            ...prev.inventory,
                            weapons: prev.inventory.weapons.filter(
                              (item) => item.id !== w.id
                            ),
                          },
                        }))
                      }
                      className="rounded p-1 text-slate-500 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-[#212636] bg-[#11141e] p-5">
          <div className="mb-3 flex items-center justify-between border-b border-[#1d2230] pb-2">
            <h3 className="text-sm font-semibold text-slate-100">
              Armaduras e Escudos ({inv.armors.length + inv.shields.length})
            </h3>
          </div>
          <div className="space-y-2">
            {inv.armors.map((armor) => (
              <div
                key={armor.id}
                className="flex items-center justify-between gap-2 rounded border border-[#1e2332] bg-[#0d1018] px-3 py-2 text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-100">{armor.name}</div>
                  <div className="text-slate-400">
                    Defesa +{armor.defenseBonus} · Espaços {armor.spaces} ·{' '}
                    {armor.properties}
                  </div>
                </div>
                <span className="font-mono-tabular text-slate-300">
                  ¥ {armor.cost}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
