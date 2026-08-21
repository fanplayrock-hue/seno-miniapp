// shared.js — общий слой для всех экранов Seno Mini App: Telegram WebApp bootstrap,
// авторизованные запросы к backend API, форматирование чисел.

const API_BASE = 'https://213-165-32-91.sslip.io';

const tg = window.Telegram && window.Telegram.WebApp;

function initApp() {
  if (tg) {
    tg.ready();
    tg.expand();
    tg.setBackgroundColor('#000000');
    tg.setHeaderColor('#000000');
  }
}

function haptic(style) {
  if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred(style || 'light');
}

function notify(type) {
  if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred(type || 'success');
}

async function apiFetch(path, options) {
  options = options || {};
  const headers = Object.assign({}, options.headers || {});
  if (tg && tg.initData) headers['X-Telegram-Init-Data'] = tg.initData;
  if (options.body) headers['Content-Type'] = 'application/json';
  let res, data = null;
  try {
    res = await fetch(API_BASE + path, Object.assign({}, options, { headers }));
    try { data = await res.json(); } catch (e) { data = null; }
  } catch (e) {
    return { ok: false, status: 0, data: null, networkError: true };
  }
  return { ok: res.ok, status: res.status, data };
}

function fmtPrice(value) {
  if (value === null || value === undefined) return '—';
  value = Number(value);
  if (value >= 1000) return value.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
  if (value >= 1) return value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (value >= 0.01) return value.toFixed(4);
  return value.toFixed(6);
}

function fmtPct(value, signed) {
  if (value === null || value === undefined) return '—';
  const v = Number(value);
  const sign = signed !== false && v > 0 ? '+' : '';
  return sign + v.toFixed(1) + '%';
}

function fmtUsd(value) {
  if (value === null || value === undefined) return '—';
  return '$' + Number(value).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function timeAgoRu(seconds) {
  if (seconds === null || seconds === undefined) return '';
  if (seconds < 90) return 'только что';
  const m = Math.round(seconds / 60);
  if (m < 60) return m + ' мин назад';
  return Math.round(m / 60) + ' ч назад';
}

function dateRu(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function qs(params) {
  return Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null)
    .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
    .join('&');
}

function goTo(url) { window.location.href = url; }

function showPaywall() { window.location.href = '09-paywall.html'; }

initApp();
