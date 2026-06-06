// data/maps/index.js
// Map registry inputs. Keep map content in one module per map.

import { NORTHERN_FIELD_OPERATIONS_MAP } from './northern-field-operations-v2.js?v=39';
import { SOUTHERN_RIVER_CROSSING_MAP } from './southern-river-crossing-v1.js?v=39';
import { EASTERN_RIDGE_LINE_MAP } from './eastern-ridge-line-v1.js?v=39';

export {
  NORTHERN_FIELD_OPERATIONS_MAP,
  SOUTHERN_RIVER_CROSSING_MAP,
  EASTERN_RIDGE_LINE_MAP
};

export const MAP = NORTHERN_FIELD_OPERATIONS_MAP;

export const MAPS = Object.freeze([
  NORTHERN_FIELD_OPERATIONS_MAP,
  SOUTHERN_RIVER_CROSSING_MAP,
  EASTERN_RIDGE_LINE_MAP
]);
