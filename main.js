import { createDefaultSimulation, createSimulation } from './game/simulation.js?v=36';
import { formatDuration, formatRations, formatTime } from './game/report.js?v=28';
import { codeForSector } from './data/map.js?v=36';
import {
  CAPABILITY_KEYS,
  CAPABILITY_LABELS,
  DEFAULT_COMM_ANCHORS,
  capabilityBand
} from './game/formation.js?v=31';
import { createMapView } from './ui/map.js?v=36';
import { createDetailPanel } from './ui/details.js?v=36';
import { createOperationsBoard } from './ui/operations.js?v=36';
import { createUnitRoster } from './ui/roster.js?v=36';
import { createFormationSetup } from './ui/setup.js?v=31';

const TICK_MS = 1000;
const SPEEDS = [0.5, 1, 2, 4];
const RECON_DURATION_PRESETS = [4 * 60, 8 * 60, 24 * 60];

const root = document.getElementById('mapMount');

if (!root) {
  throw new Error('No mapMount element found.');
}

root.innerHTML = `
  <div id="app">
    <section class="sf-setup-screen" id="setupScreen"></section>

    <div class="sf-operation-shell hidden" id="operationShell">
      <header class="topbar">
        <div class="titleBlock">
          <h1>Shrouded Front</h1>
          <p id="timeReadout">작전시각 D1 06:00</p>
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
            <span id="mapStatus">작전 대기</span>
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

      <div class="sf-unit-command-modal hidden" id="unitCommandModal" aria-hidden="true">
        <div class="sf-unit-command-card" role="dialog" aria-modal="true" aria-labelledby="unitCommandTitle">
          <div class="sf-unit-command-head">
            <div>
              <div class="sf-unit-command-title" id="unitCommandTitle">유닛 명령</div>
              <div class="sf-unit-command-subtitle" id="unitCommandSubtitle"></div>
            </div>
            <button class="btn sf-unit-command-close" id="closeUnitCommandButton" type="button">닫기</button>
          </div>
          <div class="sf-unit-command-body" id="unitCommandMount"></div>
        </div>
      </div>
    </div>
  </div>
`;

let simulation = createDefaultSimulation();
let state = simulation.getState();
let selectedSectorId = state.units[0]?.sectorId
  ?? state.sectors[0]?.id
  ?? null;
let appPhase = 'setup';
let hoveredSectorId = null;
let selectedUnitId = null;
let unitCommandOpen = false;
let unitCommandNotice = '';
let panelView = 'sector';
let lastFrameTime = performance.now();
let tickAccumulator = 0;

const mainMapMount = document.getElementById('mainMapMount');
const setupScreen = document.getElementById('setupScreen');
const operationShell = document.getElementById('operationShell');
const detailMount = document.getElementById('detailMount');
const rosterMount = document.getElementById('rosterMount');
const operationsMount = document.getElementById('operationsMount');
const operationsModal = document.getElementById('operationsModal');
const unitCommandModal = document.getElementById('unitCommandModal');
const unitCommandMount = document.getElementById('unitCommandMount');
const unitCommandSubtitle = document.getElementById('unitCommandSubtitle');
const pauseButton = document.getElementById('pauseButton');
const speedButtons = [...document.querySelectorAll('.speedBtn')];
const operationsButton = document.getElementById('operationsButton');
const closeOperationsButton = document.getElementById('closeOperationsButton');
const closeUnitCommandButton = document.getElementById('closeUnitCommandButton');
const timeReadout = document.getElementById('timeReadout');
const mapStatus = document.getElementById('mapStatus');
const alertStatus = document.getElementById('alertStatus');
const panelTabs = [...document.querySelectorAll('.sf-tab')];

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

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
  getState: () => state
});

const operationsBoard = createOperationsBoard({
  mount: operationsMount,
  getState: () => state
});

const unitRoster = createUnitRoster({
  mount: rosterMount,
  getState: () => state,
  onSelect: (unitId) => selectUnit(unitId, { openCommand: true, showUnitTab: true })
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
  onUnitSelect: (unit) => selectUnit(unit.id, { openCommand: true }),
  onOpenOperations: openOperations
});

const setupFlow = createFormationSetup({
  mount: setupScreen,
  onStart: startOperation
});

