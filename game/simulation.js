// game/simulation.js
// Core simulation engine for Shrouded Front.
//
// This file advances time, moves units, drains food, handles recon progress,
// creates reports, and resolves lightweight combat.

import { MAP, getSectorById } from '../data/map.js';
import { Sector } from './sector.js';
import { Report, REPORT_CLASS, REPORT_KINDS } from './report.js';
import {
  Unit,
  UNIT_TYPES,
  UNIT_STATUS,
  isUnitAlive,
  unitLabel
} from './unit.js';

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

function formatSizeLabel(size) {
  if (size >= 100) return 'battalion';
  if (size >= 40) return 'company';
  if (size >= 20) return 'platoon';
  if (size >= 8) return 'section';
  return 'small';
}

function inferClassFromProgress(progress) {
  if (progress >= 80) return REPORT_CLASS.A;
  if (progress >= 55) return REPORT_CLASS.B;
  if (progress >= 25) return REPORT_CLASS.C;
  return REPORT_CLASS.D;
}

function clonePlainObject(value) {
  if (!value || typeof value !== 'object') return value;
  return JSON.parse(JSON.stringify(value));
}

export class Simulation {
  constructor({ map = MAP, units = [], reports = [] } = {}) {
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
    this.defaultSupplySectorIds = [...this.sectors.values()]
      .filter((sector) => sector.control === 'visible' || sector.owner === 'player' || sector.reportSummary === '아군 보급 거점')
      .map((sector) => sector.id);

    if (this.defaultSupplySectorIds.length === 0) {
      const first = [...this.sectors.keys()][0];
      if (first) this.defaultSupplySectorIds.push(first);
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
      operations: this.listOperations().map((op) => clonePlainObject(op))
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

  _terrainReconPenalty(sector) {
    if (!sector) return 0;
    const penalties = {
      valley: 0.25,
      ridge: 0.05,
      forest: 0.35,
      swamp: 0.30,
      river: 0.20,
      plain: 0.10
    };
    return penalties[sector.terrain] ?? 0.15;
  }

  _nearestSupplySectorId(fromSectorId) {
    const available = this.defaultSupplySectorIds.length > 0
      ? this.defaultSupplySectorIds
      : [...this.sectors.keys()];

    if (!available.length) return null;

    const fromIndex = [...this.sectors.keys()].indexOf(fromSectorId);
    if (fromIndex < 0) return available[0] ?? null;

    let best = null;
    for (const sectorId of available) {
      const idx = [...this.sectors.keys()].indexOf(sectorId);
      if (idx < 0) continue;
      const dist = Math.abs(idx - fromIndex);
      if (!best || dist < best.dist) best = { sectorId, dist };
    }
    return best?.sectorId ?? available[0] ?? null;
  }

  _moveUnitTowards(unit, targetSectorId) {
    if (!unit || !targetSectorId || !unit.isAlive) return false;
    if (unit.sectorId === targetSectorId) return false;

    const currentSector = this.getSector(unit.sectorId);
    const targetSector = this.getSector(targetSectorId);
    if (!currentSector || !targetSector) return false;

    const currentIndex = [...this.sectors.keys()].indexOf(unit.sectorId);
    const targetIndex = [...this.sectors.keys()].indexOf(targetSectorId);
    if (currentIndex < 0 || targetIndex < 0) return false;

    const step = targetIndex > currentIndex ? 1 : -1;
    const nextSectorId = [...this.sectors.keys()][currentIndex + step];
    const nextSector = this.getSector(nextSectorId);
    if (!nextSector) return false;

    const moveCost = this._sectorTerrainCost(nextSector) * (2 / Math.max(1, unit.move));
    unit.moveBuffer += 1;

    if (unit.moveBuffer < moveCost) {
      return false;
    }

    unit.moveBuffer = 0;
    this._detachUnitFromSector(unit, unit.sectorId);
    unit.setSector(nextSector.id);
    unit.lastKnownSectorId = nextSector.id;
    this._attachUnitToSector(unit, nextSector.id);

    if (unit.type === UNIT_TYPES.RECON) {
      nextSector.setReconProgress(Math.min(100, nextSector.reconProgress + 8 + unit.level * 2));
      nextSector.setControl(nextSector.reconProgress >= 60 ? 'revealed' : 'visible');
      nextSector.setReportSummary(
        nextSector.reconProgress >= 80 ? '정찰 중(고품질)' : '정찰 중'
      );
    }

    this.addReport(new Report({
      time: this.time,
      source: unit.name,
      sectorId: nextSector.id,
      sectorCode: nextSector.code,
      kind: REPORT_KINDS.STATUS,
      classTag: inferClassFromProgress(nextSector.reconProgress),
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

    return true;
  }

  _drainFood(unit, sector) {
    const terrainCost = this._sectorTerrainCost(sector);
    const baseDrain = unit.type === UNIT_TYPES.ARTILLERY ? 0.12 : unit.type === UNIT_TYPES.RECON ? 0.10 : 0.08;
    const drain = baseDrain * terrainCost;
    unit.applyFoodDrain(drain);

    if (unit.food <= 0) {
      unit.setStatus(UNIT_STATUS.EXHAUSTED);
    } else if (unit.food <= Math.ceil(unit.maxFood * 0.3)) {
      unit.setStatus(UNIT_STATUS.HUNGRY);
    } else if (unit.status === UNIT_STATUS.HUNGRY) {
      unit.setStatus(UNIT_STATUS.ACTIVE);
    }
  }

  _handleExhaustion(unit) {
    if (!unit || !unit.isAlive) return;
    const fallback = this._nearestSupplySectorId(unit.sectorId) ?? unit.originSectorId ?? unit.sectorId;
    if (fallback && unit.sectorId !== fallback) {
      unit.startRetreat();
      this._moveUnitTowards(unit, fallback);
      return;
    }

    if (unit.sectorId === fallback) {
      unit.restoreFood(4);
      if (unit.type === UNIT_TYPES.ARTILLERY) unit.refillAmmo();
      unit.setStatus(UNIT_STATUS.ACTIVE);
      unit.stopRetreat();
      this.addReport(new Report({
        time: this.time,
        source: 'HQ',
        sectorId: unit.sectorId,
        sectorCode: this.getSector(unit.sectorId)?.code ?? null,
        kind: REPORT_KINDS.SUPPLY,
        classTag: REPORT_CLASS.C,
        summary: '복귀 완료',
        body: `${unit.name}\n보급 거점 도착 후 재편성`,
        tags: ['supply', 'return'],
        meta: { unitId: unit.id }
      }));
    }
  }

  _reconClassFromUnit(unit, sector) {
    const reconSkill = unit.level + Math.floor(unit.vision / 2);
    const terrainPenalty = this._terrainReconPenalty(sector);
    const effective = reconSkill - terrainPenalty * 10;

    if (effective >= 7) return REPORT_CLASS.A;
    if (effective >= 5) return REPORT_CLASS.B;
    if (effective >= 3) return REPORT_CLASS.C;
    return REPORT_CLASS.D;
  }

  _reconProgressRate(unit, sector) {
    const terrainDrag = this._terrainReconPenalty(sector);
    const skill = 3 + unit.level * 0.7 + unit.vision * 0.15;
    const fatigueDrag = unit.fatigue >= 70 ? 0.65 : unit.fatigue >= 40 ? 0.82 : 1;
    const foodDrag = unit.isHungry ? 0.72 : 1;
    return clamp(skill * (1 - terrainDrag) * fatigueDrag * foodDrag, 0.5, 8);
  }

  _reconReportKey(sectorId) {
    return `recon:${sectorId}:80`;
  }

  _hasIssuedReconReport(unit, sectorId) {
    const issued = Array.isArray(unit.meta?.issuedReports) ? unit.meta.issuedReports : [];
    return issued.includes(this._reconReportKey(sectorId));
  }

  _markIssuedReconReport(unit, sectorId) {
    if (!unit.meta || typeof unit.meta !== 'object') unit.meta = {};
    if (!Array.isArray(unit.meta.issuedReports)) unit.meta.issuedReports = [];
    const key = this._reconReportKey(sectorId);
    if (!unit.meta.issuedReports.includes(key)) {
      unit.meta.issuedReports.push(key);
    }
  }

  _refineEnemySummary(enemy, progress) {
    if (!enemy) return null;
    const precision = progress >= 95 ? 1 : progress >= 80 ? 5 : 10;
    const rawSize = typeof enemy.size === 'number' ? enemy.size : 0;
    const estimatedSize = rawSize > 0
      ? Math.max(1, Math.round(rawSize / precision) * precision)
      : rawSize;

    return {
      ...clonePlainObject(enemy),
      size: estimatedSize,
      sizeLabel: formatSizeLabel(estimatedSize),
      class: inferClassFromProgress(progress)
    };
  }

  _setReconProgressSummary(sector) {
    const progress = sector.reconProgress;
    if (sector.enemySummary) return;
    if (progress >= 80) {
      sector.setReportSummary('정찰 보고 확보');
    } else if (progress >= 55) {
      sector.setReportSummary('정찰 중(정제 중)');
    } else if (progress >= 25) {
      sector.setReportSummary('정찰 중(추정)');
    } else if (progress > 0) {
      sector.setReportSummary('정찰 중(불명확)');
    }
  }

  _advanceReconProgress(unit, sector) {
    if (unit.type !== UNIT_TYPES.RECON || !sector) return;

    const before = sector.reconProgress;
    const delta = this._reconProgressRate(unit, sector);
    sector.setReconProgress(clamp(before + delta, 0, 100));
    sector.setLastKnownTurn(this.turn);
    unit.setReconProgress(sector.reconProgress);
    unit.turnsSinceReport += 1;

    this._setReconProgressSummary(sector);
    this._maybeCreateReconReport(unit, sector);
  }

  _maybeCreateReconReport(unit, sector) {
    if (unit.type !== UNIT_TYPES.RECON || !sector) return;
    const progress = sector.reconProgress;
    if (progress < 80 || this._hasIssuedReconReport(unit, sector.id)) return;

    const classTag = inferClassFromProgress(progress);
    const hiddenEnemy = sector.hiddenEnemySummary ?? sector.enemySummary;

    if (!hiddenEnemy) {
      sector.setAlert(false);
      sector.setControl('visible');
      sector.setReportSummary('적 미확인');
      this.addReport(new Report({
        time: this.time,
        source: unit.name,
        sectorId: sector.id,
        sectorCode: sector.code,
        kind: REPORT_KINDS.RECON,
        classTag,
        summary: '정찰 보고',
        body: `${sector.code}\n가시한 적 없음`,
        tags: ['recon', 'no-contact'],
        meta: {
          unitId: unit.id,
          sectorTerrain: sector.terrain,
          reconProgress: progress
        }
      }));
      this._markIssuedReconReport(unit, sector.id);
      unit.turnsSinceReport = 0;
      return;
    }

    const enemy = this._refineEnemySummary(hiddenEnemy, progress);
    const sizeLabel = enemy.sizeLabel ?? formatSizeLabel(enemy.size);
    const body = [
      sector.code,
      `Enemy ${enemy.type}`,
      `${enemy.size} (${sizeLabel})`,
      `Class ${enemy.class}`
    ].join('\n');

    sector.setEnemySummary(enemy);
    sector.setAlert(true, `적 ${enemy.type} 보고`);
    sector.setReportSummary(`적 ${enemy.type} 보고`);
    sector.setControl('revealed');

    this.addReport(new Report({
      time: this.time,
      source: unit.name,
      sectorId: sector.id,
      sectorCode: sector.code,
      kind: REPORT_KINDS.RECON,
      classTag,
      summary: '정찰 보고',
      body,
      enemySummary: {
        ...enemy,
        sizeLabel
      },
      alert: true,
      pinned: true,
      tags: ['recon', enemy.type, enemy.class],
      meta: {
        unitId: unit.id,
        sectorTerrain: sector.terrain,
        reconProgress: progress
      }
    }));

    this._markIssuedReconReport(unit, sector.id);
    unit.turnsSinceReport = 0;
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

    if (!unit.meta?.ignoreSupply) {
      this._drainFood(unit, sector);
    }

    if (unit.isExhausted) {
      unit.setStatus(UNIT_STATUS.EXHAUSTED);
      this._handleExhaustion(unit);
      return;
    }

    if (unit.type === UNIT_TYPES.RECON) {
      const connected = unit.commConnected;

      if (connected && unit.command.includes('정찰')) {
        if (unit.targetSectorId && unit.sectorId !== unit.targetSectorId) {
          this._moveUnitTowards(unit, unit.targetSectorId);
        } else {
          this._advanceReconProgress(unit, sector);
        }
      } else if (!connected) {
        unit.setStatus(UNIT_STATUS.DISCONNECTED);
        const fallback = this._nearestSupplySectorId(unit.sectorId) ?? unit.originSectorId ?? unit.sectorId;
        this._moveUnitTowards(unit, fallback);
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
    this.time += 1;

    // Re-derive supply nodes occasionally in case the UI or future systems alter control.
    this._deriveSupplyNodes();

    // Main loop.
    for (const unit of this.units.values()) {
      if (!isUnitAlive(unit)) continue;
      this._decideUnitAction(unit);
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
        targetSectorId ? `Target: ${targetSectorId}` : null,
        note ? `Note: ${note}` : null
      ].filter(Boolean).join('\n'),
      tags: ['command', unit.type],
      meta: orderRecord
    }));

    return orderRecord;
  }

  issueReconOrder(unitId, targetSectorId) {
    const unit = this.getUnit(unitId);
    if (!unit || !unit.isAlive) return null;

    const currentSector = this.getSector(unit.sectorId);
    const validTargets = [unit.sectorId, ...(currentSector?.neighbors ?? [])];
    if (!validTargets.includes(targetSectorId)) return null;

    if (unit.meta?.issuedReports) {
      unit.meta.issuedReports = unit.meta.issuedReports.filter(
        (key) => !key.startsWith(`recon:${targetSectorId}:`)
      );
    }

    return this.issueOrder(unitId, '정찰', { targetSectorId });
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
  return new Simulation({
    map: MAP,
    units: [
      Unit.recon({
        name: 'Alpha Recon',
        sectorId: 'A3',
        level: 2,
        command: '대기',
        meta: { ignoreSupply: true }
      })
    ],
    reports: []
  });
}
