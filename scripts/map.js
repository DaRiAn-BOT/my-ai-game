"use strict";

// Интерактивная карта 15×15. Она отвечает только за исследование и не меняет ресурсы.
const MAP_SIZE = 25;
const MAP_CENTER = Math.floor(MAP_SIZE / 2);
const VISION_RADIUS = 3;
let currentBiome = "castle";
let mapCells = [];
let playerPosition = { row: MAP_CENTER, column: MAP_CENTER };
let mapIsFullscreen = false;
let localViewOrigin = { row: MAP_CENTER - 2, column: MAP_CENTER - 2 };
let mapHintOverride = "";
let playerFacing = "right";
let playerMoveTimer;
const mapThemes = Object.freeze({
    castle: "theme-citadel",
    forest: "theme-forest",
    mines: "theme-mines",
    village: "theme-village",
    ruins: "theme-ruins",
    market: "theme-market"
});
const mapThemeClasses = Object.values(mapThemes);
const keyLocationTerrains = Object.freeze({
    castle: "citadel",
    village: "townhall",
    ruins: "altar",
    mines: "mine-entrance",
    forest: "ancient-tree"
});
const keyLocationLabels = Object.freeze({
    citadel: "Ворота Цитадели",
    townhall: "Ратуша",
    altar: "Древний алтарь",
    "mine-entrance": "Главный забой",
    "ancient-tree": "Древо жизни"
});

const biomeSettings = {
    castle: { groundClass: "tile-castle", eventName: "цитадели" },
    forest: { groundClass: "tile-forest-ground", eventName: "леса" },
    mines: { groundClass: "tile-mine-ground", eventName: "шахт" },
    village: { groundClass: "tile-village", eventName: "деревни" },
    ruins: { groundClass: "tile-ruins", eventName: "руин" },
    market: { groundClass: "tile-market", eventName: "рынка" }
};

function generateMap(biomeType) {
    currentBiome = biomeSettings[biomeType] ? biomeType : "castle";
    setMapTheme(currentBiome);
    playerPosition = { row: MAP_CENTER, column: MAP_CENTER };
    playerFacing = "right";
    localViewOrigin = { row: MAP_CENTER - 2, column: MAP_CENTER - 2 };

    // Сначала создаём открытую местность, затем формируем осмысленный ландшафт.
    mapCells = Array.from({ length: MAP_SIZE }, (_, row) =>
        Array.from({ length: MAP_SIZE }, (_, column) => createCell(row, column, "ground", false))
    );
    addBiomeLandscape();
    carveWindingTrails();
    createStartingArea();
    placeMarketStalls();
    placeLocationObjects();
    placeLandmarks();
    // Финальная гарантия: в центре находится только объект, подходящий выбранной локации.
    spawnPlayerAtMapEdge();
    enforceStartingArea();
    placeSupplies();
    if (currentBiome === "market") {
        // Рынок — охраняемая открытая площадь: туман войны здесь не используется.
        mapCells.flat().forEach((cell) => cell.explored = true);
    } else {
        revealAroundPlayer();
    }

    renderMap();
    document.querySelectorAll("[data-location]").forEach((button) => {
        button.classList.toggle("selected-biome", button.dataset.location === currentBiome);
    });
    return mapCells;
}

function setMapTheme(biomeType) {
    const grid = $("map-grid");
    grid.classList.remove(...mapThemeClasses);
    grid.classList.add(mapThemes[biomeType] || mapThemes.castle);
    const eventBoard = $("event-board");
    eventBoard.classList.remove(...mapThemeClasses.map((theme) => `event-${theme}`));
    eventBoard.classList.add(`event-${mapThemes[biomeType] || mapThemes.castle}`);
    const eventModal = $("event-modal");
    eventModal.classList.remove(...mapThemeClasses);
    eventModal.classList.add(mapThemes[biomeType] || mapThemes.castle);
}

function createCell(row, column, terrain, blocked) {
    return { row, column, terrain, blocked, hasEvent: false, explored: false, mountainScale: 1, mountainShiftX: 0, mountainShiftY: 0 };
}

// Герой начинает у границы карты. Тропа гарантирует честный проходимый путь к центральному объекту.
function spawnPlayerAtMapEdge() {
    const side = Math.floor(Math.random() * 4);
    const offset = Math.floor(Math.random() * MAP_SIZE);
    const position = side === 0 ? { row: 0, column: offset }
        : side === 1 ? { row: MAP_SIZE - 1, column: offset }
            : side === 2 ? { row: offset, column: 0 }
                : { row: offset, column: MAP_SIZE - 1 };
    setTerrain(position.row, position.column, "path", false);
    carveWindingTrail(position);
    playerPosition = position;
    centerLocalViewOnPlayer();
}

