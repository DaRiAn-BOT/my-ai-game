let state = { walls: 100, mana: 50, warmth: 100, gold: 100, food: 80, day: 1, coal: 3, wood: 2, potion: 1, raidTimer: 5 };
let hero = { strength: 0, wisdom: 0, charisma: 0, class: "knight" };
let explored = { castle: true, forest: false, mines: false, market: true };
let buildings = { tower: false, greenhouse: false };
let creationPoints = 5;
let artifact = "Нет";
let currentWeather = "Ясно ☀️";

const zoneEvents = {
    castle: [
        {
            text: "В замке мирный день, но Главный Камин догорает. Жители просят выделить ресурсы на обогрев цитадели.",
            choices: [
                { text: "Пусть мерзнут, беречь припасы", req: null, effect: { walls: 0, mana: 5, warmth: -35, gold: 0, food: -5 } },
                { text: "Бросить дрова в камин (-1 дрова, +45% Тепла)", req: null, effect: { walls: 0, warmth: 45, gold: 0, food: 0 }, useWood: true },
                { text: "[Мудрость 2+] Перестроить дымоход, увеличив теплоотдачу без дров (+25% Тепла)", req: { type: "wisdom", val: 2 }, effect: { walls: 0, mana: 5, warmth: 25, gold: 0, food: 0 } }
            ]
        },
        {
            text: "К воротам цитадели прибыл замерзший обоз беженцев из южных земель. Они умоляют пустить их в замок.",
            choices: [
                { text: "Прогнать чужаков обратно в метель", req: null, effect: { walls: 0, mana: 0, gold: 0, food: 0, warmth: 0 } },
                { text: "[Использование Угля] Растопить гостевую башню (-1 Уголь ✏️, +30 к золоту/налогам)", req: null, effect: { walls: 0, gold: 30, food: -20, warmth: 10 }, useCoal: true },
                { text: "[Харизма 3+] Найти легендарную 👑 Корону Королей в архивах замка и экипировать её! (+3 к Харизме)", req: { type: "charisma", val: 3 }, effect: { walls: 0, gold: 0, food: 0, warmth: 0 }, getArtifact: "Корона Королей" }
            ]
        }
    ],
    forest: [
        {
            text: "В лесу на разведчиков напал огромный 👹 Снежный Тролль! Его ледяная шкура крепка.",
            choices: [
                { text: "Сражаться всей армией напролом (-25% прочности Стен при отступлении)", req: null, effect: { walls: -25, gold: 10, food: 0 } },
                { text: "[Сила 4+] Выйти на дуэль и сразить Тролля в ближнем бою! (+30 золота, найден ⚔️ Стальной Меч!)", req: { type: "strength", val: 4 }, effect: { gold: 30, food: 10 }, getArtifact: "Стальной Меч" },
                { text: "[Харизма 2+] Отвлечь чудовище криками и безопасно забрать 🧪 Эликсир Тепла (+1 зелье)", req: { type: "charisma", val: 2 }, effect: { gold: 0, food: 0 }, givePotion: 1 }
            ]
        },
        {
            text: "Разведчики обнаружили в глуши заброшенную Хижину Знахаря, занесённую снегом.",
            choices: [
                { text: "Вскрыть сундуки ломом (-10% прочности Стен из-за обморожения рук)", req: null, effect: { walls: -10, gold: 20, food: 10 } },
                { text: "[Мудрость 3+] Аккуратно расшифровать рецепты и сварить целебные отвары (+2 Эликсира Тепла 🧪)", req: { type: "wisdom", val: 3 }, effect: { gold: 0, food: 0 }, givePotion: 2 }
            ]
        }
    ],
    mines: [
        {
            text: "В Дальних Шахтах гномы нашли новую глубокую жилу! Но проход завален вечной мерзлотой.",
            choices: [
                { text: "Пробить проход кирками (+20 золота)", req: null, effect: { walls: 0, warmth: -10, gold: 20, food: -5 } },
                { text: "[Мудрость 2+] Взорвать породу порохом. Добыты редкие ресурсы (+2 Угля разведки ✏️, +40 золота)", req: { type: "wisdom", val: 2 }, effect: { walls: 0, gold: 40, food: 0 }, giveCoal: 2 }
            ]
        },
        {
            text: "Глубоко в забое шахтеры раскопали древний пульсирующий 🔮 Амулет Знаний.",
            choices: [
                { text: "Продать артефакт заезжим торговцам (+60 золота)", req: null, effect: { gold: 60, food: 0 } },
                { text: "[Мудрость 3+] Очистить кристалл от руды и экипировать на правителя! (+3 к Мудрости, +30% Магии)", req: { type: "wisdom", val: 3 }, effect: { mana: 30, gold: 0, food: 0 }, getArtifact: "Амулет Знаний" }
            ]
        }
    ]
};
function selectClass(className) {
    hero.class = className;
    document.getElementById('class-knight').style.borderColor = "#444";
    document.getElementById('class-mage').style.borderColor = "#444";
    document.getElementById('class-merchant').style.borderColor = "#444";
    document.getElementById(`class-${className}`).style.borderColor = "#ffd700";
}

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
    document.getElementById('raid-timer').innerText = state.raidTimer;
    document.getElementById('game-day').innerText = state.day;

    document.getElementById('game-strength').innerText = hero.strength;
    document.getElementById('game-wisdom').innerText = hero.wisdom;
    document.getElementById('game-charisma').innerText = hero.charisma;
    
    document.getElementById('slot-1').innerText = `🪵 Дрова: ${state.wood}`;
    document.getElementById('slot-2').innerText = `✏️ Уголь: ${state.coal}`;
    document.getElementById('slot-artifact').innerText = `🎒 Экипировка: ${artifact}`;
    document.getElementById('slot-potion').innerText = `🧪 Эликсир Тепла (${state.potion})`;
    
    document.getElementById('build-tower').innerText = buildings.tower ? "🗼 Маг. Башня (Построено)" : "🗼 Маг. Башня (50🪙)";
    document.getElementById('build-greenhouse').innerText = buildings.greenhouse ? "🌿 Теплица (Построено)" : "🌿 Теплица (50🪙)";
    document.getElementById('weather-banner').innerText = `Погода: ${currentWeather}`;
}

