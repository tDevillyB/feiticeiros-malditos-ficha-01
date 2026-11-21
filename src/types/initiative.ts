export type InitiativeParticipantSource = 'obr-token' | 'sheet' | 'manual';

export interface InitiativeParticipant {
  id: string;
  name: string;
  initiative: number;
  source: InitiativeParticipantSource;
  tokenId?: string;
  sheetId?: string;
  avatarUrl?: string;
  activeInOBR?: boolean;
}

export interface ManualInitiativeEntry {
  id: string;
  name: string;
  initiative: number;
  sheetId?: string;
  source: 'sheet' | 'manual';
}

export interface InitiativeRoomState {
  version: 1;
  round: number;
  activeParticipantId: string | null;
  manualEntries: ManualInitiativeEntry[];
  tokenOverrides: Record<string, number>;
  updatedAt: string;
}
