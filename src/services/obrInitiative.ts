import OBR, { isImage, type Item } from '@owlbear-rodeo/sdk';
import type {
  InitiativeParticipant,
  InitiativeRoomState,
} from '../types/initiative';
import { enqueueRoomMetadataWrite } from './obrSync';

export const OBR_INITIATIVE_ROOM_KEY = 'br.fm25.ficha/initiative-v1';
export const OBR_ITEM_INITIATIVE_KEY = 'br.fm25.ficha/initiative';
const OFFICIAL_OBR_INITIATIVE_KEYS = [
  'rodeo.owlbear.initiative-tracker/metadata',
  'com.owlbear.initiative-tracker/metadata',
] as const;
const CONTEXT_MENU_INITIATIVE_ID = 'br.fm25.ficha/context-initiative';
const LOCAL_INITIATIVE_STORAGE_KEY = 'fm25_obr_initiative_v1';

export interface DetectedOBRInitiativeToken {
  tokenId: string;
  name: string;
  initiative: number;
  avatarUrl?: string;
  activeInOBR: boolean;
  hasOfficialTrackerMeta: boolean;
  hasExtensionMeta: boolean;
  officialMetaKey?: string;
}

export function createDefaultInitiativeState(): InitiativeRoomState {
  return {
    version: 1,
    round: 1,
    activeParticipantId: null,
    manualEntries: [],
    tokenOverrides: {},
    updatedAt: new Date().toISOString(),
  };
}

export function parseInitiativeRoomState(raw: unknown): InitiativeRoomState {
  if (!raw || typeof raw !== 'object') {
    return createDefaultInitiativeState();
  }
  const obj = raw as Partial<InitiativeRoomState>;
  return {
    version: 1,
    round: typeof obj.round === 'number' && obj.round >= 1 ? Math.floor(obj.round) : 1,
    activeParticipantId:
      typeof obj.activeParticipantId === 'string' ? obj.activeParticipantId : null,
    manualEntries: Array.isArray(obj.manualEntries)
      ? obj.manualEntries.filter(
          (e): e is InitiativeRoomState['manualEntries'][number] =>
            Boolean(e && typeof e.id === 'string' && typeof e.name === 'string')
        )
      : [],
    tokenOverrides:
      obj.tokenOverrides && typeof obj.tokenOverrides === 'object'
        ? (obj.tokenOverrides as Record<string, number>)
        : {},
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : new Date().toISOString(),
  };
}

export function loadLocalInitiativeState(): InitiativeRoomState {
  try {
    const raw = localStorage.getItem(LOCAL_INITIATIVE_STORAGE_KEY);
    if (raw) {
      return parseInitiativeRoomState(JSON.parse(raw));
    }
  } catch {
    // Fallback padrão
  }
  return createDefaultInitiativeState();
}

