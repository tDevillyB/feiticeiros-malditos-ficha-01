import { useEffect, useState } from 'react';
import { Copy, Download, Lock, Plus, Shield, Trash2, Unlock, Upload } from 'lucide-react';
import { CursedProfileTab } from './components/tabs/CursedProfileTab';
import { InventoryTab } from './components/tabs/InventoryTab';
import { PersonalSheetTab } from './components/tabs/PersonalSheetTab';
import { SummonsTab } from './components/tabs/SummonsTab';
import { TrainingsTab } from './components/tabs/TrainingsTab';
import { WalletTab } from './components/tabs/WalletTab';
import { createVanillaBlankSheet } from './data/vanillaTemplate';
import type { FichaPersonagem } from './types/character';
import { recalculateCharacterSheet, resolveCalculableValue } from './utils/calculations';

type SheetTabId =
  | 'pessoal'
  | 'amaldicoado'
  | 'invocacoes'
  | 'inventario'
  | 'treinamentos'
  | 'carteira';

const STORAGE_KEY = 'fm25_obr_vanilla_sheets_v1';

const TAB_ITEMS: Array<{ id: SheetTabId; label: string }> = [
  { id: 'pessoal', label: 'Ficha Pessoal' },
  { id: 'amaldicoado', label: 'Perfil Amaldiçoado' },
  { id: 'invocacoes', label: 'Invocações' },
  { id: 'inventario', label: 'Inventário' },
  { id: 'treinamentos', label: 'Treinamentos' },
  { id: 'carteira', label: 'Carteira' },
];

function loadInitialSheets(): FichaPersonagem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as FichaPersonagem[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((s) => recalculateCharacterSheet(s));
      }
    }
  } catch {
    // Fallback para ficha em branco vanilla
  }
  return [createVanillaBlankSheet()];
}

