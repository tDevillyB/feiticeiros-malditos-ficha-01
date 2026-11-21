import OBR from '@owlbear-rodeo/sdk';
import type { Player } from '@owlbear-rodeo/sdk';
import type {
  FichaPersonagem,
  SharedCharacterSummary,
  SharedTableState,
} from '../types/character';
import {
  buildSharedCharacterSummary,
  migrateLegacySheetFields,
  recalculateCharacterSheet,
} from '../utils/calculations';

export const OBR_TABLE_METADATA_KEY = 'br.fm25.ficha/table-v1';
export const OBR_PLAYER_PRIVACY_KEY = 'br.fm25.ficha/privacy-v1';
export const OBR_SYNC_CHANNEL = 'br.fm25.ficha/sync';
const MAX_ROOM_METADATA_BYTES = 14500;

export type OBRRole = 'GM' | 'PLAYER';

export interface SheetPrivacyRecord {
  allowOtherPlayersViewSheet: boolean;
  allowOtherPlayersViewCombatCenter: boolean;
  updatedAt: string;
}

export type PlayerPrivacyMap = Record<string, SheetPrivacyRecord>;

export interface OBRSessionContext {
  isInsideOBR: boolean;
  isReady: boolean;
  playerId: string | null;
  playerName: string;
  role: OBRRole | null;
  party: Player[];
  privacyBySheetId: PlayerPrivacyMap;
}

export type OBRSyncMessage =
  | {
      type: 'REQUEST_FULL_SHEETS';
      requesterId: string;
      requesterRole: OBRRole;
    }
  | {
      type: 'FULL_SHEET_SYNC';
      sheet: FichaPersonagem;
      senderId: string;
      sentAt: string;
    }
  | {
      type: 'GM_SHEET_UPDATE';
      sheet: FichaPersonagem;
      gmId: string;
      sentAt: string;
    }
  | {
      type: 'REVOKE_PLAYER_ACCESS';
      sheetId: string;
      senderId: string;
      allowOtherPlayersViewSheet: boolean;
      allowOtherPlayersViewCombatCenter: boolean;
    }
  | {
      type: 'REMOVE_SHEET_SYNC';
      sheetId: string;
      senderId: string;
      deletedAt?: string;
    };

const MAX_ROOM_TOMBSTONES = 60;

function parseDeletedSheetsMap(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {};
  const result: Record<string, string> = {};
  for (const [sheetId, ts] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof sheetId === 'string' && typeof ts === 'string' && ts) {
      result[sheetId] = ts;
    }
  }
  return result;
}

function pruneTombstones(
  map: Record<string, string>,
  maxEntries = MAX_ROOM_TOMBSTONES
): Record<string, string> {
  const entries = Object.entries(map);
  if (entries.length <= maxEntries) return map;
  entries.sort((a, b) => (a[1] > b[1] ? -1 : a[1] < b[1] ? 1 : 0));
  return Object.fromEntries(entries.slice(0, maxEntries));
}

function parseTableState(raw: unknown): SharedTableState {
  if (
    raw &&
    typeof raw === 'object' &&
    'summaries' in raw &&
    typeof (raw as SharedTableState).summaries === 'object' &&
    (raw as SharedTableState).summaries !== null
  ) {
    const typed = raw as SharedTableState;
    return {
      version: typed.version ?? 1,
      updatedAt: typed.updatedAt ?? new Date().toISOString(),
      summaries: typed.summaries,
      deletedSheets: parseDeletedSheetsMap(typed.deletedSheets),
    };
  }
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    summaries: {},
    deletedSheets: {},
  };
}

export function parsePlayerPrivacyMap(raw: unknown): PlayerPrivacyMap {
  if (!raw || typeof raw !== 'object') return {};
  const result: PlayerPrivacyMap = {};
  for (const [sheetId, val] of Object.entries(raw as Record<string, unknown>)) {
    if (val && typeof val === 'object') {
      const rec = val as Partial<SheetPrivacyRecord>;
      result[sheetId] = {
        allowOtherPlayersViewSheet: Boolean(rec.allowOtherPlayersViewSheet),
        allowOtherPlayersViewCombatCenter: Boolean(rec.allowOtherPlayersViewCombatCenter),
        updatedAt: typeof rec.updatedAt === 'string' ? rec.updatedAt : '',
      };
    }
  }
  return result;
}

