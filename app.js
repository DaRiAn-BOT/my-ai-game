let state = { walls: 100, mana: 50, warmth: 100, gold: 100, food: 80, day: 1, coal: 3, wood: 2 };
let hero = { strength: 0, wisdom: 0, charisma: 0 };
let explored = { castle: true, forest: false, mines: false, market: true };
let creationPoints = 5;
let artifact = "Нет";

const zoneEvents = {
    castle: [
        {
            text: "В замке мирный день, но Главный Камин догорает. Жители просят выделить ресурсы на обогрев цитадели.",
            choices: [
                { text: "Пусть мерзнут, беречь припасы", req: null, effect: { walls: 0, mana: 5, warmth: -35, gold: 0, food: -5 } },
                { text: "Бросить дрова в камин (-1 дрова, +45% Тепла)", req: null, effect: { walls: 0, mana: 0, warmth: 45, gold: 0, food: 0 }, useWood: true },
                { text: "[Мудрость 2+] Перестроить дымоход, увеличив теплоотдачу без дров (+25% Тепла)", req: { type: "wisdom", val: 2 }, effect: { walls: 0, mana: 5, warmth: 25, gold: 0, food: 0 } }
            ]
        },
        {
            text: "К воротам цитадели прибыл замерзший обоз беженцев из южных земель. Они просят убежища.",
            choices: [
                { text: "Прогнать чужаков обратно в метель", req: null, effect: { walls: 0, mana: 0, gold: 0, food: 0, warmth: 0 } },
                { text: "[Использование Угля] Растопить гостевую башню (-1 Уголь ✏️, +30 к золоту/налогам)", req: null, effect: { walls: 0, mana: 0, gold: 30, food: -20, warmth: 10 }, useCoal: true },
                { text: "[Харизма 3+] Найти легендарную 👑 Корону Королей в архивах замка и экипировать её! (+3 к Харизме)", req: { type: "charisma", val: 3 }, effect: { walls: 0, mana: 10, gold: 0, food: 0, warmth: 0 }, getArtifact: "Корона Королей" }
            ]
        },
        {
            text: "Древний Магический Кристалл в подземелье замка начал пульсировать нестабильной ледяной энергией.",
            choices: [
                { text: "Игнорировать сияние кристалла (Риск взрыва магии)", req: null, effect: { walls: -15, mana: -20, gold: 0, food: 0, warmth: -10 } },
                { text: "[Магия 30%] Поглотить избыток энергии кристалла (+40% Магии 🔮)", req: { type: "mana", val: 30 }, effect: { walls: 0, mana: 40, gold: 0, food: 0, warmth: 0 }, useMana: 30 }
            ]
        }
    ],
    forest: [
        {
            text: "В заснеженном Окрестном Лесу разведчики наткнулись на заброшенный склад лесорубов, но вокруг бродят волки!",
            choices: [
                { text: "Вступить в бой без подготовки (-20% Стен/Защиты)", req: null, effect: { walls: -20, mana: 0, warmth: -10, gold: 0, food: 20 } },
                { text: "[Сила 3+] Лично возглавить вылазку и отбить склад (+2 дров, +20 еды, найден ⚔️ Стальной Меч!)", req: { type: "strength", val: 3 }, effect: { walls: 0, mana: 5, warmth: -5, gold: 0, food: 20 }, giveWood: 2, getArtifact: "Стальной Меч" }
            ]
        },
        {
            text: "В глуши леса обнаружен древний замёрзший алтарь зимних богов. Его сковал вековой лед.",
            choices: [
                { text: "Осквернить алтарь в поисках спрятанного золота (+40 🪙)", req: null, effect: { walls: -15, mana: -10, warmth: -10, gold: 40, food: 0 } },
                { text: "[Использование Угля] Сжечь уголь на алтаре, чтобы растопить лед (-1 Уголь ✏️, +30% к Магии 🔮)", req: null, effect: { walls: 15, mana: 30, warmth: 20, gold: 0, food: 0 }, useCoal: true }
            ]
        },
        {
            text: "Вы встретили таинственного лесного Отшельника. Он предлагает обучить вас заклинанию за еду.",
            choices: [
                { text: "Отказать старику и уйти", req: null, effect: { walls: 0, mana: 0, warmth: 0, gold: 0, food: 0 } },
                { text: "[Харизма 2+] Очаровать отшельника рассказами о замке (+20% Магии бесплатно)", req: { type: "charisma", val: 2 }, effect: { walls: 0, mana: 20, warmth: 0, gold: 0, food: 0 } }
            ]
        }
    ],
    mines: [
        {
            text: "В Дальних Шахтах гномы нашли новую глубокую жилу! Но проход завален вечной мерзлотой.",
            choices: [
                { text: "Пробить проход кирками (+20 золота)", req: null, effect: { walls: 0, mana: 0, warmth: -10, gold: 20, food: -5 } },
                { text: "[Мудрость 2+] Взорвать породу порохом. Безопасно добыты редкие ресурсы (+2 Угля разведки ✏️, +40 золота)", req: { type: "wisdom", val: 2 }, effect: { walls: 0, mana: 5, warmth: -5, gold: 40, food: 0 }, giveCoal: 2 }
            ]
        },
        {
            text: "В самой глубокой шахте вспыхнул подземный пожар горючих газов. Рабочие в панике.",
            choices: [
                { text: "Завалить этот сектор шахты навсегда (-30 золота прибыли)", req: null, effect: { walls: 0, mana: 0, warmth: 0, gold: -30, food: 0 } },
                { text: "[Использование Угля] Перенаправить пламя в угольные фильтры (-1 Уголь ✏️, +50% Тепла замка)", req: null, effect: { walls: 0, mana: 10, warmth: 50, gold: 20, food: 0 }, useCoal: true }
            ]
        },
        {
            text: "Глубоко под землей шахтеры раскопали 🔮 Магический Кирасирский Кристалл.",
            choices: [
                { text: "Продать кристалл торговцам (+50 золота)", req: null, effect: { walls: 0, mana: -5, warmth: 0, gold: 50, food: 0 } },
                { text: "[Мудрость 3+] Очистить артефакт от руды и экипировать на правителя! (+3 к Мудрости)", req: { type: "wisdom", val: 3 }, effect: { walls: 0, mana: 30, warmth: 0, gold: 0, food: 0 }, getArtifact: "Амулет Знаний" }
            ]
        }
    ]
};
function upgradeStat(statName) {
    if (creationPoints > 0) {
        creationPoints -= 1;
        hero[statName] += 1;
        document.getElementById('creation-gold').innerText = creationPoints;
        document.getElementById(`creation-${statName}`).innerText = hero[statName];
    }
}

