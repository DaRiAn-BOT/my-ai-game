"use strict";

// Основная игровая механика.
function showScreen(id) {
    ["menu-screen", "auth-screen", "about-screen", "hall-screen", "creation-screen", "game-screen"].forEach((screen) => {
        $(screen).classList.toggle("hidden", screen !== id);
    });
    if (id === "game-screen" && typeof drawPlayer === "function") {
        requestAnimationFrame(drawPlayer);
    }
}

function openCreation() {
    resetGame();
    hero.name = userLabel().slice(0, 18);
    updateCreationUI();
    showScreen("creation-screen");
}

function playGame() {
    if (!currentUser) return openAuth("login");
    if (loadGame()) {
        state.eventPending = false;
        if (typeof generateMap === "function") generateMap(currentBiome);
        showScreen("game-screen");
        setEvent("Игра восстановлена", "Вы продолжаете с момента последнего сохранения.");
        updateUI();
    } else {
        openCreation();
    }
}

function chooseClass(className) {
    hero.class = className;
    document.querySelectorAll(".class-card").forEach((card) => {
        card.classList.toggle("selected", card.dataset.class === className);
    });
}

function addStat(stat) {
    if (creationPoints <= 0) return showToast("Все очки уже распределены.");
    hero[stat] += 1;
    creationPoints -= 1;
    updateCreationUI();
}

function updateCreationUI() {
    $("points-left").textContent = creationPoints;
    ["strength", "wisdom", "charisma"].forEach((stat) => {
        $("stat-" + stat).textContent = hero[stat];
    });
}

function startGame() {
    if (creationPoints > 0) return showToast("Сначала распределите все 5 очков.");
    if (hero.class === "knight") state.warmth = clamp(state.warmth + 15);
    if (hero.class === "merchant") state.gold += 20;

    if (typeof generateMap === "function") generateMap(currentBiome);
    showScreen("game-screen");
    addHistory(`День 1: ${hero.name} принимает власть над цитаделью.`);
    setEvent("Первый день правления", "Разведчики сообщают: ледяная орда близко. У вас есть пять дней до первого набега.");
    updateUI();
}

// Выбор локации — это только переход на её карту. День тратится на решение
// найденного события, а не на нажатие кнопки локации.
function visitLocation(location) {
    if (!canAct()) return;
    state.eventPending = false;
    clearEventBoard();
    updateUI();
}

function showEvent(event, skill = "wisdom") {
    state.eventPending = true;
    setEventModal(event.title, event.text, makeThreeChoices(event.choices, skill));
    addHistory(`День ${state.day}: ${event.title}.`);
}

// У каждого случайного события два обычных решения и третье — проверка характеристики.
function makeThreeChoices(choices, skill) {
    const result = choices.slice(0, 3);
    if (result.length === 3) return result;

    const specialChoices = {
        strength: [`💪 Особый выбор — решить силой (нужно 4, у вас ${hero.strength})`, () => statChoice("strength", 4, { walls: 14, food: 10 }, { warmth: -12, walls: -4 })],
        wisdom: [`🧠 Особый выбор — найти мудрое решение (нужно 4, у вас ${hero.wisdom})`, () => statChoice("wisdom", 4, { mana: 22, gold: 12 }, { mana: -12, warmth: -5 })],
        charisma: [`👑 Особый выбор — убедить людей (нужно 4, у вас ${hero.charisma})`, () => statChoice("charisma", 4, { food: 20, gold: 15 }, { food: -7 })]
    };
    result.push(specialChoices[skill]);
    return result;
}

function statChoice(skill, required, success, failure) {
    if (hero[skill] >= required) {
        change(success);
        addHistory(`Особое решение удалось: проверка характеристики ${hero[skill]}/${required}.`);
    } else {
        change(failure);
        addHistory(`Особое решение провалено: характеристика ${hero[skill]}/${required}.`);
    }
}

function clearEventBoard() {
    $("event-board").classList.add("is-empty");
    $("event-title").textContent = "";
    $("event-text").textContent = "";
    const choicesBox = $("choices-container");
    choicesBox.replaceChildren();
    choicesBox.classList.remove("has-choices");
}

