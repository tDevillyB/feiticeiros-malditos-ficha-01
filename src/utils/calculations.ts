import type {
  AttributeEntry,
  AttributeKey,
  AttributesMap,
  CalculableField,
  CalculableNumber,
  CharacterRecordData,
  CustomEquipmentEntry,
  DamageMitigationData,
  DamageTypeKey,
  DefenseData,
  DerivedStatsData,
  DifficultyClassData,
  FichaPersonagem,
  InventoryData,
  MasteryMode,
  ProficiencyRollEntry,
  QuickWeaponEntry,
  ReleaseTechniqueSlot,
  SharedCharacterSummary,
  ShikigamiActionEntry,
  SimpleConditionKey,
  SummonEntry,
  TrainingsData,
  VitalsData,
  WalletData,
} from '../types/character';

// ============================================================================
// 1. UTILITÁRIOS DE CAMPO CALCULÁVEL E SOBRESCRITA MANUAL
// ============================================================================

/**
 * Resolve o valor efetivo de um campo calculável.
 * Se `usarManual` estiver ativo e `sobrescritaManual` estiver definida,
 * retorna o valor manual; caso contrário, retorna `valorCalculado`.
 */
export function resolveCalculableValue<T>(field: CalculableField<T>): T {
  if (field.usarManual && field.sobrescritaManual !== undefined) {
    return field.sobrescritaManual;
  }
  return field.valorCalculado;
}

/**
 * Atualiza apenas `valorCalculado` em um campo calculável,
 * preservando integralmente `usarManual`, `sobrescritaManual` e `observacaoManual`.
 */
export function withComputedValue<T>(
  field: CalculableField<T>,
  valorCalculado: T
): CalculableField<T> {
  return {
    ...field,
    valorCalculado,
  };
}

/**
 * Cria um campo calculável padrão no modo automático.
 */
export function createCalculableField<T>(valorCalculado: T): CalculableField<T> {
  return {
    valorCalculado,
    usarManual: false,
  };
}

/**
 * Ativa a sobrescrita manual para um campo calculável sem perder o `valorCalculado`.
 */
export function enableManualOverride<T>(
  field: CalculableField<T>,
  sobrescritaManual: T,
  observacaoManual?: string
): CalculableField<T> {
  return {
    ...field,
    sobrescritaManual,
    usarManual: true,
    ...(observacaoManual !== undefined ? { observacaoManual } : {}),
  };
}

/**
 * Retorna um campo calculável ao cálculo automático, preservando `sobrescritaManual`
 * em histórico caso `clearStoredManual` seja falso.
 */
export function disableManualOverride<T>(
  field: CalculableField<T>,
  clearStoredManual = false
): CalculableField<T> {
  if (clearStoredManual) {
    return {
      valorCalculado: field.valorCalculado,
      usarManual: false,
    };
  }
  return {
    ...field,
    usarManual: false,
  };
}

// ============================================================================
// 2. CÁLCULOS DE PROGRESSÃO E ATRIBUTOS
// ============================================================================

/**
 * Calcula o nível total somando especialização e multiclasse.
 * Caso ambos sejam 0, assume nível mínimo 1.
 */
export function calculateTotalLevel(
  specializationLevel: number,
  multiclassLevel: number
): number {
  const total = Math.max(0, specializationLevel) + Math.max(0, multiclassLevel);
  return total > 0 ? total : 1;
}

/**
 * Calcula o bônus de treinamento a partir do nível (F&M 2.5):
 * Níveis 1–4: +2 | 5–8: +3 | 9–12: +4 | 13–16: +5 | 17–20: +6
 */
export function calculateTrainingBonus(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return Math.floor((safeLevel - 1) / 4) + 2;
}

/**
 * Calcula metade do nível arredondada para baixo (mínimo 0).
 */
export function calculateHalfLevel(level: number): number {
  return Math.floor(Math.max(0, level) / 2);
}

/**
 * Calcula o valor total de um atributo (`baseValue + bonusValue`).
 */
export function calculateAttributeValue(entry: AttributeEntry): number {
  return entry.baseValue + entry.bonusValue;
}

/**
 * Calcula o modificador (bônus) de um atributo: `Math.floor((valor - 10) / 2)`.
 */
export function calculateAttributeModifier(attributeValue: number): number {
  return Math.floor((attributeValue - 10) / 2);
}

/**
 * Recalcula todos os atributos da ficha respeitando `usarManual` e `sobrescritaManual`.
 */
export function recalculateAttributes(attributes: AttributesMap): AttributesMap {
  const keys = Object.keys(attributes) as AttributeKey[];
  const updated = { ...attributes };

  for (const key of keys) {
    const entry = attributes[key];
    const computedValue = calculateAttributeValue(entry);
    const nextValueField = withComputedValue(entry.value, computedValue);
    const effectiveValue = resolveCalculableValue(nextValueField);

    const computedModifier = calculateAttributeModifier(effectiveValue);
    const nextModifierField = withComputedValue(entry.modifier, computedModifier);

    updated[key] = {
      ...entry,
      value: nextValueField,
      modifier: nextModifierField,
    };
  }

  return updated;
}

/**
 * Obtém o modificador efetivo de um atributo da ficha.
 */
export function getEffectiveAttributeModifier(
  attributes: AttributesMap,
  key: AttributeKey | 'N/A'
): number {
  if (key === 'N/A') {
    return 0;
  }
  return resolveCalculableValue(attributes[key].modifier);
}

// ============================================================================
// 3. PERÍCIAS, SALVAGUARDAS E ATAQUES
// ============================================================================

/**
 * Calcula o total de uma perícia, salvaguarda ou ataque:
 * `Mod(Atributo) + MetadeDoNível + (Tr ? Treinamento : 0) + (Ms ? Treinamento : 0) + Outros`
 */
export function calculateProficiencyTotal(
  entry: ProficiencyRollEntry,
  attributes: AttributesMap,
  halfLevel: number,
  trainingBonus: number
): number {
  const attrMod = getEffectiveAttributeModifier(attributes, entry.attribute);
  const trainedBonus = entry.trained ? trainingBonus : 0;
  const masteredBonus = entry.mastered ? trainingBonus : 0;
  return attrMod + halfLevel + trainedBonus + masteredBonus + entry.other;
}

/**
 * Recalcula uma lista de perícias, salvaguardas ou ataques.
 */
export function recalculateProficiencyList(
  entries: ProficiencyRollEntry[],
  attributes: AttributesMap,
  halfLevel: number,
  trainingBonus: number
): ProficiencyRollEntry[] {
  return entries.map((entry) => ({
    ...entry,
    total: withComputedValue(
      entry.total,
      calculateProficiencyTotal(entry, attributes, halfLevel, trainingBonus)
    ),
  }));
}

// ============================================================================
// 4. DEFESA (CA)
// ============================================================================

/**
 * Recalcula a Defesa Total e cada componente de atributo da defesa:
 * `Base (10 + MetadeDoNível) + Soma(bônus do componente + contribuição do atributo)`
 */
