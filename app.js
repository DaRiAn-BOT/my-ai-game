const STORAGE_KEY = "kingdom-chronicles-save";
const MAP_ROWS = 6;
const MAP_COLS = 8;

const createDefaultState = () => ({ gold: 100, army: 50, food: 80, day: 1 });

let state = createDefaultState();
let playerPos = { x: 0, y: 0 };
let enemyPos = { x: 5, y: 2 };
let currentEncounter = null;

const events = [
    {
        text: "К границам подошли разбойники и требуют выкуп в 30 золотых. Что сделаете?",
        choices: [
            { text: "Заплатить им золотом (-30 🪙)", effect: { gold: -30, army: 0, food: 0 } },
            { text: "Отправить армию в бой (-10 ⚔️)", effect: { gold: 0, army: -10, food: 0 } }
        ]
    },
    {
        text: "В этом году случился отличный урожай зерна! Торговцы предлагают сделку.",
        choices: [
            { text: "Продать излишки (+40 🪙, -20 🌾)", effect: { gold: 40, army: 0, food: -20 } },
            { text: "Засыпать всё в закрома (+30 🌾)", effect: { gold: 0, army: 0, food: 30 } }
        ]
    },
    {
        text: "Странствующий рыцарь предлагает свои услуги вашему замку.",
        choices: [
            { text: "Нанять его (-20 🪙, +15 ⚔️)", effect: { gold: -20, army: 15, food: 0 } },
            { text: "Отказать рыцарю", effect: { gold: 0, army: 0, food: 0 } }
        ]
    },
    {
        text: "В городе началась эпидемия гриппа среди крестьян. Как вы поступите?",
        choices: [
            { text: "Выделить золото на лечение (+15 🌾, -20 🪙)", effect: { gold: -20, army: 0, food: 15 } },
            { text: "Скрыть проблему и надеяться на удачу (-10 ⚔️)", effect: { gold: 0, army: -10, food: 0 } }
        ]
    },
    {
        text: "К вам пришёл торговый караван с редкими тканями и пряностями.",
        choices: [
            { text: "Сделать выгодную закупку (+25 🪙, -10 🌾)", effect: { gold: 25, army: 0, food: -10 } },
            { text: "Отменить торг и держать запасы (+12 🌾)", effect: { gold: 0, army: 0, food: 12 } }
        ]
    },
    {
        text: "Небольшой лесной пожар угрожает приграничным деревням. Что делать?",
        choices: [
            { text: "Послать отряд пожарных (+20 ⚔️, -15 🪙)", effect: { gold: -15, army: 20, food: 0 } },
            { text: "Сжечь соседний лес, чтобы остановить огонь (-10 🌾)", effect: { gold: 0, army: 0, food: -10 } }
        ]
    },
    {
        text: "Люди требуют у вас грандиозный праздник в честь победы. Вкусные пиры стоят ресурсов.",
        choices: [
            { text: "Организовать праздник (+20 ⚔️, -25 🌾)", effect: { gold: 0, army: 20, food: -25 } },
            { text: "Отказать и сохранить запасы (+15 🪙)", effect: { gold: 15, army: 0, food: 0 } }
        ]
    },
    {
        text: "В замок привезли странного мудреца, который обещает предсказания и удачу.",
        choices: [
            { text: "Подарить ему золото и попросить совета (-15 🪙)", effect: { gold: -15, army: 0, food: 0 } },
            { text: "Попросить его уйти и защитить королевство (+10 ⚔️)", effect: { gold: 0, army: 10, food: 0 } }
        ]
    }
];

function hasSavedState() {
    return Boolean(localStorage.getItem(STORAGE_KEY));
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, playerPos, enemyPos }));
}

function loadState() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        if (!saved || typeof saved !== "object") {
            return createDefaultState();
        }

        const restored = {
            ...createDefaultState(),
            ...saved
        };

        playerPos = saved.playerPos || { x: 0, y: 0 };
        enemyPos = saved.enemyPos || { x: 5, y: 2 };

        return restored;
    } catch {
        return createDefaultState();
    }
}

function clearSavedState() {
    localStorage.removeItem(STORAGE_KEY);
}

function refreshMenuButtons() {
    const continueBtn = document.getElementById("continue-game-btn");
    continueBtn.classList.toggle("hidden", !hasSavedState());
}

function updateUI() {
    document.getElementById("gold").innerText = state.gold;
    document.getElementById("army").innerText = state.army;
    document.getElementById("food").innerText = state.food;
    document.getElementById("day").innerText = state.day;
}