function setEvent(title, text, choices = []) {
    clearEventBoard();
    $("event-board").classList.remove("is-empty");
    $("event-title").textContent = title;
    $("event-text").textContent = text;
    const box = $("choices-container");
    box.replaceChildren();
    box.classList.toggle("has-choices", choices.length > 0);
    choices.forEach(([label, action]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "event-choice-button";
        button.textContent = label;
        button.addEventListener("click", () => {
            const before = snapshotResources();
            action();
            state.eventPending = false;
            box.replaceChildren();
            box.classList.remove("has-choices");
            $("event-text").textContent = describeResult(before);
            checkEnding();
            updateUI();
        }, { once: true });
        box.appendChild(button);
    });
}

// Полноценное модальное окно для событий, найденных у ключевых объектов локации.
function setEventModal(title, text, choices = []) {
    const modal = $("event-modal");
    const box = $("event-modal-choices");
    $("event-modal-title").textContent = title;
    $("event-modal-text").textContent = text;
    box.replaceChildren();
    choices.forEach(([label, action]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "event-modal-choice";
        button.textContent = label;
        button.addEventListener("click", () => {
            const before = snapshotResources();
            action();
            const result = describeResult(before);
            const raidWasDue = state.raidTimer <= 1;
            state.eventPending = false;
            modal.classList.add("hidden");
            nextDay();
            // Набег важнее обычного сообщения о результате: он уже выводится nextDay().
            if (!state.gameOver && !raidWasDue) setEvent(title, `${result} Прошёл 1 день.`);
            updateUI();
        }, { once: true });
        box.appendChild(button);
    });
    modal.classList.remove("hidden");
}

function snapshotResources() {
    return Object.fromEntries(["walls", "mana", "warmth", "gold", "food", "wood", "coal", "potions"].map((key) => [key, state[key]]));
}

function describeResult(before) {
    const names = { walls: "стены", mana: "мана", warmth: "тепло", gold: "золото", food: "еда", wood: "дрова", coal: "уголь", potions: "эликсиры" };
    const changes = Object.keys(before).map((key) => [key, state[key] - before[key]]).filter(([, amount]) => amount !== 0);
    if (!changes.length) return "Решение принято. Запасы не изменились.";
    return "Результат: " + changes.map(([key, amount]) => `${names[key]} ${amount > 0 ? "+" : ""}${amount}`).join(", ") + ".";
}

// Рынок тоже является ходом, но покупок за одно посещение можно сделать несколько.
function openMarket() {
    if (!canAct()) return;
    nextDay();
    if (state.gameOver) return;
    if (state.eventPending) {
        updateUI();
        return;
    }
    // Харизма снижает цены на 4% за очко (максимум на 20%).
    const charismaDiscount = Math.min(hero.charisma * 0.04, 0.20);
    const classDiscount = 0;
    const discount = Math.max(0.55, 1 - charismaDiscount - classDiscount);
    const price = (base) => Math.ceil(base * discount);
    state.eventPending = true;
    setEvent("Рынок цитадели", "Покупайте сколько нужно. Когда закончите, закройте рынок.", [
        [`Купить 30 еды — ${price(24)} золота`, () => marketBuy(price(24), { food: 30 })],
        [`Купить 4 дерева — ${price(30)} золота`, () => marketBuy(price(30), { wood: 4 })],
        [`Купить эликсир — ${price(35)} золота`, () => marketBuy(price(35), { potions: 1 })],
        ["Закрыть рынок", () => setEvent("Рынок закрыт", "Торговцы собирают палатки до следующего визита.")]
    ]);
    // Покупки не закрывают окно; отдельная кнопка завершает торговлю.
    $("choices-container").querySelectorAll("button").forEach((button, index) => {
        if (index < 3) {
            const replacement = button.cloneNode(true);
            replacement.addEventListener("click", () => {
                const purchases = [{ food: 30 }, { wood: 4 }, { potions: 1 }];
                const prices = [price(24), price(30), price(35)];
                marketBuy(prices[index], purchases[index]);
            });
            button.replaceWith(replacement);
        }
    });
    updateUI();
}

function marketBuy(cost, reward) {
    if (state.gold < cost) return showToast("В казне недостаточно золота.");
    const before = snapshotResources();
    state.gold -= cost;
    change(reward);
    addHistory(`На рынке потрачено ${cost} золота.`);
    $("event-text").textContent = describeResult(before) + " Можно продолжить покупки или закрыть рынок.";
    updateUI();
}

