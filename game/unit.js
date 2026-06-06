// game/unit.js
// Unit model for Shrouded Front.
//
// This file contains the generic unit class and the three MVP unit templates:
// recon, infantry, artillery.

let __unitCounter = 0;

export const UNIT_TYPES = Object.freeze({
  RECON: 'recon',
  INFANTRY: 'infantry',
  ARTILLERY: 'artillery'
});

export const UNIT_STATUS = Object.freeze({
  ACTIVE: 'active',
  RETURNING: 'returning',
  HUNGRY: 'hungry',
  EXHAUSTED: 'exhausted',
  DEAD: 'dead',
  DISCONNECTED: 'disconnected',
  ENGAGED: 'engaged',
  HOLDING: 'holding'
});

export const LEADER_TRAITS = Object.freeze({
  STEADY: 'steady',
  SCOUT: 'scout',
  ASSAULT: 'assault',
  SIGNAL: 'signal',
  CAREFUL: 'careful'
});

export const LEADER_TRAIT_LABELS = Object.freeze({
  [LEADER_TRAITS.STEADY]: '안정 지휘',
  [LEADER_TRAITS.SCOUT]: '정찰 지휘',
  [LEADER_TRAITS.ASSAULT]: '교전 지휘',
  [LEADER_TRAITS.SIGNAL]: '통신 지휘',
  [LEADER_TRAITS.CAREFUL]: '신중 지휘'
});

export const UNIT_TEMPLATES = Object.freeze({
  [UNIT_TYPES.RECON]: {
    label: '정찰병',
    role: '정찰',
    maxHealth: 60,
    baseFood: 72,
    baseAmmo: 0,
    vision: 4,
    comm: 4,
    move: 4,
    attackMin: 4,
    attackMax: 7,
    carry: 1,
    commandProfile: ['이동', '정찰', '복귀', '관측', '대기']
  },
  [UNIT_TYPES.INFANTRY]: {
    label: '보병',
    role: '점령',
    maxHealth: 100,
    baseFood: 48,
    baseAmmo: 0,
    vision: 2,
    comm: 3,
    move: 2,
    attackMin: 6,
    attackMax: 9,
    carry: 2,
    commandProfile: ['이동', '방어', '점령', '철수', '대기']
  },
  [UNIT_TYPES.ARTILLERY]: {
    label: '포병',
    role: '화력',
    maxHealth: 80,
    baseFood: 36,
    baseAmmo: 6,
    vision: 1,
    comm: 3,
    move: 1,
    attackMin: 10,
    attackMax: 14,
    carry: 1,
    commandProfile: ['이동', '포격대기', '재배치', '지원사격', '철수']
  }
});

