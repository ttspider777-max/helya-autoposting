const tg = window.Telegram?.WebApp;
const initData = tg?.initData || '';
const $ = (sel, root = document) => root.querySelector(sel);
const view = $('#view');
const sheet = $('#sheet');
const sheetBody = $('#sheetBody');

const S = { tab: 'profile', me: null, accounts: [], mailings: [], pay: {}, wiz: {}, onClose: null };

const INTERVAL_LABEL = { 30: '30 минут', 60: '1 час', 120: '2 часа', 240: '4 часа', 720: '12 часов', 1440: '24 часа' };
const KIND_ICON = { topup: 'wallet', ref: 'users', sub: 'crown', admin: 'gift' };

const ICON = {
  wallet: '<path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2"/><path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2H5a2 2 0 0 1-2-2Z"/><circle cx="16.5" cy="13.5" r="1"/>',
  crown: '<path d="m3 8 4 4 5-7 5 7 4-4-2 11H5L3 8Z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/><path d="M9 11h.01M12.5 11h.01M16 11h.01"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  megaphone: '<path d="M3 11v2a1 1 0 0 0 1 1h3l8 5V5L7 10H4a1 1 0 0 0-1 1Z"/><path d="M18.5 9a4.2 4.2 0 0 1 0 6"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  play: '<path d="M7 5v14l12-7L7 5Z"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2.5"/>',
  gift: '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12M12 8c-1.5-4-6-4-5-1 .6 1.6 5 1 5 1Zm0 0c1.5-4 6-4 5-1-.6 1.6-5 1-5 1Z"/>',
  arrow: '<path d="M9 6l6 6-6 6"/>',
};
const ic = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[name]}</svg>`;

const SNOWCAP = '<svg class="snowcap" viewBox="0 0 400 40" preserveAspectRatio="none"><path fill="#fff" d="M0 0h400v14c-14 10-26 2-38 8s-20 14-34 6-22-12-40-4-30 12-46 4-24-10-40-2-28 14-44 6-22-10-38-4-26 10-42 4-20-8-38-2-24 8-40 0V0z"/></svg>';
const TREE = `<svg class="tree" viewBox="0 0 120 140" fill="none">
  <defs>
    <linearGradient id="trA" x1=".2" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="#2fae74"/><stop offset=".55" stop-color="#14734a"/><stop offset="1" stop-color="#083d29"/></linearGradient>
    <linearGradient id="trShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#021a11" stop-opacity=".75"/><stop offset="1" stop-color="#021a11" stop-opacity="0"/></linearGradient>
    <linearGradient id="trTrunk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6b4526"/><stop offset="1" stop-color="#3a2413"/></linearGradient>
    <radialGradient id="trGlow"><stop offset="0" stop-color="#f4d58d" stop-opacity=".7"/><stop offset="1" stop-color="#f4d58d" stop-opacity="0"/></radialGradient>
    <clipPath id="trC3"><path d="M60 62C70 82 86 96 102 108q3 6-4 6H22q-7 0-4-6C34 96 50 82 60 62Z"/></clipPath>
    <clipPath id="trC2"><path d="M60 40C68 56 80 68 92 78q3 5-3 5H31q-6 0-3-5C40 68 52 56 60 40Z"/></clipPath>
  </defs>
  <ellipse cx="60" cy="129" rx="40" ry="5" fill="#fff" opacity=".13"/>
  <rect x="54" y="110" width="12" height="18" rx="2.5" fill="url(#trTrunk)"/>
  <path d="M60 62C70 82 86 96 102 108q3 6-4 6H22q-7 0-4-6C34 96 50 82 60 62Z" fill="url(#trA)"/>
  <rect x="20" y="78" width="80" height="16" fill="url(#trShade)" clip-path="url(#trC3)"/>
  <path d="M60 40C68 56 80 68 92 78q3 5-3 5H31q-6 0-3-5C40 68 52 56 60 40Z" fill="url(#trA)"/>
  <rect x="30" y="52" width="60" height="14" fill="url(#trShade)" clip-path="url(#trC2)"/>
  <path d="M60 22C66 34 74 44 82 52q2 4-3 4H41q-5 0-3-4C46 44 54 34 60 22Z" fill="url(#trA)"/>
  <g fill="#fff">
    <path d="M60 22c2.6 5.2 5.4 9.6 8.6 13.6-3-1.5-5.8-1.2-8.6.9-2.8-2.1-5.6-2.4-8.6-.9 3.2-4 6-8.4 8.6-13.6Z" opacity=".95"/>
    <path d="M38.5 52c-2 2.4-1 4 2.5 4h12c-4.5-.6-9.5-1.7-14.5-4Z" opacity=".85"/>
    <path d="M28.5 78c-2.6 3-1.6 5 2.5 5h17c-6.5-.7-13-2.2-19.5-5Z" opacity=".85"/>
    <path d="M18.5 108c-3 3.6-1.8 6 3.5 6h22c-8.5-.8-17-2.7-25.5-6Z" opacity=".85"/>
  </g>
  <g stroke="#f4d58d" stroke-opacity=".55" stroke-width="1" stroke-linecap="round">
    <path d="M47 43q13 7 28 1"/><path d="M38 68q22 10 46 0"/><path d="M29 97q31 13 63 0"/>
  </g>
  <g>
    <g class="orn"><circle cx="55" cy="46.5" r="5" fill="#ff4f5e" opacity=".3"/><circle cx="55" cy="46.5" r="2.3" fill="#ff6f7b"/></g>
    <g class="orn" style="animation-delay:.7s"><circle cx="69" cy="46" r="5" fill="#f4d58d" opacity=".3"/><circle cx="69" cy="46" r="2.3" fill="#fbe7b0"/></g>
    <g class="orn" style="animation-delay:1.2s"><circle cx="47" cy="71.5" r="5" fill="#a9dcff" opacity=".3"/><circle cx="47" cy="71.5" r="2.3" fill="#d3edff"/></g>
    <g class="orn" style="animation-delay:.3s"><circle cx="61" cy="73.5" r="5" fill="#f4d58d" opacity=".3"/><circle cx="61" cy="73.5" r="2.3" fill="#fbe7b0"/></g>
    <g class="orn" style="animation-delay:1.6s"><circle cx="75" cy="71" r="5" fill="#ff4f5e" opacity=".3"/><circle cx="75" cy="71" r="2.3" fill="#ff6f7b"/></g>
    <g class="orn" style="animation-delay:.9s"><circle cx="39" cy="100.5" r="5" fill="#f4d58d" opacity=".3"/><circle cx="39" cy="100.5" r="2.3" fill="#fbe7b0"/></g>
    <g class="orn" style="animation-delay:.1s"><circle cx="53" cy="103.2" r="5" fill="#ff4f5e" opacity=".3"/><circle cx="53" cy="103.2" r="2.3" fill="#ff6f7b"/></g>
    <g class="orn" style="animation-delay:1.4s"><circle cx="68" cy="103" r="5" fill="#a9dcff" opacity=".3"/><circle cx="68" cy="103" r="2.3" fill="#d3edff"/></g>
    <g class="orn" style="animation-delay:.5s"><circle cx="82" cy="100" r="5" fill="#f4d58d" opacity=".3"/><circle cx="82" cy="100" r="2.3" fill="#fbe7b0"/></g>
  </g>
  <circle cx="60" cy="14" r="15" fill="url(#trGlow)"/>
  <path d="M60 5l2.23 5.93 6.33.290-4.95 3.95 1.68 6.11L60 17.8l-5.29 3.48 1.68-6.11-4.95-3.95 6.33-.290L60 5Z" fill="#f8dc9a" stroke="#fff3cf" stroke-width=".6" stroke-linejoin="round"/>
