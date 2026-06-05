// main.js
// Shrouded Front application entry point.
//
// This file wires together:
// - game/simulation.js
// - ui/map.js
// - ui/details.js
// - ui/operations.js
//
// Expected HTML mount points:
// - #mapMount
// - #detailPanel
// - #operationsPanel
// - #pauseBtn
// - #speedButtons button[data-speed]
// - #openOperationsBtn
// - #closeOperationsBtn
// - #operationsModal

import { createDefaultSimulation } from './game/simulation.js';
import { createMapView } from './ui/map.js';
import { createDetailPanel } from './ui/details.js';
import { createOperationsBoard } from './ui/operations.js';

const simulation = createDefaultSimulation();

const mapMount = document.getElementById('mapMount');
const detailMount = document.getElementById('detailPanel');
const operationsMount = document.getElementById('operationsPanel');
const operationsModal = document.getElementById('operationsModal');
const openOperationsBtn = document.getElementById('openOperationsBtn');
const closeOperationsBtn = document.getElementById('closeOperationsBtn');
const pauseBtn = document.getElementById('pauseBtn');
const speedButtons = document.querySelectorAll('[data-speed]');

if (!mapMount) throw new Error('Missing #mapMount');
if (!detailMount) throw new Error('Missing #detailPanel');
if (!operationsMount) throw new Error('Missing #operationsPanel');

const appState = {
  selectedSectorId: 'A1',
  hoveredSectorId: null,
  operationsOpen: false,
  tickRate: 1
};

function buildSectorIndex() {
  const sectorsById = {};
  for (const sector of simulation.listSectors()) {
    sectorsById[sector.id] = sector.toJSON();
  }
  return sectorsById;
}

function buildSectorUnitsIndex() {
  const sectorUnits = {};
  for (const sector of simulation.listSectors()) {
    sectorUnits[sector.id] = [];
  }

  for (const unit of simulation.listUnits()) {
    if (!sectorUnits[unit.sectorId]) {
      sectorUnits[unit.sectorId] = [];
    }
    sectorUnits[unit.sectorId].push({
      id: unit.id,
      name: unit.name,
      label: unit.label,
      count: 1,
      status: unit.status,
      type: unit.type,
      health: unit.health,
      food: unit.food,
      ammo: unit.ammo,
      readiness: unit.readiness,
      sectorId: unit.sectorId,
      commConnected: unit.commConnected
    });
  }

  return sectorUnits;
}

function getStateSnapshot() {
  const state = simulation.getState();
  return {
    ...state,
    selectedSectorId: appState.selectedSectorId,
    hoveredSectorId: appState.hoveredSectorId,
    sectorsById: buildSectorIndex(),
    sectorUnits: buildSectorUnitsIndex()
  };
}

const detailPanel = createDetailPanel({
  mount: detailMount,
  getState: getStateSnapshot
});

const operationsBoard = createOperationsBoard({
  mount: operationsMount,
  getState: getStateSnapshot
});

const mapView = createMapView({
  mount: mapMount,
  stateProvider: getStateSnapshot,
  onSectorSelect: (sector) => {
    appState.selectedSectorId = sector.id;
    detailPanel.renderSector(sector);
    refresh();
  },
  onSectorHover: (sector) => {
    appState.hoveredSectorId = sector.id;
    detailPanel.renderSector(sector);
    refresh(false);
  },
  onSectorLeave: () => {
    appState.hoveredSectorId = null;
    detailPanel.renderSector(appState.selectedSectorId);
    refresh(false);
  },
  onOpenOperations: () => {
    openOperations();
  },
  onOpenSectorDetails: (sector) => {
    detailPanel.renderSector(sector);
  },
  showDebugLabels: false
});

function refresh(renderMap = true) {
  const snapshot = getStateSnapshot();

  if (renderMap) {
    mapView.update(snapshot);
  }

  detailPanel.renderSector(appState.selectedSectorId);
  operationsBoard.render();

  if (pauseBtn) {
    pauseBtn.textContent = simulation.paused ? 'Resume' : 'Pause';
  }

  speedButtons.forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.speed) === simulation.speed);
  });
}

function openOperations() {
  appState.operationsOpen = true;
  if (operationsModal) {
    operationsModal.classList.remove('hidden');
    operationsModal.setAttribute('aria-hidden', 'false');
  }
  operationsBoard.render();
}

function closeOperations() {
  appState.operationsOpen = false;
  if (operationsModal) {
    operationsModal.classList.add('hidden');
    operationsModal.setAttribute('aria-hidden', 'true');
  }
}

function setupControls() {
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      simulation.togglePaused();
      refresh(false);
    });
  }

  speedButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const speed = Number(btn.dataset.speed);
      simulation.setSpeed(speed);
      refresh(false);
    });
  });

  if (openOperationsBtn) {
    openOperationsBtn.addEventListener('click', openOperations);
  }

  if (closeOperationsBtn) {
    closeOperationsBtn.addEventListener('click', closeOperations);
  }

  if (operationsModal) {
    operationsModal.addEventListener('click', (event) => {
      if (event.target === operationsModal) {
        closeOperations();
      }
    });
  }
}

function initialSelection() {
  const firstSector = simulation.listSectors()[0];
  if (firstSector) {
    appState.selectedSectorId = firstSector.id;
    detailPanel.renderSector(firstSector);
  } else {
    detailPanel.renderEmpty();
  }
}

function appTick() {
  if (!simulation.paused) {
    simulation.tick();
    if (appState.selectedSectorId) {
      detailPanel.renderSector(appState.selectedSectorId);
    }
    operationsBoard.render();
    mapView.update(getStateSnapshot());
  }
  requestAnimationFrame(appTick);
}

function bootstrap() {
  mapView.init();
  setupControls();
  initialSelection();
  refresh();
  requestAnimationFrame(appTick);
}

bootstrap();