// Один ход расходует припасы, меняет погоду и приближает набег.
function nextDay() {
    state.day += 1;
    state.raidTimer -= 1;
    state.food -= buildings.greenhouse ? 5 : 9;
    state.warmth -= weather.cold;
    state.mana += buildings.tower ? 13 : 5;
    if (state.coal > 0 && state.warmth < 45) {
        state.coal -= 1;
        state.warmth += 18;
        addHistory("Кочегары сожгли 1 уголь и согрели замок.");
    }
    state.mana = clamp(state.mana);
    state.warmth = clamp(state.warmth);
    if (state.food < 0) {
        state.food = 0;
        state.walls -= 8;
        addHistory("Голод ослабил защитников: −8 стен.");
    }
    if (state.warmth <= 0) {
        state.walls -= 10;
        addHistory("Лютый холод повредил укрепления: −10 стен.");
    }
    if (state.day % 3 === 0) changeWeather();
    const raidIsDue = state.raidTimer <= 0;
    if (raidIsDue) raid();
    checkEnding();
}

function worldEventSkill(title) {
    if (title.includes("снеговик") || title.includes("труб") || title.includes("склад")) return "wisdom";
    if (title.includes("разведчик")) return "strength";
    return "charisma";
}

function changeWeather() {
    weather = random([
        { name: "Ясно", icon: "☀️", cold: 7 },
        { name: "Снегопад", icon: "🌨️", cold: 12 },
        { name: "Ледяная буря", icon: "❄️", cold: 18 },
        { name: "Северное сияние", icon: "🌌", cold: 6 }
    ]);
    if (weather.name === "Северное сияние") state.mana = clamp(state.mana + 12);
    addHistory(`Погода изменилась: ${weather.name}.`);
}

function raid() {
    const raidNumber = Math.floor((state.day - 1) / 5);
    let damage = 17 + raidNumber * 5 - hero.strength * 2;
    if (buildings.barracks) damage -= 8;
    damage = Math.max(5, damage);
    state.walls -= damage;
    state.raidTimer = 5;
    setEvent("🚨 Набег ледяной орды!", `Защитники отбили атаку, но стены получили ${damage} урона.`);
    addHistory(`День ${state.day}: набег нанёс ${damage} урона стенам.`);
}

// Действия, которые не тратят день.
function castSpell(spell) {
    if (!canAct()) return;
    const spells = {
        shield: { cost: 20, result: { walls: 25 + hero.wisdom * 2 }, text: "Ледяной щит укрепил стены." },
        fire: { cost: 25, result: { warmth: 35 + hero.wisdom * 2 }, text: "Живое пламя согрело цитадель." },
        feast: { cost: 35, result: { food: 28 + hero.wisdom * 2 }, text: "На столах появилась еда." }
    };
    const chosen = spells[spell];
    const cost = chosen.cost;
    if (state.mana < cost) return showToast(`Нужно ${cost} маны.`);
    state.mana -= cost;
    change(chosen.result);
    setEvent("Заклинание сотворено", `${chosen.text} Потрачено ${cost} маны.`);
    addHistory(chosen.text);
    updateUI();
}

function usePotion() {
    if (!canAct()) return;
    if (state.potions <= 0) return showToast("Эликсиры закончились.");
    if (state.warmth >= 100) return showToast("В замке и так достаточно тепло.");
    state.potions -= 1;
    change({ warmth: 35 });
    setEvent("Эликсир тепла", "По телу разлилось тепло: +35 тепла.");
    updateUI();
}

function build(type) {
    if (!canAct()) return;
    if (buildings[type]) return showToast("Эта постройка уже возведена.");
    const costs = {
        tower: { gold: 70, wood: 2 }, greenhouse: { gold: 60, wood: 3 }, barracks: { gold: 80, wood: 3 }
    };
    const names = { tower: "Магическая башня", greenhouse: "Теплица", barracks: "Казармы" };
    pay(costs[type], () => {
        buildings[type] = true;
        setEvent("Строительство завершено", `${names[type]} теперь помогает обороне цитадели.`);
        addHistory(`Построено: ${names[type]}.`);
    }, "Для строительства не хватает ресурсов.");
    updateUI();
}

