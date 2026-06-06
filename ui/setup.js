// ui/setup.js
// Pre-operation force pool and small-unit formation screen.

import {
  DEFAULT_POOL,
  LEADER_CANDIDATES,
  NON_LEADER_ROLE_IDS,
  PERSONNEL_ROLES,
  TOTAL_PERSONNEL_LIMIT,
  assignedByRole,
  availableByRole,
  buildUnitsFromDrafts,
  clonePool,
  draftPersonnelCount,
  leaderById,
  missionRoleForComposition,
  normalizeDrafts,
  normalizePool,
  poolTotal,
  roleLabel
} from '../game/formation.js?v=30';
import { MISSION_ROLE_LABELS } from '../game/unit.js?v=30';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roleMax(roleId) {
  return PERSONNEL_ROLES.find((role) => role.id === roleId)?.max ?? TOTAL_PERSONNEL_LIMIT;
}

function countNonLeader(draft = {}) {
  return NON_LEADER_ROLE_IDS.reduce((sum, roleId) => sum + Math.max(0, Number(draft.composition?.[roleId]) || 0), 0);
}

function roleStepper({ roleId, value, disabledDec = false, disabledInc = false, context = 'pool', draftIndex = null }) {
  const attrs = draftIndex === null ? '' : ` data-draft-index="${draftIndex}"`;
  return `
    <div class="sf-stepper">
      <button type="button" data-setup-action="${context}-dec" data-role="${escapeHtml(roleId)}"${attrs} ${disabledDec ? 'disabled' : ''}>-</button>
      <strong>${escapeHtml(value)}</strong>
      <button type="button" data-setup-action="${context}-inc" data-role="${escapeHtml(roleId)}"${attrs} ${disabledInc ? 'disabled' : ''}>+</button>
    </div>
  `;
}

export class FormationSetup {
  constructor({ mount, onStart = () => {} } = {}) {
    if (!mount) throw new Error('FormationSetup requires a mount element.');

    this.mount = mount;
    this.onStart = onStart;
    this.state = {
      step: 'pool',
      pool: normalizePool(DEFAULT_POOL),
      drafts: normalizeDrafts([], DEFAULT_POOL)
    };

    this.mount.addEventListener('click', (event) => this.handleClick(event));
  }

  handleClick(event) {
    const stepButton = event.target.closest('[data-setup-step]');
    if (stepButton) {
      this.setStep(stepButton.dataset.setupStep);
      return;
    }

    const button = event.target.closest('[data-setup-action]');
    if (!button || button.disabled) return;

    const action = button.dataset.setupAction;
    const roleId = button.dataset.role;

    if (action === 'pool-inc') {
      this.adjustPool(roleId, 1);
    } else if (action === 'pool-dec') {
      this.adjustPool(roleId, -1);
    } else if (action === 'draft-inc') {
      this.adjustDraft(Number(button.dataset.draftIndex), roleId, 1);
    } else if (action === 'draft-dec') {
      this.adjustDraft(Number(button.dataset.draftIndex), roleId, -1);
    } else if (action === 'start-operation') {
      this.startOperation();
    }
  }

  setStep(step) {
    this.state.step = step === 'units' ? 'units' : 'pool';
    this.state.pool = normalizePool(this.state.pool);
    this.state.drafts = normalizeDrafts(this.state.drafts, this.state.pool);
    this.render();
  }

  adjustPool(roleId, delta) {
    const pool = clonePool(this.state.pool);
    const role = PERSONNEL_ROLES.find((item) => item.id === roleId);
    if (!role) return;

    const min = role.min ?? 0;
    const max = roleId === 'leader'
      ? Math.min(role.max ?? TOTAL_PERSONNEL_LIMIT, LEADER_CANDIDATES.length)
      : role.max ?? TOTAL_PERSONNEL_LIMIT;
    const nextValue = clamp((pool[roleId] ?? 0) + delta, min, max);

    if (delta > 0 && poolTotal(pool) >= TOTAL_PERSONNEL_LIMIT) return;
    pool[roleId] = nextValue;
    this.state.pool = normalizePool(pool);
    this.state.drafts = normalizeDrafts(this.state.drafts, this.state.pool);
    this.render();
  }

