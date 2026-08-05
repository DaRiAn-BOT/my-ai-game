const STORAGE_KEY = "rpg-clean-state";

function createDefaultState() {
    return {
        hero: {
            name: "Ариэль",
            avatar: "🧙",
            strength: 12,
            wisdom: 14,
            charisma: 10
        },
        resources: {
            gold: 100,
            army: 50,
            food: 80,
            day: 1
        },
        inventory: ["Меч", "Зелье", "Печать"],
        questIndex: 0,
        hiddenVictoryUnlocked: false,
        history: ["Начало пути"]
    };
}

const state = createDefaultState();

const quests = [
    {
        text: "У границы замка сидит торговец. Он предлагает принять купцов, но требует 15 золотых за гарантию безопасности.",
        choices: [
            { label: "Платить 15 🪙 и открыть ворота", effect: { gold: -15, army: 0, food: 0 }, note: "Город успокоился." },
            { label: "Отказать и сохранить монеты", effect: { gold: 0, army: 0, food: 0 }, note: "Торговцы ушли недовольные." }
        ]
    },
    {
        text: "В глубоком лесу слышен шёпот магического стража. Он откроет секрет только тому, кто сильнее 10 силы.",
        choices: [
            { label: "Пойти по тропе и потерять время", effect: { gold: 0, army: -5, food: 0 }, note: "Времени ушло много." },
            { label: "Скрытый путь победы", effect: { gold: 25, army: 0, food: 5 }, note: "Вы открыли тайный путь.", unlock: "strength", check: 10 },
            { label: "Обратиться к мудрецу", effect: { gold: -10, army: 0, food: 4 }, note: "Мудрость помогла вам.", unlock: "wisdom", check: 12 }
        ]
    },
    {
        text: "Из шахт пришло письмо: там остались рудокопы, и для спасения нужен храбрый выбор.",
        choices: [
            { label: "Освободить рудокопов и потратить 10 армии", effect: { gold: 5, army: -10, food: 0 }, note: "Люди вернулись живыми." },
            { label: "Собрать с шахт редкий артефакт", effect: { gold: 30, army: 0, food: -5 }, note: "Вы добыли редкий артефакт." }
        ]
    },
    {
        text: "К вам пришли послы и предложили договор на 20 золотых, но они требуют вашей харизмы.",
        choices: [
            { label: "Поддержать переговоры", effect: { gold: 20, army: 0, food: 0 }, note: "Харизма помогла убедить послов.", unlock: "charisma", check: 10 },
            { label: "Отказаться и охранять границы", effect: { gold: 0, army: 5, food: -4 }, note: "Старый порядок остался в силе." }
        ]
    },
    {
        text: "Перед вами финальный выбор: открыть тайную тропу к короне или провести священный ритуал.",
        choices: [
            { label: "Победить через тайную тропу", effect: { gold: 50, army: 10, food: 10 }, note: "Вы получили скрытую победу.", finalWin: true },
            { label: "Провести ритуал и закрепить власть", effect: { gold: 10, army: 0, food: 5 }, note: "Правление стабилизировалось." }
        ]
    }
];

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
            inventory: Array.isArray(raw.inventory) ? raw.inventory : createDefaultState().inventory
        };
    } catch {
        return createDefaultState();
    }
}

function syncHeroFromInputs() {
    const nameInput = document.getElementById("hero-name");
    const strengthInput = document.getElementById("hero-strength");
    const wisdomInput = document.getElementById("hero-wisdom");
    const charismaInput = document.getElementById("hero-charisma");

    state.hero.name = nameInput.value.trim() || "Ариэль";
    state.hero.strength = Number(strengthInput.value) || 1;
    state.hero.wisdom = Number(wisdomInput.value) || 1;
    state.hero.charisma = Number(charismaInput.value) || 1;
}

function updateResources() {
    document.getElementById("gold").textContent = state.resources.gold;
    document.getElementById("army").textContent = state.resources.army;
    document.getElementById("food").textContent = state.resources.food;
    document.getElementById("day").textContent = state.resources.day;
}

function updateHeroInputs() {
    document.getElementById("hero-name").value = state.hero.name;
    document.getElementById("hero-strength").value = state.hero.strength;
    document.getElementById("hero-wisdom").value = state.hero.wisdom;
    document.getElementById("hero-charisma").value = state.hero.charisma;
    document.getElementById("hero-avatar").textContent = state.hero.avatar;
}

function updateInventory() {
    for (let index = 0; index < 3; index += 1) {
        document.getElementById(`slot-${index}`).textContent = state.inventory[index] || "—";
    }
}

function renderQuestChoices() {
    const quest = quests[state.questIndex];
    const container = document.getElementById("choices-container");
    container.innerHTML = "";

    if (!quest) {
        document.getElementById("quest-text").textContent = "Вы завершили путь. Королевство под вашим началом.";
        return;
    }

    document.getElementById("quest-text").textContent = quest.text;

    quest.choices.forEach((choice) => {
        const shouldShow = !choice.unlock ||
            (choice.unlock === "strength" && state.hero.strength > choice.check) ||
            (choice.unlock === "wisdom" && state.hero.wisdom > choice.check) ||
            (choice.unlock === "charisma" && state.hero.charisma > choice.check);

        if (!shouldShow) {
            return;
        }

        const button = document.createElement("button");
        button.type = "button";
        button.textContent = choice.label;
        button.onclick = () => applyChoice(choice);
        container.appendChild(button);
    });
}

function applyChoice(choice) {
    syncHeroFromInputs();

    if (choice.effect.gold !== undefined) {
        state.resources.gold += choice.effect.gold;
    }
    if (choice.effect.army !== undefined) {
        state.resources.army += choice.effect.army;
    }
    if (choice.effect.food !== undefined) {
        state.resources.food += choice.effect.food;
    }

    state.resources.day += 1;
    state.history.push(choice.note || "Решение принято.");

    if (choice.finalWin) {
        state.hiddenVictoryUnlocked = true;
    }

    state.questIndex += 1;
    saveState();
    render();
}

function renderLeaderboard() {
    const list = document.getElementById("leaderboard-list");
    list.innerHTML = "";

    state.history.slice(-3).reverse().forEach((entry) => {
        const li = document.createElement("li");
        li.textContent = entry;
        list.appendChild(li);
    });
}

function render() {
    syncHeroFromInputs();
    updateHeroInputs();
    updateResources();
    updateInventory();
    renderQuestChoices();
    renderLeaderboard();
    saveState();
}

window.addEventListener("DOMContentLoaded", () => {
    const loaded = loadState();
    Object.assign(state, loaded);
    render();

    document.getElementById("hero-name").addEventListener("input", render);
    document.getElementById("hero-strength").addEventListener("input", render);
    document.getElementById("hero-wisdom").addEventListener("input", render);
    document.getElementById("hero-charisma").addEventListener("input", render);
});