export function recalculateDefense(
  defense: DefenseData,
  attributes: AttributesMap,
  halfLevel: number
): DefenseData {
  const baseComputed = 10 + halfLevel;
  const baseField = withComputedValue(defense.base, baseComputed);
  const effectiveBase = resolveCalculableValue(baseField);

  const updatedComponents = defense.components.map((component) => {
    const attrMod = getEffectiveAttributeModifier(attributes, component.attribute);
    return {
      ...component,
      attributeBonus: withComputedValue(component.attributeBonus, attrMod),
    };
  });

  const componentsSum = updatedComponents.reduce((sum, component) => {
    const effectiveAttr = resolveCalculableValue(component.attributeBonus);
    const sign = component.label.toLowerCase().includes('debuff') ? -Math.abs(component.bonus) : component.bonus;
    return sum + sign + effectiveAttr;
  }, 0);

  return {
    ...defense,
    base: baseField,
    components: updatedComponents,
    total: withComputedValue(defense.total, effectiveBase + componentsSum),
  };
}

// ============================================================================
// 5. RECURSOS VITAIS (PV, PE, ER, SANIDADE, INTEGRIDADE, DADOS DE VIDA)
// ============================================================================

function parseDieFaces(dieNotation: string): number {
  const match = /d(\d+)/i.exec(dieNotation);
  if (!match) {
    return 8;
  }
  const faces = Number.parseInt(match[1], 10);
  return Number.isFinite(faces) && faces > 0 ? faces : 8;
}

function calculatePercent(current: number, max: number): number {
  if (max <= 0) {
    return 0;
  }
  return Number(((current / max) * 100).toFixed(2));
}

/**
 * Calcula o máximo de Pontos de Vida baseado nos Dados de Vida possuídos (ou rolagens),
 * nível, CON e ajustes. Em uma ficha zerada (sem dados de vida nem rolagens/extras),
 * retorna 0 exatamente como no modelo vanilla.
 */
export function calculateMaxHitPoints(
  vitals: VitalsData,
  level: number,
  conModifier: number
): number {
  const safeLevel = Math.max(1, level);
  const activePool =
    vitals.hitDice.find((pool) => resolveCalculableValue(pool.owned) > 0) ??
    vitals.hitDice[0];
  const ownedDiceCount = vitals.hitDice.reduce(
    (sum, pool) => sum + resolveCalculableValue(pool.owned),
    0
  );

  if (
    ownedDiceCount === 0 &&
    vitals.hp.rolledPerLevel.length === 0 &&
    vitals.hp.other === 0 &&
    vitals.hp.permanentLoss === 0
  ) {
    return 0;
  }

  const dieFaces = parseDieFaces(activePool?.die ?? 'd8');
  const averagePerLevel = Math.floor(dieFaces / 2) + 1;

  let baseHp = 0;
  if (vitals.hp.method === 'roll' && vitals.hp.rolledPerLevel.length > 0) {
    const rolledSum = vitals.hp.rolledPerLevel
      .slice(0, safeLevel)
      .reduce((acc, val) => acc + val, 0);
    const remainingLevels = Math.max(0, safeLevel - vitals.hp.rolledPerLevel.length);
    baseHp = rolledSum + remainingLevels * averagePerLevel;
  } else if (ownedDiceCount > 0) {
    baseHp = dieFaces + Math.max(0, safeLevel - 1) * averagePerLevel;
  }

  const toughnessBonus =
    vitals.hp.flags.improvedToughness || vitals.hp.flags.robustez
      ? safeLevel
      : 0;
  const total =
    baseHp +
    (ownedDiceCount > 0 || vitals.hp.rolledPerLevel.length > 0
      ? safeLevel * conModifier
      : 0) +
    toughnessBonus +
    vitals.hp.other -
    vitals.hp.permanentLoss;

  return Math.max(0, total);
}

/**
 * Recalcula PV, PE, ER, Sanidade, Integridade e Dados de Vida.
 */
export function recalculateVitals(
  vitals: VitalsData,
  attributes: AttributesMap,
  level: number,
  specialization: string,
  _specializationLevel: number,
  _multiclassLevel: number
): VitalsData {
  const conMod = getEffectiveAttributeModifier(attributes, 'CON');

  // --- Dados de Vida (preserva valores editados pelo jogador e calcula Disponíveis) ---
  const updatedHitDice = vitals.hitDice.map((pool) => {
    const ownedField = withComputedValue(pool.owned, Math.max(0, pool.owned.valorCalculado));
    const effectiveOwned = resolveCalculableValue(ownedField);
    const availableComputed = Math.max(0, effectiveOwned - pool.used);
    return {
      ...pool,
      owned: ownedField,
      available: withComputedValue(pool.available, availableComputed),
    };
  });

  const vitalsWithDice = { ...vitals, hitDice: updatedHitDice };

  // --- Pontos de Vida ---
  const hpMaxComputed = calculateMaxHitPoints(vitalsWithDice, level, conMod);
  const hpMaxField = withComputedValue(vitals.hp.max, hpMaxComputed);
  const effectiveHpMax = resolveCalculableValue(hpMaxField);

  const hpCurrentComputed = Math.max(
    0,
    effectiveHpMax - vitals.hp.lost + vitals.hp.healed + vitals.hp.temp
  );
  const hpCurrentField = withComputedValue(vitals.hp.current, hpCurrentComputed);
  const effectiveHpCurrent = resolveCalculableValue(hpCurrentField);

  const hpPercentField = withComputedValue(
    vitals.hp.percentage,
    calculatePercent(effectiveHpCurrent, effectiveHpMax)
  );

  // --- Energia Amaldiçoada (PE) ---
  const hasSpecializationOrEnergyConfig =
    specialization.trim() !== '' ||
    vitals.pe.attribute !== 'N/A' ||
    vitals.pe.other !== 0 ||
    vitals.pe.permanentLoss !== 0;

  const peAttrMod = getEffectiveAttributeModifier(attributes, vitals.pe.attribute);
  const peMaxComputed = hasSpecializationOrEnergyConfig
    ? Math.max(
        0,
        4 * Math.max(1, level) + peAttrMod + vitals.pe.other - vitals.pe.permanentLoss
      )
    : 0;
  const peMaxField = withComputedValue(vitals.pe.max, peMaxComputed);
  const effectivePeMax = resolveCalculableValue(peMaxField);

  const peCurrentComputed = Math.max(
    0,
    effectivePeMax - vitals.pe.lost + vitals.pe.healed + vitals.pe.temp
  );
  const peCurrentField = withComputedValue(vitals.pe.current, peCurrentComputed);
  const effectivePeCurrent = resolveCalculableValue(peCurrentField);

  const pePercentField = withComputedValue(
    vitals.pe.percentage,
    calculatePercent(effectivePeCurrent, effectivePeMax)
  );

  // --- Energia Reversa (ER) ---
  const erMaxComputed = Math.max(0, Math.floor(effectivePeMax / 2));
  const erMaxField = withComputedValue(vitals.er.max, erMaxComputed);
  const effectiveErMax = resolveCalculableValue(erMaxField);

  const erCurrentComputed = Math.max(0, effectiveErMax - vitals.er.lost);
  const erCurrentField = withComputedValue(vitals.er.current, erCurrentComputed);
  const effectiveErCurrent = resolveCalculableValue(erCurrentField);

  const erPercentField = withComputedValue(
    vitals.er.percentage,
    calculatePercent(effectiveErCurrent, effectiveErMax)
  );

  // --- Sanidade ---
  const sanityMaxBase = Math.max(0, vitals.sanity.max.valorCalculado);
  const sanityMaxField = withComputedValue(vitals.sanity.max, sanityMaxBase);
  const effectiveSanityMax = resolveCalculableValue(sanityMaxField);

  const sanityCurrentComputed = Math.max(
    0,
    effectiveSanityMax - vitals.sanity.lost + vitals.sanity.recovered + vitals.sanity.add
  );
  const sanityCurrentField = withComputedValue(vitals.sanity.current, sanityCurrentComputed);
  const effectiveSanityCurrent = resolveCalculableValue(sanityCurrentField);

  const sanityPercentField = withComputedValue(
    vitals.sanity.percentage,
    calculatePercent(effectiveSanityCurrent, effectiveSanityMax)
  );

  // --- Integridade (alinhada ao PV máximo da ficha) ---
  const integrityMaxField = withComputedValue(vitals.integrity.max, effectiveHpMax);
  const effectiveIntegrityMax = resolveCalculableValue(integrityMaxField);

  const integrityCurrentComputed = Math.max(
    0,
    effectiveIntegrityMax -
      vitals.integrity.lost +
      vitals.integrity.recovered +
      vitals.integrity.add
  );
  const integrityCurrentField = withComputedValue(
    vitals.integrity.current,
    integrityCurrentComputed
  );
  const effectiveIntegrityCurrent = resolveCalculableValue(integrityCurrentField);

  const integrityPercentField = withComputedValue(
    vitals.integrity.percentage,
    calculatePercent(effectiveIntegrityCurrent, effectiveIntegrityMax)
  );

  return {
    ...vitals,
    hp: {
      ...vitals.hp,
      max: hpMaxField,
      current: hpCurrentField,
      percentage: hpPercentField,
    },
    pe: {
      ...vitals.pe,
      max: peMaxField,
      current: peCurrentField,
      percentage: pePercentField,
    },
    er: {
      ...vitals.er,
      max: erMaxField,
      current: erCurrentField,
      percentage: erPercentField,
    },
    sanity: {
      ...vitals.sanity,
      max: sanityMaxField,
      current: sanityCurrentField,
      percentage: sanityPercentField,
    },
    integrity: {
      ...vitals.integrity,
      max: integrityMaxField,
      current: integrityCurrentField,
      percentage: integrityPercentField,
    },
    hitDice: updatedHitDice,
  };
}

