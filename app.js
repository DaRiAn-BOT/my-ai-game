let state = { walls: 100, mana: 100, warmth: 100, gold: 130, food: 80, day: 1, coal: 5, wood: 0, potion: 5, raidTimer: 5 };
let hero = { strength: 0, wisdom: 0, charisma: 0, class: "mage", nickname: "Игрок" };
let buildings = { tower: false, greenhouse: false };
let creationPoints = 5, artifact = "Нет", currentWeather = "Ясно ☀️", isGameOver = false;

// Авторизация
function handleAuth(type) {
    const nick = document.getElementById('auth-nickname').value;
    hero.nickname = type === 'guest' ? "Гость" : (nick || "Правитель");
    document.getElementById('auth-status').innerText = `✅ Приветствуем, ${hero.nickname}!`;
    document.getElementById('auth-status').style.color = "#22c55e";
    document.getElementById('to-creation-btn').removeAttribute('disabled');
}

function toCreationScreen() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('creation-screen').style.display = 'block';
    selectClass('mage'); // По умолчанию маг, как на скрине
}

function backToMenu() {
    document.getElementById('creation-screen').style.display = 'none';
    document.getElementById('main-menu').style.display = 'block';
}

// Создание героя
function selectClass(cls) {
    hero.class = cls;
    document.querySelectorAll('.class-card').forEach(c => c.classList.remove('active'));
    document.getElementById(`card-${cls}`).classList.add('active');
}

function upgradeStat(s) {
    if (creationPoints > 0) {
        creationPoints--; hero[s]++;
        document.getElementById('creation-points').innerText = creationPoints;
        document.getElementById(`creation-${s}`).innerText = hero[s];
    }
}

