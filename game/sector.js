// game/sector.js
// Sector model for Shrouded Front.
//
// This module wraps raw map data into a game-friendly object.
// It does not touch the DOM.

import { MAP, getSectorById } from '../data/map.js?v=20';

export class Sector {
  constructor(raw) {
    if (!raw || !raw.id) {
      throw new Error('Sector requires a raw sector object with an id.');
    }

    this.id = raw.id;
    this.code = raw.code ?? raw.id;
    this.terrain = raw.terrain ?? 'plain';
    this.terrainLabel = raw.terrainLabel ?? this.terrain;
    this.regionLabel = raw.regionLabel ?? '';
    this.features = Array.isArray(raw.features) ? [...raw.features] : [];
    this.landmarks = Array.isArray(raw.landmarks) ? [...raw.landmarks] : [];
    this.role = raw.role ?? 'unknown';
    this.notes = raw.notes ?? '';
    this.svgFill = raw.svgFill ?? null;
    this.alert = Boolean(raw.alert);
    this.alertLabel = raw.alertLabel ?? null;
    this.visibilityHint = raw.visibilityHint ?? '';
    this.neighbors = Array.isArray(raw.neighbors) ? [...raw.neighbors] : [];
    this.center = raw.center ? { ...raw.center } : { x: 0, y: 0 };
    this.polygon = Array.isArray(raw.polygon)
      ? raw.polygon.map(([x, y]) => [x, y])
      : [];

    this.control = raw.control ?? 'unseen';
    this.friendlySummary = raw.friendlySummary ?? null;
    this.enemySummary = raw.enemySummary ? { ...raw.enemySummary } : null;
    this.hiddenEnemySummary = raw.hiddenEnemySummary ? { ...raw.hiddenEnemySummary } : null;
    this.reportSummary = raw.reportSummary ?? '미탐색';
    this.occupancy = Array.isArray(raw.occupancy) ? [...raw.occupancy] : [];

    // Runtime state used by simulation/UI later.
    this.selected = false;
    this.hovered = false;
    this.lastKnownTurn = raw.lastKnownTurn ?? null;
    this.reconProgress = raw.reconProgress ?? 0;
    this.owner = raw.owner ?? 'neutral';
  }

  static fromId(id) {
    const raw = getSectorById(id);
    return raw ? new Sector(raw) : null;
  }

  static fromRaw(raw) {
    return new Sector(raw);
  }

  static all() {
    return MAP.sectors.map((raw) => new Sector(raw));
  }

  clone() {
    return new Sector({
      id: this.id,
      code: this.code,
      terrain: this.terrain,
      terrainLabel: this.terrainLabel,
      regionLabel: this.regionLabel,
      features: [...this.features],
      landmarks: [...this.landmarks],
      role: this.role,
      notes: this.notes,
      svgFill: this.svgFill,
      alert: this.alert,
      alertLabel: this.alertLabel,
      visibilityHint: this.visibilityHint,
      neighbors: [...this.neighbors],
      center: { ...this.center },
      polygon: this.polygon.map(([x, y]) => [x, y]),
      control: this.control,
      friendlySummary: this.friendlySummary ? { ...this.friendlySummary } : null,
      enemySummary: this.enemySummary ? { ...this.enemySummary } : null,
      hiddenEnemySummary: this.hiddenEnemySummary ? { ...this.hiddenEnemySummary } : null,
      reportSummary: this.reportSummary,
      occupancy: [...this.occupancy],
      lastKnownTurn: this.lastKnownTurn,
      reconProgress: this.reconProgress,
      owner: this.owner
    });
  }

  get isAlert() {
    return this.alert || Boolean(this.enemySummary);
  }

  get hasLandmarks() {
    return this.landmarks.length > 0;
  }

  get isVisible() {
    return this.control === 'visible' || this.control === 'revealed';
  }

  get neighborCount() {
    return this.neighbors.length;
  }

  markSelected(selected = true) {
    this.selected = Boolean(selected);
    return this;
  }

  markHovered(hovered = true) {
    this.hovered = Boolean(hovered);
    return this;
  }