// ============================================================================
// 6. DERIVADOS, CDS, REDUÇÃO DE DANO, ARMAS E VOTOS
// ============================================================================

export function calculateDifficultyClass(
  cd: DifficultyClassData,
  attributes: AttributesMap,
  halfLevel: number,
  trainingBonus: number
): DifficultyClassData {
  const levelBonusField = withComputedValue(cd.levelBonus, halfLevel);
  const effectiveLevelBonus = resolveCalculableValue(levelBonusField);
  const attrMod = getEffectiveAttributeModifier(attributes, cd.attribute);
  const masteryBonus =
    cd.masteryMode === ('Inteira' satisfies MasteryMode)
      ? trainingBonus
      : Math.floor(trainingBonus / 2);

  const totalComputed = 10 + effectiveLevelBonus + attrMod + masteryBonus + cd.other;

  return {
    ...cd,
    levelBonus: levelBonusField,
    total: withComputedValue(cd.total, totalComputed),
  };
}

export function recalculateDerivedStats(
  derived: DerivedStatsData,
  attributes: AttributesMap,
  skills: ProficiencyRollEntry[],
  halfLevel: number,
  trainingBonus: number
): DerivedStatsData {
  const perceptionEntry = skills.find(
    (s) => s.id === 'percepcao' || s.name.toLowerCase() === 'percepção'
  );
  const perceptionTotal = perceptionEntry ? resolveCalculableValue(perceptionEntry.total) : 0;
  const dexMod = getEffectiveAttributeModifier(attributes, 'DEX');

  const attentionComputed =
    10 + perceptionTotal + derived.attention.add - derived.attention.removed;
  const initiativeComputed =
    dexMod + derived.initiative.add - derived.initiative.removed;
  const movementComputed = Math.max(
    0,
    9 + derived.movement.add - derived.movement.removed
  );

  const cdSpecialization = calculateDifficultyClass(
    derived.cdSpecialization,
    attributes,
    halfLevel,
    trainingBonus
  );
  const cdCursed = calculateDifficultyClass(
    derived.cdCursed,
    attributes,
    halfLevel,
    trainingBonus
  );

  return {
    ...derived,
    attention: {
      ...derived.attention,
      total: withComputedValue(derived.attention.total, attentionComputed),
    },
    initiative: {
      ...derived.initiative,
      total: withComputedValue(derived.initiative.total, initiativeComputed),
    },
    movement: {
      ...derived.movement,
      total: withComputedValue(derived.movement.total, movementComputed),
    },
    cdSpecialization,
    cdCursed,
    energyLimit: withComputedValue(derived.energyLimit, trainingBonus),
  };
}

export function recalculateDamageMitigation(
  mitigation: DamageMitigationData
): DamageMitigationData {
  const types = Object.keys(mitigation.byType) as DamageTypeKey[];
  const updatedByType = { ...mitigation.byType };

  for (const type of types) {
    const entry = mitigation.byType[type];
    const baseGeneral = type === 'Dano na alma' ? 0 : mitigation.generalRD;
    const totalComputed = baseGeneral + entry.amount;
    updatedByType[type] = {
      ...entry,
      total: withComputedValue(entry.total, totalComputed),
    };
  }

  return {
    ...mitigation,
    byType: updatedByType,
  };
}

/**
 * Resolve o bônus base de uma perícia ou ataque a partir da sigla usada no Registro Rápido
 * (`CpC`, `Dis`, `Amal` ou nome da perícia).
 */
export function resolveAttackOrSkillBonus(
  ref: string,
  attacks: ProficiencyRollEntry[],
  skills: ProficiencyRollEntry[]
): number {
  const normalized = ref.trim().toLowerCase();
  if (!normalized || normalized === 'n/a') {
    return 0;
  }

  const aliasMap: Record<string, string> = {
    cpc: 'corpo a corpo',
    dis: 'distância',
    dist: 'distância',
    amal: 'amaldiçoado',
  };

  const targetName = aliasMap[normalized] ?? normalized;
  const attackMatch = attacks.find((a) => a.name.toLowerCase() === targetName);
  if (attackMatch) {
    return resolveCalculableValue(attackMatch.total);
  }

  const skillMatch = skills.find((s) => s.name.toLowerCase() === targetName);
  if (skillMatch) {
    return resolveCalculableValue(skillMatch.total);
  }

  return 0;
}

export function recalculateQuickWeapons(
  weapons: QuickWeaponEntry[],
  attacks: ProficiencyRollEntry[],
  skills: ProficiencyRollEntry[]
): QuickWeaponEntry[] {
  return weapons.map((weapon) => {
    const baseRoll = resolveAttackOrSkillBonus(weapon.skillRef, attacks, skills);
    const hitComputed = baseRoll + weapon.bonus;
    return {
      ...weapon,
      hit: withComputedValue(weapon.hit, hitComputed),
    };
  });
}

