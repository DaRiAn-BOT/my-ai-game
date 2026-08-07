const SUPABASE_URL = "https://supabase.co"; 
const SUPABASE_KEY = "your-anon-key";
const supabase = (window.supabase) ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

let state = { walls: 100, mana: 50, warmth: 100, gold: 100, food: 80, day: 1, coal: 3, wood: 2, potion: 1, raidTimer: 5 };
let hero = { strength: 0, wisdom: 0, charisma: 0, class: "knight", nickname: "Король" };
let explored = { castle: true, forest: false, mines: false, market: true };
let buildings = { tower: false, greenhouse: false };
let creationPoints = 5, artifact = "Нет", currentWeather = "Ясно ☀️", isGameOver = false, dailyStreak = 0, lastLoginDate = null, currentUser = null;

let playerX = 2;
let playerY = 2;

const mapData = [
    ['F', '.', 'F', '.', 'M'],
    ['.', 'C', '.', 'C', '.'],
    ['F', '.', 'C', '.', 'M'],
    ['.', 'M', '.', 'F', '.'],
    ['M', '.', 'F', '.', 'M']
];

let discoveredCells = ["2,2", "1,1", "1,3", "3,1", "2,1", "2,3", "1,2", "3,2"];

function initMap() {
    const container = document.getElementById('grid-map-container');
    if (!container) return;
    container.innerHTML = '';
    
    for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            const coord = `${x},${y}`;
            
            if (x === playerX && y === playerY) {
                cell.classList.add('player');
                cell.innerText = '🧙‍♂️';
            } else if (discoveredCells.includes(coord)) {
                const type = mapData[y][x];
                if (type === 'C') cell.innerText = '🏰';
                else if (type === 'F') cell.innerText = '🌲';
                else if (type === 'M') cell.innerText = '⛏️';
                else cell.innerText = '·';
            } else {
                cell.classList.add('fog');
                cell.innerText = '☁️';
            }
            container.appendChild(cell);
        }
    }
}
function movePlayer(dx, dy) {
    if (isGameOver) return;
    const newX = playerX + dx;
    const newY = playerY + dy;
    
    if (newX >= 0 && newX < 5 && newY >= 0 && newY < 5) {
        playerX = newX;
        playerY = newY;
        
        const coord = `${playerX},${playerY}`;
        if (!discoveredCells.includes(coord)) {
            discoveredCells.push(coord);
        }
        
        state.raidTimer -= 1;
        state.day += 1;
        let m = currentWeather === "Снежная буря 🌨️" ? 2 : 1;
        state.warmth = Math.max(0, state.warmth - (12 * m));
        state.food = Math.max(0, state.food - (buildings.greenhouse ? 4 : 10));
        state.mana = Math.min(100, state.mana + (buildings.tower ? 15 : 5));
        
        if (state.warmth <= 0) state.walls = Math.max(0, state.walls - 20);
        if (state.day % 3 === 0) currentWeather = Math.random() > 0.5 ? "Снежная буря 🌨️" : "Ясно ☀️";
        
        checkRaids();
        if (!isGameOver) triggerTileEvent();
        initMap();
        updateUI();
    }
}

function triggerTileEvent() {
    const tileType = mapData[playerY][playerX];
    const container = document.getElementById('choices-container');
    container.innerHTML = '';
    
    if (tileType === 'F') {
        document.getElementById('event-text').innerText = "🌲 Вы зашли в Лесной массив! На разведчиков напал 👹 Снежный Тролль!";
        createChoiceButton("Оказать сопротивление силами гарнизона (-25% Стен)", () => { state.walls = Math.max(0, state.walls - 25); updateUI(); container.innerHTML = ''; });
    } else if (tileType === 'M') {
        document.getElementById('event-text').innerText = "⛏️ Вы вошли в сектор Шахт! Рабочие пробили новый богатый забой.";
        createChoiceButton("Начать добычу ресурсов (+20 Золота, -5 Еды)", () => { state.gold += 20; state.food -= 5; updateUI(); container.innerHTML = ''; });
    } else {
        document.getElementById('event-text').innerText = "· Вы стоите посреди пустой заснеженной поляны. Кругом лишь метель...";
    }
}

function createChoiceButton(text, onClickFunc) {
    const container = document.getElementById('choices-container');
    const btn = document.createElement('button');
    btn.innerText = text;
    btn.onclick = onClickFunc;
    container.appendChild(btn);
}

function castSpell(t) {
    if (isGameOver) return;
    if (t === 'shield' && state.mana >= 20) { state.mana -= 20; state.walls = Math.min(100, state.walls + 25); }
    else if (t === 'fire' && state.mana >= 30) { state.mana -= 30; state.warmth = Math.min(100, state.warmth + 35); document.getElementById('event-text').innerText = "🔥 Заклинание Огня! Тепло восстановлено на +35%."; }
    updateUI();
}
function openMarket() {
    if (isGameOver) return;
    document.getElementById('event-text').innerText = "⚖️ Торговый Рынок Цитадели:";
    const c = document.getElementById('choices-container'); c.innerHTML = '';
    const b1 = document.createElement('button'); b1.innerText = "Продать 1 Дрова 🪵 ➔ Получить 25 Казны 🪙";
    if (state.wood > 0) b1.onclick = () => { state.wood -= 1; state.gold += 25; updateUI(); openMarket(); };
    const b2 = document.createElement('button'); b2.innerText = "Купить Еду 🌾 ➔ Тратит 20 Казны 🪙 (+20 Еды)";
    if (state.gold >= 20) b2.onclick = () => { state.gold -= 20; state.food += 20; updateUI(); openMarket(); };
    c.appendChild(b1); c.appendChild(b2);
}

