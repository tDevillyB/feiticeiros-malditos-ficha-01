/**
 * Estrutura de dados da ficha Feiticeiros & Maldições RPG (versão 2.5)
 * para extensão do Owlbear Rodeo.
 *
 * Todo campo numérico (ou derivado) calculável utiliza `CalculableField<T>` /
 * `CalculableNumber`, garantindo que possua:
 * - `valorCalculado`: resultado produzido pelo motor de cálculos;
 * - `sobrescritaManual?`: valor opcional definido manualmente pelo jogador/mestre;
 * - `usarManual`: booleano que controla se o motor deve ceder lugar ao valor manual.
 */

// ============================================================================
// 1. TIPOS BASE E MECANISMO DE SOBRESCRITA MANUAL
// ============================================================================

export type AttributeKey = 'FOR' | 'DEX' | 'CON' | 'INT' | 'SAB' | 'PRE';

export type MasteryMode = 'Inteira' | 'Metade';

export type HitPointCalculationMethod = 'average' | 'roll';

export type DamageTypeKey =
  | 'Cortante'
  | 'Perfurante'
  | 'Impacto'
  | 'Ácido'
  | 'Chocante'
  | 'Congelante'
  | 'Energia Reversa'
  | 'Energético'
  | 'Sônico'
  | 'Necrótico'
  | 'Psíquico'
  | 'Queimante'
  | 'Radiante'
  | 'Venenoso'
  | 'Dano na alma';

export type BleedingSeverity = 'Fraco' | 'Médio' | 'Forte' | 'Extremo';

export type FreezingSeverity = 'Leve' | 'Médio' | 'Total';

export type SimpleConditionKey =
  | 'Abalado'
  | 'Agarrado'
  | 'Amedrontado'
  | 'Atordoado'
  | 'Caído'
  | 'Cego'
  | 'Aterrorizado'
  | 'Condenado'
  | 'Confuso'
  | 'Desorientado'
  | 'Desprevenido'
  | 'Enfeitiçado'
  | 'Enjoado'
  | 'Engasgando'
  | 'Enredado'
  | 'Envenenado'
  | 'Exposto'
  | 'Fragilizado'
  | 'Imóvel'
  | 'Inconsciente'
  | 'Indefeso'
  | 'Lento'
  | 'Paralisado'
  | 'Surdo'
  | 'Sofrendo'
  | 'Surpreso';

/**
 * Estrutura padrão para qualquer campo calculável com suporte a sobrescrita manual.
 * O motor de cálculos atualiza `valorCalculado` sem apagar `sobrescritaManual`.
 */
export interface CalculableField<T = number> {
  /** Valor calculado automaticamente pelo motor da ficha */
  valorCalculado: T;
  /** Valor opcional inserido manualmente pelo jogador ou mestre */
  sobrescritaManual?: T;
  /** Controla se a ficha exibe e propaga `sobrescritaManual` em vez de `valorCalculado` */
  usarManual: boolean;
  /** Nota opcional justificando a sobrescrita manual */
  observacaoManual?: string;
}

export type CalculableNumber = CalculableField<number>;
export type CalculableText = CalculableField<string>;

// ============================================================================
// 2. FICHA PESSOAL — IDENTIDADE, PROGRESSÃO E ATRIBUTOS
// ============================================================================

export interface IdentityData {
  name: string;
  player: string;
  campaign: string;
  level: CalculableNumber;
  trainingBonus: CalculableNumber;
  experience: CalculableNumber;
  origin: string;
  specialization: string;
  specializationLevel: number;
  multiclass: string;
  multiclassLevel: number;
  techniqueName: string;
  grade: CalculableText;
}

export interface AttributeEntry {
  key: AttributeKey;
  label: string;
  /** Valor base editável do atributo */
  baseValue: number;
  /** Bônus externos (itens, talentos, evolução, interlúdios) */
  bonusValue: number;
  /** Valor total do atributo */
  value: CalculableNumber;
  /** Modificador/bônus derivado do atributo */
  modifier: CalculableNumber;
}

export type AttributesMap = Record<AttributeKey, AttributeEntry>;

