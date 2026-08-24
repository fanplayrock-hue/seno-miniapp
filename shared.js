// shared.js — общий слой для всех экранов Seno Mini App: Telegram WebApp bootstrap,
// авторизованные запросы к backend API, форматирование чисел, RU/EN, общие UI-компоненты.
//
// Архитектурное решение: tg.MainButton НЕ используется нигде в приложении.
// Причина: повторные tg.MainButton.onClick(...) при перерисовке экрана (например,
// после проверки оплаты) накапливали обработчики поверх друг друга — клик мог
// сработать несколько раз подряд (двойной счёт, повторная заявка на выплату).
// Вместо этого — свои sticky-кнопки на обычном DOM (el.onclick = fn всегда
// безопасно заменяет предыдущий обработчик, без наслоения). tg.BackButton
// оставлен — с ним такой проблемы нет, он регистрируется один раз при загрузке.

const API_BASE = 'https://213-165-32-91.sslip.io';

const tg = window.Telegram && window.Telegram.WebApp;

function initApp() {
  if (tg) {
    try {
      tg.ready();
      tg.expand();
      tg.setBackgroundColor('#000000');
      tg.setHeaderColor('#000000');
      if (tg.MainButton && tg.MainButton.hide) tg.MainButton.hide();
    } catch (e) { /* старый клиент Telegram — просто продолжаем без этих вызовов */ }
  }
}

function haptic(style) {
  if (tg && tg.HapticFeedback) { try { tg.HapticFeedback.impactOccurred(style || 'light'); } catch (e) {} }
}

