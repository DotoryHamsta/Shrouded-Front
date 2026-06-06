import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { MAPS } from '../data/map.js?v=39';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const errors = [];

function fail(scope, message) {
  errors.push(`${scope}: ${message}`);
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asPoint(value) {
  if (Array.isArray(value)) return { x: Number(value[0]), y: Number(value[1]) };
  if (isObject(value)) return { x: Number(value.x), y: Number(value.y) };
  return { x: Number.NaN, y: Number.NaN };
}

function pointIsFinite(point) {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function pointInViewBox(point, viewBox) {
  return point.x >= 0 && point.y >= 0 && point.x <= viewBox.width && point.y <= viewBox.height;
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const pi = asPoint(polygon[i]);
    const pj = asPoint(polygon[j]);
    const intersects = ((pi.y > point.y) !== (pj.y > point.y))
      && (point.x < ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y) + pi.x);
    if (intersects) inside = !inside;
  }
  return inside;
}

function validateUnique(items, key, scope) {
  const seen = new Set();
  for (const item of items) {
    const value = item?.[key];
    if (!value) fail(scope, `missing ${key}`);
    if (seen.has(value)) fail(scope, `duplicate ${key} "${value}"`);
    seen.add(value);
  }
  return seen;
}

function validateLayerRefs(map, sectorIds) {
  const layers = map.layers ?? {};
  const crossingSources = [
    ...(Array.isArray(layers.bridgeCrossingPoints) ? layers.bridgeCrossingPoints : []),
    ...(Array.isArray(layers.rivers)
      ? layers.rivers.flatMap((river) => Array.isArray(river.crossings) ? river.crossings : [])
      : [])
  ];

  for (const crossing of crossingSources) {
    const refs = Array.isArray(crossing.sectors) ? crossing.sectors : [];
    for (const sectorId of refs) {
      if (!sectorIds.has(sectorId)) {
        fail(map.id, `layer crossing "${crossing.id}" references missing sector "${sectorId}"`);
      }
    }
  }
}