export default function App() {
  const [sheets, setSheets] = useState<FichaPersonagem[]>(() => loadInitialSheets());
  const [activeSheetId, setActiveSheetId] = useState<string>(
    () => sheets[0]?.id ?? ''
  );
  const [activeTab, setActiveTab] = useState<SheetTabId>('pessoal');
  const [viewerRole, setViewerRole] = useState<'GM' | 'PLAYER'>('GM');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const activeSheet =
    sheets.find((s) => s.id === activeSheetId) ?? sheets[0] ?? createVanillaBlankSheet();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sheets));
    } catch {
      // Ignora erro de quota caso navegador restrinja storage
    }
  }, [sheets]);

  const showToast = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3200);
  };

  const handleUpdateActiveSheet = (
    updater: (prev: FichaPersonagem) => FichaPersonagem
  ) => {
    setSheets((prevSheets) =>
      prevSheets.map((s) => {
        if (s.id !== activeSheet.id) return s;
        return recalculateCharacterSheet({
          ...updater(s),
          updatedAt: new Date().toISOString(),
        });
      })
    );
  };

  const handleCreateSheet = () => {
    const created = createVanillaBlankSheet();
    setSheets((prev) => [...prev, created]);
    setActiveSheetId(created.id);
    setActiveTab('pessoal');
    showToast('Nova ficha em branco criada.');
  };

  const handleDuplicateSheet = () => {
    const baseName = activeSheet.identity.name.trim() || 'Ficha sem nome';
    const copy: FichaPersonagem = recalculateCharacterSheet({
      ...structuredClone(activeSheet),
      id: `sheet-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      identity: {
        ...activeSheet.identity,
        name: `${baseName} (Cópia)`,
      },
    });
    setSheets((prev) => [...prev, copy]);
    setActiveSheetId(copy.id);
    showToast('Ficha duplicada com sucesso.');
  };

  const handleDeleteSheet = (id: string) => {
    if (sheets.length <= 1) {
      const fresh = createVanillaBlankSheet();
      setSheets([fresh]);
      setActiveSheetId(fresh.id);
      setConfirmDeleteId(null);
      showToast('Ficha reiniciada em branco.');
      return;
    }
    const remaining = sheets.filter((s) => s.id !== id);
    setSheets(remaining);
    if (activeSheetId === id && remaining[0]) {
      setActiveSheetId(remaining[0].id);
    }
    setConfirmDeleteId(null);
    showToast('Ficha excluída.');
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(activeSheet, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName =
      activeSheet.identity.name.trim().toLowerCase().replace(/\s+/g, '_') || 'ficha_em_branco';
    a.href = url;
    a.download = `${safeName}_fm25.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup JSON exportado.');
  };

  const handleImportJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as FichaPersonagem;
        if (!parsed.identity || !parsed.attributes || !parsed.vitals) {
          showToast('Arquivo JSON inválido para F&M 2.5.');
          return;
        }
        const imported = recalculateCharacterSheet({
          ...parsed,
          id: `sheet-${Date.now()}`,
          updatedAt: new Date().toISOString(),
        });
        setSheets((prev) => [...prev, imported]);
        setActiveSheetId(imported.id);
        showToast(
          `Ficha "${imported.identity.name.trim() || 'Sem nome'}" importada.`
        );
      } catch {
        showToast('Erro ao ler arquivo JSON.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const isReadOnly = viewerRole === 'PLAYER' && activeSheet.permissions.lockedByGM;
  const activeGrade = resolveCalculableValue(activeSheet.identity.grade);

  return (
    <div className="min-h-screen bg-[#0b0d13] text-slate-100">
      {/* Barra Superior */}
      <header className="sticky top-0 z-20 border-b border-[#1d2230] bg-[#0d1018]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-8 px-4 py-3 sm:px-6">
          <span className="text-base font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0">
            Feiticeiros & Maldições 2.5
          </span>

          <nav
            aria-label="Seções da ficha"
            className="hidden items-center gap-5 lg:flex"
          >
            {TAB_ITEMS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`border-b-2 py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-slate-100'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCreateSheet}
              className="inline-flex items-center gap-1.5 rounded bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Nova Ficha
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto border-t border-[#181c28] px-4 py-2 lg:hidden">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'bg-indigo-600/25 text-indigo-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-[1360px] space-y-6 px-4 py-6 sm:px-6">
        {/* Barra de Contexto da Mesa */}
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[#212636] bg-[#11141e] px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-400">
              Ficha Ativa
              <select
                value={activeSheet.id}
                onChange={(e) => setActiveSheetId(e.target.value)}
                className="rounded border border-[#242a3b] bg-[#0b0d14] px-3 py-1.5 text-sm font-medium text-slate-100 focus:border-indigo-500 focus:outline-none"
              >
                {sheets.map((s, idx) => (
                  <option key={s.id} value={s.id}>
                    {s.identity.name.trim() || `Personagem #${idx + 1} (Em branco)`} — Nvl{' '}
                    {resolveCalculableValue(s.identity.level)}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{activeSheet.identity.specialization || 'Sem especialização'}</span>
              <span aria-hidden="true">·</span>
              <span>{activeSheet.identity.origin || 'Sem origem'}</span>
              <span aria-hidden="true">·</span>
              <span>{activeGrade || 'Sem grau'}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded border border-[#242a3b] bg-[#0b0d14] p-0.5">
              <button
                type="button"
                onClick={() => setViewerRole('GM')}
                className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 ${
                  viewerRole === 'GM'
                    ? 'bg-[#22283a] text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                Mestre
              </button>
              <button
                type="button"
                onClick={() => setViewerRole('PLAYER')}
                className={`rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 ${
                  viewerRole === 'PLAYER'
                    ? 'bg-[#22283a] text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Jogador
              </button>
            </div>

            {viewerRole === 'GM' && (
              <button
                type="button"
                onClick={() =>
                  handleUpdateActiveSheet((prev) => ({
                    ...prev,
                    permissions: {
                      ...prev.permissions,
                      lockedByGM: !prev.permissions.lockedByGM,
                    },
                  }))
                }
                className={`inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
                  activeSheet.permissions.lockedByGM
                    ? 'border-amber-500/50 bg-amber-500/15 text-amber-200'
                    : 'border-[#242a3b] bg-[#0b0d14] text-slate-300 hover:bg-[#171b28]'
                }`}
              >
                {activeSheet.permissions.lockedByGM ? (
                  <>
                    <Lock className="h-3.5 w-3.5" />
                    Travada p/ Jogador
                  </>
                ) : (
                  <>
                    <Unlock className="h-3.5 w-3.5" />
                    Edição Liberada
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleDuplicateSheet}
              className="inline-flex items-center gap-1 rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1.5 text-xs text-slate-300 hover:bg-[#171b28] whitespace-nowrap shrink-0"
            >
              <Copy className="h-3.5 w-3.5" />
              Duplicar
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-1 rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1.5 text-xs text-slate-300 hover:bg-[#171b28] whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar
            </button>

            <label className="inline-flex cursor-pointer items-center gap-1 rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1.5 text-xs text-slate-300 hover:bg-[#171b28] whitespace-nowrap shrink-0">
              <Upload className="h-3.5 w-3.5" />
              Importar
              <input
                type="file"
                accept="application/json"
                onChange={handleImportJson}
                className="sr-only"
              />
            </label>

            {confirmDeleteId === activeSheet.id ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleDeleteSheet(activeSheet.id)}
                  className="rounded border border-red-500/60 bg-red-500/20 px-2.5 py-1.5 text-xs font-medium text-red-200 whitespace-nowrap shrink-0"
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="rounded border border-[#242a3b] px-2 py-1.5 text-xs text-slate-400 whitespace-nowrap shrink-0"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDeleteId(activeSheet.id)}
                className="inline-flex items-center gap-1 rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1.5 text-xs text-slate-400 hover:border-red-500/40 hover:text-red-300 whitespace-nowrap shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {sheets.length <= 1 ? 'Zerar' : 'Excluir'}
              </button>
            )}
          </div>
        </section>

        {feedbackMessage && (
          <div
            role="status"
            className="rounded border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-xs font-medium text-indigo-200"
          >
            {feedbackMessage}
          </div>
        )}

        {isReadOnly && (
          <div className="rounded border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-200">
            Modo somente leitura ativo: o mestre travou alterações nesta ficha para jogadores.
          </div>
        )}

        {activeTab === 'pessoal' && (
          <PersonalSheetTab
            sheet={activeSheet}
            onUpdate={handleUpdateActiveSheet}
            readOnly={isReadOnly}
          />
        )}
        {activeTab === 'amaldicoado' && (
          <CursedProfileTab
            sheet={activeSheet}
            onUpdate={handleUpdateActiveSheet}
            readOnly={isReadOnly}
          />
        )}
        {activeTab === 'invocacoes' && (
          <SummonsTab
            sheet={activeSheet}
            onUpdate={handleUpdateActiveSheet}
            readOnly={isReadOnly}
          />
        )}
        {activeTab === 'inventario' && (
          <InventoryTab
            sheet={activeSheet}
            onUpdate={handleUpdateActiveSheet}
            readOnly={isReadOnly}
          />
        )}
        {activeTab === 'treinamentos' && (
          <TrainingsTab
            sheet={activeSheet}
            onUpdate={handleUpdateActiveSheet}
            readOnly={isReadOnly}
          />
        )}
        {activeTab === 'carteira' && (
          <WalletTab
            sheet={activeSheet}
            onUpdate={handleUpdateActiveSheet}
            readOnly={isReadOnly}
          />
        )}
      </main>
    </div>
  );
}
