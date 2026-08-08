"use strict";

// Все изменяемые данные игры находятся в одном объекте.
const INITIAL_STATE = {
    day: 1, maxDays: 30, walls: 100, mana: 80, warmth: 90,
    gold: 100, food: 75, wood: 2, coal: 3, potions: 2,
    raidTimer: 5, gameOver: false, eventPending: false
};

let state = {};
let hero = {};
let buildings = {};
let creationPoints = 5;
let weather = { name: "Ясно", icon: "☀️", cold: 8 };
let history = [];

const $ = (id) => document.getElementById(id);
const random = (items) => items[Math.floor(Math.random() * items.length)];
const clamp = (number, min = 0, max = 100) => Math.max(min, Math.min(max, number));

const classInfo = {
    knight: { title: "Рыцарь", bonus: "Набеги наносят на 25% меньше урона." },
    mage: { title: "Маг", bonus: "Все заклинания требуют на 5 маны меньше." },
    merchant: { title: "Купец", bonus: "Товары на рынке стоят на 25% дешевле." }
};

function resetGame() {
    state = { ...INITIAL_STATE };
    hero = { name: "Правитель", class: "knight", strength: 0, wisdom: 0, charisma: 0 };
    buildings = { tower: false, greenhouse: false, barracks: false };
    creationPoints = 5;
    weather = { name: "Ясно", icon: "☀️", cold: 8 };
    history = [];
}

// Переключение экранов
function showScreen(id) {
    ["menu-screen", "creation-screen", "game-screen"].forEach((screen) => {
        $(screen).classList.toggle("hidden", screen !== id);
    });
}

function openCreation() {
    resetGame();
    hero.name = $("nickname").value.trim().slice(0, 18) || "Безымянный";
    updateCreationUI();
    showScreen("creation-screen");
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
    if (hero.class === "knight") hero.strength += 2;
    if (hero.class === "mage") hero.wisdom += 2;
    if (hero.class === "merchant") state.gold += 60;

    showScreen("game-screen");
    addHistory(`День 1: ${hero.name} принимает власть над цитаделью.`);
    setEvent("Первый день правления", "Разведчики сообщают: ледяная орда близко. У вас есть пять дней до первого набега.");
    updateUI();
}

