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
    back: 'Назад', loading: 'Загрузка…', close: 'Закрыть', retry: 'Повторить',

    nav_home: 'Главная', nav_screener: 'Скринер', nav_analysis: 'Анализ', nav_referral: 'Рефералы', nav_settings: 'Ещё',

    onb_slide1_tag: 'Технический анализ', onb_slide1_title: 'Готовые сетапы вместо часов у графиков',
    onb_slide1_text: 'Seno сканирует рынок и присылает вход, стоп и цели — считать руками не нужно.',
    onb_slide2_tag: 'Под капотом', onb_slide2_title: 'Уровни, ордерблоки, FVG, паттерны',
    onb_slide2_text: 'Каждый сигнал разложен на факторы: видно, что именно на него повлияло и почему.',
    onb_slide3_tag: 'Прозрачно', onb_slide3_title: 'Без «AI-прогнозов» и обещаний точности',
    onb_slide3_text: 'Только объективные, воспроизводимые индикаторы. Решение — всегда за вами.',
    onb_stat1: '19', onb_stat1_l: 'монет', onb_stat2: '3', onb_stat2_l: 'биржи', onb_stat3: '3', onb_stat3_l: 'стратегии',
    onb_disclaimer: 'Аналитика не является инвестиционной рекомендацией. Торговля криптовалютой сопряжена с риском потери средств.',
    onb_cta: 'Смотреть сигналы', onb_skip: 'Пропустить',

    menu_greeting: 'С возвращением', menu_signals: 'Сигналы сейчас', menu_sections: 'Разделы',
    menu_fng: 'Индекс страха и жадности', menu_dom: 'Доминация BTC',
    menu_sub_none: 'Нет подписки', menu_sub_active: 'Активна · {n} дн.',
    menu_screener_t: 'Скринер', menu_screener_d: 'Поиск сетапов по рынку',
    menu_analysis_t: 'Анализ', menu_analysis_d: 'Разбор конкретной монеты',
    menu_referral_t: 'Рефералы', menu_referral_d: '40% с каждого приглашённого',
    menu_subscription_t: 'Подписка', menu_subscription_d: 'Управление доступом',
    menu_empty_signals: 'Пока нет уверенных сигналов — рынок в боковике',
    menu_updated: 'Обновлено только что', menu_load_error: 'Не удалось загрузить рыночный контекст',
    menu_guest: 'Гость', menu_all_signals: 'Все сигналы →',

    scr_title: 'Скринер', scr_seg_scalping: 'Скальпинг', scr_seg_swing: 'Дневная', scr_seg_position: 'Долгосрочная',
    scr_empty_t: 'Сигналов не найдено', scr_empty_d: 'Рынок в боковике — попробуйте другую категорию или обновите позже',
    scr_lock_text: 'Показаны {shown} из {total} сигналов. Ещё {hidden} — по подписке.',
    scr_lock_btn: 'Оформить подписку', scr_updated_prefix: 'Обновлено', scr_error_t: 'Не удалось загрузить',
    scr_error_d: 'Проверьте соединение и попробуйте ещё раз',

    an_word: 'Анализ', an_verdict_sub: 'Сетап по confluence-факторам', an_wait: 'НЕЙТРАЛЬНО',
    an_conf_label: 'уверенность', an_chart_loading: 'Загружаю график…',
    an_entry: 'Вход', an_stop: 'Стоп-лосс', an_rr: 'Risk / Reward', an_no_setup: 'Нет чёткого сигнала', an_setup_label: 'Сетап',
    an_reasons_title: 'Почему такой сигнал', an_reasons_empty: 'Недостаточно факторов для чёткого сигнала.',
    an_factors_link: 'Все факторы →', an_disclaimer: '⚠️ Не является инвестиционной рекомендацией',
    an_lock_text: 'Полный анализ этой монеты доступен по подписке. Бесплатно можно посмотреть BTC/USDT на 4ч.',
    an_lock_btn: 'Оформить подписку — $59/мес', an_main_btn: 'Обновить анализ',
    an_locked_short: '🔒', an_picker_search: 'Найти монету, например BTC', an_no_data: 'Не удалось получить данные по {symbol}',
    an_locked_title: 'Доступно по подписке', an_picker_empty: 'Ничего не найдено',

    fa_word: 'Факторы', fa_summary: 'Активных факторов: {total} · {up} · {down}',
    fa_up_word: 'за рост', fa_down_word: 'за падение',
    fa_lock_text: 'Разбор факторов доступен по подписке.', fa_lock_btn: 'Оформить подписку — $59/мес',
    fa_load_error: 'Не удалось загрузить факторы.', fa_long: 'LONG', fa_short: 'SHORT', fa_neutral: 'НЕЙТРАЛЬНО',

    sub_word: 'Подписка', sub_status_label: 'Статус подписки', sub_active_status: 'Подписка Seno активна',
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
    sub_invoice_expired: 'Счёт истёк. Создайте новый.', sub_select_method: 'Выберите способ оплаты',

    ref_word: 'Рефералы', ref_earned: 'Заработано всего',
    ref_invited: 'Приглашено', ref_paid: 'Оплатили', ref_available: 'Доступно к выводу',
    ref_share_btn: 'Поделиться', ref_how: 'Как это работает', ref_copied: 'Скопировано',
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

    set_word: 'Настройки', set_trading: 'Торговля', set_account: 'Аккаунт',
    set_exchange: 'Биржа для данных', set_watchlist: 'Отслеживаемые монеты', set_coins: '{n} монет',
    set_tg_id: 'Telegram ID', set_lang: 'Язык', set_disclaimer: 'Аналитика не является инвестиционной рекомендацией. Торговля криптовалютой сопряжена с риском потери средств.',
    set_no_profile: 'Не удалось загрузить профиль', set_trader: 'Трейдер', set_on_since: 'На связи с {date}',
    set_active: 'Активна', set_no_sub: 'Нет подписки', set_version: 'Версия',

    pw_title: 'Доступно по подписке Seno', pw_text: 'Скринер и анализ монет открываются с активной подпиской',
    pw_price_period: '/ мес', pw_btn: 'Оформить подписку', pw_screener_title: 'Скринер',
    pw_seg_scalping: 'Скальпинг', pw_seg_swing: 'Дневная', pw_seg_position: 'Долгосрочная',
  },
  en: {
    disclaimer_short: '⚠️ Not investment advice',
    back: 'Back', loading: 'Loading…', close: 'Close', retry: 'Retry',

    nav_home: 'Home', nav_screener: 'Screener', nav_analysis: 'Analysis', nav_referral: 'Referrals', nav_settings: 'More',

    onb_slide1_tag: 'Technical analysis', onb_slide1_title: 'Ready setups instead of hours staring at charts',
    onb_slide1_text: 'Seno scans the market and sends you entry, stop and targets — no manual math.',
    onb_slide2_tag: 'Under the hood', onb_slide2_title: 'Levels, order blocks, FVGs, patterns',
    onb_slide2_text: 'Every signal breaks down into factors — you see exactly what drove it and why.',
    onb_slide3_tag: 'Transparent', onb_slide3_title: 'No "AI predictions" or accuracy claims',
    onb_slide3_text: 'Just objective, reproducible indicators. The decision is always yours.',
    onb_stat1: '19', onb_stat1_l: 'coins', onb_stat2: '3', onb_stat2_l: 'exchanges', onb_stat3: '3', onb_stat3_l: 'strategies',
    onb_disclaimer: 'This is analytics, not investment advice. Trading crypto carries risk of loss.',
    onb_cta: 'See signals', onb_skip: 'Skip',

    menu_greeting: 'Welcome back', menu_signals: 'Live signals', menu_sections: 'Sections',
    menu_fng: 'Fear & Greed Index', menu_dom: 'BTC dominance',
    menu_sub_none: 'No subscription', menu_sub_active: 'Active · {n}d',
    menu_screener_t: 'Screener', menu_screener_d: 'Find setups across the market',
    menu_analysis_t: 'Analysis', menu_analysis_d: 'Breakdown of a specific coin',
    menu_referral_t: 'Referrals', menu_referral_d: '40% of every invited friend’s payment',
    menu_subscription_t: 'Subscription', menu_subscription_d: 'Manage your access',
    menu_empty_signals: 'No confident signals yet — market is ranging',
    menu_updated: 'Updated just now', menu_load_error: 'Failed to load market context',
    menu_guest: 'Guest', menu_all_signals: 'All signals →',

    scr_title: 'Screener', scr_seg_scalping: 'Scalping', scr_seg_swing: 'Swing', scr_seg_position: 'Position',
    scr_empty_t: 'No signals found', scr_empty_d: 'Market is ranging — try another category or refresh later',
    scr_lock_text: 'Showing {shown} of {total} signals. {hidden} more with a subscription.',
    scr_lock_btn: 'Subscribe', scr_updated_prefix: 'Updated', scr_error_t: 'Failed to load',
    scr_error_d: 'Check your connection and try again',

    an_word: 'Analysis', an_verdict_sub: 'Confluence-based setup', an_wait: 'NEUTRAL',
    an_conf_label: 'confidence', an_chart_loading: 'Loading chart…',
    an_entry: 'Entry', an_stop: 'Stop-loss', an_rr: 'Risk / Reward', an_no_setup: 'No clear signal', an_setup_label: 'Setup',
    an_reasons_title: 'Why this signal', an_reasons_empty: 'Not enough factors for a clear signal.',
    an_factors_link: 'All factors →', an_disclaimer: '⚠️ Not investment advice',
    an_lock_text: 'Full analysis of this coin needs a subscription. BTC/USDT on 4h is free to try.',
    an_lock_btn: 'Subscribe — $59/mo', an_main_btn: 'Refresh analysis',
    an_locked_short: '🔒', an_picker_search: 'Find a coin, e.g. BTC', an_no_data: 'Failed to get data for {symbol}',
    an_locked_title: 'Available with subscription', an_picker_empty: 'Nothing found',

    fa_word: 'Factors', fa_summary: 'Active factors: {total} · {up} · {down}',
    fa_up_word: 'bullish', fa_down_word: 'bearish',
    fa_lock_text: 'Full factor breakdown needs a subscription.', fa_lock_btn: 'Subscribe — $59/mo',
    fa_load_error: 'Failed to load factors.', fa_long: 'LONG', fa_short: 'SHORT', fa_neutral: 'NEUTRAL',

    sub_word: 'Subscription', sub_status_label: 'Subscription status', sub_active_status: 'Seno subscription is active',
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
    sub_invoice_expired: 'Invoice expired. Create a new one.', sub_select_method: 'Choose a payment method',

    ref_word: 'Referrals', ref_earned: 'Total earned',
    ref_invited: 'Invited', ref_paid: 'Paid', ref_available: 'Available to withdraw',
    ref_share_btn: 'Share', ref_how: 'How it works', ref_copied: 'Copied',
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

    set_word: 'Settings', set_trading: 'Trading', set_account: 'Account',
    set_exchange: 'Data exchange', set_watchlist: 'Tracked coins', set_coins: '{n} coins',
    set_tg_id: 'Telegram ID', set_lang: 'Language', set_disclaimer: 'This is analytics, not investment advice. Trading crypto carries risk of loss.',
    set_no_profile: 'Failed to load profile', set_trader: 'Trader', set_on_since: 'Member since {date}',
    set_active: 'Active', set_no_sub: 'No subscription', set_version: 'Version',

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