  adjustDraft(draftIndex, roleId, delta) {
    if (!Number.isInteger(draftIndex) || !NON_LEADER_ROLE_IDS.includes(roleId)) return;

    const drafts = normalizeDrafts(this.state.drafts, this.state.pool);
    const draft = drafts[draftIndex];
    if (!draft) return;

    if (delta > 0) {
      const available = availableByRole(this.state.pool, drafts);
      if ((available[roleId] ?? 0) <= 0) return;
    }

    draft.composition[roleId] = clamp(
      (draft.composition[roleId] ?? 0) + delta,
      0,
      roleMax(roleId)
    );

    this.state.drafts = normalizeDrafts(drafts, this.state.pool);
    this.render();
  }

  startOperation() {
    this.state.pool = normalizePool(this.state.pool);
    this.state.drafts = normalizeDrafts(this.state.drafts, this.state.pool);
    if (!this.canStart()) return;
    this.onStart(buildUnitsFromDrafts(this.state.drafts, this.state.pool));
  }

  canStart() {
    const drafts = normalizeDrafts(this.state.drafts, this.state.pool);
    return drafts.length > 0 && drafts.every((draft) => draftPersonnelCount(draft) > 1);
  }

  render() {
    this.state.pool = normalizePool(this.state.pool);
    this.state.drafts = normalizeDrafts(this.state.drafts, this.state.pool);

    const total = poolTotal(this.state.pool);
    const leaderSlots = this.state.pool.leader;
    const step = this.state.step;

    this.mount.innerHTML = `
      <div class="sf-setup-shell">
        <header class="sf-setup-top">
          <div>
            <h1>Shrouded Front</h1>
            <p>작전 편성 · D1 06:00 · Forest D 전개</p>
          </div>
          <div class="sf-setup-status">
            <span>${escapeHtml(total)}/${TOTAL_PERSONNEL_LIMIT}명</span>
            <span>${escapeHtml(leaderSlots)}개 단위</span>
          </div>
        </header>

        <main class="sf-setup-main">
          <section class="sf-setup-brief">
            <div class="sf-brief-kicker">Mission</div>
            <h2>북쪽 계곡 접근로 정찰</h2>
            <p>가용 병력 안에서 보직별 인원을 정하고, 리더 슬롯 수만큼 작전 단위를 편성한다.</p>
            <div class="sf-brief-metrics">
              <span>한도 ${TOTAL_PERSONNEL_LIMIT}명</span>
              <span>리더 ${leaderSlots}명</span>
              <span>시작 D5</span>
            </div>
          </section>

          <section class="sf-setup-workspace">
            <div class="sf-setup-tabs">
              <button type="button" class="${step === 'pool' ? 'active' : ''}" data-setup-step="pool">병력 풀</button>
              <button type="button" class="${step === 'units' ? 'active' : ''}" data-setup-step="units">작전 단위</button>
            </div>
            ${step === 'units' ? this.renderUnitBuilder() : this.renderPoolBuilder()}
          </section>
        </main>
      </div>
    `;
  }

