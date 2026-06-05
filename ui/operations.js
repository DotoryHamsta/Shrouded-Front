// ui/operations.js
// Operations board renderer for Shrouded Front.
//
// This module renders the full operational picture:
// - all reports
// - all active units
// - all sectors
// - supply and communication state
// - command / mission summaries

import { formatTime } from '../game/report.js';
import { unitLabel } from '../game/unit.js';

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

function enemyText(sector) {
  if (!sector?.enemySummary) return '없음';
  const enemy = sector.enemySummary;
  const type = enemy.type ? `Enemy ${enemy.type}` : 'Enemy';
  const size = typeof enemy.size === 'number' ? `${enemy.size}` : '?';
  const classTag = enemy.class ? `Class ${enemy.class}` : 'Class ?';
  return `${type} · ${size} · ${classTag}`;
}

function unitRow(unit) {
  const label = unit.label || unitLabel(unit);
  const name = unit.name || label;
  const sector = unit.sectorId || '-';
  const level = unit.level ?? 1;
  const health = Math.max(0, Math.round(unit.health ?? 0));
  const food = Math.max(0, Math.round(unit.food ?? 0));
  const ammo = Math.max(0, Math.round(unit.ammo ?? 0));
  const status = unit.status || 'active';
  const ready = unit.readiness ?? null;
  const comm = unit.commConnected ? '연결' : '두절';
  const recon = Number.isFinite(unit.reconProgress) ? `${Math.round(unit.reconProgress)}%` : '0%';
  return `
    <tr>
      <td>${escapeHtml(name)}</td>
      <td>${escapeHtml(label)}</td>
      <td>${escapeHtml(sector)}</td>
      <td>${escapeHtml(String(level))}</td>
      <td>${escapeHtml(String(health))}</td>
      <td>${escapeHtml(String(food))}</td>
      <td>${escapeHtml(String(ammo))}</td>
      <td>${escapeHtml(status)}</td>
      <td>${escapeHtml(comm)}</td>
      <td>${ready !== null ? escapeHtml(String(ready)) : '-'}</td>
      <td>${escapeHtml(recon)}</td>
    </tr>
  `;
}

function reportRow(report) {
  const time = report.time !== undefined ? formatTime(report.time) : '--:--';
  const sector = report.sectorCode || report.sectorId || '-';
  const classTag = report.classTag ? `Class ${report.classTag}` : 'Class ?';
  const kind = report.kind || 'intel';
  const summary = report.summary || '정보';
  const body = report.body ? escapeHtml(report.body).replaceAll('\n', '<br>') : '';
  return `
    <div class="sf-op-report">
      <div class="sf-op-report-head">
        <div class="sf-op-report-time">${escapeHtml(time)}</div>
        <div class="sf-op-report-badge">${escapeHtml(classTag)}</div>
      </div>
      <div class="sf-op-report-meta">${escapeHtml(kind)} · ${escapeHtml(sector)} · ${escapeHtml(report.source || 'Unknown')}</div>
      <div class="sf-op-report-summary">${escapeHtml(summary)}</div>
      ${body ? `<div class="sf-op-report-body">${body}</div>` : ''}
    </div>
  `;
}

function sectorRow(sector) {
  const code = sector.code || sector.id;
  const terrain = sector.terrainLabel || sector.terrain || '-';
  const control = sector.control || 'unseen';
  const alert = sector.alert ? (sector.alertLabel || '알림') : '없음';
  const recon = Number.isFinite(sector.reconProgress) ? `${Math.round(sector.reconProgress)}%` : '0%';
  const landmarks = joinOrDash(sector.landmarks);
  const enemy = enemyText(sector);

  return `
    <tr>
      <td>${escapeHtml(code)}</td>
      <td>${escapeHtml(terrain)}</td>
      <td>${escapeHtml(control)}</td>
      <td>${escapeHtml(alert)}</td>
      <td>${escapeHtml(recon)}</td>
      <td>${escapeHtml(landmarks)}</td>
      <td>${escapeHtml(enemy)}</td>
    </tr>
  `;
}

function reconProgressRow(sector) {
  const code = sector.code || sector.id;
  const recon = Number.isFinite(sector.reconProgress) ? Math.round(sector.reconProgress) : 0;
  const summary = sector.reportSummary || '미탐색';

  return `
    <div class="sf-recon-row">
      <div class="sf-recon-row-head">
        <span>${escapeHtml(code)}</span>
        <span>${escapeHtml(`${recon}%`)}</span>
      </div>
      <div class="sf-recon-meter">
        <div class="sf-recon-meter-fill" style="width:${Math.max(0, Math.min(100, recon))}%"></div>
      </div>
      <div class="sf-recon-summary">${escapeHtml(summary)}</div>
    </div>
  `;
}

function summaryCard(label, value) {
  return `
    <div class="sf-op-summary-card">
      <div class="sf-op-summary-label">${escapeHtml(label)}</div>
      <div class="sf-op-summary-value">${escapeHtml(value)}</div>
    </div>
  `;
}

