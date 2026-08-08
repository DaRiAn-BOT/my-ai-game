"use strict";

// Интерактивная карта 15×15. Она отвечает только за исследование и не меняет ресурсы.
const MAP_SIZE = 15;
const MAP_CENTER = 7;
let currentBiome = "castle";
let mapCells = [];
let playerPosition = { row: MAP_CENTER, column: MAP_CENTER };

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
            blocked: Math.random() < settings.obstacleChance
        }))
    );

    // Стартовая клетка и четыре выхода от неё всегда доступны.
    [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([rowOffset, columnOffset]) => {
        mapCells[MAP_CENTER + rowOffset][MAP_CENTER + columnOffset].blocked = false;
    });

    renderMap();
    document.querySelectorAll("[data-location]").forEach((button) => {
        button.classList.toggle("selected-biome", button.dataset.location === currentBiome);
    });
    return mapCells;
}

function renderMap() {
    const grid = $("map-grid");
    const fragment = document.createDocumentFragment();
    grid.innerHTML = "";

    mapCells.flat().forEach((cell) => {
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
    drawPlayer();
}

function drawPlayer() {
    document.querySelectorAll("#map-grid .player-marker").forEach((tile) => tile.classList.remove("player-marker"));
    const selector = `[data-row="${playerPosition.row}"][data-column="${playerPosition.column}"]`;
    const playerTile = $("map-grid").querySelector(selector);
    if (playerTile) {
        playerTile.classList.add("player-marker");
        playerTile.setAttribute("aria-label", "Положение игрока");
    }
}

function movePlayer(rowOffset, columnOffset) {
    const targetRow = playerPosition.row + rowOffset;
    const targetColumn = playerPosition.column + columnOffset;
    if (!canEnterTile(targetRow, targetColumn)) return false;
    playerPosition = { row: targetRow, column: targetColumn };
    drawPlayer();
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
    triggerMapCellEvent();
}

function triggerMapCellEvent() {
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
    showEvent(random(locationEvents[currentBiome]), locationSkills[currentBiome]);
}

function canEnterTile(row, column) {
    const insideMap = row >= 0 && row < MAP_SIZE && column >= 0 && column < MAP_SIZE;
    return insideMap && !mapCells[row][column].blocked;
}

function toggleMapFullscreen() {
    const wrapper = $("exploration-wrapper");
    const fullscreen = wrapper.classList.toggle("fullscreen-mode");
    $("fullscreen-map").textContent = fullscreen ? "✕ Свернуть карту" : "⛶ На весь экран";
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
    if (event.code === "Escape" && $("exploration-wrapper").classList.contains("fullscreen-mode")) {
        toggleMapFullscreen();
        return;
    }
    const movement = movements[event.code];
    if (!movement) return;
    event.preventDefault();
    if (!movePlayer(...movement)) showToast("Туда пройти нельзя.");
}

$("fullscreen-map").addEventListener("click", toggleMapFullscreen);
document.addEventListener("keydown", handleMapKeyboard);
generateMap("castle");
