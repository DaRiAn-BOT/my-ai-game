const STORAGE_KEY = "castle-defense-survival-v1";

const ITEM_LIBRARY = {
    sword: {
        name: "Меч",
        effect: { strength: 3 }
    },
    amulet: {
        name: "Амулет",
        effect: { wisdom: 3 }
    },
    crown: {
        name: "Корона",
        effect: { charisma: 3 }
    }
};

const ENEMY_TEMPLATES = [
    "Гоблины-налётчики",
    "Огры-разрушители",
    "Тёмные лучники",
    "Лесные чудовища",
    "Бешеные орды"
];

function createDefaultState() {
    return {
        hero: {
            name: "Ариэль",
            avatar: "🧙",
            strength: 0,
            wisdom: 0,
            charisma: 0
        },
        resources: {
            gold: 100,
            army: 50,
            food: 80,
            wallIntegrity: 100,
            phase: "day",
            energy: 2,
            night: 1
        },
        inventory: [null, null, null],
        activeRegion: null,
        activeWave: null,
        lastActionMessage: "Вы вступаете в путь.",
        history: ["Начало пути"],
        gameOver: false,
        victory: false,
        gameStarted: false
    };
}

const state = createDefaultState();

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
    try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        if (!raw) {
            return createDefaultState();
        }

        return {
            ...createDefaultState(),
            ...raw,
            hero: {
                ...createDefaultState().hero,
                ...(raw.hero || {})
            },
            resources: {
                ...createDefaultState().resources,
                ...(raw.resources || {})
            },
            inventory: Array.isArray(raw.inventory) ? raw.inventory : createDefaultState().inventory,
            history: Array.isArray(raw.history) ? raw.history : createDefaultState().history
        };
    } catch {
        return createDefaultState();
    }
}

function showScreen(screenId) {
    document.getElementById("main-menu").style.display = screenId === "main-menu" ? "block" : "none";
    document.getElementById("creation-screen").style.display = screenId === "creation-screen" ? "block" : "none";
    document.getElementById("game-screen").style.display = screenId === "game-screen" ? "block" : "none";
}

function getBonusFromItems() {
    return state.inventory.reduce((accumulator, item) => {
        if (!item || !item.equipped) {
            return accumulator;
        }

        Object.entries(item.effect).forEach(([key, value]) => {
            accumulator[key] = (accumulator[key] || 0) + value;
        });
        return accumulator;
    }, { strength: 0, wisdom: 0, charisma: 0 });
}

