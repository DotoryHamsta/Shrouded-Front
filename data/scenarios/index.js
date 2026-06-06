// data/scenarios/index.js
// Scenario registry. JSON stays data-only so it can move to a build step,
// editor, or server without rewriting simulation code.

import stage11 from './stage-1-1.json' with { type: 'json' };

function clone(value) {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value));
}

export const SCENARIOS = Object.freeze([stage11]);
export const DEFAULT_SCENARIO = stage11;
export const DEFAULT_SCENARIO_ID = DEFAULT_SCENARIO.id;

let activeScenario = DEFAULT_SCENARIO;

export function listScenarios() {
  return SCENARIOS.map((scenario) => ({
    id: scenario.id,
    stage: scenario.stage,
    title: scenario.title,
    summary: scenario.summary,
    defaultMapId: scenario.defaultMapId
  }));
}

export function getScenarioById(id) {
  return SCENARIOS.find((scenario) => scenario.id === id) || null;
}

export function getActiveScenario() {
  return activeScenario;
}

export function setActiveScenario(scenarioOrId = DEFAULT_SCENARIO_ID) {
  const next = typeof scenarioOrId === 'string'
    ? getScenarioById(scenarioOrId)
    : scenarioOrId;
  activeScenario = next || DEFAULT_SCENARIO;
  return activeScenario;
}

export function getScenarioOperationConfig(scenario = activeScenario) {
  return clone(scenario?.operation ?? {});
}

export function getScenarioMapConfig(scenario = activeScenario, mapOrId = null) {
  const mapId = typeof mapOrId === 'string' ? mapOrId : mapOrId?.id;
  const config = mapId ? scenario?.maps?.[mapId] : null;
  return clone(config ?? {});
}

export function getScenarioStartSectorId(scenario = activeScenario, mapOrId = null) {
  const map = typeof mapOrId === 'string' ? null : mapOrId;
  const config = getScenarioMapConfig(scenario, mapOrId);
  return config.startSectorId ?? map?.startSectorId ?? null;
}

export function getScenarioCommAnchors(scenario = activeScenario, mapOrId = null) {
  const map = typeof mapOrId === 'string' ? null : mapOrId;
  const config = getScenarioMapConfig(scenario, mapOrId);
  return clone(config.commAnchors ?? map?.commAnchors ?? []);
}

export function getScenarioObjectives(scenario = activeScenario, mapOrId = null) {
  const config = getScenarioMapConfig(scenario, mapOrId);
  return clone(config.objectives ?? []);
}

export function getScenarioEnemySummariesForMap(scenario = activeScenario, mapOrId = null) {
  const config = getScenarioMapConfig(scenario, mapOrId);
  const enemies = Array.isArray(config.enemyForces) ? config.enemyForces : [];
  return new Map(enemies.map((enemy) => [
    enemy.sectorId,
    {
      id: enemy.id,
      class: enemy.class,
      size: enemy.size,
      type: enemy.type
    }
  ]));
}