// ============================================================================
// 7. INVENTÁRIO, TREINAMENTOS, CARTEIRA E INVOCAÇÕES
// ============================================================================

export function recalculateInventory(
  inventory: InventoryData,
  attributes: AttributesMap,
  attacks: ProficiencyRollEntry[],
  skills: ProficiencyRollEntry[]
): InventoryData {
  const forMod = getEffectiveAttributeModifier(attributes, 'FOR');
  const weightBonus = inventory.weightBonus ?? inventory.spaceBonus ?? 0;
  const weightLimitComputed = Math.max(0, 10 + forMod * 2 + weightBonus);
  const baseLimitField = inventory.weightLimit ?? inventory.spaceLimit;
  const nextWeightLimit = withComputedValue(baseLimitField, weightLimitComputed);

  const updatedItems = inventory.items.map((item) => {
    const unitWeight = item.unitWeight ?? item.unitSpaces ?? 0;
    const totalCostComputed = Number((item.quantity * item.unitCost).toFixed(2));
    const totalWeightComputed = Number((item.quantity * unitWeight).toFixed(2));
    const baseWeightField =
      item.totalWeight ?? item.totalSpaces ?? createCalculableField(0);
    const nextTotalWeight = withComputedValue(baseWeightField, totalWeightComputed);
    return {
      ...item,
      unitWeight,
      unitSpaces: unitWeight,
      totalCost: withComputedValue(item.totalCost, totalCostComputed),
      totalWeight: nextTotalWeight,
      totalSpaces: nextTotalWeight,
    };
  });

  const updatedWeapons = inventory.weapons.map((weapon) => {
    const baseRoll = resolveAttackOrSkillBonus(weapon.skillRef, attacks, skills);
    return {
      ...weapon,
      hit: withComputedValue(weapon.hit, baseRoll + weapon.bonus),
    };
  });

  const itemsWeight = updatedItems.reduce(
    (sum, item) =>
      sum + resolveCalculableValue(item.totalWeight ?? item.totalSpaces),
    0
  );

  const hasCustomEquipments = Array.isArray(inventory.equipments);
  const equipmentsWeight = hasCustomEquipments
    ? (inventory.equipments ?? []).reduce(
        (sum, eq) => sum + (Number(eq.weight) || 0),
        0
      )
    : updatedWeapons.reduce((sum, w) => sum + w.spaces, 0) +
      inventory.armors.reduce((sum, a) => sum + a.spaces, 0) +
      inventory.shields.reduce((sum, s) => sum + s.spaces, 0) +
      inventory.equipmentAndAccessories.reduce((sum, e) => sum + e.spaces, 0);

  const currentWeightComputed = Number((itemsWeight + equipmentsWeight).toFixed(2));
  const baseCurrentWeightField =
    inventory.currentWeight ?? inventory.occupiedSpaces;
  const nextCurrentWeight = withComputedValue(
    baseCurrentWeightField,
    currentWeightComputed
  );

  const itemsCost = updatedItems.reduce(
    (sum, item) => sum + resolveCalculableValue(item.totalCost),
    0
  );
  const equipmentsCost = hasCustomEquipments
    ? (inventory.equipments ?? []).reduce(
        (sum, eq) => sum + (Number(eq.cost) || 0),
        0
      )
    : updatedWeapons.reduce((sum, w) => sum + w.cost, 0) +
      inventory.armors.reduce((sum, a) => sum + a.cost, 0) +
      inventory.shields.reduce((sum, s) => sum + s.cost, 0) +
      inventory.equipmentAndAccessories.reduce((sum, s) => sum + s.cost, 0);

  const specialNonEquipmentCost =
    inventory.specialCharacteristics.reduce((sum, s) => sum + s.cost, 0) +
    inventory.specialAbilities.reduce((sum, s) => sum + s.cost, 0);

  return {
    ...inventory,
    weightBonus,
    spaceBonus: weightBonus,
    weightLimit: nextWeightLimit,
    spaceLimit: nextWeightLimit,
    currentWeight: nextCurrentWeight,
    occupiedSpaces: nextCurrentWeight,
    totalInventoryValue: withComputedValue(
      inventory.totalInventoryValue,
      Number((itemsCost + equipmentsCost + specialNonEquipmentCost).toFixed(2))
    ),
    items: updatedItems,
    weapons: updatedWeapons,
  };
}

export function recalculateTrainings(trainings: TrainingsData): TrainingsData {
  const updatedEntries = trainings.trainings.map((entry) => {
    const percent =
      entry.totalStages > 0
        ? Math.min(100, Number(((entry.currentStage / entry.totalStages) * 100).toFixed(2)))
        : 0;
    return {
      ...entry,
      progressPercent: withComputedValue(entry.progressPercent, percent),
    };
  });

  const focusFromTrainings = updatedEntries.reduce((sum, e) => sum + e.focusSpent, 0);
  const focusFromRevisions = trainings.techniqueRevisions.reduce(
    (sum, r) => sum + r.focusCost,
    0
  );
  const interludesFromTrainings = updatedEntries.reduce(
    (sum, e) => sum + e.interludesSpent,
    0
  );

  return {
    ...trainings,
    trainings: updatedEntries,
    totalFocusSpent: withComputedValue(
      trainings.totalFocusSpent,
      focusFromTrainings + focusFromRevisions
    ),
    totalInterludesSpent: withComputedValue(
      trainings.totalInterludesSpent,
      interludesFromTrainings
    ),
  };
}

export function recalculateWallet(wallet: WalletData): WalletData {
  const xpTotalComputed = wallet.xp.entries.reduce((sum, e) => sum + e.amount, 0);
  const xpTotalField = withComputedValue(wallet.xp.total, xpTotalComputed);
  const effectiveXpTotal = resolveCalculableValue(xpTotalField);
  const xpAvailableComputed = Math.max(0, effectiveXpTotal - wallet.xp.spent);

  const additions = wallet.finances.transactions
    .filter((t) => t.type === 'adicao')
    .reduce((sum, t) => sum + t.amount, 0);
  const withdrawals = wallet.finances.transactions
    .filter((t) => t.type === 'retirada')
    .reduce((sum, t) => sum + t.amount, 0);

  const additionsField = withComputedValue(wallet.finances.totalAdditions, additions);
  const withdrawalsField = withComputedValue(wallet.finances.totalWithdrawals, withdrawals);

  const effectiveAdditions = resolveCalculableValue(additionsField);
  const effectiveWithdrawals = resolveCalculableValue(withdrawalsField);

  return {
    ...wallet,
    xp: {
      ...wallet.xp,
      total: xpTotalField,
      available: withComputedValue(wallet.xp.available, xpAvailableComputed),
    },
    finances: {
      ...wallet.finances,
      totalAdditions: additionsField,
      totalWithdrawals: withdrawalsField,
      currentBalance: withComputedValue(
        wallet.finances.currentBalance,
        effectiveAdditions - effectiveWithdrawals
      ),
    },
  };
}