// Локации: каждая даёт базовую награду и иногда запускает событие с выбором.
const locationEvents = {
    castle: [
        { title: "Просьба кузнеца", text: "Кузнец предлагает перековать старые ворота.", choices: [
            ["Заплатить 25 золота: +18 стен", () => pay({ gold: 25 }, () => change({ walls: 18 }), "Не хватает золота.")],
            ["Попросить добровольцев: +8 стен", () => change({ walls: 8 })]
        ]},
        { title: "Спор советников", text: "Совет не может решить, чему отдать приоритет.", choices: [
            ["Усилить оборону: +10 стен", () => change({ walls: 10 })],
            ["Поддержать магов: +18 маны", () => change({ mana: 18 })]
        ]},
        { title: "Пленные разведчики", text: "Стража поймала двух вражеских разведчиков у ворот.", choices: [
            ["Допросить силой", () => hero.strength >= 4 ? change({ gold: 25 }) : change({ warmth: -6 })],
            ["Убедить перейти на нашу сторону", () => hero.charisma >= 4 ? change({ walls: 18, food: 10 }) : change({ walls: 5 })]
        ]}
    ],
    forest: [
        { title: "Волчья стая", text: "Стая окружила лесорубов. Как поступить?", choices: [
            ["Вступить в бой", () => hero.strength >= 3 ? change({ wood: 3 }) : change({ warmth: -12, wood: 2 })],
            ["Отступить без риска", () => change({ wood: 1 })]
        ]},
        { title: "Замёрзший путник", text: "У дороги лежит путник. Ему нужна еда.", choices: [
            ["Дать 10 еды", () => pay({ food: 10 }, () => { change({ gold: 22 }); addHistory("Спасённый путник оказался богатым картографом."); }, "Не хватает еды.")],
            ["Пройти мимо", () => addHistory("Вы оставили путника в лесу.")]
        ]},
        { title: "Древнее дерево", text: "В корнях мерцают синие руны.", choices: [
            ["Изучить руны", () => hero.wisdom >= 3 ? change({ mana: 25 }) : change({ mana: 10, warmth: -8 })],
            ["Срубить дерево: +4 дрова", () => change({ wood: 4 })]
        ]},
        { title: "Лагерь браконьеров", text: "Браконьеры вырубают заповедную рощу и прячут добычу.", choices: [
            ["Разогнать их силой", () => hero.strength >= 3 ? change({ wood: 5, food: 12 }) : change({ warmth: -10, wood: 2 })],
            ["Предложить службу замку", () => hero.charisma >= 3 ? change({ food: 25 }) : change({ food: 8 })]
        ]}
    ],
    mines: [
        { title: "Обвал в шахте", text: "За завалом остались рабочие и тележка с рудой.", choices: [
            ["Спасти рабочих", () => hero.strength >= 3 ? change({ gold: 30 }) : change({ walls: -8, gold: 12 })],
            ["Забрать руду: +45 золота", () => { change({ gold: 45 }); addHistory("Рабочие не простили это решение."); }]
        ]},
        { title: "Подземное озеро", text: "Вода светится магическим светом.", choices: [
            ["Наполнить резервуары: +30 маны", () => change({ mana: 30 })],
            ["Не рисковать: +2 угля", () => change({ coal: 2 })]
        ]},
        { title: "Спящий каменный червь", text: "Огромное существо лежит прямо на богатой угольной жиле.", choices: [
            ["Прогнать силой", () => hero.strength >= 5 ? change({ coal: 6, gold: 20 }) : change({ walls: -10, coal: 2 })],
            ["Усыпить рунами", () => hero.wisdom >= 4 ? change({ coal: 5, mana: 12 }) : change({ mana: -12, coal: 1 })]
        ]}
    ],
    village: [
        { title: "Праздник урожая", text: "Крестьяне делятся последними запасами.", choices: [
            ["Принять 25 еды", () => change({ food: 25 })],
            ["Заплатить 15 золота: получить 40 еды", () => pay({ gold: 15 }, () => change({ food: 40 }), "Не хватает золота.")]
        ]},
        { title: "Беглые солдаты", text: "Несколько солдат просят впустить их в цитадель.", choices: [
            ["Принять: −12 еды, +12 стен", () => pay({ food: 12 }, () => change({ walls: 12 }), "Не хватает еды.")],
            ["Отказать", () => addHistory("Солдаты ушли на юг.")]
        ]},
        { title: "Пропавшие дети", text: "Трое детей не вернулись из снежной долины до темноты.", choices: [
            ["Возглавить поиски", () => hero.strength >= 3 ? change({ food: 18, warmth: -5 }) : change({ warmth: -18 })],
            ["Организовать жителей", () => hero.charisma >= 3 ? change({ food: 25 }) : change({ food: 6 })]
        ]},
        { title: "Болезнь в деревне", text: "Неизвестная лихорадка охватила несколько домов.", choices: [
            ["Исследовать лекарство", () => hero.wisdom >= 4 ? change({ potions: 2, food: 15 }) : change({ potions: -1, food: 5 })],
            ["Отправить припасы: −15 еды", () => pay({ food: 15 }, () => change({ gold: 25 }), "Не хватает еды для помощи.")]
        ]},
        { title: "Сломанная мельница", text: "Без мельницы деревня скоро останется без муки.", choices: [
            ["Отдать 2 дерева на ремонт", () => pay({ wood: 2 }, () => change({ food: 35 }), "Не хватает дерева.")],
            ["Найти мастеров словами", () => hero.charisma >= 4 ? change({ food: 28 }) : change({ food: 8 })]
        ]},
        { title: "Вражеский лазутчик", text: "Селяне заметили незнакомца, который зарисовывал дорогу к замку.", choices: [
            ["Поймать лазутчика", () => hero.strength >= 3 ? change({ walls: 15, gold: 10 }) : change({ walls: -5 })],
            ["Передать ему ложные сведения", () => hero.wisdom >= 3 ? change({ walls: 20 }) : change({ walls: 3 })]
        ]},
        { title: "Беженцы с севера", text: "У ворот деревни собрались люди, спасшиеся от ледяной орды.", choices: [
            ["Принять всех: −20 еды, +25 стен", () => pay({ food: 20 }, () => change({ walls: 25 }), "Не хватает еды.")],
            ["Уговорить охотников служить", () => hero.charisma >= 5 ? change({ walls: 20, food: 12 }) : change({ walls: 6 })]
        ]}
    ],
    ruins: [
        { title: "Запечатанный алтарь", text: "Надпись обещает силу тому, кто отдаст тепло.", choices: [
            ["Коснуться алтаря: −20 тепла, +35 маны", () => change({ warmth: -20, mana: 35 })],
            ["Разобрать камни: +2 дерева, +18 золота", () => change({ wood: 2, gold: 18 })]
        ]},
        { title: "Призрак королевы", text: "Дух задаёт загадку о старом королевстве.", choices: [
            ["Ответить с помощью мудрости", () => hero.wisdom >= 4 ? change({ potions: 2, mana: 20 }) : change({ mana: -15 })],
            ["Уйти", () => addHistory("Тайна руин осталась неразгаданной.")]
        ]},
        { title: "Ледяной голем", text: "Страж руин преграждает дорогу к сокровищу.", choices: [
            ["Сразиться", () => hero.strength >= 4 ? change({ gold: 55 }) : change({ walls: -12, gold: 20 })],
            ["Отвлечь магией: −18 маны, +35 золота", () => pay({ mana: 18 }, () => change({ gold: 35 }), "Не хватает маны.")]
        ]},
        { title: "Зеркало прошлого", text: "В разбитом зеркале видна грядущая атака на цитадель.", choices: [
            ["Расшифровать видение", () => hero.wisdom >= 5 ? change({ walls: 28, mana: 15 }) : change({ mana: -10, walls: 8 })],
            ["Продать осколки: +30 золота", () => change({ gold: 30 })]
        ]}
    ]
};

