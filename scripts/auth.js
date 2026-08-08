"use strict";

// Вход, регистрация и управление аккаунтом.
let toastTimer;
function showToast(text) {
    clearTimeout(toastTimer);
    $("toast").textContent = text;
    $("toast").classList.add("show");
    toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2200);
}

function openAuth(mode) {
    setAuthMode(mode);
    $("auth-message").textContent = "";
    showScreen("auth-screen");
}

function setAuthMode(mode) {
    authMode = mode;
    const registering = mode === "register";
    $("auth-title").textContent = registering ? "Регистрация" : "Вход";
    $("email-auth").textContent = registering ? "Зарегистрироваться" : "Войти";
    $("login-tab").classList.toggle("selected", !registering);
    $("register-tab").classList.toggle("selected", registering);
    $("auth-password").autocomplete = registering ? "new-password" : "current-password";
    $("google-auth").classList.toggle("hidden", registering);
}

function authMessage(text, success = false) {
    $("auth-message").textContent = text;
    $("auth-message").classList.toggle("success", success);
}

function validateCredentials() {
    const email = $("auth-email").value.trim().toLowerCase();
    const password = $("auth-password").value;
    if (!/^\S+@\S+\.\S+$/.test(email)) {
        authMessage("Введите правильный адрес электронной почты.");
        return null;
    }
    if (password.length < 6) {
        authMessage("Пароль должен содержать минимум 6 символов.");
        return null;
    }
    return { email, password };
}

async function submitEmailAuth() {
    const credentials = validateCredentials();
    if (!credentials) return;
    $("email-auth").disabled = true;
    authMessage("Подключение к замковой летописи…", true);

    try {
        if (authMode === "register") {
            const { data, error } = await supabaseClient.auth.signUp({
                ...credentials,
                options: { data: { ruler_name: credentials.email.split("@")[0] } }
            });
            if (error) throw error;
            // При включённой защите Supabase может вернуть пользователя без identities для уже занятого email.
            if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
                authMessage("Такой аккаунт уже существует. Перейдите на вкладку «Вход».");
            } else if (!data.session) {
                authMessage("Регистрация завершена. Подтвердите email по ссылке в письме.", true);
            } else {
                authMessage("Аккаунт создан. Добро пожаловать!", true);
            }
        } else {
            const { error } = await supabaseClient.auth.signInWithPassword(credentials);
            if (error) throw error;
            authMessage("Вход выполнен.", true);
        }
    } catch (error) {
        const duplicate = /already|registered|exists/i.test(error.message);
        authMessage(duplicate ? "Такой аккаунт уже существует." : "Не удалось войти. Проверьте email, пароль и подтверждение почты.");
    } finally {
        $("email-auth").disabled = false;
    }
}

async function signInWithGoogle() {
    if (location.protocol === "file:") {
        authMessage("Google-вход работает на сайте или локальном сервере, но не через file://.");
        return;
    }
    const redirectTo = `${location.origin}${location.pathname}`;
    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo }
    });
    if (error) authMessage("Google-вход не настроен в панели Supabase или произошла ошибка.");
}

async function signInAsGuest() {
    authMessage("Создаём гостевой профиль…", true);
    const { data, error } = await supabaseClient.auth.signInAnonymously();
    if (!error && data.user) return;

    // Если Anonymous Sign-Ins ещё не включён в Supabase, гостевой режим всё равно работает локально.
    const generatedId = crypto.randomUUID ? crypto.randomUUID() : `guest_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const guestId = localStorage.getItem("citadel_guest_id") || generatedId;
    localStorage.setItem("citadel_guest_id", guestId);
    currentUser = { id: guestId, user_metadata: { full_name: "Гость" } };
    isGuest = true;
    updateAccountUI();
    showScreen("menu-screen");
    showToast("Гостевой режим: прогресс хранится только на этом устройстве.");
}

async function logout() {
    saveGame();
    if (!isGuest) await supabaseClient.auth.signOut();
    currentUser = null;
    isGuest = false;
    updateAccountUI();
    showScreen("menu-screen");
}

function applySession(session) {
    currentUser = session?.user || null;
    isGuest = Boolean(currentUser?.is_anonymous);
    updateAccountUI();
    if (currentUser && !$("auth-screen").classList.contains("hidden")) showScreen("menu-screen");
}

function updateAccountUI() {
    const signedIn = Boolean(currentUser);
    $("account-status").textContent = signedIn
        ? `${isGuest ? "👤 Гостевой режим" : "✅ Аккаунт подключён"} — прогресс сохраняется`
        : "Вы не вошли в аккаунт";
    $("logout").classList.toggle("hidden", !signedIn);
    $("open-login").classList.toggle("hidden", signedIn);
    $("open-register").classList.toggle("hidden", signedIn);
}