export function recalculateSummon(
  summon: SummonEntry,
  summonerTrainingBonus: number
): SummonEntry {
  const level = resolveCalculableValue(summon.level);
  const halfLevel = calculateHalfLevel(level);

  const updatedAttributes = { ...summon.attributes };
  const keys = Object.keys(summon.attributes) as AttributeKey[];
  for (const key of keys) {
    const attr = summon.attributes[key];
    updatedAttributes[key] = {
      ...attr,
      modifier: withComputedValue(
        attr.modifier,
        calculateAttributeModifier(attr.value)
      ),
    };
  }

  const updatedSkills = summon.skills.map((skill) => {
    const mod = resolveCalculableValue(updatedAttributes[skill.attribute].modifier);
    const total =
      mod +
      halfLevel +
      (skill.trained ? summonerTrainingBonus : 0) +
      (skill.mastered ? summonerTrainingBonus : 0) +
      skill.other;
    return {
      ...skill,
      total: withComputedValue(skill.total, total),
    };
  });

  const hpMax = resolveCalculableValue(summon.hp.max);
  const hpCurrentComputed = Math.max(0, hpMax - summon.hp.lost + summon.hp.temp);

  const dexMod = resolveCalculableValue(updatedAttributes.DEX.modifier);

  const { pe: _legacyPe, ...summonWithoutPe } = summon;
  void _legacyPe;

  return {
    ...summonWithoutPe,
    attributes: updatedAttributes,
    skills: updatedSkills,
    hp: {
      ...summon.hp,
      current: withComputedValue(summon.hp.current, hpCurrentComputed),
    },
    damageReduction: summon.damageReduction ?? createCalculableField(0),
    initiative: withComputedValue(summon.initiative, dexMod),
  };
}

/**
 * Migra de forma não destrutiva dados legados (Maldições Controladas, ataques/habilidades
 * antigas de invocações, Liberação Máxima única, armas/armaduras/escudos antigos e Registro)
 * para as novas estruturas unificadas sem apagar ou sobrescrever conteúdo existente.
 */
