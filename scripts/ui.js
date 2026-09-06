"use strict";

// Обновление игрового интерфейса.
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
    $("map-hud-walls").textContent = `${clamp(state.walls)}%`;
    $("map-hud-mana").textContent = `${clamp(state.mana)}%`;
    $("map-hud-warmth").textContent = `${clamp(state.warmth)}%`;
    $("map-hud-raid").textContent = state.raidTimer;

    const relics = questProgress;
    const relicEntries = Object.entries(GREAT_HEARTH_RELICS);
    const relicCount = relicEntries.filter(([biome]) => relics[biome]).length;
    $("relic-progress").innerHTML = relicEntries.map(([biome, relic]) =>
        `<li>${relics[biome] ? "✓" : "○"} ${relic.icon} ${relic.name}</li>`
    ).join("") + `<li><b>${state.greatHearthLit ? "🔥 Очаг горит" : `Реликвии: ${relicCount}/4`}</b></li>`;

    const names = { tower: "🔮 Магическая башня", greenhouse: "🌿 Теплица", barracks: "⚔️ Казармы" };
    const built = Object.keys(buildings).filter((key) => buildings[key]);
    $("buildings-list").innerHTML = built.length ? built.map((key) => `<li>${names[key]}</li>`).join("") : "<li>Пока ничего</li>";
    document.querySelectorAll(".build").forEach((button) => {
        const isBuilt = buildings[button.dataset.building];
        button.classList.toggle("done", isBuilt);
        button.disabled = isBuilt;
    });
    $("history").innerHTML = history.map((entry) => `<li>${entry}</li>`).join("");
    if (!$("game-screen").classList.contains("hidden")) saveGame();
}