function revealAroundPlayer() {
    const radius = VISION_RADIUS + (hero.class === "mage" ? 1 : 0);
    for (let row = playerPosition.row - radius; row <= playerPosition.row + radius; row += 1) {
        for (let column = playerPosition.column - radius; column <= playerPosition.column + radius; column += 1) {
            if (row < 0 || row >= MAP_SIZE || column < 0 || column >= MAP_SIZE) continue;
            if (Math.max(Math.abs(row - playerPosition.row), Math.abs(column - playerPosition.column)) <= radius) {
                mapCells[row][column].explored = true;
            }
        }
    }
}

function revealAroundCampfire(cell) {
    for (let row = cell.row - 3; row <= cell.row + 3; row += 1) {
        for (let column = cell.column - 3; column <= cell.column + 3; column += 1) {
            if (row < 0 || row >= MAP_SIZE || column < 0 || column >= MAP_SIZE) continue;
            if (Math.max(Math.abs(row - cell.row), Math.abs(column - cell.column)) <= 3) mapCells[row][column].explored = true;
        }
    }
}

function setTerrain(row, column, terrain, blocked) {
    if (row < 0 || row >= MAP_SIZE || column < 0 || column >= MAP_SIZE) return;
    Object.assign(mapCells[row][column], { terrain, blocked });
}

// На карте лежат один-два небольших запаса еды — мягкая поддержка в начале исследования.
function placeSupplies() {
    const candidates = getReachableCells().filter((cell) => {
        const distance = Math.abs(cell.row - playerPosition.row) + Math.abs(cell.column - playerPosition.column);
        return distance >= 4 && ["ground", "path", "clearing"].includes(cell.terrain);
    });
    const count = 1 + Math.floor(Math.random() * 2);
    for (let index = 0; index < count && candidates.length; index += 1) {
        const cell = candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0];
        Object.assign(cell, { terrain: "supply", supplyType: Math.random() < .5 ? "berries" : "chest", blocked: false });
    }
}

// У каждой локации свой ландшафт — без случайных одинаковых гор, лесов и замков на всех картах.
function addBiomeLandscape() {
    if (currentBiome === "mines") addMountainRanges();
    if (currentBiome === "forest") addForestClusters();
}

// Горы — отдельные извилистые гряды у окраин, а не искусственная рамка по краю карты.
function addMountainRanges() {
    const rangeCount = currentBiome === "mines" ? 6 : 4;
    for (let index = 0; index < rangeCount; index += 1) {
        const anchor = getMountainAnchor();
        const targetSize = 6 + Math.floor(Math.random() * 7);
        const range = [anchor];
        const occupied = new Set();

        for (let step = 0; step < targetSize && range.length; step += 1) {
            const source = random(range);
            const key = `${source.row}:${source.column}`;
            if (!occupied.has(key) && isMountainCandidate(source.row, source.column)) {
                placeMountain(source.row, source.column);
                occupied.add(key);
            }

            // Рост в соседние клетки даёт массивы глубиной 2–4 клетки и неровный силуэт гряды.
            [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [-1, -1]]
                .sort(() => Math.random() - .5)
                .slice(0, 3)
                .forEach(([rowOffset, columnOffset]) => {
                    const next = { row: source.row + rowOffset, column: source.column + columnOffset };
                    if (isMountainCandidate(next.row, next.column)) range.push(next);
                });
        }
    }
}

function getMountainAnchor() {
    const side = Math.floor(Math.random() * 4);
    const offset = 1 + Math.floor(Math.random() * (MAP_SIZE - 2));
    const depth = Math.floor(Math.random() * 3);
    if (side === 0) return { row: depth, column: offset };
    if (side === 1) return { row: MAP_SIZE - 1 - depth, column: offset };
    if (side === 2) return { row: offset, column: depth };
    return { row: offset, column: MAP_SIZE - 1 - depth };
}

function isMountainCandidate(row, column) {
    if (row < 0 || row >= MAP_SIZE || column < 0 || column >= MAP_SIZE) return false;
    // Центральная область всегда остаётся просторной и доступной.
    return Math.abs(row - MAP_CENTER) > 2 || Math.abs(column - MAP_CENTER) > 2;
}

function placeMountain(row, column) {
    setTerrain(row, column, "mountain", true);
    const cell = mapCells[row][column];
    cell.mountainScale = .9 + Math.random() * .2;
    cell.mountainShiftX = Math.round(-3 + Math.random() * 6);
    cell.mountainShiftY = Math.round(-2 + Math.random() * 4);
}