</svg>`;

const FAQ = [
  ['Что такое hlx?', 'Это внутренняя валюта сервиса. Ей оплачивается подписка. Пополнить баланс можно звёздами Telegram, через CryptoBot или xRocket.'],
  ['Как подключить аккаунт?', 'Откройте вкладку «Аккаунты», нажмите «Подключить по номеру», введите номер и код, который придёт в Telegram. Если включена двухэтапная защита — понадобится облачный пароль.'],
  ['Это безопасно?', 'Вход выполняется через официальный API Telegram. Сессия хранится в зашифрованном виде и видна у вас в Telegram → Настройки → Устройства — её можно завершить в любой момент.'],
  ['Как работает рассылка?', 'Вы выбираете аккаунт, чаты, текст и интервал. Сообщение отправляется во все выбранные чаты по кругу с паузой между отправками, затем сервис ждёт заданный интервал. В конец каждого сообщения добавляется подпись с юзернеймом бота.'],
  ['Почему чат пропал из рассылки?', 'Если в чате запретили писать или аккаунт исключили, сервис убирает этот чат из рассылки и не пытается отправлять туда снова.'],
  ['Сколько аккаунтов можно подключить?', 'Без подписки — до 5, с подпиской — до 10.'],
  ['Как отключить аккаунт?', 'Нажмите на корзину рядом с аккаунтом. Сессия будет завершена, а рассылки с него удалены.'],
];

// ---------- утилиты ----------

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const fmtDate = ts => { const d = new Date(ts * 1000); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const rub = n => `${n} <span class="rub">₽</span>`;
const haptic = (type = 'light') => { try { tg?.HapticFeedback?.impactOccurred(type); } catch {} };

async function api(path, body, method) {
  const res = await fetch('api/' + path, {
    method: method || (body ? 'POST' : 'GET'),
    headers: { 'X-Init-Data': initData, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({ error: 'Ошибка сети' }));
  if (!res.ok) {
    const e = new Error(data.error || 'Ошибка');
    e.data = data;
    throw e;
  }
  return data;
}

let toastTimer;
function toast(text, isError) {
  const el = $('#toast');
  el.textContent = text;
  el.className = 'toast show' + (isError ? ' err' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 2600);
  try { tg?.HapticFeedback?.notificationOccurred(isError ? 'error' : 'success'); } catch {}
}

function openUrl(url) {
  try {
    if (/^https:\/\/t\.me\//.test(url)) tg.openTelegramLink(url);
    else tg.openLink(url);
  } catch { window.open(url, '_blank'); }
}

function openSheet(html, onClose) {
  S.onClose = onClose || null;
  sheetBody.innerHTML = html;
  sheetBody.scrollTop = 0;
  sheet.classList.add('open');
  $('#scrim').classList.add('open');
}

function closeSheet() {
  sheet.classList.remove('open');
  $('#scrim').classList.remove('open');
  const cb = S.onClose;
  S.onClose = null;
  cb?.();
}

// Кнопка блокируется на время запроса, ошибка показывается тостом
async function run(btn, fn) {
  btn?.classList.add('busy');
  try { await fn(); } catch (e) { toast(e.message, true); } finally { btn?.classList.remove('busy'); }
}

function confirmSheet(title, text, label, onYes) {
  S.confirm = onYes;
  openSheet(`<h2>${esc(title)}</h2><p class="lead">${esc(text)}</p>
    <div class="stack"><button class="btn danger wide" data-act="confirm-yes">${esc(label)}</button>
    <button class="btn ghost wide" data-act="close">Отмена</button></div>`);
}

// ---------- загрузка данных ----------

async function loadMe() { S.me = await api('me'); }
async function loadAccounts() { S.accounts = (await api('accounts')).accounts; }
async function loadMailings() { S.mailings = (await api('mailings')).mailings; }

function render() {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === S.tab));
  ({ profile: renderProfile, mailings: renderMailings, accounts: renderAccounts })[S.tab]();
}

async function switchTab(tab) {
  S.tab = tab;
  render();
  window.scrollTo(0, 0);
  try {
    if (tab === 'profile') await loadMe();
    else await Promise.all([loadAccounts(), loadMailings()]);
    if (S.tab === tab) render();
  } catch (e) { toast(e.message, true); }
}

// ---------- профиль ----------

function renderProfile() {
  const u = S.me.user;
  const tile = (act, icon, label, half) => `<button class="tile${half ? ' half' : ''}" data-act="${act}"><span class="tile-ic">${ic(icon)}</span>${label}</button>`;
  view.innerHTML = `
    <section class="hero">
      ${SNOWCAP}
      <div class="hello">привет, ${esc(u.name)} ❄</div>
      <div class="balance"><b>${u.balance}</b><span>hlx</span></div>
      <div class="pill ${u.sub_active ? 'on' : 'off'}"><i></i>${u.sub_active ? 'Подписка до ' + fmtDate(u.sub_until) : 'Подписка не активна'}</div>
      <div class="hero-actions">
        <button class="btn primary" data-act="topup">${ic('wallet')}Пополнить</button>
        <button class="btn ghost" data-act="sub">Подписка</button>
      </div>
      ${TREE}
    </section>
    <section class="tiles">
      ${tile('invite', 'users', 'Пригласить друзей')}
      ${tile('support', 'chat', 'Поддержка')}
      ${tile('faq', 'list', 'Частые вопросы')}
      ${tile('history', 'clock', 'Сводка и история', true)}
      ${tile('docs', 'file', 'Документы', true)}
    </section>`;
}

function topupSheet() {
  const { pkg, method } = S.pay;
  const packs = S.me.packages.map(p => `
    <button class="pack${p.id === pkg ? ' active' : ''}" data-act="pick-pack" data-id="${p.id}">
      ${p.id === 'p500' ? '<span class="tag">выгодно</span>' : ''}
      <b>${p.hlx}<small>hlx</small></b>
      <span class="price">${method === 'stars' ? p.stars + ' ⭐' : rub(p.rub)}</span>
    </button>`).join('');
  const methods = [['stars', '⭐ Звёзды'], ['cryptobot', 'CryptoBot'], ['xrocket', 'xRocket']]
    .map(([id, label]) => `<button class="chip${id === method ? ' active' : ''}" data-act="pick-method" data-id="${id}">${label}</button>`).join('');
  const cur = S.me.packages.find(p => p.id === pkg);
  const wait = S.pay.id ? `<p class="hint">Ожидаем оплату… баланс обновится автоматически.</p>
    <button class="btn ghost wide" data-act="pay-check" style="margin-top:10px">Проверить оплату</button>` : '';
  openSheet(`<h2>Пополнение</h2><p class="lead">Выберите пакет и способ оплаты.</p>
    <div class="packs">${packs}</div>
    <span class="label">Способ оплаты</span><div class="chips">${methods}</div>
    <div style="margin-top:18px"><button class="btn primary wide" data-act="pay">Оплатить ${method === 'stars' ? cur.stars + ' ⭐' : rub(cur.rub)}</button></div>
    ${wait}`, stopPayPolling);
}

function stopPayPolling() { clearInterval(S.pay.timer); S.pay.timer = null; S.pay.id = null; }

async function paid() {
  stopPayPolling();
  closeSheet();
  await loadMe();
  render();
  toast('Баланс пополнен');
}

async function checkPayment(manual) {
  if (!S.pay.id) return;
  const { status } = await api('pay/check', { payment_id: S.pay.id });
  if (status === 'paid') await paid();
  else if (manual) toast('Оплата пока не поступила', true);
}

function subSheet() {
  const plans = S.me.plans.map(p => `
    <div class="card plan">
      <span class="badge-ic">${ic('crown')}</span>
      <div class="row-main"><div class="row-title">${esc(p.title)}</div><div class="row-sub">до ${S.me.limits.sub} аккаунтов</div></div>
      <button class="btn gold sm" data-act="buy-sub" data-id="${p.id}"><span class="cost">${p.price}<small>hlx</small></span></button>
    </div>`).join('');
  const u = S.me.user;
  openSheet(`<h2>Подписка</h2>
    <p class="lead">${u.sub_active ? 'Активна до ' + fmtDate(u.sub_until) + '. Покупка продлит срок.' : 'С подпиской можно подключить до ' + S.me.limits.sub + ' аккаунтов вместо ' + S.me.limits.free + '.'} На балансе: <b>${u.balance} hlx</b></p>
    <div class="stack">${plans}</div>`);
}

function inviteSheet() {
  const r = S.me.ref;
  openSheet(`<h2>Пригласить друзей</h2>
    <p class="lead">За каждого, кто придёт по вашей ссылке — ${r.bonus} hlx. Дальше ${r.percent}% с каждого его пополнения.</p>
    <div class="linkbox"><span>${esc(r.link)}</span><button class="icon-btn" data-act="copy-ref">${ic('copy')}</button></div>
    <div class="stats" style="grid-template-columns:1fr 1fr;margin:14px 0">
      <div class="stat"><b>${r.count}</b><span>приглашено</span></div>
      <div class="stat"><b>${r.earned}</b><span>заработано hlx</span></div>
    </div>
    <button class="btn primary wide" data-act="share-ref">Поделиться ссылкой</button>`);
}

function faqSheet() {
  openSheet('<h2>Частые вопросы</h2>' + FAQ.map(([q, a]) => `<details class="faq"><summary>${q}</summary><p>${a}</p></details>`).join(''));
}

function docsSheet() {
  const link = (url, title) => `<button class="card row" data-act="open-url" data-url="${esc(url)}" style="width:100%;text-align:left">
    <span class="badge-ic">${ic('file')}</span><div class="row-main"><div class="row-title">${title}</div></div>${ic('arrow').replace('<svg', '<svg width="18" height="18" style="color:var(--mut)"')}</button>`;
  openSheet(`<h2>Документы</h2><p class="lead">Используя сервис, вы принимаете условия этих документов.</p>
    <div class="stack">${link(S.me.links.policy, 'Политика конфиденциальности')}${link(S.me.links.offer, 'Пользовательское соглашение')}</div>`);
}

async function historySheet() {
  openSheet('<h2>Сводка и история</h2><div class="loader"><span class="spin"></span></div>');
  const { stats, transactions } = await api('history');
  const tx = transactions.length ? transactions.map(t => `
    <div class="tx"><span class="badge-ic">${ic(KIND_ICON[t.kind] || 'wallet')}</span>
      <div class="row-main"><div class="row-title">${esc(t.note)}</div><div class="row-sub">${fmtDate(t.created_at)}</div></div>
      <span class="amt${t.amount > 0 ? ' plus' : ''}">${t.amount > 0 ? '+' : ''}${t.amount}</span></div>`).join('')
    : '<div class="empty">Операций пока нет</div>';
  sheetBody.innerHTML = `<h2>Сводка и история</h2>
    <div class="stats" style="margin:14px 0 8px">
      <div class="stat"><b>${stats.sent}</b><span>отправлено</span></div>
      <div class="stat"><b>${stats.active}</b><span>рассылок идёт</span></div>
      <div class="stat"><b>${stats.accounts}</b><span>аккаунтов</span></div>
    </div>
    <span class="label">Операции с балансом</span>${tx}`;
}

// ---------- рассылки ----------

const freeAccounts = () => S.accounts.filter(a => a.alive && !a.busy);

function renderMailings() {
  const needSub = S.me.mailing_requires_sub && !S.me.user.sub_active;
  let hint = '';
  if (!S.accounts.length) hint = 'Сначала подключите аккаунт во вкладке «Аккаунты».';
  else if (needSub) hint = 'Для рассылок нужна активная подписка.';
  else if (!freeAccounts().length) hint = 'На всех аккаунтах уже идут рассылки.';
  const list = S.mailings.map(m => `
    <div class="card">
      <div class="row">
        <span class="badge-ic">${ic('megaphone')}</span>
        <div class="row-main"><div class="row-title">${esc(m.account)}</div><div class="row-sub">каждые ${INTERVAL_LABEL[m.interval_min] || m.interval_min + ' мин'}</div></div>
        <span class="status ${m.status === 'active' ? 'on' : 'off'}">${m.status === 'active' ? 'идёт' : 'остановлена'}</span>
      </div>
      <div class="mail-text">${esc(m.text)}</div>
      <div class="stats">
        <div class="stat"><b>${m.chats}</b><span>чатов</span></div>
        <div class="stat"><b>${m.sent}</b><span>отправлено</span></div>
        <div class="stat"><b>${m.failed}</b><span>пропущено</span></div>
      </div>
      <div class="mail-actions">
        ${m.status === 'active'
          ? `<button class="btn ghost sm" data-act="mail-stop" data-id="${m.id}">${ic('stop')}Остановить</button>`
          : `<button class="btn ghost sm" data-act="mail-start" data-id="${m.id}">${ic('play')}Запустить</button>`}
        <button class="btn danger sm" data-act="mail-del" data-id="${m.id}">${ic('trash')}Удалить</button>
      </div>
    </div>`).join('');
  view.innerHTML = `
    <div class="page-head"><h1>Рассылки</h1><span class="count">${S.mailings.length}</span></div>
    <div class="card start-card">
      <h2>Новая рассылка</h2>
      <p>Сервис найдёт чаты аккаунта — лишние можно будет убрать.</p>
      <button class="btn primary wide" data-act="wiz-start" ${hint ? 'disabled' : ''}>${ic('megaphone')}Начать рассылку</button>
      ${hint ? `<p class="hint">${hint}</p>` : ''}
    </div>
    <div class="stack" style="margin-top:14px">${list}</div>`;
}

function wizStart() {
  const free = freeAccounts();
  S.wiz = { interval: S.me.intervals[1] || S.me.intervals[0] };
  if (free.length === 1) return wizScan(free[0].id);
  openSheet(`<h2>С какого аккаунта?</h2><p class="lead">Выберите аккаунт для рассылки.</p><div class="stack">${
    free.map(a => `<button class="card row" data-act="wiz-acc" data-id="${a.id}" style="width:100%;text-align:left">
      <span class="badge-ic">${esc(a.name[0] || '?')}</span>
      <div class="row-main"><div class="row-title">${esc(a.name)}</div><div class="row-sub">${esc(a.phone)}</div></div></button>`).join('')}</div>`);
}

async function wizScan(accountId) {
  S.wiz.account_id = accountId;
  openSheet('<div class="loader"><span class="spin"></span>Сканируем чаты аккаунта…</div>');
  try {
    S.wiz.chats = (await api(`accounts/${accountId}/chats`)).chats;
  } catch (e) { closeSheet(); return toast(e.message, true); }
  if (!S.wiz.chats.length) {
    return openSheet('<h2>Чатов не найдено</h2><p class="lead">На этом аккаунте нет групп, в которые можно писать.</p><button class="btn ghost wide" data-act="close">Понятно</button>');
  }
  const rows = S.wiz.chats.map(c => `
    <label class="chat"><input type="checkbox" checked value="${c.id}"><span class="box">${ic('check')}</span>
      <div class="row-main"><div class="row-title">${esc(c.title)}</div>${c.members ? `<div class="row-sub">${c.members} участников</div>` : ''}</div></label>`).join('');
  openSheet(`<h2>Чаты для рассылки</h2><p class="lead">Снимите галочки с чатов, куда отправлять не нужно.</p>
    <div class="list-head"><span id="chatCount"></span><button data-act="wiz-toggle">Снять все</button></div>
    <div id="chatList">${rows}</div>
    <div class="sheet-foot"><button class="btn primary wide" data-act="wiz-next">Далее</button></div>`);
  updateChatCount();
}

function updateChatCount() {
  const n = sheetBody.querySelectorAll('#chatList input:checked').length;
  const el = $('#chatCount');
  if (el) el.textContent = `Выбрано: ${n} из ${S.wiz.chats.length}`;
  const toggle = $('[data-act="wiz-toggle"]');
  if (toggle) toggle.textContent = n ? 'Снять все' : 'Выбрать все';
}

function wizCompose() {
  const ids = [...sheetBody.querySelectorAll('#chatList input:checked')].map(i => Number(i.value));
  if (!ids.length) return toast('Выберите хотя бы один чат', true);
  if (ids.length > S.me.limits.chats) return toast(`Не больше ${S.me.limits.chats} чатов`, true);
  S.wiz.chat_ids = ids;
  const chips = S.me.intervals.map(i => `<button class="chip${i === S.wiz.interval ? ' active' : ''}" data-act="wiz-interval" data-id="${i}">${INTERVAL_LABEL[i] || i + ' мин'}</button>`).join('');
  openSheet(`<h2>Сообщение</h2><p class="lead">Чатов выбрано: ${ids.length}. Первый круг начнётся сразу после запуска.</p>
    <textarea class="field" id="mailText" maxlength="${S.me.limits.text}" placeholder="Текст рассылки"></textarea>
    <p class="hint" style="text-align:left">В конец каждого сообщения добавится подпись @${esc(S.me.bot_username)}.</p>
    <span class="label">Повторять каждые</span><div class="chips" id="intervals">${chips}</div>
    <div style="margin-top:18px"><button class="btn primary wide" data-act="wiz-create">Запустить рассылку</button></div>`);
}

// ---------- аккаунты ----------

function renderAccounts() {
  const limit = S.me.user.acc_limit;
  const full = S.accounts.length >= limit;
  const list = S.accounts.length ? S.accounts.map(a => `
    <div class="card row">
      <span class="badge-ic">${esc(a.name[0] || '?')}</span>
      <div class="row-main"><div class="row-title">${esc(a.name)}</div><div class="row-sub">${esc(a.phone)}${a.username ? ' · @' + esc(a.username) : ''}</div></div>
      <span class="status ${!a.alive ? 'bad' : a.busy ? 'on' : 'off'}">${!a.alive ? 'отключён' : a.busy ? 'рассылка' : 'готов'}</span>
      <button class="icon-btn" data-act="acc-del" data-id="${a.id}" aria-label="Отключить">${ic('trash')}</button>
    </div>`).join('') : `<div class="card empty">${ic('phone')}<div>Пока нет подключённых аккаунтов</div></div>`;
  view.innerHTML = `
    <div class="page-head"><h1>Аккаунты</h1><span class="count">${S.accounts.length} / ${limit}</span></div>
    <div class="stack">${list}</div>
    <div style="margin-top:14px"><button class="btn primary wide" data-act="acc-add" ${full ? 'disabled' : ''}>${ic('phone')}Подключить по номеру</button></div>
    ${full && !S.me.user.sub_active ? `<p class="hint">Лимит без подписки — ${S.me.limits.free}. С подпиской — до ${S.me.limits.sub}.</p>` : ''}
    <p class="note">Подключенная сессия видна в Telegram → Настройки → Устройства — отозвать её можно там в любой момент.</p>`;
}

const cancelLogin = () => { api('accounts/cancel', {}).catch(() => {}); };

function accStep(step) {
  const steps = {
    phone: ['Подключение аккаунта', 'Введите номер телефона аккаунта в международном формате.',
      '<input class="field" id="accInput" type="tel" inputmode="tel" autocomplete="off" placeholder="+7 999 123 45 67">', 'acc-phone', 'Получить код'],
    code: ['Код подтверждения', 'Telegram отправил код в чат «Telegram» на этом аккаунте.',
      '<input class="field" id="accInput" type="text" inputmode="numeric" autocomplete="one-time-code" placeholder="12345">', 'acc-code', 'Подтвердить'],
    password: ['Облачный пароль', 'На аккаунте включена двухэтапная защита. Пароль используется только для входа и не сохраняется.',
      '<input class="field" id="accInput" type="password" autocomplete="off" placeholder="Пароль">', 'acc-pass', 'Войти'],
  };
  const [title, lead, input, act, label] = steps[step];
  openSheet(`<h2>${title}</h2><p class="lead">${lead}</p>${input}
    <div style="margin-top:14px"><button class="btn primary wide" data-act="${act}">${label}</button></div>`, cancelLogin);
  setTimeout(() => $('#accInput')?.focus(), 350);
}

async function accDone() {
  S.onClose = null;
  closeSheet();
  await Promise.all([loadAccounts(), loadMe()]);
  render();
  toast('Аккаунт подключён');
}

// ---------- действия ----------

const actions = {
  tab: el => { haptic(); switchTab(el.dataset.tab); },
  close: closeSheet,
  'confirm-yes': el => run(el, async () => { await S.confirm?.(); }),
  'open-url': el => openUrl(el.dataset.url),
  support: () => openUrl(S.me.links.support),
  invite: inviteSheet,
  faq: faqSheet,
  docs: docsSheet,
  history: () => historySheet().catch(e => toast(e.message, true)),
  sub: subSheet,
  topup: () => { S.pay = { pkg: 'p100', method: 'stars' }; topupSheet(); },

  'pick-pack': el => { S.pay.pkg = el.dataset.id; topupSheet(); },
  'pick-method': el => { S.pay.method = el.dataset.id; topupSheet(); },
  pay: el => run(el, async () => {
    const res = await api('pay/create', { package: S.pay.pkg, method: S.pay.method });
    if (res.method === 'stars') {
      try { tg.openInvoice(res.url, status => { if (status === 'paid') paid(); }); } catch { openUrl(res.url); }
      return;
    }
    clearInterval(S.pay.timer);
    S.pay.id = res.payment_id;
    S.pay.timer = setInterval(() => checkPayment().catch(() => {}), 4000);
    topupSheet();
    openUrl(res.url);
  }),
  'pay-check': el => run(el, () => checkPayment(true)),

  'buy-sub': el => run(el, async () => {
    const plan = S.me.plans.find(p => p.id === el.dataset.id);
    if (S.me.user.balance < plan.price) {
      toast('Недостаточно hlx — пополните баланс', true);
      return actions.topup();
    }
    await api('sub/buy', { plan: plan.id });
    await loadMe();
    closeSheet();
    render();
    toast('Подписка активирована');
  }),

  'copy-ref': async () => {
    try { await navigator.clipboard.writeText(S.me.ref.link); toast('Ссылка скопирована'); }
    catch { toast('Не удалось скопировать', true); }
  },
  'share-ref': () => openUrl('https://t.me/share/url?url=' + encodeURIComponent(S.me.ref.link) + '&text=' + encodeURIComponent('Heliys AutoPosting — автопостинг в Telegram')),

  'wiz-start': wizStart,
  'wiz-acc': el => wizScan(Number(el.dataset.id)),
  'wiz-toggle': () => {
    const boxes = [...sheetBody.querySelectorAll('#chatList input')];
    const any = boxes.some(b => b.checked);
    boxes.forEach(b => { b.checked = !any; });
    updateChatCount();
  },
  'wiz-next': wizCompose,
  'wiz-interval': el => {
    S.wiz.interval = Number(el.dataset.id);
    sheetBody.querySelectorAll('#intervals .chip').forEach(c => c.classList.toggle('active', c === el));
  },
  'wiz-create': el => run(el, async () => {
    const text = $('#mailText').value.trim();
    if (!text) throw new Error('Введите текст рассылки');
    await api('mailings', { account_id: S.wiz.account_id, chat_ids: S.wiz.chat_ids, text, interval: S.wiz.interval });
    closeSheet();
    await Promise.all([loadAccounts(), loadMailings()]);
    render();
    toast('Рассылка запущена');
  }),

  'mail-stop': el => run(el, async () => { await api(`mailings/${el.dataset.id}/stop`, {}); await switchTab('mailings'); }),
  'mail-start': el => run(el, async () => { await api(`mailings/${el.dataset.id}/start`, {}); await switchTab('mailings'); }),
  'mail-del': el => confirmSheet('Удалить рассылку?', 'Рассылка остановится, статистика по ней будет удалена.', 'Удалить', async () => {
    await api(`mailings/${el.dataset.id}/delete`, {});
    closeSheet();
    await switchTab('mailings');
  }),

  'acc-add': () => accStep('phone'),
  'acc-phone': el => run(el, async () => {
    await api('accounts/send_code', { phone: $('#accInput').value });
    accStep('code');
  }),
  'acc-code': el => run(el, async () => {
    const res = await api('accounts/sign_in', { code: $('#accInput').value });
    if (res.need_password) return accStep('password');
    await accDone();
  }),
  'acc-pass': el => run(el, async () => {
    await api('accounts/password', { password: $('#accInput').value });
    await accDone();
  }),
  'acc-del': el => confirmSheet('Отключить аккаунт?', 'Сессия в Telegram будет завершена, рассылки с этого аккаунта удалятся.', 'Отключить', async () => {
    await api(`accounts/${el.dataset.id}/delete`, {});
    closeSheet();
    await switchTab('accounts');
  }),

  recheck: el => run(el, boot),
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (el && !el.disabled) actions[el.dataset.act]?.(el);
});
document.addEventListener('change', e => { if (e.target.closest('#chatList')) updateChatCount(); });

// ---------- новогоднее оформление ----------

function drawGarland() {
  const svg = $('#garland');
  const w = window.innerWidth;
  const n = Math.max(6, Math.round(w / 46));
  const step = w / n;
  const colors = ['#ff4f5e', '#f4d58d', '#45d483', '#a9dcff'];
  let path = 'M0 4';
  let bulbs = '';
  for (let i = 0; i < n; i++) {
    const x = i * step;
    path += ` Q${x + step / 2} 26 ${x + step} 4`;
    const c = colors[i % colors.length];
    bulbs += `<g class="bulb" style="animation-delay:${(i % 4) * .6}s"><circle cx="${x + step / 2}" cy="19" r="8" fill="${c}" opacity=".25"/><circle cx="${x + step / 2}" cy="19" r="3.6" fill="${c}"/></g>`;
  }
  svg.setAttribute('viewBox', `0 0 ${w} 34`);
  svg.innerHTML = `<path class="wire" d="${path}"/>${bulbs}`;
}

function startSnow() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = $('#snow');
  const ctx = canvas.getContext('2d');
  let w, h, flakes;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    flakes = Array.from({ length: Math.round(w / 9) }, () => ({
      x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.8 + .5,
      v: Math.random() * .5 + .2, drift: Math.random() * 2 * Math.PI, a: Math.random() * .5 + .2,
    }));
  };
  resize();
  window.addEventListener('resize', () => { resize(); drawGarland(); });
  (function frame() {
    ctx.clearRect(0, 0, w, h);
    for (const f of flakes) {
      f.y += f.v; f.drift += .01; f.x += Math.sin(f.drift) * .3;
      if (f.y > h + 4) { f.y = -4; f.x = Math.random() * w; }
      ctx.globalAlpha = f.a;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fillStyle = '#fff'; ctx.fill();
    }
    if (!document.hidden) requestAnimationFrame(frame);
    else document.addEventListener('visibilitychange', function once() { document.removeEventListener('visibilitychange', once); requestAnimationFrame(frame); });
  })();
}

// ---------- запуск ----------

function screen(title, text, extra = '') {
  $('#tabbar').hidden = true;
  view.innerHTML = `<div class="screen"><h1>${title}</h1><p>${text}</p>${extra}</div>`;
}

async function boot() {
  try {
    await loadMe();
  } catch (e) {
    if (e.message === 'subscribe') {
      const links = e.data.channels.map(c => `<button class="btn ghost wide" data-act="open-url" data-url="${esc(c.url)}">${esc(c.title)}</button>`).join('');
      return screen('Подпишитесь на каналы', 'Чтобы пользоваться сервисом, нужна подписка на наши каналы.',
        `<div class="stack">${links}<button class="btn primary wide" data-act="recheck">Я подписался</button></div>`);
    }
    if (e.message === 'banned') return screen('Доступ закрыт', 'Ваш аккаунт заблокирован в сервисе. Если это ошибка — напишите в поддержку.');
    if (e.message === 'unauthorized') return screen('Откройте в Telegram', 'Это приложение работает только внутри Telegram — запустите его кнопкой в боте.');
    return screen('Не удалось загрузить', esc(e.message), '<button class="btn primary" data-act="recheck">Повторить</button>');
  }
  $('#tabbar').hidden = false;
  render();
  Promise.all([loadAccounts(), loadMailings()]).catch(() => {});
}

function init() {
  try {
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#030305');
    tg.setBackgroundColor('#030305');
  } catch {}
  const user = tg?.initDataUnsafe?.user;
  const avatar = $('#avatar');
  if (user?.photo_url) avatar.innerHTML = `<img src="${esc(user.photo_url)}" alt="">`;
  else avatar.textContent = (user?.first_name || 'H')[0].toUpperCase();
  drawGarland();
  startSnow();
  boot();
}

init();
