// data/maps/model.js
// Shared map data constructors and terrain presentation metadata.

export const TERRAIN_LABELS = {
  ridge: '고지대',
  valley: '계곡',
  plain: '평야',
  forest: '숲'
};

export const TERRAIN_FILLS = {
  ridge: 'url(#ridgeGrad)',
  valley: 'url(#valleyGrad)',
  plain: 'url(#plainGrad)',
  forest: 'url(#forestGrad)'
};

function point([x, y]) {
  return { x, y };
}

export function sector({
  id,
  code,
  terrain,
  role,
  center,
  labelPoint = center,
  polygon,
  neighbors,
  regionLabel = '',
  features = [],
  landmarks = [],
  notes = '',
  elevation = null,
  hiddenEnemySummary = null,
  friendlySummary = null,
  owner = 'neutral',
  reportSummary = '미탐색'
}) {
  return {
    id,
    code,
    terrain,
    terrainLabel: TERRAIN_LABELS[terrain] ?? terrain,
    regionLabel,
    features,
    landmarks,
    role,
    notes,
    elevation,
    svgFill: TERRAIN_FILLS[terrain] ?? TERRAIN_FILLS.plain,
    alert: false,
    alertLabel: null,
    visibilityHint: notes,
    neighbors,
    center: point(center),
    labelPoint: point(labelPoint),
    polygon,
    control: 'unseen',
    friendlySummary,
    enemySummary: null,
    hiddenEnemySummary,
    reportSummary,
    occupancy: [],
    owner
  };
}
