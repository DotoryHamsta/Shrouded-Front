// game/formation.js
// Force-pool and operational-unit formation helpers.

import {
  LEADER_TRAITS,
  MISSION_ROLES,
  PERSONNEL_ROLE_LABELS,
  UNIT_TYPES
} from './unit.js?v=31';

export const TOTAL_PERSONNEL_LIMIT = 40;
export const MISSION_START_SECTOR = 'D5';

export const DEFAULT_COMM_ANCHORS = Object.freeze([
  { sectorId: 'D5', label: 'HQ' },
  { sectorId: 'D3', label: '야전사령부' }
]);

export const PERSONNEL_ROLES = Object.freeze([
  {
    id: 'leader',
    label: PERSONNEL_ROLE_LABELS.leader,
    min: 1,
    max: 5,
    summary: '작전 단위 슬롯'
  },
  {
    id: 'rifleman',
    label: PERSONNEL_ROLE_LABELS.rifleman,
    min: 0,
    max: 30,
    summary: '경계와 교전'
  },
  {
    id: 'scout',
    label: PERSONNEL_ROLE_LABELS.scout,
    min: 0,
    max: 12,
    summary: '정찰 속도'
  },
  {
    id: 'signal',
    label: PERSONNEL_ROLE_LABELS.signal,
    min: 0,
    max: 8,
    summary: '보고 주기'
  },
  {
    id: 'medic',
    label: PERSONNEL_ROLE_LABELS.medic,
    min: 0,
    max: 8,
    summary: '지속 운용'
  },
  {
    id: 'observer',
    label: PERSONNEL_ROLE_LABELS.observer,
    min: 0,
    max: 6,
    summary: '관측 정확도'
  },
  {
    id: 'weapons',
    label: PERSONNEL_ROLE_LABELS.weapons,
    min: 0,
    max: 6,
    summary: '화력 지원'
  }
]);

export const NON_LEADER_ROLE_IDS = Object.freeze(
  PERSONNEL_ROLES.filter((role) => role.id !== 'leader').map((role) => role.id)
);

export const CAPABILITY_KEYS = Object.freeze([
  'recon',
  'communication',
  'combat',
  'sustainment',
  'mobility'
]);

export const CAPABILITY_LABELS = Object.freeze({
  recon: '정찰',
  communication: '통신',
  combat: '교전',
  sustainment: '지속',
  mobility: '기동'
});

export const LEADER_CANDIDATES = Object.freeze([
  {
    id: 'L-HAN',
    name: 'Sgt. Han',
    trait: LEADER_TRAITS.SCOUT,
    traitLabel: '정찰 지휘',
    rating: 2
  },
  {
    id: 'L-BAEK',
    name: 'Sgt. Baek',
    trait: LEADER_TRAITS.STEADY,
    traitLabel: '안정 지휘',
    rating: 2
  },
  {
    id: 'L-MIN',
    name: 'Cpl. Min',
    trait: LEADER_TRAITS.SIGNAL,
    traitLabel: '통신 지휘',
    rating: 1
  },
  {
    id: 'L-JANG',
    name: 'Lt. Jang',
    trait: LEADER_TRAITS.ASSAULT,
    traitLabel: '교전 지휘',
    rating: 3
  },
  {
    id: 'L-SEO',
    name: 'Sgt. Seo',
    trait: LEADER_TRAITS.CAREFUL,
    traitLabel: '신중 지휘',
    rating: 2
  }
]);

export const DEFAULT_POOL = Object.freeze({
  leader: 3,
  rifleman: 22,
  scout: 6,
  signal: 3,
  medic: 3,
  observer: 2,
  weapons: 1
});

const DRAFT_NAMES = Object.freeze(['Alpha Team', 'Bravo Team', 'Charlie Team', 'Delta Team', 'Echo Team']);
const DEFAULT_DRAFT_LOADOUTS = Object.freeze([
  { rifleman: 2, scout: 2, signal: 1, medic: 1, observer: 0, weapons: 0 },
  { rifleman: 8, scout: 0, signal: 1, medic: 1, observer: 0, weapons: 1 },
  { rifleman: 3, scout: 2, signal: 1, medic: 0, observer: 1, weapons: 0 },
  { rifleman: 4, scout: 1, signal: 0, medic: 1, observer: 0, weapons: 0 },
  { rifleman: 4, scout: 1, signal: 0, medic: 1, observer: 0, weapons: 0 }
]);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roleById(roleId) {
  return PERSONNEL_ROLES.find((role) => role.id === roleId) ?? null;
}