function drawPlayerSprite() {
    const canvas = document.getElementById("player-token");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 32, 32);
    ctx.imageSmoothingEnabled = false;

    const hair = "#7a4a24";
    const skin = "#f0c8a0";
    const shirt = "#4f86ff";
    const pants = "#232b4a";
    const shoes = "#2d1d12";
    const outline = "#141414";

    const drawPixel = (x, y, color) => {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
    };

    for (let x = 9; x <= 23; x += 1) {
        drawPixel(x, 3, hair);
        drawPixel(x, 4, hair);
    }

    for (let x = 10; x <= 22; x += 1) {
        drawPixel(x, 5, hair);
    }

    for (let x = 11; x <= 21; x += 1) {
        drawPixel(x, 6, hair);
    }

    for (let x = 11; x <= 21; x += 1) {
        drawPixel(x, 7, hair);
    }

    for (let x = 10; x <= 22; x += 1) {
        for (let y = 8; y <= 14; y += 1) {
            drawPixel(x, y, skin);
        }
    }

    for (let x = 11; x <= 21; x += 1) {
        drawPixel(x, 15, shirt);
        drawPixel(x, 16, shirt);
        drawPixel(x, 17, shirt);
        drawPixel(x, 18, shirt);
    }

    for (let x = 12; x <= 20; x += 1) {
        drawPixel(x, 19, pants);
        drawPixel(x, 20, pants);
        drawPixel(x, 21, pants);
    }

    for (let x = 11; x <= 13; x += 1) {
        drawPixel(x, 22, shoes);
    }
    for (let x = 19; x <= 21; x += 1) {
        drawPixel(x, 22, shoes);
    }

    drawPixel(14, 10, outline);
    drawPixel(18, 10, outline);
    drawPixel(15, 11, outline);
    drawPixel(17, 11, outline);
    drawPixel(16, 12, outline);

    for (let x = 12; x <= 20; x += 1) {
        drawPixel(x, 18, outline);
    }
}

function drawEnemySprite() {
    const canvas = document.getElementById("enemy-token");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 32, 32);
    ctx.imageSmoothingEnabled = false;

    const red = "#a52424";
    const dark = "#201010";

    const drawPixel = (x, y, color) => {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
    };

    for (let x = 8; x <= 24; x += 1) {
        drawPixel(x, 7, red);
        drawPixel(x, 8, red);
        drawPixel(x, 9, red);
    }

    for (let x = 10; x <= 22; x += 1) {
        drawPixel(x, 10, dark);
    }

    for (let x = 12; x <= 20; x += 1) {
        drawPixel(x, 11, dark);
    }

    for (let x = 9; x <= 23; x += 1) {
        drawPixel(x, 12, red);
    }

    for (let x = 8; x <= 24; x += 1) {
        drawPixel(x, 13, red);
    }

    for (let x = 10; x <= 13; x += 1) {
        drawPixel(x, 18, dark);
    }
    for (let x = 19; x <= 22; x += 1) {
        drawPixel(x, 18, dark);
    }
}

function buildMapGrid() {
    const grid = document.getElementById("map-grid");
    grid.innerHTML = "";

    const terrainColors = ["#213020", "#29422b", "#365c36", "#4a6e40"];
    for (let y = 0; y < MAP_ROWS; y += 1) {
        for (let x = 0; x < MAP_COLS; x += 1) {
            const cell = document.createElement("div");
            cell.className = "map-cell";
            cell.dataset.x = String(x);
            cell.dataset.y = String(y);
            cell.style.background = terrainColors[(x + y) % terrainColors.length];
            grid.appendChild(cell);
        }
    }
}

function renderMap() {
    const shell = document.getElementById("map-shell");
    const shellRect = shell.getBoundingClientRect();
    const tileWidth = shellRect.width / MAP_COLS;
    const tileHeight = shellRect.height / MAP_ROWS;

    const playerToken = document.getElementById("player-token");
    const enemyToken = document.getElementById("enemy-token");

    playerToken.style.left = `${playerPos.x * tileWidth + 6}px`;
    playerToken.style.top = `${playerPos.y * tileHeight + 6}px`;
    enemyToken.style.left = `${enemyPos.x * tileWidth + 6}px`;
    enemyToken.style.top = `${enemyPos.y * tileHeight + 6}px`;
}

