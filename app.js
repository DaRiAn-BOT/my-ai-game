const STORAGE_KEY = "rpg-clean-state-v3";

const ITEM_LIBRARY = {
    sword: {
        name: "Меч",
        effect: { strength: 3 },
        text: "Меч из лесной битвы"
    },
    amulet: {
        name: "Амулет",
        effect: { wisdom: 3 },
        text: "Тайный амулет шахт"
    },
    crown: {
        name: "Корона",
        effect: { charisma: 3 },
        text: "Ожерелье власти"
    }
};

const REGION_EVENTS = {
    castle: [
        {
            text: "К замку прибыл караван. Его нужно пропустить, но разбойники уже притаились в тени.",
            choices: [
                {
                    label: "[Харизма 4+] Уговорить послов и провести безопасную сделку",
                    required: { charisma: 4 },
                    reward: { gold: 25 },
                    rewardItem: ITEM_LIBRARY.crown,
                    note: "Ваше слово стабилизировало королевство."
                },
                {
                    label: "Сдержать грабителей и закрыть ворота",
                    reward: { gold: 12, army: 2 },
                    note: "Государственная решительность сработала."
                },
                {
                    label: "Принять караван без лишнего шума",
                    reward: { gold: 10, food: 4 },
                    note: "Деловой ход дал спокойствие."
                }
            ]
        }
    ],
    forest: [
        {
            text: "Лесная тропа кишит чудовищами. Один из них держит древний меч, который давно потеряли в вашем роду.",
            choices: [
                {
                    label: "[Сила 5+] Разить чудовище и забрать клинок",
                    required: { strength: 5 },
                    reward: { gold: 18 },
                    rewardItem: ITEM_LIBRARY.sword,
                    note: "Вы победили зверя и забрали древний клинок."
                },
                {
                    label: "[Мудрость 4+] Призвать защитный оберег и отогнать монстра",
                    required: { wisdom: 4 },
                    reward: { gold: 12, food: 4 },
                    note: "Оберег вырвал вас из ловушки."
                },
                {
                    label: "Пойти в обход и не тратить силы",
                    reward: { gold: 4, food: 1 },
                    note: "Осторожность обошлась дешевле."
                }
            ]
        }
    ],
    mines: [
        {
            text: "В шахтах вспыхнуло пламя и работники требуют вашего решения. Если вы окажете помощь, наткнётесь на древнюю находку.",
            choices: [
                {
                    label: "[Мудрость 5+] Распорядиться о безопасной разгрузке и найти амулет",
                    required: { wisdom: 5 },
                    reward: { gold: 24 },
                    rewardItem: ITEM_LIBRARY.amulet,
                    note: "Вы спасли рудокопов и нашли амулет."
                },
                {
                    label: "[Харизма 3+] Уговорить бригаду не паниковать",
                    required: { charisma: 3 },
                    reward: { gold: 14, food: 2 },
                    note: "Люди успокоились, и работа пошла."
                },
                {
                    label: "Не вмешиваться и сохранить ресурсы",
                    reward: { gold: 6, army: 1 },
                    note: "Тихий выбор сэкономил силы."
                }
            ]
        }
    ]
};

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
            day: 1
        },
        inventory: [null, null, null],
        regionProgress: {
            castle: 0,
            forest: 0,
            mines: 0
        },
        activeRegion: null,
        activeEvent: null,
        history: ["Начало пути"]
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
            regionProgress: {
                ...createDefaultState().regionProgress,
                ...(raw.regionProgress || {})
            },
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
    document.getElementById("day").textContent = state.resources.day;

    document.querySelectorAll(".play-upgrade-btn").forEach((button) => {
        const stat = button.dataset.stat;
        const fee = 50;
        button.disabled = state.resources.gold < fee;
    });

    document.querySelectorAll(".inventory-slot").forEach((button, index) => {
        const item = state.inventory[index];
        const content = item ? `${item.name}${item.equipped ? " • Экип." : ""}` : "—";
        button.classList.toggle("filled", Boolean(item));
        button.classList.toggle("equipped", Boolean(item && item.equipped));
        document.getElementById(`slot-${index}`).textContent = content;
    });
}