export function saveLocalInitiativeState(state: InitiativeRoomState): void {
  try {
    localStorage.setItem(LOCAL_INITIATIVE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignora erro de quota
  }
}

function parseNumericInitiative(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === 'string') {
    const cleaned = raw.trim().replace(',', '.');
    if (!cleaned) return 0;
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function getTokenDisplayName(item: Item): string {
  if (isImage(item)) {
    const plainText = item.text?.plainText?.trim();
    if (plainText) return plainText;
  }
  return item.name?.trim() || 'Token sem nome';
}

function extractInitiativeFromItem(item: Item): DetectedOBRInitiativeToken | null {
  const meta = item.metadata ?? {};
  const extEntry = meta[OBR_ITEM_INITIATIVE_KEY] as
    | { initiative?: number | string }
    | undefined;

  let officialKey: string | undefined;
  let officialEntry: Record<string, unknown> | undefined;

  for (const candidateKey of OFFICIAL_OBR_INITIATIVE_KEYS) {
    const val = meta[candidateKey];
    if (val && typeof val === 'object') {
      officialKey = candidateKey;
      officialEntry = val as Record<string, unknown>;
      break;
    }
  }

  // Fallback genérico para outras extensões compatíveis com "Add to Initiative" no OBR
  if (!officialEntry) {
    for (const [key, val] of Object.entries(meta)) {
      if (key === OBR_ITEM_INITIATIVE_KEY) continue;
      if (
        key.toLowerCase().includes('initiative') &&
        val &&
        typeof val === 'object' &&
        ('count' in val || 'initiative' in val)
      ) {
        officialKey = key;
        officialEntry = val as Record<string, unknown>;
        break;
      }
    }
  }

  if (!extEntry && !officialEntry) {
    return null;
  }

  const extVal = extEntry ? parseNumericInitiative(extEntry.initiative) : undefined;
  const officialVal = officialEntry
    ? parseNumericInitiative(officialEntry.count ?? officialEntry.initiative)
    : undefined;

  const initiative =
    officialVal !== undefined &&
    (officialEntry?.count !== '' && officialEntry?.count !== undefined
      ? true
      : extVal === undefined)
      ? officialVal
      : extVal ?? officialVal ?? 0;

  return {
    tokenId: item.id,
    name: getTokenDisplayName(item),
    initiative,
    avatarUrl: isImage(item) ? item.image?.url : undefined,
    activeInOBR: Boolean(officialEntry?.active ?? officialEntry?.currentTurn),
    hasOfficialTrackerMeta: Boolean(officialEntry),
    hasExtensionMeta: Boolean(extEntry),
    officialMetaKey: officialKey,
  };
}

export function extractInitiativeTokensFromItems(
  items: Item[]
): DetectedOBRInitiativeToken[] {
  const detected: DetectedOBRInitiativeToken[] = [];
  for (const item of items) {
    const parsed = extractInitiativeFromItem(item);
    if (parsed) {
      detected.push(parsed);
    }
  }
  return detected;
}

export async function saveInitiativeStateToRoom(
  state: InitiativeRoomState
): Promise<void> {
  saveLocalInitiativeState(state);
  if (!OBR.isAvailable || !OBR.isReady) return;

  await enqueueRoomMetadataWrite(async () => {
    await OBR.room.setMetadata({
      [OBR_INITIATIVE_ROOM_KEY]: state,
    });
  });
}

export async function updateTokenInitiativeValueInOBR(
  tokenId: string,
  nextValue: number
): Promise<void> {
  if (!OBR.isAvailable || !OBR.isReady) return;
  const sceneReady = await OBR.scene.isReady();
  if (!sceneReady) return;

  await OBR.scene.items.updateItems([tokenId], (items) => {
    for (const item of items) {
      item.metadata[OBR_ITEM_INITIATIVE_KEY] = {
        initiative: nextValue,
      };
      for (const key of OFFICIAL_OBR_INITIATIVE_KEYS) {
        const existing = item.metadata[key];
        if (existing && typeof existing === 'object') {
          item.metadata[key] = {
            ...(existing as Record<string, unknown>),
            count: String(nextValue),
          };
        }
      }
    }
  });
}

export async function setActiveTokenInOBRTracker(
  activeTokenId: string | null
): Promise<void> {
  if (!OBR.isAvailable || !OBR.isReady) return;
  const sceneReady = await OBR.scene.isReady();
  if (!sceneReady) return;

  await OBR.scene.items.updateItems(
    (item) =>
      OFFICIAL_OBR_INITIATIVE_KEYS.some((k) => Boolean(item.metadata[k])),
    (items) => {
      for (const item of items) {
        for (const key of OFFICIAL_OBR_INITIATIVE_KEYS) {
          const existing = item.metadata[key];
          if (existing && typeof existing === 'object') {
            item.metadata[key] = {
              ...(existing as Record<string, unknown>),
              active: item.id === activeTokenId,
            };
          }
        }
      }
    }
  );
}

export async function removeTokenFromOBRInitiative(
  tokenId: string
): Promise<void> {
  if (!OBR.isAvailable || !OBR.isReady) return;
  const sceneReady = await OBR.scene.isReady();
  if (!sceneReady) return;

  await OBR.scene.items.updateItems([tokenId], (items) => {
    for (const item of items) {
      delete item.metadata[OBR_ITEM_INITIATIVE_KEY];
      for (const key of OFFICIAL_OBR_INITIATIVE_KEYS) {
        delete item.metadata[key];
      }
    }
  });
}

export function sortInitiativeParticipants(
  list: InitiativeParticipant[]
): InitiativeParticipant[] {
  return [...list].sort((a, b) => {
    if (b.initiative !== a.initiative) {
      return b.initiative - a.initiative;
    }
    return a.name.localeCompare(b.name, 'pt-BR');
  });
}

/**
 * Conecta aos itens da cena e metadados da sala do OBR para detectar tokens
 * marcados com "Add to Initiative" ou pelo menu de contexto da extensão.
 */
export function subscribeOBRInitiative(callbacks: {
  onTokensChange: (tokens: DetectedOBRInitiativeToken[]) => void;
  onRoomStateChange: (state: InitiativeRoomState) => void;
}): () => void {
  if (!OBR.isAvailable) {
    callbacks.onTokensChange([]);
    callbacks.onRoomStateChange(loadLocalInitiativeState());
    return () => {};
  }

  let disposed = false;
  let unsubItems: (() => void) | null = null;
  let unsubSceneReady: (() => void) | null = null;
  let unsubRoomMeta: (() => void) | null = null;
  let contextMenuRegistered = false;

  const attachSceneItems = async () => {
    unsubItems?.();
    unsubItems = null;

    try {
      const items = await OBR.scene.items.getItems();
      if (!disposed) {
        callbacks.onTokensChange(extractInitiativeTokensFromItems(items));
      }
      unsubItems = OBR.scene.items.onChange((nextItems) => {
        if (!disposed) {
          callbacks.onTokensChange(extractInitiativeTokensFromItems(nextItems));
        }
      });
    } catch {
      if (!disposed) callbacks.onTokensChange([]);
    }
  };

  OBR.onReady(async () => {
    if (disposed) return;

    try {
      const basePath = import.meta.env.BASE_URL || '/';
      const iconUrl = new URL(
        `${basePath.endsWith('/') ? basePath : `${basePath}/`}icon.svg`,
        window.location.origin
      ).toString();

      await OBR.contextMenu.create({
        id: CONTEXT_MENU_INITIATIVE_ID,
        icons: [
          {
            icon: iconUrl,
            label: 'Adicionar à Iniciativa (F&M)',
            filter: {
              roles: ['GM'],
              every: [
                { key: 'type', value: 'IMAGE' },
                { key: ['metadata', OBR_ITEM_INITIATIVE_KEY], value: undefined },
              ],
            },
          },
          {
            icon: iconUrl,
            label: 'Remover da Iniciativa (F&M)',
            filter: {
              roles: ['GM'],
              every: [
                { key: 'type', value: 'IMAGE' },
                {
                  key: ['metadata', OBR_ITEM_INITIATIVE_KEY],
                  value: undefined,
                  operator: '!=',
                },
              ],
            },
          },
        ],
        onClick: async (context) => {
          const hasAnyWithout = context.items.some(
            (item) => !item.metadata[OBR_ITEM_INITIATIVE_KEY]
          );
          await OBR.scene.items.updateItems(context.items, (items) => {
            for (const item of items) {
              if (hasAnyWithout) {
                if (!item.metadata[OBR_ITEM_INITIATIVE_KEY]) {
                  item.metadata[OBR_ITEM_INITIATIVE_KEY] = { initiative: 0 };
                }
              } else {
                delete item.metadata[OBR_ITEM_INITIATIVE_KEY];
              }
            }
          });
        },
      });
      contextMenuRegistered = true;
    } catch {
      // Context menu é opcional se o host restringir
    }

    try {
      const meta = await OBR.room.getMetadata();
      if (!disposed && meta[OBR_INITIATIVE_ROOM_KEY]) {
        callbacks.onRoomStateChange(
          parseInitiativeRoomState(meta[OBR_INITIATIVE_ROOM_KEY])
        );
      } else if (!disposed) {
        callbacks.onRoomStateChange(loadLocalInitiativeState());
      }
    } catch {
      if (!disposed) callbacks.onRoomStateChange(loadLocalInitiativeState());
    }

    unsubRoomMeta = OBR.room.onMetadataChange((meta) => {
      if (!disposed && meta[OBR_INITIATIVE_ROOM_KEY]) {
        callbacks.onRoomStateChange(
          parseInitiativeRoomState(meta[OBR_INITIATIVE_ROOM_KEY])
        );
      }
    });

    try {
      const sceneReady = await OBR.scene.isReady();
      if (sceneReady && !disposed) {
        await attachSceneItems();
      }
    } catch {
      // Cena ainda não aberta
    }

    unsubSceneReady = OBR.scene.onReadyChange((ready) => {
      if (disposed) return;
      if (ready) {
        void attachSceneItems();
      } else {
        unsubItems?.();
        unsubItems = null;
        callbacks.onTokensChange([]);
      }
    });
  });

  return () => {
    disposed = true;
    unsubItems?.();
    unsubSceneReady?.();
    unsubRoomMeta?.();
    if (contextMenuRegistered && OBR.isAvailable && OBR.isReady) {
      void OBR.contextMenu.remove(CONTEXT_MENU_INITIATIVE_ID).catch(() => {});
    }
  };
}
