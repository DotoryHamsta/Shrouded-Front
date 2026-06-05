// main.js
// MVP-1 bootstrap: a single recon unit advances reconnaissance progress on the map.

import { MAP } from './data/map.js';
import { createMapView } from './ui/map.js';

const mount = document.getElementById('mapMount');

if (!mount) {
  document.body.innerHTML = '<div style="padding:24px;color:red;font-size:32px;">NO MOUNT</div>';
  throw new Error('No mapMount element found.');
}

document.body.style.margin = '0';
document.body.style.background = '#0f1319';
document.body.style.color = '#e8eff8';
document.body.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';

function cloneSector(raw) {
  return {
    ...raw,
    features: Array.isArray(raw.features) ? [...raw.features] : [],
    landmarks: Array.isArray(raw.landmarks) ? [...raw.landmarks] : [],
    neighbors: Array.isArray(raw.neighbors) ? [...raw.neighbors] : [],
    polygon: Array.isArray(raw.polygon) ? raw.polygon.map(([x, y]) => [x, y]) : [],
    center: raw.center ? { ...raw.center } : { x: 0, y: 0 },
    enemySummary: raw.enemySummary ? { ...raw.enemySummary } : null,
    friendlySummary: raw.friendlySummary ? { ...raw.friendlySummary } : null,
    occupancy: Array.isArray(raw.occupancy) ? [...raw.occupancy] : []
  };
}

const sectorState = Object.fromEntries(MAP.sectors.map((sector) => [sector.id, cloneSector(sector)]));
const sectorUnits = {};
for (const sector of MAP.sectors) {
  sectorUnits[sector.id] = [];
}

const alphaRecon = {
  id: 'U0001',
  name: 'Alpha Recon',
  label: '정찰병',
  count: 1,
  status: '정찰중 0%',
  health: 60,
  food: 12,
  ammo: 0,
  readiness: 100,
  sectorId: 'A1',
  commConnected: true
};
sectorUnits.A1 = [alphaRecon];

let selectedSectorId = 'A1';
let hoveredSectorId = null;
let time = 0;
let progress = 0;
let reportText = '정찰 시작 대기';
let reportTime = '--:--';
let latestReport = null;

const hud = document.createElement('div');
hud.style.position = 'fixed';
hud.style.top = '16px';
hud.style.right = '16px';
hud.style.zIndex = '9999';
hud.style.width = '320px';
hud.style.padding = '14px';
hud.style.border = '1px solid rgba(48,65,85,0.9)';
hud.style.borderRadius = '16px';
hud.style.background = 'rgba(17,23,35,0.94)';
hud.style.boxShadow = '0 10px 30px rgba(0,0,0,0.25)';
hud.innerHTML = `
  <div style="font-size:18px;font-weight:800;margin-bottom:8px;">정찰 상황</div>
  <div id="hudTime" style="color:#98a6b8;font-size:13px;margin-bottom:8px;">Time 00:00</div>
  <div style="height:10px;background:#243042;border-radius:999px;overflow:hidden;margin-bottom:8px;">
    <div id="progressBar" style="height:100%;width:0%;background:#8fbfff;"></div>
  </div>
  <div id="progressLabel" style="font-size:14px;font-weight:700;margin-bottom:10px;">Alpha Recon 0%</div>
  <div id="selectedSector" style="font-size:13px;color:#cfd8e4;margin-bottom:8px;">선택 구역: A1</div>
  <div id="reportBox" style="font-size:13px;line-height:1.45;color:#e8eff8;white-space:pre-wrap;">정찰 시작 대기</div>
`;
document.body.appendChild(hud);

function formatTime(minutes) {
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function buildSnapshot() {
  return {
    selectedSectorId,
    hoveredSectorId,
    sectorsById: sectorState,
    sectorUnits,
    reports: latestReport ? [latestReport] : []
  };
}

const mapView = createMapView({
  mount,
  stateProvider: buildSnapshot,
  onSectorSelect: (sector) => {
    selectedSectorId = sector.id;
    renderHud();
    mapView.update(buildSnapshot());
  },
  onSectorHover: (sector) => {
    hoveredSectorId = sector.id;
    mapView.update(buildSnapshot());
  },
  onSectorLeave: () => {
    hoveredSectorId = null;
    mapView.update(buildSnapshot());
  }
});

function updateRecon() {
  time += 1;

  if (progress < 100) {
    progress = Math.min(100, progress + 4);
    alphaRecon.status = `정찰중 ${progress}%`;
    sectorState.A1.reconProgress = progress;
    sectorState.A1.control = progress >= 60 ? 'revealed' : 'visible';
    sectorState.A1.reportSummary = progress >= 80 ? '적 보병 관측' : '정찰 진행중';
  }

  if (progress >= 80 && !latestReport) {
    latestReport = {
      time,
      source: 'Alpha Recon',
      sectorId: 'A1',
      sectorCode: 'Valley A',
      kind: 'recon',
      classTag: 'B',
      summary: '정찰 보고',
      body: 'Valley A
Enemy Infantry
40 (company)
Class B'
    };

    sectorState.A1.alert = true;
    sectorState.A1.alertLabel = '적 보병 관측';
    sectorState.A1.enemySummary = { class: 'B', size: 40, type: 'infantry' };
    reportText = '13:42
Alpha Recon
Valley A
Enemy Infantry
40 (company)
Class B';
  } else if (progress >= 80) {
    reportText = latestReport ? latestReport.body : reportText;
  } else {
    reportText = `Alpha Recon 정찰중... ${progress}%`;
  }

  renderHud();
  mapView.update(buildSnapshot());
}

function renderHud() {
  const hudTime = hud.querySelector('#hudTime');
  const progressBar = hud.querySelector('#progressBar');
  const progressLabel = hud.querySelector('#progressLabel');
  const selectedSector = hud.querySelector('#selectedSector');
  const reportBox = hud.querySelector('#reportBox');

  if (hudTime) hudTime.textContent = `Time ${formatTime(time)}`;
  if (progressBar) progressBar.style.width = `${progress}%`;
  if (progressLabel) progressLabel.textContent = `Alpha Recon ${progress}%`;

  const selected = sectorState[selectedSectorId];
  if (selectedSector && selected) {
    selectedSector.textContent = `선택 구역: ${selected.code} / ${selected.terrainLabel}`;
  }

  if (reportBox) {
    reportBox.textContent = reportText;
  }
}

mapView.init();
renderHud();
mapView.update(buildSnapshot());

setInterval(updateRecon, 1000);
