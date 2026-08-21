// shared.js — общий слой для всех экранов Seno Mini App: Telegram WebApp bootstrap,
// авторизованные запросы к backend API, форматирование чисел, RU/EN.

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

// ============================================================================
// i18n — RU/EN. Выбор языка хранится в localStorage и общий для всех экранов.
// Аналитический текст с бэкенда (обоснование сигнала, описания факторов)
// генерируется на русском в core/ (перенесённый анализ) и не переводится —
// это касается только интерфейсной "хромы": заголовков, кнопок, подписей.
// ============================================================================

const LOCALE_MAP = { ru: 'ru-RU', en: 'en-US' };

function currentLang() {
  const saved = localStorage.getItem('seno_lang');
  if (saved === 'ru' || saved === 'en') return saved;
  const tgLang = tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.language_code;
  return tgLang && tgLang.indexOf('ru') === 0 ? 'ru' : (tgLang ? 'en' : 'ru');
}

function setLang(lang) {
  localStorage.setItem('seno_lang', lang);
  window.location.reload();
}

const I18N = {
  ru: {
    disclaimer_short: '⚠️ Не является инвестиционной рекомендацией',
    back: 'Назад', loading: 'Загрузка…', close: 'Закрыть',

    onb_headline: 'Готовые торговые сетапы — вход, стоп и цели за секунды',
    onb_f1_title: 'Автоматический скрининг рынка', onb_f1_desc: 'Приложение само находит сетапы по десяткам монет',
    onb_f2_title: 'Вход, стоп-лосс и тейк-профиты', onb_f2_desc: 'Расчёт уже готов — считать уровни вручную не нужно',
    onb_f3_title: 'Разбор факторов', onb_f3_desc: 'Видно, почему выдан именно такой сигнал',
    onb_preview_label: 'Так выглядит сигнал',
    onb_disclaimer: 'Аналитика не является инвестиционной рекомендацией. Торговля криптовалютой сопряжена с риском потери средств.',
    onb_cta: 'Смотреть сигналы →', onb_how: 'Как это работает',

    menu_signals: 'Сигналы сейчас', menu_sections: 'Разделы',
    menu_fng: 'Индекс страха и жадности', menu_dom: 'Доминация BTC',
    menu_sub_none: 'Нет подписки', menu_sub_active: 'Активна · {n} дн.',
    menu_screener_t: 'Скринер', menu_screener_d: 'Поиск сетапов по рынку',
    menu_analysis_t: 'Анализ', menu_analysis_d: 'Разбор конкретной монеты',
    menu_referral_t: 'Рефералы', menu_referral_d: '40% с каждого приглашённого',
    menu_subscription_t: 'Подписка', menu_subscription_d: 'Управление доступом',
    menu_empty_signals: 'Пока нет уверенных сигналов — рынок в боковике',
    menu_updated: 'Обновлено только что', menu_load_error: 'Не удалось загрузить рыночный контекст',
    menu_guest: 'Гость',

    scr_title: 'Скринер', scr_seg_scalping: 'Скальпинг', scr_seg_swing: 'Дневная', scr_seg_position: 'Долгосрочная',
    scr_empty_t: 'Сигналов не найдено', scr_empty_d: 'Рынок в боковике — попробуйте другую категорию или обновите позже',
    scr_lock_text: 'Показаны {shown} из {total} сигналов. Ещё {hidden} — по подписке.',
    scr_lock_btn: 'Оформить подписку', scr_updated_prefix: 'Обновлено',

    an_word: 'Seno · Анализ', an_verdict_sub: 'Сетап по confluence-факторам', an_wait: 'НЕЙТРАЛЬНО',
    an_conf_label: 'уверенность', an_chart_loading: 'Загружаю график…',
    an_entry: 'Вход', an_stop: 'Стоп-лосс', an_rr: 'Risk / Reward', an_no_setup: 'Нет чёткого сигнала', an_setup_label: 'Сетап',
    an_reasons_title: 'Почему такой сигнал', an_reasons_empty: 'Недостаточно факторов для чёткого сигнала.',
    an_factors_link: 'Все факторы →', an_disclaimer: '⚠️ Не является инвестиционной рекомендацией',
    an_lock_text: 'Полный анализ этой монеты доступен по подписке. Бесплатно можно посмотреть BTC/USDT на 4ч.',
    an_lock_btn: 'Оформить подписку — $59/мес', an_main_btn: 'Обновить анализ',
    an_locked_short: '🔒', an_picker_search: 'Найти монету, например BTC', an_no_data: 'Не удалось получить данные по {symbol}',
    an_locked_title: 'Доступно по подписке', an_picker_empty: 'Ничего не найдено',

    fa_word: 'Seno · Факторы', fa_summary: 'Активных факторов: {total} · {up} · {down}',
    fa_up_word: 'за рост', fa_down_word: 'за падение',
    fa_lock_text: 'Разбор факторов доступен по подписке.', fa_lock_btn: 'Оформить подписку — $59/мес',
    fa_load_error: 'Не удалось загрузить факторы.', fa_long: 'LONG', fa_short: 'SHORT', fa_neutral: 'НЕЙТРАЛЬНО',

    sub_word: 'Seno · Подписка', sub_status_label: 'Статус подписки', sub_active_status: 'Подписка Seno активна',
    sub_until: 'Действует до', sub_days_left: 'Осталось дней', sub_period: 'в месяц',
    sub_feat1: 'Скринер по всему рынку, 3 таймфрейма', sub_feat2: 'Неограниченный анализ монет',
    sub_feat3: 'Точки входа, стоп-лосс и тейк-профиты', sub_feat4: 'Разбор факторов по каждому сигналу',
    sub_feat5: 'Данные с Bybit, OKX и Binance',
    sub_pay_method: 'Способ оплаты', sub_invoice_text: 'Счёт на ${amount} создан. После оплаты нажмите «Проверить оплату».',
    sub_pay_btn: '💳 Оплатить', sub_check_btn: '🔄 Проверить оплату',
    sub_trust: 'Оплата проходит через CryptoBot · Доступ открывается автоматически',
    sub_faq_title: 'Частые вопросы',
    sub_faq_q1: 'Что будет после окончания подписки?', sub_faq_a1: 'Доступ к скринеру и анализу закроется, но история и настройки сохранятся — при продлении всё вернётся как было.',
    sub_faq_q2: 'Можно ли вернуть деньги?', sub_faq_a2: 'Оплата через крипто-платёжные системы необратима по их правилам — это особенность блокчейн-платежей, а не наше ограничение.',
    sub_faq_q3: 'Работает ли на телефоне?', sub_faq_a3: 'Да, Seno работает прямо внутри Telegram на любом устройстве — отдельно устанавливать ничего не нужно.',
    sub_renew_btn: 'Продлить подписку', sub_pay_amount_btn: 'Оплатить ${amount}',
    sub_no_providers: 'Оплата временно недоступна — ни один способ не настроен.',
    sub_invoice_failed: 'Не удалось создать счёт. Попробуйте другой способ оплаты позже.',
    sub_payment_not_found: 'Оплата пока не найдена. Если вы уже оплатили — подождите немного и попробуйте ещё раз.',
    sub_invoice_expired: 'Счёт истёк. Создайте новый.',

    ref_word: 'Seno · Рефералы', ref_earned: 'Заработано всего',
    ref_invited: 'Приглашено', ref_paid: 'Оплатили', ref_available: 'Доступно к выводу',
    ref_share_btn: 'Поделиться', ref_how: 'Как это работает',
    ref_step1: 'Приглашаете друга по <b>реферальной ссылке</b>',
    ref_step2: 'Друг оформляет <b>подписку Seno</b>',
    ref_step3: 'Вы получаете {pct} с каждой его оплаты, включая продления',
    ref_condition: 'Условие для вывода', ref_of: '{a} из {b}',
    ref_note_ok: 'Условие выполнено — доступен вывод от {n} оплативших рефералов',
    ref_note_pending: 'Осталось {left} оплативших рефералов до вывода (минимум ${min} на балансе)',
    ref_invited_title: 'Приглашённые', ref_invited_empty: 'Пока никого не пригласили — поделитесь ссылкой выше',
    ref_paid_status: 'Оплатил', ref_unpaid_status: 'Не оплатил', ref_load_error: 'Не удалось загрузить данные. Откройте через Telegram.',
    ref_payout_btn: 'Запросить выплату', ref_share_text: 'Присоединяйся к Seno — технический анализ крипты с готовыми сетапами',
    ref_payout_failed: 'Не удалось создать заявку.',

    set_word: 'Seno · Настройки', set_trading: 'Торговля', set_account: 'Аккаунт',
    set_exchange: 'Биржа для данных', set_watchlist: 'Отслеживаемые монеты', set_coins: '{n} монет',
    set_tg_id: 'Telegram ID', set_lang: 'Язык', set_disclaimer: 'Аналитика не является инвестиционной рекомендацией. Торговля криптовалютой сопряжена с риском потери средств.',
    set_no_profile: 'Не удалось загрузить профиль', set_trader: 'Трейдер', set_on_since: 'На связи с {date}',
    set_active: 'Активна', set_no_sub: 'Нет подписки',

    pw_title: 'Доступно по подписке Seno', pw_text: 'Скринер и анализ монет открываются с активной подпиской',
    pw_price_period: '/ мес', pw_btn: 'Оформить подписку', pw_screener_title: 'Скринер',
    pw_seg_scalping: 'Скальпинг', pw_seg_swing: 'Дневная', pw_seg_position: 'Долгосрочная',
  },
  en: {
    disclaimer_short: '⚠️ Not investment advice',
    back: 'Back', loading: 'Loading…', close: 'Close',

    onb_headline: 'Ready-made trade setups — entry, stop and targets in seconds',
    onb_f1_title: 'Automatic market screening', onb_f1_desc: 'The app finds setups across dozens of coins by itself',
    onb_f2_title: 'Entry, stop-loss and take-profits', onb_f2_desc: 'The math is done for you — no manual level calculations',
    onb_f3_title: 'Factor breakdown', onb_f3_desc: 'See exactly why a signal was issued',
    onb_preview_label: "This is what a signal looks like",
    onb_disclaimer: 'This is analytics, not investment advice. Trading crypto carries risk of loss.',
    onb_cta: 'See signals →', onb_how: 'How it works',

    menu_signals: 'Live signals', menu_sections: 'Sections',
    menu_fng: 'Fear & Greed Index', menu_dom: 'BTC dominance',
    menu_sub_none: 'No subscription', menu_sub_active: 'Active · {n}d',
    menu_screener_t: 'Screener', menu_screener_d: 'Find setups across the market',
    menu_analysis_t: 'Analysis', menu_analysis_d: 'Breakdown of a specific coin',
    menu_referral_t: 'Referrals', menu_referral_d: '40% of every invited friend’s payment',
    menu_subscription_t: 'Subscription', menu_subscription_d: 'Manage your access',
    menu_empty_signals: 'No confident signals yet — market is ranging',
    menu_updated: 'Updated just now', menu_load_error: 'Failed to load market context',
    menu_guest: 'Guest',

    scr_title: 'Screener', scr_seg_scalping: 'Scalping', scr_seg_swing: 'Swing', scr_seg_position: 'Position',
    scr_empty_t: 'No signals found', scr_empty_d: 'Market is ranging — try another category or refresh later',
    scr_lock_text: 'Showing {shown} of {total} signals. {hidden} more with a subscription.',
    scr_lock_btn: 'Subscribe', scr_updated_prefix: 'Updated',

    an_word: 'Seno · Analysis', an_verdict_sub: 'Confluence-based setup', an_wait: 'NEUTRAL',
    an_conf_label: 'confidence', an_chart_loading: 'Loading chart…',
    an_entry: 'Entry', an_stop: 'Stop-loss', an_rr: 'Risk / Reward', an_no_setup: 'No clear signal', an_setup_label: 'Setup',
    an_reasons_title: 'Why this signal', an_reasons_empty: 'Not enough factors for a clear signal.',
    an_factors_link: 'All factors →', an_disclaimer: '⚠️ Not investment advice',
    an_lock_text: 'Full analysis of this coin needs a subscription. BTC/USDT on 4h is free to try.',
    an_lock_btn: 'Subscribe — $59/mo', an_main_btn: 'Refresh analysis',
    an_locked_short: '🔒', an_picker_search: 'Find a coin, e.g. BTC', an_no_data: 'Failed to get data for {symbol}',
    an_locked_title: 'Available with subscription', an_picker_empty: 'Nothing found',

    fa_word: 'Seno · Factors', fa_summary: 'Active factors: {total} · {up} · {down}',
    fa_up_word: 'bullish', fa_down_word: 'bearish',
    fa_lock_text: 'Full factor breakdown needs a subscription.', fa_lock_btn: 'Subscribe — $59/mo',
    fa_load_error: 'Failed to load factors.', fa_long: 'LONG', fa_short: 'SHORT', fa_neutral: 'NEUTRAL',

    sub_word: 'Seno · Subscription', sub_status_label: 'Subscription status', sub_active_status: 'Seno subscription is active',
    sub_until: 'Valid until', sub_days_left: 'Days left', sub_period: 'per month',
    sub_feat1: 'Market-wide screener, 3 timeframes', sub_feat2: 'Unlimited coin analysis',
    sub_feat3: 'Entry, stop-loss and take-profit levels', sub_feat4: 'Factor breakdown for every signal',
    sub_feat5: 'Data from Bybit, OKX and Binance',
    sub_pay_method: 'Payment method', sub_invoice_text: 'Invoice for ${amount} created. Tap "Check payment" after paying.',
    sub_pay_btn: '💳 Pay', sub_check_btn: '🔄 Check payment',
    sub_trust: 'Payment goes through CryptoBot · Access unlocks automatically',
    sub_faq_title: 'FAQ',
    sub_faq_q1: 'What happens after the subscription ends?', sub_faq_a1: 'Screener and analysis access closes, but your history and settings stay — everything comes back on renewal.',
    sub_faq_q2: 'Can I get a refund?', sub_faq_a2: 'Payments via crypto payment systems are irreversible by their own rules — that’s how blockchain payments work, not a restriction we impose.',
    sub_faq_q3: 'Does it work on mobile?', sub_faq_a3: 'Yes, Seno runs right inside Telegram on any device — nothing extra to install.',
    sub_renew_btn: 'Renew subscription', sub_pay_amount_btn: 'Pay ${amount}',
    sub_no_providers: 'Payment is temporarily unavailable — no payment method is configured.',
    sub_invoice_failed: 'Failed to create an invoice. Try another payment method later.',
    sub_payment_not_found: 'Payment not found yet. If you already paid, wait a bit and try again.',
    sub_invoice_expired: 'Invoice expired. Create a new one.',

    ref_word: 'Seno · Referrals', ref_earned: 'Total earned',
    ref_invited: 'Invited', ref_paid: 'Paid', ref_available: 'Available to withdraw',
    ref_share_btn: 'Share', ref_how: 'How it works',
    ref_step1: 'You invite a friend via your <b>referral link</b>',
    ref_step2: 'Your friend subscribes to <b>Seno</b>',
    ref_step3: 'You get {pct} of every payment they make, including renewals',
    ref_condition: 'Withdrawal condition', ref_of: '{a} of {b}',
    ref_note_ok: 'Condition met — withdrawal available from {n} paying referrals',
    ref_note_pending: '{left} more paying referrals needed (minimum ${min} balance)',
    ref_invited_title: 'Invited', ref_invited_empty: "You haven't invited anyone yet — share your link above",
    ref_paid_status: 'Paid', ref_unpaid_status: 'Not paid', ref_load_error: 'Failed to load data. Open via Telegram.',
    ref_payout_btn: 'Request payout', ref_share_text: 'Join Seno — crypto technical analysis with ready-made setups',
    ref_payout_failed: 'Failed to create the request.',

    set_word: 'Seno · Settings', set_trading: 'Trading', set_account: 'Account',
    set_exchange: 'Data exchange', set_watchlist: 'Tracked coins', set_coins: '{n} coins',
    set_tg_id: 'Telegram ID', set_lang: 'Language', set_disclaimer: 'This is analytics, not investment advice. Trading crypto carries risk of loss.',
    set_no_profile: 'Failed to load profile', set_trader: 'Trader', set_on_since: 'Member since {date}',
    set_active: 'Active', set_no_sub: 'No subscription',

    pw_title: 'Available with Seno subscription', pw_text: 'Screener and coin analysis unlock with an active subscription',
    pw_price_period: '/ mo', pw_btn: 'Subscribe', pw_screener_title: 'Screener',
    pw_seg_scalping: 'Scalping', pw_seg_swing: 'Swing', pw_seg_position: 'Position',
  },
};

