// ui/details.js
// Detail panel renderer for Shrouded Front.
//
// This module renders the selected sector details, recent reports,
// unit summaries, and operational notes into the right-side panel.

import { getSectorById, codeForSector } from '../data/map.js?v=23';
import { formatTime } from '../game/report.js?v=23';
import { unitLabel } from '../game/unit.js?v=23';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function joinOrDash(items, separator = ' / ') {
  if (!Array.isArray(items) || items.length === 0) return '-';
  return items.join(separator);
}

function formatEnemySummary(enemy) {
  if (!enemy) return '없음';
  const type = enemy.type ? `Enemy ${enemy.type}` : 'Enemy';
  const size = typeof enemy.size === 'number' ? `${enemy.size}명` : '?';
  const classTag = enemy.class ? `Class ${enemy.class}` : 'Class ?';
  return `${type} · ${size} · ${classTag}`;
}

function formatFriendlySummary(units = []) {
  if (!Array.isArray(units) || units.length === 0) return '없음';
  return units
    .map((unit) => {
      const name = unit.name || unitLabel(unit);
      const label = unit.label || unitLabel(unit);
      const count = typeof unit.count === 'number' ? `${unit.count}명` : '';
      const status = unit.status ? ` / ${unit.status}` : '';
      return `${name} (${label}) ${count}${status}`.trim();
    })
    .join('<br>');
}

function formatRecentReports(reports = []) {
  if (!Array.isArray(reports) || reports.length === 0) {
    return '<div class="sf-empty">최근 보고 없음</div>';
  }

  return reports.slice(0, 4).map((report) => {
    const time = report.time !== undefined ? formatTime(report.time) : '--:--';
    const source = report.source || 'Unknown';
    const summary = report.summary || '정보';
    const body = report.body ? escapeHtml(report.body) : '';
    const classTag = report.classTag ? `Class ${report.classTag}` : '';
    return `
      <div class="sf-report-card">
        <div class="sf-report-head">
          <span class="sf-report-time">${escapeHtml(time)}</span>
          <span class="sf-report-class">${escapeHtml(classTag)}</span>
        </div>
        <div class="sf-report-source">From: ${escapeHtml(source)}</div>
        <div class="sf-report-summary">${escapeHtml(summary)}</div>
        ${body ? `<div class="sf-report-body">${body}</div>` : ''}
      </div>
    `;
  }).join('');
}