// Леса растут короткими плотными кластерами по 3–4 клетки, без шумовой россыпи.
function addForestClusters() {
    const clusterCount = currentBiome === "forest" ? 8 : 4;
    const shapes = [
        [[0, 0], [1, 0], [0, 1]],
        [[0, 0], [1, 0], [0, 1], [1, 1]],
        [[0, 0], [1, 0], [1, 1], [2, 1]],
        [[0, 0], [0, 1], [1, 1], [1, 2]]
    ];
    for (let index = 0; index < clusterCount; index += 1) {
        const startRow = 2 + Math.floor(Math.random() * (MAP_SIZE - 5));
        const startColumn = 2 + Math.floor(Math.random() * (MAP_SIZE - 5));
        const shape = random(shapes);
        shape.forEach(([rowOffset, columnOffset]) => setTerrain(startRow + rowOffset, startColumn + columnOffset, "forest", true));
    }
}

// Цитадель и её ближайшее окружение всегда безопасны.
function createCitadelSafeZone() {
    for (let row = MAP_CENTER - 1; row <= MAP_CENTER + 1; row += 1) {
        for (let column = MAP_CENTER - 1; column <= MAP_CENTER + 1; column += 1) setTerrain(row, column, "citadel-yard", false);
    }
    setTerrain(MAP_CENTER, MAP_CENTER, "citadel", false);
}

function createStartingClearing() {
    for (let row = MAP_CENTER - 1; row <= MAP_CENTER + 1; row += 1) {
        for (let column = MAP_CENTER - 1; column <= MAP_CENTER + 1; column += 1) setTerrain(row, column, "clearing", false);
    }
    const keyTerrain = keyLocationTerrains[currentBiome];
    if (keyTerrain) setTerrain(MAP_CENTER, MAP_CENTER, keyTerrain, false);
}

function createStartingArea() {
    if (currentBiome === "castle") createCitadelSafeZone();
    else createStartingClearing();
}

function enforceStartingArea() {
    if (currentBiome !== "castle") return createStartingClearing();
    // Финальная гарантия: ни один последующий шаг генерации не может убрать цитадель из центра.
    for (let row = MAP_CENTER - 1; row <= MAP_CENTER + 1; row += 1) {
        for (let column = MAP_CENTER - 1; column <= MAP_CENTER + 1; column += 1) {
            if (row !== MAP_CENTER || column !== MAP_CENTER) setTerrain(row, column, "citadel-yard", false);
        }
    }
    const centralCell = mapCells[MAP_CENTER][MAP_CENTER];
    Object.assign(centralCell, {
        terrain: "citadel",
        blocked: false,
        hasEvent: false,
        mountainScale: 1,
        mountainShiftX: 0,
        mountainShiftY: 0
    });
}

// Две извилистые тропинки к внешним районам заменяют искусственный прямой крест.
function carveWindingTrails() {
    const targets = [
        { row: 1, column: 2 + Math.floor(Math.random() * (MAP_SIZE - 4)) },
        { row: 2 + Math.floor(Math.random() * (MAP_SIZE - 4)), column: MAP_SIZE - 2 }
    ];
    targets.forEach(carveWindingTrail);
}

function carveWindingTrail(target) {
    let row = MAP_CENTER;
    let column = MAP_CENTER;
    let steps = 0;
    while ((row !== target.row || column !== target.column) && steps < MAP_SIZE * 4) {
        setTerrain(row, column, "path", false);
        const rowDirection = Math.sign(target.row - row);
        const columnDirection = Math.sign(target.column - column);
        const moveRowFirst = Math.random() < .58;
        if (moveRowFirst && rowDirection !== 0) row += rowDirection;
        else if (columnDirection !== 0) column += columnDirection;
        else if (rowDirection !== 0) row += rowDirection;
        // Небольшое боковое смещение создаёт естественный изгиб, не ломая маршрут.
        if (Math.random() < .24) {
            const side = Math.random() < .5 ? -1 : 1;
            if (moveRowFirst && column + side > 0 && column + side < MAP_SIZE - 1) column += side;
            if (!moveRowFirst && row + side > 0 && row + side < MAP_SIZE - 1) row += side;
        }
        steps += 1;
    }
    setTerrain(target.row, target.column, "path", false);
}

// В каждой локации есть несколько доступных тематических ориентиров для объёмной карты.
function placeLandmarks() {
    const candidates = getReachableCells().filter((cell) => {
        const distance = Math.abs(cell.row - MAP_CENTER) + Math.abs(cell.column - MAP_CENTER);
        return distance >= 4 && cell.terrain !== "path" && cell.terrain !== "stall";
    });
    for (let index = 0; index < 3 && candidates.length; index += 1) {
        const candidateIndex = Math.floor(Math.random() * candidates.length);
        const cell = candidates.splice(candidateIndex, 1)[0];
        cell.terrain = "landmark";
    }
}

