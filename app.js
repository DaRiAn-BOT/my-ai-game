let state = { walls: 100, warmth: 100, gold: 100, food: 80, day: 1, coal: 3, wood: 2 };
let hero = { strength: 0, wisdom: 0, charisma: 0 };
let explored = { castle: true, forest: false, mines: false };

const zoneEvents = {
    castle: [
        {
            text: "В замке мирный день, но Главный Камин догорает. Жители просят выделить ресурсы на обогрев цитадели.",
            choices: [
                { text: "Пусть мерзнут, беречь припасы", req: null, effect: { walls: 0, warmth: -30, gold: 0, food: -5 } },
                { text: "Бросить дрова в камин (-1 дрова, +40% Тепла)", req: null, effect: { walls: 0, warmth: 40, gold: 0, food: 0 }, useWood: true },
                { text: "[Мудрость 2+] Перестроить дымоход, увеличив теплоотдачу без дров (+20% Тепла)", req: { type: "wisdom", val: 2 }, effect: { walls: 0, warmth: 20, gold: 0, food: 0 } }
            ]
        }
    ],
    forest: [
        {
            text: "В заснеженном Окрестном Лесу разведчики наткнулись на заброшенный склад лесорубов, но вокруг бродят голодные волки!",
            choices: [
                { text: "Вступить в бой без подготовки (-20% Стен/Защиты)", req: null, effect: { walls: -20, warmth: -10, gold: 0, food: 20 } },
                { text: "[Сила 3+] Лично возглавить вылазку и отбить склад (+2 дров, +20 еды)", req: { type: "strength", val: 3 }, effect: { walls: 0, warmth: -5, gold: 0, food: 20 }, giveWood: 2 }
            ]
        }
    ],
    mines: [
        {
            text: "В Дальних Шахтах произошел обвал из-за вечной мерзлоты. Гномы заперты в забое с золотом.",
            choices: [
                { text: "Взорвать проход за казенный счет (-30 золота)", req: null, effect: { walls: 0, warmth: -10, gold: -30, food: 0 } },
                { text: "[Мудрость 3+] Рассчитать правильные точки опор и разобрать завал руками (+50 золота)", req: { type: "wisdom", val: 3 }, effect: { walls: 0, warmth: -10, gold: 50, food: 0 } }
            ]
        }
    ]
};

function upgradeStat(statName) {
    if (state.coal > 0) {
        state.coal -= 1;
        hero[statName] += 1;
        document.getElementById('creation-gold').innerText = state.coal;
        document.getElementById(`creation-${statName}`).innerText = hero[statName];
    } else {
        alert("Очки подготовки закончились!");
    }
}

function updateUI() {
    document.getElementById('gold').innerText = state.walls;
    document.getElementById('army').innerText = state.warmth;
    document.getElementById('food').innerText = state.gold;
    document.getElementById('day').innerText = state.food;
    document.getElementById('game-day').innerText = state.day;

    document.getElementById('game-strength').innerText = hero.strength;
    document.getElementById('game-wisdom').innerText = hero.wisdom;
    document.getElementById('game-charisma').innerText = hero.charisma;
    
    document.getElementById('slot-1').innerText = `🪵 Дрова: ${state.wood}`;
    document.getElementById('slot-2').innerText = `✏️ Уголь: ${state.coal}`;
}

function exploreZone(zoneName) {
    if (!explored[zoneName]) {
        if (state.coal > 0) {
            state.coal -= 1;
            explored[zoneName] = true;
            document.getElementById(`status-${zoneName}`).innerText = "Разведано 📝";
            document.getElementById(`status-${zoneName}`).style.color = "#44ff44";
            alert("Вы потратили 1 Уголь и зарисовали регион на тактической карте!");
        } else {
            alert("У вас нет Угля разведки на складе, чтобы открыть этот регион!");
            return;
        }
    }
    
    const regionEvents = zoneEvents[zoneName];
    const randomEvent = regionEvents[Math.floor(Math.random() * regionEvents.length)];
    
    // Пошаговое ухудшение от мороза
    state.warmth = Math.max(0, state.warmth - 15);
    state.food = Math.max(0, state.food - 10);
    state.day += 1;
    
    // Если в замке холодно — рушатся стены и падает дух
    if (state.warmth <= 0) {
        state.walls = Math.max(0, state.walls - 20);
    }
    
    updateUI();
    
    if (state.walls <= 0 || state.food <= 0) {
        endGame();
        return;
    }

    document.getElementById('event-text').innerText = randomEvent.text;
    const container = document.getElementById('choices-container');
    container.innerHTML = '';

    randomEvent.choices.forEach(choice => {
        let canChoose = true;
        if (choice.useWood && state.wood <= 0) canChoose = false;
        if (choice.req && hero[choice.req.type] < choice.req.val) canChoose = false;

        const btn = document.createElement('button');
        btn.innerText = choice.text;
        
        if (!canChoose) {
            btn.style.opacity = '0.3';
            btn.style.cursor = 'not-allowed';
            btn.innerText += choice.useWood ? " 🔒 (Нет дров)" : " 🔒 (Мало навыков)";
        } else {
            btn.onclick = () => {
                if (choice.useWood) state.wood -= 1;
                if (choice.giveWood) state.wood += choice.giveWood;
                
                state.walls = Math.min(100, Math.max(0, state.walls + choice.effect.walls));
                state.warmth = Math.min(100, Math.max(0, state.warmth + choice.effect.warmth));
                state.gold = Math.max(0, state.gold + choice.effect.gold);
                state.food = Math.max(0, state.food + choice.effect.food);
                
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
}

function toCreationScreen() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('creation-screen').style.display = 'block';
    state = { walls: 100, warmth: 100, gold: 100, food: 80, day: 1, coal: 5, wood: 2 };
    hero = { strength: 0, wisdom: 0, charisma: 0 };
    document.getElementById('creation-gold').innerText = 5;
}

function startGameFinal() {
    document.getElementById('creation-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'grid';
    updateUI();
}

function backToMenu() {
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('main-menu').style.display = 'block';
}

window.onload = () => {
    document.getElementById('to-creation-btn').onclick = toCreationScreen;
    document.getElementById('start-game-final-btn').onclick = startGameFinal;
    document.getElementById('about-btn').onclick = () => document.getElementById('modal-overlay').style.display = 'flex';
    document.getElementById('close-modal-btn').onclick = () => document.getElementById('modal-overlay').style.display = 'none';
};
