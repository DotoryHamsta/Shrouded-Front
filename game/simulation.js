// game/simulation.js
// Core simulation engine for Shrouded Front.
//
// This file advances time, moves units, drains food, handles recon progress,
// creates reports, and resolves lightweight combat.

import { MAP, getSectorById } from '../data/map.js?v=27';
import { Sector } from './sector.js?v=27';
import { MINUTES_PER_HOUR, Report, REPORT_CLASS, REPORT_KINDS } from './report.js?v=28';
import {
  Unit,
  UNIT_TYPES,
  UNIT_STATUS,
  LEADER_TRAITS,
  isUnitAlive,
  unitLabel
} from './unit.js?v=29';

export const SIM_MINUTES_PER_TICK = 15;

const TERRAIN_SETUP_MINUTES = Object.freeze({
  plain: 4 * MINUTES_PER_HOUR,
  ridge: 5 * MINUTES_PER_HOUR,
  valley: 5 * MINUTES_PER_HOUR,
  river: 5 * MINUTES_PER_HOUR,
  forest: 6 * MINUTES_PER_HOUR,
  swamp: 8 * MINUTES_PER_HOUR
});

const TERRAIN_MOVE_MINUTES = Object.freeze({
  plain: 90,
  ridge: 150,
  valley: 150,
  river: 180,
  forest: 210,
  swamp: 270
});