function placeLocationObjects() {
    const objectTerrains = {
        ruins: "ruins-obj",
        village: "house"
    };
    const terrain = objectTerrains[currentBiome];
    if (!terrain) return;

    const candidates = getReachableCells().filter((cell) => {
        const distance = Math.abs(cell.row - MAP_CENTER) + Math.abs(cell.column - MAP_CENTER);
        return distance >= 3 && cell.terrain === "ground";
    });
    for (let index = 0; index < 4 && candidates.length; index += 1) {
        const candidateIndex = Math.floor(Math.random() * candidates.length);
        const cell = candidates.splice(candidateIndex, 1)[0];
        cell.terrain = terrain;
        cell.blocked = true;
    }
}

// Рынок всегда имеет ровно два доступных прилавка по сторонам от центральной площади.
function placeMarketStalls() {
    if (currentBiome !== "market") return;
    [MAP_CENTER - 3, MAP_CENTER + 3].forEach((column) => {
        const cell = mapCells[MAP_CENTER][column];
        Object.assign(cell, { terrain: "stall", blocked: false, hasEvent: false });
    });
}

function placeHiddenEvents() {
    const reachable = getReachableCells();
    const candidates = reachable.filter((cell) => {
        const distanceFromStart = Math.abs(cell.row - MAP_CENTER) + Math.abs(cell.column - MAP_CENTER);
        return distanceFromStart >= 3 && cell.terrain !== "stall";
    });
    // На каждой карте гарантированно спрятано восемь событий.
    for (let index = 0; index < 8 && candidates.length; index += 1) {
        const candidateIndex = Math.floor(Math.random() * candidates.length);
        candidates.splice(candidateIndex, 1)[0].hasEvent = true;
    }
}

function getReachableCells() {
    const visited = new Set();
    const queue = [{ row: MAP_CENTER, column: MAP_CENTER }];
    const reachable = [];
    while (queue.length) {
        const cell = queue.shift();
        const key = `${cell.row}:${cell.column}`;
        if (visited.has(key) || !canEnterTile(cell.row, cell.column)) continue;
        visited.add(key);
        reachable.push(mapCells[cell.row][cell.column]);
        [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([rowOffset, columnOffset]) => {
            queue.push({ row: cell.row + rowOffset, column: cell.column + columnOffset });
        });
    }
    return reachable;
}

function getVisibleCells() {
    if (mapIsFullscreen) return mapCells.flat();
    const visible = [];
    for (let row = localViewOrigin.row; row < localViewOrigin.row + 5; row += 1) {
        for (let column = localViewOrigin.column; column < localViewOrigin.column + 5; column += 1) visible.push(mapCells[row][column]);
    }
    return visible;
}

function renderMap() {
    const grid = $("map-grid");
    const playerMarker = $("map-player");
    if (playerMarker) playerMarker.remove();
    const fragment = document.createDocumentFragment();
    grid.replaceChildren();
    const visibleSize = mapIsFullscreen ? MAP_SIZE : 5;
    grid.style.gridTemplateColumns = `repeat(${visibleSize}, minmax(0, 1fr))`;
    grid.style.gridTemplateRows = `repeat(${visibleSize}, minmax(0, 1fr))`;
    grid.dataset.view = mapIsFullscreen ? "full" : "local";

    getVisibleCells().forEach((cell) => {
        const tile = document.createElement("div");
        tile.className = `map-tile ${biomeSettings[currentBiome].groundClass} tile-${cell.terrain}${cell.blocked ? " tile-obstacle" : ""}${cell.explored ? "" : " tile-fog"}`;
        tile.dataset.row = cell.row;
        tile.dataset.column = cell.column;
        if (cell.supplyType) tile.dataset.supply = cell.supplyType;
        // Нижние ряды рисуются поверх верхних: корректная глубина для 2.5D-объектов.
        tile.style.zIndex = String(cell.row + 1);
        if (cell.terrain === "mountain") {
            tile.style.setProperty("--object-scale", cell.mountainScale);
            tile.style.setProperty("--object-shift-x", `${cell.mountainShiftX}px`);
            tile.style.setProperty("--object-shift-y", `${cell.mountainShiftY}px`);
        }
        tile.setAttribute("role", "button");
        tile.setAttribute("aria-label", cell.blocked ? "Непроходимое препятствие" : `Клетка ${cell.row + 1}, ${cell.column + 1}`);
        tile.addEventListener("click", () => movePlayerTo(cell.row, cell.column));
        fragment.appendChild(tile);
    });

    grid.appendChild(fragment);
    const marker = playerMarker || document.createElement("div");
    marker.id = "map-player";
    marker.className = `player-marker player-${hero.class || "knight"}${playerFacing === "left" ? " face-left" : ""}`;
    marker.setAttribute("aria-label", "Положение игрока");
    if (!marker.childElementCount) marker.append($("player-marker-template").content.cloneNode(true));
    grid.appendChild(marker);
    drawPlayer();
}

