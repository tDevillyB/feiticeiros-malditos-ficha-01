import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { FichaPersonagem, WalletTransactionType } from '../../types/character';
import { CalculableValueControl } from '../CalculableValueControl';

interface WalletTabProps {
  sheet: FichaPersonagem;
  onUpdate: (updater: (prev: FichaPersonagem) => FichaPersonagem) => void;
  readOnly: boolean;
}

export function WalletTab({ sheet, onUpdate, readOnly }: WalletTabProps) {
  const [txType, setTxType] = useState<WalletTransactionType>('adicao');
  const [txAmount, setTxAmount] = useState('100');
  const [txDescription, setTxDescription] = useState('');

  const wallet = sheet.wallet;

  const handleAddTransaction = () => {
    if (readOnly) return;
    const amount = Number.parseFloat(txAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;

    onUpdate((prev) => ({
      ...prev,
      wallet: {
        ...prev.wallet,
        finances: {
          ...prev.wallet.finances,
          transactions: [
            {
              id: `tx-${Date.now()}`,
              date: new Date().toISOString().slice(0, 10),
              type: txType,
              amount,
              category: txType === 'adicao' ? 'Entrada' : 'Despesa',
              description: txDescription.trim() || 'Registro manual',
            },
            ...prev.wallet.finances.transactions,
          ],
        },
      },
    }));
    setTxDescription('');
  };

  return (
    <div className="space-y-6">
      {/* Resumo Financeiro e XP */}
      <section className="rounded-lg border border-[#212636] bg-[#11141e] p-5">
        <h2 className="mb-4 border-b border-[#1d2230] pb-2 text-base font-semibold text-slate-100">
          Carteira, XP e Missões
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <CalculableValueControl
            label="Saldo Atual"
            field={wallet.finances.currentBalance}
            readOnly={readOnly}
            size="md"
            onChange={(currentBalance) =>
              onUpdate((prev) => ({
                ...prev,
                wallet: {
                  ...prev.wallet,
                  finances: { ...prev.wallet.finances, currentBalance },
                },
              }))
            }
          />
          <CalculableValueControl
            label="Total Adições"
            field={wallet.finances.totalAdditions}
            readOnly={readOnly}
            size="sm"
            onChange={(totalAdditions) =>
              onUpdate((prev) => ({
                ...prev,
                wallet: {
                  ...prev.wallet,
                  finances: { ...prev.wallet.finances, totalAdditions },
                },
              }))
            }
          />
          <CalculableValueControl
            label="Total Retiradas"
            field={wallet.finances.totalWithdrawals}
            readOnly={readOnly}
            size="sm"
            onChange={(totalWithdrawals) =>
              onUpdate((prev) => ({
                ...prev,
                wallet: {
                  ...prev.wallet,
                  finances: { ...prev.wallet.finances, totalWithdrawals },
                },
              }))
            }
          />
          <CalculableValueControl
            label="XP Total"
            field={wallet.xp.total}
            readOnly={readOnly}
            size="sm"
            onChange={(total) =>
              onUpdate((prev) => ({
                ...prev,
                wallet: {
                  ...prev.wallet,
                  xp: { ...prev.wallet.xp, total },
                },
              }))
            }
          />
          <CalculableValueControl
            label="XP Disponível"
            field={wallet.xp.available}
            readOnly={readOnly}
            size="sm"
            onChange={(available) =>
              onUpdate((prev) => ({
                ...prev,
                wallet: {
                  ...prev.wallet,
                  xp: { ...prev.wallet.xp, available },
                },
              }))
            }
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Transações Financeiras */}
        <section className="rounded-lg border border-[#212636] bg-[#11141e] p-5 lg:col-span-7">
          <h3 className="mb-3 border-b border-[#1d2230] pb-2 text-sm font-semibold text-slate-100">
            Transações Financeiras ({wallet.finances.currencyLabel})
          </h3>

          {!readOnly && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <select
                value={txType}
                onChange={(e) =>
                  setTxType(e.target.value as WalletTransactionType)
                }
                className="rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1.5 text-xs text-slate-100"
              >
                <option value="adicao">Adição (+)</option>
                <option value="retirada">Retirada (-)</option>
              </select>
              <input
                type="number"
                min={0}
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                placeholder="Valor"
                className="w-24 rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1.5 text-right font-mono-tabular text-xs text-slate-100"
              />
              <input
                type="text"
                value={txDescription}
                onChange={(e) => setTxDescription(e.target.value)}
                placeholder="Descrição da transação..."
                className="min-w-40 flex-1 rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1.5 text-xs text-slate-100"
              />
              <button
                type="button"
                onClick={handleAddTransaction}
                className="inline-flex items-center gap-1 rounded border border-indigo-500/50 bg-indigo-600/20 px-3 py-1.5 text-xs font-medium text-indigo-100 hover:bg-indigo-600/30 whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                Registrar
              </button>
            </div>
          )}

          <div className="divide-y divide-[#181c28] text-xs">
            {wallet.finances.transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <div>
                  <div className="font-medium text-slate-200">
                    {tx.description}
                  </div>
                  <div className="text-slate-500">
                    {tx.date} · {tx.category}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`font-mono-tabular font-semibold ${
                      tx.type === 'adicao' ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {tx.type === 'adicao' ? '+' : '-'}
                    {tx.amount}
                  </span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdate((prev) => ({
                          ...prev,
                          wallet: {
                            ...prev.wallet,
                            finances: {
                              ...prev.wallet.finances,
                              transactions:
                                prev.wallet.finances.transactions.filter(
                                  (item) => item.id !== tx.id
                                ),
                            },
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

        {/* Missões e XP */}
        <section className="rounded-lg border border-[#212636] bg-[#11141e] p-5 lg:col-span-5">
          <div className="mb-3 flex items-center justify-between border-b border-[#1d2230] pb-2">
            <h3 className="text-sm font-semibold text-slate-100">
              Missões ({wallet.missions.length})
            </h3>
            {!readOnly && (
              <button
                type="button"
                onClick={() =>
                  onUpdate((prev) => ({
                    ...prev,
                    wallet: {
                      ...prev.wallet,
                      missions: [
                        ...prev.wallet.missions,
                        {
                          id: `mis-${Date.now()}`,
                          title: 'Nova Missão',
                          grade: 'Terceiro Grau',
                          status: 'em_andamento',
                          xpReward: 100,
                          moneyReward: 500,
                          notes: '',
                        },
                      ],
                    },
                  }))
                }
                className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
              >
                + Missão
              </button>
            )}
          </div>
          <div className="space-y-2 text-xs">
            {wallet.missions.map((m) => (
              <div
                key={m.id}
                className="rounded border border-[#1e2332] bg-[#0d1018] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-100">{m.title}</span>
                  <span className="text-slate-400">{m.grade}</span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-slate-400">
                  <span>Status: {m.status}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">XP: {m.xpReward}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">¥ {m.moneyReward}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
