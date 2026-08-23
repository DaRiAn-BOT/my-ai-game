"use strict";

// Настройки Supabase, состояние и общие помощники.
// Подключение Supabase. В браузере используется только публичный publishable key.
const SUPABASE_URL = "https://bspuzgvufiwxldlontfj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_pU3v8TvG5Ya6sAdTJp0tXQ_xk4hbyDD";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

let currentUser = null;
let isGuest = false;
let authMode = "login";
let saveTimer;

// Все изменяемые данные игры находятся в одном объекте.
const INITIAL_STATE = {
    day: 1, maxDays: 30, walls: 100, mana: 80, warmth: 90,
    gold: 100, food: 35, wood: 15, coal: 3, potions: 2,
    raidTimer: 5, gameOver: false, eventPending: false
};

let state = {};
let hero = {};
let buildings = {};
let creationPoints = 5;
let weather = { name: "Ясно", icon: "☀️", cold: 8 };
let history = [];

const $ = (id) => document.getElementById(id);
const random = (items) => items[Math.floor(Math.random() * items.length)];
const clamp = (number, min = 0, max = 100) => Math.max(min, Math.min(max, number));

const classInfo = {
    knight: { title: "Рыцарь", bonus: "+15 тепла в начале похода." },
    mage: { title: "Маг", bonus: "+1 клетка к радиусу обзора тумана войны." },
    merchant: { title: "Купец", bonus: "+20 золота в начале похода." }
};