const REPORT_INTERVAL_MINUTES_BY_LEVEL = Object.freeze([
  4 * MINUTES_PER_HOUR,
  3 * MINUTES_PER_HOUR,
  2 * MINUTES_PER_HOUR,
  90,
  60
]);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pick(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function roundToTickMinutes(minutes) {
  const safe = Number.isFinite(minutes) ? Math.max(SIM_MINUTES_PER_TICK, minutes) : SIM_MINUTES_PER_TICK;
  return Math.max(SIM_MINUTES_PER_TICK, Math.round(safe / SIM_MINUTES_PER_TICK) * SIM_MINUTES_PER_TICK);
}

function formatSizeLabel(size) {
  if (size >= 100) return 'battalion';
  if (size >= 40) return 'company';
  if (size >= 20) return 'platoon';
  if (size >= 8) return 'section';
  return 'small';
}

function reportClassFromLevel(level) {
  if (level >= 4) return REPORT_CLASS.A;
  if (level >= 3) return REPORT_CLASS.B;
  if (level >= 2) return REPORT_CLASS.C;
  return REPORT_CLASS.D;
}

function refineSizeByLevel(rawSize, level) {
  const precision = [20, 10, 5, 2, 1][Math.min(level - 1, 4)];
  return Math.max(1, Math.round(rawSize / precision) * precision);
}

function clonePlainObject(value) {
  if (!value || typeof value !== 'object') return value;
  return JSON.parse(JSON.stringify(value));
}

export class Simulation {
  constructor({ map = MAP, units = [], reports = [], commAnchors = [] } = {}) {
    this.map = map;
    this.sectors = new Map();
    this.units = new Map();
    this.reports = [];
    this.operations = [];
    this.turn = 0;
    this.time = 0;
    this.paused = false;
    this.speed = 1;
    this.historyLimit = 250;
    this.defaultSupplySectorIds = [];
    // Communication anchors (always-on transmitters): HQ, forward command, etc.
    // Used by the comm system to determine which units are connected.
    this.commAnchors = Array.isArray(commAnchors) ? commAnchors.map((a) => ({ ...a })) : [];

    this._buildSectors();
    this._ingestUnits(units);
    this._ingestReports(reports);
    this._deriveSupplyNodes();
  }

  static bootstrap(map = MAP) {
    return new Simulation({ map });
  }

  _buildSectors() {
    this.sectors.clear();
    const rawSectors = Array.isArray(this.map?.sectors) ? this.map.sectors : [];
    for (const raw of rawSectors) {
      const sector = raw instanceof Sector
        ? raw.clone()
        : new Sector({
          ...raw,
          hiddenEnemySummary: raw.hiddenEnemySummary ?? raw.enemySummary ?? null,
          enemySummary: null,
          alert: false,
          alertLabel: null,
          reportSummary: '미탐색',
          control: 'unseen',
          reconProgress: raw.reconProgress ?? 0
        });
      this.sectors.set(sector.id, sector);
    }
  }

  _ingestUnits(units) {
    const list = Array.isArray(units) ? units : [];
    for (const item of list) {
      const unit = item instanceof Unit ? item : new Unit(item);
      this.units.set(unit.id, unit);
      this._attachUnitToSector(unit, unit.sectorId);
    }
  }

  _ingestReports(reports) {
    const list = Array.isArray(reports) ? reports : [];
    for (const item of list) {
      const report = item instanceof Report ? item : new Report(item);
      this.reports.push(report);
    }
    this._trimReports();
  }

  _deriveSupplyNodes() {
    const ids = new Set(
      this.commAnchors
        .map((anchor) => anchor.sectorId)
        .filter((id) => this.sectors.has(id))
    );

    for (const sector of this.sectors.values()) {
      if (sector.owner === 'player' || sector.reportSummary === '아군 보급 거점') {
        ids.add(sector.id);
      }
    }

    this.defaultSupplySectorIds = [...ids];

    if (this.defaultSupplySectorIds.length === 0) {
      const first = [...this.sectors.keys()][0];
      if (first) this.defaultSupplySectorIds.push(first);
    }

    for (const sectorId of this.defaultSupplySectorIds) {
      const sector = this.getSector(sectorId);
      if (!sector) continue;
      sector.setOwner('player');
      sector.setControl('visible');
      if (!sector.enemySummary) sector.setReportSummary('아군 보급 거점');
    }
  }

  _trimReports() {
    if (this.reports.length > this.historyLimit) {
      this.reports = this.reports.slice(0, this.historyLimit);
    }
  }

  _attachUnitToSector(unit, sectorId) {
    if (!sectorId) return;
    const sector = this.sectors.get(sectorId);
    if (!sector) return;
    sector.addOccupant(unit.id);
  }

  _detachUnitFromSector(unit, sectorId) {
    if (!sectorId) return;
    const sector = this.sectors.get(sectorId);
    if (!sector) return;
    sector.removeOccupant(unit.id);
  }

  setPaused(paused) {
    this.paused = Boolean(paused);
    return this;
  }

  togglePaused() {
    this.paused = !this.paused;
    return this.paused;
  }

  setSpeed(speed) {
    const n = Number(speed);
    if (Number.isFinite(n) && n > 0) {
      this.speed = n;
    }
    return this;
  }

  addUnit(unit) {
    const instance = unit instanceof Unit ? unit : new Unit(unit);
    this.units.set(instance.id, instance);
    this._attachUnitToSector(instance, instance.sectorId);
    return instance;
  }

  removeUnit(unitId) {
    const unit = this.units.get(unitId);
    if (!unit) return false;
    this._detachUnitFromSector(unit, unit.sectorId);
    this.units.delete(unitId);
    return true;
  }

  addReport(report) {
    const instance = report instanceof Report ? report : new Report(report);
    this.reports.unshift(instance);
    this._trimReports();
    return instance;
  }

  addOperation(operation) {
    const op = {
      id: `OP-${String(this.operations.length + 1).padStart(4, '0')}`,
      turn: this.turn,
      time: this.time,
      ...clonePlainObject(operation)
    };
    this.operations.unshift(op);
    if (this.operations.length > 50) this.operations.length = 50;
    return op;
  }

  getSector(sectorId) {
    return this.sectors.get(sectorId) ?? null;
  }

  getUnit(unitId) {
    return this.units.get(unitId) ?? null;
  }

  listSectors() {
    return [...this.sectors.values()];
  }

  listUnits() {
    return [...this.units.values()];
  }

  listReports() {
    return [...this.reports];
  }

  listOperations() {
    return [...this.operations];
  }

  getState() {
    return {
      turn: this.turn,
      time: this.time,
      paused: this.paused,
      speed: this.speed,
      sectors: this.listSectors().map((s) => s.toJSON()),
      units: this.listUnits().map((u) => u.toJSON()),
      reports: this.listReports().map((r) => r.toJSON()),
      operations: this.listOperations().map((op) => clonePlainObject(op)),
      commAnchors: this.commAnchors.map((a) => ({ ...a })),
      supplySectorIds: [...this.defaultSupplySectorIds]
    };
  }

  _sectorTerrainCost(sector) {
    if (!sector) return 1;
    const penalties = {
      valley: 1.2,
      ridge: 1.4,
      forest: 1.5,
      swamp: 1.8,
      river: 1.6,
      plain: 1.0
    };
    return penalties[sector.terrain] ?? 1.1;
  }

  _cohesionDelayFactor(unit, maxPenalty = 0.28) {
    const cohesion = Number.isFinite(unit?.cohesion) ? unit.cohesion : 70;
    const penalty = Math.max(0, 72 - cohesion) / 72 * maxPenalty;
    const bonus = Math.max(0, cohesion - 86) / 14 * 0.04;
    return clamp(1 + penalty - bonus, 0.94, 1 + maxPenalty);
  }

  _leaderFactor(unit, domain) {
    const trait = unit?.leaderTrait;
    if (domain === 'reconSetup' && trait === LEADER_TRAITS.SCOUT) return 0.9;
    if (domain === 'reconReport' && trait === LEADER_TRAITS.SIGNAL) return 0.88;
    if (domain === 'reconReport' && trait === LEADER_TRAITS.SCOUT) return 0.94;
    if (domain === 'movement' && trait === LEADER_TRAITS.CAREFUL) return 1.05;
    if (domain === 'movement' && trait === LEADER_TRAITS.STEADY) return 0.98;
    if (domain === 'sustainment' && trait === LEADER_TRAITS.CAREFUL) return 0.94;
    if (domain === 'sustainment' && trait === LEADER_TRAITS.ASSAULT) return 1.04;
    return 1;
  }

  _unitActivity(unit) {
    const moving = Boolean(unit?.targetSectorId && unit.sectorId !== unit.targetSectorId);
    const reconning = unit?.type === UNIT_TYPES.RECON && String(unit.command ?? '').includes('정찰');
    const returning = unit?.status === UNIT_STATUS.RETURNING || String(unit?.command ?? '').includes('복귀');
    const engaged = unit?.status === UNIT_STATUS.ENGAGED || unit?.isInCombat;
    if (engaged) return 'engaged';
    if (returning) return 'returning';
    if (moving) return 'moving';
    if (reconning) return 'recon';
    return 'idle';
  }

  _tickUnitCohesion(unit) {
    if (!unit || !unit.isAlive) return;
    const activity = this._unitActivity(unit);
    unit.recoverCohesion(SIM_MINUTES_PER_TICK, {
      activity,
      atSupply: this._isSupplySector(unit.sectorId)
    });
  }

  _setupMinutes(sector, unit) {
    const baseMinutes = TERRAIN_SETUP_MINUTES[sector?.terrain] ?? (5 * MINUTES_PER_HOUR);
    const reduction = (Math.min(unit.level, 5) - 1) * 0.12;
    const cohesionDelay = this._cohesionDelayFactor(unit, 0.32);
    const leaderFactor = this._leaderFactor(unit, 'reconSetup');
    return roundToTickMinutes(Math.max(2 * MINUTES_PER_HOUR, baseMinutes * (1 - reduction) * cohesionDelay * leaderFactor));
  }

  _reportIntervalMinutes(unit) {
    const base = REPORT_INTERVAL_MINUTES_BY_LEVEL[Math.min(unit.level - 1, REPORT_INTERVAL_MINUTES_BY_LEVEL.length - 1)];
    const cohesionDelay = this._cohesionDelayFactor(unit, 0.22);
    const leaderFactor = this._leaderFactor(unit, 'reconReport');
    return roundToTickMinutes(base * cohesionDelay * leaderFactor);
  }

  _movementMinutesToEnter(sector, unit) {
    const baseMinutes = TERRAIN_MOVE_MINUTES[sector?.terrain] ?? 150;
    const moveFactor = 2 / Math.max(1, unit?.move ?? 2);
    const cohesionDelay = this._cohesionDelayFactor(unit, 0.2);
    const leaderFactor = this._leaderFactor(unit, 'movement');
    return roundToTickMinutes(Math.max(30, baseMinutes * moveFactor * cohesionDelay * leaderFactor));
  }

  _pathToTarget(fromId, targetId) {
    if (!fromId || !targetId || !this.sectors.has(fromId) || !this.sectors.has(targetId)) return null;
    if (fromId === targetId) return [fromId];

    const visited = new Set([fromId]);
    const queue = [fromId];
    const cameFrom = new Map();

    while (queue.length > 0) {
      const current = queue.shift();
      const neighbors = this.getSector(current)?.neighbors ?? [];

      for (const next of neighbors) {
        if (visited.has(next) || !this.sectors.has(next)) continue;
        visited.add(next);
        cameFrom.set(next, current);

        if (next === targetId) {
          const path = [targetId];
          let step = targetId;
          while (step !== fromId) {
            step = cameFrom.get(step);
            if (!step) return null;
            path.unshift(step);
          }
          return path;
        }

        queue.push(next);
      }
    }

    return null;
  }

  _estimateTravel(unit, fromId, targetId, activity = 'moving') {
    const path = this._pathToTarget(fromId, targetId);
    if (!unit || !path) return null;

    let minutes = 0;
    let foodHours = 0;
    for (const sectorId of path.slice(1)) {
      const sector = this.getSector(sectorId);
      const legMinutes = this._movementMinutesToEnter(sector, unit);
      minutes += legMinutes;
      foodHours += this._foodDrainForMinutes(unit, sector, activity, legMinutes);
    }

    return { path, minutes, foodHours };
  }

  _nearestSupplySectorId(fromSectorId) {
    const available = this.defaultSupplySectorIds.length > 0
      ? this.defaultSupplySectorIds
      : [...this.sectors.keys()];

    if (!available.length) return null;

    if (!fromSectorId || !this.sectors.has(fromSectorId)) return available[0] ?? null;
    if (available.includes(fromSectorId)) return fromSectorId;

    const dist = this._hopDistanceFrom([fromSectorId]);
    let best = null;
    for (const sectorId of available) {
      const hops = dist.get(sectorId);
      if (hops === undefined) continue;
      if (!best || hops < best.hops) best = { sectorId, hops };
    }
    return best?.sectorId ?? available[0] ?? null;
  }

  nearestSupplySectorId(fromSectorId) {
    return this._nearestSupplySectorId(fromSectorId);
  }

  _isSupplySector(sectorId) {
    return this.defaultSupplySectorIds.includes(sectorId);
  }

  estimateMoveOrder(unitId, targetSectorId) {
    const unit = this.getUnit(unitId);
    if (!unit || !targetSectorId) return null;
    const travel = this._estimateTravel(unit, unit.sectorId, targetSectorId, 'moving');
    if (!travel) return null;
    return {
      targetSectorId,
      path: travel.path,
      travelMinutes: travel.minutes,
      foodCostHours: travel.foodHours,
      marginFoodHours: unit.food - travel.foodHours
    };
  }

  estimateReturnOrder(unitId, fromSectorId = null) {
    const unit = this.getUnit(unitId);
    if (!unit) return null;
    const origin = fromSectorId ?? unit.sectorId;
    const targetSectorId = this._nearestSupplySectorId(origin);
    if (!targetSectorId) return null;
    const travel = this._estimateTravel(unit, origin, targetSectorId, 'returning');
    if (!travel) return null;
    return {
      targetSectorId,
      path: travel.path,
      returnMinutes: travel.minutes,
      foodCostHours: travel.foodHours
    };
  }

  estimateReconOrder(unitId, targetSectorId, { durationMinutes = 0 } = {}) {
    const unit = this.getUnit(unitId);
    const targetSector = this.getSector(targetSectorId);
    if (!unit || unit.type !== UNIT_TYPES.RECON || !targetSector) return null;

    const outbound = this._estimateTravel(unit, unit.sectorId, targetSectorId, 'moving');
    const inbound = this.estimateReturnOrder(unitId, targetSectorId);
    if (!outbound || !inbound) return null;

    const setupMinutes = this._setupMinutes(targetSector, unit);
    const onStationMinutes = Math.max(0, durationMinutes);
    const setupFoodHours = this._foodDrainForMinutes(unit, targetSector, 'recon', setupMinutes);
    const onStationFoodHours = this._foodDrainForMinutes(unit, targetSector, 'recon', onStationMinutes);
    const totalFoodCostHours = outbound.foodHours + setupFoodHours + onStationFoodHours + inbound.foodCostHours;
    const marginFoodHours = unit.food - totalFoodCostHours;
    const targetReconRate = this._foodDrainPerHour(unit, targetSector, 'recon');
    const safeOnStationMinutes = targetReconRate > 0
      ? Math.max(0, ((unit.food - outbound.foodHours - setupFoodHours - inbound.foodCostHours) / targetReconRate) * MINUTES_PER_HOUR)
      : 0;

    return {
      targetSectorId,
      returnSectorId: inbound.targetSectorId,
      path: outbound.path,
      returnPath: inbound.path,
      travelMinutes: outbound.minutes,
      setupMinutes,
      firstReportMinutes: outbound.minutes + setupMinutes,
      reportIntervalMinutes: this._reportIntervalMinutes(unit),
      onStationMinutes,
      returnMinutes: inbound.returnMinutes,
      totalFoodCostHours,
      marginFoodHours,
      safeOnStationMinutes: Math.max(0, Math.round(safeOnStationMinutes)),
      risk: marginFoodHours < 0 ? 'insufficient' : marginFoodHours < 12 ? 'tight' : 'safe'
    };
  }

  // Breadth-first search over the sector adjacency graph (sector.neighbors).
  // Returns the id of the first hop from `fromId` along a shortest path to
  // `targetId`, or null if unreachable. Movement follows real map geography
  // rather than the order sectors happen to appear in the data array.
  _nextHopTowards(fromId, targetId) {
    if (fromId === targetId) return null;

    const visited = new Set([fromId]);
    const queue = [fromId];
    const cameFrom = new Map();

    while (queue.length > 0) {
      const current = queue.shift();
      const sector = this.getSector(current);
      const neighbors = sector?.neighbors ?? [];

      for (const next of neighbors) {
        if (visited.has(next) || !this.sectors.has(next)) continue;
        visited.add(next);
        cameFrom.set(next, current);

        if (next === targetId) {
          // Walk back to the hop directly adjacent to fromId.
          let step = next;
          while (cameFrom.get(step) !== fromId) {
            step = cameFrom.get(step);
            if (step === undefined) return null;
          }
          return step;
        }

        queue.push(next);
      }
    }

    return null;
  }

  // Multi-source BFS over the sector graph: returns a Map of sectorId -> hop
  // distance from the nearest source sector.
  _hopDistanceFrom(sourceSectorIds) {
    const dist = new Map();
    const queue = [];
    for (const id of sourceSectorIds) {
      if (this.sectors.has(id) && !dist.has(id)) {
        dist.set(id, 0);
        queue.push(id);
      }
    }
    while (queue.length > 0) {
      const current = queue.shift();
      const neighbors = this.getSector(current)?.neighbors ?? [];
      for (const next of neighbors) {
        if (!this.sectors.has(next) || dist.has(next)) continue;
        dist.set(next, dist.get(current) + 1);
        queue.push(next);
      }
    }
    return dist;
  }

  // Communication range in sector hops. A unit is connected if it can reach a
  // comm anchor through a relay chain of connected units, each link within
  // range. Positioning units as relays extends the network.
  get commRange() {
    return this._commRange ?? 2;
  }

  // Recomputes which units are connected to the comm network and flushes any
  // buffered reports for units that just reconnected. Run once per tick before
  // units act.
  _recomputeComm() {
    const anchors = this.commAnchors.map((a) => a.sectorId).filter((id) => this.sectors.has(id));
    const aliveUnits = this.listUnits().filter((u) => isUnitAlive(u));
    const R = this.commRange;

    // Relay-chain fixpoint: seed sources with anchors, then iteratively connect
    // any unit within R hops of a current source and add its sector as a source.
    const sources = new Set(anchors);
    const connected = new Set();
    let changed = true;
    while (changed) {
      changed = false;
      const dist = this._hopDistanceFrom(sources);
      for (const unit of aliveUnits) {
        if (connected.has(unit.id)) continue;
        const d = dist.get(unit.sectorId);
        if (d !== undefined && d <= R) {
          connected.add(unit.id);
          sources.add(unit.sectorId);
          changed = true;
        }
      }
    }

    for (const unit of aliveUnits) {
      const nowConnected = connected.has(unit.id);
      const wasConnected = unit.commConnected;
      unit.commConnected = nowConnected;
      if (nowConnected && !wasConnected) {
        this._flushCommBuffer(unit);
      }
    }
  }

  // Delivers a report now if the unit is connected, otherwise buffers it on the
  // unit (along with the sector-state mutation) until comms are restored.
  // `apply` performs the shared-knowledge update (enemy summary, alert, etc.).
  _deliverOrBuffer(unit, report, apply) {
    if (unit.commConnected) {
      if (typeof apply === 'function') apply();
      this.addReport(report);
      return;
    }
    if (!unit.meta || typeof unit.meta !== 'object') unit.meta = {};
    if (!Array.isArray(unit.meta.commBuffer)) unit.meta.commBuffer = [];
    unit.meta.commBuffer.push({ report, apply });
  }

  // Flushes a reconnected unit's buffered reports: applies their delayed
  // sector updates and posts the reports, tagged as delayed.
  _flushCommBuffer(unit) {
    const buffer = Array.isArray(unit.meta?.commBuffer) ? unit.meta.commBuffer : [];
    if (buffer.length === 0) return;

    for (const entry of buffer) {
      if (typeof entry.apply === 'function') entry.apply();
      const report = entry.report;
      if (report) {
        if (!Array.isArray(report.tags)) report.tags = [];
        if (!report.tags.includes('delayed')) report.tags.push('delayed');
        report.summary = `${report.summary ?? '보고'} (지연 전달)`;
        this.addReport(report);
      }
    }

    this.addReport(new Report({
      time: this.time,
      source: 'HQ',
      sectorId: unit.sectorId,
      sectorCode: this.getSector(unit.sectorId)?.code ?? null,
      kind: REPORT_KINDS.STATUS,
      classTag: REPORT_CLASS.C,
      summary: '통신 복구',
      body: `${unit.name}\n통신 재연결 · 밀린 보고 ${buffer.length}건 수신`,
      tags: ['comm', 'reconnect'],
      meta: { unitId: unit.id, flushed: buffer.length }
    }));

    unit.meta.commBuffer = [];
  }

  _moveUnitTowards(unit, targetSectorId) {
    if (!unit || !targetSectorId || !unit.isAlive) return false;
    if (unit.sectorId === targetSectorId) return false;

    const currentSector = this.getSector(unit.sectorId);
    const targetSector = this.getSector(targetSectorId);
    if (!currentSector || !targetSector) return false;

    const nextSectorId = this._nextHopTowards(unit.sectorId, targetSectorId);
    const nextSector = nextSectorId ? this.getSector(nextSectorId) : null;
    if (!nextSector) return false;

    const moveCost = this._movementMinutesToEnter(nextSector, unit);
    unit.moveBuffer += SIM_MINUTES_PER_TICK;

    if (unit.moveBuffer < moveCost) {
      return false;
    }

    unit.moveBuffer = 0;
    this._detachUnitFromSector(unit, unit.sectorId);
    unit.setSector(nextSector.id);
    unit.lastKnownSectorId = nextSector.id;
    this._attachUnitToSector(unit, nextSector.id);

    // Movement updates only reach HQ when the unit is connected.
    if (unit.commConnected) {
      this.addReport(new Report({
        time: this.time,
        source: unit.name,
        sectorId: nextSector.id,
        sectorCode: nextSector.code,
        kind: REPORT_KINDS.STATUS,
        classTag: reportClassFromLevel(unit.level),
        summary: '이동 보고',
        body: `${unit.name}\n${currentSector.code} → ${nextSector.code}`,
        tags: ['movement', unit.type],
        meta: {
          unitId: unit.id,
          from: currentSector.id,
          to: nextSector.id,
          terrain: nextSector.terrain
        }
      }));
    }

    return true;
  }

  _foodDrainPerHour(unit, sector, activity = 'idle') {
    if (activity === 'idle') return 0;

    const terrainMultiplier = 0.9 + this._sectorTerrainCost(sector) * 0.1;
    const base = unit.type === UNIT_TYPES.ARTILLERY
      ? 1.15
      : unit.type === UNIT_TYPES.INFANTRY
        ? 1.05
        : 1.0;
    const activityMultiplier = {
      moving: 1.35,
      recon: 1.0,
      returning: 1.15,
      engaged: 2.2
    }[activity] ?? 1.0;

    return base * terrainMultiplier * activityMultiplier * this._leaderFactor(unit, 'sustainment');
  }

  _foodDrainForMinutes(unit, sector, activity, minutes) {
    return this._foodDrainPerHour(unit, sector, activity) * (Math.max(0, minutes) / MINUTES_PER_HOUR);
  }

  _drainFood(unit, sector) {
    const moving = Boolean(unit.targetSectorId && unit.sectorId !== unit.targetSectorId);
    const reconning = unit.type === UNIT_TYPES.RECON && String(unit.command ?? '').includes('정찰');
    const returning = unit.status === UNIT_STATUS.RETURNING || String(unit.command ?? '').includes('복귀');
    const engaged = unit.status === UNIT_STATUS.ENGAGED || unit.isInCombat;
    const activity = engaged
      ? 'engaged'
      : returning
        ? 'returning'
        : moving
          ? 'moving'
          : reconning
            ? 'recon'
            : 'idle';
    if (activity === 'idle') return;

    unit.applyFoodDrain(this._foodDrainForMinutes(unit, sector, activity, SIM_MINUTES_PER_TICK));

    if (unit.food <= 0) {
      unit.setStatus(UNIT_STATUS.EXHAUSTED);
    } else if (unit.isHungry && unit.status === UNIT_STATUS.ACTIVE) {
      unit.setStatus(UNIT_STATUS.HUNGRY);
    } else if (unit.status === UNIT_STATUS.HUNGRY) {
      unit.setStatus(UNIT_STATUS.ACTIVE);
    }
  }

  _completeResupply(unit) {
    if (!unit || !unit.isAlive) return;
    const sector = this.getSector(unit.sectorId);
    const shouldReport = unit.status === UNIT_STATUS.RETURNING
      || unit.status === UNIT_STATUS.EXHAUSTED
      || unit.status === UNIT_STATUS.HUNGRY
      || Boolean(unit.meta?.returnTargetSectorId);

    unit.setFood(unit.maxFood);
    if (unit.type === UNIT_TYPES.ARTILLERY) unit.refillAmmo();
    unit.stopRetreat();
    unit.setStatus(UNIT_STATUS.ACTIVE);
    unit.setCommand('대기');
    unit.setTargetSector(null);
    if (!unit.meta || typeof unit.meta !== 'object') unit.meta = {};
    unit.meta.returnTargetSectorId = null;
    unit.meta.reconMission = null;
    unit.meta.reconState = null;

    if (shouldReport) {
      this.addReport(new Report({
        time: this.time,
        source: 'HQ',
        sectorId: unit.sectorId,
        sectorCode: sector?.code ?? null,
        kind: REPORT_KINDS.SUPPLY,
        classTag: REPORT_CLASS.C,
        summary: '보급 완료',
        body: `${unit.name}\n${sector?.code ?? unit.sectorId}에서 식량 및 탄약 재보급`,
        tags: ['supply', 'resupply'],
        meta: { unitId: unit.id }
      }));
    }
  }

  _handleSupplyReturn(unit) {
    if (!unit || !unit.isAlive) return false;
    const fallback = unit.meta?.returnTargetSectorId
      ?? this._nearestSupplySectorId(unit.sectorId)
      ?? unit.originSectorId
      ?? unit.sectorId;

    if (this._isSupplySector(unit.sectorId) && unit.sectorId === fallback) {
      this._completeResupply(unit);
      return true;
    }

    if (fallback && unit.sectorId !== fallback) {
      if (!unit.meta || typeof unit.meta !== 'object') unit.meta = {};
      unit.meta.returnTargetSectorId = fallback;
      unit.setTargetSector(fallback);
      unit.setCommand('복귀');
      unit.startRetreat();
      this._moveUnitTowards(unit, fallback);
      return true;
    }

    if (unit.sectorId === fallback) {
      this._completeResupply(unit);
      return true;
    }

    return false;
  }

  _tickRecon(unit, sector) {
    if (unit.type !== UNIT_TYPES.RECON || !sector) return;
    if (!unit.meta || typeof unit.meta !== 'object') unit.meta = {};

    const rs = unit.meta.reconState;
    if (!rs || rs.sectorId !== sector.id) {
      const setupTotal = this._setupMinutes(sector, unit);
      const mission = unit.meta.reconMission?.targetSectorId === sector.id
        ? unit.meta.reconMission
        : null;
      unit.meta.reconState = {
        sectorId: sector.id,
        setupTotal,
        setupLeft: setupTotal,
        setupDone: false,
        minutesSinceReport: 0,
        onStationMinutes: 0,
        missionDurationMinutes: mission?.durationMinutes ?? null
      };
    }

    const state = unit.meta.reconState;

    if (!state.setupDone) {
      state.setupLeft = Math.max(0, state.setupLeft - SIM_MINUTES_PER_TICK);
      const progress = Math.round((1 - state.setupLeft / state.setupTotal) * 99);
      sector.setReconProgress(progress);
      sector.setLastKnownTurn(this.turn);
      unit.setReconProgress(progress);
      sector.setReportSummary('초기 정찰 중');

      if (state.setupLeft <= 0) {
        state.setupDone = true;
        state.minutesSinceReport = 0;
        state.onStationMinutes = 0;
        sector.setReconProgress(100);
        unit.setReconProgress(100);
        this._generateReconReport(unit, sector);
      }
    } else {
      state.onStationMinutes = (state.onStationMinutes ?? 0) + SIM_MINUTES_PER_TICK;
      state.minutesSinceReport = (state.minutesSinceReport ?? 0) + SIM_MINUTES_PER_TICK;
      if (state.minutesSinceReport >= this._reportIntervalMinutes(unit)) {
        state.minutesSinceReport = 0;
        this._generateReconReport(unit, sector);
      }
      if (state.missionDurationMinutes && state.onStationMinutes >= state.missionDurationMinutes) {
        this._completeReconMission(unit, sector);
      }
    }
  }

  _completeReconMission(unit, sector) {
    const targetSectorId = this._nearestSupplySectorId(unit.sectorId);
    if (!targetSectorId) return;

    if (!unit.meta || typeof unit.meta !== 'object') unit.meta = {};
    unit.meta.reconState = null;
    unit.meta.reconMission = null;
    unit.meta.returnTargetSectorId = targetSectorId;
    unit.setCommand('복귀');
    unit.setTargetSector(targetSectorId);
    unit.startRetreat();

    const report = new Report({
      time: this.time,
      source: unit.name,
      sectorId: sector.id,
      sectorCode: sector.code,
      kind: REPORT_KINDS.STATUS,
      classTag: REPORT_CLASS.C,
      summary: '정찰 임무 종료',
      body: `${sector.code}\n계획 체류 완료, ${this.getSector(targetSectorId)?.code ?? targetSectorId} 보급 복귀`,
      tags: ['recon', 'returning'],
      meta: {
        unitId: unit.id,
        targetSectorId
      }
    });
    this._deliverOrBuffer(unit, report);
  }

  _generateReconReport(unit, sector) {
    const classTag = reportClassFromLevel(unit.level);
    const hiddenEnemy = sector.hiddenEnemySummary ?? sector.enemySummary;

    // The shared-knowledge update (enemy summary, alert, control) is captured in
    // an `apply` closure so it only takes effect when the report is actually
    // delivered to HQ — buffered while the unit is out of comms.
    if (!hiddenEnemy) {
      const report = new Report({
        time: this.time,
        source: unit.name,
        sectorId: sector.id,
        sectorCode: sector.code,
        kind: REPORT_KINDS.RECON,
        classTag,
        summary: '정찰 보고',
        body: `${sector.code}\n적 미확인`,
        tags: ['recon', 'no-contact'],
        meta: { unitId: unit.id, sectorTerrain: sector.terrain }
      });
      this._deliverOrBuffer(unit, report, () => {
        sector.setAlert(false);
        sector.setControl('visible');
        sector.setReportSummary('적 미확인');
      });
      return;
    }

    const rawSize = typeof hiddenEnemy.size === 'number' ? hiddenEnemy.size : 0;
    const size = refineSizeByLevel(rawSize, unit.level);
    const sizeLabel = formatSizeLabel(size);
    const enemy = { ...clonePlainObject(hiddenEnemy), size, sizeLabel, class: classTag };

    const report = new Report({
      time: this.time,
      source: unit.name,
      sectorId: sector.id,
      sectorCode: sector.code,
      kind: REPORT_KINDS.RECON,
      classTag,
      summary: '정찰 보고',
      body: [sector.code, `Enemy ${enemy.type}`, `${size} (${sizeLabel})`, `Class ${classTag}`].join('\n'),
      enemySummary: enemy,
      alert: true,
      pinned: true,
      tags: ['recon', enemy.type, classTag],
      meta: { unitId: unit.id, sectorTerrain: sector.terrain }
    });
    this._deliverOrBuffer(unit, report, () => {
      sector.setEnemySummary(enemy);
      sector.setAlert(true, `적 ${enemy.type} 보고`);
      sector.setReportSummary(`적 ${enemy.type} 보고`);
      sector.setControl('revealed');
    });
  }

  _resolveCombat(attacker, sector) {
    if (!attacker || !sector || !attacker.isAlive) return;
    const enemy = sector.enemySummary;
    if (!enemy) return;

    attacker.startCombat();

    const attackLow = Math.max(1, Math.round(attacker.attackMin * attacker.combatMultiplier));
    const attackHigh = Math.max(attackLow, Math.round(attacker.attackMax * attacker.combatMultiplier));
    const attackRoll = randomInt(attackLow, attackHigh);

    const enemyBase = enemy.size >= 80 ? 12 : enemy.size >= 40 ? 9 : enemy.size >= 20 ? 7 : 5;
    const enemyRoll = randomInt(1, enemyBase);

    const attackerLoss = Math.max(0, enemyRoll - Math.floor(attackRoll * 0.25));
    const enemyLoss = Math.max(0, attackRoll - Math.floor(enemyRoll * 0.35));

    attacker.applyDamage(attackerLoss);
    enemy.size = Math.max(0, enemy.size - enemyLoss);

    this.addReport(new Report({
      time: this.time,
      source: attacker.name,
      sectorId: sector.id,
      sectorCode: sector.code,
      kind: REPORT_KINDS.COMBAT,
      classTag: enemy.class ?? REPORT_CLASS.B,
      summary: '교전 보고',
      body: [
        `${attacker.name} (${attackRoll}) vs Enemy ${enemy.type} (${enemyRoll})`,
        `아군 피해: ${attackerLoss}`,
        `적 피해: ${enemyLoss}`
      ].join('\n'),
      enemySummary: clonePlainObject(enemy),
      alert: true,
      pinned: true,
      tags: ['combat', attacker.type, enemy.type],
      meta: {
        attackerId: attacker.id,
        sectorId: sector.id,
        enemySizeAfter: enemy.size
      }
    }));

    if (enemy.size <= 0) {
      sector.clearEnemySummary();
      sector.setAlert(false);
      sector.setReportSummary('지역 안정화');
      this.addReport(new Report({
        time: this.time,
        source: 'HQ',
        sectorId: sector.id,
        sectorCode: sector.code,
        kind: REPORT_KINDS.STATUS,
        classTag: REPORT_CLASS.C,
        summary: '적 후퇴/붕괴',
        body: `${sector.code}\n적 전력 소멸 또는 후퇴`,
        tags: ['combat', 'enemy-neutralized'],
        meta: {
          unitId: attacker.id,
          sectorId: sector.id
        }
      }));
    } else if (enemy.size < 8) {
      sector.setReportSummary('적 전력 잔존 소규모');
      sector.setAlert(true, `적 잔존 ${enemy.size}`);
    }

    if (attacker.health <= 0) {
      attacker.setStatus(UNIT_STATUS.DEAD);
      this._detachUnitFromSector(attacker, attacker.sectorId);
      this.addReport(new Report({
        time: this.time,
        source: 'HQ',
        sectorId: sector.id,
        sectorCode: sector.code,
        kind: REPORT_KINDS.COMBAT,
        classTag: REPORT_CLASS.B,
        summary: '아군 손실',
        body: `${attacker.name} 소실`,
        tags: ['loss', attacker.type],
        meta: { unitId: attacker.id }
      }));
    }

    attacker.stopCombat();
  }

  _decideUnitAction(unit) {
    if (!unit || !isUnitAlive(unit)) return;

    const sector = this.getSector(unit.sectorId);
    if (!sector) return;

    if (this._isSupplySector(unit.sectorId) && unit.food < unit.maxFood && !unit.targetSectorId) {
      this._completeResupply(unit);
    }

    if (!unit.meta?.ignoreSupply) {
      this._drainFood(unit, sector);
    }

    if (unit.isExhausted) {
      unit.setStatus(UNIT_STATUS.EXHAUSTED);
      this._handleSupplyReturn(unit);
      return;
    }

    if (unit.status === UNIT_STATUS.RETURNING || String(unit.command ?? '').includes('복귀')) {
      this._handleSupplyReturn(unit);
      return;
    }

    if (unit.targetSectorId && unit.sectorId !== unit.targetSectorId) {
      this._moveUnitTowards(unit, unit.targetSectorId);
      return;
    }

    if (String(unit.command ?? '').includes('이동') && unit.targetSectorId === unit.sectorId) {
      unit.setTargetSector(null);
      unit.setCommand('대기');
      return;
    }

    if (unit.type === UNIT_TYPES.RECON) {
      // A disconnected unit keeps carrying out its standing orders; only NEW
      // commands cannot reach it, and its reports are buffered until comms
      // are restored (handled in _deliverOrBuffer / _flushCommBuffer).
      if (unit.command.includes('정찰')) {
        if (unit.targetSectorId && unit.sectorId !== unit.targetSectorId) {
          this._moveUnitTowards(unit, unit.targetSectorId);
        } else {
          this._tickRecon(unit, sector);
        }
      }

      return;
    }

    if (unit.type === UNIT_TYPES.INFANTRY) {
      if (sector.enemySummary) {
        unit.startCombat();
        this._resolveCombat(unit, sector);
        return;
      }

      if (unit.command.includes('점령') && sector.control === 'unseen') {
        sector.setControl('revealed');
        sector.setReportSummary('아군 전개 중');
        this.addReport(new Report({
          time: this.time,
          source: unit.name,
          sectorId: sector.id,
          sectorCode: sector.code,
          kind: REPORT_KINDS.STATUS,
          classTag: REPORT_CLASS.C,
          summary: '거점 확보',
          body: `${sector.code}\n아군 전개 및 통제 시작`,
          tags: ['occupation', 'infantry'],
          meta: { unitId: unit.id }
        }));
      }

      return;
    }

    if (unit.type === UNIT_TYPES.ARTILLERY) {
      if (sector.enemySummary && unit.ammo > 0) {
        const splash = randomInt(3, 6) + Math.max(0, unit.level - 1);
        unit.consumeAmmo(1);
        sector.enemySummary.size = Math.max(0, sector.enemySummary.size - splash);
        sector.setAlert(true, `포격중: ${sector.enemySummary.size}`);
        sector.setReportSummary('포격 지원');

        this.addReport(new Report({
          time: this.time,
          source: unit.name,
          sectorId: sector.id,
          sectorCode: sector.code,
          kind: REPORT_KINDS.COMBAT,
          classTag: sector.enemySummary.class ?? REPORT_CLASS.B,
          summary: '포격 보고',
          body: `${sector.code}\n피해 추정: ${splash}`,
          enemySummary: clonePlainObject(sector.enemySummary),
          alert: true,
          pinned: true,
          tags: ['artillery', 'strike'],
          meta: { unitId: unit.id, splash }
        }));

        if (sector.enemySummary.size <= 0) {
          sector.clearEnemySummary();
          sector.setAlert(false);
          sector.setReportSummary('적 전력 소멸');
        }
      }
      return;
    }
  }

  tick() {
    if (this.paused) return this.getState();

    this.turn += 1;
    this.time += SIM_MINUTES_PER_TICK;

    // Re-derive supply nodes occasionally in case the UI or future systems alter control.
    this._deriveSupplyNodes();

    // Refresh comm connectivity (and flush buffers on reconnect) before units act.
    this._recomputeComm();

    // Main loop.
    for (const unit of this.units.values()) {
      if (!isUnitAlive(unit)) continue;
      this._decideUnitAction(unit);
      this._tickUnitCohesion(unit);
    }

    // Casual report aging: pin unresolved alerts, keep latest visible.
    for (const report of this.reports) {
      if (report.kind === REPORT_KINDS.RECON && !report.seen) {
        report.pin();
      }
    }

    this._trimReports();
    return this.getState();
  }

  runTicks(count = 1) {
    const ticks = Math.max(0, Math.floor(count));
    let state = this.getState();
    for (let i = 0; i < ticks; i += 1) {
      state = this.tick();
    }
    return state;
  }

  findSectorsWithAlerts() {
    return this.listSectors().filter((sector) => sector.isAlert);
  }

  findUnitsByType(type) {
    const normalized = String(type ?? '').trim().toLowerCase();
    return this.listUnits().filter((unit) => unit.type === normalized);
  }

  findReportsBySector(sectorId) {
    return this.listReports().filter((report) => report.sectorId === sectorId);
  }

  issueOrder(unitId, order, { targetSectorId = null, note = '' } = {}) {
    const unit = this.getUnit(unitId);
    if (!unit || !unit.isAlive) return null;

    const orderRecord = {
      unitId,
      order: String(order ?? '').trim(),
      targetSectorId,
      note,
      turnIssued: this.turn,
      timeIssued: this.time
    };

    unit.addOrder(orderRecord);

    if (targetSectorId) {
      unit.setTargetSector(targetSectorId);
    }

    this.addReport(new Report({
      time: this.time,
      source: 'HQ',
      sectorId: unit.sectorId,
      sectorCode: this.getSector(unit.sectorId)?.code ?? null,
      kind: REPORT_KINDS.COMMAND,
      classTag: REPORT_CLASS.C,
      summary: '명령 전달',
      body: [
        `Unit: ${unit.name}`,
        `Order: ${order}`,
        targetSectorId ? `Target: ${this.getSector(targetSectorId)?.code ?? targetSectorId}` : null,
        note ? `Note: ${note}` : null
      ].filter(Boolean).join('\n'),
      tags: ['command', unit.type],
      meta: orderRecord
    }));

    return orderRecord;
  }

  issueMoveOrder(unitId, targetSectorId) {
    const unit = this.getUnit(unitId);
    if (!unit || !unit.isAlive) return null;
    if (!unit.commConnected) return { blocked: 'disconnected', unitId };

    const currentSector = this.getSector(unit.sectorId);
    const validTargets = [unit.sectorId, ...(currentSector?.neighbors ?? [])];
    if (!validTargets.includes(targetSectorId)) return null;

    if (!unit.meta || typeof unit.meta !== 'object') unit.meta = {};
    unit.meta.reconState = null;
    unit.meta.reconMission = null;
    unit.meta.returnTargetSectorId = null;

    unit.stopRetreat();
    unit.setStatus(unit.isHungry ? UNIT_STATUS.HUNGRY : UNIT_STATUS.ACTIVE);
    unit.setCommand(targetSectorId === unit.sectorId ? '대기' : '이동');
    if (targetSectorId === unit.sectorId) unit.setTargetSector(null);

    return this.issueOrder(unitId, targetSectorId === unit.sectorId ? '대기' : '이동', {
      targetSectorId: targetSectorId === unit.sectorId ? null : targetSectorId
    });
  }

  issueReturnOrder(unitId) {
    const unit = this.getUnit(unitId);
    if (!unit || !unit.isAlive) return null;
    if (!unit.commConnected) return { blocked: 'disconnected', unitId };

    const targetSectorId = this._nearestSupplySectorId(unit.sectorId);
    if (!targetSectorId) return null;

    if (!unit.meta || typeof unit.meta !== 'object') unit.meta = {};
    unit.meta.reconState = null;
    unit.meta.reconMission = null;
    unit.meta.returnTargetSectorId = targetSectorId;
    unit.setCommand('복귀');
    unit.setTargetSector(targetSectorId);
    unit.startRetreat();

    return this.issueOrder(unitId, '복귀', { targetSectorId, note: '가장 가까운 보급 거점' });
  }

  issueReconOrder(unitId, targetSectorId, { durationMinutes = null } = {}) {
    const unit = this.getUnit(unitId);
    if (!unit || !unit.isAlive) return null;

    // New orders cannot reach a unit that is out of comms.
    if (!unit.commConnected) return { blocked: 'disconnected', unitId };

    const currentSector = this.getSector(unit.sectorId);
    const validTargets = [unit.sectorId, ...(currentSector?.neighbors ?? [])];
    if (!validTargets.includes(targetSectorId)) return null;

    if (!unit.meta || typeof unit.meta !== 'object') unit.meta = {};
    unit.meta.reconState = null;
    unit.meta.reconMission = {
      targetSectorId,
      durationMinutes: Number.isFinite(durationMinutes) ? Math.max(0, Math.round(durationMinutes)) : null,
      timeIssued: this.time
    };

    unit.setCommand('정찰');
    const durationNote = unit.meta.reconMission.durationMinutes
      ? `현장 체류 ${Math.round(unit.meta.reconMission.durationMinutes / MINUTES_PER_HOUR)}시간`
      : '';
    return this.issueOrder(unitId, '정찰', { targetSectorId, note: durationNote });
  }

  reorganizeUnit(unitId, { leader = null, cohesionPenalty = 18, reason = '작전 단위 재편성' } = {}) {
    const unit = this.getUnit(unitId);
    if (!unit || !unit.isAlive) return null;

    if (leader) {
      unit.setLeader(leader, {
        time: this.time,
        penalty: cohesionPenalty,
        reason
      });
    } else {
      unit.applyReorgPenalty(cohesionPenalty, {
        time: this.time,
        reason
      });
    }

    this.addReport(new Report({
      time: this.time,
      source: 'HQ',
      sectorId: unit.sectorId,
      sectorCode: this.getSector(unit.sectorId)?.code ?? null,
      kind: REPORT_KINDS.COMMAND,
      classTag: REPORT_CLASS.C,
      summary: '재편성 명령',
      body: [
        `Unit: ${unit.name}`,
        `Reason: ${reason}`,
        `Cohesion: ${Math.round(unit.cohesion)}%`,
        leader ? `Leader: ${unit.leader.name} (${unit.leader.traitLabel})` : null
      ].filter(Boolean).join('\n'),
      tags: ['command', 'reorg', unit.type],
      meta: {
        unitId,
        leader: leader ? clonePlainObject(unit.leader) : null,
        cohesion: unit.cohesion,
        reason
      }
    }));

    return unit.toJSON();
  }

  setSectorAlert(sectorId, alert = true, label = null) {
    const sector = this.getSector(sectorId);
    if (!sector) return false;
    sector.setAlert(alert, label);
    return true;
  }

  setSectorEnemy(sectorId, enemySummary) {
    const sector = this.getSector(sectorId);
    if (!sector) return false;
    sector.setEnemySummary(enemySummary);
    if (enemySummary) {
      sector.setControl('revealed');
      sector.setReportSummary(`적 ${enemySummary.type} 관측`);
    }
    return true;
  }

  clearSectorEnemy(sectorId) {
    const sector = this.getSector(sectorId);
    if (!sector) return false;
    sector.clearEnemySummary();
    sector.setAlert(false);
    sector.setReportSummary('지역 안정화');
    return true;
  }
}

export function createSimulation(options = {}) {
  return new Simulation(options);
}

export function createDefaultSimulation() {
  // Experimental comm scenario: a small recon force starts at Forest D (HQ)
  // and the objective is to scout north toward Valley A. The northern Valley/
  // Ridge sectors fall outside the 2-hop comm range of the anchors, so relays
  // must be positioned (e.g. at Plain C) to keep the lead scout connected.
  const startSector = 'D5'; // Forest D
  const reconAt = (name, level, leaderName) => Unit.recon({
    name,
    sectorId: startSector,
    level,
    command: '대기',
    leader: {
      name: leaderName,
      billet: '정찰조장',
      trait: LEADER_TRAITS.SCOUT,
      rating: level
    }
  });

  return new Simulation({
    map: MAP,
    units: [
      reconAt('Alpha Recon', 2, 'Sgt. Han'),
      reconAt('Bravo Recon', 2, 'Sgt. Baek'),
      reconAt('Charlie Recon', 1, 'Cpl. Min')
    ],
    reports: [],
    commAnchors: [
      { sectorId: 'D5', label: 'HQ' },
      { sectorId: 'D3', label: '야전사령부' }
    ]
  });
}