export function migrateLegacySheetFields(sheet: FichaPersonagem): FichaPersonagem {
  // 1. Registro do Personagem
  const rec: Partial<CharacterRecordData> = sheet.characterRecord ?? {};
  const characterRecord: CharacterRecordData = {
    age: rec.age ?? '',
    height: rec.height ?? '',
    weight: rec.weight ?? '',
    gender: rec.gender ?? '',
    hair: rec.hair ?? '',
    eyes: rec.eyes ?? '',
    traits: rec.traits ?? '',
    personality: rec.personality ?? '',
    ideals: rec.ideals ?? '',
    history: rec.history ?? '',
  };

  // 2. Perfil Amaldiçoado: Aptidões de Barreira + 4 slots fixos de Liberação
  const existingSlots = sheet.cursedProfile.releaseSlots;
  const maxRel = sheet.cursedProfile.maximumRelease;
  const hasLegacyMaxRel = Boolean(
    maxRel &&
      (maxRel.unlocked ||
        maxRel.name.trim() ||
        maxRel.damageOrEffect.trim() ||
        maxRel.description.trim() ||
        resolveCalculableValue(maxRel.peCost) > 0)
  );

  const releaseSlots: ReleaseTechniqueSlot[] = ([1, 2, 3, 4] as const).map(
    (slotNumber) => {
      const found = existingSlots?.find((s) => s.slotNumber === slotNumber);
      if (found) {
        return {
          ...found,
          slotNumber,
          peCost: found.peCost ?? createCalculableField(0),
          actionType: found.actionType ?? '',
          range: found.range ?? '',
          duration: found.duration ?? '',
          damageOrEffect: found.damageOrEffect ?? '',
          description: found.description ?? '',
        };
      }
      if (!existingSlots && slotNumber === 1 && hasLegacyMaxRel) {
        return {
          id: 'release-slot-1',
          slotNumber: 1,
          unlocked: Boolean(maxRel.unlocked),
          name: maxRel.name ?? '',
          peCost: maxRel.peCost ?? createCalculableField(0),
          actionType: '',
          range: '',
          duration: '',
          damageOrEffect: maxRel.damageOrEffect ?? '',
          description: maxRel.description ?? '',
        };
      }
      return {
        id: `release-slot-${slotNumber}`,
        slotNumber,
        unlocked: false,
        name: '',
        peCost: createCalculableField(0),
        actionType: '',
        range: '',
        duration: '',
        damageOrEffect: '',
        description: '',
      };
    }
  );

  // 3. Shikigamis unificados (migra ataques/habilidades legados -> ações, e controlledCurses -> summons)
  const migrateSummonActions = (s: SummonEntry): SummonEntry => {
    const hasActionsField = Array.isArray(s.actions);
    let actions: ShikigamiActionEntry[] = hasActionsField ? [...(s.actions ?? [])] : [];

    if (!hasActionsField) {
      for (const atk of s.attacks ?? []) {
        const hitVal = resolveCalculableValue(atk.hitBonus);
        actions.push({
          id: atk.id || `act-atk-${Date.now()}-${Math.random()}`,
          name: atk.name || 'Ação',
          complexity: 'simples',
          actionType: 'Ação Padrão',
          hitBonus: hitVal ? `${hitVal >= 0 ? `+${hitVal}` : hitVal}` : '',
          damage: atk.damage ?? '',
          critical: atk.critical ?? '',
          damageType: atk.damageType ?? '',
          range: atk.range ?? '',
          effects: '',
          description: atk.notes ?? '',
        });
      }
      for (const ab of s.abilities ?? []) {
        actions.push({
          id: ab.id || `act-ab-${Date.now()}-${Math.random()}`,
          name: ab.name || 'Ação',
          complexity: 'complexa',
          actionType: ab.actionType || 'Ação Padrão',
          hitBonus: '',
          damage: '',
          critical: '',
          damageType: '',
          range: '',
          effects: ab.cost ?? '',
          description: ab.description ?? '',
        });
      }
    }

    const { pe: _ignoredPe, ...rest } = s;
    void _ignoredPe;
    return {
      ...rest,
      summonType: s.summonType || 'Shikigami',
      damageReduction: s.damageReduction ?? createCalculableField(0),
      actions,
      characteristics: s.characteristics ?? [],
      conditions: s.conditions ?? [],
      resistances: s.resistances ?? [],
      immunities: s.immunities ?? [],
    };
  };

  const migratedSummons: SummonEntry[] = (sheet.summons ?? []).map(migrateSummonActions);
  const existingIds = new Set(migratedSummons.map((s) => s.id));

  for (const curse of sheet.controlledCurses ?? []) {
    if (existingIds.has(curse.id)) continue;
    const actions: ShikigamiActionEntry[] = [
      ...curse.attacks.map((atk) => ({
        id: atk.id,
        name: atk.name,
        complexity: 'simples' as const,
        actionType: 'Ação Padrão',
        hitBonus: atk.hit ?? '',
        damage: atk.damage ?? '',
        critical: '',
        damageType: atk.damageType ?? '',
        range: atk.range ?? '',
        effects: '',
        description: '',
      })),
      ...curse.abilities.map((ab) => ({
        id: ab.id,
        name: ab.name,
        complexity: 'complexa' as const,
        actionType: 'Ação Padrão',
        hitBonus: '',
        damage: '',
        critical: '',
        damageType: '',
        range: '',
        effects: ab.cost ?? '',
        description: ab.description ?? '',
      })),
    ];

    const attrValues = curse.attributes ?? {};
    const makeAttr = (k: AttributeKey) => {
      const value = attrValues[k] ?? 10;
      return {
        value,
        modifier: createCalculableField(calculateAttributeModifier(value)),
      };
    };

    migratedSummons.push({
      id: curse.id,
      name: curse.name || 'Shikigami',
      imageUrl: curse.imageUrl,
      grade: curse.grade ?? '',
      summonType: curse.category || 'Shikigami',
      isActive: curse.isActive,
      summonCostPE: createCalculableField(0),
      upkeepCostPE: 0,
      level: createCalculableField(1),
      hp: {
        current: createCalculableField(curse.hp.current),
        max: createCalculableField(curse.hp.max),
        temp: 0,
        lost: Math.max(0, curse.hp.max - curse.hp.current),
      },
      defense: createCalculableField(curse.defense ?? 10),
      movement: createCalculableField(curse.movement ?? 9),
      initiative: createCalculableField(
        calculateAttributeModifier(attrValues.DEX ?? 10)
      ),
      attributes: {
        FOR: makeAttr('FOR'),
        DEX: makeAttr('DEX'),
        CON: makeAttr('CON'),
        INT: makeAttr('INT'),
        SAB: makeAttr('SAB'),
        PRE: makeAttr('PRE'),
      },
      skills: [],
      actions,
      characteristics: [],
      attacks: [],
      abilities: [],
      damageReduction: createCalculableField(0),
      resistances: [],
      immunities: [],
      conditions: curse.conditions ?? [],
      notes: curse.notes ?? '',
    });
  }

  // 4. Inventário: peso + migração de equipamentos legados para `equipments`
  const inv = sheet.inventory;
  let equipments: CustomEquipmentEntry[] | undefined = inv.equipments;
  if (!Array.isArray(equipments)) {
    equipments = [
      ...(inv.weapons ?? []).map(
        (w): CustomEquipmentEntry => ({
          id: w.id,
          name: w.name,
          category: 'arma',
          subType: w.category || 'Arma',
          grade: '',
          equipped: w.equipped,
          weight: w.spaces ?? 0,
          cost: w.cost ?? 0,
          damage: w.damage ?? '',
          critical: w.critical ?? '',
          range: w.range ?? '',
          weaponType: w.damageType ?? '',
          bonus: w.bonus ? `${w.bonus >= 0 ? `+${w.bonus}` : w.bonus}` : '',
          properties: w.properties ?? '',
          enchantments: [],
          description: w.notes ?? '',
        })
      ),
      ...(inv.armors ?? []).map(
        (a): CustomEquipmentEntry => ({
          id: a.id,
          name: a.name,
          category: 'armadura',
          subType: 'Armadura',
          grade: '',
          equipped: a.equipped,
          weight: a.spaces ?? 0,
          cost: a.cost ?? 0,
          defense: a.defenseBonus ? `+${a.defenseBonus}` : '',
          defensiveBonus: '',
          rd: '',
          resistances: '',
          bonus: '',
          properties: a.properties ?? '',
          enchantments: [],
          description: '',
        })
      ),
      ...(inv.shields ?? []).map(
        (s): CustomEquipmentEntry => ({
          id: s.id,
          name: s.name,
          category: 'escudo',
          subType: 'Escudo',
          grade: '',
          equipped: s.equipped,
          weight: s.spaces ?? 0,
          cost: s.cost ?? 0,
          defense: s.defenseBonus ? `+${s.defenseBonus}` : '',
          defensiveBonus: '',
          rd: '',
          resistances: '',
          bonus: '',
          properties: s.properties ?? '',
          enchantments: [],
          description: '',
        })
      ),
      ...(inv.equipmentAndAccessories ?? []).map(
        (e): CustomEquipmentEntry => ({
          id: e.id,
          name: e.name,
          category: 'equipamento_especial',
          subType: e.source || 'Equipamento',
          grade: '',
          equipped: Boolean(e.equipped),
          weight: e.spaces ?? 0,
          cost: e.cost ?? 0,
          effects: '',
          bonus: '',
          properties: '',
          enchantments: [],
          description: e.description ?? '',
        })
      ),
    ];
  }

  let migratedVitals = sheet.vitals;
  if (migratedVitals.hp.current.usarManual) {
    const hpMaxEffective = resolveCalculableValue(migratedVitals.hp.max);
    const targetHp = Math.max(0, resolveCalculableValue(migratedVitals.hp.current));
    const baseWithTemp = hpMaxEffective + migratedVitals.hp.temp;
    migratedVitals = {
      ...migratedVitals,
      hp: {
        ...migratedVitals.hp,
        lost: targetHp < baseWithTemp ? baseWithTemp - targetHp : 0,
        healed: targetHp > baseWithTemp ? targetHp - baseWithTemp : 0,
        current: disableManualOverride(migratedVitals.hp.current, true),
      },
    };
  }
  if (migratedVitals.pe.current.usarManual) {
    const peMaxEffective = resolveCalculableValue(migratedVitals.pe.max);
    const targetPe = Math.max(0, resolveCalculableValue(migratedVitals.pe.current));
    const baseWithTemp = peMaxEffective + migratedVitals.pe.temp;
    migratedVitals = {
      ...migratedVitals,
      pe: {
        ...migratedVitals.pe,
        lost: targetPe < baseWithTemp ? baseWithTemp - targetPe : 0,
        healed: targetPe > baseWithTemp ? targetPe - baseWithTemp : 0,
        current: disableManualOverride(migratedVitals.pe.current, true),
      },
    };
  }

  return {
    ...sheet,
    vitals: migratedVitals,
    characterRecord,
    cursedProfile: {
      ...sheet.cursedProfile,
      barrierAptitudes: sheet.cursedProfile.barrierAptitudes ?? [],
      releaseSlots,
    },
    summons: migratedSummons,
    controlledCurses: [],
    inventory: {
      ...inv,
      weightBonus: inv.weightBonus ?? inv.spaceBonus ?? 0,
      weightLimit: inv.weightLimit ?? inv.spaceLimit,
      currentWeight: inv.currentWeight ?? inv.occupiedSpaces,
      equipments,
    },
  };
}

// ============================================================================
// 8. ORQUESTRADOR PRINCIPAL DE RECÁLCULO DA FICHA
// ============================================================================

/**
 * Recalcula integralmente todos os campos derivados da `FichaPersonagem`
 * em ordem de dependência, sem jamais apagar ou ignorar `usarManual`/`sobrescritaManual`.
 */