  setAlert(alert, label = null) {
    this.alert = Boolean(alert);
    this.alertLabel = label;
    return this;
  }

  setEnemySummary(enemySummary) {
    this.enemySummary = enemySummary ? { ...enemySummary } : null;
    if (enemySummary) {
      this.alert = true;
      this.reportSummary = enemySummary.type
        ? `적 ${enemySummary.type} 관측`
        : '적 활동';
    }
    return this;
  }

  clearEnemySummary() {
    this.enemySummary = null;
    this.alert = false;
    return this;
  }

  addOccupant(unitId) {
    if (!this.occupancy.includes(unitId)) {
      this.occupancy.push(unitId);
    }
    return this;
  }

  removeOccupant(unitId) {
    this.occupancy = this.occupancy.filter((id) => id !== unitId);
    return this;
  }

  setControl(control) {
    this.control = control;
    return this;
  }

  setReconProgress(progress) {
    this.reconProgress = Math.max(0, Math.min(100, progress));
    return this;
  }

  advanceReconProgress(delta) {
    return this.setReconProgress(this.reconProgress + delta);
  }

  setReportSummary(summary) {
    this.reportSummary = summary;
    return this;
  }

  setLastKnownTurn(turn) {
    this.lastKnownTurn = turn;
    return this;
  }

  setOwner(owner) {
    this.owner = owner;
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      code: this.code,
      terrain: this.terrain,
      terrainLabel: this.terrainLabel,
      regionLabel: this.regionLabel,
      features: [...this.features],
      landmarks: [...this.landmarks],
      role: this.role,
      notes: this.notes,
      svgFill: this.svgFill,
      alert: this.alert,
      alertLabel: this.alertLabel,
      visibilityHint: this.visibilityHint,
      neighbors: [...this.neighbors],
      center: { ...this.center },
      polygon: this.polygon.map(([x, y]) => [x, y]),
      control: this.control,
      friendlySummary: this.friendlySummary,
      enemySummary: this.enemySummary ? { ...this.enemySummary } : null,
      reportSummary: this.reportSummary,
      occupancy: [...this.occupancy],
      selected: this.selected,
      hovered: this.hovered,
      lastKnownTurn: this.lastKnownTurn,
      reconProgress: this.reconProgress,
      owner: this.owner
    };
  }
}

export function createSectorIndex() {
  const index = new Map();
  for (const raw of MAP.sectors) {
    index.set(raw.id, new Sector(raw));
  }
  return index;
}

export function listSectorIds() {
  return MAP.sectors.map((sector) => sector.id);
}

export function listSectors() {
  return MAP.sectors.map((raw) => new Sector(raw));
}

export function getNeighborSectors(sectorOrId) {
  const id = typeof sectorOrId === 'string' ? sectorOrId : sectorOrId?.id;
  const raw = id ? getSectorById(id) : null;
  if (!raw) return [];

  return raw.neighbors
    .map((neighborId) => getSectorById(neighborId))
    .filter(Boolean)
    .map((neighborRaw) => new Sector(neighborRaw));
}

export function summarizeSector(sectorOrId) {
  const sector = typeof sectorOrId === 'string'
    ? getSectorById(sectorOrId)
    : sectorOrId;

  if (!sector) return null;

  return {
    id: sector.id,
    code: sector.code,
    terrain: sector.terrain,
    terrainLabel: sector.terrainLabel,
    regionLabel: sector.regionLabel,
    landmarks: [...(sector.landmarks ?? [])],
    notes: sector.notes ?? '',
    reportSummary: sector.reportSummary ?? '미탐색',
    alert: Boolean(sector.alert),
    alertLabel: sector.alertLabel ?? null,
    visibilityHint: sector.visibilityHint ?? '',
    enemySummary: sector.enemySummary ? { ...sector.enemySummary } : null,
    control: sector.control ?? 'unseen',
    neighbors: [...(sector.neighbors ?? [])],
    reconProgress: sector.reconProgress ?? 0,
    owner: sector.owner ?? 'neutral'
  };
}
