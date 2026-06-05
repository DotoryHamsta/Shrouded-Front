// ui/unit-display.js
// Shared display helpers for rendering units as map tokens and roster entries.
// Keeps the NATO-style symbology and human-readable activity text in one place
// so the map view and the unit roster stay consistent.

import { codeForSector } from '../data/map.js?v=26';

// Report cadence by unit level (mirrors Simulation._reportInterval).
const REPORT_INTERVAL_BY_LEVEL = [20, 14, 9, 6, 4];

export function reportIntervalForLevel(level) {
  const idx = Math.min(Math.max(1, level || 1) - 1, REPORT_INTERVAL_BY_LEVEL.length - 1);
  return REPORT_INTERVAL_BY_LEVEL[idx];
}

// Returns 'infantry' | 'recon' | 'artillery' for symbol drawing.
export function unitSymbolKind(type) {
  const t = String(type ?? '').toLowerCase();
  if (t === 'infantry' || t === 'recon' || t === 'artillery') return t;
  return 'infantry';
}

// Friendly counter palette, adjusted by status tone.
export function unitTone(unit) {
  const status = String(unit?.status ?? 'active').toLowerCase();
  if (status === 'dead') return { fill: 'rgba(70,70,78,0.85)', stroke: 'rgba(120,120,130,0.9)', warn: false };
  if (status === 'disconnected') return { fill: 'rgba(46,92,150,0.9)', stroke: 'rgba(235,180,90,0.95)', warn: true };
  if (status === 'exhausted' || status === 'hungry') return { fill: 'rgba(46,92,150,0.9)', stroke: 'rgba(230,140,90,0.95)', warn: true };
  if (status === 'engaged') return { fill: 'rgba(120,60,70,0.92)', stroke: 'rgba(255,120,120,0.96)', warn: true };
  if (status === 'returning') return { fill: 'rgba(46,92,150,0.9)', stroke: 'rgba(200,200,120,0.95)', warn: true };
  return { fill: 'rgba(46,92,150,0.92)', stroke: 'rgba(150,190,240,0.95)', warn: false };
}

// Short, human-readable description of what a unit is doing right now.
// Returns { text, tone } where tone is 'idle' | 'move' | 'setup' | 'recon' | 'warn'.
export function describeUnitActivity(unit) {
  if (!unit) return { text: '-', tone: 'idle' };

  const status = String(unit.status ?? 'active').toLowerCase();
  if (status === 'dead') return { text: '전투 손실', tone: 'warn' };
  if (status === 'disconnected') return { text: '통신 두절', tone: 'warn' };
  if (status === 'exhausted') return { text: '보급 복귀', tone: 'warn' };
  if (status === 'returning') return { text: '복귀 중', tone: 'warn' };
  if (status === 'engaged') return { text: '교전 중', tone: 'warn' };

  const moving = unit.targetSectorId && unit.sectorId !== unit.targetSectorId;
  if (moving) {
    return { text: `이동 중 → ${codeForSector(unit.targetSectorId)}`, tone: 'move' };
  }

  const command = String(unit.command ?? '');
  if (command.includes('정찰')) {
    const rs = unit.meta?.reconState;
    if (rs && rs.sectorId === unit.sectorId && !rs.setupDone) {
      const left = Math.max(0, rs.setupLeft ?? 0);
      const hungry = status === 'hungry' ? ' · 식량 부족' : '';
      return { text: `초기 정찰 중 (${left}초)${hungry}`, tone: 'setup' };
    }
    if (rs && rs.sectorId === unit.sectorId && rs.setupDone) {
      const interval = reportIntervalForLevel(unit.level);
      const next = Math.max(0, interval - (rs.turnsSinceReport ?? 0));
      const hungry = status === 'hungry' ? ' · 식량 부족' : '';
      return { text: `정찰 중 · 다음 보고 ${next}초${hungry}`, tone: 'recon' };
    }
    return { text: '정찰 준비', tone: 'setup' };
  }

  if (status === 'hungry') return { text: '대기 · 식량 부족', tone: 'warn' };
  return { text: '대기', tone: 'idle' };
}

export function unitTypeLabel(type) {
  const t = unitSymbolKind(type);
  if (t === 'recon') return '정찰병';
  if (t === 'artillery') return '포병';
  return '보병';
}