export class OperationsBoard {
  constructor({ mount, getState = () => ({}) } = {}) {
    if (!mount) {
      throw new Error('OperationsBoard requires a mount element.');
    }

    this.mount = mount;
    this.getState = getState;
  }

  render() {
    const state = this.getState() || {};
    const reports = Array.isArray(state.reports) ? state.reports : [];
    const units = Array.isArray(state.units) ? state.units : [];
    const sectors = Array.isArray(state.sectors) ? state.sectors : [];
    const paused = Boolean(state.paused);
    const speed = state.speed ?? 1;
    const turn = state.turn ?? 0;
    const time = state.time ?? 0;

    const activeUnits = units.filter((u) => (u.status || '') !== 'dead');
    const alertSectors = sectors.filter((s) => s.alert || s.enemySummary);
    const revealedSectors = sectors.filter((s) => s.control === 'revealed' || s.control === 'visible');
    const hiddenSectors = sectors.filter((s) => s.control === 'unseen');
    const reconUnits = units.filter((u) => u.type === 'recon');
    const reconAverage = sectors.length > 0
      ? Math.round(sectors.reduce((sum, s) => sum + (Number.isFinite(s.reconProgress) ? s.reconProgress : 0), 0) / sectors.length)
      : 0;

    this.mount.innerHTML = `
      <div class="sf-ops-shell">
        <div class="sf-ops-header">
          <div>
            <div class="sf-ops-title">작전판</div>
            <div class="sf-ops-subtitle">모든 수치와 상태를 한 번에 확인한다</div>
          </div>
          <div class="sf-ops-status ${paused ? 'paused' : 'running'}">
            ${paused ? 'Paused' : 'Running'} · ${speed}x
          </div>
        </div>

        <div class="sf-ops-summary-grid">
          ${summaryCard('Turn', String(turn))}
          ${summaryCard('Time', formatTime(time))}
          ${summaryCard('Active Units', String(activeUnits.length))}
          ${summaryCard('Reports', String(reports.length))}
          ${summaryCard('Alert Sectors', String(alertSectors.length))}
          ${summaryCard('Revealed Sectors', String(revealedSectors.length))}
          ${summaryCard('Hidden Sectors', String(hiddenSectors.length))}
          ${summaryCard('Recon Avg', `${reconAverage}%`)}
        </div>

        <div class="sf-ops-section">
          <div class="sf-ops-section-title">현재 작전</div>
          <div class="sf-ops-text">
            ${reconUnits.length > 0
              ? reconUnits.map((unit) => `${escapeHtml(unit.name || unitLabel(unit))} · ${escapeHtml(unit.sectorId || '-')} · ${escapeHtml(Math.round(unit.reconProgress || 0))}%`).join('<br>')
              : '진행 중인 정찰 없음'}
          </div>
        </div>

        <div class="sf-ops-grid">
          <section class="sf-ops-panel">
            <div class="sf-ops-panel-title">유닛 현황</div>
            <div class="sf-ops-table-wrap">
              <table class="sf-ops-table">
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>종류</th>
                    <th>구역</th>
                    <th>Lv</th>
                    <th>HP</th>
                    <th>식량</th>
                    <th>탄약</th>
                    <th>상태</th>
                    <th>통신</th>
                    <th>준비도</th>
                    <th>정찰</th>
                  </tr>
                </thead>
                <tbody>
                  ${units.length > 0 ? units.map(unitRow).join('') : '<tr><td colspan="11" class="sf-empty-row">표시할 유닛이 없다</td></tr>'}
                </tbody>
              </table>
            </div>
          </section>

          <section class="sf-ops-panel">
            <div class="sf-ops-panel-title">구역 현황</div>
            <div class="sf-ops-table-wrap">
              <table class="sf-ops-table">
                <thead>
                  <tr>
                    <th>구역</th>
                    <th>지형</th>
                    <th>통제</th>
                    <th>알림</th>
                    <th>정찰</th>
                    <th>랜드마크</th>
                    <th>적 보고</th>
                  </tr>
                </thead>
                <tbody>
                  ${sectors.length > 0 ? sectors.map(sectorRow).join('') : '<tr><td colspan="7" class="sf-empty-row">표시할 구역이 없다</td></tr>'}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div class="sf-ops-grid sf-ops-grid-bottom">
          <section class="sf-ops-panel">
            <div class="sf-ops-panel-title">최근 보고</div>
            <div class="sf-ops-report-list">
              ${reports.length > 0 ? reports.slice(0, 12).map(reportRow).join('') : '<div class="sf-empty-row">보고 없음</div>'}
            </div>
          </section>

          <section class="sf-ops-panel">
            <div class="sf-ops-panel-title">정찰 진행도</div>
            <div class="sf-recon-list">
              ${sectors.length > 0 ? sectors.map(reconProgressRow).join('') : '<div class="sf-empty-row">정찰 정보 없음</div>'}
            </div>
          </section>
        </div>
      </div>
    `;
  }
}

export function createOperationsBoard(options = {}) {
  return new OperationsBoard(options);
}