function getEffectiveStats() {
    const bonus = getBonusFromItems();
    return {
        strength: state.hero.strength + bonus.strength,
        wisdom: state.hero.wisdom + bonus.wisdom,
        charisma: state.hero.charisma + bonus.charisma
    };
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function renderMapButtons() {
    updateGameScreen();
}

function updateCreationScreen() {
    document.getElementById("creation-strength").textContent = state.hero.strength;
    document.getElementById("creation-wisdom").textContent = state.hero.wisdom;
    document.getElementById("creation-charisma").textContent = state.hero.charisma;
    document.getElementById("creation-gold").textContent = state.resources.gold;
}

function updateGameScreen() {
    const effectiveStats = getEffectiveStats();

    document.getElementById("hero-avatar").textContent = state.hero.avatar;
    document.getElementById("hero-strength").textContent = effectiveStats.strength;
    document.getElementById("hero-wisdom").textContent = effectiveStats.wisdom;
    document.getElementById("hero-charisma").textContent = effectiveStats.charisma;

    document.getElementById("gold").textContent = state.resources.gold;
    document.getElementById("army").textContent = state.resources.army;
    document.getElementById("food").textContent = state.resources.food;
    document.getElementById("wall").textContent = `${Math.round(state.resources.wallIntegrity)}%`;
    document.getElementById("phase").textContent = state.resources.phase === "day" ? "День" : "Ночь";
    document.getElementById("energy").textContent = String(state.resources.energy);
    document.getElementById("night").textContent = `Ночь ${state.resources.night}`;

    document.querySelectorAll(".play-upgrade-btn").forEach((button) => {
        button.disabled = state.resources.gold < 50;
    });

    document.querySelectorAll(".inventory-slot").forEach((button, index) => {
        const item = state.inventory[index];
        const content = item ? `${item.name}${item.equipped ? " • Экип." : ""}` : "—";
        button.classList.toggle("filled", Boolean(item));
        button.classList.toggle("equipped", Boolean(item && item.equipped));
        document.getElementById(`slot-${index}`).textContent = content;
    });

    document.querySelectorAll(".zone-button").forEach((button) => {
        button.disabled = state.resources.phase !== "day" || state.gameOver || state.victory;
        button.classList.toggle("active", state.activeRegion === button.dataset.region);
    });

    const nightButton = document.getElementById("night-day-btn");
    nightButton.style.display = state.resources.phase === "day" && state.resources.energy <= 0 ? "block" : "none";
}

function renderQuestChoices() {
    const container = document.getElementById("choices-container");
    container.innerHTML = "";

    if (state.gameOver) {
        document.getElementById("quest-text").textContent = "Поражение: королевство рухнуло. Обновите страницу и начните заново.";
        return;
    }

    if (state.victory) {
        document.getElementById("quest-text").textContent = "Победа: вы пережили 15 ночей осады и удержали замок.";
        return;
    }

    if (state.resources.phase === "day") {
        document.getElementById("quest-text").textContent = state.lastActionMessage;
        return;
    }

    const wave = state.activeWave;
    document.getElementById("quest-text").textContent = wave.text;

    const actions = [
        {
            label: "Оборона на стенах",
            mode: "wall"
        },
        {
            label: "Вылазка армии",
            mode: "army"
        },
        {
            label: "Магический барьер",
            mode: "barrier"
        }
    ];

    actions.forEach((action) => {
        const button = document.createElement("button");
        button.type = "button";

        if (action.mode === "barrier") {
            const effective = getEffectiveStats();
            if (effective.wisdom >= 4) {
                button.classList.add("choice-ready");
                button.textContent = action.label;
            } else {
                button.disabled = true;
                button.textContent = "Заблокировано: Мудрость ≥ 4";
            }
        } else {
            button.classList.add("choice-ready");
            button.textContent = action.label;
        }

        button.onclick = () => resolveNightChoice(action.mode);
        container.appendChild(button);
    });
}

function addInventoryItem(itemTemplate) {
    const freeSlot = state.inventory.findIndex((item) => item === null);
    if (freeSlot === -1) {
        state.history.push("Инвентарь полон — сначала снимите предмет или экипируйте его.");
        return;
    }

    state.inventory[freeSlot] = {
        ...itemTemplate,
        equipped: false
    };
}

function equipSlot(index) {
    const item = state.inventory[index];
    if (!item) {
        return;
    }

    item.equipped = !item.equipped;
    updateGameScreen();
    renderLeaderboard();
    saveState();
}

function renderLeaderboard() {
    const list = document.getElementById("leaderboard-list");
    list.innerHTML = "";

    state.history.slice(-3).reverse().forEach((entry) => {
        const item = document.createElement("li");
        item.textContent = entry;
        list.appendChild(item);
    });
}

function upgradeStat(stat) {
    const fee = state.gameStarted ? 50 : 20;
    if (state.resources.gold < fee) {
        return;
    }

    state.resources.gold -= fee;
    state.hero[stat] += 1;
    updateCreationScreen();
    updateGameScreen();
    saveState();
}

function performDayAction(regionId) {
    if (state.resources.phase !== "day" || state.gameOver || state.victory) {
        return;
    }

    if (state.resources.energy <= 0) {
        return;
    }

    state.resources.energy -= 1;
    state.activeRegion = regionId;

    if (regionId === "castle") {
        if (state.resources.gold < 20) {
            state.lastActionMessage = "У вас не хватает золота для укрепления стен.";
        } else {
            state.resources.gold -= 20;
            state.resources.wallIntegrity = clamp(state.resources.wallIntegrity + 25, 0, 100);
            state.lastActionMessage = "Вы укрепили стены: +25% прочности.";
            state.history.push("Замок укреплён, стены получили свежие брёвна и щиты.");
        }
    }

    if (regionId === "forest") {
        if (state.resources.army < 10) {
            state.lastActionMessage = "В лесу нет армии для безопасного сбора припасов.";
            state.resources.energy += 1;
        } else {
            state.resources.army -= 10;
            state.resources.food += 40;
            state.lastActionMessage = "Лес дал дополнительный запас еды, но вы потратили часть армии.";
            state.history.push("Сбор припасов прошёл успешно: еда и провизия запасены.");
        }
    }

    if (regionId === "mines") {
        state.resources.gold += 40;
        state.lastActionMessage = "Шахты принесли новую руду и 40 золота.";
        state.history.push("Добыча руды завершилась удачно. Вы получили дополнительное золото.");
    }

    if (state.resources.energy <= 0) {
        state.lastActionMessage = "Энергия правителя исчерпана. Завершите день и встречайте ночь.";
    }

    checkGameStatus();
    renderMapButtons();
    renderQuestChoices();
    updateGameScreen();
    renderLeaderboard();
    saveState();
}

function startNight() {
    if (state.resources.phase !== "day" || state.gameOver || state.victory) {
        return;
    }

    state.resources.phase = "night";
    state.activeWave = generateNightWave(state.resources.night);
    state.lastActionMessage = state.activeWave.text;
    state.history.push(`Ночь ${state.resources.night}: ${state.activeWave.text}`);
    renderMapButtons();
    renderQuestChoices();
    updateGameScreen();
    renderLeaderboard();
    saveState();
}

function generateNightWave(nightNumber) {
    const enemyName = ENEMY_TEMPLATES[Math.floor(Math.random() * ENEMY_TEMPLATES.length)];
    const bossNight = nightNumber === 15;

    if (bossNight) {
        return {
            text: `Ночь 15: На замок нападают Финальный Босс — Разрушитель Короны!`,
            wallDamage: 26 + nightNumber * 2,
            armyDamage: 20 + nightNumber * 2,
            boss: true
        };
    }

    return {
        text: `Ночь ${nightNumber}: На замок нападают ${enemyName}!`,
        wallDamage: 10 + nightNumber * 3,
        armyDamage: 8 + nightNumber * 2,
        boss: false
    };
}

function resolveNightChoice(mode) {
    if (state.resources.phase !== "night" || state.gameOver || state.victory) {
        return;
    }

    const wave = state.activeWave;
    const effectiveStats = getEffectiveStats();
    let wallDamage = wave.wallDamage;
    let armyDamage = wave.armyDamage;
    let message = "";

    if (mode === "wall") {
        const strengthReduction = Math.min(18, effectiveStats.strength * 4);
        wallDamage = Math.max(0, wave.wallDamage - strengthReduction);
        state.resources.wallIntegrity = clamp(state.resources.wallIntegrity - wallDamage, 0, 100);
        message = `Оборона на стенах ослабила удар. Стена потеряла ${wallDamage}% прочности.`;
    }

    if (mode === "army") {
        const charismaReduction = Math.min(18, effectiveStats.charisma * 4);
        armyDamage = Math.max(0, wave.armyDamage - charismaReduction);
        state.resources.army = clamp(state.resources.army - armyDamage, 0, 999);
        message = `Вылазка армии поглотила часть натиска. Армия потеряла ${armyDamage} единиц.`;
    }

    if (mode === "barrier") {
        if (effectiveStats.wisdom >= 4) {
            message = "Магический барьер полностью нейтрализовал угрозу этой ночи.";
            wallDamage = 0;
            armyDamage = 0;
        } else {
            return;
        }
    }

    if (mode === "wall" || mode === "army") {
        state.resources.wallIntegrity = clamp(state.resources.wallIntegrity, 0, 100);
    }

    state.lastActionMessage = message;
    state.history.push(message);

    state.resources.phase = "day";
    state.resources.energy = 2;
    state.resources.night += 1;
    state.activeWave = null;
    state.activeRegion = null;

    checkGameStatus();
    renderMapButtons();
    renderQuestChoices();
    updateGameScreen();
    renderLeaderboard();
    saveState();
}

function checkGameStatus() {
    if (state.resources.wallIntegrity <= 0 || state.resources.army <= 0 || state.resources.food <= 0 || state.resources.gold <= 0) {
        state.gameOver = true;
        state.resources.phase = "day";
    }

    if (state.resources.night > 15 && !state.gameOver) {
        state.victory = true;
        state.resources.phase = "day";
        state.history.push("Вы пережили 15 ночей осады и удержали замок.");
    }
}

function startGame() {
    state.gameStarted = true;
    showScreen("game-screen");
    updateCreationScreen();
    updateGameScreen();
    renderMapButtons();
    renderQuestChoices();
    renderLeaderboard();
    saveState();
}

window.addEventListener("DOMContentLoaded", () => {
    const loaded = loadState();
    Object.assign(state, loaded);

    document.getElementById("start-btn").addEventListener("click", () => {
        showScreen("creation-screen");
        updateCreationScreen();
    });

    document.querySelectorAll(".upgrade-btn").forEach((button) => {
        button.addEventListener("click", () => {
            upgradeStat(button.dataset.stat);
        });
    });

    document.querySelectorAll(".play-upgrade-btn").forEach((button) => {
        button.addEventListener("click", () => {
            upgradeStat(button.dataset.stat);
        });
    });

    document.querySelectorAll(".zone-button").forEach((button) => {
        button.addEventListener("click", () => {
            performDayAction(button.dataset.region);
        });
    });

    document.querySelectorAll(".inventory-slot").forEach((button) => {
        button.addEventListener("click", () => {
            equipSlot(Number(button.dataset.slot));
        });
    });

    document.getElementById("night-day-btn").addEventListener("click", () => {
        startNight();
    });

    document.getElementById("enter-game-btn").addEventListener("click", () => {
        startGame();
    });

    showScreen("main-menu");
    updateCreationScreen();
    updateGameScreen();
    renderQuestChoices();
    renderLeaderboard();
    saveState();
});