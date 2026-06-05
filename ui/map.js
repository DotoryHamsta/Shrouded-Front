// ui/map.js
// SVG map renderer for Shrouded Front.
// Renders the full sector map from data/map.js.

import { MAP, getSectorById } from '../data/map.js?v=23';
import { unitSymbolKind, unitTone, describeUnitActivity } from './unit-display.js?v=23';

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
  if (sector.alert || sector.alertLabel || sector.enemySummary) return '보고 있음';
  if (sector.reconProgress >= 80) return '보고 확보';
  if (sector.reconProgress > 0) return '정찰중';
  if (sector.control === 'revealed') return '관측중';
  if (sector.control === 'visible') return '가시권';
  if (sector.control === 'unseen') return '미탐색';
  return '상태 미정';
}

// Units are now drawn as map tokens, so the per-sector text overlay no longer
// duplicates the unit count.
function getOverlayText() {
  return '';
}

// Draws a NATO-style symbol inside a counter rect centered at (0,0) of the token group.
// width/height describe the inner symbol box.
function appendSymbol(group, kind, w, h) {
  const halfW = w / 2;
  const halfH = h / 2;
  const stroke = 'rgba(235,242,250,0.96)';

  if (kind === 'infantry') {
    // Crossed diagonals (X).
    const l1 = createSvgEl('line');
    l1.setAttribute('x1', `${-halfW}`); l1.setAttribute('y1', `${-halfH}`);
    l1.setAttribute('x2', `${halfW}`); l1.setAttribute('y2', `${halfH}`);
    const l2 = createSvgEl('line');
    l2.setAttribute('x1', `${halfW}`); l2.setAttribute('y1', `${-halfH}`);
    l2.setAttribute('x2', `${-halfW}`); l2.setAttribute('y2', `${halfH}`);
    for (const l of [l1, l2]) {
      l.setAttribute('stroke', stroke);
      l.setAttribute('stroke-width', '1.6');
      group.appendChild(l);
    }
  } else if (kind === 'recon') {
    // Single diagonal slash (cavalry / recon).
    const l = createSvgEl('line');
    l.setAttribute('x1', `${-halfW}`); l.setAttribute('y1', `${halfH}`);
    l.setAttribute('x2', `${halfW}`); l.setAttribute('y2', `${-halfH}`);
    l.setAttribute('stroke', stroke);
    l.setAttribute('stroke-width', '1.8');
    group.appendChild(l);
  } else if (kind === 'artillery') {
    // Filled dot.
    const c = createSvgEl('circle');
    c.setAttribute('cx', '0'); c.setAttribute('cy', '0');
    c.setAttribute('r', `${Math.min(halfW, halfH) * 0.5}`);
    c.setAttribute('fill', stroke);
    group.appendChild(c);
  }
}

export class SectorMapView {
  constructor({
    mount,
    stateProvider = () => ({}),
    onSectorSelect = () => {},
    onSectorHover = () => {},
    onSectorLeave = () => {},
    onOpenOperations = () => {},
    onOpenSectorDetails = () => {},
    onUnitSelect = () => {}
  } = {}) {
    if (!mount) throw new Error('SectorMapView requires a mount element.');

    this.mount = mount;
    this.stateProvider = stateProvider;
    this.onSectorSelect = onSectorSelect;
    this.onSectorHover = onSectorHover;
    this.onSectorLeave = onSectorLeave;
    this.onOpenOperations = onOpenOperations;
    this.onOpenSectorDetails = onOpenSectorDetails;
    this.onUnitSelect = onUnitSelect;

    this.svg = null;
    this.selectedSectorId = null;
    this.hoveredSectorId = null;
    this.selectedUnitId = null;
    this.sectorElements = new Map();
    this.labelElements = new Map();
    this.pinElements = new Map();
    this.unitLayer = null;
  }

  init() {
    this.mount.innerHTML = '';

    const shell = document.createElement('div');
    shell.className = 'sf-map-shell';
    shell.style.width = '100%';
    shell.style.height = '100%';
    shell.style.minHeight = '0';
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
    const unitLayer = createSvgEl('g');
    const pinLayer = createSvgEl('g');

    svg.append(defs, river, riverFoam, sectorLayer, labelLayer, unitLayer, pinLayer);
    shell.appendChild(svg);
    this.mount.appendChild(shell);
    this.svg = svg;
    this.unitLayer = unitLayer;

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
    if ('selectedUnitId' in state) this.selectedUnitId = state.selectedUnitId;

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

    this._renderUnitTokens(state);

    return this;
  }

