import { createDefaultSimulation } from './game/simulation.js?v=22';
import { formatTime } from './game/report.js?v=20';
import { createMapView } from './ui/map.js?v=21';
import { createDetailPanel } from './ui/details.js?v=21';
import { createOperationsBoard } from './ui/operations.js?v=20';
import { createUnitRoster } from './ui/roster.js?v=21';

const TICK_MS = 1000;
const SPEEDS = [0.5, 1, 2, 4];

const root = document.getElementById('mapMount');

if (!root) {
  throw new Error('No mapMount element found.');
}

root.innerHTML = `
  <div id="app">
    <header class="topbar">
      <div class="titleBlock">
        <h1>Shrouded Front</h1>
        <p id="timeReadout">00:00 · Turn 0</p>
      </div>
      <div class="controls">
        <button class="btn" id="pauseButton" type="button">Pause</button>
        <div class="speedGroup" id="speedButtons">
          ${SPEEDS.map((speed) => `<button class="btn speedBtn" type="button" data-speed="${speed}">${speed}x</button>`).join('')}
        </div>
        <button class="btn primary" id="operationsButton" type="button">작전판</button>
      </div>
    </header>

    <main class="layout">
      <section class="mapWrap">
        <div class="mapHeader">
          <span id="mapStatus">정찰 대기</span>
          <span id="alertStatus">Alerts 0 · Reports 0</span>
        </div>
        <div class="mapMount" id="mainMapMount"></div>
      </section>

      <aside class="sidePanel">
        <section class="panel">
          <div class="sf-panel-tabs" id="panelTabs">
            <button class="sf-tab active" type="button" data-view="sector">구역 상세</button>
            <button class="sf-tab" type="button" data-view="unit">유닛</button>
          </div>
          <div class="details" id="detailMount"></div>
          <div class="details hidden" id="rosterMount"></div>
        </section>
      </aside>
    </main>

    <div class="modal hidden" id="operationsModal" aria-hidden="true">
      <div class="modalCard" role="dialog" aria-modal="true" aria-labelledby="operationsTitle">
        <div class="modalHeader">
          <div>
            <div class="sf-ops-title" id="operationsTitle">작전판</div>
            <div class="sf-ops-subtitle" id="operationsSubtitle">전체 전장 수치</div>
          </div>
          <button class="btn" id="closeOperationsButton" type="button">닫기</button>
        </div>
        <div class="modalBody" id="operationsMount"></div>
      </div>
    </div>
  </div>
`;

const simulation = createDefaultSimulation();
let state = simulation.getState();
let selectedSectorId = state.units.find((unit) => unit.name === 'Alpha Recon')?.sectorId
  ?? state.sectors[0]?.id
  ?? null;
let hoveredSectorId = null;
let selectedUnitId = null;
let panelView = 'sector';
let lastFrameTime = performance.now();
let tickAccumulator = 0;

const mainMapMount = document.getElementById('mainMapMount');
const detailMount = document.getElementById('detailMount');
const rosterMount = document.getElementById('rosterMount');
const operationsMount = document.getElementById('operationsMount');
const operationsModal = document.getElementById('operationsModal');
const pauseButton = document.getElementById('pauseButton');
const speedButtons = [...document.querySelectorAll('.speedBtn')];
const operationsButton = document.getElementById('operationsButton');
const closeOperationsButton = document.getElementById('closeOperationsButton');
const timeReadout = document.getElementById('timeReadout');
const mapStatus = document.getElementById('mapStatus');
const alertStatus = document.getElementById('alertStatus');
const panelTabs = [...document.querySelectorAll('.sf-tab')];

function buildSectorUnits(units = []) {
  return units.reduce((acc, unit) => {
    if (!unit.sectorId) return acc;
    if (!acc[unit.sectorId]) acc[unit.sectorId] = [];
    acc[unit.sectorId].push(unit);
    return acc;
  }, {});
}

function buildSectorsById(sectors = []) {
  return sectors.reduce((acc, sector) => {
    acc[sector.id] = sector;
    return acc;
  }, {});
}

function getViewState() {
  return {
    ...state,
    selectedSectorId,
    hoveredSectorId,
    selectedUnitId,
    sectorsById: buildSectorsById(state.sectors),
    sectorUnits: buildSectorUnits(state.units)
  };
}

function getSelectedSector() {
  return state.sectors.find((sector) => sector.id === selectedSectorId) ?? null;
}

function isOperationsOpen() {
  return !operationsModal.classList.contains('hidden');
}

const detailPanel = createDetailPanel({
  mount: detailMount,
  getState: () => state,
  onIssueRecon: (unitId, targetSectorId) => {
    simulation.issueReconOrder(unitId, targetSectorId);
    state = simulation.getState();
    renderAll();
  }
});

