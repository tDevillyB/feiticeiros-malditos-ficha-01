import { createBlankCharacterRecord } from '../data/vanillaTemplate';
import type {
  CharacterPermissions,
  FichaPersonagem,
  SharedCharacterSummary,
} from '../types/character';

export interface SheetAccessContext {
  viewerRole: 'GM' | 'PLAYER';
  currentPlayerId: string | null;
  isInsideOBR: boolean;
  localSheetIds: ReadonlySet<string>;
}

export interface SheetAccessPolicy {
  isGM: boolean;
  isOwner: boolean;
  canViewFullSheet: boolean;
  canEditFullSheet: boolean;
  canViewCombatCenter: boolean;
  canEditCombatCenter: boolean;
  canManagePrivacy: boolean;
  allowOtherPlayersViewSheet: boolean;
  allowOtherPlayersViewCombatCenter: boolean;
  lockedByGM: boolean;
}

/**
 * Determina se o usuário atual é o proprietário legítimo da ficha.
 * Dentro do Owlbear Rodeo, valida pelo playerId real obtido via OBR SDK.
 */
export function isCharacterOwner(
  sheetId: string,
  ownerPlayerId: string | null,
  ctx: SheetAccessContext
): boolean {
  if (ctx.isInsideOBR) {
    if (!ctx.currentPlayerId) return false;
    return (
      ctx.localSheetIds.has(sheetId) &&
      (ownerPlayerId === null || ownerPlayerId === ctx.currentPlayerId)
    );
  }
  return ctx.localSheetIds.has(sheetId);
}

/**
 * Calcula a política efetiva de acesso (visualização, edição e privacidade)
 * para uma ficha ou resumo compartilhado, aplicando regras independentes.
 */
export function evaluateSheetAccess(
  target: {
    sheetId: string;
    ownerPlayerId: string | null;
    lockedByGM: boolean;
    allowOtherPlayersViewSheet?: boolean;
    allowOtherPlayersViewCombatCenter?: boolean;
  },
  ctx: SheetAccessContext
): SheetAccessPolicy {
  const isGM = ctx.viewerRole === 'GM';
  const isOwner = isCharacterOwner(target.sheetId, target.ownerPlayerId, ctx);
  const allowSheet = Boolean(target.allowOtherPlayersViewSheet);
  const allowCombat = Boolean(target.allowOtherPlayersViewCombatCenter);

  return {
    isGM,
    isOwner,
    canViewFullSheet: isGM || isOwner || allowSheet,
    canEditFullSheet: isGM || (isOwner && !target.lockedByGM),
    canViewCombatCenter: isGM || isOwner || allowCombat,
    canEditCombatCenter: isGM || (isOwner && !target.lockedByGM),
    canManagePrivacy: isGM || isOwner,
    allowOtherPlayersViewSheet: allowSheet,
    allowOtherPlayersViewCombatCenter: allowCombat,
    lockedByGM: target.lockedByGM,
  };
}

export function evaluateSheetAccessFromSheet(
  sheet: FichaPersonagem,
  ctx: SheetAccessContext,
  roomSummary?: SharedCharacterSummary
): SheetAccessPolicy {
  // Resumo da sala (OBR.room.metadata) tem precedência para flags de compartilhamento quando disponível
  const effectivePermissions: Pick<
    CharacterPermissions,
    | 'ownerPlayerId'
    | 'lockedByGM'
    | 'allowOtherPlayersViewSheet'
    | 'allowOtherPlayersViewCombatCenter'
  > = roomSummary
    ? {
        ownerPlayerId: roomSummary.ownerPlayerId ?? sheet.permissions.ownerPlayerId,
        lockedByGM:
          roomSummary.updatedAt > sheet.updatedAt
            ? roomSummary.lockedByGM
            : sheet.permissions.lockedByGM,
        allowOtherPlayersViewSheet:
          roomSummary.updatedAt > sheet.updatedAt
            ? roomSummary.allowOtherPlayersViewSheet
            : sheet.permissions.allowOtherPlayersViewSheet,
        allowOtherPlayersViewCombatCenter:
          roomSummary.updatedAt > sheet.updatedAt
            ? roomSummary.allowOtherPlayersViewCombatCenter
            : sheet.permissions.allowOtherPlayersViewCombatCenter,
      }
    : sheet.permissions;

  return evaluateSheetAccess(
    {
      sheetId: sheet.id,
      ownerPlayerId: effectivePermissions.ownerPlayerId,
      lockedByGM: effectivePermissions.lockedByGM,
      allowOtherPlayersViewSheet: effectivePermissions.allowOtherPlayersViewSheet,
      allowOtherPlayersViewCombatCenter:
        effectivePermissions.allowOtherPlayersViewCombatCenter,
    },
    ctx
  );
}

