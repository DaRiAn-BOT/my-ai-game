"use strict";

// Запуск приложения и подключение кнопок.
// Подключение кнопок в одном месте — в HTML нет игровой логики.
$("open-creation").addEventListener("click", playGame);
$("open-login").addEventListener("click", () => openAuth("login"));
$("open-register").addEventListener("click", () => openAuth("register"));
$("open-about").addEventListener("click", () => showScreen("about-screen"));
$("login-tab").addEventListener("click", () => setAuthMode("login"));
$("register-tab").addEventListener("click", () => setAuthMode("register"));
$("email-auth").addEventListener("click", submitEmailAuth);
$("google-auth").addEventListener("click", signInWithGoogle);
$("guest-auth").addEventListener("click", signInAsGuest);
$("logout").addEventListener("click", logout);
$("save-and-menu").addEventListener("click", () => { saveGame(); showScreen("menu-screen"); showToast("Игра сохранена."); });
document.querySelectorAll(".back-to-menu").forEach((button) => button.addEventListener("click", () => showScreen("menu-screen")));
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
updateAccountUI();
supabaseClient.auth.getSession().then(({ data }) => applySession(data.session));
supabaseClient.auth.onAuthStateChange((_event, session) => setTimeout(() => applySession(session), 0));