  _renderUnitTokens(state) {
    if (!this.unitLayer) return;
    this.unitLayer.innerHTML = '';

    const sectorUnits = state.sectorUnits ?? {};
    const sectorsById = state.sectorsById ?? {};

    for (const [sectorId, units] of Object.entries(sectorUnits)) {
      const live = (units || []).filter((u) => u && u.status !== 'dead');
      if (live.length === 0) continue;

      const sector = sectorsById[sectorId] ?? getSectorById(sectorId);
      const center = centerOf(sector);

      const tokenW = 46;
      const tokenH = 30;
      const gap = 10;
      const totalW = live.length * tokenW + (live.length - 1) * gap;
      const startX = center.x - totalW / 2 + tokenW / 2;
      const baseY = center.y + 38;

      live.forEach((unit, i) => {
        const px = startX + i * (tokenW + gap);
        this.unitLayer.appendChild(this._buildToken(unit, px, baseY, tokenW, tokenH));
      });
    }
  }

  _buildToken(unit, px, py, w, h) {
    const tone = unitTone(unit);
    const selected = this.selectedUnitId === unit.id;
    const kind = unitSymbolKind(unit.type);

    const group = createSvgEl('g');
    group.dataset.unitId = unit.id;
    group.style.cursor = 'pointer';
    group.setAttribute('transform', `translate(${px}, ${py})`);

    // Counter body.
    const rect = createSvgEl('rect');
    rect.setAttribute('x', `${-w / 2}`);
    rect.setAttribute('y', `${-h / 2}`);
    rect.setAttribute('width', `${w}`);
    rect.setAttribute('height', `${h}`);
    rect.setAttribute('rx', '4');
    rect.setAttribute('fill', tone.fill);
    rect.setAttribute('stroke', selected ? 'rgba(255,255,255,0.98)' : tone.stroke);
    rect.setAttribute('stroke-width', selected ? '3' : '1.8');
    if (selected) rect.setAttribute('filter', 'drop-shadow(0 0 6px rgba(143,191,255,0.8))');
    group.appendChild(rect);

    // NATO symbol inside the counter.
    appendSymbol(group, kind, w - 16, h - 12);

    // Level badge (top-right).
    const badge = createSvgEl('circle');
    badge.setAttribute('cx', `${w / 2 - 4}`);
    badge.setAttribute('cy', `${-h / 2 + 4}`);
    badge.setAttribute('r', '7');
    badge.setAttribute('fill', 'rgba(15,19,25,0.95)');
    badge.setAttribute('stroke', tone.stroke);
    badge.setAttribute('stroke-width', '1');
    group.appendChild(badge);

    const lvl = createSvgEl('text');
    lvl.setAttribute('x', `${w / 2 - 4}`);
    lvl.setAttribute('y', `${-h / 2 + 7.5}`);
    lvl.setAttribute('text-anchor', 'middle');
    lvl.setAttribute('fill', 'rgba(240,245,250,0.96)');
    lvl.setAttribute('font-size', '9');
    lvl.setAttribute('font-weight', '800');
    lvl.setAttribute('pointer-events', 'none');
    lvl.textContent = String(unit.level ?? 1);
    group.appendChild(lvl);

    // Warning flag for degraded states.
    if (tone.warn) {
      const warn = createSvgEl('circle');
      warn.setAttribute('cx', `${-w / 2 + 4}`);
      warn.setAttribute('cy', `${-h / 2 + 4}`);
      warn.setAttribute('r', '4');
      warn.setAttribute('fill', tone.stroke);
      group.appendChild(warn);
    }

    // Unit name above the token.
    const name = createSvgEl('text');
    name.setAttribute('x', '0');
    name.setAttribute('y', `${-h / 2 - 6}`);
    name.setAttribute('text-anchor', 'middle');
    name.setAttribute('fill', 'rgba(230,238,248,0.92)');
    name.setAttribute('font-size', '11');
    name.setAttribute('font-weight', '700');
    name.setAttribute('pointer-events', 'none');
    name.textContent = escapeText(unit.name || unit.label || '');
    group.appendChild(name);

    // Activity text below the token.
    const activity = describeUnitActivity(unit);
    const act = createSvgEl('text');
    act.setAttribute('x', '0');
    act.setAttribute('y', `${h / 2 + 15}`);
    act.setAttribute('text-anchor', 'middle');
    act.setAttribute('fill', activity.tone === 'warn'
      ? 'rgba(255,160,120,0.95)'
      : activity.tone === 'recon' || activity.tone === 'setup'
        ? 'rgba(170,210,255,0.95)'
        : 'rgba(190,202,216,0.85)');
    act.setAttribute('font-size', '10.5');
    act.setAttribute('pointer-events', 'none');
    act.textContent = activity.text;
    group.appendChild(act);

    group.addEventListener('click', (event) => {
      event.stopPropagation();
      this.selectedUnitId = unit.id;
      this.onUnitSelect(unit);
    });

    return group;
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
