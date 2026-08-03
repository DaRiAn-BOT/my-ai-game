// Стартовые ресурсы королевства
let state = { gold: 100, army: 50, food: 80, day: 1 };

// База данных случайных событий
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
    },
    {
        text: "Крысы пробрались на амбарные склады и уничтожили часть запасов.",
        choices: [
            { text: "Выделить золото на очистку (-15 🪙)", effect: { gold: -15, army: 0, food: 0 } },
            { text: "Ничего не делать (-25 🌾)", effect: { gold: 0, army: 0, food: -25 } }
        ]
    }
];

// Обновление цифр на экране
function updateUI() {
    document.getElementById('gold').innerText = state.gold;
    document.getElementById('army').innerText = state.army;
    document.getElementById('food').innerText = state.food;
    document.getElementById('day').innerText = state.day;
}

// Показ случайного события
function showNewEvent() {
    if (state.gold <= 0 || state.army <= 0 || state.food <= 0) {
        endGame();
        return;
    }

    const randomEvent = events[Math.floor(Math.random() * events.length)];
    document.getElementById('event-text').innerText = randomEvent.text;
    
    const container = document.getElementById('choices-container');
    container.innerHTML = ''; // Очищаем старые кнопки

    randomEvent.choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.innerText = choice.text;
        btn.onclick = () => {
            // Применяем последствия выбора
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
    document.getElementById('choices-container').innerHTML = '<button onclick="location.reload()">Начать заново 🔄</button>';
}

// Запуск игры при загрузке страницы
window.onload = () => {
    updateUI();
    showNewEvent();
    // Имитация загрузки лидерборда (заглушка для Supabase)
    document.getElementById('leaderboard-list').innerHTML = `<li>Король Дариан — ${Math.floor(Math.random() * 20) + 10} дней</li>`;
};