function notify(type) {
  if (tg && tg.HapticFeedback) { try { tg.HapticFeedback.notificationOccurred(type || 'success'); } catch (e) {} }
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

// ============================================================================
// i18n — RU/EN
// ============================================================================

// Словари приходят из locales.js — он генерируется из locales/*.json
// скриптом scripts/build_locales.py и подключается ДО shared.js.
const LOCALE_MAP = { ru: 'ru-RU', en: 'en-US' };
const DEFAULT_LANG = 'en';           // по ТЗ английский — язык по умолчанию
const I18N = (window.SENO_LOCALES) || { en: {}, ru: {} };

/**
 * Порядок разрешения языка:
 *   1. явный выбор пользователя (localStorage, синхронизируется с сервером)
 *   2. язык клиента Telegram: ru* → русский, всё остальное → английский
 *   3. английский
 */
function currentLang() {
  const saved = localStorage.getItem('seno_lang');
  if (saved === 'ru' || saved === 'en') return saved;
  const tgLang = tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.language_code;
  if (tgLang && tgLang.toLowerCase().indexOf('ru') === 0) return 'ru';
  return DEFAULT_LANG;
}

/** Смена языка пользователем: сохраняем локально и на сервере, затем перерисовываем. */
function setLang(lang) {
  if (lang !== 'ru' && lang !== 'en') return;
  localStorage.setItem('seno_lang', lang);
  // Сервер — источник правды между устройствами. Ответ не ждём: язык уже
  // сохранён локально, а если запрос не дойдёт, синхронизация случится
  // при следующей смене. Блокировать UI ради этого незачем.
  apiFetch('/api/settings', { method: 'POST', body: JSON.stringify({ language: lang }) });
  window.location.reload();
}

/**
 * Подхватывает язык из профиля на сервере, если на этом устройстве
 * пользователь ещё не выбирал язык вручную. Так выбор, сделанный на телефоне,
 * приезжает на планшет. Вызывается из ответа /api/me.
 */
function syncLangFromServer(serverLang) {
  if (!serverLang || localStorage.getItem('seno_lang')) return;
  if (serverLang !== 'ru' && serverLang !== 'en') return;
  if (serverLang === currentLang()) return;
  localStorage.setItem('seno_lang', serverLang);
  window.location.reload();
}

function t(key, vars) {
  const lang = currentLang();
  // Фолбэк на английский, а не на русский: показать строку не на том языке
  // лучше, чем голый ключ, и английский теперь язык по умолчанию.
  let str = (I18N[lang] && I18N[lang][key])
    || (I18N[DEFAULT_LANG] && I18N[DEFAULT_LANG][key])
    || key;
  if (vars) {
    Object.keys(vars).forEach(function (k) {
      str = str.replace('{' + k + '}', vars[k]);
    });
  }
  return str;
}

/**
 * Множественное число: t() подставляет число как есть, но «3 монет» по-русски
 * неверно. Ищем ключ с суффиксом категории из Intl.PluralRules
 * (ru: one/few/many, en: one/other) и падаем на key_other, затем на key.
 */
function tp(key, n, vars) {
  var category;
  try {
    category = new Intl.PluralRules(LOCALE_MAP[currentLang()]).select(n);
  } catch (e) {
    category = n === 1 ? 'one' : 'other';
  }
  var dict = I18N[currentLang()] || {};
  var chosen = [key + '_' + category, key + '_other', key].filter(function (k) { return dict[k]; })[0] || key;
  return t(chosen, Object.assign({ n: n }, vars || {}));
}

/**
 * Экранирование для вставки через innerHTML. Обязательно для любых данных
 * из внешних источников (заголовки новостей из чужих RSS, имена пользователей):
 * без него подставленный в ленту <img onerror=...> выполнится в контексте
 * Mini App, где доступен initData.
 */
function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** То же для значения атрибута; javascript:-ссылки отбрасываем. */
function escapeAttr(value) {
  const raw = String(value == null ? '' : value).trim();
  if (/^(javascript|data|vbscript):/i.test(raw)) return '#';
  return escapeHtml(raw);
}

// Названия бирж — торговые марки с собственным написанием, а не слова
// для перевода: автокапитализация превращала бы OKX в «Okx».
const EXCHANGE_NAMES = { bybit: 'Bybit', okx: 'OKX', binance: 'Binance' };

function exchangeName(id) {
  return EXCHANGE_NAMES[id] || (id ? id.charAt(0).toUpperCase() + id.slice(1) : '—');
}

function applyI18n(root) {
  (root || document).querySelectorAll('[data-i18n]').forEach(function (el) {
    el.innerHTML = t(el.getAttribute('data-i18n'));
  });
  (root || document).querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
    el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
  });
}

// ============================================================================
// UI: заголовок экрана, нижний таб-бар, sticky-кнопка действия
// ============================================================================

function langSwitchHtml() {
  const lang = currentLang();
  function s(active) {
    return 'border:none;font-family:var(--font);font-size:10.5px;font-weight:700;padding:5px 8px;border-radius:7px;' +
      'cursor:pointer;background:' + (active ? 'var(--accent)' : 'transparent') + ';color:' + (active ? '#04342C' : 'var(--text-secondary)') + ';';
  }
  return '<div class="lang-switch" style="display:flex;gap:2px;background:var(--surface-raised);border:1px solid var(--border);border-radius:9px;padding:2px;flex:none;">' +
    '<button type="button" data-lang="ru" style="' + s(lang === 'ru') + '">RU</button>' +
    '<button type="button" data-lang="en" style="' + s(lang === 'en') + '">EN</button></div>';
}

function wireLangSwitchers(root) {
  (root || document).querySelectorAll('.lang-switch button').forEach(function (b) {
    b.addEventListener('click', function () { haptic('light'); setLang(b.getAttribute('data-lang')); });
  });
}

/**
 * opts: { title, showBack, backHref, logo }
 * Рисует заголовок в #app-header (должен существовать в разметке экрана).
 */