function sanitizeCount(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

function countRole(composition = {}, roleId) {
  return sanitizeCount(composition?.[roleId]);
}

function roundedScore(value) {
  return clamp(Math.round(value), 0, 100);
}

export function clonePool(pool = DEFAULT_POOL) {
  return PERSONNEL_ROLES.reduce((acc, role) => {
    acc[role.id] = sanitizeCount(pool[role.id] ?? 0);
    return acc;
  }, {});
}

export function poolTotal(pool = {}) {
  return PERSONNEL_ROLES.reduce((sum, role) => sum + sanitizeCount(pool[role.id]), 0);
}

export function roleLabel(roleId) {
  return roleById(roleId)?.label ?? roleId;
}

export function normalizePool(pool = DEFAULT_POOL) {
  const next = clonePool(pool);
  for (const role of PERSONNEL_ROLES) {
    next[role.id] = clamp(next[role.id], role.min ?? 0, role.max ?? TOTAL_PERSONNEL_LIMIT);
  }
  next.leader = clamp(next.leader, 1, LEADER_CANDIDATES.length);

  while (poolTotal(next) > TOTAL_PERSONNEL_LIMIT) {
    const role = [...PERSONNEL_ROLES].reverse().find((item) => next[item.id] > (item.min ?? 0));
    if (!role) break;
    next[role.id] -= 1;
  }

  return next;
}

export function createDraft(index = 0) {
  const loadout = DEFAULT_DRAFT_LOADOUTS[index] ?? {};
  return {
    id: `draft-${index + 1}`,
    name: DRAFT_NAMES[index] ?? `Team ${index + 1}`,
    leaderId: LEADER_CANDIDATES[index % LEADER_CANDIDATES.length].id,
    composition: NON_LEADER_ROLE_IDS.reduce((acc, roleId) => {
      acc[roleId] = sanitizeCount(loadout[roleId] ?? 0);
      return acc;
    }, {})
  };
}

export function leaderById(leaderId) {
  return LEADER_CANDIDATES.find((leader) => leader.id === leaderId) ?? LEADER_CANDIDATES[0];
}

export function draftPersonnelCount(draft = {}) {
  return 1 + NON_LEADER_ROLE_IDS.reduce(
    (sum, roleId) => sum + sanitizeCount(draft.composition?.[roleId]),
    0
  );
}

export function assignedByRole(drafts = []) {
  const assigned = PERSONNEL_ROLES.reduce((acc, role) => {
    acc[role.id] = 0;
    return acc;
  }, {});
  assigned.leader = drafts.length;

  for (const draft of drafts) {
    for (const roleId of NON_LEADER_ROLE_IDS) {
      assigned[roleId] += sanitizeCount(draft.composition?.[roleId]);
    }
  }

  return assigned;
}

export function availableByRole(pool = {}, drafts = []) {
  const assigned = assignedByRole(drafts);
  return PERSONNEL_ROLES.reduce((acc, role) => {
    acc[role.id] = Math.max(0, sanitizeCount(pool[role.id]) - sanitizeCount(assigned[role.id]));
    return acc;
  }, {});
}

export function normalizeDrafts(drafts = [], pool = DEFAULT_POOL) {
  const cleanPool = normalizePool(pool);
  const slotCount = clamp(cleanPool.leader, 1, LEADER_CANDIDATES.length);
  const next = [];
  const remaining = clonePool(cleanPool);

  for (let index = 0; index < slotCount; index += 1) {
    const source = drafts[index] ?? createDraft(index);
    const fallback = createDraft(index);
    const draft = {
      id: source.id ?? fallback.id,
      name: source.name || fallback.name,
      leaderId: source.leaderId || fallback.leaderId,
      composition: {}
    };

    remaining.leader = Math.max(0, remaining.leader - 1);

    for (const roleId of NON_LEADER_ROLE_IDS) {
      const desired = sanitizeCount(source.composition?.[roleId] ?? fallback.composition[roleId]);
      const count = Math.min(desired, remaining[roleId] ?? 0);
      draft.composition[roleId] = count;
      remaining[roleId] = Math.max(0, (remaining[roleId] ?? 0) - count);
    }

    next.push(draft);
  }

  return next;
}

export function echelonForCount(count) {
  if (count <= 5) return 'team';
  if (count <= 12) return 'squad';
  if (count <= 35) return 'detachment';
  return 'company';
}

export function missionRoleForComposition(composition = {}) {
  const scout = sanitizeCount(composition.scout);
  const signal = sanitizeCount(composition.signal);
  const observer = sanitizeCount(composition.observer);
  const weapons = sanitizeCount(composition.weapons);

  if (scout >= 2 && signal >= 1) return MISSION_ROLES.RECON;
  if (observer >= 1 && signal >= 1) return MISSION_ROLES.OBSERVER;
  if (weapons >= 1) return MISSION_ROLES.SUPPORT;
  return MISSION_ROLES.SECURITY;
}

export function computeFormationCapabilities(composition = {}, leader = null) {
  const total = Math.max(1, Object.values(composition).reduce((sum, count) => sum + sanitizeCount(count), 0));
  const rifleman = countRole(composition, 'rifleman');
  const scout = countRole(composition, 'scout');
  const signal = countRole(composition, 'signal');
  const medic = countRole(composition, 'medic');
  const observer = countRole(composition, 'observer');
  const weapons = countRole(composition, 'weapons');
  const rating = clamp(Number(leader?.rating ?? 1), 1, 5);
  const trait = leader?.trait ?? LEADER_TRAITS.STEADY;
  const sizeDrag = Math.max(0, total - 6);

  const traitBonus = {
    recon: trait === LEADER_TRAITS.SCOUT ? 8 : trait === LEADER_TRAITS.CAREFUL ? 3 : 0,
    communication: trait === LEADER_TRAITS.SIGNAL ? 10 : trait === LEADER_TRAITS.STEADY ? 3 : 0,
    combat: trait === LEADER_TRAITS.ASSAULT ? 10 : trait === LEADER_TRAITS.STEADY ? 3 : 0,
    sustainment: trait === LEADER_TRAITS.CAREFUL ? 8 : trait === LEADER_TRAITS.STEADY ? 3 : 0,
    mobility: trait === LEADER_TRAITS.SCOUT ? 4 : trait === LEADER_TRAITS.CAREFUL ? -2 : 0
  };

  return {
    recon: roundedScore(30 + scout * 10 + observer * 8 + signal * 3 + rating * 2 + traitBonus.recon - sizeDrag * 0.8),
    communication: roundedScore(28 + signal * 14 + observer * 3 + rating * 3 + traitBonus.communication - sizeDrag * 0.3),
    combat: roundedScore(28 + rifleman * 4 + weapons * 13 + total * 0.7 + rating * 2 + traitBonus.combat),
    sustainment: roundedScore(34 + medic * 9 + signal * 2 + rating * 2 + traitBonus.sustainment - Math.max(0, total - 10) * 0.8),
    mobility: roundedScore(72 + scout * 5 + rating * 1.5 + traitBonus.mobility - total * 2.2 - weapons * 6)
  };
}

export function capabilityBand(score) {
  const value = roundedScore(score);
  if (value >= 75) return { label: '우수', tone: 'strong' };
  if (value >= 58) return { label: '양호', tone: 'good' };
  if (value >= 42) return { label: '보통', tone: 'fair' };
  return { label: '취약', tone: 'weak' };
}

export function unitTypeForMissionRole(missionRole) {
  if (missionRole === MISSION_ROLES.RECON || missionRole === MISSION_ROLES.OBSERVER) {
    return UNIT_TYPES.RECON;
  }
  return UNIT_TYPES.INFANTRY;
}

export function billetForCount(count) {
  if (count >= 13) return '소대장';
  if (count >= 6) return '분대장';
  return '팀장';
}

export function buildUnitsFromDrafts(drafts = [], pool = DEFAULT_POOL, { startSectorId = MISSION_START_SECTOR } = {}) {
  const normalizedDrafts = normalizeDrafts(drafts, pool).filter((draft) => draftPersonnelCount(draft) > 1);

  return normalizedDrafts.map((draft) => {
    const personnelCount = draftPersonnelCount(draft);
    const composition = {
      leader: 1,
      ...NON_LEADER_ROLE_IDS.reduce((acc, roleId) => {
        acc[roleId] = sanitizeCount(draft.composition?.[roleId]);
        return acc;
      }, {})
    };
    const missionRole = missionRoleForComposition(composition);
    const type = unitTypeForMissionRole(missionRole);
    const leader = leaderById(draft.leaderId);
    const maxHealth = Math.max(40, personnelCount * 10);
    const capabilities = computeFormationCapabilities(composition, leader);

    return {
      type,
      name: draft.name,
      sectorId: startSectorId,
      originSectorId: startSectorId,
      missionRole,
      composition,
      echelon: echelonForCount(personnelCount),
      maxHealth,
      health: maxHealth,
      level: leader.rating,
      capabilities,
      command: '대기',
      cohesion: clamp(56 + leader.rating * 4, 0, 100),
      cohesionTarget: 88,
      leader: {
        id: leader.id,
        name: leader.name,
        billet: billetForCount(personnelCount),
        trait: leader.trait,
        rating: leader.rating
      },
      meta: {
        formedFromPool: true,
        formation: {
          stableMinutes: 0,
          reorgCooldownMinutes: 6 * 60,
          lastReorgReason: 'initial-formation',
          lastReorgTime: 0
        }
      }
    };
  });
}

export function buildDefaultFormationUnits() {
  const pool = normalizePool(DEFAULT_POOL);
  return buildUnitsFromDrafts(normalizeDrafts([], pool), pool);
}