// Эти события могут произойти в любой части владений между обычными путешествиями.
const worldEvents = [
    { title: "☃️ Атака живых снеговиков", text: "Заколдованные снеговики закидали цитадель ледяными глыбами. Тепло стремительно уходит!", choices: [
        ["Растопить огнём: −20 маны", () => state.mana >= 20 ? pay({ mana: 20 }, () => change({ warmth: -5 }), "") : change({ warmth: -30 })],
        ["Разбить снеговиков", () => hero.strength >= 4 ? change({ warmth: -10, walls: -3 }) : change({ warmth: -30, walls: -8 })]
    ]},
    { title: "🌬️ Дыра в отопительных трубах", text: "Ледяной ветер проникает прямо в жилые покои.", choices: [
        ["Починить: −2 дерева", () => state.wood >= 2 ? pay({ wood: 2 }, () => change({ warmth: 5 }), "") : change({ warmth: -18 })],
        ["Закрыть крыло замка", () => change({ warmth: -12 })]
    ]},
    { title: "🦅 Весть от разведчиков", text: "Орда меняет путь. Разведчики предлагают устроить засаду.", choices: [
        ["Возглавить засаду", () => hero.strength >= 4 ? change({ gold: 30, walls: 12 }) : change({ walls: -10 })],
        ["Составить хитрый план", () => hero.wisdom >= 4 ? change({ walls: 22 }) : change({ walls: 5 })]
    ]},
    { title: "🎭 Бродячие артисты", text: "Артисты хотят выступить перед уставшими защитниками.", choices: [
        ["Впустить бесплатно", () => change({ warmth: 14, food: -8 })],
        ["Собрать пожертвования", () => hero.charisma >= 4 ? change({ gold: 28, warmth: 8 }) : change({ gold: 10 })]
    ]},
    { title: "🐉 Тень над башнями", text: "Молодой ледяной дракон кружит над замком и требует дань.", choices: [
        ["Сразиться с драконом", () => hero.strength >= 6 ? change({ gold: 60, walls: -5 }) : change({ walls: -22 })],
        ["Понять язык драконов", () => hero.wisdom >= 6 ? change({ mana: 35, gold: 20 }) : change({ gold: -25 })],
        ["👑 Убедить напасть на орду (нужно 6 харизмы)", () => hero.charisma >= 6 ? change({ walls: 35 }) : change({ food: -15 })]
    ]},
    { title: "🌾 Замёрзший склад", text: "Часть провианта покрылась льдом и скоро испортится.", choices: [
        ["Отогреть склад: −12 маны", () => state.mana >= 12 ? pay({ mana: 12 }, () => change({ food: 5 }), "") : change({ food: -18 })],
        ["Спасти что возможно", () => change({ food: -10 })]
    ]}
];

function visitLocation(location) {
    if (!canAct()) return;
    if (location === "market") return openMarket();

    const baseRewards = {
        castle: { warmth: 20, walls: 8 }, forest: { wood: 2 },
        mines: { coal: 2, gold: 14 }, village: { food: 16 }, ruins: { mana: 12, gold: 8 }
    };
    change(baseRewards[location]);
    nextDay();
    if (state.gameOver) return;
    if (state.eventPending) {
        updateUI();
        return;
    }

    // В большинстве путешествий появляется дополнительный выбор.
    if (Math.random() < 0.78) {
        const locationSkills = {
            castle: "charisma",
            forest: "strength",
            mines: "wisdom",
            village: "charisma",
            ruins: "wisdom"
        };
        showEvent(random(locationEvents[location]), locationSkills[location]);
    } else {
        const names = { castle: "Цитадель", forest: "Лес", mines: "Шахты", village: "Деревня", ruins: "Руины" };
        setEvent(names[location], "Путешествие прошло спокойно. Базовые ресурсы добавлены в запасы.");
    }
    updateUI();
}

