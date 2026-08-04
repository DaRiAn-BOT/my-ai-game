const STORAGE_KEY = "kingdom-chronicles-save";

const createDefaultState = () => ({ gold: 100, army: 50, food: 80, day: 1 });

let state = createDefaultState();

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
    }
];

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        if (!saved || typeof saved !== "object") {
            return createDefaultState();
        }

        return {
            ...createDefaultState(),
            ...saved
        };
    } catch {
        return createDefaultState();
    }
}

function clearSavedState() {
    localStorage.removeItem(STORAGE_KEY);
}

function updateUI() {
    document.getElementById("gold").innerText = state.gold;
    document.getElementById("army").innerText = state.army;
    document.getElementById("food").innerText = state.food;
    document.getElementById("day").innerText = state.day;
}

function showNewEvent() {
    if (state.gold <= 0 || state.army <= 0 || state.food <= 0) {
        endGame();
        return;
    }

    const randomEvent = events[Math.floor(Math.random() * events.length)];
    document.getElementById("event-text").innerText = randomEvent.text;

    const container = document.getElementById("choices-container");
    container.innerHTML = "";

    randomEvent.choices.forEach((choice) => {
        const btn = document.createElement("button");
        btn.innerText = choice.text;
        btn.onclick = () => {
            state.gold += choice.effect.gold;
            state.army += choice.effect.army;
            state.food += choice.effect.food;
            state.day += 1;

            saveState();
            updateUI();
            showNewEvent();
        };
        container.appendChild(btn);
    });
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

    document.getElementById("main-menu").classList.add("hidden");
    document.getElementById("game-container").classList.remove("hidden");
    document.getElementById("modal-overlay").classList.add("hidden");

    updateUI();
    showNewEvent();
}

function backToMenu() {
    saveState();

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

    document.getElementById("start-game-btn").onclick = () => startGame(false);
    document.getElementById("about-btn").onclick = () => toggleModal(true);
    document.getElementById("close-modal-btn").onclick = () => toggleModal(false);
    document.getElementById("restart-game-btn").onclick = () => startGame(true);
    document.getElementById("back-to-menu-btn").onclick = backToMenu;

    document.getElementById("game-container").classList.add("hidden");
    document.getElementById("modal-overlay").classList.add("hidden");
    document.getElementById("main-menu").classList.remove("hidden");

    updateUI();
};