function meetsRequirements(required) {
    if (!required) {
        return true;
    }

    const effectiveStats = getEffectiveStats();
    return Object.entries(required).every(([key, value]) => effectiveStats[key] >= value);
}

function requirementText(required) {
    if (!required) {
        return "Без ограничений";
    }

    return Object.entries(required)
        .map(([key, value]) => `${key === "strength" ? "Сила" : key === "wisdom" ? "Мудрость" : "Харизма"} ≥ ${value}`)
        .join(" • ");
}

function renderMapButtons() {
    document.querySelectorAll(".zone-button").forEach((button) => {
        button.classList.toggle("active", state.activeRegion === button.dataset.region);
    });
}

function renderQuestChoices() {
    const container = document.getElementById("choices-container");
    container.innerHTML = "";

    if (!state.activeEvent) {
        document.getElementById("quest-text").textContent = "Выберите зону на карте, чтобы отправить правителя в путь.";
        return;
    }

    document.getElementById("quest-text").textContent = state.activeEvent.text;

    state.activeEvent.choices.forEach((choice) => {
        const button = document.createElement("button");
        button.type = "button";
        const canUse = meetsRequirements(choice.required);

        if (canUse) {
            button.classList.add("choice-ready");
            button.textContent = choice.label;
        } else {
            button.disabled = true;
            button.textContent = `Заблокировано: ${requirementText(choice.required)}`;
        }

        button.onclick = () => applyChoice(choice);
        container.appendChild(button);
    });
}

function addInventoryItem(itemTemplate) {
    const freeSlot = state.inventory.findIndex((item) => item === null);
    if (freeSlot === -1) {
        state.history.push("Инвентарь полон — сначала снимите или экипируйте предмет.");
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

function applyChoice(choice) {
    if (!meetsRequirements(choice.required)) {
        return;
    }

    if (choice.reward) {
        if (choice.reward.gold !== undefined) {
            state.resources.gold += choice.reward.gold;
        }
        if (choice.reward.army !== undefined) {
            state.resources.army += choice.reward.army;
        }
        if (choice.reward.food !== undefined) {
            state.resources.food += choice.reward.food;
        }
    }

    if (choice.rewardItem) {
        addInventoryItem(choice.rewardItem);
    }

    state.history.push(choice.note || "Решение принято.");
    state.activeEvent = null;
    state.activeRegion = null;
    renderMapButtons();
    renderQuestChoices();
    renderLeaderboard();
    updateCreationScreen();
    updateGameScreen();
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

function upgradeStat(stat, inGame = false) {
    const fee = inGame ? 50 : 20;
    if (state.resources.gold < fee) {
        return;
    }

    state.resources.gold -= fee;
    state.hero[stat] += 1;
    updateCreationScreen();
    updateGameScreen();
    saveState();
}

function chooseRegion(regionId) {
    if (state.resources.food < 5) {
        state.history.push("У вас недостаточно еды: нужно как минимум 5 🌾.");
        renderLeaderboard();
        return;
    }

    state.resources.day += 1;
    state.resources.food -= 5;
    state.activeRegion = regionId;

    const currentIndex = state.regionProgress[regionId] % REGION_EVENTS[regionId].length;
    state.activeEvent = REGION_EVENTS[regionId][currentIndex];
    state.regionProgress[regionId] += 1;

    renderMapButtons();
    renderQuestChoices();
    updateGameScreen();
    saveState();
}

function startGame() {
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
            upgradeStat(button.dataset.stat, false);
        });
    });

    document.querySelectorAll(".play-upgrade-btn").forEach((button) => {
        button.addEventListener("click", () => {
            upgradeStat(button.dataset.stat, true);
        });
    });

    document.querySelectorAll(".zone-button").forEach((button) => {
        button.addEventListener("click", () => {
            chooseRegion(button.dataset.region);
        });
    });

    document.querySelectorAll(".inventory-slot").forEach((button) => {
        button.addEventListener("click", () => {
            equipSlot(Number(button.dataset.slot));
        });
    });

    document.getElementById("enter-game-btn").addEventListener("click", () => {
        startGame();
    });

    showScreen("main-menu");
    updateCreationScreen();
    updateGameScreen();
    renderMapButtons();
    renderQuestChoices();
    renderLeaderboard();
    saveState();
});