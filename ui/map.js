// ui/map.js
// SVG map renderer for Shrouded Front.
// Renders the full sector map from data/map.js.

import { MAP, getSectorById } from '../data/map.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function createSvgEl(tag) {
  return document.createElementNS(SVG_NS, tag);
}

function toPointsString(points = []) {
  return points.map(([x, y]) => `${x},${y}`).join(' ');
}

function escapeText(value) {
  return String(value ?? '');
}

function centerOf(sector) {
  if (sector?.center && Number.isFinite(sector.center.x) && Number.isFinite(sector.center.y)) {
    return sector.center;
  }

  const points = Array.isArray(sector?.polygon) ? sector.polygon : [];
  if (points.length === 0) return { x: 0, y: 0 };

  const sum = points.reduce((acc, [x, y]) => {
    acc.x += x;
    acc.y += y;
    return acc;
  }, { x: 0, y: 0 });

  return {
    x: sum.x / points.length,
    y: sum.y / points.length
  };
}

function getStatusText(sector) {
  if (sector.alert || sector.alertLabel || sector.enemySummary) return '알림';
  if (sector.control === 'revealed') return '관측중';
  if (sector.control === 'visible') return '가시권';
  if (sector.control === 'unseen') return '미탐색';
  return '상태 미정';
}

function getOverlayText(sector, state = {}) {
  const sectorUnits = state.sectorUnits?.[sector.id] ?? [];
  if (sectorUnits.length > 0) {
    const unit = sectorUnits[0];
    const name = unit.label ?? unit.name ?? '유닛';
    const count = unit.count ?? 1;
    const status = unit.status ?? '정찰중';
    return `${name} ${count}명 ${status}`;
  }

  if (sector.enemySummary) {
    const enemy = sector.enemySummary;
    const type = enemy.type ? `적 ${enemy.type}` : '적 전력';
    const size = typeof enemy.size === 'number' ? `${enemy.size}명` : '?';
    return `${type} ${size}`;
  }

  if (sector.control === 'unseen') return '미탐색';
  return sector.reportSummary || '아군 영향권';
}

export class SectorMapView {
  constructor({
    mount,
    stateProvider = () => ({}),
    onSectorSelect = () => {},
    onSectorHover = () => {},
    onSectorLeave = () => {},
    onOpenOperations = () => {},
    onOpenSectorDetails = () => {}
  } = {}) {
    if (!mount) throw new Error('SectorMapView requires a mount element.');

    this.mount = mount;
    this.stateProvider = stateProvider;
    this.onSectorSelect = onSectorSelect;
    this.onSectorHover = onSectorHover;
    this.onSectorLeave = onSectorLeave;
    this.onOpenOperations = onOpenOperations;
    this.onOpenSectorDetails = onOpenSectorDetails;

    this.svg = null;
    this.selectedSectorId = null;
    this.hoveredSectorId = null;
    this.sectorElements = new Map();
    this.labelElements = new Map();
    this.pinElements = new Map();
  }

