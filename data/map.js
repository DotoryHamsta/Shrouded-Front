// data/map.js
// Shrouded Front - tactical map data model.

const TERRAIN_LABELS = {
  ridge: '고지대',
  valley: '계곡',
  plain: '평야',
  forest: '숲'
};

const TERRAIN_FILLS = {
  ridge: 'url(#ridgeGrad)',
  valley: 'url(#valleyGrad)',
  plain: 'url(#plainGrad)',
  forest: 'url(#forestGrad)'
};

function point([x, y]) {
  return { x, y };
}

function sector({
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

export const MAP = {
  id: 'northern-field-operations-v2',
  name: 'Northern Field Operations Map',
  description:
    'A raster-backed tactical theater with asymmetric ridge lines, forests, valleys, a central river corridor, and road crossings.',
  summary: '중앙 강과 동쪽 숲을 중심으로 한 표준 정찰 훈련 맵.',
  mission: {
    title: '북쪽 계곡 접근로 정찰',
    briefing: '가용 병력 안에서 보직별 인원을 정하고, 리더 슬롯 수만큼 작전 단위를 편성한다.'
  },
  startSectorId: 'D5',
  commAnchors: [
    { sectorId: 'D5', label: 'HQ' },
    { sectorId: 'D3', label: '야전사령부' }
  ],
  viewBox: {
    width: 1200,
    height: 820
  },
  background: {
    href: './assets/northern-field-operations-v2.png',
    type: 'raster',
    sourceSize: { width: 1515, height: 1038 },
    includes: ['terrain', 'river', 'roads', 'forest', 'ridge'],
    excludes: ['sector labels', 'grid labels', 'legend text', 'sector boundary dotted line']
  },
  grid: {
    columns: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'],
    rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
  },
  layers: {
    rivers: [
      {
        id: 'central-river',
        d: 'M560 145 C610 230 580 320 610 415 C645 530 555 610 575 820',
        width: 14,
        crossings: [
          { id: 'north-ford', at: [590, 365], sectors: ['B3', 'C2'] },
          { id: 'center-bridge', at: [625, 500], sectors: ['C2', 'D3'] },
          { id: 'south-bridge', at: [575, 700], sectors: ['E1', 'E4'] }
        ]
      }
    ],
    roads: [
      {
        id: 'west-east-service-road',
        d: 'M110 505 C310 460 470 520 650 505 C820 490 950 555 1130 500',
        type: 'secondary',
        width: 9
      },
      {
        id: 'central-road',
        d: 'M615 820 C590 705 625 590 620 455 C615 330 690 245 740 160',
        type: 'main',
        width: 11
      }
    ],
    towns: [],
    bridgeCrossingPoints: [
      { id: 'north-ford', at: [590, 365], sectors: ['B3', 'C2'] },
      { id: 'center-bridge', at: [625, 500], sectors: ['C2', 'D3'] },
      { id: 'south-bridge', at: [575, 700], sectors: ['E1', 'E4'] }
    ]
  },
  sectors: [
    sector({
      id: 'A1',
      code: 'Ridge A',
      terrain: 'ridge',
      role: 'observation',
      elevation: { min: 520, max: 680 },
      regionLabel: 'Northwest Ridge',
      features: ['high_ground', 'steep_slope', 'long_sightline'],
      landmarks: ['West Crest'],
      notes: '북서부 고지. 서쪽 숲과 중앙 접근로를 내려다볼 수 있다.',
      center: [331, 84],
      polygon: [[80, 0], [520, 0], [545, 105], [475, 165], [340, 170], [220, 145], [95, 95]],
      neighbors: ['A2', 'B1', 'B2', 'B3']
    }),
    sector({
      id: 'A2',
      code: 'Ridge B',
      terrain: 'ridge',
      role: 'observation',
      elevation: { min: 480, max: 620 },
      regionLabel: 'Northeast Ridge',
      features: ['high_ground', 'road_overlook', 'signal_sightline'],
      landmarks: ['East Crest', 'North Road'],
      notes: '북동부 고지. 동쪽 도로와 계곡 진입부를 감시하기 좋다.',
      center: [820, 86],
      polygon: [[520, 0], [1160, 0], [1125, 115], [1010, 165], [850, 145], [700, 190], [545, 105]],
      neighbors: ['A1', 'B3', 'B4', 'B5'],
      hiddenEnemySummary: { class: 'C', size: 12, type: 'recon' }
    }),

    sector({
      id: 'B1',
      code: 'West Forest Edge',
      terrain: 'forest',
      role: 'screen',
      elevation: { min: 200, max: 420 },
      regionLabel: 'Western Tree Line',
      features: ['dense_cover', 'forest_edge', 'restricted_movement'],
      landmarks: ['West Tree Line'],
      notes: '서쪽 숲 가장자리. 은폐가 좋지만 이동과 관측이 느리다.',
      center: [96, 278],
      polygon: [[0, 120], [95, 95], [220, 145], [200, 350], [145, 430], [0, 470]],
      neighbors: ['A1', 'B2', 'C1', 'D1']
    }),
    sector({
      id: 'B2',
      code: 'Valley A',
      terrain: 'valley',
      role: 'infiltration',
      elevation: { min: 120, max: 260 },
      regionLabel: 'West Valley',
      features: ['low_ground', 'streambed', 'covered_approach'],
      landmarks: ['West Wash'],
      notes: '서측 계곡. 좁은 접근로라 정찰과 침투에는 좋지만 포위에 취약하다.',
      center: [296, 273],
      polygon: [[200, 145], [340, 170], [430, 240], [400, 360], [220, 350]],
      neighbors: ['A1', 'B1', 'B3', 'C1', 'C2']
    }),
    sector({
      id: 'B3',
      code: 'North Plain B',
      terrain: 'plain',
      role: 'maneuver',
      elevation: { min: 150, max: 300 },
      regionLabel: 'North Central Plain',
      features: ['open_ground', 'river_approach', 'broken_cover'],
      landmarks: ['Upper River Bend'],
      notes: '강 상류와 맞닿은 북중앙 개활지. 빠른 이동과 노출이 동시에 발생한다.',
      center: [540, 265],
      polygon: [[340, 170], [475, 165], [545, 105], [700, 190], [675, 350], [515, 370], [400, 360], [430, 240]],
      neighbors: ['A1', 'A2', 'B2', 'B4', 'C2']
    }),
    sector({
      id: 'B4',
      code: 'Valley C',
      terrain: 'valley',
      role: 'infiltration',
      elevation: { min: 110, max: 240 },
      regionLabel: 'East Valley',
      features: ['low_ground', 'ravine', 'side_stream'],
      landmarks: ['East Wash'],
      notes: '동측 계곡. 숲과 고지 사이로 우회하기 좋은 저지대다.',
      center: [838, 266],
      polygon: [[700, 190], [850, 145], [1010, 165], [1000, 355], [830, 375], [675, 350]],
      neighbors: ['A2', 'B3', 'B5', 'C2', 'C3']
    }),
    sector({
      id: 'B5',
      code: 'East Forest Edge',
      terrain: 'forest',
      role: 'screen',
      elevation: { min: 190, max: 410 },
      regionLabel: 'Eastern Tree Line',
      features: ['dense_cover', 'forest_edge', 'side_route'],
      landmarks: ['East Tree Line'],
      notes: '동쪽 숲 가장자리. 측면 이동을 숨기기 좋지만 통신과 보급이 불안정하다.',
      center: [1112, 286],
      polygon: [[1010, 165], [1160, 95], [1200, 130], [1200, 520], [1040, 455], [1000, 355]],
      neighbors: ['A2', 'B4', 'C3', 'D5']
    }),

    sector({
      id: 'C1',
      code: 'West Forest Line',
      terrain: 'forest',
      role: 'concealment',
      regionLabel: 'West Inner Woods',
      features: ['concealment', 'forest_track', 'ambush_ground'],
      landmarks: ['Old Forest Track'],
      notes: '서중앙 숲 지대. 아군 소규모 작전 단위가 매복하거나 재편성하기 좋다.',
      center: [284, 425],
      polygon: [[145, 430], [220, 350], [400, 360], [430, 480], [235, 500]],
      neighbors: ['B1', 'B2', 'C2', 'D1', 'D2']
    }),
    sector({
      id: 'C2',
      code: 'Plain B',
      terrain: 'plain',
      role: 'battleline',
      regionLabel: 'Central Battleline',
      features: ['open_ground', 'road_crossing', 'riverbank'],
      landmarks: ['Central Fields'],
      notes: '중앙 교전 예상 지대. 이동은 쉽지만 강과 도로 때문에 관측선이 길다.',
      center: [558, 422],
      polygon: [[400, 360], [515, 370], [675, 350], [710, 485], [430, 480]],
      neighbors: ['B2', 'B3', 'B4', 'C1', 'C3', 'D2', 'D3']
    }),
    sector({
      id: 'C3',
      code: 'Plain C',
      terrain: 'plain',
      role: 'battleline',
      regionLabel: 'East Battleline',
      features: ['open_ground', 'road_axis', 'long_sightline'],
      landmarks: ['East Road Fields'],
      notes: '동중앙 교전 지대. 도로 축을 따라 적 주력이 움직일 가능성이 높다.',
      center: [845, 423],
      polygon: [[675, 350], [830, 375], [1000, 355], [1040, 455], [950, 505], [710, 485]],
      neighbors: ['B4', 'B5', 'C2', 'D3', 'D4', 'D5'],
      hiddenEnemySummary: { class: 'B', size: 40, type: 'infantry' }
    }),

    sector({
      id: 'D1',
      code: 'West Forest D',
      terrain: 'forest',
      role: 'concealment',
      regionLabel: 'Southwest Woods',
      features: ['dense_cover', 'low_visibility', 'forest_route'],
      landmarks: ['Southwest Timber'],
      notes: '서남쪽 숲. 후방 접근로를 보호하지만 큰 부대 이동에는 느리다.',
      center: [96, 605],
      polygon: [[0, 470], [145, 430], [235, 500], [210, 720], [120, 820], [0, 820]],
      neighbors: ['B1', 'C1', 'D2', 'E3']
    }),
    sector({
      id: 'D2',
      code: 'West Forest Pocket',
      terrain: 'forest',
      role: 'concealment',
      regionLabel: 'Central West Woods',
      features: ['concealment', 'broken_ridge', 'stream_cover'],
      landmarks: ['Forest Pocket'],
      notes: '서중앙 숲 주머니 지형. 짧은 재편성이나 은밀 이동에 알맞다.',
      center: [317, 560],
      polygon: [[235, 500], [430, 480], [430, 610], [245, 625], [210, 720]],
      neighbors: ['C1', 'C2', 'D1', 'D3', 'E1', 'E3']
    }),
    sector({
      id: 'D3',
      code: 'Plain E',
      terrain: 'plain',
      role: 'maneuver',
      regionLabel: 'Forward Command Plain',
      features: ['river_crossing', 'road_junction', 'forward_supply'],
      landmarks: ['Forward Bridge'],
      notes: '강 중류와 도로가 만나는 기동 지대. 야전사령부와 보급 연결의 중심이다.',
      center: [565, 565],
      polygon: [[430, 480], [710, 485], [720, 620], [570, 650], [430, 610]],
      neighbors: ['C2', 'C3', 'D2', 'D4', 'E1', 'E2', 'E4'],
      friendlySummary: '야전사령부 및 중간 보급 지점',
      owner: 'player',
      reportSummary: '아군 보급 거점'
    }),
    sector({
      id: 'D4',
      code: 'Plain F',
      terrain: 'plain',
      role: 'maneuver',
      regionLabel: 'East Maneuver Plain',
      features: ['open_ground', 'road_axis', 'riverbank'],
      landmarks: ['East Bridge Road'],
      notes: '동측 기동 평야. 중앙 강변과 동쪽 숲을 연결하는 통로다.',
      center: [844, 566],
      polygon: [[710, 485], [950, 505], [1040, 455], [1005, 640], [720, 620]],
      neighbors: ['C3', 'D3', 'D5', 'E2', 'E5']
    }),
    sector({
      id: 'D5',
      code: 'East Forest D',
      terrain: 'forest',
      role: 'hq-cover',
      regionLabel: 'Eastern Rear Woods',
      features: ['hq_cover', 'supply_cache', 'concealed_tracks'],
      landmarks: ['HQ Woods'],
      notes: '동남쪽 후방 숲. 작전 시작점과 주 보급 거점으로 쓰인다.',
      center: [1112, 625],
      polygon: [[1040, 455], [1200, 520], [1200, 820], [1000, 820], [1005, 640]],
      neighbors: ['B5', 'C3', 'D4', 'E5'],
      friendlySummary: '본부 및 주 보급 거점',
      owner: 'player',
      reportSummary: '아군 보급 거점'
    }),

    sector({
      id: 'E1',
      code: 'Plain G',
      terrain: 'plain',
      role: 'approach',
      regionLabel: 'Southwest Approach',
      features: ['approach_ground', 'secondary_road', 'soft_cover'],
      landmarks: ['Lower West Fields'],
      notes: '남서 접근 평야. 후방에서 중앙 강변으로 들어가는 완만한 통로다.',
      center: [420, 680],
      polygon: [[245, 625], [430, 610], [570, 650], [575, 725], [360, 755], [210, 720]],
      neighbors: ['D2', 'D3', 'E2', 'E3', 'E4']
    }),
    sector({
      id: 'E2',
      code: 'Plain H',
      terrain: 'plain',
      role: 'approach',
      regionLabel: 'Southeast Approach',
      features: ['approach_ground', 'road_bend', 'riverbank'],
      landmarks: ['Lower East Fields'],
      notes: '남동 접근 평야. 동쪽 숲과 중앙 강변 사이에서 넓게 펼쳐진다.',
      center: [790, 685],
      polygon: [[570, 650], [720, 620], [1005, 640], [1000, 735], [760, 760], [575, 725]],
      neighbors: ['D3', 'D4', 'E1', 'E4', 'E5']
    }),
    sector({
      id: 'E3',
      code: 'Ridge C',
      terrain: 'ridge',
      role: 'observation',
      elevation: { min: 430, max: 610 },
      regionLabel: 'Southwest Ridge',
      features: ['high_ground', 'rear_overlook', 'rough_slope'],
      landmarks: ['Southwest Crest'],
      notes: '남서부 고지. 후방 접근로를 내려다보지만 지형이 험하다.',
      center: [300, 780],
      polygon: [[120, 820], [210, 720], [360, 755], [445, 820]],
      neighbors: ['D1', 'D2', 'E1', 'E4']
    }),
    sector({
      id: 'E4',
      code: 'Plain J',
      terrain: 'plain',
      role: 'support',
      regionLabel: 'Southern Support Plain',
      features: ['support_area', 'river_exit', 'rear_route'],
      landmarks: ['Lower River Road'],
      notes: '남중앙 지원 지대. 보급 이동과 후방 재편성에 쓰기 좋다.',
      center: [600, 780],
      polygon: [[445, 820], [360, 755], [575, 725], [760, 760], [735, 820]],
      neighbors: ['D3', 'E1', 'E2', 'E3', 'E5']
    }),
    sector({
      id: 'E5',
      code: 'Plain K',
      terrain: 'plain',
      role: 'support',
      regionLabel: 'Southeast Support Plain',
      features: ['support_area', 'road_exit', 'forest_edge'],
      landmarks: ['Lower East Road'],
      notes: '남동쪽 지원 지대. 동쪽 숲과 후방 도로가 맞닿는 위험한 출구다.',
      center: [880, 780],
      polygon: [[735, 820], [760, 760], [1000, 735], [1000, 820]],
      neighbors: ['D4', 'D5', 'E2', 'E4'],
      hiddenEnemySummary: { class: 'A', size: 18, type: 'artillery' }
    })
  ]
};

const COMMON_LAYOUT = {
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

function sharedSector(config) {
  return sector({
    ...COMMON_LAYOUT[config.id],
    ...config
  });
}

function mapBundle({
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
    startSectorId: 'D5',
    commAnchors: [
      { sectorId: 'D5', label: 'HQ' },
      { sectorId: 'D3', label: '야전사령부' }
    ],
    viewBox: { ...MAP.viewBox },
    background,
    grid: {
      columns: [...MAP.grid.columns],
      rows: [...MAP.grid.rows]
    },
    layers,
    sectors
  };
}

export const SOUTHERN_RIVER_CROSSING_MAP = mapBundle({
  id: 'southern-river-crossing-v1',
  name: 'Southern River Crossing',
  description:
    'An experimental crossing map with a wide central river, exposed bridgeheads, rear woods, and ridge observation points.',
  summary: '강 도하와 교량 장악을 실험하기 위한 남부 전장.',
  mission: {
    title: '남부 교량 접근로 확보',
    briefing: '강변 교량과 도하 지점을 살피고, 노출된 교두보에 맞는 작전 단위를 편성한다.'
  },
  background: {
    href: './assets/maps/southern-river-crossing-v1.png',
    type: 'raster',
    sourceSize: { width: 1517, height: 1037 },
    includes: ['terrain', 'river', 'roads', 'forest', 'ridge'],
    excludes: ['sector labels', 'grid labels', 'legend text', 'sector boundary dotted line']
  },
  layers: {
    rivers: [
      {
        id: 'southern-main-river',
        d: 'M0 388 C210 350 370 435 555 400 C760 360 930 420 1200 382',
        width: 26,
        crossings: [
          { id: 'west-ford', at: [380, 412], sectors: ['C1', 'C2'] },
          { id: 'main-bridge', at: [610, 400], sectors: ['C2', 'D3'] },
          { id: 'east-ford', at: [870, 410], sectors: ['C3', 'D4'] }
        ]
      }
    ],
    roads: [
      { id: 'bridge-road', d: 'M85 520 C275 465 430 510 610 400 C820 270 980 285 1160 210', type: 'main', width: 11 },
      { id: 'rear-road', d: 'M190 720 C390 660 590 690 770 650 C930 610 1035 645 1160 720', type: 'secondary', width: 8 }
    ],
    towns: [],
    bridgeCrossingPoints: [
      { id: 'west-ford', at: [380, 412], sectors: ['C1', 'C2'] },
      { id: 'main-bridge', at: [610, 400], sectors: ['C2', 'D3'] },
      { id: 'east-ford', at: [870, 410], sectors: ['C3', 'D4'] }
    ]
  },
  sectors: [
    sharedSector({ id: 'A1', code: 'West Heights', terrain: 'ridge', role: 'observation', elevation: { min: 500, max: 650 }, regionLabel: 'Northwest Heights', features: ['high_ground', 'bridge_overlook'], landmarks: ['West Spur'], notes: '서쪽 고지. 강 서안 접근로를 내려다본다.' }),
    sharedSector({ id: 'A2', code: 'North Plateau', terrain: 'ridge', role: 'observation', elevation: { min: 450, max: 590 }, regionLabel: 'North Plateau', features: ['high_ground', 'road_overlook'], landmarks: ['North Road Cut'], notes: '북쪽 고원. 주 도로와 동쪽 교두보 관측에 유리하다.', hiddenEnemySummary: { class: 'C', size: 10, type: 'recon' } }),
    sharedSector({ id: 'B1', code: 'West Orchard', terrain: 'forest', role: 'screen', regionLabel: 'West Orchard Belt', features: ['tree_cover', 'soft_ground'], landmarks: ['Old Orchard'], notes: '서쪽 과수원 지대. 낮은 숲과 밭이 섞인 은폐 접근로다.' }),
    sharedSector({ id: 'B2', code: 'North Ford', terrain: 'valley', role: 'infiltration', regionLabel: 'Upper Ford Ravine', features: ['ford', 'low_ground'], landmarks: ['North Ford'], notes: '강으로 내려가는 얕은 여울 접근로.' }),
    sharedSector({ id: 'B3', code: 'North Bridgehead', terrain: 'plain', role: 'maneuver', regionLabel: 'North Bridgehead', features: ['open_ground', 'riverbank'], landmarks: ['North Bank'], notes: '북쪽 교두보. 이동은 빠르지만 노출이 심하다.' }),
    sharedSector({ id: 'B4', code: 'East Ford', terrain: 'valley', role: 'infiltration', regionLabel: 'East Ford Ravine', features: ['ford', 'side_stream'], landmarks: ['East Ford'], notes: '동쪽 여울. 우회 정찰에 쓸 수 있다.' }),
    sharedSector({ id: 'B5', code: 'East Woods', terrain: 'forest', role: 'screen', regionLabel: 'Eastern Woods', features: ['dense_cover', 'road_screen'], landmarks: ['East Tree Belt'], notes: '동쪽 도로를 가리는 숲 가장자리.' }),
    sharedSector({ id: 'C1', code: 'West Bank Woods', terrain: 'forest', role: 'concealment', regionLabel: 'West Bank Cover', features: ['riverbank_cover', 'ambush_ground'], landmarks: ['West Bank Track'], notes: '서안 숲. 교량 접근 전 은밀 집결이 가능하다.' }),
    sharedSector({ id: 'C2', code: 'Main Bridgehead', terrain: 'plain', role: 'battleline', regionLabel: 'Bridgehead Center', features: ['bridge', 'open_ground', 'road_crossing'], landmarks: ['Main Bridge'], notes: '주 교량을 향한 중앙 교두보.', hiddenEnemySummary: { class: 'B', size: 34, type: 'infantry' } }),
    sharedSector({ id: 'C3', code: 'East Bank Fields', terrain: 'plain', role: 'battleline', regionLabel: 'East Bank Fields', features: ['open_ground', 'road_axis'], landmarks: ['East Bank Road'], notes: '동안 개활지. 교량을 건넌 뒤 가장 먼저 노출되는 구역.' }),
    sharedSector({ id: 'D1', code: 'Southwest Woods', terrain: 'forest', role: 'concealment', regionLabel: 'Southwest Cover', features: ['dense_cover', 'rear_track'], landmarks: ['Southwest Timber'], notes: '서남쪽 후방 숲. 병력 재편성에 유리하다.' }),
    sharedSector({ id: 'D2', code: 'Lower West Bank', terrain: 'plain', role: 'maneuver', regionLabel: 'Lower West Bank', features: ['riverbank', 'soft_ground'], landmarks: ['Lower Bank'], notes: '교량 남서쪽 강변 기동 지대.' }),
    sharedSector({ id: 'D3', code: 'Bridge Command', terrain: 'plain', role: 'maneuver', regionLabel: 'Bridge Command Post', features: ['bridge', 'forward_supply', 'road_junction'], landmarks: ['Bridge CP'], notes: '교량 남단의 전방 지휘 및 보급 지점.', friendlySummary: '야전사령부 및 중간 보급 지점', owner: 'player', reportSummary: '아군 보급 거점' }),
    sharedSector({ id: 'D4', code: 'East Road Bank', terrain: 'plain', role: 'maneuver', regionLabel: 'East Road Bank', features: ['road_axis', 'riverbank'], landmarks: ['East Road Bend'], notes: '동쪽 도로가 강변을 따라 꺾이는 지점.' }),
    sharedSector({ id: 'D5', code: 'Rear Grove HQ', terrain: 'forest', role: 'hq-cover', regionLabel: 'Rear Grove', features: ['hq_cover', 'supply_cache'], landmarks: ['Rear Grove HQ'], notes: '후방 숲속 주 보급 및 시작 지점.', friendlySummary: '본부 및 주 보급 거점', owner: 'player', reportSummary: '아군 보급 거점' }),
    sharedSector({ id: 'E1', code: 'South Flats', terrain: 'plain', role: 'approach', regionLabel: 'South Flats', features: ['approach_ground', 'rear_road'], landmarks: ['South Flats'], notes: '남쪽 평탄지. 후방 이동과 재집결에 적합하다.' }),
    sharedSector({ id: 'E2', code: 'Southeast Flats', terrain: 'plain', role: 'approach', regionLabel: 'Southeast Flats', features: ['approach_ground', 'road_exit'], landmarks: ['Southeast Bend'], notes: '동남쪽 평야. 도로와 숲 사이의 완충 지대.' }),
    sharedSector({ id: 'E3', code: 'South Ridge', terrain: 'ridge', role: 'observation', elevation: { min: 420, max: 560 }, regionLabel: 'South Ridge', features: ['high_ground', 'rear_overlook'], landmarks: ['South Spur'], notes: '남서쪽 고지. 후방 도하로를 내려다본다.' }),
    sharedSector({ id: 'E4', code: 'Supply Fields', terrain: 'plain', role: 'support', regionLabel: 'Supply Fields', features: ['support_area', 'rear_route'], landmarks: ['Supply Fields'], notes: '남중앙 지원 지대.' }),
    sharedSector({ id: 'E5', code: 'Depot Road', terrain: 'plain', role: 'support', regionLabel: 'Depot Road', features: ['support_area', 'road_exit'], landmarks: ['Depot Road'], notes: '동남쪽 도로 출구. 적 화력 관측 가능성이 있다.', hiddenEnemySummary: { class: 'A', size: 14, type: 'artillery' } })
  ]
});

export const EASTERN_RIDGE_LINE_MAP = mapBundle({
  id: 'eastern-ridge-line-v1',
  name: 'Eastern Ridge Line',
  description:
    'An experimental ridge-and-forest theater with broken high ground, narrow ravines, and an exposed eastern road axis.',
  summary: '고지 관측과 숲 우회를 실험하기 위한 동부 능선 맵.',
  mission: {
    title: '동부 능선 관측선 구축',
    briefing: '능선 관측로와 숲 우회로를 동시에 관리할 수 있게 작전 단위를 나눈다.'
  },
  background: {
    href: './assets/maps/eastern-ridge-line-v1.png',
    type: 'raster',
    sourceSize: { width: 1517, height: 1037 },
    includes: ['terrain', 'river', 'roads', 'forest', 'ridge'],
    excludes: ['sector labels', 'grid labels', 'legend text', 'sector boundary dotted line']
  },
  layers: {
    rivers: [
      {
        id: 'east-ravine-stream',
        d: 'M1020 0 C970 150 900 260 915 390 C930 520 820 625 790 820',
        width: 11,
        crossings: [
          { id: 'ridge-ford', at: [915, 390], sectors: ['C3', 'D4'] },
          { id: 'lower-ford', at: [830, 650], sectors: ['E2', 'E5'] }
        ]
      }
    ],
    roads: [
      { id: 'ridge-road', d: 'M260 820 C335 650 480 555 650 480 C815 405 965 280 1130 90', type: 'main', width: 10 },
      { id: 'forest-track', d: 'M0 335 C210 360 360 300 505 355 C620 400 765 390 930 455', type: 'secondary', width: 7 }
    ],
    towns: [],
    bridgeCrossingPoints: [
      { id: 'ridge-ford', at: [915, 390], sectors: ['C3', 'D4'] },
      { id: 'lower-ford', at: [830, 650], sectors: ['E2', 'E5'] }
    ]
  },
  sectors: [
    sharedSector({ id: 'A1', code: 'Signal Ridge', terrain: 'ridge', role: 'observation', elevation: { min: 560, max: 720 }, regionLabel: 'Signal Ridge', features: ['high_ground', 'signal_sightline'], landmarks: ['Signal Spur'], notes: '북서쪽 통신 능선. 전장 서부를 넓게 볼 수 있다.' }),
    sharedSector({ id: 'A2', code: 'Iron Ridge', terrain: 'ridge', role: 'observation', elevation: { min: 610, max: 760 }, regionLabel: 'Iron Ridge', features: ['high_ground', 'steep_slope', 'road_overlook'], landmarks: ['Iron Crest'], notes: '동북부 주 능선. 도로 축과 협곡을 감시한다.', hiddenEnemySummary: { class: 'B', size: 22, type: 'infantry' } }),
    sharedSector({ id: 'B1', code: 'West Ravine Wood', terrain: 'forest', role: 'screen', regionLabel: 'West Ravine Wood', features: ['dense_cover', 'ravine'], landmarks: ['West Ravine'], notes: '서쪽 협곡 숲. 정찰대가 천천히 움직이는 지대.' }),
    sharedSector({ id: 'B2', code: 'Lower Saddle', terrain: 'valley', role: 'infiltration', regionLabel: 'Lower Saddle', features: ['saddle', 'low_ground'], landmarks: ['Saddle Track'], notes: '능선 사이의 낮은 안부. 침투와 매복 모두 가능하다.' }),
    sharedSector({ id: 'B3', code: 'Ridge Meadow', terrain: 'plain', role: 'maneuver', regionLabel: 'Ridge Meadow', features: ['open_ground', 'broken_cover'], landmarks: ['High Meadow'], notes: '고지 사이 개활지. 빠르지만 노출된다.' }),
    sharedSector({ id: 'B4', code: 'East Ravine', terrain: 'valley', role: 'infiltration', regionLabel: 'East Ravine', features: ['ravine', 'streambed'], landmarks: ['East Ravine'], notes: '동쪽 협곡. 도로 접근 전 마지막 은폐 지형.' }),
    sharedSector({ id: 'B5', code: 'North Pine Wall', terrain: 'forest', role: 'screen', regionLabel: 'North Pine Wall', features: ['dense_cover', 'forest_edge'], landmarks: ['Pine Wall'], notes: '동북쪽 짙은 침엽수림.' }),
    sharedSector({ id: 'C1', code: 'West Spur Wood', terrain: 'forest', role: 'concealment', regionLabel: 'West Spur Wood', features: ['concealment', 'rough_slope'], landmarks: ['West Spur'], notes: '서쪽 능선 아래 숲. 대기와 재편성에 좋다.' }),
    sharedSector({ id: 'C2', code: 'Central Saddle', terrain: 'plain', role: 'battleline', regionLabel: 'Central Saddle', features: ['open_ground', 'road_crossing'], landmarks: ['Saddle Road'], notes: '중앙 안부. 양쪽 고지에서 관측받는 교전 예상 지점.' }),
    sharedSector({ id: 'C3', code: 'East Road Cut', terrain: 'plain', role: 'battleline', regionLabel: 'East Road Cut', features: ['road_axis', 'exposed_ground'], landmarks: ['Road Cut'], notes: '동쪽 도로 절개부. 적 주력이 통과하기 쉽다.', hiddenEnemySummary: { class: 'B', size: 32, type: 'infantry' } }),
    sharedSector({ id: 'D1', code: 'Deep West Wood', terrain: 'forest', role: 'concealment', regionLabel: 'Deep West Wood', features: ['dense_cover', 'low_visibility'], landmarks: ['Deep West Track'], notes: '깊은 서쪽 숲. 이동은 느리지만 은폐가 탁월하다.' }),
    sharedSector({ id: 'D2', code: 'Broken Slope', terrain: 'ridge', role: 'observation', elevation: { min: 390, max: 540 }, regionLabel: 'Broken Slope', features: ['rough_slope', 'limited_cover'], landmarks: ['Broken Slope'], notes: '무너진 사면. 낮은 고지 관측점으로 쓸 수 있다.' }),
    sharedSector({ id: 'D3', code: 'Forward Saddle', terrain: 'plain', role: 'maneuver', regionLabel: 'Forward Saddle', features: ['forward_supply', 'road_junction'], landmarks: ['Forward Saddle'], notes: '중앙 전방 안부. 지휘/보급 중계에 적합하다.', friendlySummary: '야전사령부 및 중간 보급 지점', owner: 'player', reportSummary: '아군 보급 거점' }),
    sharedSector({ id: 'D4', code: 'East Slope Road', terrain: 'plain', role: 'maneuver', regionLabel: 'East Slope Road', features: ['road_axis', 'ravine_crossing'], landmarks: ['Slope Road'], notes: '동쪽 사면 도로. 이동은 빠르지만 적 관측 가능성이 높다.' }),
    sharedSector({ id: 'D5', code: 'Rear Pine HQ', terrain: 'forest', role: 'hq-cover', regionLabel: 'Rear Pine HQ', features: ['hq_cover', 'supply_cache'], landmarks: ['Rear Pine HQ'], notes: '후방 침엽수림 본부. 주 보급 거점이다.', friendlySummary: '본부 및 주 보급 거점', owner: 'player', reportSummary: '아군 보급 거점' }),
    sharedSector({ id: 'E1', code: 'South Meadow', terrain: 'plain', role: 'approach', regionLabel: 'South Meadow', features: ['approach_ground', 'rear_route'], landmarks: ['South Meadow'], notes: '남쪽 초지. 후방 접근과 재편성에 적합하다.' }),
    sharedSector({ id: 'E2', code: 'Lower East Meadow', terrain: 'plain', role: 'approach', regionLabel: 'Lower East Meadow', features: ['approach_ground', 'stream_edge'], landmarks: ['Lower East Meadow'], notes: '동남쪽 낮은 초지. 도로와 계곡 사이 완충 지대.' }),
    sharedSector({ id: 'E3', code: 'Old Quarry Ridge', terrain: 'ridge', role: 'observation', elevation: { min: 460, max: 620 }, regionLabel: 'Old Quarry Ridge', features: ['high_ground', 'quarry_slope'], landmarks: ['Old Quarry'], notes: '남서쪽 채석장 고지. 후방 도로를 관측한다.' }),
    sharedSector({ id: 'E4', code: 'Rear Saddle', terrain: 'plain', role: 'support', regionLabel: 'Rear Saddle', features: ['support_area', 'rear_route'], landmarks: ['Rear Saddle'], notes: '남중앙 후방 안부. 지원과 재보급에 쓴다.' }),
    sharedSector({ id: 'E5', code: 'East Exit Road', terrain: 'plain', role: 'support', regionLabel: 'East Exit Road', features: ['support_area', 'road_exit'], landmarks: ['East Exit Road'], notes: '동남쪽 도로 출구. 적 포병 관측이 의심된다.', hiddenEnemySummary: { class: 'A', size: 16, type: 'artillery' } })
  ]
});

export const MAPS = [
  MAP,
  SOUTHERN_RIVER_CROSSING_MAP,
  EASTERN_RIDGE_LINE_MAP
];

export const DEFAULT_MAP_ID = MAP.id;

let activeMap = MAP;

export function listMaps() {
  return MAPS.map((map) => ({
    id: map.id,
    name: map.name,
    description: map.description,
    summary: map.summary,
    mission: map.mission ? { ...map.mission } : null,
    startSectorId: map.startSectorId,
    background: map.background ? { ...map.background } : null
  }));
}

export function getMapById(id) {
  return MAPS.find((map) => map.id === id) || null;
}

export function getActiveMap() {
  return activeMap;
}

export function setActiveMap(mapOrId = DEFAULT_MAP_ID) {
  const next = typeof mapOrId === 'string'
    ? getMapById(mapOrId)
    : mapOrId;
  activeMap = next || MAP;
  return activeMap;
}

export function getSectorById(id, map = activeMap) {
  return map?.sectors?.find((item) => item.id === id) || null;
}

// Translates an internal grid id (e.g. "B5") to the player-facing code
// (e.g. "East Forest Edge"). Grid ids are an implementation detail used for
// adjacency; the UI should only show codes.
export function codeForSector(id, map = activeMap) {
  if (!id) return '-';
  return getSectorById(id, map)?.code ?? id;
}

export function getNeighborSectors(id, map = activeMap) {
  const item = getSectorById(id, map);
  if (!item) return [];
  return item.neighbors.map((neighborId) => getSectorById(neighborId, map)).filter(Boolean);
}

export function summarizeSector(item) {
  if (!item) return null;
  return {
    id: item.id,
    code: item.code,
    terrain: item.terrain,
    terrainLabel: item.terrainLabel,
    regionLabel: item.regionLabel,
    landmarks: item.landmarks,
    notes: item.notes,
    reportSummary: item.reportSummary,
    alert: item.alert,
    alertLabel: item.alertLabel,
    visibilityHint: item.visibilityHint,
    enemySummary: item.enemySummary,
    hiddenEnemySummary: item.hiddenEnemySummary,
    control: item.control,
    neighbors: item.neighbors,
    center: item.center,
    labelPoint: item.labelPoint,
    elevation: item.elevation
  };
}