function renderHeader(opts) {
  opts = opts || {};
  const host = document.getElementById('app-header');
  if (!host) return;
  host.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:18px;';

  let left;
  if (opts.showBack) {
    left = '<button type="button" id="hdr-back" aria-label="' + t('back') + '" ' +
      'style="width:34px;height:34px;border-radius:10px;background:var(--surface);border:1px solid var(--border);' +
      'display:flex;align-items:center;justify-content:center;flex:none;">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 5L8 12L15 19" stroke="#F2F4F7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<h1 style="font-size:17px;font-weight:700;letter-spacing:-0.01em;margin:0;color:var(--text-primary);">' + (opts.title || '') + '</h1>';
  } else {
    left = '<svg width="26" height="26" viewBox="0 0 48 48" fill="none"><rect x="1" y="1" width="46" height="46" rx="13" fill="#0B0B0E" stroke="#1E1E24" stroke-width="1.5"/><path d="M11 30L19 22L25 27L37 14" stroke="#00E5C7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="37" cy="14" r="3" fill="#00E5C7"/></svg>' +
      '<span style="font-size:15px;font-weight:700;letter-spacing:-0.02em;color:var(--text-secondary);">Seno</span>' +
      (opts.title ? '<h1 style="font-size:17px;font-weight:700;letter-spacing:-0.01em;margin:0 0 0 4px;color:var(--text-primary);">' + opts.title + '</h1>' : '');
  }

  host.innerHTML = '<div style="display:flex;align-items:center;gap:8px;min-width:0;">' + left + '</div>' + langSwitchHtml();

  if (opts.showBack) {
    document.getElementById('hdr-back').addEventListener('click', function () {
      haptic('light');
      goTo(opts.backHref || '02-main-menu.html');
    });
  }
  wireLangSwitchers(host);
}

const NAV_ITEMS = [
  { key: 'home', href: '02-main-menu.html', labelKey: 'nav_home',
    icon: '<path d="M4 11.5L12 4.5L20 11.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10.5V19.5H18V10.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' },
  { key: 'screener', href: '03-screener.html', labelKey: 'nav_screener',
    icon: '<circle cx="10.5" cy="10.5" r="6" stroke="currentColor" stroke-width="1.8"/><path d="M20 20L15.5 15.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' },
  { key: 'analysis', href: '04-analysis.html', labelKey: 'nav_analysis',
    icon: '<path d="M4 18L9 11L13 14L20 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 18H20" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>' },
  { key: 'referral', href: '07-referral.html', labelKey: 'nav_referral',
    icon: '<circle cx="9" cy="8.2" r="3" stroke="currentColor" stroke-width="1.8"/><path d="M3 19c0-3.5 2.5-5.2 6-5.2s6 1.7 6 5.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="17.5" cy="9.7" r="2.1" stroke="currentColor" stroke-width="1.5"/>' },
  { key: 'settings', href: '08-settings.html', labelKey: 'nav_settings',
    icon: '<circle cx="12" cy="12" r="2.6" stroke="currentColor" stroke-width="1.7"/><path d="M12 4V6.2M12 17.8V20M4 12H6.2M17.8 12H20M6.3 6.3L7.9 7.9M16.1 16.1L17.7 17.7M17.7 6.3L16.1 7.9M7.9 16.1L6.3 17.7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' },
];

/**
 * Персистентный нижний таб-бар для "браузинговых" экранов (Home/Screener/Referral/Settings).
 * На экранах со sticky-кнопкой (Analysis/Subscription) не используется — там нижняя
 * область занята основным действием.
 */