function spawnEnemy() {
    const nextEnemy = {
        x: Math.floor(Math.random() * MAP_COLS),
        y: Math.floor(Math.random() * MAP_ROWS)
    };

    if (nextEnemy.x === playerPos.x && nextEnemy.y === playerPos.y) {
        spawnEnemy();
        return;
    }

    enemyPos = nextEnemy;
    renderMap();
}

function showEncounter() {
    if (state.gold <= 0 || state.army <= 0 || state.food <= 0) {
        endGame();
        return;
    }

    currentEncounter = events[Math.floor(Math.random() * events.length)];
    document.getElementById("event-text").innerText = currentEncounter.text;

    const container = document.getElementById("choices-container");
    container.innerHTML = "";

    currentEncounter.choices.forEach((choice) => {
        const btn = document.createElement("button");
        btn.innerText = choice.text;
        btn.onclick = () => {
            state.gold += choice.effect.gold;
            state.army += choice.effect.army;
            state.food += choice.effect.food;
            state.day += 1;

            saveState();
            updateUI();
            spawnEnemy();
            document.getElementById("event-text").innerText = "Вы прошли дальше по карте. Следующее событие уже близко.";
            container.innerHTML = "";
        };
        container.appendChild(btn);
    });
}

function movePlayer(dx, dy) {
    const nextX = Math.max(0, Math.min(MAP_COLS - 1, playerPos.x + dx));
    const nextY = Math.max(0, Math.min(MAP_ROWS - 1, playerPos.y + dy));

    playerPos = { x: nextX, y: nextY };
    renderMap();

    if (playerPos.x === enemyPos.x && playerPos.y === enemyPos.y) {
        showEncounter();
    }
}

function endGame() {
    saveState();

    document.getElementById("event-text").innerText =
        `Ваше правление окончено! Вы продержались дней: ${state.day}.`;

    document.getElementById("choices-container").innerHTML =
        '<button id="back-menu-btn" type="button">В главное меню 🔄</button>';

    document.getElementById("back-menu-btn").onclick = backToMenu;
}

function startGame(reset = false) {
    if (reset) {
        state = createDefaultState();
        clearSavedState();
    } else {
        state = loadState();
    }

    playerPos = { x: 0, y: 0 };
    spawnEnemy();
    refreshMenuButtons();

    document.getElementById("main-menu").classList.add("hidden");
    document.getElementById("game-container").classList.remove("hidden");
    document.getElementById("modal-overlay").classList.add("hidden");

    updateUI();
    document.getElementById("event-text").innerText = "Идите по карте, чтобы встретить события и нападения.";
    document.getElementById("choices-container").innerHTML = "";
    renderMap();
}

function backToMenu() {
    saveState();
    refreshMenuButtons();

    document.getElementById("game-container").classList.add("hidden");
    document.getElementById("main-menu").classList.remove("hidden");
    document.getElementById("modal-overlay").classList.add("hidden");
}

function toggleModal(show) {
    const overlay = document.getElementById("modal-overlay");

    if (show) {
        overlay.classList.remove("hidden");
        overlay.classList.add("show");
    } else {
        overlay.classList.remove("show");
        overlay.classList.add("hidden");
    }
}

window.onload = () => {
    state = loadState();
    buildMapGrid();
    drawPlayerSprite();
    drawEnemySprite();
    renderMap();

    document.getElementById("start-game-btn").onclick = () => startGame(true);
    document.getElementById("continue-game-btn").onclick = () => startGame(false);
    document.getElementById("about-btn").onclick = () => toggleModal(true);
    document.getElementById("close-modal-btn").onclick = () => toggleModal(false);
    document.getElementById("restart-game-btn").onclick = () => startGame(true);
    document.getElementById("back-to-menu-btn").onclick = backToMenu;

    document.addEventListener("keydown", (event) => {
        if (document.getElementById("game-container").classList.contains("hidden")) {
            return;
        }

        if (event.key === "ArrowUp") {
            movePlayer(0, -1);
        } else if (event.key === "ArrowDown") {
            movePlayer(0, 1);
        } else if (event.key === "ArrowLeft") {
            movePlayer(-1, 0);
        } else if (event.key === "ArrowRight") {
            movePlayer(1, 0);
        }
    });

    document.getElementById("game-container").classList.add("hidden");
    document.getElementById("modal-overlay").classList.add("hidden");
    document.getElementById("main-menu").classList.remove("hidden");

    refreshMenuButtons();
    updateUI();
};