function updateUI() {
    document.getElementById('gold').innerText = state.walls;
    document.getElementById('mana').innerText = state.mana;
    document.getElementById('army').innerText = state.warmth;
    document.getElementById('food').innerText = state.gold;
    document.getElementById('day').innerText = state.food;
    document.getElementById('game-day').innerText = state.day;

    document.getElementById('game-strength').innerText = hero.strength;
    document.getElementById('game-wisdom').innerText = hero.wisdom;
    document.getElementById('game-charisma').innerText = hero.charisma;
    
    document.getElementById('slot-1').innerText = `🪵 Дрова: ${state.wood}`;
    document.getElementById('slot-2').innerText = `✏️ Уголь: ${state.coal}`;
    document.getElementById('slot-artifact').innerText = `🎒 Экипировка: ${artifact}`;
}

function openMarket() {
    document.getElementById('event-text').innerText = "⚖️ Вы прибыли на Торговый Рынок Цитадели. Торговцы предлагают выгодный бартер ресурсов:";
    const container = document.getElementById('choices-container');
    container.innerHTML = '';

    // Опция 1: Продать Дрова
    const btn1 = document.createElement('button');
    btn1.innerText = "Продать 1 Дрова 🪵 ➔ Получить 25 Золота 🪙";
    if (state.wood <= 0) { btn1.style.opacity = '0.3'; btn1.style.cursor = 'not-allowed'; }
    else { btn1.onclick = () => { state.wood -= 1; state.gold += 25; updateUI(); openMarket(); }; }

    // Опция 2: Купить Еду
    const btn2 = document.createElement('button');
    btn2.innerText = "Купить Припасы 🌾 ➔ Тратит 20 Золота 🪙 (+20 Еды)";
    if (state.gold < 20) { btn2.style.opacity = '0.3'; btn2.style.cursor = 'not-allowed'; }
    else { btn2.onclick = () => { state.gold -= 20; state.food += 20; updateUI(); openMarket(); }; }

    // Опция 3: Магический согрев за Магию (Использование новой шкалы)
    const btn3 = document.createElement('button');
    btn3.innerText = "🔮 Заклинание Очага ➔ Тратит 25% Магии (+30% Тепла замка)";
    if (state.mana < 25) { btn3.style.opacity = '0.3'; btn3.style.cursor = 'not-allowed'; }
    else { btn3.onclick = () => { state.mana -= 25; state.warmth = Math.min(100, state.warmth + 30); updateUI(); openMarket(); }; }

    container.appendChild(btn1);
    container.appendChild(btn2);
    container.appendChild(btn3);
}

