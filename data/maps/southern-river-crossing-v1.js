// data/maps/southern-river-crossing-v1.js
// Experimental crossing map.

import { mapBundle, sharedSector } from './shared-layout.js?v=39';

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
    sharedSector({ id: 'A2', code: 'North Plateau', terrain: 'ridge', role: 'observation', elevation: { min: 450, max: 590 }, regionLabel: 'North Plateau', features: ['high_ground', 'road_overlook'], landmarks: ['North Road Cut'], notes: '북쪽 고원. 주 도로와 동쪽 교두보 관측에 유리하다.' }),
    sharedSector({ id: 'B1', code: 'West Orchard', terrain: 'forest', role: 'screen', regionLabel: 'West Orchard Belt', features: ['tree_cover', 'soft_ground'], landmarks: ['Old Orchard'], notes: '서쪽 과수원 지대. 낮은 숲과 밭이 섞인 은폐 접근로다.' }),
    sharedSector({ id: 'B2', code: 'North Ford', terrain: 'valley', role: 'infiltration', regionLabel: 'Upper Ford Ravine', features: ['ford', 'low_ground'], landmarks: ['North Ford'], notes: '강으로 내려가는 얕은 여울 접근로.' }),
    sharedSector({ id: 'B3', code: 'North Bridgehead', terrain: 'plain', role: 'maneuver', regionLabel: 'North Bridgehead', features: ['open_ground', 'riverbank'], landmarks: ['North Bank'], notes: '북쪽 교두보. 이동은 빠르지만 노출이 심하다.' }),
    sharedSector({ id: 'B4', code: 'East Ford', terrain: 'valley', role: 'infiltration', regionLabel: 'East Ford Ravine', features: ['ford', 'side_stream'], landmarks: ['East Ford'], notes: '동쪽 여울. 우회 정찰에 쓸 수 있다.' }),
    sharedSector({ id: 'B5', code: 'East Woods', terrain: 'forest', role: 'screen', regionLabel: 'Eastern Woods', features: ['dense_cover', 'road_screen'], landmarks: ['East Tree Belt'], notes: '동쪽 도로를 가리는 숲 가장자리.' }),
    sharedSector({ id: 'C1', code: 'West Bank Woods', terrain: 'forest', role: 'concealment', regionLabel: 'West Bank Cover', features: ['riverbank_cover', 'ambush_ground'], landmarks: ['West Bank Track'], notes: '서안 숲. 교량 접근 전 은밀 집결이 가능하다.' }),
    sharedSector({ id: 'C2', code: 'Main Bridgehead', terrain: 'plain', role: 'battleline', regionLabel: 'Bridgehead Center', features: ['bridge', 'open_ground', 'road_crossing'], landmarks: ['Main Bridge'], notes: '주 교량을 향한 중앙 교두보.' }),
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
    sharedSector({ id: 'E5', code: 'Depot Road', terrain: 'plain', role: 'support', regionLabel: 'Depot Road', features: ['support_area', 'road_exit'], landmarks: ['Depot Road'], notes: '동남쪽 도로 출구. 적 화력 관측 가능성이 있다.' })
  ]
});