/**
 * Inicializa conexão com o SDK do Owlbear Rodeo quando rodando dentro do iframe do OBR.
 * Em navegador isolado (fora do OBR), retorna imediatamente `isInsideOBR: false`.
 */
export function initOBRSession(callbacks: {
  onContextChange: (ctx: OBRSessionContext) => void;
  onTableStateChange: (state: SharedTableState) => void;
  onSyncMessage: (
    msg: OBRSyncMessage,
    connectionId: string,
    verifiedSender: Player | null
  ) => void;
}): () => void {
  if (!OBR.isAvailable) {
    callbacks.onContextChange({
      isInsideOBR: false,
      isReady: true,
      playerId: null,
      playerName: '',
      role: null,
      party: [],
      privacyBySheetId: {},
    });
    return () => {};
  }

  let disposed = false;
  let unsubPlayer: (() => void) | null = null;
  let unsubParty: (() => void) | null = null;
  let unsubRoom: (() => void) | null = null;
  let unsubBroadcast: (() => void) | null = null;

  let currentCtx: OBRSessionContext = {
    isInsideOBR: true,
    isReady: false,
    playerId: null,
    playerName: '',
    role: null,
    party: [],
    privacyBySheetId: {},
  };

  const emitContext = (patch: Partial<OBRSessionContext>) => {
    currentCtx = { ...currentCtx, ...patch };
    if (!disposed) {
      callbacks.onContextChange(currentCtx);
    }
  };

  OBR.onReady(async () => {
    if (disposed) return;

    try {
      const [playerId, playerName, role, party, roomMeta, playerMeta] =
        await Promise.all([
          OBR.player.getId(),
          OBR.player.getName(),
          OBR.player.getRole(),
          OBR.party.getPlayers(),
          OBR.room.getMetadata(),
          OBR.player.getMetadata(),
        ]);

      if (disposed) return;

      emitContext({
        isInsideOBR: true,
        isReady: true,
        playerId,
        playerName,
        role,
        party,
        privacyBySheetId: parsePlayerPrivacyMap(playerMeta[OBR_PLAYER_PRIVACY_KEY]),
      });

      callbacks.onTableStateChange(parseTableState(roomMeta[OBR_TABLE_METADATA_KEY]));

      unsubPlayer = OBR.player.onChange((player) => {
        emitContext({
          playerId: player.id,
          playerName: player.name,
          role: player.role,
          privacyBySheetId: parsePlayerPrivacyMap(
            player.metadata[OBR_PLAYER_PRIVACY_KEY]
          ),
        });
      });

      unsubParty = OBR.party.onChange((players) => {
        emitContext({ party: players });
      });

      unsubRoom = OBR.room.onMetadataChange((metadata) => {
        if (!disposed) {
          callbacks.onTableStateChange(parseTableState(metadata[OBR_TABLE_METADATA_KEY]));
        }
      });

      unsubBroadcast = OBR.broadcast.onMessage(OBR_SYNC_CHANNEL, (event) => {
        if (disposed) return;
        const payload = event.data as OBRSyncMessage | undefined;
        if (payload && typeof payload === 'object' && 'type' in payload) {
          const verifiedSender =
            currentCtx.party.find((p) => p.connectionId === event.connectionId) ?? null;
          callbacks.onSyncMessage(payload, event.connectionId, verifiedSender);
        }
      });
    } catch {
      emitContext({ isReady: true });
    }
  });

  return () => {
    disposed = true;
    unsubPlayer?.();
    unsubParty?.();
    unsubRoom?.();
    unsubBroadcast?.();
  };
}

/**
 * Persiste as preferências de privacidade das fichas pertencentes ao jogador
 * diretamente em `OBR.player.metadata` para sobreviver a fechamento/reabertura.
 */