/**
 * Remove seções privadas não pertencentes à Central de Combate quando o proprietário
 * autorizou apenas a visualização da Central de Combate (e manteve a ficha completa privada).
 */
export function sanitizeSheetForCombatCenterOnly(
  sheet: FichaPersonagem
): FichaPersonagem {
  return {
    ...sheet,
    notes: '',
    characterRecord: createBlankCharacterRecord(),
    bindingVows: {
      ...sheet.bindingVows,
      items: [],
    },
    inventory: {
      ...sheet.inventory,
      items: [],
      equipments: [],
      weapons: [],
      armors: [],
      shields: [],
      specialCharacteristics: [],
      specialAbilities: [],
      equipmentAndAccessories: [],
    },
    trainings: {
      ...sheet.trainings,
      trainings: [],
      techniqueRevisions: [],
      interludesLog: [],
      generalNotes: '',
    },
    wallet: {
      ...sheet.wallet,
      xp: {
        ...sheet.wallet.xp,
        entries: [],
      },
      finances: {
        ...sheet.wallet.finances,
        transactions: [],
      },
      missions: [],
    },
  };
}

export interface MasterShieldVisibilityContext {
  viewerRole: 'GM' | 'PLAYER';
  currentPlayerId: string | null;
  isInsideOBR: boolean;
  localSheetIds: ReadonlySet<string>;
  gmPlayerIds: ReadonlySet<string>;
}

/**
 * Identifica se a ficha pertence ao fluxo de criação do Mestre (NPCs, inimigos,
 * maldições, chefes e fichas preparadas pelo GM) em oposição a fichas de jogadores.
 */
export function isMasterCreatedSheet(
  target: {
    sheetId: string;
    ownerPlayerId: string | null;
    createdByRole?: 'GM' | 'PLAYER';
  },
  ctx: MasterShieldVisibilityContext
): boolean {
  if (target.createdByRole === 'PLAYER') return false;
  if (target.createdByRole === 'GM') return true;

  // Compatibilidade com fichas legadas (sem createdByRole):
  if (ctx.isInsideOBR) {
    if (target.ownerPlayerId && ctx.gmPlayerIds.has(target.ownerPlayerId)) {
      return true;
    }
    if (
      ctx.viewerRole === 'GM' &&
      ctx.localSheetIds.has(target.sheetId) &&
      (target.ownerPlayerId === null || target.ownerPlayerId === ctx.currentPlayerId)
    ) {
      return true;
    }
    return false;
  }

  // Modo local fora do OBR: fichas locais sem createdByRole quando no papel de Mestre
  return ctx.viewerRole === 'GM' && ctx.localSheetIds.has(target.sheetId);
}

/**
 * Fichas de jogadores aparecem automaticamente no Escudo do Mestre.
 * Fichas criadas pelo Mestre (NPCs/inimigos) só aparecem quando explicitamente ativadas.
 */
export function shouldShowOnMasterShield(
  target: {
    sheetId: string;
    ownerPlayerId: string | null;
    createdByRole?: 'GM' | 'PLAYER';
    showOnMasterShield?: boolean;
  },
  ctx: MasterShieldVisibilityContext
): boolean {
  if (!isMasterCreatedSheet(target, ctx)) {
    return true;
  }
  return Boolean(target.showOnMasterShield);
}