// ============================================================================
// 3. FICHA PESSOAL — PONTOS DE VIDA, ENERGIA, SANIDADE E INTEGRIDADE
// ============================================================================

export interface HitPointsData {
  current: CalculableNumber;
  max: CalculableNumber;
  percentage: CalculableNumber;
  lost: number;
  healed: number;
  temp: number;
  other: number;
  permanentLoss: number;
  /** Valores rolados por nível quando `method === 'roll'` */
  rolledPerLevel: number[];
  method: HitPointCalculationMethod;
  controlledPhysique: string;
  flags: {
    steelBody: boolean;         // Corpo de Aço
    callousedBody: boolean;     // Corpo Calejado
    improvedToughness: boolean; // Robustez Ap.
    kamo: boolean;              // KAMO (Modelo v2.5)
    robustez: boolean;          // ROBUSTEZ (Modelo v2.5)
    desExa: boolean;            // DES. EXA. (Modelo v2.5)
    vigorInf: boolean;          // VIGOR INF. (Modelo v2.5)
  };
}

export interface CursedEnergyPointsData {
  current: CalculableNumber;
  max: CalculableNumber;
  percentage: CalculableNumber;
  lost: number;
  healed: number;
  temp: number;
  other: number;
  permanentLoss: number;
  attribute: AttributeKey | 'N/A';
  kokusen: string;
  endlessEnergy: boolean; // E. Inacabável
  masteryBonus: boolean;  // B. Maestria
}

export interface ReverseEnergyPointsData {
  current: CalculableNumber;
  max: CalculableNumber;
  percentage: CalculableNumber;
  lost: number;
}

export interface SanityData {
  current: CalculableNumber;
  max: CalculableNumber;
  percentage: CalculableNumber;
  lost: number;
  recovered: number;
  add: number;
}

export interface IntegrityData {
  current: CalculableNumber;
  max: CalculableNumber;
  percentage: CalculableNumber;
  lost: number;
  recovered: number;
  add: number;
  currentState: string;
  rd: number;
}

export interface DeathSavesData {
  successes: [boolean, boolean, boolean];
  failures: [boolean, boolean, boolean];
}

export interface HitDiePool {
  id: string;
  sourceLabel: string;
  die: string;
  pending: number;
  owned: CalculableNumber;
  used: number;
  available: CalculableNumber;
}

export interface ExhaustionData {
  current: number;
  max: CalculableNumber;
}

export interface ExcitementLevelEntry {
  level: number;
  active: boolean;
  dice: string;
}

export interface VitalsData {
  hp: HitPointsData;
  pe: CursedEnergyPointsData;
  er: ReverseEnergyPointsData;
  sanity: SanityData;
  integrity: IntegrityData;
  deathSaves: DeathSavesData;
  hitDice: HitDiePool[];
  exhaustion: ExhaustionData;
  excitement: ExcitementLevelEntry[];
}

// ============================================================================
// 4. FICHA PESSOAL — DEFESA, PERÍCIAS, SALVAGUARDAS E ATAQUES
// ============================================================================

export interface DefenseComponentEntry {
  id: string;
  label: string; // Uniforme, Cota M., Buffs, Debuff, Outros
  bonus: number;
  attribute: AttributeKey | 'N/A';
  attributeBonus: CalculableNumber;
}

export interface DefenseData {
  base: CalculableNumber;
  total: CalculableNumber;
  components: DefenseComponentEntry[];
  defensive: boolean;
  massive: boolean; // Maciça
}

export interface ProficiencyRollEntry {
  id: string;
  name: string;
  isCustomName?: boolean;
  attribute: AttributeKey;
  other: number;
  trained: boolean;  // Tr
  mastered: boolean; // Ms
  total: CalculableNumber;
}

// ============================================================================
// 5. FICHA PESSOAL — DERIVADOS, CDS, RD, REGISTRO RÁPIDO E CARACTERÍSTICAS
// ============================================================================

export interface DerivedModifierField {
  total: CalculableNumber;
  add: number;
  removed: number;
}