export async function savePrivacySettingsToPlayerMetadata(
  sheets: FichaPersonagem[],
  playerId: string | null
): Promise<void> {
  if (!OBR.isAvailable || !OBR.isReady || !playerId) return;

  const existingMeta = await OBR.player.getMetadata();
  const currentMap = parsePlayerPrivacyMap(existingMeta[OBR_PLAYER_PRIVACY_KEY]);
  const nextMap: PlayerPrivacyMap = { ...currentMap };

  for (const sheet of sheets) {
    const isOwned =
      sheet.permissions.ownerPlayerId === null ||
      sheet.permissions.ownerPlayerId === playerId;
    if (!isOwned) continue;

    nextMap[sheet.id] = {
      allowOtherPlayersViewSheet: Boolean(sheet.permissions.allowOtherPlayersViewSheet),
      allowOtherPlayersViewCombatCenter: Boolean(
        sheet.permissions.allowOtherPlayersViewCombatCenter
      ),
      updatedAt: sheet.updatedAt,
    };
  }

  await OBR.player.setMetadata({
    [OBR_PLAYER_PRIVACY_KEY]: nextMap,
  });
}

/**
 * Remove o registro de privacidade de uma ficha excluída dos metadados do jogador no OBR.
 */
export async function removePrivacySettingsFromPlayerMetadata(
  sheetId: string,
  playerId: string | null
): Promise<void> {
  if (!OBR.isAvailable || !OBR.isReady || !playerId) return;

  const existingMeta = await OBR.player.getMetadata();
  const currentMap = parsePlayerPrivacyMap(existingMeta[OBR_PLAYER_PRIVACY_KEY]);
  if (!(sheetId in currentMap)) return;

  const nextMap: PlayerPrivacyMap = { ...currentMap };
  delete nextMap[sheetId];

  await OBR.player.setMetadata({
    [OBR_PLAYER_PRIVACY_KEY]: nextMap,
  });
}

let roomMetadataWriteQueue: Promise<unknown> = Promise.resolve();

export function enqueueRoomMetadataWrite<T>(task: () => Promise<T>): Promise<T> {
  const next = roomMetadataWriteQueue.then(task, task);
  roomMetadataWriteQueue = next.catch(() => null);
  return next;
}

/**
 * Publica ou atualiza o resumo compacto de uma ficha nos metadados compartilhados da sala OBR.
 * Valida papel/propriedade antes de gravar e serializa escritas para evitar corrida de estado.
 */
export function upsertSharedSummaryInRoom(
  sheet: FichaPersonagem
): Promise<SharedTableState | null> {
  if (!OBR.isAvailable || !OBR.isReady) return Promise.resolve(null);

  return enqueueRoomMetadataWrite(async () => {
    const [myId, myRole, currentMeta] = await Promise.all([
      OBR.player.getId(),
      OBR.player.getRole(),
      OBR.room.getMetadata(),
    ]);

    const currentState = parseTableState(currentMeta[OBR_TABLE_METADATA_KEY]);
    const existingSummary = currentState.summaries[sheet.id];
    const deletedAt = currentState.deletedSheets?.[sheet.id];

    // Impede que uma sincronização atrasada ressuscite uma ficha recém-excluída
    if (deletedAt && (!sheet.updatedAt || deletedAt >= sheet.updatedAt)) {
      return currentState;
    }

    // Impede que um jogador comum sobrescreva o resumo de ficha pertencente a outro jogador
    if (
      myRole !== 'GM' &&
      existingSummary?.ownerPlayerId &&
      existingSummary.ownerPlayerId !== myId
    ) {
      return currentState;
    }

    // Evita que uma escrita atrasada sobrescreva um resumo mais recente da mesma ficha
    if (
      existingSummary?.updatedAt &&
      sheet.updatedAt &&
      existingSummary.updatedAt > sheet.updatedAt
    ) {
      return currentState;
    }

    const summary = buildSharedCharacterSummary(sheet);
    const mergedSummaries: Record<string, SharedCharacterSummary> = {
      ...currentState.summaries,
      [summary.sheetId]: summary,
    };

    const nextDeletedSheets = { ...(currentState.deletedSheets ?? {}) };
    if (deletedAt && sheet.updatedAt && sheet.updatedAt > deletedAt) {
      delete nextDeletedSheets[sheet.id];
    }

    const nextState: SharedTableState = {
      version: 1,
      updatedAt: new Date().toISOString(),
      summaries: mergedSummaries,
      deletedSheets: pruneTombstones(nextDeletedSheets),
    };

    const serializedSize = new TextEncoder().encode(JSON.stringify(nextState)).length;
    if (serializedSize > MAX_ROOM_METADATA_BYTES) {
      for (const id of Object.keys(mergedSummaries)) {
        if (mergedSummaries[id].avatarUrl) {
          mergedSummaries[id] = { ...mergedSummaries[id], avatarUrl: undefined };
        }
      }
    }

    await OBR.room.setMetadata({
      [OBR_TABLE_METADATA_KEY]: nextState,
    });

    return nextState;
  });
}