export function recalculateCharacterSheet(sheet: FichaPersonagem): FichaPersonagem {
  // 1. Nível, Treinamento e Experiência
  const totalLevelComputed = calculateTotalLevel(
    sheet.identity.specializationLevel,
    sheet.identity.multiclassLevel
  );
  const levelField = withComputedValue(sheet.identity.level, totalLevelComputed);
  const effectiveLevel = resolveCalculableValue(levelField);

  const trainingComputed = calculateTrainingBonus(effectiveLevel);
  const trainingField = withComputedValue(sheet.identity.trainingBonus, trainingComputed);
  const effectiveTraining = resolveCalculableValue(trainingField);
  const halfLevel = calculateHalfLevel(effectiveLevel);

  // 2. Carteira (alimenta XP total da identidade)
  const wallet = recalculateWallet(sheet.wallet);
  const experienceField: CalculableNumber = withComputedValue(
    sheet.identity.experience,
    resolveCalculableValue(wallet.xp.total)
  );

  // 3. Atributos
  const attributes = recalculateAttributes(sheet.attributes);

  // 4. Perícias, Salvaguardas e Ataques
  const skills = recalculateProficiencyList(
    sheet.skills,
    attributes,
    halfLevel,
    effectiveTraining
  );
  const savingThrows = recalculateProficiencyList(
    sheet.savingThrows,
    attributes,
    halfLevel,
    effectiveTraining
  );
  const attacks = recalculateProficiencyList(
    sheet.attacks,
    attributes,
    halfLevel,
    effectiveTraining
  );

  // 5. Recursos Vitais e Defesa
  const vitals = recalculateVitals(
    sheet.vitals,
    attributes,
    effectiveLevel,
    sheet.identity.specialization,
    sheet.identity.specializationLevel,
    sheet.identity.multiclassLevel
  );
  const defense = recalculateDefense(sheet.defense, attributes, halfLevel);

  // 6. Derivados, CDs, Reduções de Dano, Armas Rápidas e Votos
  const derived = recalculateDerivedStats(
    sheet.derived,
    attributes,
    skills,
    halfLevel,
    effectiveTraining
  );
  const damageMitigation = recalculateDamageMitigation(sheet.damageMitigation);
  const quickWeapons = recalculateQuickWeapons(sheet.quickWeapons, attacks, skills);

  const totalVowsComputed = sheet.bindingVows.items.reduce(
    (sum, item) => sum + item.vowCount,
    0
  );
  const bindingVows = {
    ...sheet.bindingVows,
    totalCount: withComputedValue(sheet.bindingVows.totalCount, totalVowsComputed),
  };

  // 7. Perfil Amaldiçoado (sincroniza CD da técnica com atributo + treinamento)
  const techAttrMod = getEffectiveAttributeModifier(
    attributes,
    sheet.cursedProfile.techniqueAttribute
  );
  const techniqueCDComputed = 10 + halfLevel + techAttrMod + effectiveTraining;
  const cursedProfile = {
    ...sheet.cursedProfile,
    techniqueCD: withComputedValue(sheet.cursedProfile.techniqueCD, techniqueCDComputed),
    knownAbilitiesCount: withComputedValue(
      sheet.cursedProfile.knownAbilitiesCount,
      sheet.cursedProfile.techniqueAbilities.length
    ),
  };

  // 8. Inventário, Treinamentos e Invocações
  const inventory = recalculateInventory(sheet.inventory, attributes, attacks, skills);
  const trainings = recalculateTrainings(sheet.trainings);
  const summons = sheet.summons.map((summon) =>
    recalculateSummon(summon, effectiveTraining)
  );

  return {
    ...sheet,
    identity: {
      ...sheet.identity,
      level: levelField,
      trainingBonus: trainingField,
      experience: experienceField,
    },
    attributes,
    vitals,
    defense,
    skills,
    savingThrows,
    attacks,
    derived,
    damageMitigation,
    quickWeapons,
    bindingVows,
    cursedProfile,
    inventory,
    trainings,
    wallet,
    summons,
  };
}

// ============================================================================
// 9. UTILITÁRIOS DE COMBATE, CONTROLE DE MALDIÇÕES E SINCRONIZAÇÃO OBR
// ============================================================================

const CURSE_CONTROL_KEYWORDS = [
  'controlador',
  'domador de maldições',
  'domador de maldicoes',
  'controle de maldições',
  'controle de maldicoes',
  'manipulação de maldições',
  'manipulacao de maldicoes',
];

/**
 * Identifica de forma segura se o personagem possui acesso ao Controle de Maldições
 * a partir da especialização, multiclasse, habilidades, características, técnica
 * ou habilitação explícita na ficha.
 */
export function hasCurseControlAccess(sheet: FichaPersonagem): boolean {
  if (sheet.cursedProfile.curseControlEnabled) {
    return true;
  }
  if ((sheet.controlledCurses?.length ?? 0) > 0 || (sheet.summons?.length ?? 0) > 0) {
    return true;
  }

  const searchableTexts: string[] = [
    sheet.identity.specialization,
    sheet.identity.multiclass,
    sheet.cursedProfile.techniqueName,
    sheet.cursedProfile.techniqueDescription,
    ...sheet.characteristics,
    ...sheet.talents,
    ...sheet.originTraits,
    ...sheet.specializationAbilities.map((a) => `${a.name} ${a.description}`),
    ...sheet.skillTalentsTable.map((s) => s.name),
    ...sheet.cursedProfile.techniqueAbilities.map((a) => `${a.name} ${a.description}`),
    ...sheet.cursedProfile.passiveAbilities.map((p) => `${p.name} ${p.effect}`),
  ];

  const normalized = searchableTexts.join(' ').toLowerCase();
  return CURSE_CONTROL_KEYWORDS.some((kw) => normalized.includes(kw));
}

/**
 * Constrói o resumo compacto da ficha para compartilhamento no Escudo do Mestre
 * via OBR.room.metadata (mantendo payload reduzido dentro do limite de 16KB).
 */
export function buildSharedCharacterSummary(
  sheet: FichaPersonagem
): SharedCharacterSummary {
  const activeConditions = (Object.keys(sheet.conditions.flags) as SimpleConditionKey[]).filter(
    (key) => sheet.conditions.flags[key]
  );

  // Evita gravar Data URIs/base64 pesados nos metadados da sala do OBR
  const safeAvatarUrl =
    sheet.identity.avatarUrl &&
    !sheet.identity.avatarUrl.startsWith('data:') &&
    sheet.identity.avatarUrl.length <= 512
      ? sheet.identity.avatarUrl
      : undefined;

  return {
    sheetId: sheet.id,
    ownerPlayerId: sheet.permissions.ownerPlayerId,
    ownerPlayerName: sheet.permissions.ownerPlayerName,
    name: sheet.identity.name,
    playerName: sheet.identity.player,
    ...(safeAvatarUrl ? { avatarUrl: safeAvatarUrl } : {}),
    grade: resolveCalculableValue(sheet.identity.grade),
    level: resolveCalculableValue(sheet.identity.level),
    specialization: sheet.identity.specialization,
    hpCurrent: resolveCalculableValue(sheet.vitals.hp.current),
    hpMax: resolveCalculableValue(sheet.vitals.hp.max),
    hpPercentage: resolveCalculableValue(sheet.vitals.hp.percentage),
    peCurrent: resolveCalculableValue(sheet.vitals.pe.current),
    peMax: resolveCalculableValue(sheet.vitals.pe.max),
    pePercentage: resolveCalculableValue(sheet.vitals.pe.percentage),
    activeConditions,
    bleeding: sheet.conditions.bleeding,
    freezing: sheet.conditions.freezing,
    lockedByGM: sheet.permissions.lockedByGM,
    allowOtherPlayersViewSheet: Boolean(sheet.permissions.allowOtherPlayersViewSheet),
    allowOtherPlayersViewCombatCenter: Boolean(
      sheet.permissions.allowOtherPlayersViewCombatCenter
    ),
    ...(sheet.permissions.createdByRole
      ? { createdByRole: sheet.permissions.createdByRole }
      : {}),
    ...(typeof sheet.permissions.showOnMasterShield === 'boolean'
      ? { showOnMasterShield: sheet.permissions.showOnMasterShield }
      : {}),
    updatedAt: sheet.updatedAt,
  };
}