  init() {
    this.mount.innerHTML = '';

    const shell = document.createElement('div');
    shell.style.width = '100%';
    shell.style.height = '100%';
    shell.style.minHeight = '720px';
    shell.style.position = 'relative';

    const svg = createSvgEl('svg');
    svg.setAttribute('viewBox', '0 0 1200 820');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.display = 'block';
    svg.style.borderRadius = '18px';
    svg.style.background = 'linear-gradient(180deg, #111723, #0f1319)';
    svg.style.border = '1px solid rgba(48, 65, 85, 0.9)';

    const defs = createSvgEl('defs');
    defs.append(
      this._gradient('valleyGrad', '#44516a', '#2f3a4c'),
      this._gradient('ridgeGrad', '#726b57', '#585242'),
      this._gradient('plainGrad', '#334054', '#242d3b'),
      this._gradient('forestGrad', '#365c49', '#274334'),
      this._gradient('riverGrad', '#3b7fb0', '#275d84'),
      this._gradient('swampGrad', '#526052', '#343f3a')
    );

    const river = createSvgEl('path');
    river.setAttribute('d', 'M 125 62 C 205 130, 245 150, 290 202 S 390 320, 475 362 S 620 470, 705 560 S 875 690, 1040 760');
    river.setAttribute('fill', 'none');
    river.setAttribute('stroke', 'rgba(49, 123, 174, 0.96)');
    river.setAttribute('stroke-width', '10');
    river.setAttribute('stroke-linecap', 'round');
    river.setAttribute('stroke-linejoin', 'round');
    river.setAttribute('filter', 'drop-shadow(0 0 6px rgba(49,123,174,0.24))');

    const riverFoam = createSvgEl('path');
    riverFoam.setAttribute('d', 'M 125 62 C 205 130, 245 150, 290 202 S 390 320, 475 362 S 620 470, 705 560 S 875 690, 1040 760');
    riverFoam.setAttribute('fill', 'none');
    riverFoam.setAttribute('stroke', 'rgba(209, 236, 255, 0.36)');
    riverFoam.setAttribute('stroke-width', '3');
    riverFoam.setAttribute('stroke-linecap', 'round');
    riverFoam.setAttribute('stroke-linejoin', 'round');

    const sectorLayer = createSvgEl('g');
    const labelLayer = createSvgEl('g');
    const pinLayer = createSvgEl('g');

    svg.append(defs, river, riverFoam, sectorLayer, labelLayer, pinLayer);
    shell.appendChild(svg);
    this.mount.appendChild(shell);
    this.svg = svg;

    this._buildSectors(sectorLayer);
    this._buildOverlays(labelLayer, pinLayer);
    this.update();
  }

  _gradient(id, start, end) {
    const grad = createSvgEl('linearGradient');
    grad.setAttribute('id', id);
    grad.setAttribute('x1', '0%');
    grad.setAttribute('y1', '0%');
    grad.setAttribute('x2', '100%');
    grad.setAttribute('y2', '100%');

    const s1 = createSvgEl('stop');
    s1.setAttribute('offset', '0%');
    s1.setAttribute('stop-color', start);

    const s2 = createSvgEl('stop');
    s2.setAttribute('offset', '100%');
    s2.setAttribute('stop-color', end);

    grad.append(s1, s2);
    return grad;
  }

  _buildSectors(layer) {
    for (const rawSector of MAP.sectors) {
      const sector = getSectorById(rawSector.id) || rawSector;
      const polygon = createSvgEl('polygon');
      polygon.dataset.sectorId = sector.id;
      polygon.setAttribute('points', toPointsString(sector.polygon || []));
      polygon.setAttribute('fill', sector.svgFill || `url(#${this._terrainGradientId(sector.terrain)})`);
      polygon.setAttribute('stroke', 'rgba(255,255,255,0.16)');
      polygon.setAttribute('stroke-width', '2');
      polygon.style.cursor = 'pointer';
      polygon.style.transition = 'filter 120ms ease, stroke 120ms ease, stroke-width 120ms ease, opacity 120ms ease';

      polygon.addEventListener('click', () => {
        this.selectedSectorId = sector.id;
        this.onSectorSelect(sector);
        this.onOpenSectorDetails(sector);
        this.update();
      });

      polygon.addEventListener('mouseenter', () => {
        this.hoveredSectorId = sector.id;
        this.onSectorHover(sector);
        this.update();
      });

      polygon.addEventListener('mouseleave', () => {
        this.hoveredSectorId = null;
        this.onSectorLeave(sector);
        this.update();
      });

      layer.appendChild(polygon);
      this.sectorElements.set(sector.id, polygon);
    }
  }

  _terrainGradientId(terrain) {
    if (terrain === 'valley') return 'valleyGrad';
    if (terrain === 'ridge') return 'ridgeGrad';
    if (terrain === 'forest') return 'forestGrad';
    if (terrain === 'river') return 'riverGrad';
    if (terrain === 'swamp') return 'swampGrad';
    return 'plainGrad';
  }

