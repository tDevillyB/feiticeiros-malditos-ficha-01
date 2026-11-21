import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import {
  Backpack,
  Copy,
  Download,
  Dumbbell,
  Ghost,
  Lock,
  Menu,
  Plus,
  Shield,
  Sparkles,
  Trash2,
  Unlock,
  Upload,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { GradeBadge } from './components/GradeBadge';
import { CursedProfileTab } from './components/tabs/CursedProfileTab';
import { InventoryTab } from './components/tabs/InventoryTab';
import { MasterShieldTab } from './components/tabs/MasterShieldTab';
import { PersonalSheetTab } from './components/tabs/PersonalSheetTab';
import { SummonsTab } from './components/tabs/SummonsTab';
import { TrainingsTab } from './components/tabs/TrainingsTab';
import { WalletTab } from './components/tabs/WalletTab';
import { createVanillaBlankSheet, generateUniqueSheetId } from './data/vanillaTemplate';
import {
  initOBRSession,
  normalizeSyncedSheet,
  removePrivacySettingsFromPlayerMetadata,
  removeSharedSummaryFromRoom,
  savePrivacySettingsToPlayerMetadata,
  sendOBRSyncMessage,
  upsertSharedSummaryInRoom,
  type OBRSessionContext,
  type OBRSyncMessage,
} from './services/obrSync';
import type { FichaPersonagem, SharedCharacterSummary } from './types/character';
import { recalculateCharacterSheet, resolveCalculableValue } from './utils/calculations';
import {
  evaluateSheetAccess,
  evaluateSheetAccessFromSheet,
  sanitizeSheetForCombatCenterOnly,
  shouldShowOnMasterShield,
  type MasterShieldVisibilityContext,
  type SheetAccessContext,
} from './utils/permissions';

type SheetTabId =
  | 'pessoal'
  | 'amaldicoado'
  | 'invocacoes'
  | 'inventario'
  | 'treinamentos'
  | 'carteira'
  | 'escudo';

const STORAGE_KEY = 'fm25_obr_vanilla_sheets_v1';
const GM_REMOTE_CACHE_KEY = 'fm25_obr_gm_remote_sheets_v1';
const DELETED_SHEETS_STORAGE_KEY = 'fm25_obr_deleted_sheets_v1';
const MAX_LOCAL_TOMBSTONES = 120;

const TAB_ITEMS: Array<{
  id: SheetTabId;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { id: 'pessoal', label: 'Ficha Pessoal', icon: User },
  { id: 'amaldicoado', label: 'Perfil Amaldiçoado', icon: Sparkles },
  { id: 'invocacoes', label: 'Shikigamis', icon: Ghost },
  { id: 'inventario', label: 'Registro e Inventário', icon: Backpack },
  { id: 'treinamentos', label: 'Treinamentos', icon: Dumbbell },
  { id: 'carteira', label: 'Carteira', icon: Wallet },
  { id: 'escudo', label: 'Escudo do Mestre', icon: Shield },
];

function pruneDeletedSheetsMap(
  map: Record<string, string>,
  maxEntries = MAX_LOCAL_TOMBSTONES
): Record<string, string> {
  const entries = Object.entries(map).filter(
    ([id, ts]) => typeof id === 'string' && id.length > 0 && typeof ts === 'string' && ts.length > 0
  );
  if (entries.length <= maxEntries) return Object.fromEntries(entries);
  entries.sort((a, b) => (a[1] > b[1] ? -1 : a[1] < b[1] ? 1 : 0));
  return Object.fromEntries(entries.slice(0, maxEntries));
}

function loadDeletedSheetsMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(DELETED_SHEETS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object') {
        return pruneDeletedSheetsMap(parsed as Record<string, string>);
      }
    }
  } catch {
    // Ignora erro ao ler tombstones locais
  }
  return {};
}

function deduplicateSheetsById(sheets: FichaPersonagem[]): FichaPersonagem[] {
  const byId = new Map<string, FichaPersonagem>();
  for (const rawSheet of sheets) {
    if (!rawSheet || typeof rawSheet.id !== 'string' || !rawSheet.id) continue;
    const sheet = normalizeSyncedSheet(rawSheet);
    const existing = byId.get(sheet.id);
    if (!existing || sheet.updatedAt >= existing.updatedAt) {
      byId.set(sheet.id, sheet);
    }
  }
  return Array.from(byId.values());
}

function filterOutDeletedSheets(
  sheets: FichaPersonagem[],
  deletedMap: Record<string, string>
): FichaPersonagem[] {
  return sheets.filter((s) => {
    const deletedAt = deletedMap[s.id];
    if (!deletedAt) return true;
    return Boolean(s.updatedAt && s.updatedAt > deletedAt);
  });
}

function loadGmCachedSheets(deletedMap: Record<string, string>): FichaPersonagem[] {
  try {
    const raw = localStorage.getItem(GM_REMOTE_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as FichaPersonagem[];
      if (Array.isArray(parsed)) {
        return filterOutDeletedSheets(deduplicateSheetsById(parsed), deletedMap);
      }
    }
  } catch {
    // Ignora erro de cache local
  }
  return [];
}

function loadInitialSheets(
  deletedMap: Record<string, string>,
  hasGmCachedSheets: boolean
): FichaPersonagem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw) as FichaPersonagem[];
      if (Array.isArray(parsed)) {
        const cleaned = filterOutDeletedSheets(deduplicateSheetsById(parsed), deletedMap);
        if (cleaned.length > 0) {
          return cleaned;
        }
        if (hasGmCachedSheets) {
          return [];
        }
      }
    }
  } catch {
    // Fallback para ficha em branco vanilla
  }
  return [createVanillaBlankSheet()];
}