function renderBottomNav(activeKey) {
  const old = document.getElementById('bottom-nav');
  if (old) old.remove();

  const wrap = document.createElement('div');
  wrap.id = 'bottom-nav';
  wrap.style.cssText = 'position:fixed;left:50%;bottom:0;transform:translateX(-50%);width:100%;max-width:420px;' +
    'display:flex;background:rgba(9,9,11,0.94);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);' +
    'border-top:1px solid var(--border);padding-bottom:env(safe-area-inset-bottom);z-index:40;';

  wrap.innerHTML = NAV_ITEMS.map(function (item) {
    const active = item.key === activeKey;
    const color = active ? 'var(--accent)' : 'var(--text-tertiary)';
    return '<button type="button" class="bn-item" data-href="' + item.href + '" ' +
      'style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;' +
      'padding:9px 0 7px;background:none;border:none;color:' + color + ';font-family:var(--font);font-size:10px;font-weight:700;">' +
      '<svg width="21" height="21" viewBox="0 0 24 24" fill="none">' + item.icon + '</svg>' +
      '<span>' + t(item.labelKey) + '</span></button>';
  }).join('');

  document.body.appendChild(wrap);

  wrap.querySelectorAll('.bn-item').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const href = btn.getAttribute('data-href');
      haptic('light');
      goTo(href);
    });
  });

  const shell = document.querySelector('.app-shell');
  if (shell) shell.style.paddingBottom = '86px';
}

/**
 * Sticky-кнопка основного действия экрана (замена tg.MainButton).
 * opts: { text, onClick, disabled }
 * Повторные вызовы безопасно переиспользуют одну и ту же кнопку и обработчик —
 * el.onclick = fn всегда заменяет предыдущий, наслоения обработчиков не бывает.
 */
function renderStickyButton(opts) {
  opts = opts || {};
  let el = document.getElementById('sticky-cta');
  if (!el) {
    el = document.createElement('button');
    el.id = 'sticky-cta';
    el.type = 'button';
    document.body.appendChild(el);
  }
  el.textContent = opts.text || '';
  const disabled = !!opts.disabled;
  el.style.cssText = 'position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom));transform:translateX(-50%);' +
    'width:calc(100% - 32px);max-width:388px;height:52px;border-radius:14px;border:none;' +
    'font-family:var(--font);font-size:15px;font-weight:700;z-index:41;' +
    (disabled
      ? 'background:var(--surface-raised);color:var(--text-tertiary);box-shadow:none;'
      : 'background:var(--accent);color:#04342C;box-shadow:0 10px 28px rgba(0,229,199,0.25);');
  el.disabled = disabled;
  el.onclick = disabled ? null : function () { opts.onClick && opts.onClick(); };

  const shell = document.querySelector('.app-shell');
  if (shell) shell.style.paddingBottom = '92px';
  return el;
}

function removeStickyButton() {
  const el = document.getElementById('sticky-cta');
  if (el) el.remove();
}

// ============================================================================
// Форматирование
// ============================================================================

function fmtPrice(value) {
  if (value === null || value === undefined) return '—';
  value = Number(value);
  const locale = LOCALE_MAP[currentLang()];
  if (value >= 1000) return value.toLocaleString(locale, { maximumFractionDigits: 0 });
  if (value >= 1) return value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  return '$' + Number(value).toLocaleString(LOCALE_MAP[currentLang()], { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function timeAgoRu(seconds) {
  if (seconds === null || seconds === undefined) return '';
  const lang = currentLang();
  if (seconds < 90) return lang === 'ru' ? 'только что' : 'just now';
  const m = Math.round(seconds / 60);
  if (m < 60) return lang === 'ru' ? m + ' мин назад' : m + 'm ago';
  return lang === 'ru' ? Math.round(m / 60) + ' ч назад' : Math.round(m / 60) + 'h ago';
}

function dateRu(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(LOCALE_MAP[currentLang()], { day: '2-digit', month: '2-digit', year: 'numeric' });
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

// Переводим статическую разметку автоматически на каждом экране.
// Раньше applyI18n() вызывался вручную и только на пейволле — из-за этого
// переключатель языка менял лишь строки, собранные в JS, а весь текст из
// HTML (заголовки разделов, подписи, FAQ) оставался на языке вёрстки.
// shared.js подключён в <head>, поэтому ждём готовности DOM.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () { applyI18n(); });
} else {
  applyI18n();
}