function drawPlayer() {
    const selector = `[data-row="${playerPosition.row}"][data-column="${playerPosition.column}"]`;
    const playerTile = $("map-grid").querySelector(selector);
    const marker = $("map-player");
    if (!playerTile || !marker) return;
    const tileWidth = playerTile.offsetWidth;
    const tileHeight = playerTile.offsetHeight;
    if (tileWidth === 0 || tileHeight === 0) return;
    marker.style.width = `${tileWidth}px`;
    marker.style.height = `${tileHeight}px`;
    marker.style.left = `${playerTile.offsetLeft}px`;
    marker.style.top = `${playerTile.offsetTop}px`;
    marker.style.zIndex = String(MAP_SIZE + playerPosition.row + 1);
    updateStallProximity();
    updateKeyObjectProximity();
    updateCampfireProximity();
    updateMapInteractionHint();
}

function updateStallProximity() {
    document.querySelectorAll("#map-grid .tile-stall").forEach((stall) => {
        const row = Number(stall.dataset.row);
        const column = Number(stall.dataset.column);
        const nearby = Math.abs(row - playerPosition.row) + Math.abs(column - playerPosition.column) <= 1;
        stall.classList.toggle("tile-stall-nearby", nearby);
        stall.setAttribute("aria-label", nearby ? "Прилавок рядом — зайдите на клетку для торговли" : "Торговый прилавок");
    });
}

function updateKeyObjectProximity() {
    const terrain = keyLocationTerrains[currentBiome];
    if (!terrain) return;
    document.querySelectorAll(`#map-grid .tile-${terrain}`).forEach((object) => {
        const row = Number(object.dataset.row);
        const column = Number(object.dataset.column);
        const nearby = Math.abs(row - playerPosition.row) + Math.abs(column - playerPosition.column) <= 1;
        object.classList.toggle("tile-key-nearby", nearby);
        object.setAttribute("aria-label", nearby ? "Ключевой объект рядом — нажмите Enter" : "Ключевой объект локации");
    });
}

function updateCampfireProximity() {
    document.querySelectorAll("#map-grid .tile-campfire").forEach((campfire) => {
        const row = Number(campfire.dataset.row);
        const column = Number(campfire.dataset.column);
        const nearby = Math.abs(row - playerPosition.row) + Math.abs(column - playerPosition.column) <= 1;
        campfire.classList.toggle("tile-campfire-nearby", nearby);
        campfire.setAttribute("aria-label", nearby ? "Костёр рядом — нажмите Enter для отдыха" : "Поставленный костёр");
    });
}

function updateMapInteractionHint() {
    const hint = $("map-interaction-hint");
    const campfire = getNearbyCampfire();
    const stall = getNearbyMarketStall();
    const keyObject = getNearbyKeyObject();
    let text = mapHintOverride;
    if (!text && campfire) text = "Костёр рядом — нажмите Enter, чтобы отдохнуть и восстановить тепло.";
    else if (!text && stall) text = "Торговый прилавок рядом — нажмите Enter, чтобы открыть торговлю.";
    else if (!text && keyObject) text = `${keyLocationLabels[keyObject.terrain]}: нажмите Enter, чтобы войти / взаимодействовать.`;
    hint.textContent = text;
    hint.classList.toggle("hidden", !text);
}

function setMapHint(message) {
    mapHintOverride = message;
    updateMapInteractionHint();
}

function movePlayer(rowOffset, columnOffset) {
    const targetRow = playerPosition.row + rowOffset;
    const targetColumn = playerPosition.column + columnOffset;
    if (!canEnterTile(targetRow, targetColumn)) return false;
    playerPosition = { row: targetRow, column: targetColumn };
    mapHintOverride = "";
    mapCells[targetRow][targetColumn].explored = true;
    applyTravelCost();
    revealAroundPlayer();
    if (!mapIsFullscreen && !isInsideLocalView(targetRow, targetColumn)) {
        centerLocalViewOnPlayer();
        renderMap();
    } else {
        drawPlayer();
        updateFogTiles();
    }
    animatePlayerMovement(columnOffset);
    return true;
}

