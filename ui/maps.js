// ui/map.js
// SVG map renderer for Shrouded Front.
//
// This module renders the tactical sector map from data/map.js
// and exposes a small API for interaction and state updates.

import { MAP, getSectorById } from '../data/map.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const TERRAIN_GRADIENTS = {
  valley: {
    id: 'valleyGrad',
    start: '#42506a',
    end: '#2d3849'
  },
  ridge: {
    id: 'ridgeGrad',
    start: '#716b58',
    end: '#565141'
  },
  plain: {
    id: 'plainGrad',
    start: '#334054',
    end: '#242d3c'
  },
  forest: {
    id: 'forestGrad',
    start: '#355b48',
    end: '#274435'
  },
  river: {
    id: 'riverGrad',
    start: '#3b7fb0',
    end: '#275d84'
  },
  swamp: {
    id: 'swampGrad',
    start: '#4c5c48',
    end: '#33403a'
  }
};

function createSvgEl(tag) {
  return document.createElementNS(SVG_NS, tag);
}

function escapeText(value) {
  return String(value ?? '');
}

function toPointsString(points = []) {
  return points.map(([x, y]) => `${x},${y}`).join(' ');
}

function getSectorCenter(sector) {
  if (sector?.center && Number.isFinite(sector.center.x) && Number.isFinite(sector.center.y)) {
    return sector.center;
  }

  const points = Array.isArray(sector?.polygon) ? sector.polygon : [];
  if (points.length === 0) return { x: 0, y: 0 };

  const sum = points.reduce(
    (acc, [x, y]) => {
      acc.x += x;
      acc.y += y;
      return acc;
    },
    { x: 0, y: 0 }
  );

  return {
    x: sum.x / points.length,
    y: sum.y / points.length
  };
}

function defaultLabelForSector(sector) {
  if (!sector) return '';
  if (sector.reportSummary && sector.reportSummary !== '미탐색') return sector.reportSummary;

  if (sector.control === 'revealed') return '관측 중';
  if (sector.control === 'visible') return '가시권';
  if (sector.control === 'unseen') return '미탐색';
  return '상태 미정';
}

