// game/report.js
// Report model for Shrouded Front.
//
// Reports are the core information unit of the game.
// They are created by units, stored by the command layer, and displayed in the UI.

let __reportCounter = 0;

export const REPORT_CLASS = Object.freeze({
  A: 'A', // 거의 확실
  B: 'B', // 유력
  C: 'C', // 추정
  D: 'D'  // 불명확
});

export const REPORT_KINDS = Object.freeze({
  RECON: 'recon',
  CONTACT: 'contact',
  COMBAT: 'combat',
  SUPPLY: 'supply',
  COMMAND: 'command',
  INTEL: 'intel',
  STATUS: 'status',
  HQ: 'hq'
});

function nextReportId() {
  __reportCounter += 1;
  return `R${String(__reportCounter).padStart(5, '0')}`;
}

function normalizeClass(value) {
  if (!value) return REPORT_CLASS.C;
  const upper = String(value).trim().toUpperCase();
  if (upper === REPORT_CLASS.A) return REPORT_CLASS.A;
  if (upper === REPORT_CLASS.B) return REPORT_CLASS.B;
  if (upper === REPORT_CLASS.C) return REPORT_CLASS.C;
  if (upper === REPORT_CLASS.D) return REPORT_CLASS.D;
  return REPORT_CLASS.C;
}

function normalizeType(type) {
  const value = String(type ?? '').trim().toLowerCase();
  if (!value) return REPORT_KINDS.INTEL;

  const allowed = Object.values(REPORT_KINDS);
  return allowed.includes(value) ? value : REPORT_KINDS.INTEL;
}

export class Report {
  constructor({
    id = nextReportId(),
    time = 0,
    source = 'Unknown',
    sectorId = null,
    sectorCode = null,
    kind = REPORT_KINDS.INTEL,
    classTag = REPORT_CLASS.C,
    summary = '',
    body = '',
    confidenceLabel = null,
    enemySummary = null,
    friendlySummary = null,
    alert = false,
    pinned = false,
    seen = false,
    tags = [],
    meta = {}
  } = {}) {
    this.id = id;
    this.time = time;
    this.source = source;
    this.sectorId = sectorId;
    this.sectorCode = sectorCode;
    this.kind = normalizeType(kind);
    this.classTag = normalizeClass(classTag);
    this.summary = summary || this._deriveSummary();
    this.body = body || '';
    this.confidenceLabel = confidenceLabel ?? this._defaultConfidenceLabel();
    this.enemySummary = enemySummary ? { ...enemySummary } : null;
    this.friendlySummary = friendlySummary ? { ...friendlySummary } : null;
    this.alert = Boolean(alert);
    this.pinned = Boolean(pinned);
    this.seen = Boolean(seen);
    this.tags = Array.isArray(tags) ? [...tags] : [];
    this.meta = { ...meta };

    if (this.enemySummary && !this.body) {
      this.body = this.formatEnemySummary(this.enemySummary);
    }
  }

  static createRecon({
    time,
    source,
    sectorId,
    sectorCode,
    classTag,
    enemySummary,
    summary,
    body,
    tags = [],
    meta = {}
  }) {
    return new Report({
      time,
      source,
      sectorId,
      sectorCode,
      kind: REPORT_KINDS.RECON,
      classTag,
      summary: summary ?? '정찰 보고',
      body: body ?? '',
      enemySummary,
      alert: Boolean(enemySummary),
      pinned: Boolean(enemySummary),
      tags: ['recon', ...tags],
      meta
    });
  }

  static createContact({
    time,
    source,
    sectorId,
    sectorCode,
    classTag = REPORT_CLASS.C,
    enemySummary,
    summary,
    body,
    tags = [],
    meta = {}
  }) {
    return new Report({
      time,
      source,
      sectorId,
      sectorCode,
      kind: REPORT_KINDS.CONTACT,
      classTag,
      summary: summary ?? '접촉 보고',
      body: body ?? '',
      enemySummary,
      alert: true,
      pinned: true,
      tags: ['contact', ...tags],
      meta
    });
  }