export interface DifficultyClassData {
  total: CalculableNumber;
  levelBonus: CalculableNumber;
  attribute: AttributeKey;
  other: number;
  masteryMode: MasteryMode;
}

export interface DerivedStatsData {
  attention: DerivedModifierField;
  movement: DerivedModifierField;
  initiative: DerivedModifierField;
  cdSpecialization: DifficultyClassData;
  cdCursed: DifficultyClassData;
  superiorImprovementsAndLegendary: string;
  inspiration: number;
  energyLimit: CalculableNumber;
  prepPoints: {
    total: number;
    lost: number;
  };
}

export interface DamageReductionEntry {
  type: DamageTypeKey;
  amount: number;
  total: CalculableNumber;
}

export interface DamageMitigationData {
  generalRD: number;
  byType: Record<DamageTypeKey, DamageReductionEntry>;
  resistances: string[];
  immunities: string[];
  conditionAdvantages: string[];
}

export interface QuickWeaponEntry {
  id: string;
  name: string;
  /** Referência de perícia/ataque: CpC, Dis, Amal, etc. */
  skillRef: string;
  /** Bônus adicional da arma (coluna B) */
  bonus: number;
  hit: CalculableNumber;
  damage: string;
  critical: string;
  damageType: string;
  range: string;
  properties: string;
}

export interface SkillTalentResourceEntry {
  id: string;
  name: string;
  current: number;
  max: number;
  cost: string;
}

export interface SpecializationAbilitySlot {
  id: string;
  slotLabel: string;
  category: 'fixed' | 'chosen';
  name: string;
  description: string;
}

export interface BindingVowEntry {
  id: string;
  nameAndEffect: string;
  vowCount: number;
}

export interface BindingVowsData {
  items: BindingVowEntry[];
  totalCount: CalculableNumber;
  current: number;
  max: CalculableNumber;
}

export interface ConditionsData {
  flags: Record<SimpleConditionKey, boolean>;
  bleeding: BleedingSeverity | null;
  freezing: FreezingSeverity | null;
  extraNotes: string;
}

// ============================================================================
// 6. PERFIL AMALDIÇOADO
// ============================================================================

export interface CursedAbilityEntry {
  id: string;
  name: string;
  level: number;
  peCost: CalculableNumber;
  actionType: string;
  range: string;
  duration: string;
  damageOrEffect: string;
  description: string;
  isExpanded?: boolean;
}

export interface AptitudeEntry {
  id: string;
  name: string;
  category: 'cursed' | 'aura' | 'control_reading' | 'barrier' | 'reverse_energy';
  level: number;
  peCost: CalculableNumber;
  prerequisite: string;
  description: string;
  acquired: boolean;
}

export interface BarrierData {
  barrierLevel: number;
  barrierHp: CalculableNumber;
  barrierHpCurrent: number;
  barrierDefense: CalculableNumber;
  areaOrRadius: string;
  notes: string;
}

export interface DomainExpansionData {
  unlocked: boolean;
  name: string;
  type: string;
  refinement: number;
  peCost: CalculableNumber;
  sureHitEffect: string;
  environmentEffect: string;
  description: string;
}

export interface PassiveAbilityEntry {
  id: string;
  name: string;
  source: string;
  effect: string;
  active: boolean;
}

export interface MaximumReleaseData {
  unlocked: boolean;
  name: string;
  peCost: CalculableNumber;
  damageOrEffect: string;
  description: string;
}

export interface CursedProfileData {
  techniqueName: string;
  techniqueDescription: string;
  techniqueCD: CalculableNumber;
  techniqueLevel: number;
  techniqueAttribute: AttributeKey;
  masteryLevel: CalculableNumber;
  knownAbilitiesCount: CalculableNumber;
  knownAbilitiesLimit: CalculableNumber;
  techniqueAbilities: CursedAbilityEntry[];
  cursedAptitudes: AptitudeEntry[];
  auraAptitudes: AptitudeEntry[];
  controlAndReading: AptitudeEntry[];
  reverseEnergyAptitudes: AptitudeEntry[];
  reverseEnergyNotes: string;
  barrier: BarrierData;
  domainExpansion: DomainExpansionData;
  passiveAbilities: PassiveAbilityEntry[];
  maximumRelease: MaximumReleaseData;
}