  _buildOverlays(labelLayer, pinLayer) {
    for (const rawSector of MAP.sectors) {
      const sector = getSectorById(rawSector.id) || rawSector;
      const center = centerOf(sector);
      const group = createSvgEl('g');
      group.dataset.sectorId = sector.id;

      const code = createSvgEl('text');
      code.setAttribute('x', `${center.x - 56}`);
      code.setAttribute('y', `${center.y - 8}`);
      code.setAttribute('fill', 'rgba(240,245,250,0.94)');
      code.setAttribute('font-size', '18');
      code.setAttribute('font-weight', '800');
      code.setAttribute('pointer-events', 'none');
      code.textContent = escapeText(sector.code);

      const status = createSvgEl('text');
      status.setAttribute('x', `${center.x - 56}`);
      status.setAttribute('y', `${center.y + 12}`);
      status.setAttribute('fill', 'rgba(216,224,235,0.75)');
      status.setAttribute('font-size', '12');
      status.setAttribute('pointer-events', 'none');
      status.textContent = getStatusText(sector);

      const units = createSvgEl('text');
      units.setAttribute('x', `${center.x - 56}`);
      units.setAttribute('y', `${center.y + 29}`);
      units.setAttribute('fill', 'rgba(166,180,199,0.74)');
      units.setAttribute('font-size', '11');
      units.setAttribute('pointer-events', 'none');
      units.textContent = getOverlayText(sector, this.stateProvider());

      group.append(code, status, units);
      labelLayer.appendChild(group);
      this.labelElements.set(sector.id, group);

      const pin = createSvgEl('text');
      pin.dataset.sectorId = sector.id;
      pin.setAttribute('x', `${center.x + 18}`);
      pin.setAttribute('y', `${center.y - 16}`);
      pin.setAttribute('fill', '#ff5e5e');
      pin.setAttribute('font-size', '20');
      pin.setAttribute('font-weight', '800');
      pin.setAttribute('pointer-events', 'none');
      pin.textContent = sector.alert || sector.alertLabel || sector.enemySummary ? '🔴' : '';
      pinLayer.appendChild(pin);
      this.pinElements.set(sector.id, pin);
    }
  }

  update(partialState = null) {
    const state = partialState ?? this.stateProvider() ?? {};
    this.selectedSectorId = state.selectedSectorId ?? this.selectedSectorId;
    this.hoveredSectorId = state.hoveredSectorId ?? this.hoveredSectorId;

    for (const rawSector of MAP.sectors) {
      const sector = state.sectorsById?.[rawSector.id] ?? getSectorById(rawSector.id) ?? rawSector;
      const polygon = this.sectorElements.get(sector.id);
      const labelGroup = this.labelElements.get(sector.id);
      const pin = this.pinElements.get(sector.id);
      const center = centerOf(sector);
      const alertState = Boolean(sector.alert || sector.alertLabel || sector.enemySummary);
      const selected = this.selectedSectorId === sector.id;
      const hovered = this.hoveredSectorId === sector.id;

      if (polygon) {
        polygon.setAttribute('stroke', alertState ? 'rgba(255,94,94,0.92)' : selected ? 'rgba(143,191,255,0.92)' : 'rgba(255,255,255,0.16)');
        polygon.setAttribute('stroke-width', alertState || selected ? '4' : '2');
        polygon.setAttribute('opacity', sector.control === 'unseen' ? '0.94' : '1');
        polygon.style.filter = hovered ? 'brightness(1.08)' : selected ? 'brightness(1.12)' : '';
      }

      if (labelGroup) {
        const texts = labelGroup.querySelectorAll('text');
        if (texts[0]) texts[0].textContent = escapeText(sector.code);
        if (texts[1]) texts[1].textContent = getStatusText(sector);
        if (texts[2]) texts[2].textContent = getOverlayText(sector, state);
      }

      if (pin) {
        pin.setAttribute('x', `${center.x + 18}`);
        pin.setAttribute('y', `${center.y - 16}`);
        pin.textContent = alertState ? '🔴' : '';
      }
    }

    return this;
  }

  destroy() {
    if (this.mount) this.mount.innerHTML = '';
    this.svg = null;
    this.sectorElements.clear();
    this.labelElements.clear();
    this.pinElements.clear();
  }
}

export function createMapView(options = {}) {
  return new SectorMapView(options);
}