export default function App() {
  const initialDeletedMap = useMemo(() => loadDeletedSheetsMap(), []);
  const [deletedSheets, setDeletedSheets] = useState<Record<string, string>>(
    () => initialDeletedMap
  );
  const [gmCachedSheets, setGmCachedSheets] = useState<FichaPersonagem[]>(() =>
    loadGmCachedSheets(initialDeletedMap)
  );
  const [localSheets, setLocalSheets] = useState<FichaPersonagem[]>(() =>
    loadInitialSheets(initialDeletedMap, gmCachedSheets.length > 0)
  );
  const [remoteSharedSheets, setRemoteSharedSheets] = useState<FichaPersonagem[]>([]);
  const [sharedSummaries, setSharedSummaries] = useState<Record<string, SharedCharacterSummary>>(
    {}
  );
  const [obrCtx, setObrCtx] = useState<OBRSessionContext>({
    isInsideOBR: false,
    isReady: false,
    playerId: null,
    playerName: '',
    role: null,
    party: [],
    privacyBySheetId: {},
  });

  const [activeSheetId, setActiveSheetId] = useState<string>(
    () => localSheets[0]?.id ?? gmCachedSheets[0]?.id ?? ''
  );
  const [selectedControlSheetId, setSelectedControlSheetId] = useState<string>(
    () => localSheets[0]?.id ?? gmCachedSheets[0]?.id ?? ''
  );
  const [activeTab, setActiveTab] = useState<SheetTabId>('pessoal');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [requestedShieldSubView, setRequestedShieldSubView] = useState<{
    view: 'overview' | 'control';
    nonce: number;
  } | null>(null);
  const [localFallbackRole, setLocalFallbackRole] = useState<'GM' | 'PLAYER'>('GM');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const viewerRole: 'GM' | 'PLAYER' = obrCtx.isInsideOBR
    ? obrCtx.role ?? 'PLAYER'
    : localFallbackRole;

  const localSheetsRef = useRef(localSheets);
  localSheetsRef.current = localSheets;
  const gmCachedSheetsRef = useRef(gmCachedSheets);
  gmCachedSheetsRef.current = gmCachedSheets;
  const remoteSharedSheetsRef = useRef(remoteSharedSheets);
  remoteSharedSheetsRef.current = remoteSharedSheets;
  const sharedSummariesRef = useRef(sharedSummaries);
  sharedSummariesRef.current = sharedSummaries;
  const deletedSheetsRef = useRef(deletedSheets);
  deletedSheetsRef.current = deletedSheets;
  const obrCtxRef = useRef(obrCtx);
  obrCtxRef.current = obrCtx;
  const viewerRoleRef = useRef(viewerRole);
  viewerRoleRef.current = viewerRole;
  const didInitialRoomSyncRef = useRef(false);
  const prevPartyCountRef = useRef(0);

  const showToast = useCallback((msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3200);
  }, []);

  const localSheetIds = useMemo(
    () => new Set(localSheets.map((s) => s.id)),
    [localSheets]
  );

  const gmPlayerIds = useMemo(() => {
    const ids = new Set<string>(
      obrCtx.party.filter((p) => p.role === 'GM').map((p) => p.id)
    );
    if (obrCtx.isInsideOBR && obrCtx.role === 'GM' && obrCtx.playerId) {
      ids.add(obrCtx.playerId);
    }
    return ids;
  }, [obrCtx.party, obrCtx.isInsideOBR, obrCtx.role, obrCtx.playerId]);

  const accessContext: SheetAccessContext = useMemo(
    () => ({
      viewerRole,
      currentPlayerId: obrCtx.playerId,
      isInsideOBR: obrCtx.isInsideOBR,
      localSheetIds,
    }),
    [viewerRole, obrCtx.playerId, obrCtx.isInsideOBR, localSheetIds]
  );

  const visibilityContext: MasterShieldVisibilityContext = useMemo(
    () => ({
      viewerRole,
      currentPlayerId: obrCtx.playerId,
      isInsideOBR: obrCtx.isInsideOBR,
      localSheetIds,
      gmPlayerIds,
    }),
    [viewerRole, obrCtx.playerId, obrCtx.isInsideOBR, localSheetIds, gmPlayerIds]
  );

  const visibilityContextRef = useRef(visibilityContext);
  visibilityContextRef.current = visibilityContext;

  // Lista da sessão conforme papel:
  // - Mestre: fichas locais + cache de fichas remotas dos jogadores
  // - Jogador: fichas locais + apenas fichas explicitamente compartilhadas por outros jogadores (em memória e sanitizadas se apenas Central de Combate)
  const sessionSheets = useMemo(() => {
    if (viewerRole === 'GM') {
      const byId = new Map<string, FichaPersonagem>();
      for (const s of gmCachedSheets) {
        byId.set(s.id, s);
      }
      for (const s of localSheets) {
        const existing = byId.get(s.id);
        if (!existing || s.updatedAt >= existing.updatedAt) {
          byId.set(s.id, s);
        }
      }
      return Array.from(byId.values());
    }

    const byId = new Map<string, FichaPersonagem>();
    for (const s of localSheets) {
      byId.set(s.id, s);
    }
    for (const remote of remoteSharedSheets) {
      if (byId.has(remote.id)) continue;
      const roomSummary = sharedSummaries[remote.id];
      const useRoomFlags = Boolean(roomSummary && roomSummary.updatedAt >= remote.updatedAt);
      const allowSheet = useRoomFlags
        ? Boolean(roomSummary?.allowOtherPlayersViewSheet)
        : Boolean(remote.permissions.allowOtherPlayersViewSheet);
      const allowCombat = useRoomFlags
        ? Boolean(roomSummary?.allowOtherPlayersViewCombatCenter)
        : Boolean(remote.permissions.allowOtherPlayersViewCombatCenter);

      if (!allowSheet && !allowCombat) continue;

      const syncedRemote: FichaPersonagem = {
        ...remote,
        permissions: {
          ...remote.permissions,
          allowOtherPlayersViewSheet: allowSheet,
          allowOtherPlayersViewCombatCenter: allowCombat,
        },
      };
      byId.set(
        remote.id,
        allowSheet ? syncedRemote : sanitizeSheetForCombatCenterOnly(syncedRemote)
      );
    }
    return Array.from(byId.values());
  }, [viewerRole, localSheets, gmCachedSheets, remoteSharedSheets, sharedSummaries]);

  const accessibleFullSheets = useMemo(
    () =>
      sessionSheets.filter(
        (s) =>
          evaluateSheetAccessFromSheet(s, accessContext, sharedSummaries[s.id])
            .canViewFullSheet
      ),
    [sessionSheets, accessContext, sharedSummaries]
  );

  const activeSheet =
    accessibleFullSheets.find((s) => s.id === activeSheetId) ??
    accessibleFullSheets[0] ??
    localSheets[0] ??
    createVanillaBlankSheet();

  const activePolicy = useMemo(
    () =>
      evaluateSheetAccessFromSheet(
        activeSheet,
        accessContext,
        sharedSummaries[activeSheet.id]
      ),
    [activeSheet, accessContext, sharedSummaries]
  );

  const isLocalActiveSheet = localSheets.some((s) => s.id === activeSheet.id);

  // Se o acesso à ficha ativa for revogado ou o papel mudar, redireciona imediatamente para uma ficha permitida
  useEffect(() => {
    if (accessibleFullSheets.length > 0 && activeSheet.id !== activeSheetId) {
      setActiveSheetId(activeSheet.id);
    }
  }, [accessibleFullSheets, activeSheet.id, activeSheetId]);

  useEffect(() => {
    setConfirmDeleteId(null);
  }, [activeSheetId]);

  useEffect(() => {
    if (viewerRole === 'PLAYER' && localSheets.length === 0) {
      const fresh = createVanillaBlankSheet();
      const stamped: FichaPersonagem = {
        ...fresh,
        permissions: {
          ...fresh.permissions,
          ownerPlayerId: obrCtx.isInsideOBR ? obrCtx.playerId : null,
          ownerPlayerName: obrCtx.isInsideOBR ? obrCtx.playerName : '',
          createdByRole: 'PLAYER',
          showOnMasterShield: true,
        },
      };
      const nextLocal = [stamped];
      localSheetsRef.current = nextLocal;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextLocal));
      } catch {
        // Ignora erro de quota
      }
      setLocalSheets(nextLocal);
      setActiveSheetId(stamped.id);
      setSelectedControlSheetId(stamped.id);
    }
  }, [viewerRole, localSheets.length, obrCtx.isInsideOBR, obrCtx.playerId, obrCtx.playerName]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localSheets));
    } catch {
      // Ignora erro de quota caso navegador restrinja storage
    }
  }, [localSheets]);

  useEffect(() => {
    try {
      localStorage.setItem(GM_REMOTE_CACHE_KEY, JSON.stringify(gmCachedSheets));
    } catch {
      // Ignora erro de quota caso navegador restrinja storage
    }
  }, [gmCachedSheets]);

  useEffect(() => {
    try {
      localStorage.setItem(DELETED_SHEETS_STORAGE_KEY, JSON.stringify(deletedSheets));
    } catch {
      // Ignora erro de quota caso navegador restrinja storage
    }
  }, [deletedSheets]);

  // Remove imediatamente da memória do jogador qualquer ficha remota cuja permissão tenha sido revogada nos metadados da sala
  useEffect(() => {
    if (viewerRole === 'GM') return;
    setRemoteSharedSheets((prev) => {
      let changed = false;
      const next: FichaPersonagem[] = [];

      for (const s of prev) {
        const summary = sharedSummaries[s.id];
        if (!summary) {
          next.push(s);
          continue;
        }
        const allowSheet =
          summary.updatedAt >= s.updatedAt
            ? Boolean(summary.allowOtherPlayersViewSheet)
            : Boolean(s.permissions.allowOtherPlayersViewSheet);
        const allowCombat =
          summary.updatedAt >= s.updatedAt
            ? Boolean(summary.allowOtherPlayersViewCombatCenter)
            : Boolean(s.permissions.allowOtherPlayersViewCombatCenter);

        if (!allowSheet && !allowCombat) {
          changed = true;
          continue;
        }

        if (
          allowSheet !== Boolean(s.permissions.allowOtherPlayersViewSheet) ||
          allowCombat !== Boolean(s.permissions.allowOtherPlayersViewCombatCenter)
        ) {
          changed = true;
          const updatedPerms: FichaPersonagem = {
            ...s,
            permissions: {
              ...s.permissions,
              allowOtherPlayersViewSheet: allowSheet,
              allowOtherPlayersViewCombatCenter: allowCombat,
            },
          };
          next.push(
            allowSheet ? updatedPerms : sanitizeSheetForCombatCenterOnly(updatedPerms)
          );
        } else {
          next.push(s);
        }
      }

      return changed ? next : prev;
    });
  }, [sharedSummaries, viewerRole]);

  // Garante seleção válida na Central de Combate
  useEffect(() => {
    if (
      sessionSheets.length > 0 &&
      !sessionSheets.some((s) => s.id === selectedControlSheetId)
    ) {
      setSelectedControlSheetId(sessionSheets[0].id);
    }
  }, [sessionSheets, selectedControlSheetId]);

  const publishOwnedSheetsToRoom = useCallback(
    async (
      sheetsToPublish: FichaPersonagem[],
      options?: { forceFullForGM?: boolean }
    ) => {
      const ctx = obrCtxRef.current;
      if (!ctx.isInsideOBR || !ctx.isReady || !ctx.playerId) return;

      const ownedSheets = sheetsToPublish.filter((sheet) => {
        const isOwned =
          sheet.permissions.ownerPlayerId === null ||
          sheet.permissions.ownerPlayerId === ctx.playerId;
        if (!isOwned) return false;
        const deletedAt = deletedSheetsRef.current[sheet.id];
        if (deletedAt && (!sheet.updatedAt || deletedAt >= sheet.updatedAt)) {
          return false;
        }
        return true;
      });
      if (ownedSheets.length === 0) return;

      try {
        await savePrivacySettingsToPlayerMetadata(ownedSheets, ctx.playerId);
      } catch {
        // Ignora erro transitório ao salvar metadados do jogador
      }

      const hasOnlineGM =
        Boolean(options?.forceFullForGM) ||
        ctx.party.some((p) => p.role === 'GM');

      for (const sheet of ownedSheets) {
        const allowSheet = Boolean(sheet.permissions.allowOtherPlayersViewSheet);
        const allowCombat = Boolean(sheet.permissions.allowOtherPlayersViewCombatCenter);
        const visibleOnShield = shouldShowOnMasterShield(
          {
            sheetId: sheet.id,
            ownerPlayerId: sheet.permissions.ownerPlayerId,
            createdByRole: sheet.permissions.createdByRole,
            showOnMasterShield: sheet.permissions.showOnMasterShield,
          },
          visibilityContextRef.current
        );

        try {
          if (visibleOnShield) {
            await upsertSharedSummaryInRoom(sheet);
          } else if (sharedSummariesRef.current[sheet.id]) {
            await removeSharedSummaryFromRoom(sheet.id);
          }

          if ((hasOnlineGM && ctx.role !== 'GM') || allowSheet) {
            await sendOBRSyncMessage({
              type: 'FULL_SHEET_SYNC',
              sheet,
              senderId: ctx.playerId,
              sentAt: new Date().toISOString(),
            });
          } else if (allowCombat) {
            await sendOBRSyncMessage({
              type: 'FULL_SHEET_SYNC',
              sheet: sanitizeSheetForCombatCenterOnly(sheet),
              senderId: ctx.playerId,
              sentAt: new Date().toISOString(),
            });
          }
        } catch {
          // Falha silenciosa em caso de desconexão transitória do canal OBR
        }
      }
    },
    []
  );

  // Inicializa conexão com SDK do Owlbear Rodeo
  useEffect(() => {
    const cleanup = initOBRSession({
      onContextChange: (nextCtx) => {
        setObrCtx(nextCtx);
      },
      onTableStateChange: (tableState) => {
        const incomingDeleted = tableState.deletedSheets ?? {};
        const mergedDeleted = { ...deletedSheetsRef.current };
        let deletedChanged = false;
        for (const [sheetId, ts] of Object.entries(incomingDeleted)) {
          if (!mergedDeleted[sheetId] || ts > mergedDeleted[sheetId]) {
            mergedDeleted[sheetId] = ts;
            deletedChanged = true;
          }
        }
        const prunedDeleted = pruneDeletedSheetsMap(mergedDeleted);
        if (deletedChanged) {
          deletedSheetsRef.current = prunedDeleted;
          try {
            localStorage.setItem(
              DELETED_SHEETS_STORAGE_KEY,
              JSON.stringify(prunedDeleted)
            );
          } catch {
            // Ignora erro de quota
          }
          setDeletedSheets(prunedDeleted);
        }

        const filteredGmCache = filterOutDeletedSheets(
          gmCachedSheetsRef.current,
          prunedDeleted
        );
        if (filteredGmCache.length !== gmCachedSheetsRef.current.length) {
          gmCachedSheetsRef.current = filteredGmCache;
          try {
            localStorage.setItem(
              GM_REMOTE_CACHE_KEY,
              JSON.stringify(filteredGmCache)
            );
          } catch {
            // Ignora erro de quota
          }
          setGmCachedSheets(filteredGmCache);
        }

        const filteredRemote = filterOutDeletedSheets(
          remoteSharedSheetsRef.current,
          prunedDeleted
        );
        if (filteredRemote.length !== remoteSharedSheetsRef.current.length) {
          remoteSharedSheetsRef.current = filteredRemote;
          setRemoteSharedSheets(filteredRemote);
        }

        const cleanedSummaries: Record<string, SharedCharacterSummary> = {};
        for (const [sheetId, summary] of Object.entries(tableState.summaries)) {
          const deletedAt = prunedDeleted[sheetId];
          if (deletedAt && (!summary.updatedAt || deletedAt >= summary.updatedAt)) {
            continue;
          }
          cleanedSummaries[sheetId] = summary;
        }
        sharedSummariesRef.current = cleanedSummaries;
        setSharedSummaries(cleanedSummaries);
      },
      onSyncMessage: (msg: OBRSyncMessage, _connectionId, verifiedSender) => {
        const ctx = obrCtxRef.current;
        const currentRole = ctx.isInsideOBR ? ctx.role ?? 'PLAYER' : viewerRoleRef.current;

        if (msg.type === 'REQUEST_FULL_SHEETS') {
          const requesterIsGM = ctx.isInsideOBR
            ? verifiedSender
              ? verifiedSender.role === 'GM'
              : ctx.party.some((p) => p.role === 'GM')
            : msg.requesterRole === 'GM';

          void publishOwnedSheetsToRoom(localSheetsRef.current, {
            forceFullForGM: requesterIsGM,
          });

          // Se este cliente for Mestre e tiver atualizações mais recentes de fichas remotas, reenvia
          if (currentRole === 'GM' && ctx.playerId) {
            for (const cached of gmCachedSheetsRef.current) {
              const deletedAt = deletedSheetsRef.current[cached.id];
              if (deletedAt && (!cached.updatedAt || deletedAt >= cached.updatedAt)) {
                continue;
              }
              if (
                cached.permissions.ownerPlayerId === msg.requesterId ||
                cached.permissions.allowOtherPlayersViewSheet ||
                cached.permissions.allowOtherPlayersViewCombatCenter
              ) {
                void sendOBRSyncMessage({
                  type: 'GM_SHEET_UPDATE',
                  sheet: cached,
                  gmId: ctx.playerId,
                  sentAt: new Date().toISOString(),
                });
              }
            }
          }
          return;
        }

        if (msg.type === 'FULL_SHEET_SYNC') {
          const normalized = normalizeSyncedSheet(msg.sheet);
          const deletedAt = deletedSheetsRef.current[normalized.id];
          if (deletedAt && (!normalized.updatedAt || deletedAt >= normalized.updatedAt)) {
            return;
          }

          if (ctx.isInsideOBR) {
            if (ctx.party.length > 0 && !verifiedSender) return;
            if (
              verifiedSender &&
              normalized.permissions.ownerPlayerId &&
              normalized.permissions.ownerPlayerId !== verifiedSender.id &&
              verifiedSender.role !== 'GM'
            ) {
              return;
            }
          }

          // Se for Mestre, armazena/atualiza ficha do jogador no cache da sessão
          if (currentRole === 'GM') {
            const isLocal = localSheetsRef.current.some((s) => s.id === normalized.id);
            if (!isLocal) {
              const existingCached = gmCachedSheetsRef.current.find(
                (s) => s.id === normalized.id
              );

              if (existingCached && existingCached.updatedAt > normalized.updatedAt) {
                // O Mestre tem edição mais recente em cache: reenvia ao jogador
                if (ctx.playerId) {
                  void sendOBRSyncMessage({
                    type: 'GM_SHEET_UPDATE',
                    sheet: existingCached,
                    gmId: ctx.playerId,
                    sentAt: new Date().toISOString(),
                  });
                }
              } else {
                setGmCachedSheets((prev) => {
                  const idx = prev.findIndex((s) => s.id === normalized.id);
                  if (idx === -1) return [...prev, normalized];
                  const copy = [...prev];
                  copy[idx] = normalized;
                  return copy;
                });
              }
            }
            return;
          }

          // Para Jogadores: só armazena em memória se o proprietário autorizou ficha completa ou Central de Combate
          if (localSheetsRef.current.some((s) => s.id === normalized.id)) return;

          const roomSummary = sharedSummariesRef.current[normalized.id];
          const useRoomFlags = Boolean(
            roomSummary && roomSummary.updatedAt > normalized.updatedAt
          );
          const allowSheet = useRoomFlags
            ? Boolean(roomSummary?.allowOtherPlayersViewSheet)
            : Boolean(normalized.permissions.allowOtherPlayersViewSheet);
          const allowCombat = useRoomFlags
            ? Boolean(roomSummary?.allowOtherPlayersViewCombatCenter)
            : Boolean(normalized.permissions.allowOtherPlayersViewCombatCenter);

          if (!allowSheet && !allowCombat) {
            setRemoteSharedSheets((prev) =>
              prev.filter((s) => s.id !== normalized.id)
            );
            return;
          }

          const payloadForPlayer = allowSheet
            ? normalized
            : sanitizeSheetForCombatCenterOnly(normalized);

          setRemoteSharedSheets((prev) => {
            const idx = prev.findIndex((s) => s.id === payloadForPlayer.id);
            if (idx === -1) return [...prev, payloadForPlayer];
            if (prev[idx].updatedAt > payloadForPlayer.updatedAt) return prev;
            const copy = [...prev];
            copy[idx] = payloadForPlayer;
            return copy;
          });
          return;
        }

        if (msg.type === 'GM_SHEET_UPDATE') {
          if (ctx.isInsideOBR) {
            if (ctx.party.length > 0 && !verifiedSender) return;
            if (verifiedSender && verifiedSender.role !== 'GM') return;
          }

          const normalized = normalizeSyncedSheet(msg.sheet);
          const deletedAt = deletedSheetsRef.current[normalized.id];
          if (deletedAt && (!normalized.updatedAt || deletedAt >= normalized.updatedAt)) {
            return;
          }
          const hasLocal = localSheetsRef.current.find((s) => s.id === normalized.id);

          if (hasLocal) {
            if (normalized.updatedAt >= hasLocal.updatedAt) {
              setLocalSheets((prev) =>
                prev.map((s) => (s.id === normalized.id ? normalized : s))
              );
              showToast('Ficha atualizada pelo Mestre.');
            }
          } else if (currentRole === 'GM') {
            setGmCachedSheets((prev) => {
              const idx = prev.findIndex((s) => s.id === normalized.id);
              if (idx === -1) return [...prev, normalized];
              const copy = [...prev];
              copy[idx] = normalized;
              return copy;
            });
          } else {
            const roomSummary = sharedSummariesRef.current[normalized.id];
            const useRoomFlags = Boolean(
              roomSummary && roomSummary.updatedAt > normalized.updatedAt
            );
            const allowSheet = useRoomFlags
              ? Boolean(roomSummary?.allowOtherPlayersViewSheet)
              : Boolean(normalized.permissions.allowOtherPlayersViewSheet);
            const allowCombat = useRoomFlags
              ? Boolean(roomSummary?.allowOtherPlayersViewCombatCenter)
              : Boolean(normalized.permissions.allowOtherPlayersViewCombatCenter);

            if (!allowSheet && !allowCombat) {
              setRemoteSharedSheets((prev) =>
                prev.filter((s) => s.id !== normalized.id)
              );
            } else {
              const payloadForPlayer = allowSheet
                ? normalized
                : sanitizeSheetForCombatCenterOnly(normalized);
              setRemoteSharedSheets((prev) => {
                const idx = prev.findIndex((s) => s.id === payloadForPlayer.id);
                if (idx === -1) return [...prev, payloadForPlayer];
                const copy = [...prev];
                copy[idx] = payloadForPlayer;
                return copy;
              });
            }
          }
          return;
        }

        if (msg.type === 'REVOKE_PLAYER_ACCESS') {
          if (ctx.isInsideOBR && verifiedSender) {
            if (
              verifiedSender.id !== msg.senderId &&
              verifiedSender.role !== 'GM'
            ) {
              return;
            }
          }

          if (currentRole === 'PLAYER') {
            setRemoteSharedSheets((prev) => {
              if (!msg.allowOtherPlayersViewSheet && !msg.allowOtherPlayersViewCombatCenter) {
                return prev.filter((s) => s.id !== msg.sheetId);
              }
              return prev.map((s) => {
                if (s.id !== msg.sheetId) return s;
                const updated: FichaPersonagem = {
                  ...s,
                  permissions: {
                    ...s.permissions,
                    allowOtherPlayersViewSheet: msg.allowOtherPlayersViewSheet,
                    allowOtherPlayersViewCombatCenter: msg.allowOtherPlayersViewCombatCenter,
                  },
                };
                return msg.allowOtherPlayersViewSheet
                  ? updated
                  : sanitizeSheetForCombatCenterOnly(updated);
              });
            });
          }
          return;
        }

        if (msg.type === 'REMOVE_SHEET_SYNC') {
          if (ctx.isInsideOBR && verifiedSender && verifiedSender.role !== 'GM') {
            const known =
              gmCachedSheetsRef.current.find((s) => s.id === msg.sheetId) ??
              remoteSharedSheetsRef.current.find((s) => s.id === msg.sheetId);
            if (
              known?.permissions.ownerPlayerId &&
              known.permissions.ownerPlayerId !== verifiedSender.id
            ) {
              return;
            }
          }

          const deletedAt = msg.deletedAt || new Date().toISOString();
          const nextDeleted = pruneDeletedSheetsMap({
            ...deletedSheetsRef.current,
            [msg.sheetId]: deletedAt,
          });
          deletedSheetsRef.current = nextDeleted;
          setDeletedSheets(nextDeleted);

          const nextGmCached = gmCachedSheetsRef.current.filter(
            (s) => s.id !== msg.sheetId
          );
          gmCachedSheetsRef.current = nextGmCached;
          const nextRemote = remoteSharedSheetsRef.current.filter(
            (s) => s.id !== msg.sheetId
          );
          remoteSharedSheetsRef.current = nextRemote;

          try {
            localStorage.setItem(
              DELETED_SHEETS_STORAGE_KEY,
              JSON.stringify(nextDeleted)
            );
            localStorage.setItem(
              GM_REMOTE_CACHE_KEY,
              JSON.stringify(nextGmCached)
            );
          } catch {
            // Ignora erro de quota
          }

          setGmCachedSheets(nextGmCached);
          setRemoteSharedSheets(nextRemote);
          setSharedSummaries((prev) => {
            if (!(msg.sheetId in prev)) return prev;
            const copy = { ...prev };
            delete copy[msg.sheetId];
            sharedSummariesRef.current = copy;
            return copy;
          });
        }
      },
    });

    return cleanup;
  }, [publishOwnedSheetsToRoom, showToast]);

  // Vincula ownerPlayerId nas fichas locais sem dono, reconcilia preferências de privacidade do jogador no OBR e sincroniza com a sala
  useEffect(() => {
    if (!obrCtx.isInsideOBR || !obrCtx.isReady || !obrCtx.playerId) return;

    let changed = false;
    const reconciled = localSheetsRef.current.map((s) => {
      let next = s;
      if (s.permissions.ownerPlayerId === null) {
        changed = true;
        next = {
          ...next,
          permissions: {
            ...next.permissions,
            ownerPlayerId: obrCtx.playerId,
            ownerPlayerName: next.permissions.ownerPlayerName || obrCtx.playerName,
          },
        };
      }

      if (next.permissions.createdByRole === undefined && obrCtx.role) {
        changed = true;
        next = {
          ...next,
          permissions: {
            ...next.permissions,
            createdByRole: obrCtx.role,
            showOnMasterShield:
              obrCtx.role === 'PLAYER'
                ? true
                : Boolean(next.permissions.showOnMasterShield),
          },
        };
      }

      const privacyRec = obrCtx.privacyBySheetId[s.id];
      const roomSummary = sharedSummariesRef.current[s.id];
      const summaryMatchesOwner =
        roomSummary &&
        (roomSummary.ownerPlayerId === null ||
          roomSummary.ownerPlayerId === obrCtx.playerId);

      const useRoomOverSheet =
        summaryMatchesOwner && roomSummary.updatedAt > next.updatedAt;
      const usePlayerMetaOverSheet =
        privacyRec && privacyRec.updatedAt > next.updatedAt;

      if (usePlayerMetaOverSheet || useRoomOverSheet) {
        const pickRoom =
          useRoomOverSheet &&
          (!privacyRec || roomSummary.updatedAt >= privacyRec.updatedAt);

        const nextAllowSheet = pickRoom
          ? Boolean(roomSummary.allowOtherPlayersViewSheet)
          : Boolean(privacyRec?.allowOtherPlayersViewSheet);
        const nextAllowCombat = pickRoom
          ? Boolean(roomSummary.allowOtherPlayersViewCombatCenter)
          : Boolean(privacyRec?.allowOtherPlayersViewCombatCenter);
        const nextUpdatedAt = pickRoom
          ? roomSummary.updatedAt
          : privacyRec?.updatedAt || next.updatedAt;

        if (
          nextAllowSheet !== Boolean(next.permissions.allowOtherPlayersViewSheet) ||
          nextAllowCombat !==
            Boolean(next.permissions.allowOtherPlayersViewCombatCenter)
        ) {
          changed = true;
          next = {
            ...next,
            updatedAt: nextUpdatedAt,
            permissions: {
              ...next.permissions,
              allowOtherPlayersViewSheet: nextAllowSheet,
              allowOtherPlayersViewCombatCenter: nextAllowCombat,
            },
          };
        }
      }

      return next;
    });

    if (changed) {
      setLocalSheets(reconciled);
      void publishOwnedSheetsToRoom(reconciled);
    } else if (!didInitialRoomSyncRef.current) {
      void publishOwnedSheetsToRoom(localSheetsRef.current);
    }

    if (!didInitialRoomSyncRef.current) {
      didInitialRoomSyncRef.current = true;
      void sendOBRSyncMessage({
        type: 'REQUEST_FULL_SHEETS',
        requesterId: obrCtx.playerId,
        requesterRole: obrCtx.role ?? 'PLAYER',
      });
    }
  }, [
    obrCtx.isInsideOBR,
    obrCtx.isReady,
    obrCtx.playerId,
    obrCtx.playerName,
    obrCtx.role,
    obrCtx.privacyBySheetId,
    publishOwnedSheetsToRoom,
  ]);

  // Quando novos jogadores entram na party, republica fichas autorizadas/próprias e solicita sincronização
  useEffect(() => {
    if (!obrCtx.isInsideOBR || !obrCtx.isReady || !obrCtx.playerId) return;
    if (obrCtx.party.length > prevPartyCountRef.current) {
      if (obrCtx.role === 'GM') {
        void sendOBRSyncMessage({
          type: 'REQUEST_FULL_SHEETS',
          requesterId: obrCtx.playerId,
          requesterRole: 'GM',
        });
      }
      void publishOwnedSheetsToRoom(localSheetsRef.current);
    }
    prevPartyCountRef.current = obrCtx.party.length;
  }, [
    obrCtx.isInsideOBR,
    obrCtx.isReady,
    obrCtx.playerId,
    obrCtx.role,
    obrCtx.party.length,
    publishOwnedSheetsToRoom,
  ]);

  const handleRequestSyncFromRoom = useCallback(() => {
    if (!obrCtx.isInsideOBR || !obrCtx.isReady || !obrCtx.playerId) return;
    void publishOwnedSheetsToRoom(localSheetsRef.current);
    void sendOBRSyncMessage({
      type: 'REQUEST_FULL_SHEETS',
      requesterId: obrCtx.playerId,
      requesterRole: viewerRole,
    });
    showToast('Sincronização com a sala solicitada.');
  }, [obrCtx.isInsideOBR, obrCtx.isReady, obrCtx.playerId, viewerRole, publishOwnedSheetsToRoom, showToast]);

  const handleUpdateSheetById = useCallback(
    (sheetId: string, updater: (prev: FichaPersonagem) => FichaPersonagem) => {
      const targetLocal = localSheetsRef.current.find((s) => s.id === sheetId);
      const now = new Date().toISOString();

      if (targetLocal) {
        const policy = evaluateSheetAccessFromSheet(
          targetLocal,
          accessContext,
          sharedSummariesRef.current[sheetId]
        );
        if (!policy.canEditFullSheet) {
          return;
        }

        const updated = recalculateCharacterSheet({
          ...updater(targetLocal),
          updatedAt: now,
        });

        const nextLocalSheets = localSheetsRef.current.map((s) =>
          s.id === sheetId ? updated : s
        );
        localSheetsRef.current = nextLocalSheets;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(nextLocalSheets));
        } catch {
          // Ignora erro de quota caso navegador restrinja storage
        }
        setLocalSheets(nextLocalSheets);

        if (obrCtx.isInsideOBR && obrCtx.isReady && obrCtx.playerId) {
          const visibleOnShield = shouldShowOnMasterShield(
            {
              sheetId: updated.id,
              ownerPlayerId: updated.permissions.ownerPlayerId,
              createdByRole: updated.permissions.createdByRole,
              showOnMasterShield: updated.permissions.showOnMasterShield,
            },
            visibilityContextRef.current
          );

          if (visibleOnShield) {
            void upsertSharedSummaryInRoom(updated);
          } else if (sharedSummariesRef.current[updated.id]) {
            void removeSharedSummaryFromRoom(updated.id);
          }

          if (viewerRole === 'GM') {
            void sendOBRSyncMessage({
              type: 'GM_SHEET_UPDATE',
              sheet: updated,
              gmId: obrCtx.playerId,
              sentAt: now,
            });
          } else {
            const hasOnlineGM = obrCtx.party.some((p) => p.role === 'GM');
            const allowSheet = Boolean(updated.permissions.allowOtherPlayersViewSheet);
            const allowCombat = Boolean(
              updated.permissions.allowOtherPlayersViewCombatCenter
            );
            if (hasOnlineGM || allowSheet) {
              void sendOBRSyncMessage({
                type: 'FULL_SHEET_SYNC',
                sheet: updated,
                senderId: obrCtx.playerId,
                sentAt: now,
              });
            } else if (allowCombat) {
              void sendOBRSyncMessage({
                type: 'FULL_SHEET_SYNC',
                sheet: sanitizeSheetForCombatCenterOnly(updated),
                senderId: obrCtx.playerId,
                sentAt: now,
              });
            }
          }
        }
        return;
      }

      // Edição pelo Mestre de uma ficha remota em cache (jogadores comuns nunca podem editar fichas de terceiros)
      if (viewerRole === 'GM') {
        const targetRemote = gmCachedSheetsRef.current.find((s) => s.id === sheetId);
        if (!targetRemote) return;

        const updated = recalculateCharacterSheet({
          ...updater(targetRemote),
          updatedAt: now,
        });

        const nextGmCachedSheets = gmCachedSheetsRef.current.map((s) =>
          s.id === sheetId ? updated : s
        );
        gmCachedSheetsRef.current = nextGmCachedSheets;
        try {
          localStorage.setItem(
            GM_REMOTE_CACHE_KEY,
            JSON.stringify(nextGmCachedSheets)
          );
        } catch {
          // Ignora erro de quota caso navegador restrinja storage
        }
        setGmCachedSheets(nextGmCachedSheets);

        if (obrCtx.isInsideOBR && obrCtx.isReady && obrCtx.playerId) {
          void upsertSharedSummaryInRoom(updated);
          void sendOBRSyncMessage({
            type: 'GM_SHEET_UPDATE',
            sheet: updated,
            gmId: obrCtx.playerId,
            sentAt: now,
          });
        }
      }
    },
    [accessContext, viewerRole, obrCtx.isInsideOBR, obrCtx.isReady, obrCtx.playerId, obrCtx.party]
  );

  const handleUpdatePrivacy = useCallback(
    (
      sheetId: string,
      patch: {
        allowOtherPlayersViewSheet?: boolean;
        allowOtherPlayersViewCombatCenter?: boolean;
      }
    ) => {
      const targetLocal = localSheetsRef.current.find((s) => s.id === sheetId);
      const targetRemote =
        !targetLocal && viewerRole === 'GM'
          ? gmCachedSheetsRef.current.find((s) => s.id === sheetId)
          : undefined;
      const target = targetLocal ?? targetRemote;
      if (!target) return;

      const policy = evaluateSheetAccessFromSheet(
        target,
        accessContext,
        sharedSummariesRef.current[sheetId]
      );
      if (!policy.canManagePrivacy) return;

      const now = new Date().toISOString();
      const nextPermissions = {
        ...target.permissions,
        ...patch,
      };
      const updated: FichaPersonagem = {
        ...target,
        permissions: nextPermissions,
        updatedAt: now,
      };

      if (targetLocal) {
        setLocalSheets((prev) => prev.map((s) => (s.id === sheetId ? updated : s)));
      } else if (targetRemote && viewerRole === 'GM') {
        setGmCachedSheets((prev) =>
          prev.map((s) => (s.id === sheetId ? updated : s))
        );
      }

      const allowSheet = Boolean(nextPermissions.allowOtherPlayersViewSheet);
      const allowCombat = Boolean(nextPermissions.allowOtherPlayersViewCombatCenter);

      if (obrCtx.isInsideOBR && obrCtx.isReady && obrCtx.playerId) {
        if (targetLocal) {
          void savePrivacySettingsToPlayerMetadata([updated], obrCtx.playerId);
        }
        void upsertSharedSummaryInRoom(updated);

        void sendOBRSyncMessage({
          type: 'REVOKE_PLAYER_ACCESS',
          sheetId: updated.id,
          senderId: obrCtx.playerId,
          allowOtherPlayersViewSheet: allowSheet,
          allowOtherPlayersViewCombatCenter: allowCombat,
        });

        if (allowSheet || allowCombat) {
          if (viewerRole === 'GM' && !targetLocal) {
            void sendOBRSyncMessage({
              type: 'GM_SHEET_UPDATE',
              sheet: updated,
              gmId: obrCtx.playerId,
              sentAt: now,
            });
          } else {
            const hasOnlineGM = obrCtx.party.some((p) => p.role === 'GM');
            void sendOBRSyncMessage({
              type: 'FULL_SHEET_SYNC',
              sheet:
                hasOnlineGM || allowSheet
                  ? updated
                  : sanitizeSheetForCombatCenterOnly(updated),
              senderId: obrCtx.playerId,
              sentAt: now,
            });
          }
        }
      }

      showToast('Preferências de privacidade atualizadas.');
    },
    [
      accessContext,
      viewerRole,
      obrCtx.isInsideOBR,
      obrCtx.isReady,
      obrCtx.playerId,
      obrCtx.party,
      showToast,
    ]
  );

  const handleOpenFullSheet = useCallback(
    (sheetId: string) => {
      const sheet = sessionSheets.find((s) => s.id === sheetId);
      const summary = sharedSummaries[sheetId];
      const policy = sheet
        ? evaluateSheetAccessFromSheet(sheet, accessContext, summary)
        : summary
        ? evaluateSheetAccess(summary, accessContext)
        : null;

      if (!policy || !policy.canViewFullSheet) {
        showToast('Acesso negado: o proprietário não liberou a visualização desta ficha.');
        return;
      }

      if (!sheet) {
        handleRequestSyncFromRoom();
        showToast('Ficha autorizada. Solicitando dados completos ao proprietário...');
        return;
      }

      setActiveSheetId(sheetId);
      setActiveTab('pessoal');
    },
    [sessionSheets, sharedSummaries, accessContext, handleRequestSyncFromRoom, showToast]
  );

  const handleUpdateActiveSheet = (
    updater: (prev: FichaPersonagem) => FichaPersonagem
  ) => {
    handleUpdateSheetById(activeSheet.id, updater);
  };

  const handleCreateSheet = () => {
    const fresh = createVanillaBlankSheet();
    const isPlayerCreator = viewerRole === 'PLAYER';
    const created: FichaPersonagem = {
      ...fresh,
      permissions: {
        ...fresh.permissions,
        ownerPlayerId: obrCtx.isInsideOBR ? obrCtx.playerId : null,
        ownerPlayerName: obrCtx.isInsideOBR ? obrCtx.playerName : '',
        createdByRole: viewerRole,
        showOnMasterShield: isPlayerCreator,
      },
    };

    setLocalSheets((prev) => [...prev, created]);
    setActiveSheetId(created.id);
    setSelectedControlSheetId(created.id);
    setActiveTab('pessoal');

    if (obrCtx.isInsideOBR && obrCtx.isReady && obrCtx.playerId) {
      void savePrivacySettingsToPlayerMetadata([created], obrCtx.playerId);
      if (isPlayerCreator) {
        void upsertSharedSummaryInRoom(created);
        if (obrCtx.party.some((p) => p.role === 'GM')) {
          void sendOBRSyncMessage({
            type: 'FULL_SHEET_SYNC',
            sheet: created,
            senderId: obrCtx.playerId,
            sentAt: created.updatedAt,
          });
        }
      }
    }

    showToast(
      viewerRole === 'GM'
        ? 'Nova ficha do Mestre criada (oculta do Escudo até você adicioná-la).'
        : 'Nova ficha em branco criada.'
    );
  };

  const handleDuplicateSheet = () => {
    if (!activePolicy.isGM && !activePolicy.isOwner) {
      showToast('Acesso negado: somente o proprietário ou o Mestre podem duplicar esta ficha.');
      return;
    }

    const baseName = activeSheet.identity.name.trim() || 'Ficha sem nome';
    const now = new Date().toISOString();
    const isPlayerCreator = viewerRole === 'PLAYER';
    const copy: FichaPersonagem = recalculateCharacterSheet({
      ...structuredClone(activeSheet),
      id: generateUniqueSheetId(),
      createdAt: now,
      updatedAt: now,
      permissions: {
        ...activeSheet.permissions,
        ownerPlayerId: obrCtx.isInsideOBR ? obrCtx.playerId : activeSheet.permissions.ownerPlayerId,
        ownerPlayerName: obrCtx.isInsideOBR
          ? obrCtx.playerName
          : activeSheet.permissions.ownerPlayerName,
        allowOtherPlayersViewSheet: false,
        allowOtherPlayersViewCombatCenter: false,
        createdByRole: viewerRole,
        showOnMasterShield: isPlayerCreator,
      },
      identity: {
        ...activeSheet.identity,
        name: `${baseName} (Cópia)`,
      },
    });

    setLocalSheets((prev) => [...prev, copy]);
    setActiveSheetId(copy.id);

    if (obrCtx.isInsideOBR && obrCtx.isReady && obrCtx.playerId) {
      void savePrivacySettingsToPlayerMetadata([copy], obrCtx.playerId);
      if (isPlayerCreator) {
        void upsertSharedSummaryInRoom(copy);
        if (obrCtx.party.some((p) => p.role === 'GM')) {
          void sendOBRSyncMessage({
            type: 'FULL_SHEET_SYNC',
            sheet: copy,
            senderId: obrCtx.playerId,
            sentAt: now,
          });
        }
      }
    }

    showToast('Ficha duplicada com sucesso.');
  };

  const handleDeleteSheet = (id: string) => {
    const currentLocal = localSheetsRef.current;
    const currentGmCached = gmCachedSheetsRef.current;
    const currentRemoteShared = remoteSharedSheetsRef.current;

    const wasLocal = currentLocal.some((s) => s.id === id);
    const wasGmCached = viewerRole === 'GM' && currentGmCached.some((s) => s.id === id);

    if (!wasLocal && !wasGmCached) {
      setConfirmDeleteId(null);
      return;
    }

    const deletedAt = new Date().toISOString();
    const nextDeletedMap = pruneDeletedSheetsMap({
      ...deletedSheetsRef.current,
      [id]: deletedAt,
    });
    deletedSheetsRef.current = nextDeletedMap;
    setDeletedSheets(nextDeletedMap);

    let nextLocalSheets = currentLocal.filter((s) => s.id !== id);
    const nextGmCachedSheets = currentGmCached.filter((s) => s.id !== id);
    const nextRemoteSharedSheets = currentRemoteShared.filter((s) => s.id !== id);

    const nextSummaries = { ...sharedSummariesRef.current };
    delete nextSummaries[id];
    sharedSummariesRef.current = nextSummaries;

    const remainingPool =
      viewerRole === 'GM'
        ? deduplicateSheetsById([...nextGmCachedSheets, ...nextLocalSheets])
        : [...nextLocalSheets, ...nextRemoteSharedSheets];

    const nextLocalIds = new Set(nextLocalSheets.map((s) => s.id));
    const nextAccessCtx: SheetAccessContext = {
      viewerRole,
      currentPlayerId: obrCtx.playerId,
      isInsideOBR: obrCtx.isInsideOBR,
      localSheetIds: nextLocalIds,
    };

    const remainingAccessible = remainingPool.filter(
      (s) =>
        evaluateSheetAccessFromSheet(s, nextAccessCtx, nextSummaries[s.id])
          .canViewFullSheet
    );

    const needsBlankReplacement =
      remainingAccessible.length === 0 ||
      (viewerRole === 'PLAYER' && nextLocalSheets.length === 0);

    let replacementSheet: FichaPersonagem | null = null;
    const isPlayerCreator = viewerRole === 'PLAYER';

    if (needsBlankReplacement) {
      const fresh = createVanillaBlankSheet();
      replacementSheet = {
        ...fresh,
        permissions: {
          ...fresh.permissions,
          ownerPlayerId: obrCtx.isInsideOBR ? obrCtx.playerId : null,
          ownerPlayerName: obrCtx.isInsideOBR ? obrCtx.playerName : '',
          createdByRole: viewerRole,
          showOnMasterShield: isPlayerCreator,
        },
      };
      nextLocalSheets = [...nextLocalSheets, replacementSheet];
    }

    localSheetsRef.current = nextLocalSheets;
    gmCachedSheetsRef.current = nextGmCachedSheets;
    remoteSharedSheetsRef.current = nextRemoteSharedSheets;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextLocalSheets));
      localStorage.setItem(GM_REMOTE_CACHE_KEY, JSON.stringify(nextGmCachedSheets));
      localStorage.setItem(
        DELETED_SHEETS_STORAGE_KEY,
        JSON.stringify(nextDeletedMap)
      );
    } catch {
      // Ignora erro de quota caso navegador restrinja storage
    }

    setLocalSheets(nextLocalSheets);
    setGmCachedSheets(nextGmCachedSheets);
    setRemoteSharedSheets(nextRemoteSharedSheets);
    setSharedSummaries(nextSummaries);
    setConfirmDeleteId(null);

    const nextFallbackSheetId =
      remainingAccessible[0]?.id ??
      replacementSheet?.id ??
      nextLocalSheets[0]?.id ??
      '';

    if (
      activeSheetId === id ||
      (!remainingAccessible.some((s) => s.id === activeSheetId) && nextFallbackSheetId)
    ) {
      setActiveSheetId(
        remainingAccessible.find((s) => s.id !== id)?.id ?? nextFallbackSheetId
      );
    }

    const nextControlPool =
      viewerRole === 'GM'
        ? [...nextLocalSheets, ...nextGmCachedSheets]
        : [...nextLocalSheets, ...nextRemoteSharedSheets];
    if (
      selectedControlSheetId === id ||
      !nextControlPool.some((s) => s.id === selectedControlSheetId)
    ) {
      setSelectedControlSheetId(nextControlPool[0]?.id ?? nextFallbackSheetId);
    }

    if (obrCtx.isInsideOBR && obrCtx.isReady && obrCtx.playerId) {
      if (wasLocal) {
        void removePrivacySettingsFromPlayerMetadata(id, obrCtx.playerId);
      }
      void removeSharedSummaryFromRoom(id, {
        deletedAt,
        recordTombstone: true,
      });
      void sendOBRSyncMessage({
        type: 'REMOVE_SHEET_SYNC',
        sheetId: id,
        senderId: obrCtx.playerId,
        deletedAt,
      });

      if (replacementSheet && isPlayerCreator) {
        void savePrivacySettingsToPlayerMetadata([replacementSheet], obrCtx.playerId);
        void upsertSharedSummaryInRoom(replacementSheet);
        if (obrCtx.party.some((p) => p.role === 'GM')) {
          void sendOBRSyncMessage({
            type: 'FULL_SHEET_SYNC',
            sheet: replacementSheet,
            senderId: obrCtx.playerId,
            sentAt: replacementSheet.updatedAt,
          });
        }
      }
    }

    showToast(
      needsBlankReplacement
        ? 'Ficha excluída e substituída por uma ficha em branco.'
        : 'Ficha excluída.'
    );
  };

  const handleExportJson = () => {
    if (!activePolicy.isGM && !activePolicy.isOwner) {
      showToast('Acesso negado: somente o proprietário ou o Mestre podem exportar esta ficha.');
      return;
    }

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
        const now = new Date().toISOString();
        const isPlayerCreator = viewerRole === 'PLAYER';
        const imported = normalizeSyncedSheet({
          ...parsed,
          id: generateUniqueSheetId(),
          updatedAt: now,
          permissions: {
            ...parsed.permissions,
            ownerPlayerId: obrCtx.isInsideOBR
              ? obrCtx.playerId
              : parsed.permissions?.ownerPlayerId ?? null,
            ownerPlayerName: obrCtx.isInsideOBR
              ? obrCtx.playerName
              : parsed.permissions?.ownerPlayerName ?? '',
            allowOtherPlayersViewSheet: Boolean(
              parsed.permissions?.allowOtherPlayersViewSheet
            ),
            allowOtherPlayersViewCombatCenter: Boolean(
              parsed.permissions?.allowOtherPlayersViewCombatCenter
            ),
            createdByRole: viewerRole,
            showOnMasterShield: isPlayerCreator,
          },
        });
        setLocalSheets((prev) => [...prev, imported]);
        setActiveSheetId(imported.id);

        if (obrCtx.isInsideOBR && obrCtx.isReady && obrCtx.playerId) {
          void savePrivacySettingsToPlayerMetadata([imported], obrCtx.playerId);
          if (isPlayerCreator) {
            void upsertSharedSummaryInRoom(imported);
            if (
              obrCtx.party.some((p) => p.role === 'GM') ||
              imported.permissions.allowOtherPlayersViewSheet
            ) {
              void sendOBRSyncMessage({
                type: 'FULL_SHEET_SYNC',
                sheet: imported,
                senderId: obrCtx.playerId,
                sentAt: now,
              });
            } else if (imported.permissions.allowOtherPlayersViewCombatCenter) {
              void sendOBRSyncMessage({
                type: 'FULL_SHEET_SYNC',
                sheet: sanitizeSheetForCombatCenterOnly(imported),
                senderId: obrCtx.playerId,
                sentAt: now,
              });
            }
          }
        }

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

  const isReadOnly = !activePolicy.canEditFullSheet;
  const activeGrade = resolveCalculableValue(activeSheet.identity.grade);
  const canDeleteActiveSheet =
    isLocalActiveSheet ||
    (viewerRole === 'GM' && gmCachedSheets.some((s) => s.id === activeSheet.id));

  return (
    <div className="min-h-screen overflow-x-clip bg-[#0b0d13] text-slate-100">
      {/* Barra Superior */}
      <header className="sticky top-0 z-20 border-b border-[#1d2230] bg-[#0d1018]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-2 px-3 py-2 sm:gap-8 sm:px-6 sm:py-3">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-sections-drawer"
              aria-label={mobileNavOpen ? 'Fechar menu de seções' : 'Abrir menu de seções'}
              onClick={() => setMobileNavOpen((prev) => !prev)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded border border-[#242a3b] bg-[#11141e] text-slate-200 hover:bg-[#1a1f30] lg:hidden"
            >
              {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <span className="truncate text-sm font-bold tracking-tight text-slate-100 sm:shrink-0 sm:whitespace-nowrap sm:text-base">
              Feiticeiros & Maldições 2.5
            </span>
          </div>

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
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 whitespace-nowrap shrink-0 sm:min-h-0 sm:px-4"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Nova Ficha</span>
            </button>
          </div>
        </div>

        {/* Drawer recolhível de navegação no mobile (< lg) */}
        {mobileNavOpen && (
          <nav
            id="mobile-sections-drawer"
            aria-label="Menu completo de seções"
            className="max-h-[75vh] overflow-y-auto border-t border-[#181c28] bg-[#0b0e17] px-3 py-2.5 lg:hidden"
          >
            <div className="grid grid-cols-1 gap-1.5 min-[400px]:grid-cols-2">
              {TAB_ITEMS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMobileNavOpen(false);
                    }}
                    className={`flex min-h-[42px] items-center gap-2.5 rounded border px-3 py-2 text-left text-xs font-medium transition-colors ${
                      active
                        ? 'border-indigo-500/60 bg-indigo-600/20 text-indigo-100'
                        : 'border-[#1e2332] bg-[#11141e] text-slate-300 hover:text-slate-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-indigo-300" />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        )}

        {/* Faixa rápida horizontal no mobile (< lg) */}
        <div className="mobile-snap-track flex items-center gap-1.5 overflow-x-auto border-t border-[#181c28] px-3 py-1.5 lg:hidden">
          {TAB_ITEMS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileNavOpen(false);
                }}
                className={`inline-flex min-h-[34px] shrink-0 items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-indigo-600/25 text-indigo-100 ring-1 ring-inset ring-indigo-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      <main
        className={`mx-auto space-y-5 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-5 ${
          activeTab === 'inventario' ? 'max-w-full' : 'max-w-[1360px]'
        }`}
      >
        {/* Barra de Contexto da Mesa */}
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#212636] bg-[#11141e] px-3 py-3 sm:gap-4 sm:px-4">
          <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <label className="flex w-full min-w-0 flex-col gap-1 text-xs text-slate-400 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
              <span className="shrink-0">Ficha Ativa</span>
              <select
                value={activeSheet.id}
                onChange={(e) => handleOpenFullSheet(e.target.value)}
                className="w-full min-w-0 max-w-full rounded border border-[#242a3b] bg-[#0b0d14] px-3 py-1.5 text-sm font-medium text-slate-100 focus:border-indigo-500 focus:outline-none sm:w-auto"
              >
                {accessibleFullSheets.map((s, idx) => {
                  const isRemote = !localSheets.some((loc) => loc.id === s.id);
                  const ownerLabel = s.permissions.ownerPlayerName || s.identity.player;
                  return (
                    <option key={s.id} value={s.id}>
                      {s.identity.name.trim() || `Personagem #${idx + 1} (Em branco)`}
                      {isRemote && ownerLabel ? ` [${ownerLabel}]` : ''} — Nvl{' '}
                      {resolveCalculableValue(s.identity.level)}
                    </option>
                  );
                })}
              </select>
            </label>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
              <span>{activeSheet.identity.specialization || 'Sem especialização'}</span>
              <span aria-hidden="true">·</span>
              <span>{activeSheet.identity.origin || 'Sem origem'}</span>
              <span aria-hidden="true">·</span>
              <GradeBadge grade={activeGrade} size="xs" />
              {!isLocalActiveSheet && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-indigo-300">
                    Jogador:{' '}
                    {activeSheet.permissions.ownerPlayerName ||
                      activeSheet.identity.player ||
                      'Remoto'}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
            {/* Papel: dentro do OBR vem estritamente de OBR.player.getRole(); fora do OBR mantém alternância local */}
            {obrCtx.isInsideOBR ? (
              <div
                className="col-span-2 inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1.5 text-xs font-medium text-slate-200 whitespace-nowrap shrink-0 sm:col-span-1 sm:min-h-0 sm:justify-start"
                title="Papel detectado automaticamente pelo Owlbear Rodeo"
              >
                <Shield className="h-3.5 w-3.5 text-indigo-300" />
                {viewerRole === 'GM' ? 'Mestre (OBR)' : 'Jogador (OBR)'}
              </div>
            ) : (
              <div className="col-span-2 grid grid-cols-2 items-center gap-1 rounded border border-[#242a3b] bg-[#0b0d14] p-0.5 sm:col-span-1 sm:flex">
                <button
                  type="button"
                  onClick={() => setLocalFallbackRole('GM')}
                  className={`inline-flex min-h-[36px] items-center justify-center gap-1 rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 sm:min-h-0 ${
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
                  onClick={() => setLocalFallbackRole('PLAYER')}
                  className={`inline-flex min-h-[36px] items-center justify-center rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 sm:min-h-0 ${
                    viewerRole === 'PLAYER'
                      ? 'bg-[#22283a] text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Jogador
                </button>
              </div>
            )}

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
                className={`col-span-2 inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded border px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 sm:col-span-1 sm:min-h-0 sm:justify-start ${
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

            {(activePolicy.isGM || activePolicy.isOwner) && (
              <>
                <button
                  type="button"
                  onClick={handleDuplicateSheet}
                  className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1.5 text-xs text-slate-300 hover:bg-[#171b28] whitespace-nowrap shrink-0 sm:min-h-0 sm:justify-start"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Duplicar
                </button>

                <button
                  type="button"
                  onClick={handleExportJson}
                  className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1.5 text-xs text-slate-300 hover:bg-[#171b28] whitespace-nowrap shrink-0 sm:min-h-0 sm:justify-start"
                >
                  <Download className="h-3.5 w-3.5" />
                  Exportar
                </button>
              </>
            )}

            <label className="inline-flex min-h-[40px] cursor-pointer items-center justify-center gap-1 rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1.5 text-xs text-slate-300 hover:bg-[#171b28] whitespace-nowrap shrink-0 sm:min-h-0 sm:justify-start">
              <Upload className="h-3.5 w-3.5" />
              Importar
              <input
                type="file"
                accept="application/json"
                onChange={handleImportJson}
                className="sr-only"
              />
            </label>

            {canDeleteActiveSheet && (
              <>
                {confirmDeleteId === activeSheet.id ? (
                  <div className="col-span-2 flex items-center gap-1.5 sm:col-span-1 sm:gap-1">
                    <button
                      type="button"
                      onClick={() => handleDeleteSheet(activeSheet.id)}
                      className="inline-flex min-h-[40px] flex-1 items-center justify-center rounded border border-red-500/60 bg-red-500/20 px-2.5 py-1.5 text-xs font-medium text-red-200 whitespace-nowrap shrink-0 sm:min-h-0 sm:flex-initial"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="inline-flex min-h-[40px] flex-1 items-center justify-center rounded border border-[#242a3b] px-2 py-1.5 text-xs text-slate-400 whitespace-nowrap shrink-0 sm:min-h-0 sm:flex-initial"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(activeSheet.id)}
                    className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded border border-[#242a3b] bg-[#0b0d14] px-2.5 py-1.5 text-xs text-slate-400 hover:border-red-500/40 hover:text-red-300 whitespace-nowrap shrink-0 sm:min-h-0 sm:justify-start"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {accessibleFullSheets.length <= 1 ? 'Zerar' : 'Excluir'}
                  </button>
                )}
              </>
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
            {!activePolicy.isOwner && !activePolicy.isGM
              ? 'Modo somente leitura: você está visualizando a ficha compartilhada de outro jogador.'
              : 'Modo somente leitura ativo: o mestre travou alterações nesta ficha para jogadores.'}
          </div>
        )}

        {activeTab === 'pessoal' && (
          <PersonalSheetTab
            key={activeSheet.id}
            sheet={activeSheet}
            onUpdate={handleUpdateActiveSheet}
            readOnly={isReadOnly}
            canManagePrivacy={activePolicy.canManagePrivacy}
            canOpenCombatCenter={activePolicy.canViewCombatCenter}
            onOpenCombatCenter={() => {
              setSelectedControlSheetId(activeSheet.id);
              setRequestedShieldSubView({ view: 'control', nonce: Date.now() });
              setActiveTab('escudo');
            }}
            onUpdatePrivacy={(patch) => handleUpdatePrivacy(activeSheet.id, patch)}
          />
        )}
        {activeTab === 'amaldicoado' && (
          <CursedProfileTab
            key={activeSheet.id}
            sheet={activeSheet}
            onUpdate={handleUpdateActiveSheet}
            readOnly={isReadOnly}
          />
        )}
        {activeTab === 'invocacoes' && (
          <SummonsTab
            key={activeSheet.id}
            sheet={activeSheet}
            onUpdate={handleUpdateActiveSheet}
            readOnly={isReadOnly}
          />
        )}
        {activeTab === 'inventario' && (
          <InventoryTab
            key={activeSheet.id}
            sheet={activeSheet}
            onUpdate={handleUpdateActiveSheet}
            readOnly={isReadOnly}
          />
        )}
        {activeTab === 'treinamentos' && (
          <TrainingsTab
            key={activeSheet.id}
            sheet={activeSheet}
            onUpdate={handleUpdateActiveSheet}
            readOnly={isReadOnly}
          />
        )}
        {activeTab === 'carteira' && (
          <WalletTab
            key={activeSheet.id}
            sheet={activeSheet}
            onUpdate={handleUpdateActiveSheet}
            readOnly={isReadOnly}
          />
        )}
        {activeTab === 'escudo' && (
          <MasterShieldTab
            viewerRole={viewerRole}
            isInsideOBR={obrCtx.isInsideOBR}
            currentPlayerId={obrCtx.playerId}
            party={obrCtx.party}
            localSheets={localSheets}
            sessionSheets={sessionSheets}
            sharedSummaries={sharedSummaries}
            selectedControlSheetId={selectedControlSheetId}
            onSelectControlSheet={setSelectedControlSheetId}
            onUpdateSheetById={handleUpdateSheetById}
            onOpenFullSheet={handleOpenFullSheet}
            onRequestSyncFromRoom={handleRequestSyncFromRoom}
            requestedSubView={requestedShieldSubView}
          />
        )}
      </main>
    </div>
  );
}