// Маркер не пересоздаётся на обычном шаге: координаты плавно меняются через CSS,
// а класс is-moving запускает короткий подскок поверх скольжения.
function animatePlayerMovement(columnOffset) {
    if (columnOffset < 0) playerFacing = "left";
    if (columnOffset > 0) playerFacing = "right";

    const marker = $("map-player");
    if (!marker) return;
    marker.classList.toggle("face-left", playerFacing === "left");
    marker.classList.remove("is-moving");
    void marker.offsetWidth; // Перезапускает анимацию при быстром последовательном движении.
    marker.classList.add("is-moving");
    clearTimeout(playerMoveTimer);
    playerMoveTimer = setTimeout(() => marker.classList.remove("is-moving"), 200);
}

function applyTravelCost() {
    if (state.food > 0) {
        // Еда тратится только на часть переходов: исследование остаётся лёгким и приятным.
        if (Math.random() < 0.5) change({ food: -1 });
    } else {
        change({ warmth: -5 });
        setMapHint("Еда закончилась: холод отнимает 5 тепла за шаг.");
    }
    updateUI();
}

function updateFogTiles() {
    document.querySelectorAll("#map-grid .map-tile").forEach((tile) => {
        const cell = mapCells[Number(tile.dataset.row)][Number(tile.dataset.column)];
        if (!cell.explored) {
            tile.classList.remove("tile-fog-clearing");
            tile.classList.add("tile-fog");
            return;
        }
        if (!tile.classList.contains("tile-fog") || tile.classList.contains("tile-fog-clearing")) return;

        // Оверлей тумана остаётся на месте до завершения анимации, затем исчезает.
        tile.classList.add("tile-fog-clearing");
        window.setTimeout(() => {
            tile.classList.remove("tile-fog", "tile-fog-clearing");
        }, 300);
    });
}

function isInsideLocalView(row, column) {
    return row >= localViewOrigin.row && row < localViewOrigin.row + 5 && column >= localViewOrigin.column && column < localViewOrigin.column + 5;
}

function centerLocalViewOnPlayer() {
    localViewOrigin = {
        row: clamp(playerPosition.row - 2, 0, MAP_SIZE - 5),
        column: clamp(playerPosition.column - 2, 0, MAP_SIZE - 5)
    };
}

function movePlayerTo(row, column) {
    if (!canAct()) return;
    const distance = Math.abs(row - playerPosition.row) + Math.abs(column - playerPosition.column);
    if (distance !== 1) {
        showToast("Можно перейти только на соседнюю клетку.");
        return;
    }
    if (!movePlayer(row - playerPosition.row, column - playerPosition.column)) {
        showToast("Путь преграждает препятствие.");
        return;
    }
    inspectCurrentCell();
}

function inspectCurrentCell() {
    if (collectSupply()) return;
    showToast("Осмотрите ключевой объект и нажмите Enter, когда подойдёте к нему.");
}

function collectSupply() {
    const cell = mapCells[playerPosition.row][playerPosition.column];
    if (cell.terrain !== "supply") return false;
    const label = cell.supplyType === "berries" ? "ягоды" : "забытый сундук";
    Object.assign(cell, { terrain: "ground", supplyType: null });
    const amount = ["forest", "mines", "village"].includes(currentBiome) ? 20 : 10;
    change({ food: amount });
    addHistory(`Найдены ${label}: +${amount} еды.`);
    updateUI();
    setMapHint(`Найдены ${label}: +${amount} еды.`);
    renderMap();
    return true;
}

function getNearbyMarketStall() {
    if (currentBiome !== "market") return null;
    return mapCells.flat().find((cell) => cell.terrain === "stall" &&
        Math.abs(cell.row - playerPosition.row) + Math.abs(cell.column - playerPosition.column) <= 1) || null;
}

function getNearbyKeyObject() {
    const terrain = keyLocationTerrains[currentBiome];
    if (!terrain) return null;
    return mapCells.flat().find((cell) => cell.terrain === terrain &&
        Math.abs(cell.row - playerPosition.row) + Math.abs(cell.column - playerPosition.column) <= 1) || null;
}

function getNearbyCampfire() {
    return mapCells.flat().find((cell) => cell.terrain === "campfire" &&
        Math.abs(cell.row - playerPosition.row) + Math.abs(cell.column - playerPosition.column) <= 1) || null;
}

function useCampfire() {
    const campfire = getNearbyCampfire();
    if (!campfire) return false;
    if (campfire.lastRestDay === state.day) {
        setMapHint("Сегодня вы уже отдыхали у этого костра.");
        return true;
    }
    campfire.lastRestDay = state.day;
    change({ warmth: 30 });
    addHistory("Отдых у костра: +30 тепла.");
    updateUI();
    setMapHint("Костёр согрел и восстановил силы: +30 тепла.");
    return true;
}

