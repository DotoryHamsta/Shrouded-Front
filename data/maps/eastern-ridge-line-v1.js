// data/maps/eastern-ridge-line-v1.js
// Experimental ridge-line map.

import { mapBundle, sharedSector } from './shared-layout.js?v=39';

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
    sharedSector({ id: 'A2', code: 'Iron Ridge', terrain: 'ridge', role: 'observation', elevation: { min: 610, max: 760 }, regionLabel: 'Iron Ridge', features: ['high_ground', 'steep_slope', 'road_overlook'], landmarks: ['Iron Crest'], notes: '동북부 주 능선. 도로 축과 협곡을 감시한다.' }),
    sharedSector({ id: 'B1', code: 'West Ravine Wood', terrain: 'forest', role: 'screen', regionLabel: 'West Ravine Wood', features: ['dense_cover', 'ravine'], landmarks: ['West Ravine'], notes: '서쪽 협곡 숲. 정찰대가 천천히 움직이는 지대.' }),
    sharedSector({ id: 'B2', code: 'Lower Saddle', terrain: 'valley', role: 'infiltration', regionLabel: 'Lower Saddle', features: ['saddle', 'low_ground'], landmarks: ['Saddle Track'], notes: '능선 사이의 낮은 안부. 침투와 매복 모두 가능하다.' }),
    sharedSector({ id: 'B3', code: 'Ridge Meadow', terrain: 'plain', role: 'maneuver', regionLabel: 'Ridge Meadow', features: ['open_ground', 'broken_cover'], landmarks: ['High Meadow'], notes: '고지 사이 개활지. 빠르지만 노출된다.' }),
    sharedSector({ id: 'B4', code: 'East Ravine', terrain: 'valley', role: 'infiltration', regionLabel: 'East Ravine', features: ['ravine', 'streambed'], landmarks: ['East Ravine'], notes: '동쪽 협곡. 도로 접근 전 마지막 은폐 지형.' }),
    sharedSector({ id: 'B5', code: 'North Pine Wall', terrain: 'forest', role: 'screen', regionLabel: 'North Pine Wall', features: ['dense_cover', 'forest_edge'], landmarks: ['Pine Wall'], notes: '동북쪽 짙은 침엽수림.' }),
    sharedSector({ id: 'C1', code: 'West Spur Wood', terrain: 'forest', role: 'concealment', regionLabel: 'West Spur Wood', features: ['concealment', 'rough_slope'], landmarks: ['West Spur'], notes: '서쪽 능선 아래 숲. 대기와 재편성에 좋다.' }),
    sharedSector({ id: 'C2', code: 'Central Saddle', terrain: 'plain', role: 'battleline', regionLabel: 'Central Saddle', features: ['open_ground', 'road_crossing'], landmarks: ['Saddle Road'], notes: '중앙 안부. 양쪽 고지에서 관측받는 교전 예상 지점.' }),
    sharedSector({ id: 'C3', code: 'East Road Cut', terrain: 'plain', role: 'battleline', regionLabel: 'East Road Cut', features: ['road_axis', 'exposed_ground'], landmarks: ['Road Cut'], notes: '동쪽 도로 절개부. 적 주력이 통과하기 쉽다.' }),
    sharedSector({ id: 'D1', code: 'Deep West Wood', terrain: 'forest', role: 'concealment', regionLabel: 'Deep West Wood', features: ['dense_cover', 'low_visibility'], landmarks: ['Deep West Track'], notes: '깊은 서쪽 숲. 이동은 느리지만 은폐가 탁월하다.' }),
    sharedSector({ id: 'D2', code: 'Broken Slope', terrain: 'ridge', role: 'observation', elevation: { min: 390, max: 540 }, regionLabel: 'Broken Slope', features: ['rough_slope', 'limited_cover'], landmarks: ['Broken Slope'], notes: '무너진 사면. 낮은 고지 관측점으로 쓸 수 있다.' }),
    sharedSector({ id: 'D3', code: 'Forward Saddle', terrain: 'plain', role: 'maneuver', regionLabel: 'Forward Saddle', features: ['forward_supply', 'road_junction'], landmarks: ['Forward Saddle'], notes: '중앙 전방 안부. 지휘/보급 중계에 적합하다.', friendlySummary: '야전사령부 및 중간 보급 지점', owner: 'player', reportSummary: '아군 보급 거점' }),
    sharedSector({ id: 'D4', code: 'East Slope Road', terrain: 'plain', role: 'maneuver', regionLabel: 'East Slope Road', features: ['road_axis', 'ravine_crossing'], landmarks: ['Slope Road'], notes: '동쪽 사면 도로. 이동은 빠르지만 적 관측 가능성이 높다.' }),
    sharedSector({ id: 'D5', code: 'Rear Pine HQ', terrain: 'forest', role: 'hq-cover', regionLabel: 'Rear Pine HQ', features: ['hq_cover', 'supply_cache'], landmarks: ['Rear Pine HQ'], notes: '후방 침엽수림 본부. 주 보급 거점이다.', friendlySummary: '본부 및 주 보급 거점', owner: 'player', reportSummary: '아군 보급 거점' }),
    sharedSector({ id: 'E1', code: 'South Meadow', terrain: 'plain', role: 'approach', regionLabel: 'South Meadow', features: ['approach_ground', 'rear_route'], landmarks: ['South Meadow'], notes: '남쪽 초지. 후방 접근과 재편성에 적합하다.' }),
    sharedSector({ id: 'E2', code: 'Lower East Meadow', terrain: 'plain', role: 'approach', regionLabel: 'Lower East Meadow', features: ['approach_ground', 'stream_edge'], landmarks: ['Lower East Meadow'], notes: '동남쪽 낮은 초지. 도로와 계곡 사이 완충 지대.' }),
    sharedSector({ id: 'E3', code: 'Old Quarry Ridge', terrain: 'ridge', role: 'observation', elevation: { min: 460, max: 620 }, regionLabel: 'Old Quarry Ridge', features: ['high_ground', 'quarry_slope'], landmarks: ['Old Quarry'], notes: '남서쪽 채석장 고지. 후방 도로를 관측한다.' }),
    sharedSector({ id: 'E4', code: 'Rear Saddle', terrain: 'plain', role: 'support', regionLabel: 'Rear Saddle', features: ['support_area', 'rear_route'], landmarks: ['Rear Saddle'], notes: '남중앙 후방 안부. 지원과 재보급에 쓴다.' }),
    sharedSector({ id: 'E5', code: 'East Exit Road', terrain: 'plain', role: 'support', regionLabel: 'East Exit Road', features: ['support_area', 'road_exit'], landmarks: ['East Exit Road'], notes: '동남쪽 도로 출구. 적 포병 관측이 의심된다.' })
  ]
});