function nextUnitId() {
  __unitCounter += 1;
  return `U${String(__unitCounter).padStart(5, '0')}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeType(type) {
  const value = String(type ?? '').trim().toLowerCase();
  const allowed = Object.values(UNIT_TYPES);
  if (allowed.includes(value)) return value;
  return UNIT_TYPES.RECON;
}

function normalizeStatus(status) {
  const value = String(status ?? '').trim().toLowerCase();
  const allowed = Object.values(UNIT_STATUS);
  if (allowed.includes(value)) return value;
  return UNIT_STATUS.ACTIVE;
}

function normalizeLeaderTrait(trait) {
  const value = String(trait ?? '').trim().toLowerCase();
  const allowed = Object.values(LEADER_TRAITS);
  return allowed.includes(value) ? value : LEADER_TRAITS.STEADY;
}

function defaultLeaderTrait(type) {
  if (type === UNIT_TYPES.RECON) return LEADER_TRAITS.SCOUT;
  if (type === UNIT_TYPES.INFANTRY) return LEADER_TRAITS.ASSAULT;
  if (type === UNIT_TYPES.ARTILLERY) return LEADER_TRAITS.SIGNAL;
  return LEADER_TRAITS.STEADY;
}

function normalizeLeader(leader, type, level) {
  const raw = leader && typeof leader === 'object' ? leader : {};
  const trait = normalizeLeaderTrait(raw.trait ?? defaultLeaderTrait(type));
  const rating = clamp(Number(raw.rating ?? Math.min(3, Math.max(1, Math.ceil(level / 2)))), 1, 5);
  return {
    id: raw.id ?? `${type}-leader`,
    name: raw.name ?? '임시 지휘관',
    billet: raw.billet ?? '작전 리더',
    trait,
    traitLabel: LEADER_TRAIT_LABELS[trait],
    rating
  };
}

function defaultCohesion(type) {
  if (type === UNIT_TYPES.RECON) return 78;
  if (type === UNIT_TYPES.INFANTRY) return 72;
  if (type === UNIT_TYPES.ARTILLERY) return 68;
  return 70;
}

export class Unit {
  constructor({
    id = nextUnitId(),
    type = UNIT_TYPES.RECON,
    name = '',
    sectorId = null,
    level = 1,
    health = null,
    food = null,
    ammo = null,
    status = UNIT_STATUS.ACTIVE,
    command = '',
    originSectorId = null,
    owner = 'player',
    experience = 0,
    fatigue = 0,
    morale = 100,
    cohesion = null,
    cohesionTarget = null,
    leader = null,
    deputy = null,
    carryLoad = 0,
    reconProgress = 0,
    commConnected = true,
    lastSeenTurn = null,
    tags = [],
    meta = {}
  } = {}) {
    this.id = id;
    this.type = normalizeType(type);
    this.template = UNIT_TEMPLATES[this.type];
    this.name = name || `${this.template.label} ${this.id}`;
    this.sectorId = sectorId;
    this.originSectorId = originSectorId ?? sectorId;
    this.level = Math.max(1, Math.floor(level));
    this.maxHealth = this.template.maxHealth;
    this.health = clamp(
      health ?? this.maxHealth,
      0,
      this.maxHealth
    );
    this.food = clamp(
      food ?? this.template.baseFood,
      0,
      999
    );
    this.ammo = clamp(
      ammo ?? this.template.baseAmmo,
      0,
      999
    );
    this.status = normalizeStatus(status);
    this.command = command || this.defaultCommand();
    this.owner = owner;
    this.experience = Math.max(0, Math.floor(experience));
    this.fatigue = clamp(fatigue, 0, 100);
    this.morale = clamp(morale, 0, 100);
    this.cohesion = clamp(cohesion ?? defaultCohesion(this.type), 0, 100);
    this.cohesionTarget = clamp(cohesionTarget ?? Math.max(this.cohesion, 86), 0, 100);
    this.leader = normalizeLeader(leader, this.type, this.level);
    this.deputy = deputy ? normalizeLeader(deputy, this.type, this.level) : null;
    this.carryLoad = clamp(carryLoad, 0, 999);
    this.reconProgress = clamp(reconProgress, 0, 100);
    this.commConnected = Boolean(commConnected);
    this.lastSeenTurn = lastSeenTurn;
    this.tags = Array.isArray(tags) ? [...tags] : [];
    this.meta = { ...meta };
    if (!this.meta.formation || typeof this.meta.formation !== 'object') {
      this.meta.formation = {
        stableMinutes: 0,
        reorgCooldownMinutes: 0,
        lastReorgReason: null,
        lastReorgTime: null
      };
    }

    // Runtime values used by the simulation.
    this.moveBuffer = 0;
    this.orderQueue = [];
    this.targetSectorId = null;
    this.lastKnownSectorId = sectorId;
    this.turnsSinceReport = 0;
    this.turnsSinceContact = 0;
    this.isSelected = false;
    this.isHovered = false;
    this.isInCombat = false;
    this.isRetreating = false;
  }

  static create(type, options = {}) {
    return new Unit({ ...options, type });
  }

  static recon(options = {}) {
    return Unit.create(UNIT_TYPES.RECON, options);
  }

  static infantry(options = {}) {
    return Unit.create(UNIT_TYPES.INFANTRY, options);
  }

  static artillery(options = {}) {
    return Unit.create(UNIT_TYPES.ARTILLERY, options);
  }

  defaultCommand() {
    if (this.type === UNIT_TYPES.RECON) return '정찰';
    if (this.type === UNIT_TYPES.INFANTRY) return '방어';
    if (this.type === UNIT_TYPES.ARTILLERY) return '포격대기';
    return '대기';
  }

  get label() {
    return this.template.label;
  }

  get role() {
    return this.template.role;
  }

  get maxFood() {
    return this.template.baseFood;
  }

  get maxAmmo() {
    return this.template.baseAmmo;
  }

  get vision() {
    return this.template.vision + Math.max(0, this.level - 1);
  }

  get comm() {
    return this.template.comm + Math.max(0, this.level - 1);
  }

  get move() {
    return this.template.move + (this.type === UNIT_TYPES.RECON ? Math.floor(this.level / 3) : 0);
  }

  get attackMin() {
    return this.template.attackMin + Math.max(0, this.level - 1);
  }

  get attackMax() {
    return this.template.attackMax + Math.max(0, this.level - 1);
  }

  get isAlive() {
    return this.status !== UNIT_STATUS.DEAD && this.health > 0;
  }

  get isHungry() {
    const threshold = Math.min(24, Math.ceil(this.maxFood * 0.34));
    return this.food > 0 && this.food <= threshold;
  }

  get isExhausted() {
    return this.food <= 0;
  }

  get combatMultiplier() {
    const leaderBonus = this.leaderTrait === LEADER_TRAITS.ASSAULT ? 1.06 : 1;
    if (this.isExhausted) return 0.35 * this.cohesionFactor;
    if (this.isHungry) return 0.7 * this.cohesionFactor;
    if (this.fatigue >= 75) return 0.8 * this.cohesionFactor * leaderBonus;
    return this.cohesionFactor * leaderBonus;
  }

  get defenseMultiplier() {
    const leaderBonus = this.leaderTrait === LEADER_TRAITS.CAREFUL ? 1.06 : 1;
    if (this.isExhausted) return 0.4 * this.cohesionFactor;
    if (this.isHungry) return 0.75 * this.cohesionFactor;
    if (this.fatigue >= 75) return 0.85 * this.cohesionFactor * leaderBonus;
    return this.cohesionFactor * leaderBonus;
  }

  get cohesionFactor() {
    return clamp(0.72 + (this.cohesion / 100) * 0.28, 0.55, 1.04);
  }

  get leaderTrait() {
    return this.leader?.trait ?? LEADER_TRAITS.STEADY;
  }

  get leaderLabel() {
    return this.leader?.traitLabel ?? LEADER_TRAIT_LABELS[LEADER_TRAITS.STEADY];
  }

  get leaderRating() {
    return clamp(Number(this.leader?.rating ?? 1), 1, 5);
  }

  get isReorganizing() {
    return (this.meta?.formation?.reorgCooldownMinutes ?? 0) > 0;
  }

  get readiness() {
    const healthFactor = this.health / this.maxHealth;
    const foodFactor = this.food > 0 ? 1 : 0.6;
    const moraleFactor = this.morale / 100;
    return clamp(Math.round(100 * healthFactor * foodFactor * moraleFactor * this.cohesionFactor), 0, 100);
  }

  get summary() {
    return {
      id: this.id,
      type: this.type,
      label: this.label,
      role: this.role,
      name: this.name,
      sectorId: this.sectorId,
      level: this.level,
      health: this.health,
      food: this.food,
      ammo: this.ammo,
      cohesion: this.cohesion,
      cohesionTarget: this.cohesionTarget,
      leader: { ...this.leader },
      deputy: this.deputy ? { ...this.deputy } : null,
      status: this.status,
      commConnected: this.commConnected,
      reconProgress: this.reconProgress,
      readiness: this.readiness
    };
  }

  markSelected(value = true) {
    this.isSelected = Boolean(value);
    return this;
  }

  markHovered(value = true) {
    this.isHovered = Boolean(value);
    return this;
  }

  setSector(sectorId) {
    this.sectorId = sectorId;
    this.lastKnownSectorId = sectorId;
    return this;
  }

  setOriginSector(sectorId) {
    this.originSectorId = sectorId;
    return this;
  }

  setCommand(command) {
    this.command = String(command ?? '').trim();
    return this;
  }

  setStatus(status) {
    this.status = normalizeStatus(status);
    return this;
  }

  setFood(value) {
    this.food = clamp(value, 0, 999);
    return this;
  }

  setAmmo(value) {
    this.ammo = clamp(value, 0, 999);
    return this;
  }

  setHealth(value) {
    this.health = clamp(value, 0, this.maxHealth);
    if (this.health <= 0) this.status = UNIT_STATUS.DEAD;
    return this;
  }

  setMorale(value) {
    this.morale = clamp(value, 0, 100);
    return this;
  }

  setCohesion(value) {
    this.cohesion = clamp(value, 0, 100);
    return this;
  }

  setLeader(leader, { time = null, penalty = 18, reason = 'leader-change' } = {}) {
    this.leader = normalizeLeader(leader, this.type, this.level);
    this.applyReorgPenalty(penalty, { time, reason });
    return this;
  }

  applyReorgPenalty(amount = 18, { time = null, reason = 'reorg', cooldownMinutes = 6 * 60 } = {}) {
    const penalty = Math.max(0, Number(amount) || 0);
    this.cohesion = clamp(this.cohesion - penalty, 0, 100);
    if (!this.meta || typeof this.meta !== 'object') this.meta = {};
    if (!this.meta.formation || typeof this.meta.formation !== 'object') this.meta.formation = {};
    this.meta.formation.stableMinutes = 0;
    this.meta.formation.reorgCooldownMinutes = Math.max(
      this.meta.formation.reorgCooldownMinutes ?? 0,
      Math.max(0, cooldownMinutes)
    );
    this.meta.formation.lastReorgReason = reason;
    this.meta.formation.lastReorgTime = time;
    return this;
  }

  recoverCohesion(minutes = 0, { activity = 'idle', atSupply = false } = {}) {
    const elapsedHours = Math.max(0, minutes) / 60;
    if (elapsedHours <= 0) return this;

    const rates = {
      idle: atSupply ? 1.25 : 0.85,
      recon: 0.35,
      moving: 0.18,
      returning: 0.28,
      engaged: -0.45
    };
    const rate = rates[activity] ?? 0.25;
    this.cohesion = clamp(this.cohesion + rate * elapsedHours, 0, this.cohesionTarget);

    if (!this.meta || typeof this.meta !== 'object') this.meta = {};
    if (!this.meta.formation || typeof this.meta.formation !== 'object') this.meta.formation = {};
    this.meta.formation.stableMinutes = (this.meta.formation.stableMinutes ?? 0) + minutes;
    this.meta.formation.reorgCooldownMinutes = Math.max(
      0,
      (this.meta.formation.reorgCooldownMinutes ?? 0) - minutes
    );
    return this;
  }

  setFatigue(value) {
    this.fatigue = clamp(value, 0, 100);
    return this;
  }

  setReconProgress(value) {
    this.reconProgress = clamp(value, 0, 100);
    return this;
  }

  advanceReconProgress(delta) {
    return this.setReconProgress(this.reconProgress + delta);
  }

  setCommConnected(value) {
    this.commConnected = Boolean(value);
    if (!this.commConnected && this.status === UNIT_STATUS.ACTIVE) {
      this.status = UNIT_STATUS.DISCONNECTED;
    }
    return this;
  }

  connectComm() {
    this.commConnected = true;
    if (this.status === UNIT_STATUS.DISCONNECTED) {
      this.status = UNIT_STATUS.ACTIVE;
    }
    return this;
  }

  disconnectComm() {
    this.commConnected = false;
    if (this.status === UNIT_STATUS.ACTIVE) {
      this.status = UNIT_STATUS.DISCONNECTED;
    }
    return this;
  }

  addTag(tag) {
    const value = String(tag ?? '').trim().toLowerCase();
    if (value && !this.tags.includes(value)) {
      this.tags.push(value);
    }
    return this;
  }

  removeTag(tag) {
    const value = String(tag ?? '').trim().toLowerCase();
    this.tags = this.tags.filter((item) => item !== value);
    return this;
  }

  addOrder(order) {
    if (order !== null && order !== undefined) {
      this.orderQueue.push(order);
    }
    return this;
  }

  clearOrders() {
    this.orderQueue = [];
    this.targetSectorId = null;
    return this;
  }

  setTargetSector(sectorId) {
    this.targetSectorId = sectorId;
    return this;
  }

  startRetreat() {
    this.isRetreating = true;
    this.status = UNIT_STATUS.RETURNING;
    return this;
  }

  stopRetreat() {
    this.isRetreating = false;
    if (this.status === UNIT_STATUS.RETURNING) {
      this.status = UNIT_STATUS.ACTIVE;
    }
    return this;
  }

  startCombat() {
    this.isInCombat = true;
    this.status = UNIT_STATUS.ENGAGED;
    return this;
  }

  stopCombat() {
    this.isInCombat = false;
    if (this.status === UNIT_STATUS.ENGAGED) {
      this.status = UNIT_STATUS.ACTIVE;
    }
    return this;
  }

  gainExperience(amount = 1) {
    this.experience += Math.max(0, Math.floor(amount));
    const threshold = this.level * 100;
    if (this.experience >= threshold) {
      this.levelUp();
    }
    return this;
  }

  levelUp() {
    this.level += 1;
    this.experience = 0;
    this.morale = clamp(this.morale + 5, 0, 100);
    this.fatigue = clamp(this.fatigue - 5, 0, 100);
    this.cohesionTarget = clamp(this.cohesionTarget + 2, 0, 100);
    return this;
  }

  applyFoodDrain(amount = 1) {
    this.food = clamp(this.food - amount, 0, 999);
    if (this.food <= 0 && this.status === UNIT_STATUS.ACTIVE) {
      this.status = UNIT_STATUS.EXHAUSTED;
    } else if (this.isHungry && this.status === UNIT_STATUS.ACTIVE) {
      this.status = UNIT_STATUS.HUNGRY;
    }
    return this;
  }

  restoreFood(amount = 1) {
    this.food = clamp(this.food + amount, 0, 999);
    if (this.food > 0 && this.status === UNIT_STATUS.EXHAUSTED) {
      this.status = UNIT_STATUS.ACTIVE;
    }
    if (!this.isHungry && this.status === UNIT_STATUS.HUNGRY) {
      this.status = UNIT_STATUS.ACTIVE;
    }
    return this;
  }

  applyDamage(amount = 1) {
    const damage = Math.max(0, amount);
    if (damage > 0) {
      this.setCohesion(this.cohesion - Math.min(12, damage * 0.8));
    }
    return this.setHealth(this.health - damage);
  }

  repair(amount = 1) {
    return this.setHealth(this.health + Math.max(0, amount));
  }

  consumeAmmo(amount = 1) {
    this.ammo = clamp(this.ammo - Math.max(0, amount), 0, 999);
    return this;
  }

  refillAmmo(amount = this.template.baseAmmo) {
    this.ammo = clamp(amount, 0, 999);
    return this;
  }

  resetForNewMission() {
    this.status = UNIT_STATUS.ACTIVE;
    this.health = this.maxHealth;
    this.food = this.template.baseFood;
    this.ammo = this.template.baseAmmo;
    this.fatigue = 0;
    this.morale = 100;
    this.cohesion = defaultCohesion(this.type);
    this.cohesionTarget = Math.max(this.cohesion, 86);
    this.reconProgress = 0;
    this.commConnected = true;
    this.turnsSinceReport = 0;
    this.turnsSinceContact = 0;
    this.isRetreating = false;
    this.isInCombat = false;
    this.clearOrders();
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      label: this.label,
      role: this.role,
      sectorId: this.sectorId,
      originSectorId: this.originSectorId,
      level: this.level,
      maxHealth: this.maxHealth,
      health: this.health,
      food: this.food,
      ammo: this.ammo,
      status: this.status,
      command: this.command,
      owner: this.owner,
      experience: this.experience,
      fatigue: this.fatigue,
      morale: this.morale,
      cohesion: this.cohesion,
      cohesionTarget: this.cohesionTarget,
      leader: { ...this.leader },
      deputy: this.deputy ? { ...this.deputy } : null,
      carryLoad: this.carryLoad,
      reconProgress: this.reconProgress,
      readiness: this.readiness,
      commConnected: this.commConnected,
      lastSeenTurn: this.lastSeenTurn,
      tags: [...this.tags],
      meta: { ...this.meta },
      moveBuffer: this.moveBuffer,
      orderQueue: [...this.orderQueue],
      targetSectorId: this.targetSectorId,
      lastKnownSectorId: this.lastKnownSectorId,
      turnsSinceReport: this.turnsSinceReport,
      turnsSinceContact: this.turnsSinceContact,
      isSelected: this.isSelected,
      isHovered: this.isHovered,
      isInCombat: this.isInCombat,
      isRetreating: this.isRetreating
    };
  }
}

export function createUnit(type, options = {}) {
  return Unit.create(type, options);
}

export function createRecon(options = {}) {
  return Unit.recon(options);
}

export function createInfantry(options = {}) {
  return Unit.infantry(options);
}

export function createArtillery(options = {}) {
  return Unit.artillery(options);
}

export function listUnitTemplates() {
  return Object.entries(UNIT_TEMPLATES).map(([type, template]) => ({
    type,
    ...template
  }));
}

export function isUnitAlive(unit) {
  return Boolean(unit) && unit.isAlive !== false && unit.status !== UNIT_STATUS.DEAD;
}

export function unitLabel(unit) {
  if (!unit) return 'Unknown';
  return unit.label ?? UNIT_TEMPLATES[normalizeType(unit.type)]?.label ?? 'Unknown';
}