function validateMap(map) {
  const scope = `map ${map.id ?? '(missing id)'}`;
  if (!map.id) fail(scope, 'missing map id');
  if (!map.name) fail(scope, 'missing map name');

  const viewBox = map.viewBox ?? {};
  if (!Number.isFinite(viewBox.width) || !Number.isFinite(viewBox.height)) {
    fail(scope, 'viewBox must provide finite width and height');
  }

  const backgroundHref = map.background?.href;
  if (!backgroundHref) {
    fail(scope, 'missing background href');
  } else {
    const backgroundPath = path.resolve(repoRoot, backgroundHref.replace(/^\.\//, ''));
    if (!fs.existsSync(backgroundPath)) {
      fail(scope, `background file does not exist: ${backgroundHref}`);
    }
  }

  const sectors = Array.isArray(map.sectors) ? map.sectors : [];
  if (sectors.length === 0) fail(scope, 'map must define at least one sector');

  const sectorIds = validateUnique(sectors, 'id', scope);
  for (const sector of sectors) {
    const sectorScope = `${scope} sector ${sector.id ?? '(missing id)'}`;
    if (!sector.code) fail(sectorScope, 'missing code');
    if (!sector.terrain) fail(sectorScope, 'missing terrain');
    if (!Array.isArray(sector.neighbors)) fail(sectorScope, 'neighbors must be an array');
    if (!Array.isArray(sector.polygon) || sector.polygon.length < 3) {
      fail(sectorScope, 'polygon must contain at least three points');
      continue;
    }

    const center = asPoint(sector.center);
    const labelPoint = asPoint(sector.labelPoint ?? sector.center);
    if (!pointIsFinite(center)) fail(sectorScope, 'center must be a finite point');
    if (!pointIsFinite(labelPoint)) fail(sectorScope, 'labelPoint must be a finite point');

    if (pointIsFinite(center) && pointInViewBox(center, viewBox) === false) {
      fail(sectorScope, `center is outside viewBox (${center.x}, ${center.y})`);
    }
    if (pointIsFinite(labelPoint) && pointInViewBox(labelPoint, viewBox) === false) {
      fail(sectorScope, `labelPoint is outside viewBox (${labelPoint.x}, ${labelPoint.y})`);
    }
    if (pointIsFinite(labelPoint) && !pointInPolygon(labelPoint, sector.polygon)) {
      fail(sectorScope, `labelPoint is outside polygon (${labelPoint.x}, ${labelPoint.y})`);
    }

    for (const point of sector.polygon) {
      const p = asPoint(point);
      if (!pointIsFinite(p)) {
        fail(sectorScope, 'polygon contains a non-finite point');
      } else if (!pointInViewBox(p, viewBox)) {
        fail(sectorScope, `polygon point is outside viewBox (${p.x}, ${p.y})`);
      }
    }

    for (const neighborId of sector.neighbors ?? []) {
      if (!sectorIds.has(neighborId)) {
        fail(sectorScope, `neighbor "${neighborId}" does not exist`);
        continue;
      }
      const neighbor = sectors.find((item) => item.id === neighborId);
      if (!neighbor?.neighbors?.includes(sector.id)) {
        fail(sectorScope, `neighbor "${neighborId}" is not bidirectional`);
      }
    }
  }

  if (map.startSectorId && !sectorIds.has(map.startSectorId)) {
    fail(scope, `startSectorId "${map.startSectorId}" does not exist`);
  }

  for (const anchor of map.commAnchors ?? []) {
    if (!sectorIds.has(anchor.sectorId)) {
      fail(scope, `comm anchor "${anchor.label ?? anchor.sectorId}" references missing sector "${anchor.sectorId}"`);
    }
  }

  validateLayerRefs(map, sectorIds);
}

function readScenarios() {
  const dir = path.join(repoRoot, 'data/scenarios');
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => {
      const fullPath = path.join(dir, name);
      return {
        file: name,
        scenario: JSON.parse(fs.readFileSync(fullPath, 'utf8'))
      };
    });
}

function validateScenario({ file, scenario }, mapsById) {
  const scope = `scenario ${scenario.id ?? file}`;
  if (!scenario.id) fail(scope, 'missing scenario id');
  if (!scenario.title) fail(scope, 'missing title');
  if (!mapsById.has(scenario.defaultMapId)) {
    fail(scope, `defaultMapId "${scenario.defaultMapId}" does not match a registered map`);
  }

  const operation = scenario.operation ?? {};
  if (!Number.isFinite(operation.simMinutesPerTick) || operation.simMinutesPerTick <= 0) {
    fail(scope, 'operation.simMinutesPerTick must be positive');
  }
  if (!Number.isFinite(operation.tickMs) || operation.tickMs <= 0) {
    fail(scope, 'operation.tickMs must be positive');
  }
  if (!Array.isArray(operation.speedOptions) || operation.speedOptions.length === 0) {
    fail(scope, 'operation.speedOptions must be a non-empty array');
  }
  if (!Array.isArray(operation.reconDurationPresets) || operation.reconDurationPresets.length === 0) {
    fail(scope, 'operation.reconDurationPresets must be a non-empty array');
  }

  const mapConfigs = scenario.maps ?? {};
  for (const [mapId, config] of Object.entries(mapConfigs)) {
    const map = mapsById.get(mapId);
    const configScope = `${scope} map ${mapId}`;
    if (!map) {
      fail(configScope, 'map config does not match a registered map');
      continue;
    }

    const sectorIds = new Set(map.sectors.map((sector) => sector.id));
    if (config.startSectorId && !sectorIds.has(config.startSectorId)) {
      fail(configScope, `startSectorId "${config.startSectorId}" does not exist`);
    }

    for (const anchor of config.commAnchors ?? []) {
      if (!sectorIds.has(anchor.sectorId)) {
        fail(configScope, `comm anchor "${anchor.label ?? anchor.sectorId}" references missing sector "${anchor.sectorId}"`);
      }
    }

    validateUnique(config.enemyForces ?? [], 'id', configScope);
    for (const enemy of config.enemyForces ?? []) {
      if (!sectorIds.has(enemy.sectorId)) {
        fail(configScope, `enemy "${enemy.id}" references missing sector "${enemy.sectorId}"`);
      }
      if (!enemy.type) fail(configScope, `enemy "${enemy.id}" is missing type`);
      if (!Number.isFinite(enemy.size) || enemy.size <= 0) {
        fail(configScope, `enemy "${enemy.id}" must have a positive size`);
      }
    }

    validateUnique(config.objectives ?? [], 'id', configScope);
    for (const objective of config.objectives ?? []) {
      if (objective.targetSectorId && !sectorIds.has(objective.targetSectorId)) {
        fail(configScope, `objective "${objective.id}" references missing sector "${objective.targetSectorId}"`);
      }
      if (!objective.type) fail(configScope, `objective "${objective.id}" is missing type`);
      if (!objective.title) fail(configScope, `objective "${objective.id}" is missing title`);
    }
  }
}

const mapIds = validateUnique(MAPS, 'id', 'map registry');
const mapsById = new Map(MAPS.map((map) => [map.id, map]));
for (const map of MAPS) validateMap(map);

const scenarios = readScenarios();
validateUnique(scenarios.map(({ scenario }) => scenario), 'id', 'scenario registry');
for (const entry of scenarios) validateScenario(entry, mapsById);

if (errors.length > 0) {
  console.error(`Validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Validated ${mapIds.size} map(s) and ${scenarios.length} scenario(s).`);