function startOperation(units = []) {
  simulation = createSimulation({
    units,
    reports: [],
    commAnchors: DEFAULT_COMM_ANCHORS
  });
  state = simulation.getState();
  selectedSectorId = state.units[0]?.sectorId ?? state.sectors[0]?.id ?? null;
  selectedUnitId = null;
  hoveredSectorId = null;
  unitCommandNotice = '';
  appPhase = 'operation';
  tickAccumulator = 0;
  lastFrameTime = performance.now();
  setupScreen.classList.add('hidden');
  operationShell.classList.remove('hidden');
  closeOperations();
  closeUnitCommand();
  setPanelView('sector');
  setSpeed(1);
  renderAll();
}

function selectUnit(unitId, { openCommand = false, showUnitTab = false } = {}) {
  const unit = state.units.find((u) => u.id === unitId);
  if (!unit) return;
  selectedUnitId = unitId;
  if (unit.sectorId) selectedSectorId = unit.sectorId;
  if (showUnitTab) setPanelView('unit');
  if (openCommand) openUnitCommand();
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

function getSelectedUnit() {
  return state.units.find((unit) => unit.id === selectedUnitId) ?? null;
}

function sectorById(sectorId) {
  return state.sectors.find((sector) => sector.id === sectorId) ?? null;
}

function commandButton({
  action,
  sectorId = '',
  label,
  detail = '',
  disabled = false,
  tone = '',
  durationMinutes = null
}) {
  return `
    <button
      class="sf-command-btn ${escapeHtml(tone)}"
      type="button"
      data-action="${escapeHtml(action)}"
      ${sectorId ? `data-sector-id="${escapeHtml(sectorId)}"` : ''}
      ${Number.isFinite(durationMinutes) ? `data-duration-minutes="${durationMinutes}"` : ''}
      ${disabled ? 'disabled' : ''}
    >
      <span>${escapeHtml(label)}</span>
      ${detail ? `<small>${escapeHtml(detail)}</small>` : ''}
    </button>
  `;
}

function estimateLine(parts = []) {
  return parts.filter(Boolean).join(' · ');
}

function renderCapabilityChips(capabilities = {}) {
  return `
    <div class="sf-command-capabilities">
      ${CAPABILITY_KEYS.map((key) => {
        const value = Math.max(0, Math.min(100, Math.round(capabilities[key] ?? 0)));
        const band = capabilityBand(value);
        return `
          <div class="${escapeHtml(band.tone)}">
            <span>${escapeHtml(CAPABILITY_LABELS[key] ?? key)}</span>
            <strong>${escapeHtml(value)}</strong>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function openUnitCommand() {
  if (!selectedUnitId) return;
  unitCommandOpen = true;
  unitCommandModal.classList.remove('hidden');
  unitCommandModal.setAttribute('aria-hidden', 'false');
  renderUnitCommand();
}

function closeUnitCommand() {
  unitCommandOpen = false;
  unitCommandNotice = '';
  unitCommandModal.classList.add('hidden');
  unitCommandModal.setAttribute('aria-hidden', 'true');
}

function renderUnitCommand() {
  if (!unitCommandOpen) return;

  const unit = getSelectedUnit();
  if (!unit || unit.status === 'dead') {
    closeUnitCommand();
    return;
  }

  const currentSector = sectorById(unit.sectorId);
  const neighbors = (currentSector?.neighbors ?? []).map(sectorById).filter(Boolean);
  const disconnected = unit.commConnected === false;
  const returning = unit.status === 'returning' || unit.status === 'exhausted' || String(unit.command ?? '').includes('복귀');
  const moveDisabled = disconnected || returning;
  const supplyIds = Array.isArray(state.supplySectorIds) ? state.supplySectorIds : [];
  const nearestSupplyId = simulation.nearestSupplySectorId(unit.sectorId);
  const atSupply = supplyIds.includes(unit.sectorId);
  const foodPct = Math.max(0, Math.min(100, (unit.food / Math.max(1, unit.maxFood ?? unit.food ?? 1)) * 100));
  const foodText = formatRations(unit.food ?? 0);
  const cohesion = Math.max(0, Math.min(100, unit.cohesion ?? 0));
  const targetText = unit.targetSectorId ? codeForSector(unit.targetSectorId) : '-';
  const notice = unitCommandNotice
    ? `<div class="sf-command-notice">${escapeHtml(unitCommandNotice)}</div>`
    : '';

  unitCommandSubtitle.textContent = `${unit.name || unit.label || unit.id} · ${codeForSector(unit.sectorId)}`;

  const moveButtons = [
    commandButton({
      action: 'move',
      sectorId: unit.sectorId,
      label: '대기',
      disabled: disconnected
    }),
    ...neighbors.map((sector) => {
      const estimate = simulation.estimateMoveOrder(unit.id, sector.id);
      return commandButton({
        action: 'move',
        sectorId: sector.id,
        label: `${sector.code || sector.id} 이동`,
        detail: estimate ? `도착 ${formatDuration(estimate.travelMinutes)}` : '',
        disabled: moveDisabled
      });
    })
  ].join('');

  const reconButtons = unit.type === 'recon'
    ? `
      <div class="sf-command-section">
        <div class="sf-command-section-title">정찰</div>
        <div class="sf-mission-list">
          ${neighbors.map((sector) => {
            const baseEstimate = simulation.estimateReconOrder(unit.id, sector.id, { durationMinutes: RECON_DURATION_PRESETS[0] });
            const meta = baseEstimate
              ? estimateLine([
                `도착 ${formatDuration(baseEstimate.travelMinutes)}`,
                `첫 보고 ${formatDuration(baseEstimate.firstReportMinutes)}`,
                `주기 ${formatDuration(baseEstimate.reportIntervalMinutes)}`,
                `복귀 ${formatDuration(baseEstimate.returnMinutes)}`
              ])
              : '';
            const safe = baseEstimate ? `안전 체류 ${formatDuration(baseEstimate.safeOnStationMinutes)}` : '';
            return `
              <div class="sf-mission-card">
                <div class="sf-mission-head">
                  <strong>${escapeHtml(sector.code || sector.id)} 정찰</strong>
                  ${safe ? `<span>${escapeHtml(safe)}</span>` : ''}
                </div>
                ${meta ? `<div class="sf-mission-meta">${escapeHtml(meta)}</div>` : ''}
                <div class="sf-mission-options">
                  ${RECON_DURATION_PRESETS.map((durationMinutes) => {
                    const estimate = simulation.estimateReconOrder(unit.id, sector.id, { durationMinutes });
                    const riskTone = estimate?.risk === 'insufficient'
                      ? 'danger'
                      : estimate?.risk === 'tight'
                        ? 'warn'
                        : '';
                    const detail = estimate
                      ? `식량 여유 ${estimate.marginFoodHours >= 0 ? formatRations(estimate.marginFoodHours) : `-${formatRations(Math.abs(estimate.marginFoodHours))}`}`
                      : '';
                    return commandButton({
                      action: 'recon',
                      sectorId: sector.id,
                      label: `현장 ${formatDuration(durationMinutes)}`,
                      detail,
                      disabled: moveDisabled,
                      tone: riskTone,
                      durationMinutes
                    });
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `
    : '';

  const returnEstimate = nearestSupplyId ? simulation.estimateReturnOrder(unit.id) : null;
  const returnButton = commandButton({
    action: 'return',
    sectorId: nearestSupplyId,
    label: atSupply ? '보급 거점 대기' : `${codeForSector(nearestSupplyId)} 복귀`,
    detail: returnEstimate ? `소요 ${formatDuration(returnEstimate.returnMinutes)}` : '',
    disabled: disconnected || atSupply || !nearestSupplyId,
    tone: 'warn'
  });

  const lockText = disconnected
    ? '<div class="sf-command-lock">통신 두절 — 신규 명령 불가</div>'
    : returning
      ? '<div class="sf-command-lock">보급 복귀 중 — 새 이동 명령 보류</div>'
      : '';

  unitCommandMount.innerHTML = `
    <div class="sf-command-status-grid">
      <div>
        <span>위치</span>
        <strong>${escapeHtml(currentSector?.code || unit.sectorId || '-')}</strong>
      </div>
      <div>
        <span>명령</span>
        <strong>${escapeHtml(unit.command || '대기')}</strong>
      </div>
      <div>
        <span>목표</span>
        <strong>${escapeHtml(targetText)}</strong>
      </div>
      <div>
        <span>통신</span>
        <strong>${disconnected ? '두절' : '연결'}</strong>
      </div>
      <div>
        <span>역할</span>
        <strong>${escapeHtml(unit.roleLabel || unit.role || unit.label || '-')}</strong>
      </div>
      <div>
        <span>편제</span>
        <strong>${escapeHtml(`${unit.personnelCount ?? '-'}명 · ${unit.echelon ?? '-'}`)}</strong>
      </div>
      <div>
        <span>리더</span>
        <strong>${escapeHtml(unit.leader?.name ?? '임시 지휘관')}</strong>
      </div>
      <div>
        <span>성향</span>
        <strong>${escapeHtml(unit.leader?.traitLabel ?? '안정 지휘')}</strong>
      </div>
    </div>

    ${renderCapabilityChips(unit.capabilities)}

    <div class="sf-command-bars">
      <div class="sf-command-bar-row">
        <span>HP</span>
        <div class="sf-command-bar"><i style="width:${Math.max(0, Math.min(100, (unit.health / Math.max(1, unit.maxHealth ?? 100)) * 100))}%"></i></div>
        <b>${Math.round(unit.health ?? 0)}</b>
      </div>
      <div class="sf-command-bar-row">
        <span>식량</span>
        <div class="sf-command-bar food"><i style="width:${foodPct}%"></i></div>
        <b>${escapeHtml(foodText)}</b>
      </div>
      <div class="sf-command-bar-row">
        <span>응집</span>
        <div class="sf-command-bar cohesion"><i style="width:${cohesion}%"></i></div>
        <b>${Math.round(cohesion)}%</b>
      </div>
    </div>

    ${lockText}
    ${notice}

    <div class="sf-command-section">
      <div class="sf-command-section-title">이동</div>
      <div class="sf-command-grid">${moveButtons}</div>
    </div>

    ${reconButtons}

    <div class="sf-command-section">
      <div class="sf-command-section-title">보급</div>
      <div class="sf-command-grid">${returnButton}</div>
    </div>
  `;
}

function handleUnitCommandAction(event) {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;

  const unit = getSelectedUnit();
  if (!unit) return;

  const action = button.dataset.action;
  const sectorId = button.dataset.sectorId || null;
  const durationMinutes = Number(button.dataset.durationMinutes);
  let result = null;

  if (action === 'move' && sectorId) {
    result = simulation.issueMoveOrder(unit.id, sectorId);
  } else if (action === 'recon' && sectorId) {
    result = simulation.issueReconOrder(unit.id, sectorId, {
      durationMinutes: Number.isFinite(durationMinutes) ? durationMinutes : null
    });
  } else if (action === 'return') {
    result = simulation.issueReturnOrder(unit.id);
  }

  unitCommandNotice = result?.blocked === 'disconnected'
    ? '통신 두절로 명령을 전달하지 못했다.'
    : '';

  state = simulation.getState();
  renderAll();
}

function renderHeader() {
  const selected = getSelectedSector();
  const alertCount = state.sectors.filter((sector) => sector.alert || sector.enemySummary).length;
  const focusUnit = getSelectedUnit() ?? state.units.find((unit) => unit.type === 'recon') ?? state.units[0];
  const progress = focusUnit ? `${Math.round(focusUnit.reconProgress ?? 0)}%` : '0%';
  const unitStatus = focusUnit ? `${focusUnit.name || focusUnit.label || focusUnit.id} ${progress}` : '작전 대기';

  timeReadout.textContent = `작전시각 ${formatTime(state.time)}`;
  pauseButton.textContent = state.paused ? 'Resume' : 'Pause';
  pauseButton.classList.toggle('active', state.paused);
  mapStatus.textContent = selected
    ? `${selected.code} · ${unitStatus}`
    : unitStatus;
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

  if (unitCommandOpen) {
    renderUnitCommand();
  }
}

function frame(now) {
  const elapsed = now - lastFrameTime;
  lastFrameTime = now;

  if (appPhase === 'operation' && !simulation.paused) {
    tickAccumulator += elapsed * simulation.speed;
  }

  let advanced = false;
  while (tickAccumulator >= TICK_MS) {
    state = simulation.tick();
    tickAccumulator -= TICK_MS;
    advanced = true;
  }

  if (appPhase === 'operation' && advanced) {
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
closeUnitCommandButton.addEventListener('click', closeUnitCommand);
unitCommandModal.addEventListener('click', (event) => {
  if (event.target === unitCommandModal) closeUnitCommand();
});
unitCommandMount.addEventListener('click', handleUnitCommandAction);

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
simulation.setSpeed(1);
setupFlow.render();
renderAll();
requestAnimationFrame(frame);
