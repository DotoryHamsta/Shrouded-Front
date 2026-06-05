Shrouded Front Design Document

Version: 0.1

⸻

Golden Rules

이 게임의 모든 시스템은 아래 원칙을 따라야 한다.

1. 플레이어는 신이 아니다.
2. 플레이어는 전장을 직접 보지 못한다.
3. 정보는 불완전하며 지연된다.
4. 정찰은 시야 확보가 아니라 정보 수집이다.
5. 유닛은 소모품이 아니다.
6. 전멸보다 철수가 흔하다.
7. 플레이어는 병사가 아니라 사령관이다.
8. 반사신경이 아니라 판단력이 중요하다.

⸻

High Concept

Shrouded Front는 정보, 통신, 정찰을 중심으로 한 작전 지휘 게임이다.

플레이어는 제한된 병력을 가진 원정군 사령관이다.

플레이어는 전장을 직접 보는 것이 아니라, 보고서와 통신을 통해 간접적으로 전장을 이해한다.

⸻

Core Gameplay Loop

1. 정찰대를 파견한다.
2. 정보를 수집한다.
3. 보고를 받는다.
4. 상황을 판단한다.
5. 명령을 내린다.
6. 병력을 이동시킨다.
7. 교전이 발생한다.
8. 보급 및 재편성을 수행한다.
9. 다음 작전을 계획한다.

⸻

Game Scope

이 게임은 대전략 게임이 아니다.

포함하지 않는 것:

* 외교
* 경제
* 정치
* 연구트리
* 도시 건설
* 국가 운영

플레이어 역할:

원정군 사령관

⸻

Setting

기술 수준:

1945~1985 수준

가능:

* 무전
* 포병
* 차량
* 정찰대

불가능:

* 위성
* GPS
* 실시간 데이터 링크

실존 국가 사용 안 함.

냉전기/중동전쟁 분위기의 가상 세계 사용.

⸻

Time System

실시간 진행.

지원:

* Pause
* 0.5x
* 1x
* 2x
* 4x

플레이어는 언제든 일시정지 가능.

⸻

Information Philosophy

중요:

보는 것과 아는 것은 다르다.

예시:

정찰병이 적을 발견했다.

↓

플레이어가 즉시 아는 것이 아니다.

↓

통신 또는 복귀 후 정보 전달.

⸻

Recon Philosophy

정찰은 시야 확보가 아니다.

정찰은 정보 수집 과정이다.

⸻

Recon Progress

정찰 진행도 개념 사용.

예시:

Forest D 진입

0%

↓

20%

↓

40%

↓

80%

↓

100%

100%에 가까울수록 정보 품질 상승.

⸻

Information Classes

Class A

거의 확실

⸻

Class B

유력

⸻

Class C

추정

⸻

Class D

불명확

⸻

Class는 숫자의 오차가 아니라 정보 품질을 의미한다.

⸻

Reports

예시:

13:42

Alpha Recon

North Bridge

Enemy Infantry

43 (Platoon)

Class B

⸻

플레이어는 보고서를 통해 상황을 이해한다.

⸻

Map Philosophy

맵은 타일맵이 아니다.

맵은 작전구역(Sector) 기반이다.

⸻

Region Types

Valley

계곡

⸻

Ridge

고지대

⸻

Plain

평야

⸻

Forest

숲

⸻

River

강

⸻

Swamp

늪

⸻

Current Prototype Map

Valley A

계곡

강 상류

⸻

Ridge A

고지대

관측 우세

랜드마크:

Hill 203

⸻

Ridge B

고지대

장거리 관측 가능

⸻

Valley B

계곡

랜드마크:

North Bridge

⸻

Plain C

중앙 평야

주 교전 예상 지역

⸻

Forest D

숲

은폐 우세

강 하류

⸻

Landmarks

랜드마크는 구역 내부의 중요한 위치다.

예시:

* Hill 203
* North Bridge
* Forest Camp
* Observation Post

⸻

보고서는 가능하면 랜드마크 기준으로 작성한다.

예시:

North Bridge 인근

Enemy Infantry 발견

⸻

Vision System

일반 전략게임처럼 넓은 시야를 제공하지 않는다.

정찰병이 지역에 있다고 해서 지역 전체를 즉시 파악하지 못한다.

⸻

Communication System

플레이어는 통신망을 통해 정보를 얻는다.

통신 두절 상태:

* 신규 정보 수신 불가
* 신규 명령 전달 불가

⸻

기존 명령은 계속 수행.

⸻

Supply System

보급선 시뮬레이터가 아니다.

작전반경 시스템 사용.

⸻

Food

모든 유닛은 식량을 가진다.

식량은 이동 및 작전 수행 중 감소.

⸻

Supply Sources

재보급 가능 위치:

* HQ
* 전진기지
* 보급기지

⸻

복귀는 출발지일 필요 없다.

가장 가까운 보급거점 가능.

⸻

Food States

Normal

정상 작전

⸻

Hungry

식량 부족

패널티:

* 이동 감소
* 시야 감소

⸻

Exhausted

식량 고갈

패널티:

* 전투력 급감
* 적극적 명령 거부
* 자동 복귀

⸻

Units

현재 MVP

* 정찰병
* 보병
* 포병

⸻

Recon

역할:

정보 수집

⸻

특징:

높은 이동력

높은 관측력

낮은 전투력

⸻

Infantry

역할:

거점 확보

전선 유지

⸻

Artillery

역할:

간접 화력

⸻

포격 조건:

적 위치 정보 필요

⸻

Level System

레벨은 전투력이 아니다.

레벨은 전문성이다.

⸻

Lv1

단순 명령 수행

⸻

Lv2

순찰

정찰

가능

⸻

Lv3

조건부 명령 가능

⸻

Lv4

복합 작전 수행

⸻

Lv5

스크립트 수준 명령 수행

⸻

Combat Philosophy

전투는 즉시 결정되지 않는다.

⸻

Firepower Model

병력 감소

↓

화력 감소

↓

전투력 감소

⸻

Combat Resolution

공격력 범위 사용.

예시:

5~8

⸻

매 공격마다 범위 내 랜덤값 사용.

⸻

Retreat System

전멸은 드물다.

철수는 흔하다.

⸻

상태:

정상

↓

압박

↓

위태

↓

붕괴

↓

패주

⸻

Doctrine

유닛별 교전 교리 설정 가능.

예시:

신중

표준

결사항전

⸻

Veteran Preservation

베테랑 유닛은 중요 자산이다.

신규 유닛 생산은 느리다.

유닛은 가능한 생존시키는 것이 바람직하다.

⸻

UI Philosophy

메인 화면:

전술 지도

⸻

메인 화면에서는 최소 정보만 표시.

예시:

정찰병 5명

정찰중

⸻

세부 수치는 숨김.

⸻

Alerts

신규 보고 발생 시:

* 빨간 핀
* 빨간 테두리

사용.

⸻

Operations Board

작전판은 별도 화면.

작전판에서는 모든 정보 공개.

예시:

* 식량
* 탄약
* 체력
* 명령
* 통신상태

⸻

Future Features

후보:

* 통신 중계소
* 공군
* 드론
* 기갑부대
* 야간작전
* 기상 시스템

⸻

Non Goals

당분간 구현하지 않음.

* 경제
* 도시 건설
* 연구트리
* 외교
* 국가 운영

⸻

Current Development Priority

1. SVG 지도
2. Sector 데이터 구조
3. 보고 시스템
4. 정찰 진행도
5. 통신망
6. 보급
7. 전투
8. 작전판
