// data/maps/northern-field-operations-v2.js
// Base tactical map used by Stage 1-1.

import { sector } from './model.js?v=39';

export const NORTHERN_FIELD_OPERATIONS_MAP = {
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
      neighbors: ['A1', 'B3', 'B4', 'B5']
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
      neighbors: ['B4', 'B5', 'C2', 'D3', 'D4', 'D5']
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
      neighbors: ['D4', 'D5', 'E2', 'E4']
    })
  ]
};