function pay(cost, onSuccess, errorText) {
    const enough = Object.entries(cost).every(([key, amount]) => state[key] >= amount);
    if (!enough) return showToast(errorText);
    Object.entries(cost).forEach(([key, amount]) => state[key] -= amount);
    onSuccess();
}

function change(values) {
    Object.entries(values).forEach(([key, amount]) => state[key] += amount);
    state.walls = clamp(state.walls);
    state.mana = clamp(state.mana);
    state.warmth = clamp(state.warmth);
    ["gold", "food", "wood", "coal", "potions"].forEach((key) => state[key] = Math.max(0, state[key]));
}

function canAct() {
    if (state.gameOver) return false;
    if (state.eventPending) {
        showToast("Сначала выберите решение в текущем событии.");
        return false;
    }
    return true;
}

function checkEnding() {
    if (state.gameOver) return;
    if (state.walls <= 0) return endGame(false, "Стены разрушены, и ледяная орда захватила цитадель.");
    if (state.day >= state.maxDays) return endGame(true, "Тридцатый рассвет озарил целые стены. Вражеская армия отступила на север!");
}

function endGame(victory, text) {
    state.gameOver = true;
    state.eventPending = false;
    state.walls = Math.max(0, state.walls);
    $("event-modal").classList.add("hidden");
    $("shop-modal").classList.add("hidden");
    $("ending-title").textContent = victory ? "🏆 Цитадель спасена!" : "💀 Цитадель пала";
    $("ending-text").textContent = `${text} Вы продержались ${state.day} дней.`;
    $("ending").classList.remove("hidden");
    saveScore(state.day, victory);
    clearGameSave();
    updateUI();
}

function addHistory(text) {
    history.unshift(text);
    history = history.slice(0, 12);
}

function saveScore(days, victory) {
    const scores = readScores();
    scores.push({ name: hero.name, days, victory, savedAt: Date.now() });
    localStorage.setItem("citadel_scores", JSON.stringify(scores.sort((a, b) => b.days - a.days).slice(0, 10)));
    void saveGlobalScore(days, victory);
}

function readScores() {
    try { return JSON.parse(localStorage.getItem("citadel_scores")) || []; }
    catch { return []; }
}

async function saveGlobalScore(days, victory) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session?.user) return;

    const record = {
        user_id: session.user.id,
        display_name: String(hero.name || "Правитель").trim().slice(0, 24) || "Правитель",
        days: Math.max(1, Math.min(30, Math.round(days))),
        victory: Boolean(victory),
        achieved_at: new Date().toISOString()
    };
    const { error } = await supabaseClient.from("leaderboard").upsert(record, { onConflict: "user_id" });
    if (error) {
        console.warn("Не удалось сохранить общий рекорд:", error.message);
        return;
    }
    if (!$("hall-screen").classList.contains("hidden")) void renderLeaderboard();
}

async function renderLeaderboard() {
    const list = $("leaderboard");
    list.innerHTML = "<li>Загружаем общий рейтинг…</li>";

    const { data, error } = await supabaseClient
        .from("leaderboard")
        .select("display_name, days, victory, achieved_at")
        .order("victory", { ascending: false })
        .order("days", { ascending: false })
        .order("achieved_at", { ascending: true })
        .limit(10);

    if (error) {
        const localScores = readScores().slice(0, 5);
        list.innerHTML = localScores.length
            ? localScores.map(renderScore).join("") + "<li class=\"leaderboard-note\">Общий рейтинг пока недоступен.</li>"
            : "<li>Общий рейтинг пока недоступен.</li>";
        console.warn("Не удалось загрузить общий рейтинг:", error.message);
        return;
    }

    list.innerHTML = data.length
        ? data.map(renderScore).join("")
        : "<li>Здесь появится первый рекорд.</li>";
}

function renderScore(score) {
    return `<li>${escapeHtml(score.display_name || score.name)} — ${score.days} дн. ${score.victory ? "🏆" : ""}</li>`;
}

function escapeHtml(text) {
    const element = document.createElement("span");
    element.textContent = text;
    return element.innerHTML;
}