function buildCampfire() {
    if (!canAct()) return;
    const cell = mapCells[playerPosition.row][playerPosition.column];
    if (!["ground", "path", "clearing"].includes(cell.terrain)) {
        showToast("Костёр можно поставить только на пустой клетке.");
        return;
    }
    if (state.wood < 2) {
        showToast("Для костра нужно 2 дерева.");
        return;
    }
    change({ wood: -2 });
    Object.assign(cell, { terrain: "campfire", blocked: false, lastRestDay: null });
    revealAroundCampfire(cell);
    addHistory("Построен костёр: раскрыта область вокруг него.");
    updateUI();
    setMapHint("Костёр построен. Он освещает область в радиусе 3 клеток.");
    renderMap();
}

function openLocationEvent() {
    if (!getNearbyKeyObject()) return false;

    // У Очага нет случайного события: он всегда сообщает настоящий ход главного задания.
    if (currentBiome === "castle") {
        openGreatHearthEvent();
        return true;
    }

    // Реликвию можно отыскать только у главного объекта соответствующей локации.
    // Неудачная попытка открывает обычное событие биома, поэтому нельзя бесконечно
    // нажимать Enter без последствий и получать бесплатные броски.
    if (GREAT_HEARTH_RELICS[currentBiome] && !questProgress[currentBiome]) {
        if (Math.random() < 0.15) {
            collectGreatHearthRelic(currentBiome);
            const relic = GREAT_HEARTH_RELICS[currentBiome];
            showMapStoryModal(
                `Найдена реликвия: ${relic.name}`,
                `Вы находите ${relic.name}. Её свет мгновенно восстанавливает здоровье и припасы: тепло и еда восстановлены до 100%. Теперь вернитесь в Цитадель, когда соберёте все четыре реликвии.`,
                "Продолжить поиски"
            );
            return true;
        }
    }

    const skills = { castle: "charisma", forest: "strength", mines: "wisdom", village: "charisma", ruins: "wisdom" };
    const event = random(locationEvents[currentBiome]);
    if (!event) return false;
    clearEventBoard();
    showEvent(event, skills[currentBiome]);
    return true;
}

function hasAllGreatHearthRelics() {
    return Object.keys(GREAT_HEARTH_RELICS).every((biome) => questProgress[biome]);
}

function openRelicEvent(biome) {
    // Оставлено как совместимая точка входа для старых сохранений и обработчиков.
    // Получение реликвии теперь происходит только через 15% проверку в openLocationEvent.
    return false;
}

function collectGreatHearthRelic(biome) {
    if (questProgress[biome]) return;
    questProgress[biome] = true;
    state.relics = questProgress;
    // В текущей игре отдельной шкалы здоровья нет: роль выживания выполняет тепло.
    // Реликвия полностью восстанавливает его и еду, а не прибавляет значение сверх 100.
    change({ warmth: 100 - state.warmth, food: 100 - state.food });
    addHistory(`Получена реликвия: ${GREAT_HEARTH_RELICS[biome].name}.`);
    updateUI();
}

function openGreatHearthEvent() {
    const found = Object.values(questProgress).filter(Boolean).length;
    if (found < Object.keys(GREAT_HEARTH_RELICS).length) {
        showMapStoryModal("Великий Очаг", `Очаг ждёт. Собрано ${found} из 4 реликвий.`, "Продолжить поиски");
        return;
    }

    state.greatHearthLit = true;
    addHistory("Все четыре реликвии брошены в Великий Очаг. Мир спасён.");
    endGame(true, "Вы бросили реликвии в Очаг и спасли мир!");
}

// Информационные окна не тратят день: они показывают результат находки или
// подсказку по заданию и закрываются обычной кнопкой.
function showMapStoryModal(title, text, buttonText) {
    const modal = $("event-modal");
    $("event-modal-title").textContent = title;
    $("event-modal-text").textContent = text;
    const choices = $("event-modal-choices");
    choices.replaceChildren();
    const button = document.createElement("button");
    button.type = "button";
    button.className = "event-modal-choice";
    button.textContent = buttonText;
    button.addEventListener("click", () => closeAnimatedModal(modal), { once: true });
    choices.appendChild(button);
    openAnimatedModal(modal);
}

// Точка входа для Enter: магазин открывается на прилавке или на соседней клетке.
function openShopModal() {
    if (!getNearbyMarketStall()) return false;
    openAnimatedModal($("shop-modal"));
    return true;
}

function closeShopModal() {
    closeAnimatedModal($("shop-modal"));
}

function switchShopTab(tab) {
    document.querySelectorAll("[data-shop-tab]").forEach((button) => button.classList.toggle("active", button.dataset.shopTab === tab));
    document.querySelectorAll("[data-shop-panel]").forEach((panel) => {
        const isActive = panel.dataset.shopPanel === tab;
        panel.classList.toggle("hidden", !isActive);
        panel.classList.remove("active-tab");
        if (isActive) {
            void panel.offsetWidth;
            panel.classList.add("active-tab");
        }
    });
}

