// ui/roster.js
// Unit roster panel: lists all friendly units with their current activity so the
// player can scan the force at a glance and jump to any unit on the map.

import { describeUnitActivity, unitTypeLabel } from './unit-display.js?v=21';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function bar(label, value, max, cls) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
  return `
    <div class="sf-unit-bar">
      <span class="sf-unit-bar-label">${escapeHtml(label)}</span>
      <span class="sf-unit-bar-track"><span class="sf-unit-bar-fill ${cls}" style="width:${pct}%"></span></span>
      <span class="sf-unit-bar-value">${Math.round(value)}</span>
    </div>
  `;
}

export class UnitRoster {
  constructor({ mount, getState = () => ({}), onSelect = () => {} } = {}) {
    if (!mount) throw new Error('UnitRoster requires a mount element.');
    this.mount = mount;
    this.getState = getState;
    this.onSelect = onSelect;
    this.selectedUnitId = null;

    this.mount.addEventListener('click', (e) => {
      const card = e.target.closest('[data-unit-id]');
      if (card) {
        this.selectedUnitId = card.dataset.unitId;
        this.onSelect(card.dataset.unitId);
      }
    });
  }

  setSelected(unitId) {
    this.selectedUnitId = unitId;
  }

  render() {
    const state = this.getState() || {};
    const units = (Array.isArray(state.units) ? state.units : []).filter((u) => u.status !== 'dead');

    if (units.length === 0) {
      this.mount.innerHTML = `<div class="sf-detail-empty">운용 중인 유닛이 없다.</div>`;
      return;
    }

    this.mount.innerHTML = units.map((unit) => {
      const activity = describeUnitActivity(unit);
      const selected = this.selectedUnitId === unit.id ? ' sf-unit-card-selected' : '';
      const sector = unit.sectorId || '-';
      const maxFood = unit.meta?.maxFood ?? unit.maxFood ?? unit.food ?? 1;
      return `
        <div class="sf-unit-card${selected}" data-unit-id="${escapeHtml(unit.id)}">
          <div class="sf-unit-head">
            <span class="sf-unit-name">${escapeHtml(unit.name || unit.label || unit.id)}</span>
            <span class="sf-unit-lvl">Lv${escapeHtml(unit.level ?? 1)}</span>
          </div>
          <div class="sf-unit-meta">
            <span class="sf-unit-type">${escapeHtml(unitTypeLabel(unit.type))}</span>
            <span class="sf-unit-loc">${escapeHtml(sector)}</span>
          </div>
          <div class="sf-unit-activity sf-act-${activity.tone}">${escapeHtml(activity.text)}</div>
          ${bar('HP', unit.health ?? 0, unit.maxHealth ?? 100, 'hp')}
          ${bar('식량', unit.food ?? 0, maxFood, 'food')}
        </div>
      `;
    }).join('');
  }
}

export function createUnitRoster(options = {}) {
  return new UnitRoster(options);
}