function usePotion() {
    if (state.potion > 0) {
        state.potion -= 1;
        state.warmth = Math.min(100, state.warmth + 40);
        updateUI();
    }
}

function buildStructure(type) {
    if (!buildings[type] && state.gold >= 50) {
        state.gold -= 50;
        buildings[type] = true;
        updateUI();
    }
}

function castSpell(type) {
    if (type === 'shield' && state.mana >= 20) {
        state.mana -= 20; state.walls = Math.min(100, state.walls + 25);
    } else if (type === 'fire' && state.mana >= 30) {
        state.mana -= 30; state.warmth = Math.min(100, state.warmth + 35);
        document.getElementById('event-text').innerText = "🔥 Вы скастовали Огненный Дождь! Метель отступила, цитадель согрета на +35% Тепла.";
    }
    updateUI();
}

function openMarket() {
    document.getElementById('event-text').innerText = "⚖️ Вы на Рынке. Торговцы предлагают бартер ресурсов:";
    const container = document.getElementById('choices-container'); container.innerHTML = '';
    const btn1 = document.createElement('button'); btn1.innerText = "Продать 1 Дрова 🪵 ➔ Получить 25 Золота 🪙";
    if (state.wood > 0) btn1.onclick = () => { state.wood -= 1; state.gold += 25; updateUI(); openMarket(); };
    const btn2 = document.createElement('button'); btn2.innerText = "Купить Припасы 🌾 ➔ Тратит 20 Золота 🪙 (+20 Еды)";
    if (state.gold >= 20) btn2.onclick = () => { state.gold -= 20; state.food += 20; updateUI(); openMarket(); };
    container.appendChild(btn1); container.appendChild(btn2);
}

function exploreZone(zoneName) {
    if (!explored[zoneName]) {
        if (state.coal > 0) {
            state.coal -= 1; explored[zoneName] = true;
            document.getElementById(`status-${zoneName}`).innerText = "Разведано 📝";
            document.getElementById(`status-${zoneName}`).style.color = "#44ff44";
            document.getElementById('event-text').innerText = "Вы успешно потратили 1 Уголь и открыли зону! Кликните ещё раз для запуска квеста.";
            document.getElementById('choices-container').innerHTML = ''; updateUI(); return;
        } else return;
    }
    
    // Экономика пошаговых ходов и Погода
    state.raidTimer -= 1;
    state.day += 1;
    
    let freezeMod = 1;
    if (currentWeather === "Снежная буря 🌨️") freezeMod = 2; // Буран морозит в два раза сильнее
    
    state.warmth = Math.max(0, state.warmth - (12 * freezeMod));
    state.food = Math.max(0, state.food - (buildings.greenhouse ? 4 : 10)); // Теплица пассивно экономит еду!
    state.mana = Math.min(100, state.mana + (buildings.tower ? 15 : 5)); // Башня ускоряет реген магии!
    
    if (state.warmth <= 0) state.walls = Math.max(0, state.walls - 20);
    
    // Смена погоды каждые 3 хода
    if (state.day % 3 === 0) {
        currentWeather = Math.random() > 0.5 ? "Снежная буря 🌨️" : "Ясно ☀️";
    }

    // НАБЕГИ ДИКАРЕЙ КАЖДЫЕ 5 ХОДОВ
    if (state.raidTimer <= 0) {
        state.raidTimer = 5;
        let defFactor = hero.strength >= 4 ? 10 : 25; // Проверка Силы спасает стены при штурме!
        state.walls = Math.max(0, state.walls - defFactor);
        document.getElementById('event-text').innerText = `🚨 НАБЕГ ДИКАРЕЙ! Орда ледяных варваров штурмовала ворота цитадели! Стены получили урон: -${defFactor}%`;
        document.getElementById('choices-container').innerHTML = '';
        updateUI();
        if (state.walls <= 0) endGame();
        return;
    }

    updateUI();
    if (state.walls <= 0 || state.food <= 0) { endGame(); return; }

    const regionEvents = zoneEvents[zoneName];
    const randomEvent = regionEvents[Math.floor(Math.random() * regionEvents.length)];
    document.getElementById('event-text').innerText = randomEvent.text;
    const container = document.getElementById('choices-container'); container.innerHTML = '';

    randomEvent.choices.forEach(choice => {
        let canChoose = true;
        if (choice.useWood && state.wood <= 0) canChoose = false;
        if (choice.useCoal && state.coal <= 0) canChoose = false;
        if (choice.useMana && state.mana < choice.useMana) canChoose = false;
        if (choice.req && hero[choice.req.type] < choice.req.val) canChoose = false;

        const btn = document.createElement('button'); btn.innerText = choice.text;
        if (!canChoose) {
            btn.style.opacity = '0.3'; btn.style.cursor = 'not-allowed';
        } else {
            btn.onclick = () => {
                if (choice.useWood) state.wood -= 1;
                if (choice.useCoal) state.coal -= 1;
                if (choice.giveWood) state.wood += choice.giveWood;
                if (choice.giveCoal) state.coal += choice.giveCoal;
                if (choice.givePotion) state.potion += choice.givePotion;
                
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
                document.getElementById('event-text').innerText = "Приказ исполнен. Выберите зону на карте для следующего тактического шага.";
                container.innerHTML = '';
            };
        }
        container.appendChild(btn);
    });
}