/**
 * Aplica variação incremental (+/-) em PV ou PE respeitando os campos reais da ficha.
 */
export function adjustPoolResource(
  sheet: FichaPersonagem,
  resource: 'hp' | 'pe',
  delta: number
): FichaPersonagem {
  const pool = sheet.vitals[resource];
  const currentEffective = resolveCalculableValue(pool.current);
  const maxEffective = resolveCalculableValue(pool.max);

  if (pool.current.usarManual) {
    return setPoolResourceCurrent(sheet, resource, Math.max(0, currentEffective + delta));
  }

  let nextLost = pool.lost;
  let nextHealed = pool.healed;

  if (delta < 0) {
    let remainingSpend = Math.abs(delta);
    if (nextHealed > 0) {
      const fromHealed = Math.min(nextHealed, remainingSpend);
      nextHealed -= fromHealed;
      remainingSpend -= fromHealed;
    }
    const maxAllowedLoss = Math.max(0, maxEffective + pool.temp + nextHealed);
    nextLost = Math.min(maxAllowedLoss, nextLost + remainingSpend);
  } else if (delta > 0) {
    const reduceLost = Math.min(nextLost, delta);
    nextLost -= reduceLost;
    const leftoverHeal = delta - reduceLost;
    if (leftoverHeal > 0 && maxEffective === 0) {
      nextHealed += leftoverHeal;
    }
  }

  return {
    ...sheet,
    vitals: {
      ...sheet.vitals,
      [resource]: {
        ...pool,
        lost: nextLost,
        healed: nextHealed,
        current: disableManualOverride(pool.current, true),
      },
    },
  };
}

/**
 * Define diretamente o valor atual desejado de PV ou PE na ficha real.
 * Mantém `lost`/`healed` sincronizados para que alterações futuras no máximo
 * atualizem o valor atual de forma consistente.
 */
export function setPoolResourceCurrent(
  sheet: FichaPersonagem,
  resource: 'hp' | 'pe',
  targetValue: number
): FichaPersonagem {
  const safeTarget = Math.max(0, targetValue);
  const pool = sheet.vitals[resource];
  const maxEffective = resolveCalculableValue(pool.max);

  const baseWithTemp = maxEffective + pool.temp;
  const nextLost = safeTarget < baseWithTemp ? baseWithTemp - safeTarget : 0;
  const nextHealed = safeTarget > baseWithTemp ? safeTarget - baseWithTemp : 0;

  return {
    ...sheet,
    vitals: {
      ...sheet.vitals,
      [resource]: {
        ...pool,
        lost: nextLost,
        healed: nextHealed,
        current: disableManualOverride(pool.current, true),
      },
    },
  };
}

/**
 * Atualiza o campo máximo de PV ou PE garantindo reação consistente do valor atual
 * (limpando eventual `usarManual` legado em `current` e reconciliando `healed` provisório
 * caso o máximo esteja saindo de 0 para um valor positivo).
 */
export function applyPoolMaxChange(
  sheet: FichaPersonagem,
  resource: 'hp' | 'pe',
  nextMax: CalculableNumber
): FichaPersonagem {
  const pool = sheet.vitals[resource];
  const oldMax = resolveCalculableValue(pool.max);
  const newMax = resolveCalculableValue(nextMax);
  const shouldClearInterimHealed =
    oldMax === 0 && newMax > 0 && pool.lost === 0 && pool.healed > 0;

  return {
    ...sheet,
    vitals: {
      ...sheet.vitals,
      [resource]: {
        ...pool,
        max: nextMax,
        ...(shouldClearInterimHealed ? { healed: 0 } : {}),
        current: pool.current.usarManual
          ? disableManualOverride(pool.current, true)
          : pool.current,
      },
    },
  };
}

/**
 * Aplica variação incremental (+/-) em Sanidade ou Integridade.
 */
export function adjustMentalResource(
  sheet: FichaPersonagem,
  resource: 'sanity' | 'integrity',
  delta: number
): FichaPersonagem {
  const pool = sheet.vitals[resource];
  const currentEffective = resolveCalculableValue(pool.current);
  const maxEffective = resolveCalculableValue(pool.max);

  if (pool.current.usarManual) {
    const nextManual = Math.max(0, currentEffective + delta);
    return {
      ...sheet,
      vitals: {
        ...sheet.vitals,
        [resource]: {
          ...pool,
          current: enableManualOverride(pool.current, nextManual),
        },
      },
    };
  }

  let nextLost = pool.lost;
  let nextRecovered = pool.recovered;

  if (delta < 0) {
    let remainingSpend = Math.abs(delta);
    if (nextRecovered > 0) {
      const fromRec = Math.min(nextRecovered, remainingSpend);
      nextRecovered -= fromRec;
      remainingSpend -= fromRec;
    }
    const maxAllowedLoss = Math.max(0, maxEffective + pool.add + nextRecovered);
    nextLost = Math.min(maxAllowedLoss, nextLost + remainingSpend);
  } else if (delta > 0) {
    const reduceLost = Math.min(nextLost, delta);
    nextLost -= reduceLost;
    const leftover = delta - reduceLost;
    if (leftover > 0 && maxEffective === 0) {
      nextRecovered += leftover;
    }
  }

  return {
    ...sheet,
    vitals: {
      ...sheet.vitals,
      [resource]: {
        ...pool,
        lost: nextLost,
        recovered: nextRecovered,
      },
    },
  };
}

/**
 * Define diretamente o valor atual desejado de Sanidade ou Integridade.
 */
export function setMentalResourceCurrent(
  sheet: FichaPersonagem,
  resource: 'sanity' | 'integrity',
  targetValue: number
): FichaPersonagem {
  const safeTarget = Math.max(0, targetValue);
  const pool = sheet.vitals[resource];
  const maxEffective = resolveCalculableValue(pool.max);

  if (pool.current.usarManual) {
    return {
      ...sheet,
      vitals: {
        ...sheet.vitals,
        [resource]: {
          ...pool,
          current: enableManualOverride(pool.current, safeTarget),
        },
      },
    };
  }

  const baseWithAdd = maxEffective + pool.add;
  const nextLost = safeTarget < baseWithAdd ? baseWithAdd - safeTarget : 0;
  const nextRecovered = safeTarget > baseWithAdd ? safeTarget - baseWithAdd : 0;

  return {
    ...sheet,
    vitals: {
      ...sheet.vitals,
      [resource]: {
        ...pool,
        lost: nextLost,
        recovered: nextRecovered,
      },
    },
  };
}