  static createCombat({
    time,
    source,
    sectorId,
    sectorCode,
    classTag = REPORT_CLASS.B,
    summary,
    body,
    tags = [],
    meta = {}
  }) {
    return new Report({
      time,
      source,
      sectorId,
      sectorCode,
      kind: REPORT_KINDS.COMBAT,
      classTag,
      summary: summary ?? '교전 보고',
      body: body ?? '',
      alert: true,
      pinned: true,
      tags: ['combat', ...tags],
      meta
    });
  }

  static createSupply({
    time,
    source,
    sectorId,
    sectorCode,
    summary,
    body,
    tags = [],
    meta = {}
  }) {
    return new Report({
      time,
      source,
      sectorId,
      sectorCode,
      kind: REPORT_KINDS.SUPPLY,
      classTag: REPORT_CLASS.C,
      summary: summary ?? '보급 보고',
      body: body ?? '',
      tags: ['supply', ...tags],
      meta
    });
  }

  static createCommand({
    time,
    source,
    sectorId,
    sectorCode,
    summary,
    body,
    tags = [],
    meta = {}
  }) {
    return new Report({
      time,
      source,
      sectorId,
      sectorCode,
      kind: REPORT_KINDS.COMMAND,
      classTag: REPORT_CLASS.C,
      summary: summary ?? '명령',
      body: body ?? '',
      tags: ['command', ...tags],
      meta
    });
  }

  _deriveSummary() {
    if (this.kind === REPORT_KINDS.RECON) return '정찰 보고';
    if (this.kind === REPORT_KINDS.CONTACT) return '접촉 보고';
    if (this.kind === REPORT_KINDS.COMBAT) return '교전 보고';
    if (this.kind === REPORT_KINDS.SUPPLY) return '보급 보고';
    if (this.kind === REPORT_KINDS.COMMAND) return '명령';
    if (this.kind === REPORT_KINDS.STATUS) return '상태 보고';
    if (this.kind === REPORT_KINDS.HQ) return 'HQ 보고';
    return '정보 보고';
  }

  _defaultConfidenceLabel() {
    if (this.classTag === REPORT_CLASS.A) return '거의 확실';
    if (this.classTag === REPORT_CLASS.B) return '유력';
    if (this.classTag === REPORT_CLASS.C) return '추정';
    if (this.classTag === REPORT_CLASS.D) return '불명확';
    return '추정';
  }

  formatEnemySummary(enemySummary = this.enemySummary) {
    if (!enemySummary) return '';

    const parts = [];
    if (enemySummary.type) parts.push(`Enemy ${enemySummary.type}`);
    if (typeof enemySummary.size === 'number') {
      parts.push(`${enemySummary.size} (${enemySummary.sizeLabel ?? this.sizeLabel(enemySummary.size)})`);
    }
    if (enemySummary.class) parts.push(`Class ${normalizeClass(enemySummary.class)}`);
    return parts.join('\n');
  }

  sizeLabel(size) {
    if (size >= 100) return 'battalion';
    if (size >= 40) return 'company';
    if (size >= 20) return 'platoon';
    if (size >= 8) return 'section';
    return 'small';
  }

  setSeen(seen = true) {
    this.seen = Boolean(seen);
    return this;
  }

  pin() {
    this.pinned = true;
    return this;
  }

  unpin() {
    this.pinned = false;
    return this;
  }

  markAlert(alert = true) {
    this.alert = Boolean(alert);
    return this;
  }

  addTag(tag) {
    const value = String(tag ?? '').trim().toLowerCase();
    if (value && !this.tags.includes(value)) {
      this.tags.push(value);
    }
    return this;
  }

  removeTag(tag) {
    const value = String(tag ?? '').trim().toLowerCase();
    this.tags = this.tags.filter((t) => t !== value);
    return this;
  }

  setBody(body) {
    this.body = String(body ?? '');
    return this;
  }

  setSummary(summary) {
    this.summary = String(summary ?? '');
    return this;
  }

  setClassTag(classTag) {
    this.classTag = normalizeClass(classTag);
    this.confidenceLabel = this._defaultConfidenceLabel();
    return this;
  }

