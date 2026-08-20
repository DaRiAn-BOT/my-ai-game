"use strict";

// Интерактивная карта 15×15. Она отвечает только за исследование и не меняет ресурсы.
const MAP_SIZE = 15;
const MAP_CENTER = 7;
let currentBiome = "castle";
let mapCells = [];
let playerPosition = { row: MAP_CENTER, column: MAP_CENTER };
let mapIsFullscreen = false;

const biomeSettings = {
    castle: { tileClass: "tile-castle", obstacleChance: 0.12, obstacleName: "стена" },
    forest: { tileClass: "tile-forest", obstacleChance: 0.29, obstacleName: "густые деревья" },
    mines: { tileClass: "tile-mine", obstacleChance: 0.27, obstacleName: "каменный завал" },
    village: { tileClass: "tile-village", obstacleChance: 0.17, obstacleName: "дом" },
    ruins: { tileClass: "tile-ruins", obstacleChance: 0.24, obstacleName: "обломки" },
    market: { tileClass: "tile-market", obstacleChance: 0.14, obstacleName: "торговая палатка" }
};

function generateMap(biomeType) {
    currentBiome = biomeSettings[biomeType] ? biomeType : "castle";
    const settings = biomeSettings[currentBiome];
    playerPosition = { row: MAP_CENTER, column: MAP_CENTER };

    mapCells = Array.from({ length: MAP_SIZE }, (_, row) =>
        Array.from({ length: MAP_SIZE }, (_, column) => ({
            row,
            column,
            biome: currentBiome,
            blocked: Math.random() < settings.obstacleChance,
            hasEvent: false,
            explored: false
        }))
    );

    // Стартовая клетка и четыре выхода от неё всегда доступны.
    [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([rowOffset, columnOffset]) => {
        mapCells[MAP_CENTER + rowOffset][MAP_CENTER + columnOffset].blocked = false;
    });
    placeHiddenEvents();

    renderMap();
    document.querySelectorAll("[data-location]").forEach((button) => {
        button.classList.toggle("selected-biome", button.dataset.location === currentBiome);
    });
    return mapCells;
}

function placeHiddenEvents() {
    const candidates = mapCells.flat().filter((cell) => {
        const distanceFromStart = Math.abs(cell.row - MAP_CENTER) + Math.abs(cell.column - MAP_CENTER);
        return !cell.blocked && distanceFromStart >= 3;
    });
    // На каждой карте гарантированно спрятано восемь событий.
    for (let index = 0; index < 8 && candidates.length; index += 1) {
        const candidateIndex = Math.floor(Math.random() * candidates.length);
        candidates.splice(candidateIndex, 1)[0].hasEvent = true;
    }
}

function getVisibleCells() {
    if (mapIsFullscreen) return mapCells.flat();
    const startRow = clamp(playerPosition.row - 2, 0, MAP_SIZE - 5);
    const startColumn = clamp(playerPosition.column - 2, 0, MAP_SIZE - 5);
    const visible = [];
    for (let row = startRow; row < startRow + 5; row += 1) {
        for (let column = startColumn; column < startColumn + 5; column += 1) visible.push(mapCells[row][column]);
    }
    return visible;
}

function renderMap() {
    const grid = $("map-grid");
    const fragment = document.createDocumentFragment();
    grid.innerHTML = "";
    const visibleSize = mapIsFullscreen ? MAP_SIZE : 5;
    grid.style.gridTemplateColumns = `repeat(${visibleSize}, minmax(0, 1fr))`;
    grid.style.gridTemplateRows = `repeat(${visibleSize}, minmax(0, 1fr))`;
    grid.dataset.view = mapIsFullscreen ? "full" : "local";

    getVisibleCells().forEach((cell) => {
        const tile = document.createElement("div");
        const settings = biomeSettings[cell.biome];
        tile.className = `map-tile ${settings.tileClass}${cell.blocked ? " tile-obstacle" : ""}`;
        tile.dataset.row = cell.row;
        tile.dataset.column = cell.column;
        tile.setAttribute("role", "button");
        tile.setAttribute("aria-label", cell.blocked ? `Препятствие: ${settings.obstacleName}` : `Клетка ${cell.row + 1}, ${cell.column + 1}`);
        tile.addEventListener("click", () => movePlayerTo(cell.row, cell.column));
        fragment.appendChild(tile);
    });

    grid.appendChild(fragment);
    const playerMarker = document.createElement("div");
    playerMarker.id = "map-player";
    playerMarker.setAttribute("aria-label", "Положение игрока");
    grid.appendChild(playerMarker);
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
    marker.style.transform = `translate3d(${playerTile.offsetLeft}px, ${playerTile.offsetTop}px, 24px) rotateX(-45deg)`;
}

function movePlayer(rowOffset, columnOffset) {
    const targetRow = playerPosition.row + rowOffset;
    const targetColumn = playerPosition.column + columnOffset;
    if (!canEnterTile(targetRow, targetColumn)) return false;
    playerPosition = { row: targetRow, column: targetColumn };
    mapCells[targetRow][targetColumn].explored = true;
    renderMap();
    return true;
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
    const cell = mapCells[playerPosition.row][playerPosition.column];
    if (!cell.hasEvent) {
        showToast("Клетка исследована. Здесь ничего нет.");
        return;
    }
    cell.hasEvent = false;
    clearEventBoard();
    if (currentBiome === "market") {
        showEvent({
            title: "Находка на рыночной площади",
            text: "Между торговыми рядами вы замечаете лавку с полезными припасами.",
            choices: [
                ["Купить 15 еды за 12 золота", () => pay({ gold: 12 }, () => change({ food: 15 }), "Не хватает золота.")],
                ["Купить 2 дерева за 15 золота", () => pay({ gold: 15 }, () => change({ wood: 2 }), "Не хватает золота.")],
                ["👑 Сторговаться (нужно 4 харизмы)", () => statChoice("charisma", 4, { food: 18, gold: 5 }, { gold: -5 })]
            ]
        }, "charisma");
        return;
    }

    const locationSkills = {
        castle: "charisma",
        forest: "strength",
        mines: "wisdom",
        village: "charisma",
        ruins: "wisdom"
    };
    const useLocationEvent = Math.random() < 0.75;
    const event = useLocationEvent ? random(locationEvents[currentBiome]) : random(worldEvents);
    const skill = useLocationEvent ? locationSkills[currentBiome] : worldEventSkill(event.title);
    showEvent(event, skill);
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
document.addEventListener("keydown", handleMapKeyboard);
window.addEventListener("resize", drawPlayer);
generateMap("castle");
if (window.ResizeObserver) {
    const mapResizeObserver = new ResizeObserver(() => requestAnimationFrame(drawPlayer));
    mapResizeObserver.observe($("map-grid"));
}