function checkRaids() {
    if (state.raidTimer <= 0) {
        state.raidTimer = 5;
        let d = hero.strength >= 4 ? 10 : 25;
        state.walls = Math.max(0, state.walls - d);
        document.getElementById('event-text').innerText = `🚨 НАБЕГ ДИКАРЕЙ! Осадные орудия нанесли урон стенам: -${d}%`;
        document.getElementById('choices-container').innerHTML = '';
        if (state.walls <= 0) endGame();
    }
}

function upgradeStat(s) { if (creationPoints > 0) { creationPoints -= 1; hero[s] += 1; document.getElementById('creation-gold').innerText = creationPoints; document.getElementById(`creation-${s}`).innerText = hero[s]; } }
function usePotion() { if (!isGameOver && state.potion > 0) { state.potion -= 1; state.warmth = Math.min(100, state.warmth + 40); updateUI(); } }
function buildStructure(t) { if (!isGameOver && !buildings[t] && state.gold >= 50) { state.gold -= 50; buildings[t] = true; updateUI(); } }

function updateUI() {
    document.getElementById('gold').innerText = state.walls; document.getElementById('mana').innerText = state.mana; document.getElementById('army').innerText = state.warmth;
    document.getElementById('food').innerText = state.gold; document.getElementById('day').innerText = state.food; document.getElementById('raid-timer').innerText = state.raidTimer; document.getElementById('game-day').innerText = state.day;
    document.getElementById('game-strength').innerText = hero.strength; document.getElementById('game-wisdom').innerText = hero.wisdom; document.getElementById('game-charisma').innerText = hero.charisma;
    document.getElementById('slot-1').innerText = `🪵 Дрова: ${state.wood}`; document.getElementById('slot-2').innerText = `✏️ Уголь: ${state.coal}`;
    document.getElementById('slot-artifact').innerText = `🎒 Экипировка: ${artifact}`; document.getElementById('slot-potion').innerText = `🧪 Эликсир (${state.potion})`;
    document.getElementById('build-tower').innerText = buildings.tower ? "🗼 Башня (Есть)" : "🗼 Башня (50🪙)"; document.getElementById('build-greenhouse').innerText = buildings.greenhouse ? "🌿 Теплица (Есть)" : "🌿 Теплица (50🪙)";
    document.getElementById('weather-banner').innerText = `Погода: ${currentWeather}`;
}

async function handleAuth(type) {
    const nickname = document.getElementById('auth-nickname').value;
    const status = document.getElementById('auth-status');
    const startBtn = document.getElementById('to-creation-btn');
    if (!nickname) { status.innerText = "❌ Введите имя Правителя!"; return; }
    hero.nickname = nickname;
    status.style.color = "#34c759";
    status.innerText = `👑 Авторизован под ником: ${hero.nickname}`;
    startBtn.removeAttribute('disabled');
    startBtn.innerText = "Начать правление 👑";
}

function endGame() { isGameOver = true; document.getElementById('event-text').innerText = "Ваша Цитадель пала под натиском метели. Правление окончено."; const c = document.getElementById('choices-container'); c.innerHTML = ''; const b = document.createElement('button'); b.className = "btn-primary"; b.innerText = "В меню 🔄"; b.onclick = function() { backToMenu(); }; c.appendChild(b); }
function saveAndExit() { if (isGameOver) return; backToMenu(); }
function backToMenu() { document.getElementById('game-screen').style.display = 'none'; document.getElementById('creation-screen').style.display = 'none'; document.getElementById('main-menu').style.display = 'block'; }
function toCreationScreen() { document.getElementById('main-menu').style.display = 'none'; document.getElementById('creation-screen').style.display = 'block'; }

function startGameFinal() {
    if (hero.class === 'knight') { hero.strength += 3; artifact = "Стальной Меч"; }
    document.getElementById('hero-title').innerText = `${hero.nickname} (${hero.class === 'knight' ? 'Рыцарь' : 'Правитель'}) 🛡️`;
    document.getElementById('creation-screen').style.display = 'none'; document.getElementById('game-screen').style.display = 'grid';
    initMap(); updateUI();
}

window.onload = () => {
    document.getElementById('to-creation-btn').onclick = toCreationScreen;
    document.getElementById('start-game-final-btn').onclick = startGameFinal;
    document.getElementById('about-btn').onclick = () => document.getElementById('modal-overlay').style.display = 'flex';
    document.getElementById('close-modal-btn').onclick = () => document.getElementById('modal-overlay').style.display = 'none';
};