const operationsBoard = createOperationsBoard({
  mount: operationsMount,
  getState: () => state
});

const unitRoster = createUnitRoster({
  mount: rosterMount,
  getState: () => state,
  onSelect: (unitId) => selectUnit(unitId)
});

const mapView = createMapView({
  mount: mainMapMount,
  stateProvider: getViewState,
  onSectorSelect: (sector) => {
    selectedSectorId = sector.id;
    selectedUnitId = null;
    renderAll();
  },
  onSectorHover: (sector) => {
    hoveredSectorId = sector.id;
  },
  onSectorLeave: () => {
    hoveredSectorId = null;
  },
  onOpenSectorDetails: (sector) => {
    selectedSectorId = sector.id;
    selectedUnitId = null;
    renderAll();
  },
  onUnitSelect: (unit) => selectUnit(unit.id),
  onOpenOperations: openOperations
});

function selectUnit(unitId) {
  const unit = state.units.find((u) => u.id === unitId);
  if (!unit) return;
  selectedUnitId = unitId;
  if (unit.sectorId) selectedSectorId = unit.sectorId;
  setPanelView('unit');
  renderAll();
}

function setPanelView(view) {
  panelView = view === 'unit' ? 'unit' : 'sector';
  panelTabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.view === panelView));
  detailMount.classList.toggle('hidden', panelView !== 'sector');
  rosterMount.classList.toggle('hidden', panelView !== 'unit');
}

function setSpeed(speed) {
  simulation.setSpeed(speed);
  state = simulation.getState();
  speedButtons.forEach((button) => {
    button.classList.toggle('active', Number(button.dataset.speed) === simulation.speed);
  });
  renderHeader();
}

function togglePaused() {
  simulation.togglePaused();
  state = simulation.getState();
  renderHeader();
}

function openOperations() {
  operationsModal.classList.remove('hidden');
  operationsModal.setAttribute('aria-hidden', 'false');
  operationsBoard.render();
}

function closeOperations() {
  operationsModal.classList.add('hidden');
  operationsModal.setAttribute('aria-hidden', 'true');
}

function renderHeader() {
  const selected = getSelectedSector();
  const alertCount = state.sectors.filter((sector) => sector.alert || sector.enemySummary).length;
  const reconUnit = state.units.find((unit) => unit.type === 'recon');
  const reconProgress = reconUnit ? `${Math.round(reconUnit.reconProgress ?? 0)}%` : '0%';

  timeReadout.textContent = `${formatTime(state.time)} · Turn ${state.turn}`;
  pauseButton.textContent = state.paused ? 'Resume' : 'Pause';
  pauseButton.classList.toggle('active', state.paused);
  mapStatus.textContent = selected
    ? `${selected.code} · Alpha Recon ${reconProgress}`
    : `Alpha Recon ${reconProgress}`;
  alertStatus.textContent = `Alerts ${alertCount} · Reports ${state.reports.length}`;
  speedButtons.forEach((button) => {
    button.classList.toggle('active', Number(button.dataset.speed) === state.speed);
  });
}

function renderAll() {
  const selected = getSelectedSector();
  renderHeader();
  mapView.update(getViewState());

  if (selected) {
    detailPanel.renderSector(selected);
  } else {
    detailPanel.renderEmpty();
  }

  unitRoster.setSelected(selectedUnitId);
  unitRoster.render();

  if (isOperationsOpen()) {
    operationsBoard.render();
  }
}

function frame(now) {
  const elapsed = now - lastFrameTime;
  lastFrameTime = now;

  if (!simulation.paused) {
    tickAccumulator += elapsed * simulation.speed;
  }

  let advanced = false;
  while (tickAccumulator >= TICK_MS) {
    state = simulation.tick();
    tickAccumulator -= TICK_MS;
    advanced = true;
  }

  if (advanced) {
    renderAll();
  }

  requestAnimationFrame(frame);
}

pauseButton.addEventListener('click', togglePaused);
operationsButton.addEventListener('click', openOperations);
closeOperationsButton.addEventListener('click', closeOperations);
operationsModal.addEventListener('click', (event) => {
  if (event.target === operationsModal) closeOperations();
});

for (const button of speedButtons) {
  button.addEventListener('click', () => setSpeed(Number(button.dataset.speed)));
}

for (const tab of panelTabs) {
  tab.addEventListener('click', () => {
    setPanelView(tab.dataset.view);
    renderAll();
  });
}

mapView.init();
setSpeed(1);
renderAll();
requestAnimationFrame(frame);