function exploreZone(zoneName) {
    if (!explored[zoneName]) {
        if (state.coal > 0) {
            state.coal -= 1;
            explored[zoneName] = true;
            document.getElementById(`status-${zoneName}`).innerText = "Разведано 📝";
            document.getElementById(`status-${zoneName}`).style.color = "#44ff44";
            document.getElementById('event-text').innerText = "Вы успешно потратили 1 Уголь разведки и зарисовали этот регион на карте. Нажмите на него ещё раз, чтобы запустить случайный квест!";
            document.getElementById('choices-container').innerHTML = '';
            updateUI();
            return;
        } else {
            document.getElementById('event-text').innerText = "⚠️ На складе цитадели нет Угля разведки, чтобы открыть эту местность!";
            document.getElementById('choices-container').innerHTML = '';
            return;
        }
    }
    
    // СЛУЧАЙНЫЙ ВЫБОР СОБЫТИЯ ИЗ ЛОКАЦИИ (Пункт 4)
    const regionEvents = zoneEvents[zoneName];
    const randomEvent = regionEvents[Math.floor(Math.random() * regionEvents.length)];
    
    // Экономика Великой Зимы
    state.warmth = Math.max(0, state.warmth - 12);
    state.food = Math.max(0, state.food - 10);
    state.mana = Math.min(100, state.mana + 5); // Медленное пассивное восстановление магии
    state.day += 1;
    
    if (state.warmth <= 0) state.walls = Math.max(0, state.walls - 20);
    updateUI();
    
    if (state.walls <= 0 || state.food <= 0) { endGame(); return; }

    document.getElementById('event-text').innerText = randomEvent.text;
    const container = document.getElementById('choices-container');
    container.innerHTML = '';

    randomEvent.choices.forEach(choice => {
        let canChoose = true;
        if (choice.useWood && state.wood <= 0) canChoose = false;
        if (choice.useCoal && state.coal <= 0) canChoose = false;
        if (choice.useMana && state.mana < choice.useMana) canChoose = false;
        if (choice.req) {
            let checkVal = hero[choice.req.type] || state[choice.req.type] || 0;
            if (checkVal < choice.req.val) canChoose = false;
        }

        const btn = document.createElement('button');
        btn.innerText = choice.text;
        
        if (!canChoose) {
            btn.style.opacity = '0.3'; btn.style.cursor = 'not-allowed';
            if (choice.useWood) btn.innerText += " 🔒 (Нет дров)";
            else if (choice.useCoal) btn.innerText += " 🔒 (Нет угля)";
            else if (choice.useMana) btn.innerText += " 🔒 (Мало магии)";
            else btn.innerText += " 🔒 (Мало навыков)";
        } else {
            btn.onclick = () => {
                if (choice.useWood) state.wood -= 1;
                if (choice.useCoal) state.coal -= 1;
                if (choice.useMana) state.mana -= choice.useMana;
                if (choice.giveWood) state.wood += choice.giveWood;
                if (choice.giveCoal) state.coal += choice.giveCoal;
                
                // Экипировка Артефактов (Пункт 3)
                if (choice.getArtifact) {
                    artifact = choice.getArtifact;
                    if (artifact === "Стальной Меч") hero.strength += 3;
                    if (artifact === "Амулет Знаний") hero.wisdom += 3;
                    if (artifact === "Корона Королей") hero.charisma += 3;
                }
                
                state.walls = Math.min(100, Math.max(0, state.walls + (choice.effect.walls || 0)));
                state.mana = Math.min(100, Math.max(0, state.mana + (choice.effect.mana || 0)));
                state.warmth = Math.min(100, Math.max(0, state.warmth + (choice.effect.warmth || 0)));
                state.gold = Math.max(0, state.gold + (choice.effect.gold || 0));
                state.food = Math.max(0, state.food + (choice.effect.food || 0));
                
                updateUI();
                document.getElementById('event-text').innerText = "Приказ исполнен. Выберите зону на карте владений для следующего тактического шага.";
                container.innerHTML = '';
            };
        }
        container.appendChild(btn);
    });
}