// ============================================================================
// 7. INVOCAÇÕES
// ============================================================================

export interface SummonAttackEntry {
  id: string;
  name: string;
  hitBonus: CalculableNumber;
  damage: string;
  critical: string;
  damageType: string;
  range: string;
  notes: string;
}

export interface SummonAbilityEntry {
  id: string;
  name: string;
  cost: string;
  actionType: string;
  description: string;
}

export interface SummonEntry {
  id: string;
  name: string;
  grade: string;
  summonType: string;
  isActive: boolean;
  summonCostPE: CalculableNumber;
  upkeepCostPE: number;
  level: CalculableNumber;
  hp: {
    current: CalculableNumber;
    max: CalculableNumber;
    temp: number;
    lost: number;
  };
  pe: {
    current: CalculableNumber;
    max: CalculableNumber;
  };
  defense: CalculableNumber;
  movement: CalculableNumber;
  initiative: CalculableNumber;
  attributes: Record<AttributeKey, { value: number; modifier: CalculableNumber }>;
  skills: ProficiencyRollEntry[];
  attacks: SummonAttackEntry[];
  abilities: SummonAbilityEntry[];
  damageReduction: CalculableNumber;
  resistances: string[];
  immunities: string[];
  notes: string;
}

// ============================================================================
// 8. REGISTRO E INVENTÁRIO
// ============================================================================

export type InventoryCategory =
  | 'item'
  | 'weapon'
  | 'armor'
  | 'shield'
  | 'equipment'
  | 'accessory'
  | 'consumable'
  | 'cursed_tool';

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  quantity: number;
  unitCost: number;
  totalCost: CalculableNumber;
  unitSpaces: number;
  totalSpaces: CalculableNumber;
  equipped: boolean;
  grade?: string;
  description: string;
}

export interface WeaponRecord {
  id: string;
  name: string;
  category: string;
  skillRef: string;
  bonus: number;
  hit: CalculableNumber;
  damage: string;
  critical: string;
  damageType: string;
  range: string;
  properties: string;
  spaces: number;
  cost: number;
  equipped: boolean;
  notes: string;
}

export interface ArmorRecord {
  id: string;
  name: string;
  defenseBonus: number;
  attributeCap: AttributeKey | 'N/A';
  maxAttributeBonus: number | null;
  penalty: number;
  spaces: number;
  cost: number;
  equipped: boolean;
  properties: string;
}

export interface ShieldRecord {
  id: string;
  name: string;
  defenseBonus: number;
  spaces: number;
  cost: number;
  equipped: boolean;
  properties: string;
}

export interface SpecialRecordEntry {
  id: string;
  name: string;
  kind: 'characteristic' | 'special_ability' | 'equipment_accessory';
  source: string;
  spaces: number;
  cost: number;
  equipped?: boolean;
  description: string;
}

export interface InventoryData {
  spaceLimit: CalculableNumber;
  spaceBonus: number;
  occupiedSpaces: CalculableNumber;
  totalInventoryValue: CalculableNumber;
  items: InventoryItem[];
  weapons: WeaponRecord[];
  armors: ArmorRecord[];
  shields: ShieldRecord[];
  specialCharacteristics: SpecialRecordEntry[];
  specialAbilities: SpecialRecordEntry[];
  equipmentAndAccessories: SpecialRecordEntry[];
}

// ============================================================================
// 9. TREINAMENTOS
// ============================================================================

export type TrainingCategory =
  | 'habilidade'
  | 'estudo'
  | 'criacao_item'
  | 'adaptacao'
  | 'revisao_tecnica'
  | 'outro';

export type TrainingStatus = 'disponivel' | 'em_andamento' | 'concluido';

export interface TrainingEntry {
  id: string;
  title: string;
  category: TrainingCategory;
  status: TrainingStatus;
  currentStage: number;
  totalStages: number;
  progressPercent: CalculableNumber;
  focusType: string;
  focusSpent: number;
  interludesSpent: number;
  benefit: string;
  requirements: string;
  notes: string;
}