const shopTransactions = Object.freeze({
    "buy-food": { cost: { gold: 12 }, gain: { food: 15 }, text: "Куплено 15 еды за 12 золота." },
    "buy-wood": { cost: { gold: 15 }, gain: { wood: 2 }, text: "Куплено 2 дерева за 15 золота." },
    "buy-walls": { cost: { gold: 20 }, gain: { walls: 10 }, text: "Стены укреплены на 10 за 20 золота." },
    "sell-food": { cost: { food: 10 }, gain: { gold: 8 }, text: "Продано 10 еды за 8 золота." },
    "sell-wood": { cost: { wood: 2 }, gain: { gold: 9 }, text: "Продано 2 дерева за 9 золота." },
    "sell-coal": { cost: { coal: 2 }, gain: { gold: 10 }, text: "Продано 2 угля за 10 золота." },
    "wood-for-coal": { cost: { wood: 3 }, gain: { coal: 2 }, text: "Обменяно 3 дерева на 2 угля." },
    "coal-for-wood": { cost: { coal: 2 }, gain: { wood: 2 }, text: "Обменяно 2 угля на 2 дерева." }
});

function executeShopTransaction(actionName) {
    const transaction = shopTransactions[actionName];
    if (!transaction) return;
    const enough = Object.entries(transaction.cost).every(([resource, amount]) => state[resource] >= amount);
    if (!enough) {
        showToast("Недостаточно ресурсов для этой сделки.");
        return;
    }
    change(Object.fromEntries(Object.entries(transaction.cost).map(([resource, amount]) => [resource, -amount])));
    change(transaction.gain);
    addHistory(`Рынок: ${transaction.text}`);
    updateUI();
    showToast(transaction.text);
}

function canEnterTile(row, column) {
    const insideMap = row >= 0 && row < MAP_SIZE && column >= 0 && column < MAP_SIZE;
    return insideMap && !mapCells[row][column].blocked;
}

function toggleMapFullscreen() {
    const wrapper = $("exploration-wrapper");
    mapIsFullscreen = wrapper.classList.toggle("fullscreen-mode");
    document.body.classList.toggle("map-fullscreen-open", mapIsFullscreen);
    $("fullscreen-map").textContent = mapIsFullscreen ? "✕ Свернуть карту" : "⛶ На весь экран";
    renderMap();
}

function handleMapKeyboard(event) {
    if ($("game-screen").classList.contains("hidden")) return;
    if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;

    if (event.code === "Escape" && !$("shop-modal").classList.contains("hidden")) {
        event.preventDefault();
        closeShopModal();
        return;
    }

    const movements = {
        ArrowUp: [-1, 0], KeyW: [-1, 0],
        ArrowDown: [1, 0], KeyS: [1, 0],
        ArrowLeft: [0, -1], KeyA: [0, -1],
        ArrowRight: [0, 1], KeyD: [0, 1]
    };
    if (event.code === "Escape" && mapIsFullscreen) {
        toggleMapFullscreen();
        return;
    }
    if (event.code === "Enter") {
        event.preventDefault();
        if (!canAct()) return;
        if (useCampfire() || openShopModal() || openLocationEvent()) return;
        showToast("Подойдите к ключевому объекту локации, чтобы начать событие.");
        return;
    }
    if (event.code === "KeyC") {
        event.preventDefault();
        buildCampfire();
        return;
    }
    const movement = movements[event.code];
    if (!movement) return;
    event.preventDefault();
    if (!canAct()) return;
    if (!movePlayer(...movement)) {
        showToast("Туда пройти нельзя.");
        return;
    }
    inspectCurrentCell();
}

$("fullscreen-map").addEventListener("click", toggleMapFullscreen);
$("shop-close").addEventListener("click", closeShopModal);
$("shop-close-bottom").addEventListener("click", closeShopModal);
document.querySelectorAll("[data-shop-tab]").forEach((button) => button.addEventListener("click", () => switchShopTab(button.dataset.shopTab)));
document.querySelectorAll("[data-shop-action]").forEach((button) => button.addEventListener("click", () => executeShopTransaction(button.dataset.shopAction)));
document.addEventListener("keydown", handleMapKeyboard);
window.addEventListener("resize", drawPlayer);
generateMap("castle");
if (window.ResizeObserver) {
    const mapResizeObserver = new ResizeObserver(() => requestAnimationFrame(drawPlayer));
    mapResizeObserver.observe($("map-grid"));
}
