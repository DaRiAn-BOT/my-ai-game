"use strict";

// Сохранение и восстановление игрового прогресса.
function resetGame() {
    state = { ...INITIAL_STATE };
    hero = { name: "Правитель", class: "knight", strength: 0, wisdom: 0, charisma: 0 };
    buildings = { tower: false, greenhouse: false, barracks: false };
    creationPoints = 5;
    weather = { name: "Ясно", icon: "☀️", cold: 8 };
    history = [];
}

function userLabel() {
    if (isGuest) return "Гость";
    return currentUser?.user_metadata?.full_name || currentUser?.email?.split("@")[0] || "Правитель";
}

function saveKey() {
    return currentUser ? `citadel_save_${currentUser.id}` : "citadel_save_guest";
}

function getSaveData() {
    return { state, hero, buildings, creationPoints, weather, history, savedAt: Date.now() };
}

function saveGame() {
    if (!currentUser || state.gameOver || !hero.name) return;
    const data = getSaveData();
    localStorage.setItem(saveKey(), JSON.stringify(data));

    // Аккаунтное сохранение также хранится в Supabase и доступно после входа на другом устройстве.
    if (!isGuest) {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            supabaseClient.auth.updateUser({ data: { game_save: data } }).catch(() => {});
        }, 1200);
    }
}

function clearGameSave() {
    if (!currentUser) return;
    localStorage.removeItem(saveKey());
    if (!isGuest) supabaseClient.auth.updateUser({ data: { game_save: null } }).catch(() => {});
}

function loadGame() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(saveKey())); } catch { saved = null; }
    const cloudSave = !isGuest ? currentUser?.user_metadata?.game_save : null;
    if (cloudSave && (!saved || cloudSave.savedAt > saved.savedAt)) saved = cloudSave;
    if (!saved?.state || saved.state.gameOver) return false;

    state = { ...INITIAL_STATE, ...saved.state };
    hero = { ...saved.hero };
    buildings = { tower: false, greenhouse: false, barracks: false, ...saved.buildings };
    creationPoints = saved.creationPoints ?? 0;
    weather = saved.weather || weather;
    history = saved.history || [];
    return true;
}

// Переключение экранов
