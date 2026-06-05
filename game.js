const TERRAIN = {
  plain: { label: "평지", symbol: ".", move: 1, vision: 0 },
  forest: { label: "숲", symbol: "T", move: 2, vision: -1 },
  ridge: { label: "고지대", symbol: "^", move: 2, vision: 2 },
  valley: { label: "계곡", symbol: "V", move: 1, vision: -2 },
  river: { label: "강", symbol: "~", move: 2, vision: 0 },
  swamp: { label: "늪", symbol: "M", move: 3, vision: -1 }
};

const UNIT_TYPES = {
  recon: {
    label: "정찰병",
    role: "정찰",
    food: 12,
    vision: 4,
    comm: 4,
    maxHealth: 60,
    attackMin: 4,
    attackMax: 7,
    ammo: 0
  },
  infantry: {
    label: "보병",
    role: "점령",
    food: 14,
    vision: 2,
    comm: 3,
    maxHealth: 100,
    attackMin: 6,
    attackMax: 9,
    ammo: 0
  },
  artillery: {
    label: "포병",
    role: "화력",
    food: 10,
    vision: 1,
    comm: 3,
    maxHealth: 80,
    attackMin: 10,
    attackMax: 14,
    ammo: 6
  }
};

const SECTOR_CODES = [
  "Charlie", "Lima", "Foxtrot", "Delta", "Echo", "Bravo",
  "Kilo", "Hotel", "Oscar", "Juliet", "Sierra", "Tango"
];

const state = {
  seed: Math.floor(Math.random() * 999999),
  minutes: 0,
  paused: false,
  speed: 1,
  selectedSectorId: null,
  alerts: [],
  operations: [],
  sectors: [],
  units: []
};

