let state = { gold: 100, army: 50, food: 80, day: 1 };

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

function updateUI() {
    document.getElementById('gold').innerText = state.gold;
    document.getElementById('army').innerText = state.army;
    document.getElementById('food').innerText = state.food;
    document.getElementById('day').innerText = state.day;
}

function showNewEvent() {
    if (state.gold <= 0 || state.army <= 0 || state.food <= 0) {
        endGame();
        return;
    }

    const randomEvent = events[Math.floor(Math.random() * events.length)];
    document.getElementById('event-text').innerText = randomEvent.text;
    
    const container = document.getElementById('choices-container');
    container.innerHTML = '';

    randomEvent.choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.innerText = choice.text;
        btn.onclick = () => {
            state.gold += choice.effect.gold;
            state.army += choice.effect.army;
            state.food += choice.effect.food;
            state.day += 1;
            updateUI();
            showNewEvent();
        };
        container.appendChild(btn);
    });
}

function endGame() {
    document.getElementById('event-text').innerText = `Ваше правление окончено! Вы продержались дней: ${state.day}.`;
    document.getElementById('choices-container').innerHTML = '<button onclick="backToMenu()">В главное меню 🔄</button>';
}

// Функции переключения экранов меню
function startGame() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    state = { gold: 100, army: 50, food: 80, day: 1 };
    updateUI();
    showNewEvent();
}

function backToMenu() {
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('main-menu').style.display = 'block';
}

function toggleModal(show) {
    document.getElementById('modal-overlay').style.display = show ? 'flex' : 'none';
}

window.onload = () => {
    // Назначаем события кнопкам меню
    document.getElementById('start-game-btn').onclick = startGame;
    document.getElementById('about-btn').onclick = () => toggleModal(true);
    document.getElementById('close-modal-btn').onclick = () => toggleModal(false);
    
    // Прячем игру и модалку изначально
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('modal-overlay').style.display = 'none';
};