export interface TechniqueRevisionEntry {
  id: string;
  targetAbilityOrAspect: string;
  status: TrainingStatus;
  stagesCompleted: number;
  totalStages: number;
  focusCost: number;
  changesSummary: string;
}

export interface InterludeLogEntry {
  id: string;
  dateLabel: string;
  interludeCount: number;
  focusUsed: number;
  activity: string;
  benefitGained: string;
}

export interface TrainingsData {
  availableFocusPerInterlude: CalculableNumber;
  totalFocusSpent: CalculableNumber;
  totalInterludesSpent: CalculableNumber;
  trainings: TrainingEntry[];
  techniqueRevisions: TechniqueRevisionEntry[];
  interludesLog: InterludeLogEntry[];
  generalNotes: string;
}

// ============================================================================
// 10. CARTEIRA E REGISTROS
// ============================================================================

export type WalletTransactionType = 'adicao' | 'retirada';

export interface WalletTransaction {
  id: string;
  date: string;
  type: WalletTransactionType;
  amount: number;
  category: string;
  description: string;
}

export interface MissionRecord {
  id: string;
  title: string;
  grade: string;
  status: 'em_andamento' | 'concluida' | 'falha';
  xpReward: number;
  moneyReward: number;
  notes: string;
}

export interface XPLogEntry {
  id: string;
  date: string;
  source: string;
  amount: number;
  notes: string;
}

export interface WalletData {
  xp: {
    total: CalculableNumber;
    spent: number;
    available: CalculableNumber;
    entries: XPLogEntry[];
  };
  finances: {
    currentBalance: CalculableNumber;
    totalAdditions: CalculableNumber;
    totalWithdrawals: CalculableNumber;
    currencyLabel: string;
    transactions: WalletTransaction[];
  };
  missions: MissionRecord[];
  interludesAvailable: number;
  interludesCompleted: number;
}

// ============================================================================
// 11. INTEGRAÇÃO OWLBEAR RODEO, PERMISSÕES E DOCUMENTO RAIZ DA FICHA
// ============================================================================

export interface CharacterPermissions {
  ownerPlayerId: string | null;
  ownerPlayerName: string;
  /** Lista de token IDs do Owlbear Rodeo vinculados a esta ficha */
  linkedTokenIds: string[];
  /** Bloqueia edição pelo jogador quando o mestre precisar travar a ficha */
  lockedByGM: boolean;
  /** Jogadores específicos autorizados a visualizar ou editar */
  sharedWithPlayerIds: string[];
}

export interface CharacterSheet {
  /** Versão do schema para migrações futuras seguras */
  schemaVersion: number;
  id: string;
  createdAt: string;
  updatedAt: string;
  permissions: CharacterPermissions;

  /** Aba 1: Ficha Pessoal */
  identity: IdentityData;
  attributes: AttributesMap;
  vitals: VitalsData;
  defense: DefenseData;
  skills: ProficiencyRollEntry[];
  savingThrows: ProficiencyRollEntry[];
  attacks: ProficiencyRollEntry[];
  derived: DerivedStatsData;
  damageMitigation: DamageMitigationData;
  quickWeapons: QuickWeaponEntry[];
  skillTalentsTable: SkillTalentResourceEntry[];
  specializationAbilities: SpecializationAbilitySlot[];
  characteristics: string[];
  talents: string[];
  originTraits: string[];
  masteries: string[];
  inlineTrainings: string[];
  notes: string;
  bindingVows: BindingVowsData;
  conditions: ConditionsData;

  /** Aba 2: Perfil Amaldiçoado */
  cursedProfile: CursedProfileData;

  /** Aba 3: Invocações */
  summons: SummonEntry[];

  /** Aba 4: Registro e Inventário */
  inventory: InventoryData;

  /** Aba 5: Treinamentos */
  trainings: TrainingsData;

  /** Aba 6: Carteira */
  wallet: WalletData;
}

/** Alias em português para a interface raiz da ficha de personagem */
export type FichaPersonagem = CharacterSheet;