  renderPoolBuilder() {
    const pool = this.state.pool;
    const total = poolTotal(pool);
    const overLimit = total > TOTAL_PERSONNEL_LIMIT;

    return `
      <div class="sf-pool-layout">
        <div class="sf-pool-list">
          ${PERSONNEL_ROLES.map((role) => {
            const value = pool[role.id] ?? 0;
            const min = role.min ?? 0;
            const max = role.id === 'leader'
              ? Math.min(role.max ?? TOTAL_PERSONNEL_LIMIT, LEADER_CANDIDATES.length)
              : role.max ?? TOTAL_PERSONNEL_LIMIT;
            const decDisabled = value <= min;
            const incDisabled = value >= max || total >= TOTAL_PERSONNEL_LIMIT;
            return `
              <div class="sf-role-row">
                <div>
                  <strong>${escapeHtml(role.label)}</strong>
                  <span>${escapeHtml(role.summary)}</span>
                </div>
                ${roleStepper({
                  roleId: role.id,
                  value,
                  disabledDec: decDisabled,
                  disabledInc: incDisabled,
                  context: 'pool'
                })}
              </div>
            `;
          }).join('')}
        </div>

        <aside class="sf-pool-summary">
          <div class="sf-pool-total ${overLimit ? 'warn' : ''}">
            <span>총원</span>
            <strong>${escapeHtml(total)}/${TOTAL_PERSONNEL_LIMIT}</strong>
          </div>
          <div class="sf-pool-meter">
            <i style="width:${Math.min(100, Math.round((total / TOTAL_PERSONNEL_LIMIT) * 100))}%"></i>
          </div>
          <div class="sf-leader-list">
            ${LEADER_CANDIDATES.slice(0, pool.leader).map((leader) => `
              <div>
                <strong>${escapeHtml(leader.name)}</strong>
                <span>${escapeHtml(leader.traitLabel)} · Lv${escapeHtml(leader.rating)}</span>
              </div>
            `).join('')}
          </div>
          <button class="btn primary sf-setup-next" type="button" data-setup-step="units">작전 단위 편성</button>
        </aside>
      </div>
    `;
  }

  renderUnitBuilder() {
    const pool = this.state.pool;
    const drafts = this.state.drafts;
    const assigned = assignedByRole(drafts);
    const available = availableByRole(pool, drafts);
    const canStart = this.canStart();

    return `
      <div class="sf-builder-layout">
        <section class="sf-builder-main">
          ${drafts.map((draft, index) => this.renderDraftCard(draft, index, available)).join('')}
        </section>

        <aside class="sf-reserve-panel">
          <div class="sf-reserve-title">잔여 병력</div>
          <div class="sf-reserve-list">
            ${PERSONNEL_ROLES.map((role) => `
              <div>
                <span>${escapeHtml(role.label)}</span>
                <strong>${escapeHtml(available[role.id] ?? 0)}</strong>
              </div>
            `).join('')}
          </div>
          <div class="sf-reserve-title">편성 현황</div>
          <div class="sf-reserve-list compact">
            ${PERSONNEL_ROLES.map((role) => `
              <div>
                <span>${escapeHtml(role.label)}</span>
                <strong>${escapeHtml(assigned[role.id] ?? 0)}/${escapeHtml(pool[role.id] ?? 0)}</strong>
              </div>
            `).join('')}
          </div>
          <button
            class="btn primary sf-setup-next"
            type="button"
            data-setup-action="start-operation"
            ${canStart ? '' : 'disabled'}
          >작전 시작</button>
        </aside>
      </div>
    `;
  }

  renderDraftCard(draft, index, available) {
    const leader = leaderById(draft.leaderId);
    const personnelCount = draftPersonnelCount(draft);
    const missionRole = missionRoleForComposition(draft.composition);
    const roleText = MISSION_ROLE_LABELS[missionRole] ?? missionRole;
    const leaderOnly = countNonLeader(draft) === 0;

    return `
      <article class="sf-draft-card ${leaderOnly ? 'warn' : ''}">
        <div class="sf-draft-head">
          <div>
            <h3>${escapeHtml(draft.name)}</h3>
            <p>${escapeHtml(roleText)} · ${escapeHtml(personnelCount)}명</p>
          </div>
          <div class="sf-leader-chip">
            <strong>${escapeHtml(leader.name)}</strong>
            <span>${escapeHtml(leader.traitLabel)} · Lv${escapeHtml(leader.rating)}</span>
          </div>
        </div>

        <div class="sf-draft-roles">
          ${NON_LEADER_ROLE_IDS.map((roleId) => {
            const value = draft.composition[roleId] ?? 0;
            return `
              <div class="sf-draft-role">
                <span>${escapeHtml(roleLabel(roleId))}</span>
                ${roleStepper({
                  roleId,
                  value,
                  disabledDec: value <= 0,
                  disabledInc: (available[roleId] ?? 0) <= 0,
                  context: 'draft',
                  draftIndex: index
                })}
              </div>
            `;
          }).join('')}
        </div>
      </article>
    `;
  }
}

export function createFormationSetup(options = {}) {
  return new FormationSetup(options);
}