function seededRandom() {
  state.seed |= 0;
  state.seed = (state.seed + 0x6D2B79F5) | 0;
  let t = Math.imul(state.seed ^ (state.seed >>> 15), 1 | state.seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function pick(arr) {
  return arr[Math.floor(seededRandom() * arr.length)];
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatTime(minutes) {
  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;
  return `${pad(hh)}:${pad(mm)}`;
}

function addAlert(source, title, body, sectorId = null) {
  const item = {
    time: state.minutes,
    source,
    title,
    body,
    sectorId,
    seen: false
  };
  state.alerts.unshift(item);
  state.alerts = state.alerts.slice(0, 18);
  renderAll();
}

function addOperation(name, status, body, meta = "") {
  state.operations.unshift({
    name,
    status,
    body,
    meta
  });
  state.operations = state.operations.slice(0, 12);
}

function createSector(id, code, features) {
  return {
    id,
    code,
    features,
    controlledByPlayer: false,
    alert: false,
    recentSummary: "미탐색",
    recentEnemy: null,
    recentFriendly: null,
    visibility: "unknown",
    units: [],
    notes: []
  };
}

function generateSectors() {
  const featureSets = [
    ["plain"],
    ["forest"],
    ["ridge"],
    ["valley"],
    ["river"],
    ["swamp"],
    ["plain", "forest"],
    ["plain", "ridge"],
    ["valley", "forest"],
    ["ridge", "river"],
    ["swamp", "plain"],
    ["forest", "river"]
  ];

  const sectors = [];
  for (let i = 0; i < 12; i++) {
    const code = `${pick(SECTOR_CODES)} ${String.fromCharCode(65 + i)}`;
    const features = pick(featureSets).slice();
    sectors.push(createSector(`S${i + 1}`, code, features));
  }

  sectors[0].controlledByPlayer = true;
  sectors[0].recentSummary = "지휘소";
  sectors[0].visibility = "visible";

  sectors[2].recentEnemy = { class: "B", size: 40, type: "infantry" };
  sectors[2].recentSummary = "적 보병 관측";
  sectors[2].alert = true;

  sectors[7].recentEnemy = { class: "A", size: 12, type: "artillery" };
  sectors[7].recentSummary = "적 포병 관측";
  sectors[7].alert = true;

  sectors[4].controlledByPlayer = true;
  sectors[4].recentSummary = "아군 보급 거점";
  sectors[4].visibility = "visible";

  return sectors;
}

function createUnit(typeKey, name, sectorId, level = 1, command = "") {
  const t = UNIT_TYPES[typeKey];
  return {
    id: `U_${Math.random().toString(36).slice(2, 8)}`,
    typeKey,
    name,
    sectorId,
    level,
    health: t.maxHealth,
    food: t.food,
    ammo: t.ammo,
    command,
    status: "active",
    moveBuffer: 0,
    reportCooldown: 0,
    origin: sectorId,
    lastKnownSector: sectorId
  };
}

function init() {
  state.sectors = generateSectors();
  state.units = [
    createUnit("recon", "Alpha Recon", "S1", 2, "고지 정찰 후 복귀"),
    createUnit("recon", "Delta Recon", "S6", 3, "전진 정찰"),
    createUnit("infantry", "Bravo Infantry", "S3", 1, "거점 방어"),
    createUnit("artillery", "Charlie Battery", "S3", 1, "관측시 포격")
  ];

  syncUnitsToSectors();

  state.selectedSectorId = state.sectors[0].id;

  addAlert("HQ", "작전 개시", "정찰, 통신, 보급 상태를 유지하라.");
  addAlert("Intel", "초기 관측", "Charlie C에서 적 보병 40 (Class B) 마지막 확인.");
  addOperation(
    "Recon Forward",
    "진행중",
    "Alpha Recon\n목표: 고지 정찰 후 복귀\n규모: 2명\n식량: 12\n통신: 양호",
    "정찰"
  );
  addOperation(
    "Battery Support",
    "대기",
    "Charlie Battery\n목표: 관측시 포격\n탄약: 6\n식량: 10",
    "화력 지원"
  );

  renderAll();
}

function syncUnitsToSectors() {
  for (const sector of state.sectors) sector.units = [];
  for (const unit of state.units) {
    const sector = state.sectors.find(s => s.id === unit.sectorId);
    if (sector) sector.units.push(unit.id);
  }
}

function getSector(id) {
  return state.sectors.find(s => s.id === id);
}

function getUnit(id) {
  return state.units.find(u => u.id === id);
}

function getUnitType(unit) {
  return UNIT_TYPES[unit.typeKey];
}

function sectorDisplayLabel(sector) {
  const terrain = sector.features.map(f => TERRAIN[f].label).join(" + ");
  return `${sector.code} / ${terrain}`;
}

function sizeClass(n) {
  if (n >= 100) return "battalion";
  if (n >= 40) return "company";
  if (n >= 20) return "platoon";
  if (n >= 8) return "section";
  return "small";
}

function updateSectorVisibility(sector, unit) {
  sector.visibility = "visible";
  sector.controlledByPlayer = true;
  sector.recentFriendly = {
    name: unit.name,
    count: 1,
    status: unit.status
  };
}

function reportEnemy(sector, unit) {
  const enemy = sector.recentEnemy;
  if (!enemy) return;

  sector.alert = true;
  sector.visibility = "visible";

  addAlert(
    unit.name,
    "정찰 결과",
    `${sector.code}\nEnemy ${enemy.type}\n${enemy.size} (${sizeClass(enemy.size)})\nClass ${enemy.class}`
  );
}

function nearestSupplySector(fromSectorId) {
  const supplyIds = state.sectors
    .filter(s => s.controlledByPlayer || s.recentSummary === "아군 보급 거점")
    .map(s => s.id);

  if (!supplyIds.length) return null;

  const startIdx = state.sectors.findIndex(s => s.id === fromSectorId);
  let best = null;

  for (const id of supplyIds) {
    const idx = state.sectors.findIndex(s => s.id === id);
    const dist = Math.abs(idx - startIdx);
    if (!best || dist < best.dist) best = { id, dist };
  }

  return best?.id ?? null;
}

function moveUnitTowards(unit, targetSectorId) {
  const currentIdx = state.sectors.findIndex(s => s.id === unit.sectorId);
  const targetIdx = state.sectors.findIndex(s => s.id === targetSectorId);
  if (currentIdx < 0 || targetIdx < 0 || currentIdx === targetIdx) return;

  const step = targetIdx > currentIdx ? 1 : -1;
  const nextSector = state.sectors[currentIdx + step];
  if (!nextSector) return;

  unit.moveBuffer += 1;
  const terrainCost = nextSector.features.reduce((sum, f) => sum + TERRAIN[f].move, 0) / nextSector.features.length;

  if (unit.moveBuffer >= terrainCost) {
    const from = getSector(unit.sectorId);
    if (from) {
      from.units = from.units.filter(id => id !== unit.id);
    }

    unit.sectorId = nextSector.id;
    unit.lastKnownSector = nextSector.id;
    unit.moveBuffer = 0;
    nextSector.units.push(unit.id);

    if (unit.typeKey === "recon") {
      updateSectorVisibility(nextSector, unit);
      nextSector.recentSummary = `${unit.name} 정찰`;
    }
  }
}

function consumeResources(unit, sector) {
  const terrainPenalty = sector.features.reduce((sum, f) => sum + (TERRAIN[f].move - 1), 0);
  const foodUse = unit.typeKey === "artillery" ? 0.14 : unit.typeKey === "recon" ? 0.11 : 0.09;
  unit.food = clamp(unit.food - (foodUse + terrainPenalty * 0.04), 0, 100);

  if (unit.typeKey === "artillery" && unit.ammo > 0 && state.minutes % 9 === 0) {
    unit.ammo = clamp(unit.ammo - 1, 0, 99);
  }
}

function unitPowerRange(unit) {
  const t = getUnitType(unit);
  const healthFactor = unit.health / t.maxHealth;
  const low = Math.max(1, Math.round(t.attackMin * healthFactor));
  const high = Math.max(low, Math.round(t.attackMax * healthFactor));
  return { low, high };
}

function resolveCombat(attacker, defender, sector) {
  const atk = unitPowerRange(attacker);
  const def = unitPowerRange(defender);

  const attackRoll = atk.low + Math.floor(seededRandom() * (atk.high - atk.low + 1));
  const defendRoll = def.low + Math.floor(seededRandom() * (def.high - def.low + 1));

  const defenderLoss = Math.max(0, attackRoll - Math.floor(defendRoll * 0.35));
  const attackerLoss = Math.max(0, defendRoll - Math.floor(attackRoll * 0.25));

  defender.health = clamp(defender.health - defenderLoss, 0, getUnitType(defender).maxHealth);
  attacker.health = clamp(attacker.health - attackerLoss, 0, getUnitType(attacker).maxHealth);

  addAlert(
    "Combat",
    `교전: ${sector.code}`,
    `${attacker.name} (${attackRoll}) vs ${defender.name} (${defendRoll})\n아군 피해: ${attackerLoss}\n적 피해: ${defenderLoss}`,
    sector.id
  );

  if (defender.health <= 0) {
    addAlert("Combat", "적 부대 붕괴", `${defender.name}가 ${sector.code}에서 붕괴했다.`, sector.id);
    sector.recentEnemy = null;
    sector.alert = false;
  }

  if (attacker.health <= 0) {
    addAlert("Combat", "아군 손실", `${attacker.name}가 ${sector.code}에서 손실되었다.`, sector.id);
  }
}

function maybeReconReport(unit, sector) {
  if (unit.reportCooldown > 0) {
    unit.reportCooldown -= 1;
    return;
  }

  if (unit.typeKey !== "recon") return;

  if (sector.recentEnemy) {
    reportEnemy(sector, unit);
    unit.reportCooldown = 10;
    addOperation(
      unit.name,
      "정찰중",
      `${unit.name}\n위치: ${sector.code}\n식량: ${Math.round(unit.food)}\n명령: ${unit.command || "정찰"}\n정보등급: ${sector.recentEnemy.class}\n병력: ${sector.recentEnemy.size} (${sizeClass(sector.recentEnemy.size)})`,
      "정찰"
    );
  } else if (seededRandom() < 0.08) {
    addAlert(unit.name, "정찰 결과", `${sector.code}\n가시한 적 없음.\nClass C`, sector.id);
    unit.reportCooldown = 10;
  }
}

function unitIsConnected(unit) {
  const originIdx = state.sectors.findIndex(s => s.id === unit.origin);
  const currentIdx = state.sectors.findIndex(s => s.id === unit.sectorId);
  const distance = Math.abs(currentIdx - originIdx);
  const commRange = getUnitType(unit).comm + Math.max(0, unit.level - 1);
  return distance <= commRange;
}

function advanceUnit(unit) {
  if (unit.health <= 0) {
    unit.status = "dead";
    return;
  }

  const sector = getSector(unit.sectorId);
  if (!sector) return;

  consumeResources(unit, sector);

  if (unit.food <= 0) {
    unit.status = "returning";
  }

  const connected = unitIsConnected(unit);

  if (unit.typeKey === "recon") {
    if (connected && unit.status !== "returning") {
      maybeReconReport(unit, sector);
      if (unit.command.includes("정찰")) {
        // Probe forward with a small chance.
        const idx = state.sectors.findIndex(s => s.id === unit.sectorId);
        const next = state.sectors[Math.min(state.sectors.length - 1, idx + 1 + Math.floor(seededRandom() * 2))];
        if (next && next.id !== unit.sectorId) {
          moveUnitTowards(unit, next.id);
        }
      }
    } else {
      const fallback = nearestSupplySector(unit.sectorId) || unit.origin;
      if (fallback && fallback !== unit.sectorId) {
        moveUnitTowards(unit, fallback);
      }
    }
  }

  if (unit.typeKey === "infantry") {
    if (sector.recentEnemy && seededRandom() < 0.08) {
      sector.recentEnemy.size = Math.max(0, sector.recentEnemy.size - 1);
      if (sector.recentEnemy.size === 0) {
        sector.recentEnemy = null;
        sector.alert = false;
        addAlert(unit.name, "지역 안정화", `${sector.code}\n적 접촉이 해소되었다.`, sector.id);
      }
    }
  }

  if (unit.typeKey === "artillery") {
    if (sector.recentEnemy && unit.ammo > 0 && seededRandom() < 0.15) {
      const splash = 3 + Math.floor(seededRandom() * 5);
      unit.ammo = clamp(unit.ammo - 1, 0, 99);
      sector.recentEnemy.size = Math.max(0, sector.recentEnemy.size - splash);
      addAlert(unit.name, "포격", `${sector.code}\n적 목표 타격\n피해 추정: ${splash}`, sector.id);

      if (sector.recentEnemy.size === 0) {
        sector.recentEnemy = null;
        sector.alert = false;
      }
    }
  }

  // Light combat chance if hostile sector exists.
  if (sector.recentEnemy && unit.typeKey !== "artillery" && seededRandom() < 0.06) {
    const dummyEnemy = {
      name: `Enemy ${sector.recentEnemy.type}`,
      typeKey: sector.recentEnemy.type === "artillery" ? "artillery" : "infantry",
      health: 70,
      food: 100,
      ammo: 0
    };
    resolveCombat(unit, dummyEnemy, sector);
  }

  // If exhausted, drift back.
  if (unit.status === "returning") {
    const target = nearestSupplySector(unit.sectorId) || unit.origin;
    if (target && target !== unit.sectorId) {
      moveUnitTowards(unit, target);
    } else {
      unit.food = Math.max(unit.food, 6);
      if (unit.typeKey === "artillery") unit.ammo = UNIT_TYPES.artillery.ammo;
      unit.status = "active";
      addAlert("HQ", "복귀", `${unit.name}가 보급 거점에 도착했다.`, sector.id);
    }
  }
}

function tick() {
  if (state.paused) return;

  for (const unit of state.units) {
    advanceUnit(unit);
  }

  syncUnitsToSectors();
  state.minutes += 1;

  if (state.minutes % 15 === 0) {
    const front = state.sectors.find(s => s.recentEnemy);
    if (front) {
      addAlert("HQ", "상황 갱신", `${front.code}\n적 전력 잔존: ${front.recentEnemy.size} (${front.recentEnemy.class})`, front.id);
    }
  }

  renderAll();
}

function unitSummary(unit) {
  const t = getUnitType(unit);
  return `${t.label} ${Math.round(unit.health)} / F ${Math.round(unit.food)}`;
}

function sectorLightText(sector) {
  if (sector.recentEnemy) {
    return `${sector.recentEnemy.type} ${sector.recentEnemy.size}명 정찰중`;
  }

  const friendly = sector.units
    .map(id => getUnit(id))
    .filter(Boolean)
    .map(unit => {
      const t = getUnitType(unit);
      return `${t.label} ${Math.max(1, Math.round(unit.health / 10))}명 ${unit.status === "returning" ? "복귀중" : "정찰중"}`;
    });

  if (friendly.length) return friendly[0];
  return sector.controlledByPlayer ? "아군 영향권" : "미확인";
}

function renderMap() {
  const map = document.getElementById("map");
  map.innerHTML = "";

  for (const sector of state.sectors) {
    const el = document.createElement("div");
    el.className = "sector" + (sector.id === state.selectedSectorId ? " selected" : "") + (sector.alert ? " alert" : "");
    const terrain = sector.features.map(f => TERRAIN[f].label).join(" + ");
    const units = sector.units
      .map(id => getUnit(id))
      .filter(Boolean);

    el.innerHTML = `
      <div class="sectorTop">
        <div class="sectorName">${sector.code}</div>
        <div class="terrainTag">${sector.features[0].toUpperCase()}</div>
      </div>

      <div class="sectorMeta">${sectorDisplayLabel(sector)}</div>
      <div class="statusLine">상태: ${sector.recentEnemy ? "교전 가능" : sector.controlledByPlayer ? "아군 영향권" : "미확인"}</div>
      <div class="lightOverlay">${sectorLightText(sector)}</div>

      <div class="unitStrip">
        ${units.slice(0, 2).map(u => {
          const t = getUnitType(u);
          return `
            <div class="unitChip">
              <span class="name">${u.name}</span>
              <span class="meta">${t.label} · HP ${Math.max(0, Math.round(u.health))} / F ${Math.round(u.food)}</span>
            </div>
          `;
        }).join("") || '<div class="statusLine">주둔 유닛 없음</div>'}
      </div>

      ${sector.alert ? '<div class="alertPin">🔴</div>' : ""}
    `;

    el.addEventListener("click", () => {
      state.selectedSectorId = sector.id;
      renderAll();
    });

    map.appendChild(el);
  }
}

function renderAlerts() {
  const alerts = document.getElementById("alerts");
  alerts.innerHTML = "";

  state.alerts.slice(0, 10).forEach((alert, idx) => {
    const card = document.createElement("div");
    card.className = "alertCard";
    card.innerHTML = `
      <div class="time">${formatTime(alert.time)} · ${alert.title}</div>
      <div class="source">From: ${alert.source}</div>
      <div class="body">${escapeHtml(alert.body)}</div>
    `;
    card.addEventListener("click", () => {
      if (alert.sectorId) {
        state.selectedSectorId = alert.sectorId;
        renderAll();
      }
    });
    alerts.appendChild(card);
  });
}

function renderDetails() {
  const box = document.getElementById("sectorDetails");
  const sector = getSector(state.selectedSectorId) || state.sectors[0];

  if (!sector) {
    box.textContent = "지역을 선택하면 작전 정보가 표시된다.";
    return;
  }

  const friendlyUnits = sector.units.map(getUnit).filter(Boolean);

  box.innerHTML = `
    <div class="row"><span class="label">구역명</span><span class="value">${sector.code}</span></div>
    <div class="row"><span class="label">지형</span><span class="value">${sector.features.map(f => TERRAIN[f].label).join(" / ")}</span></div>
    <div class="row"><span class="label">상태</span><span class="value">${sector.recentEnemy ? "교전 위험" : sector.controlledByPlayer ? "아군 영향권" : "미확인"}</span></div>
    <div class="row"><span class="label">적 보고</span><span class="value">${sector.recentEnemy ? `${sector.recentEnemy.size} (${sector.recentEnemy.class})` : "없음"}</span></div>
    <div class="row"><span class="label">아군 유닛</span><span class="value">${friendlyUnits.length ? friendlyUnits.map(u => `${u.name} / ${getUnitType(u).label}`).join("<br>") : "없음"}</span></div>
    <div class="row"><span class="label">최근 보고</span><span class="value">${escapeHtml(sector.recentSummary || "-")}</span></div>
    <div class="small">※ 메인 맵에서는 숫자를 최소화하고, 상세 수치는 작전판에서 본다.</div>
  `;
}

function renderOperations() {
  document.getElementById("opReportCount").textContent = String(state.alerts.length);
  document.getElementById("opUnitCount").textContent = String(state.units.filter(u => u.health > 0).length);
  document.getElementById("opState").textContent = state.paused ? "Paused" : "Running";
  document.getElementById("opTime").textContent = formatTime(state.minutes);

  const list = document.getElementById("operationsList");
  list.innerHTML = "";

  state.operations.forEach(op => {
    const card = document.createElement("div");
    card.className = "operationCard";
    card.innerHTML = `
      <div class="head">
        <div>
          <div class="name">${escapeHtml(op.name)}</div>
          <div class="status">${escapeHtml(op.status)}</div>
        </div>
        <div class="status">${escapeHtml(op.meta)}</div>
      </div>
      <div class="body">${escapeHtml(op.body)}</div>
      <div class="footer">모든 수치 정보는 여기서 확인 가능</div>
    `;
    list.appendChild(card);
  });
}

function renderAll() {
  renderMap();
  renderAlerts();
  renderDetails();
  renderOperations();

  document.getElementById("pauseBtn").textContent = state.paused ? "Resume" : "Pause";

  document.querySelectorAll(".speedBtn").forEach(btn => {
    btn.classList.toggle("active", Number(btn.dataset.speed) === state.speed);
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.getElementById("pauseBtn").addEventListener("click", () => {
  state.paused = !state.paused;
  renderAll();
});

document.querySelectorAll(".speedBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    state.speed = Number(btn.dataset.speed);
    renderAll();
  });
});

document.getElementById("operationsBtn").addEventListener("click", () => {
  document.getElementById("operationsModal").classList.remove("hidden");
});

document.getElementById("closeOperations").addEventListener("click", () => {
  document.getElementById("operationsModal").classList.add("hidden");
});

document.getElementById("operationsModal").addEventListener("click", (e) => {
  if (e.target.id === "operationsModal") {
    e.currentTarget.classList.add("hidden");
  }
});

init();

let lastFrame = performance.now();
function loop(now) {
  const step = 700 / state.speed;
  const elapsed = now - lastFrame;

  if (!state.paused && elapsed >= step) {
    const ticks = Math.max(1, Math.floor(elapsed / step));
    for (let i = 0; i < ticks; i++) tick();
    lastFrame = now;
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