function endGame() {
    document.getElementById('event-text').innerText = "Ваша Цитадель пала под натиском ледяной бури и осадных орудий дикарей. Правление окончено.";
    document.getElementById('choices-container').innerHTML = '<button class="btn-primary" onclick="backToMenu()">В главное меню 🔄</button>';
    localStorage.removeItem('winter_chronicles_save'); checkResumeButton();
}

function saveAndExit() {
    let saveData = { state: state, hero: hero, explored: explored, artifact: artifact, buildings: buildings, currentWeather: currentWeather };
    localStorage.setItem('winter_chronicles_save', JSON.stringify(saveData)); backToMenu();
}

function loadSavedGame() {
    let rawData = localStorage.getItem('winter_chronicles_save');
    if (rawData) {
        let decoded = JSON.parse(rawData); state = decoded.state; hero = decoded.hero; explored = decoded.explored; artifact = decoded.artifact || "Нет"; buildings = decoded.buildings || { tower: false, greenhouse: false }; currentWeather = decoded.currentWeather || "Ясно ☀️";
        for (let zone in explored) {
            if (explored[zone] && zone !== 'castle' && zone !== 'market') {
                document.getElementById(`status-${zone}`).innerText = "Разведано 📝"; document.getElementById(`status-${zone}`).style.color = "#44ff44";
            }
        }
        document.getElementById('main-menu').style.display = 'none'; document.getElementById('game-screen').style.display = 'grid'; updateUI();
    }
}

function checkResumeButton() {
    if (localStorage.getItem('winter_chronicles_save')) document.getElementById('resume-game-btn').style.display = 'block';
    else document.getElementById('resume-game-btn').style.display = 'none';
}

function toCreationScreen() {
    document.getElementById('main-menu').style.display = 'none'; document.getElementById('creation-screen').style.display = 'block';
    state = { walls: 100, mana: 50, warmth: 100, gold: 100, food: 80, day: 1, coal: 3, wood: 2, potion: 1, raidTimer: 5 };
    hero = { strength: 0, wisdom: 0, charisma: 0, class: "knight" }; selectClass('knight');
}
window.onload = () => {function startGameFinal() {
    if (hero.class === 'knight') { hero.strength += 3; artifact = "Стальной Меч"; }
    if (hero.class === 'mage') { hero.wisdom += 3; state.mana = 100; }
    if (hero.class === 'merchant') { state.gold += 150; }
    document.getElementById('hero-title').innerText = hero.class === 'knight' ? "Рыцарь Цитадели 🛡️" : hero.class === 'mage' ? "Архимаг Цитадели 🧙‍♂️" : "Купец Цитадели 🪙";
    document.getElementById('creation-screen').style.display = 'none'; 
    document.getElementById('game-screen').style.display = 'grid'; 
    updateUI();
}

    document.getElementById('to-creation-btn').onclick = toCreationScreen;
    document.getElementById('start-game-final-btn').onclick = startGameFinal;
    document.getElementById('resume-game-btn').onclick = loadSavedGame;
    document.getElementById('about-btn').onclick = () => document.getElementById('modal-overlay').style.display = 'flex';
    document.getElementById('close-modal-btn').onclick = () => document.getElementById('modal-overlay').style.display = 'none';
    checkResumeButton();
};