function defaultUnitOverlay(sector, units = []) {
  if (!sector) return '';

  if (Array.isArray(units) && units.length > 0) {
    const summary = units[0];
    if (summary?.label && summary?.count) {
      return `${summary.label} ${summary.count}명 ${summary.status ?? ''}`.trim();
    }
    if (summary?.name) {
      return `${summary.name}`;
    }
  }

  if (sector.enemySummary) {
    const enemy = sector.enemySummary;
    return `적 ${enemy.type ?? '전력'} ${enemy.size ?? '?'}명`;
  }

  return sector.control === 'unseen' ? '미탐색' : '아군 영향권';
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
    showDebugLabels = false
  } = {}) {
    if (!mount) {
      throw new Error('SectorMapView requires a mount element.');
    }

    this.mount = mount;
    this.stateProvider = stateProvider;
    this.onSectorSelect = onSectorSelect;
    this.onSectorHover = onSectorHover;
    this.onSectorLeave = onSectorLeave;
    this.onOpenOperations = onOpenOperations;
    this.onOpenSectorDetails = onOpenSectorDetails;
    this.showDebugLabels = showDebugLabels;

    this.selectedSectorId = null;
    this.hoveredSectorId = null;
    this.sectorElements = new Map();
    this.textElements = new Map();
    this.pinElements = new Map();
    this.statusElements = new Map();
    this.labelElements = new Map();

    this.svg = null;
    this.layerRoot = null;
    this.alertLayer = null;
    this.labelLayer = null;
    this.statusLayer = null;
    this.pinLayer = null;
    this.defs = null;
  }

  init() {
    this.mount.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'sf-map-shell';
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
    wrapper.style.position = 'relative';
    wrapper.style.overflow = 'hidden';

    const svg = createSvgEl('svg');
    svg.setAttribute('viewBox', '0 0 1200 820');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.display = 'block';
    svg.style.background = 'linear-gradient(180deg, #121923, #0f1319)';
    svg.style.borderRadius = '18px';
    svg.style.border = '1px solid rgba(48, 65, 85, 0.9)';

    const defs = createSvgEl('defs');
    this.defs = defs;
    this._buildTerrainGradients(defs);

    const backdrop = createSvgEl('rect');
    backdrop.setAttribute('x', '0');
    backdrop.setAttribute('y', '0');
    backdrop.setAttribute('width', '1200');
    backdrop.setAttribute('height', '820');
    backdrop.setAttribute('fill', '#11161d');
    backdrop.setAttribute('opacity', '0.92');

    const terrainGlow = createSvgEl('ellipse');
    terrainGlow.setAttribute('cx', '300');
    terrainGlow.setAttribute('cy', '150');
    terrainGlow.setAttribute('rx', '220');
    terrainGlow.setAttribute('ry', '120');
    terrainGlow.setAttribute('fill', 'rgba(134, 191, 255, 0.06)');

    const terrainGlow2 = createSvgEl('ellipse');
    terrainGlow2.setAttribute('cx', '1010');
    terrainGlow2.setAttribute('cy', '680');
    terrainGlow2.setAttribute('rx', '180');
    terrainGlow2.setAttribute('ry', '140');
    terrainGlow2.setAttribute('fill', 'rgba(127, 230, 160, 0.05)');

    const sectorLayer = createSvgEl('g');
    sectorLayer.setAttribute('id', 'sectorLayer');

    const riverLayer = createSvgEl('g');
    riverLayer.setAttribute('id', 'riverLayer');

    const labelLayer = createSvgEl('g');
    labelLayer.setAttribute('id', 'labelLayer');
    this.labelLayer = labelLayer;

    const statusLayer = createSvgEl('g');
    statusLayer.setAttribute('id', 'statusLayer');
    this.statusLayer = statusLayer;

    const pinLayer = createSvgEl('g');
    pinLayer.setAttribute('id', 'pinLayer');
    this.pinLayer = pinLayer;

    const overlayLayer = createSvgEl('g');
    overlayLayer.setAttribute('id', 'overlayLayer');

    svg.append(defs, backdrop, terrainGlow, terrainGlow2, riverLayer, sectorLayer, labelLayer, statusLayer, pinLayer, overlayLayer);
    wrapper.appendChild(svg);
    this.mount.appendChild(wrapper);

    this.svg = svg;
    this.layerRoot = sectorLayer;

    this._buildRiver(riverLayer);
    this._buildSectors(sectorLayer);
    this._buildStaticOverlay(overlayLayer);
    this.update();
  }

  _buildTerrainGradients(defs) {
    Object.values(TERRAIN_GRADIENTS).forEach((gradient) => {
      const linear = createSvgEl('linearGradient');
      linear.setAttribute('id', gradient.id);
      linear.setAttribute('x1', '0%');
      linear.setAttribute('y1', '0%');
      linear.setAttribute('x2', '100%');
      linear.setAttribute('y2', '100%');

      const stop1 = createSvgEl('stop');
      stop1.setAttribute('offset', '0%');
      stop1.setAttribute('stop-color', gradient.start);

      const stop2 = createSvgEl('stop');
      stop2.setAttribute('offset', '100%');
      stop2.setAttribute('stop-color', gradient.end);

      linear.append(stop1, stop2);
      defs.appendChild(linear);
    });

    const riverGlow = createSvgEl('filter');
    riverGlow.setAttribute('id', 'riverGlow');
    const blur = createSvgEl('feGaussianBlur');
    blur.setAttribute('stdDeviation', '2.5');
    blur.setAttribute('result', 'coloredBlur');
    const merge = createSvgEl('feMerge');
    const merge1 = createSvgEl('feMergeNode');
    merge1.setAttribute('in', 'coloredBlur');
    const merge2 = createSvgEl('feMergeNode');
    merge2.setAttribute('in', 'SourceGraphic');
    merge.append(merge1, merge2);
    riverGlow.append(blur, merge);
    defs.appendChild(riverGlow);
  }

  _buildRiver(layer) {
    const riverPath = createSvgEl('path');
    riverPath.setAttribute('d', 'M 125 62 C 205 130, 245 150, 290 202 S 390 320, 475 362 S 620 470, 705 560 S 875 690, 1040 760');
    riverPath.setAttribute('fill', 'none');
    riverPath.setAttribute('stroke', 'rgba(49, 123, 174, 0.96)');
    riverPath.setAttribute('stroke-width', '10');
    riverPath.setAttribute('stroke-linecap', 'round');
    riverPath.setAttribute('stroke-linejoin', 'round');
    riverPath.setAttribute('filter', 'url(#riverGlow)');

    const riverFoam = createSvgEl('path');
    riverFoam.setAttribute('d', 'M 125 62 C 205 130, 245 150, 290 202 S 390 320, 475 362 S 620 470, 705 560 S 875 690, 1040 760');
    riverFoam.setAttribute('fill', 'none');
    riverFoam.setAttribute('stroke', 'rgba(195, 231, 255, 0.38)');
    riverFoam.setAttribute('stroke-width', '3');
    riverFoam.setAttribute('stroke-linecap', 'round');
    riverFoam.setAttribute('stroke-linejoin', 'round');

    layer.append(riverPath, riverFoam);
  }

  _buildSectors(layer) {
    const state = this.stateProvider() || {};
    const selectedId = state.selectedSectorId ?? null;
    const hoveredId = state.hoveredSectorId ?? null;

    for (const rawSector of MAP.sectors) {
      const sector = getSectorById(rawSector.id) || rawSector;
      const polygon = createSvgEl('polygon');
      polygon.dataset.sectorId = sector.id;
      polygon.setAttribute('points', toPointsString(sector.polygon || []));
      polygon.setAttribute('fill', sector.svgFill || `url(#${TERRAIN_GRADIENTS[sector.terrain]?.id ?? 'plainGrad'})`);
      polygon.setAttribute('class', 'sf-sector');
      polygon.style.cursor = 'pointer';
      polygon.style.transition = 'filter 120ms ease, stroke 120ms ease, stroke-width 120ms ease, opacity 120ms ease';
      polygon.style.stroke = 'rgba(255,255,255,0.15)';
      polygon.style.strokeWidth = '2';

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

    this.selectedSectorId = selectedId;
    this.hoveredSectorId = hoveredId;
  }

  _buildStaticOverlay(overlayLayer) {
    // This layer is intentionally left simple for now.
    // It can later contain compasses, grid references, and route arrows.
    const title = createSvgEl('text');
    title.setAttribute('x', '24');
    title.setAttribute('y', '34');
    title.setAttribute('fill', 'rgba(232, 239, 248, 0.58)');
    title.setAttribute('font-size', '13');
    title.textContent = 'Operational Map';
    overlayLayer.appendChild(title);
  }

  _ensureTextNode(map, key, createFn) {
    if (!map.has(key)) {
      map.set(key, createFn());
    }
    return map.get(key);
  }

  _renderLabel(sector, x, y, state) {
    const label = this._ensureTextNode(this.labelElements, sector.id, () => {
      const group = createSvgEl('g');
      group.dataset.sectorId = sector.id;

      const name = createSvgEl('text');
      name.setAttribute('class', 'sf-sector-label');
      name.setAttribute('font-size', '18');
      name.setAttribute('font-weight', '800');
      name.setAttribute('fill', 'rgba(239, 243, 249, 0.92)');
      name.setAttribute('pointer-events', 'none');
      group.appendChild(name);

      const status = createSvgEl('text');
      status.setAttribute('class', 'sf-sector-status');
      status.setAttribute('font-size', '12');
      status.setAttribute('fill', 'rgba(211, 221, 234, 0.74)');
      status.setAttribute('pointer-events', 'none');
      group.appendChild(status);

      const sub = createSvgEl('text');
      sub.setAttribute('class', 'sf-sector-sub');
      sub.setAttribute('font-size', '11');
      sub.setAttribute('fill', 'rgba(160, 176, 196, 0.72)');
      sub.setAttribute('pointer-events', 'none');
      group.appendChild(sub);

      this.labelLayer.appendChild(group);
      return group;
    });

    const nameNode = label.querySelector('.sf-sector-label');
    const statusNode = label.querySelector('.sf-sector-status');
    const subNode = label.querySelector('.sf-sector-sub');

    if (nameNode) {
      nameNode.setAttribute('x', x - 54);
      nameNode.setAttribute('y', y - 6);
      nameNode.textContent = sector.code;
    }
    if (statusNode) {
      statusNode.setAttribute('x', x - 54);
      statusNode.setAttribute('y', y + 12);
      statusNode.textContent = defaultLabelForSector(sector);
    }
    if (subNode) {
      subNode.setAttribute('x', x - 54);
      subNode.setAttribute('y', y + 28);
      const unitState = defaultUnitOverlay(sector, state?.sectorUnits?.[sector.id] ?? []);
      subNode.textContent = unitState;
    }
  }

  _renderStatusBadge(sector, x, y, state) {
    const status = this._ensureTextNode(this.statusElements, sector.id, () => {
      const group = createSvgEl('g');
      group.dataset.sectorId = sector.id;

      const bg = createSvgEl('rect');
      bg.setAttribute('rx', '9');
      bg.setAttribute('ry', '9');
      bg.setAttribute('fill', 'rgba(17, 22, 29, 0.68)');
      bg.setAttribute('stroke', 'rgba(48, 65, 85, 0.75)');
      bg.setAttribute('stroke-width', '1');
      group.appendChild(bg);

      const text = createSvgEl('text');
      text.setAttribute('font-size', '11');
      text.setAttribute('font-weight', '700');
      text.setAttribute('fill', 'rgba(231, 238, 248, 0.84)');
      text.setAttribute('pointer-events', 'none');
      group.appendChild(text);

      this.statusLayer.appendChild(group);
      return group;
    });

    const bg = status.querySelector('rect');
    const text = status.querySelector('text');

    const overlayText = defaultUnitOverlay(sector, state?.sectorUnits?.[sector.id] ?? []);
    const displayText = overlayText.length > 34 ? `${overlayText.slice(0, 31)}...` : overlayText;

    if (text) {
      text.setAttribute('x', x - 42);
      text.setAttribute('y', y + 52);
      text.textContent = displayText;
    }

    if (bg && text) {
      const width = Math.max(86, displayText.length * 6.5 + 18);
      bg.setAttribute('x', x - 52);
      bg.setAttribute('y', y + 36);
      bg.setAttribute('width', width);
      bg.setAttribute('height', 22);
    }
  }

  _renderAlertPin(sector, x, y, state) {
    const pin = this._ensureTextNode(this.pinElements, sector.id, () => {
      const text = createSvgEl('text');
      text.dataset.sectorId = sector.id;
      text.setAttribute('font-size', '20');
      text.setAttribute('font-weight', '800');
      text.setAttribute('fill', '#ff5e5e');
      text.setAttribute('filter', 'drop-shadow(0 0 6px rgba(255,94,94,0.45))');
      text.setAttribute('pointer-events', 'none');
      this.pinLayer.appendChild(text);
      return text;
    });

    pin.setAttribute('x', x + 18);
    pin.setAttribute('y', y - 16);
    pin.textContent = sector.alert ? '🔴' : '';
  }

  _applySectorVisualState(sector, state) {
    const polygon = this.sectorElements.get(sector.id);
    if (!polygon) return;

    const isSelected = this.selectedSectorId === sector.id || state?.selectedSectorId === sector.id;
    const isHovered = this.hoveredSectorId === sector.id || state?.hoveredSectorId === sector.id;
    const alertState = Boolean(sector.alert || sector.alertLabel || sector.enemySummary);

    const baseStroke = 'rgba(255,255,255,0.15)';
    const baseWidth = '2';

    polygon.setAttribute('stroke', alertState ? 'rgba(255,94,94,0.92)' : isSelected ? 'rgba(143,191,255,0.92)' : baseStroke);
    polygon.setAttribute('stroke-width', isSelected || alertState ? '4' : baseWidth);
    polygon.setAttribute('opacity', sector.control === 'unseen' ? '0.95' : '1');

    if (isHovered) {
      polygon.style.filter = 'brightness(1.08)';
    } else if (isSelected) {
      polygon.style.filter = 'brightness(1.12)';
    } else {
      polygon.style.filter = '';
    }
  }

  update(partialState = null) {
    const state = partialState ?? this.stateProvider() ?? {};
    const selectedId = state.selectedSectorId ?? this.selectedSectorId;
    const hoveredId = state.hoveredSectorId ?? this.hoveredSectorId;

    this.selectedSectorId = selectedId;
    this.hoveredSectorId = hoveredId;

    for (const rawSector of MAP.sectors) {
      const sector = state.sectorsById?.[rawSector.id] ?? getSectorById(rawSector.id) ?? rawSector;
      const center = getSectorCenter(sector);

      this._applySectorVisualState(sector, state);
      this._renderLabel(sector, center.x, center.y, state);
      this._renderStatusBadge(sector, center.x, center.y, state);
      this._renderAlertPin(sector, center.x, center.y, state);
    }

    return this;
  }

  selectSector(sectorId) {
    this.selectedSectorId = sectorId;
    const sector = getSectorById(sectorId);
    if (sector) {
      this.onSectorSelect(sector);
      this.onOpenSectorDetails(sector);
    }
    this.update();
    return this;
  }

  setHoveredSector(sectorId) {
    this.hoveredSectorId = sectorId;
    this.update();
    return this;
  }

  clearHoveredSector() {
    this.hoveredSectorId = null;
    this.update();
    return this;
  }

  destroy() {
    if (this.mount) {
      this.mount.innerHTML = '';
    }
    this.sectorElements.clear();
    this.textElements.clear();
    this.pinElements.clear();
    this.statusElements.clear();
    this.labelElements.clear();
  }
}

export function createMapView(options = {}) {
  return new SectorMapView(options);
}