/**
 * Remove o resumo de um personagem dos metadados compartilhados da sala OBR
 * e opcionalmente registra tombstone para impedir restauração por caches de outros participantes.
 */
export function removeSharedSummaryFromRoom(
  sheetId: string,
  options?: { deletedAt?: string; recordTombstone?: boolean }
): Promise<SharedTableState | null> {
  if (!OBR.isAvailable || !OBR.isReady) return Promise.resolve(null);

  return enqueueRoomMetadataWrite(async () => {
    const [myId, myRole, currentMeta] = await Promise.all([
      OBR.player.getId(),
      OBR.player.getRole(),
      OBR.room.getMetadata(),
    ]);
    const currentState = parseTableState(currentMeta[OBR_TABLE_METADATA_KEY]);
    const existing = currentState.summaries[sheetId];
    const shouldTombstone = Boolean(options?.recordTombstone);

    if (!existing && !shouldTombstone) return currentState;

    if (existing && myRole !== 'GM' && existing.ownerPlayerId && existing.ownerPlayerId !== myId) {
      return currentState;
    }

    const nextSummaries = { ...currentState.summaries };
    delete nextSummaries[sheetId];

    const deletedAt = options?.deletedAt ?? new Date().toISOString();
    const nextDeletedSheets = shouldTombstone
      ? pruneTombstones({
          ...(currentState.deletedSheets ?? {}),
          [sheetId]: deletedAt,
        })
      : pruneTombstones(currentState.deletedSheets ?? {});

    const nextState: SharedTableState = {
      version: 1,
      updatedAt: new Date().toISOString(),
      summaries: nextSummaries,
      deletedSheets: nextDeletedSheets,
    };

    await OBR.room.setMetadata({
      [OBR_TABLE_METADATA_KEY]: nextState,
    });

    return nextState;
  });
}

/**
 * Envia mensagem pelo canal de broadcast do Owlbear Rodeo para sincronização
 * das fichas completas entre Jogadores e Mestre em tempo real.
 */
export async function sendOBRSyncMessage(message: OBRSyncMessage): Promise<void> {
  if (!OBR.isAvailable || !OBR.isReady) return;
  await OBR.broadcast.sendMessage(OBR_SYNC_CHANNEL, message, {
    destination: 'REMOTE',
  });
}

/**
 * Normaliza ficha recebida via broadcast aplicando recálculo do motor da ficha.
 */
export function normalizeSyncedSheet(raw: FichaPersonagem): FichaPersonagem {
  const migrated = migrateLegacySheetFields({
    ...raw,
    permissions: {
      ...raw.permissions,
      allowOtherPlayersViewSheet: Boolean(raw.permissions?.allowOtherPlayersViewSheet),
      allowOtherPlayersViewCombatCenter: Boolean(
        raw.permissions?.allowOtherPlayersViewCombatCenter
      ),
      ...(raw.permissions?.createdByRole
        ? { createdByRole: raw.permissions.createdByRole }
        : {}),
      ...(typeof raw.permissions?.showOnMasterShield === 'boolean'
        ? { showOnMasterShield: raw.permissions.showOnMasterShield }
        : {}),
    },
    controlledCurses: raw.controlledCurses ?? [],
    summons: (raw.summons ?? []).map((s) => ({
      ...s,
      conditions: s.conditions ?? [],
    })),
  });
  return recalculateCharacterSheet(migrated);
}