export class DetailPanel {
  constructor({ mount, getState = () => ({}), onIssueRecon = null } = {}) {
    if (!mount) {
      throw new Error('DetailPanel requires a mount element.');
    }

    this.mount = mount;
    this.getState = getState;
    this.onIssueRecon = onIssueRecon;

    this.mount.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-unit-id][data-sector-id]');
      if (btn && this.onIssueRecon) {
        this.onIssueRecon(btn.dataset.unitId, btn.dataset.sectorId);
      }
    });
  }

  renderEmpty() {
    this.mount.innerHTML = `
      <div class="sf-detail-empty">
        지역을 선택하면 작전 정보가 표시된다.
      </div>
    `;
  }

  renderSector(sectorLike, options = {}) {
    const state = this.getState() || {};
    const sectorId = typeof sectorLike === 'string' ? sectorLike : sectorLike?.id;
    const stateSector = sectorId && Array.isArray(state.sectors)
      ? state.sectors.find((item) => item.id === sectorId)
      : null;
    const sector = stateSector || (typeof sectorLike === 'object' ? sectorLike : getSectorById(sectorId));

    if (!sector) {
      this.renderEmpty();
      return;
    }

    const sectorReports = Array.isArray(state.reports)
      ? state.reports.filter((report) => report.sectorId === sector.id)
      : [];
    const sectorUnits = Array.isArray(state.units)
      ? state.units.filter((unit) => unit.sectorId === sector.id)
      : [];

    const friendlySummary = sector.friendlySummary
      ? formatFriendlySummary(Array.isArray(sector.friendlySummary) ? sector.friendlySummary : [sector.friendlySummary])
      : (sectorUnits.length > 0
        ? sectorUnits.map((unit) => `${escapeHtml(unit.name || unitLabel(unit))} / ${escapeHtml(unitLabel(unit))} / ${escapeHtml(unit.status || 'active')} / HP ${escapeHtml(Math.max(0, Math.round(unit.health ?? 0)))}`).join('<br>')
        : '없음');

    const enemySummary = formatEnemySummary(sector.enemySummary);
    const landmarks = joinOrDash(sector.landmarks);
    const neighbors = joinOrDash((sector.neighbors ?? []).map(codeForSector));
    const notes = sector.notes ? escapeHtml(sector.notes) : '-';
    const reportSummary = sector.reportSummary ? escapeHtml(sector.reportSummary) : '-';
    const control = sector.control || 'unseen';
    const reconProgress = Number.isFinite(sector.reconProgress) ? `${Math.round(sector.reconProgress)}%` : '0%';
    const alertLabel = sector.alertLabel ? escapeHtml(sector.alertLabel) : (sector.alert ? '알림 있음' : '없음');

    const reconCommandHtml = this._buildReconCommandHtml(sector, state);

    this.mount.innerHTML = `
      <div class="sf-detail-header">
        <div>
          <div class="sf-detail-code">${escapeHtml(sector.code || sector.id)}</div>
          <div class="sf-detail-region">${escapeHtml(sector.regionLabel || '')}</div>
        </div>
        <div class="sf-detail-badge ${control}">${escapeHtml(control)}</div>
      </div>

      <div class="sf-detail-grid">
        <div class="sf-detail-row">
          <span class="sf-detail-label">지형</span>
          <span class="sf-detail-value">${escapeHtml(sector.terrainLabel || sector.terrain || '-')}</span>
        </div>
        <div class="sf-detail-row">
          <span class="sf-detail-label">역할</span>
          <span class="sf-detail-value">${escapeHtml(sector.role || '-')}</span>
        </div>
        <div class="sf-detail-row">
          <span class="sf-detail-label">상태</span>
          <span class="sf-detail-value">${escapeHtml(reportSummary)}</span>
        </div>
        <div class="sf-detail-row">
          <span class="sf-detail-label">정찰 진행도</span>
          <span class="sf-detail-value">${escapeHtml(reconProgress)}</span>
        </div>
        <div class="sf-detail-row">
          <span class="sf-detail-label">알림</span>
          <span class="sf-detail-value">${alertLabel}</span>
        </div>
        <div class="sf-detail-row">
          <span class="sf-detail-label">이웃 구역</span>
          <span class="sf-detail-value">${escapeHtml(neighbors)}</span>
        </div>
      </div>

      <div class="sf-detail-block">
        <div class="sf-detail-block-title">랜드마크</div>
        <div class="sf-detail-text">${escapeHtml(landmarks)}</div>
      </div>

      <div class="sf-detail-block">
        <div class="sf-detail-block-title">아군</div>
        <div class="sf-detail-text">${friendlySummary}</div>
      </div>

      <div class="sf-detail-block">
        <div class="sf-detail-block-title">적 보고</div>
        <div class="sf-detail-text">${enemySummary}</div>
      </div>

      <div class="sf-detail-block">
        <div class="sf-detail-block-title">최근 보고</div>
        <div class="sf-detail-text">${formatRecentReports(sectorReports)}</div>
      </div>

      <div class="sf-detail-block">
        <div class="sf-detail-block-title">작전 메모</div>
        <div class="sf-detail-text">${notes}</div>
      </div>

      ${reconCommandHtml}
    `;
  }

  _buildReconCommandHtml(sector, state) {
    if (!this.onIssueRecon) return '';
    const allUnits = Array.isArray(state.units) ? state.units : [];
    const reconUnits = allUnits.filter(
      (u) => u.type === 'recon' && u.status !== 'dead' && u.health > 0
    );
    if (reconUnits.length === 0) return '';

    const sectorNeighbors = Array.isArray(sector.neighbors) ? sector.neighbors : [];
    const buttons = [];

    for (const unit of reconUnits) {
      const unitSector = allUnits.length > 0 ? unit.sectorId : null;

      if (unit.sectorId === sector.id) {
        // 유닛이 이 구역에 있음 → 이웃 구역들을 타깃으로
        for (const neighborId of sectorNeighbors) {
          const neighborSector = Array.isArray(state.sectors)
            ? state.sectors.find((s) => s.id === neighborId)
            : null;
          const label = neighborSector ? escapeHtml(neighborSector.code || neighborId) : escapeHtml(neighborId);
          buttons.push(
            `<button class="btn sf-recon-btn" data-unit-id="${escapeHtml(unit.id)}" data-sector-id="${escapeHtml(neighborId)}">${escapeHtml(unit.name)} → ${label} 정찰</button>`
          );
        }
      } else if (sectorNeighbors.includes(unit.sectorId)) {
        // 유닛이 인접 구역에 있음 → 이 구역으로 명령
        const unitNeighbors = (() => {
          const us = Array.isArray(state.sectors)
            ? state.sectors.find((s) => s.id === unit.sectorId)
            : null;
          return Array.isArray(us?.neighbors) ? us.neighbors : [];
        })();
        if (unitNeighbors.includes(sector.id)) {
          buttons.push(
            `<button class="btn sf-recon-btn" data-unit-id="${escapeHtml(unit.id)}" data-sector-id="${escapeHtml(sector.id)}">${escapeHtml(unit.name)} → ${escapeHtml(sector.code || sector.id)} 정찰</button>`
          );
        }
      }
    }

    if (buttons.length === 0) return '';

    return `
      <div class="sf-detail-block sf-recon-block">
        <div class="sf-detail-block-title">정찰 명령</div>
        <div class="sf-recon-actions">${buttons.join('')}</div>
      </div>
    `;
  }

  renderReportList(reports = []) {
    if (!Array.isArray(reports) || reports.length === 0) {
      this.mount.innerHTML = `
        <div class="sf-detail-empty">표시할 보고가 없다.</div>
      `;
      return;
    }

    this.mount.innerHTML = reports.map((report) => {
      const time = report.time !== undefined ? formatTime(report.time) : '--:--';
      const sector = report.sectorCode || report.sectorId || 'Unknown';
      const classTag = report.classTag ? `Class ${report.classTag}` : 'Class ?';
      const body = report.body ? escapeHtml(report.body) : '';
      return `
        <div class="sf-report-card sf-report-card-wide">
          <div class="sf-report-head">
            <span class="sf-report-time">${escapeHtml(time)}</span>
            <span class="sf-report-class">${escapeHtml(classTag)}</span>
          </div>
          <div class="sf-report-source">From: ${escapeHtml(report.source || 'Unknown')} · ${escapeHtml(sector)}</div>
          <div class="sf-report-summary">${escapeHtml(report.summary || '정보')}</div>
          ${body ? `<div class="sf-report-body">${body}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  renderOperationSummary(summary = {}) {
    const {
      title = '작전',
      status = '진행중',
      unitName = '-'
    } = summary;

    this.mount.innerHTML = `
      <div class="sf-detail-header">
        <div>
          <div class="sf-detail-code">${escapeHtml(title)}</div>
          <div class="sf-detail-region">${escapeHtml(unitName)}</div>
        </div>
        <div class="sf-detail-badge visible">${escapeHtml(status)}</div>
      </div>
      <div class="sf-detail-block">
        <div class="sf-detail-block-title">설명</div>
        <div class="sf-detail-text">${escapeHtml(summary.description || '작전 정보를 불러오는 중')}
        </div>
      </div>
    `;
  }
}

export function createDetailPanel(options = {}) {
  return new DetailPanel(options);
}