  setEnemySummary(enemySummary) {
    this.enemySummary = enemySummary ? { ...enemySummary } : null;
    if (this.enemySummary && !this.body) {
      this.body = this.formatEnemySummary(this.enemySummary);
    }
    return this;
  }

  clone() {
    return new Report({
      id: this.id,
      time: this.time,
      source: this.source,
      sectorId: this.sectorId,
      sectorCode: this.sectorCode,
      kind: this.kind,
      classTag: this.classTag,
      summary: this.summary,
      body: this.body,
      confidenceLabel: this.confidenceLabel,
      enemySummary: this.enemySummary ? { ...this.enemySummary } : null,
      friendlySummary: this.friendlySummary ? { ...this.friendlySummary } : null,
      alert: this.alert,
      pinned: this.pinned,
      seen: this.seen,
      tags: [...this.tags],
      meta: { ...this.meta }
    });
  }

  toShortString() {
    const head = `[${formatTime(this.time)}] ${this.summary}`;
    const where = this.sectorCode ? ` @ ${this.sectorCode}` : '';
    return `${head}${where}`;
  }

  toString() {
    const lines = [
      `${formatTime(this.time)} · ${this.summary}`,
      `From: ${this.source}`
    ];

    if (this.sectorCode) lines.push(`Sector: ${this.sectorCode}`);
    if (this.classTag) lines.push(`Class ${this.classTag} · ${this.confidenceLabel}`);
    if (this.body) lines.push('', this.body);

    return lines.join('\n');
  }

  toJSON() {
    return {
      id: this.id,
      time: this.time,
      source: this.source,
      sectorId: this.sectorId,
      sectorCode: this.sectorCode,
      kind: this.kind,
      classTag: this.classTag,
      summary: this.summary,
      body: this.body,
      confidenceLabel: this.confidenceLabel,
      enemySummary: this.enemySummary ? { ...this.enemySummary } : null,
      friendlySummary: this.friendlySummary ? { ...this.friendlySummary } : null,
      alert: this.alert,
      pinned: this.pinned,
      seen: this.seen,
      tags: [...this.tags],
      meta: { ...this.meta }
    };
  }
}

export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
export const MINUTES_PER_DAY = HOURS_PER_DAY * MINUTES_PER_HOUR;
export const OPERATION_START_MINUTES = 6 * MINUTES_PER_HOUR;

function safeMinutes(minutes) {
  return Number.isFinite(minutes) ? Math.max(0, Math.round(minutes)) : 0;
}

// Time is measured in operational minutes. The UI shows a mission clock instead
// of raw seconds so orders read like field decisions: D1 06:00, D1 14:30, etc.
export function formatTime(minutes) {
  const absolute = OPERATION_START_MINUTES + safeMinutes(minutes);
  const day = Math.floor(absolute / MINUTES_PER_DAY) + 1;
  const minuteOfDay = absolute % MINUTES_PER_DAY;
  const hh = Math.floor(minuteOfDay / MINUTES_PER_HOUR);
  const mm = minuteOfDay % MINUTES_PER_HOUR;
  return `D${day} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function formatDuration(minutes) {
  const total = safeMinutes(minutes);
  if (total <= 0) return '0분';

  const days = Math.floor(total / MINUTES_PER_DAY);
  const hours = Math.floor((total % MINUTES_PER_DAY) / MINUTES_PER_HOUR);
  const mins = total % MINUTES_PER_HOUR;
  const parts = [];

  if (days > 0) parts.push(`${days}일`);
  if (hours > 0) parts.push(`${hours}시간`);
  if (days === 0 && mins > 0) parts.push(`${mins}분`);

  return parts.length > 0 ? parts.slice(0, 2).join(' ') : '0분';
}

export function formatRations(hours) {
  const safeHours = Number.isFinite(hours) ? Math.max(0, hours) : 0;
  return formatDuration(safeHours * MINUTES_PER_HOUR);
}

export function createReportList(reports = []) {
  return reports.map((report) => (report instanceof Report ? report : new Report(report)));
}

export function sortReportsByTime(reports = []) {
  return createReportList(reports).sort((a, b) => b.time - a.time);
}