function endGame() {
    document.getElementById('event-text').innerText = "Ваша Цитадель пала под натиском ледяной бури и голода. Правление окончено.";
    document.getElementById('choices-container').innerHTML = '<button class="btn-primary" onclick="backToMenu()">В главное меню 🔄</button>';
    localStorage.removeItem('winter_chronicles_save');
    checkResumeButton();
}

function saveAndExit() {
    let saveData = { state: state, hero: hero, explored: explored, artifact: artifact };
    localStorage.setItem('winter_chronicles_save', JSON.stringify(saveData));
    backToMenu();
}

function loadSavedGame() {
    let rawData = localStorage.getItem('winter_chronicles_save');
    if (rawData) {
        let decoded = JSON.parse(rawData);
        state = decoded.state;
        hero = decoded.hero;
        explored = decoded.explored;
        artifact = decoded.artifact || "Нет";
        
        for (let zone in explored) {
            if (explored[zone] && zone !== 'castle' && zone !== 'market') {
                document.getElementById(`status-${zone}`).innerText = "Разведано 📝";
                document.getElementById(`status-${zone}`).style.color = "#44ff44";
            }
        }
        document.getElementById('main-menu').style.display = 'none';
        document.getElementById('game-screen').style.display = 'grid';
        updateUI();
    }
}

function checkResumeButton() {
    if (localStorage.getItem('winter_chronicles_save')) {
        document.getElementById('resume-game-btn').style.display = 'block';
    } else {
        document.getElementById('resume-game-btn').style.display = 'none';
    }
}

function toCreationScreen() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('creation-screen').style.display = 'block';
    
    state = { walls: 100, mana: 50, warmth: 100, gold: 100, food: 80, day: 1, coal: 3, wood: 2 };
    hero = { strength: 0, wisdom: 0, charisma: 0 };
    explored = { castle: true, forest: false, mines: false, market: true };
    creationPoints = 5;
    artifact = "Нет";
    
    document.getElementById(`status-forest`).innerText = "Не разведано";
    document.getElementById(`status-forest`).style.color = "#e0e0e0";
    document.getElementById(`status-mines`).innerText = "Не разведано";
    document.getElementById(`status-mines`).style.color = "#e0e0e0";

    document.getElementById('creation-gold').innerText = creationPoints;
    document.getElementById('creation-strength').innerText = 0;
    document.getElementById('creation-wisdom').innerText = 0;
    document.getElementById('creation-charisma').innerText = 0;
}

function startGameFinal() {
    document.getElementById('creation-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'grid';
    updateUI();
}

function backToMenu() {
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('creation-screen').style.display = 'none';
    document.getElementById('main-menu').style.display = 'block';
    checkResumeButton();
}

window.onload = () => {
    document.getElementById('to-creation-btn').onclick = toCreationScreen;
    document.getElementById('start-game-final-btn').onclick = startGameFinal;
    document.getElementById('resume-game-btn').onclick = loadSavedGame;
    document.getElementById('about-btn').onclick = () => document.getElementById('modal-overlay').style.display = 'flex';
    document.getElementById('close-modal-btn').onclick = () => document.getElementById('modal-overlay').style.display = 'none';
    checkResumeButton();
};