function t(key, vars) {
  const lang = currentLang();
  let str = (I18N[lang] && I18N[lang][key]) || (I18N.ru[key]) || key;
  if (vars) {
    Object.keys(vars).forEach(function (k) {
      str = str.replace('{' + k + '}', vars[k]);
    });
  }
  return str;
}

function applyI18n(root) {
  (root || document).querySelectorAll('[data-i18n]').forEach(function (el) {
    el.innerHTML = t(el.getAttribute('data-i18n'));
  });
  (root || document).querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
    el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
  });
}

function langBtnStyle(active) {
  return 'border:none;font-family:var(--font);font-size:10.5px;font-weight:700;padding:4px 7px;border-radius:6px;cursor:pointer;background:' +
    (active ? 'var(--accent)' : 'transparent') + ';color:' + (active ? '#04342C' : 'var(--text-secondary)') + ';';
}

function injectLangSwitcher() {
  const host = document.getElementById('lang-host') || document.querySelector('.user-block') ||
    document.querySelector('.topbar') || document.querySelector('header');
  if (!host || document.getElementById('lang-switch')) return;
  const lang = currentLang();
  const wrap = document.createElement('div');
  wrap.id = 'lang-switch';
  wrap.style.cssText = 'display:flex;gap:2px;background:var(--surface-raised);border:1px solid var(--border);border-radius:8px;padding:2px;flex:none;margin-left:auto;';
  wrap.innerHTML =
    '<button type="button" data-lang="ru" style="' + langBtnStyle(lang === 'ru') + '">RU</button>' +
    '<button type="button" data-lang="en" style="' + langBtnStyle(lang === 'en') + '">EN</button>';

  if (host.classList.contains('user-block')) {
    host.insertBefore(wrap, host.firstChild);
  } else {
    host.appendChild(wrap);
  }

  wrap.querySelectorAll('button').forEach(function (b) {
    b.addEventListener('click', function () {
      haptic('light');
      setLang(b.getAttribute('data-lang'));
    });
  });
}

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
document.addEventListener('DOMContentLoaded', function () {
  injectLangSwitcher();
  applyI18n();
});
if (document.readyState !== 'loading') {
  injectLangSwitcher();
  applyI18n();
}