function startGameFinal() {
    if (hero.class === 'knight') { hero.strength += 3; artifact = "Меч"; }
    if (hero.class === 'mage') { hero.wisdom += 3; artifact = "Амулет Знаний"; }
    if (hero.class === 'merchant') { state.gold += 150; }

    let title = hero.class === 'knight' ? 'Рыцарь Цитадели 🛡️' : hero.class === 'mage' ? 'Архимаг Цитадели 🧙‍♂️' : 'Купец Цитадели 🪙';
    document.getElementById('hero-title').innerText = title;
    
    document.getElementById('creation-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'flex';
    updateUI();
}

// Механика локаций (Вместо хождения по клеткам)
function visitLocation(loc) {
    if (isGameOver) return;
    
    // Продвижение времени за действие
    state.day++;
    state.raidTimer--;
    let mod = currentWeather.includes("буря") ? 2 : 1;
    state.warmth = Math.max(0, state.warmth - (15 * mod));
    state.food = Math.max(0, state.food - (buildings.greenhouse ? 5 : 10));
    state.mana = Math.min(100, state.mana + (buildings.tower ? 20 : 10));

    if (state.day % 4 === 0) currentWeather = Math.random() > 0.5 ? "Ледяная буря 🌨️" : "Ясно ☀️";
    
    const eventBoard = document.getElementById('event-text');
    const choices = document.getElementById('choices-container');
    choices.innerHTML = '';

    if (loc === 'castle') {
        eventBoard.innerText = "🏰 Вы отдыхаете в Цитадели. Здесь тепло и безопасно. (+10 Тепла)";
        state.warmth = Math.min(100, state.warmth + 10);
    } else if (loc === 'forest') {
        eventBoard.innerText = "🌲 В лесу вы нашли немного припасов, но наткнулись на волков!";
        state.wood += 2;
        let btn = document.createElement('button');
        btn.innerText = "Отбиться силой (-10 Тепла)";
        btn.onclick = () => { state.warmth -= 10; choices.innerHTML = ''; updateUI(); };
        choices.appendChild(btn);
    } else if (loc === 'mines') {
        eventBoard.innerText = "⛏️ Шахтеры добыли руду и золото.";
        state.coal += 3; state.gold += 20;
    } else if (loc === 'market') {
        eventBoard.innerText = "⚖️ Рынок открыт. Торговцы предлагают еду за золото.";
        let btn = document.createElement('button');
        btn.innerText = "Купить Еду (20🪙 ➔ 30🌾)";
        btn.onclick = () => { if(state.gold >= 20) { state.gold-=20; state.food+=30; updateUI(); }};
        choices.appendChild(btn);
    }

    if (state.warmth <= 0) state.walls -= 15;
    
    checkRaids();
    updateUI();
}

// Магия и Предметы
function castSpell(type) {
    if (isGameOver) return;
    if (type === 'shield' && state.mana >= 20) {
        state.mana -= 20; state.walls = Math.min(100, state.walls + 30);
        document.getElementById('event-text').innerText = "🛡️ Ледяной Щит укрепил стены!";
    } else if (type === 'fire' && state.mana >= 30) {
        state.mana -= 30; state.warmth = Math.min(100, state.warmth + 40);
        document.getElementById('event-text').innerText = "🔥 Огненный Дождь согрел Цитадель!";
    }
    updateUI();
}

function usePotion() {
    if (state.potion > 0 && !isGameOver) {
        state.potion--; state.warmth = Math.min(100, state.warmth + 50);
        updateUI();
    }
}

function buildStructure(t) {
    if (state.gold >= 50 && !buildings[t] && !isGameOver) {
        state.gold -= 50; buildings[t] = true; updateUI();
    }
}

// Рейды и Конец игры
// Рейды и Конец игры
function checkRaids() {
    if (state.raidTimer <= 0) {
        state.raidTimer = 5;
        let dmg = hero.strength >= 3 ? 15 : 30;
        state.walls -= dmg;
        document.getElementById('event-text').innerText = `🚨 НАБЕГ! Дикари атаковали стены: -${dmg}% прочности.`;
    }
    
    // Проверка на проигрыш (добавили !isGameOver чтобы рекорд сохранился только 1 раз)
    if (state.walls <= 0 && !isGameOver) {
        isGameOver = true;
        document.getElementById('event-text').innerText = "Ваша Цитадель пала под натиском ледяной бури и осадных орудий дикарей. Правление окончено.";
        document.getElementById('choices-container').innerHTML = `<button onclick="location.reload()">В главное меню 🔄</button>`;
        
        // СОХРАНЯЕМ РЕКОРД!
        saveRecord();
    }
}
// Обновление Интерфейса
function updateUI() {
    // Герой
    document.getElementById('game-strength').innerText = hero.strength;
    document.getElementById('game-wisdom').innerText = hero.wisdom;
    document.getElementById('game-charisma').innerText = hero.charisma;
    // Инвентарь
    document.getElementById('val-wood').innerText = state.wood;
    document.getElementById('val-coal').innerText = state.coal;
    document.getElementById('val-artifact').innerText = artifact;
    document.getElementById('val-potion').innerText = state.potion;
    // Постройки
    document.getElementById('build-tower').innerText = buildings.tower ? "🗼 Маг. Башня (Есть)" : "🗼 Маг. Башня (50🪙)";
    document.getElementById('build-greenhouse').innerText = buildings.greenhouse ? "🌿 Теплица (Есть)" : "🌿 Теплица (50🪙)";
    // Статус базы
    document.getElementById('weather-banner').innerText = `Погода: ${currentWeather}`;
    document.getElementById('val-walls').innerText = `${Math.max(0, state.walls)}%`;
    document.getElementById('val-mana').innerText = `${state.mana}%`;
    document.getElementById('val-warmth').innerText = `${Math.max(0, state.warmth)}%`;
    document.getElementById('val-gold').innerText = state.gold;
    document.getElementById('val-food').innerText = state.food;
    document.getElementById('val-raid').innerText = `${state.raidTimer} ходов`;
    document.getElementById('val-day').innerText = `${state.day} дн.`;
}// --- ЗАЛ СЛАВЫ (Leaderboard) ---

// Функция загрузки рекордов
function loadLeaderboard() {
    const board = document.querySelector('.leaderboard');
    // Получаем рекорды из памяти браузера, если их нет — создаем пустой массив
    let records = JSON.parse(localStorage.getItem('citadel_records')) || [];

    // Если список пуст, добавим "легендарного" правителя для красоты
    if (records.length === 0) {
        records = [{ name: "Король Дариан", days: 14 }];
    }

    // Сортируем массив по количеству дней (от большего к меньшему)
    records.sort((a, b) => b.days - a.days);

    // Очищаем текущий список в HTML
    board.innerHTML = '';
    
    // Выводим только Топ-5 игроков
    records.slice(0, 5).forEach((rec, index) => {
        let li = document.createElement('li');
        // Если это рекорд текущего игрока, выделим его цветом
        if (rec.name === hero.nickname && rec.days === state.day) {
            li.innerHTML = `<b class="text-yellow">${index + 1}. ${rec.name} — ${rec.days} дн.</b>`;
        } else {
            li.innerText = `${index + 1}. ${rec.name} — ${rec.days} дн.`;
        }
        board.appendChild(li);
    });
}

// Функция сохранения нового рекорда
function saveRecord() {
    let records = JSON.parse(localStorage.getItem('citadel_records')) || [];
    
    // Добавляем текущий результат игрока
    records.push({ name: hero.nickname, days: state.day });
    
    // Сохраняем обратно в память браузера
    localStorage.setItem('citadel_records', JSON.stringify(records));
    
    // Сразу обновляем таблицу на экране
    loadLeaderboard();
}

// Загружаем Зал Славы при первом запуске игры
loadLeaderboard();