function showEvent(event, skill = "wisdom") {
    state.eventPending = true;
    setEvent(event.title, event.text, makeThreeChoices(event.choices, skill));
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

function setEvent(title, text, choices = []) {
    $("event-title").textContent = title;
    $("event-text").textContent = text;
    const box = $("event-choices");
    box.innerHTML = "";
    choices.forEach(([label, action]) => {
        const button = document.createElement("button");
        button.textContent = label;
        button.addEventListener("click", () => {
            const before = snapshotResources();
            action();
            state.eventPending = false;
            box.innerHTML = "";
            $("event-text").textContent = describeResult(before);
            checkEnding();
            updateUI();
        }, { once: true });
        box.appendChild(button);
    });
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
    const classDiscount = hero.class === "merchant" ? 0.25 : 0;
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
    $("event-choices").querySelectorAll("button").forEach((button, index) => {
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
    // Мировое событие не перекрывает сообщение о набеге.
    if (!raidIsDue && Math.random() < 0.30) {
        const event = random(worldEvents);
        showEvent(event, worldEventSkill(event.title));
    }
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
    if (hero.class === "knight") damage = Math.round(damage * 0.75);
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
    const cost = Math.max(5, chosen.cost - (hero.class === "mage" ? 5 : 0));
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
    state.walls = Math.max(0, state.walls);
    $("ending-title").textContent = victory ? "🏆 Цитадель спасена!" : "💀 Цитадель пала";
    $("ending-text").textContent = `${text} Вы продержались ${state.day} дней.`;
    $("ending").classList.remove("hidden");
    saveScore(state.day, victory);
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
}

function readScores() {
    try { return JSON.parse(localStorage.getItem("citadel_scores")) || []; }
    catch { return []; }
}

function renderLeaderboard() {
    const scores = readScores().slice(0, 5);
    $("leaderboard").innerHTML = scores.length
        ? scores.map((score) => `<li>${escapeHtml(score.name)} — ${score.days} дн. ${score.victory ? "🏆" : ""}</li>`).join("")
        : "<li>Здесь появится первый рекорд.</li>";
}

function escapeHtml(text) {
    const element = document.createElement("span");
    element.textContent = text;
    return element.innerHTML;
}

let toastTimer;
function showToast(text) {
    clearTimeout(toastTimer);
    $("toast").textContent = text;
    $("toast").classList.add("show");
    toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2200);
}

function updateUI() {
    $("hero-name").textContent = `${hero.name} — ${classInfo[hero.class].title}`;
    $("class-bonus").textContent = classInfo[hero.class].bonus;
    $("hero-strength").textContent = hero.strength;
    $("hero-wisdom").textContent = hero.wisdom;
    $("hero-charisma").textContent = hero.charisma;
    $("day").textContent = `${state.day} / ${state.maxDays}`;
    $("weather").textContent = `${weather.icon} ${weather.name}`;
    ["gold", "food", "wood", "coal", "potions"].forEach((key) => $(key).textContent = state[key]);
    ["walls", "mana", "warmth"].forEach((key) => {
        const value = clamp(state[key]);
        $(key + "-label").textContent = `${value}%`;
        $(key + "-bar").style.width = `${value}%`;
    });
    $("raid-timer").textContent = state.raidTimer;

    const names = { tower: "🔮 Магическая башня", greenhouse: "🌿 Теплица", barracks: "⚔️ Казармы" };
    const built = Object.keys(buildings).filter((key) => buildings[key]);
    $("buildings-list").innerHTML = built.length ? built.map((key) => `<li>${names[key]}</li>`).join("") : "<li>Пока ничего</li>";
    document.querySelectorAll(".build").forEach((button) => {
        const isBuilt = buildings[button.dataset.building];
        button.classList.toggle("done", isBuilt);
        button.disabled = isBuilt;
    });
    $("history").innerHTML = history.map((entry) => `<li>${entry}</li>`).join("");
}

// Подключение кнопок в одном месте — в HTML нет игровой логики.
$("open-creation").addEventListener("click", openCreation);
$("back-to-menu").addEventListener("click", () => showScreen("menu-screen"));
$("start-game").addEventListener("click", startGame);
$("restart").addEventListener("click", () => {
    $("ending").classList.add("hidden");
    renderLeaderboard();
    showScreen("menu-screen");
});
$("use-potion").addEventListener("click", usePotion);
document.querySelectorAll(".class-card").forEach((button) => button.addEventListener("click", () => chooseClass(button.dataset.class)));
document.querySelectorAll("[data-stat]").forEach((button) => button.addEventListener("click", () => addStat(button.dataset.stat)));
document.querySelectorAll("[data-location]").forEach((button) => button.addEventListener("click", () => visitLocation(button.dataset.location)));
document.querySelectorAll("[data-spell]").forEach((button) => button.addEventListener("click", () => castSpell(button.dataset.spell)));
document.querySelectorAll("[data-building]").forEach((button) => button.addEventListener("click", () => build(button.dataset.building)));

resetGame();
renderLeaderboard();
