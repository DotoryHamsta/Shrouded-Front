// data/map.js
// Shrouded Front - tactical map registry and lookup helpers.

import {
  MAP,
  MAPS,
  NORTHERN_FIELD_OPERATIONS_MAP,
  SOUTHERN_RIVER_CROSSING_MAP,
  EASTERN_RIDGE_LINE_MAP
} from './maps/index.js?v=39';

export {
  MAP,
  MAPS,
  NORTHERN_FIELD_OPERATIONS_MAP,
  SOUTHERN_RIVER_CROSSING_MAP,
  EASTERN_RIDGE_LINE_MAP
};

export const DEFAULT_MAP_ID = MAP.id;

let activeMap = MAP;

export function listMaps() {
  return MAPS.map((map) => ({
    id: map.id,
    name: map.name,
    description: map.description,
    summary: map.summary,
    mission: map.mission ? { ...map.mission } : null,
    startSectorId: map.startSectorId,
    background: map.background ? { ...map.background } : null
  }));
}

export function getMapById(id) {
  return MAPS.find((map) => map.id === id) || null;
}

export function getActiveMap() {
  return activeMap;
}

export function setActiveMap(mapOrId = DEFAULT_MAP_ID) {
  const next = typeof mapOrId === 'string'
    ? getMapById(mapOrId)
    : mapOrId;
  activeMap = next || MAP;
  return activeMap;
}

export function getSectorById(id, map = activeMap) {
  return map?.sectors?.find((item) => item.id === id) || null;
}

// Translates an internal grid id (e.g. "B5") to the player-facing code
// (e.g. "East Forest Edge"). Grid ids are an implementation detail used for
// adjacency; the UI should only show codes.
export function codeForSector(id, map = activeMap) {
  if (!id) return '-';
  return getSectorById(id, map)?.code ?? id;
}

export function getNeighborSectors(id, map = activeMap) {
  const item = getSectorById(id, map);
  if (!item) return [];
  return item.neighbors.map((neighborId) => getSectorById(neighborId, map)).filter(Boolean);
}

export function summarizeSector(item) {
  if (!item) return null;
  return {
    id: item.id,
    code: item.code,
    terrain: item.terrain,
    terrainLabel: item.terrainLabel,
    regionLabel: item.regionLabel,
    landmarks: item.landmarks,
    notes: item.notes,
    reportSummary: item.reportSummary,
    alert: item.alert,
    alertLabel: item.alertLabel,
    visibilityHint: item.visibilityHint,
    enemySummary: item.enemySummary,
    hiddenEnemySummary: item.hiddenEnemySummary,
    control: item.control,
    neighbors: item.neighbors,
    center: item.center,
    labelPoint: item.labelPoint,
    elevation: item.elevation
  };
}
