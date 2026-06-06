// data/maps/shared-layout.js
// Shared grid geometry for the experimental raster-backed maps.

import { sector } from './model.js?v=39';

export const DEFAULT_START_SECTOR_ID = 'D5';
export const DEFAULT_COMM_ANCHORS = Object.freeze([
  { sectorId: 'D5', label: 'HQ' },
  { sectorId: 'D3', label: '야전사령부' }
]);
export const DEFAULT_VIEW_BOX = Object.freeze({ width: 1200, height: 820 });
export const DEFAULT_GRID = Object.freeze({
  columns: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'],
  rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
});

export const COMMON_LAYOUT = {
  A1: { center: [331, 84], polygon: [[80, 0], [520, 0], [545, 105], [475, 165], [340, 170], [220, 145], [95, 95]], neighbors: ['A2', 'B1', 'B2', 'B3'] },
  A2: { center: [820, 86], polygon: [[520, 0], [1160, 0], [1125, 115], [1010, 165], [850, 145], [700, 190], [545, 105]], neighbors: ['A1', 'B3', 'B4', 'B5'] },
  B1: { center: [96, 278], polygon: [[0, 120], [95, 95], [220, 145], [200, 350], [145, 430], [0, 470]], neighbors: ['A1', 'B2', 'C1', 'D1'] },
  B2: { center: [296, 273], polygon: [[200, 145], [340, 170], [430, 240], [400, 360], [220, 350]], neighbors: ['A1', 'B1', 'B3', 'C1', 'C2'] },
  B3: { center: [540, 265], polygon: [[340, 170], [475, 165], [545, 105], [700, 190], [675, 350], [515, 370], [400, 360], [430, 240]], neighbors: ['A1', 'A2', 'B2', 'B4', 'C2'] },
  B4: { center: [838, 266], polygon: [[700, 190], [850, 145], [1010, 165], [1000, 355], [830, 375], [675, 350]], neighbors: ['A2', 'B3', 'B5', 'C2', 'C3'] },
  B5: { center: [1112, 286], polygon: [[1010, 165], [1160, 95], [1200, 130], [1200, 520], [1040, 455], [1000, 355]], neighbors: ['A2', 'B4', 'C3', 'D5'] },
  C1: { center: [284, 425], polygon: [[145, 430], [220, 350], [400, 360], [430, 480], [235, 500]], neighbors: ['B1', 'B2', 'C2', 'D1', 'D2'] },
  C2: { center: [558, 422], polygon: [[400, 360], [515, 370], [675, 350], [710, 485], [430, 480]], neighbors: ['B2', 'B3', 'B4', 'C1', 'C3', 'D2', 'D3'] },
  C3: { center: [845, 423], polygon: [[675, 350], [830, 375], [1000, 355], [1040, 455], [950, 505], [710, 485]], neighbors: ['B4', 'B5', 'C2', 'D3', 'D4', 'D5'] },
  D1: { center: [96, 605], polygon: [[0, 470], [145, 430], [235, 500], [210, 720], [120, 820], [0, 820]], neighbors: ['B1', 'C1', 'D2', 'E3'] },
  D2: { center: [317, 560], polygon: [[235, 500], [430, 480], [430, 610], [245, 625], [210, 720]], neighbors: ['C1', 'C2', 'D1', 'D3', 'E1', 'E3'] },
  D3: { center: [565, 565], polygon: [[430, 480], [710, 485], [720, 620], [570, 650], [430, 610]], neighbors: ['C2', 'C3', 'D2', 'D4', 'E1', 'E2', 'E4'] },
  D4: { center: [844, 566], polygon: [[710, 485], [950, 505], [1040, 455], [1005, 640], [720, 620]], neighbors: ['C3', 'D3', 'D5', 'E2', 'E5'] },
  D5: { center: [1112, 625], polygon: [[1040, 455], [1200, 520], [1200, 820], [1000, 820], [1005, 640]], neighbors: ['B5', 'C3', 'D4', 'E5'] },
  E1: { center: [420, 680], polygon: [[245, 625], [430, 610], [570, 650], [575, 725], [360, 755], [210, 720]], neighbors: ['D2', 'D3', 'E2', 'E3', 'E4'] },
  E2: { center: [790, 685], polygon: [[570, 650], [720, 620], [1005, 640], [1000, 735], [760, 760], [575, 725]], neighbors: ['D3', 'D4', 'E1', 'E4', 'E5'] },
  E3: { center: [300, 780], polygon: [[120, 820], [210, 720], [360, 755], [445, 820]], neighbors: ['D1', 'D2', 'E1', 'E4'] },
  E4: { center: [600, 780], polygon: [[445, 820], [360, 755], [575, 725], [760, 760], [735, 820]], neighbors: ['D3', 'E1', 'E2', 'E3', 'E5'] },
  E5: { center: [880, 780], polygon: [[735, 820], [760, 760], [1000, 735], [1000, 820]], neighbors: ['D4', 'D5', 'E2', 'E4'] }
};

export function sharedSector(config) {
  return sector({
    ...COMMON_LAYOUT[config.id],
    ...config
  });
}

export function mapBundle({
  id,
  name,
  description,
  summary,
  mission,
  background,
  layers,
  sectors
}) {
  return {
    id,
    name,
    description,
    summary,
    mission,
    startSectorId: DEFAULT_START_SECTOR_ID,
    commAnchors: DEFAULT_COMM_ANCHORS.map((anchor) => ({ ...anchor })),
    viewBox: { ...DEFAULT_VIEW_BOX },
    background,
    grid: {
      columns: [...DEFAULT_GRID.columns],
      rows: [...DEFAULT_GRID.rows]
    },
    layers,
    sectors
  };
}
