// halalmo.de/admin: the Halal Mode admin panel. Plain browser JavaScript.
//
// Security model (the page itself is not the boundary):
//   * Sign-in is Supabase Auth (Google) plus a 6-digit authenticator code.
//   * Every RPC re-checks, on the server, the admin list and two-factor.
//   * Changes also need a code entered in the last 15 minutes, are
//     rate-limited, and are written to an append-only activity log.
//   * The page only ever holds the admin's own session, in sessionStorage,
//     and signs out after 15 minutes without activity. No service key.
// `?demo` renders sample data without contacting the server.
(function () {
  'use strict';

  const URL_BASE = 'https://lfuuywsmydruvqkqwvzw.supabase.co';
  const KEY = 'sb_publishable_yioJpXVD_u-krXHgA7souQ_2pOiITsN';
  const STORE = 'halal-mode-admin-session';
  const THEME = 'halal-mode-admin-theme';
  const DEMO = new URLSearchParams(location.search).has('demo');
  const REFRESH_MS = 60000;
  const IDLE_MS = 15 * 60000;

  // Plain names for what goes into a member's score, with what each one means.
  const SIGNALS = {
    selection_rate: ['Picked rate', 'How often people choose this member when they are shown to them.'],
    first_choice_rate: ['Picked first', 'How often this member is someone’s first choice.'],
    mutual_first_choice: ['Both picked first', 'How often two people picked each other first.'],
    bio_attention: ['Time reading bio', 'How long people spend reading this member’s bio, compared with others in the same daily set.'],
    photo_attention: ['Time on photos', 'How long people spend on this member’s photos, compared with others in the same daily set.'],
    profile_attention: ['Time on profile', 'How long people spend on the whole profile, compared with others in the same daily set.'],
    luna_presentation: ['Photo quality check', 'Luna checks only clarity, lighting, framing and background. Never looks or appearance. Each photo checked costs a little API money.'],
    reception_similarity: ['Pair similar members', 'A small nudge to introduce people with similar signals to each other. Never stops anyone being matched. Maximum 0.20.']
  };
  const SIGNAL_ORDER = ['selection_rate', 'first_choice_rate', 'mutual_first_choice', 'bio_attention', 'photo_attention', 'profile_attention', 'luna_presentation', 'reception_similarity'];
  const FEATURES = {
    reciprocal_matching_v1: ['New matching engine', 'The matcher that looks for people likely to choose each other. Changes who is introduced to whom.'],
    push_notifications: ['Push notifications', 'Notifications on members’ phones, for members who allowed them.'],
    premium_purchases: ['Premium purchases', 'Lets members buy Premium in the app.'],
    identity_verification: ['ID verification', 'Lets members verify their identity.'],
    in_chat_voice_notes: ['Voice notes', 'Voice messages in chat.'],
    live_calling: ['Calls', 'Voice or video calls between matched members.'],
    controlled_beta: ['Beta-only mode', 'Only people on the beta list can use the app.'],
    demo_introductions: ['Sample members', 'Shows sample profiles to members who turned them on.'],
    tester_tools: ['Tester tools', 'Extra tools in the app for people on the tester list.']
  };

  const ICONS = {
    home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
    waitlist: 'M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9',
    members: 'M16 20v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 10a4 4 0 100-8 4 4 0 000 8zM22 20v-2a4 4 0 00-3-3.9M16 2.1a4 4 0 010 7.8',
    referrals: 'M4 4h16v16H4zM22 6l-10 7L2 6',
    stats: 'M3 3v18h18M7 15l4-4 3 3 5-6',
    subscriptions: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
    grants: 'M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 110-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 100-5C13 2 12 7 12 7z',
    review: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z',
    suspicious: 'M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0zM12 9v4M12 17h.01',
    lookup: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3',
    health: 'M22 12h-4l-3 9L9 3l-3 9H2',
    matches: 'M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 000-7.8z',
    scoring: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
    reports: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    email: 'M22 2L11 13M22 2l-7 20-4-9-9-4z',
    features: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7',
    team: 'M12 11a4 4 0 100-8 4 4 0 000 8zM4 21v-1a6 6 0 0112 0v1M18 8v6M21 11h-6',
    log: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M8 13h8M8 17h5',
    refresh: 'M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0114.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0020.5 15',
    menu: 'M3 6h18M3 12h18M3 18h18',
    sun: 'M12 17a5 5 0 100-10 5 5 0 000 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
    lock: 'M5 11h14v10H5zM8 11V7a4 4 0 018 0v4',
    search: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3',
    go: 'M5 12h14M13 6l6 6-6 6'
  };

  // The whole panel, in sidebar order. `key` is the one-letter shortcut.
  const PAGES = [
    { id: 'home', label: 'Home', key: 'H', tip: 'The most important numbers, and anything that needs your attention.' },
    { group: 'Growth & business' },
    { id: 'waitlist', label: 'Waitlist', key: 'W', tip: 'Everyone who signed up on halalmo.de, and sign-ups over time.' },
    { id: 'referrals', label: 'Referrals', key: 'R', tip: 'Friends referred by members, and which referrals count toward rewards.' },
    { id: 'subscriptions', label: 'Subscriptions', key: 'B', tip: 'Premium members, payment problems, ended and revoked subscriptions.' },
    { group: 'Members' },
    { id: 'members', label: 'Members', key: 'M', tip: 'People with an app account, and how many are ready to be matched.' },
    { group: 'Matchmaking' },
    { id: 'stats', label: 'Matchmaking health', key: 'A', tip: 'How often members are shown, picked and matched, who is picked but not matched, and who is still waiting.' },
    { id: 'scoring', label: 'Member scoring', key: 'S', tip: 'Private scores that help the matcher choose introductions. Members never see them, and they never stop anyone being matched.' },
    { group: 'Trust & safety' },
    { id: 'reports', label: 'Reports', key: 'P', tip: 'Reports from members. Read each one and decide.', badge: function (d) { return d && d.safety.open_reports; } },
    { id: 'review', label: 'Review queue', key: 'Q', tip: 'Photos and bios the automatic check wasn’t sure about, waiting for a person.', badge: function (d) { return d && d.safety.moderation_review; } },
    { id: 'suspicious', label: 'Suspicious accounts', key: 'K', tip: 'Accounts with warning signs of being fake, spam or a bot. Signs for you to check, never automatic decisions.' },
    { id: 'grants', label: 'Grants', key: 'G', tip: 'Give a member free Premium for a set time, or give an account test mode. Every grant has a reason and an end date.' },
    { id: 'lookup', label: 'Find a member', key: 'N', tip: 'Look up one member by exact email or member reference, then suspend, ban or unban.' },
    { group: 'Admin' },
    { id: 'health', label: 'System health', key: 'Y', tip: 'Scheduled jobs, background workers, push notifications, email and matching runs.' },
    { id: 'email', label: 'Email', key: 'E', tip: 'Emails waiting to send, sent today, and the daily sending limit.' },
    { id: 'features', label: 'Features', key: 'F', tip: 'Turn app features on or off, for everyone or some members.' },
    { id: 'team', label: 'Team', key: 'T', tip: 'Who can use this panel, what they can do, and security.' },
    { id: 'log', label: 'Activity log', key: 'L', tip: 'Every change made here: who, what, when and why.' }
  ];
  const PAGE_LIST = PAGES.filter(function (p) { return p.id; });

  const state = { session: null, me: null, overview: null, settings: null, page: 'home', navOpen: false, timer: null, lastActive: Date.now(), lastLoad: 0, logCategory: '' };
  const root = document.getElementById('root');

  // ---------------------------------------------------------------- DOM kit
  function h(tag, attrs) {
    const el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      const v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'text') el.textContent = v;
      else if (k === 'class') el.className = v;
      else if (k === 'tip') el.setAttribute('data-tip', v);
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (let i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, child) {
    if (child == null || child === false) return;
    if (Array.isArray(child)) child.forEach(function (c) { add(el, c); });
    else el.appendChild(typeof child === 'object' ? child : document.createTextNode(String(child)));
  }
  function s(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') el.textContent = attrs[k]; else el.setAttribute(k, attrs[k]); });
    for (let i = 2; i < arguments.length; i++) if (arguments[i]) el.appendChild(arguments[i]);
    return el;
  }
  function icon(name) { return s('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, s('path', { d: ICONS[name] || ICONS.home })); }
  // A small (i) that explains a term on hover or keyboard focus.
  function info(text) { return h('span', { class: 'info', tabindex: '0', role: 'img', 'aria-label': text, tip: text }, 'i'); }
  const nf = new Intl.NumberFormat('en-GB');
  function n(v) { return v == null ? '–' : nf.format(v); }
  function pct(a, b) { return b ? Math.round((a / b) * 100) + '%' : '–'; }
  function ago(iso) {
    if (!iso) return 'never';
    const sec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    if (sec < 60) return 'just now';
    if (sec < 3600) return Math.round(sec / 60) + ' min ago';
    if (sec < 86400) return Math.round(sec / 3600) + ' h ago';
    return Math.round(sec / 86400) + ' d ago';
  }
  function when(iso) {
    return iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '–';
  }
  function toast(message, bad) {
    const t = h('div', { class: 'toast' + (bad ? ' bad' : ''), role: bad ? 'alert' : 'status', text: message });
    document.getElementById('toasts').appendChild(t);
    setTimeout(function () { t.remove(); }, 4000);
  }

  // ---------------------------------------------------------------- tooltips
  // One floating tooltip for every [data-tip], placed so it is never clipped.
  const tipEl = h('div', { class: 'tooltip', role: 'tooltip' });
  document.body.appendChild(tipEl);
  function showTip(target) {
    tipEl.textContent = target.getAttribute('data-tip');
    tipEl.classList.add('show');
    const r = target.getBoundingClientRect();
    const t = tipEl.getBoundingClientRect();
    const inSide = !!target.closest('.side');
    let x = inSide ? r.right + 10 : r.left + r.width / 2 - t.width / 2;
    let y = inSide ? r.top + r.height / 2 - t.height / 2 : r.bottom + 8;
    if (!inSide && y + t.height > innerHeight - 8) y = r.top - t.height - 8;
    x = Math.max(8, Math.min(x, innerWidth - t.width - 8));
    tipEl.style.left = x + 'px'; tipEl.style.top = Math.max(8, y) + 'px';
  }
  function hideTip() { tipEl.classList.remove('show'); }
  document.addEventListener('mouseover', function (e) { const t = e.target.closest && e.target.closest('[data-tip]'); if (t) showTip(t); else hideTip(); });
  document.addEventListener('focusin', function (e) { const t = e.target.closest && e.target.closest('[data-tip]'); if (t) showTip(t); else hideTip(); });
  document.addEventListener('focusout', hideTip);
  window.addEventListener('scroll', hideTip, true);

  // ---------------------------------------------------------------- theme
  function applyTheme(t) {
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
  }
  function readTheme() { try { return localStorage.getItem(THEME) || 'system'; } catch (_e) { return 'system'; } }
  function cycleTheme() {
    const next = { system: 'light', light: 'dark', dark: 'system' }[readTheme()];
    try { localStorage.setItem(THEME, next); } catch (_e) { /* storage blocked */ }
    applyTheme(next);
    toast('Theme: ' + next);
  }
  applyTheme(readTheme());

  // ---------------------------------------------------------------- auth & network
  function save(sess) {
    state.session = sess;
    try {
      if (sess) sessionStorage.setItem(STORE, JSON.stringify(sess));
      else sessionStorage.removeItem(STORE);
    } catch (_e) { /* private mode: the session lives in memory only */ }
  }
  function load() { try { return JSON.parse(sessionStorage.getItem(STORE) || 'null'); } catch (_e) { return null; } }
  function fromTokens(t) {
    return { access_token: t.access_token, refresh_token: t.refresh_token, expires_at: Math.floor(Date.now() / 1000) + Number(t.expires_in || 3600) };
  }
  function claims() {
    try { return JSON.parse(atob(state.session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch (_e) { return {}; }
  }
  function request(path, opts) {
    opts = opts || {};
    const headers = { apikey: KEY, 'Content-Type': 'application/json' };
    if (state.session && state.session.access_token && !opts.anon) headers.Authorization = 'Bearer ' + state.session.access_token;
    return fetch(URL_BASE + path, { method: opts.method || 'GET', headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined, credentials: 'omit', cache: 'no-store' })
      .then(function (res) {
        return res.text().then(function (text) {
          let body = null;
          try { body = text ? JSON.parse(text) : null; } catch (_e) { body = text; }
          if (!res.ok) {
            const err = new Error((body && (body.message || body.msg || body.error_description || body.error)) || ('HTTP ' + res.status));
            err.status = res.status; err.code = body && body.code; err.hint = body && body.hint;
            throw err;
          }
          return body;
        });
      });
  }
  function fresh() {
    if (!state.session) return Promise.reject(new Error('Signed out'));
    if (state.session.expires_at - 60 > Date.now() / 1000) return Promise.resolve();
    return request('/auth/v1/token?grant_type=refresh_token', { method: 'POST', anon: true, body: { refresh_token: state.session.refresh_token } })
      .then(function (t) { save(fromTokens(t)); });
  }
  function rpc(name, args) {
    return fresh().then(function () { return request('/rest/v1/rpc/' + name, { method: 'POST', body: args || {} }); });
  }
  function signIn() {
    location.assign(URL_BASE + '/auth/v1/authorize?provider=google&redirect_to=' + encodeURIComponent(location.origin + '/admin'));
  }
  function signOut(scope, message) {
    const done = function () {
      save(null); clearInterval(state.timer);
      state.me = state.overview = state.settings = null;
      if (DEMO) { location.replace('/admin?demo'); return; }
      showSignIn(message);
    };
    if (DEMO || !state.session) return done();
    request('/auth/v1/logout' + (scope === 'global' ? '?scope=global' : ''), { method: 'POST' }).then(done, done);
  }
  function verifiedFactor(user) {
    return (user.factors || []).filter(function (f) { return f.factor_type === 'totp' && f.status === 'verified'; })[0];
  }
  function verifyCode(code) {
    return request('/auth/v1/user').then(function (user) {
      const factor = verifiedFactor(user);
      if (!factor) throw new Error('No authenticator app is set up for this account.');
      return request('/auth/v1/factors/' + factor.id + '/challenge', { method: 'POST', body: {} })
        .then(function (ch) { return request('/auth/v1/factors/' + factor.id + '/verify', { method: 'POST', body: { challenge_id: ch.id, code: code } }); });
    }).then(function (t) { save(fromTokens(t)); });
  }

  // ---------------------------------------------------------------- sign-in screens
  function gate(title, body, slot, error) {
    const err = h('p', { class: 'error', role: 'alert', text: error || '' });
    root.replaceChildren(h('div', { class: 'gate-wrap' },
      h('div', { class: 'card gate' },
        h('img', { class: 'logo', src: '/logo.svg', alt: 'Halal Mode' }),
        h('h1', { text: title }), h('p', { class: 'muted', text: body }),
        h('div', { class: 'slot' }, slot), err,
        h('div', { class: 'security' }, icon('lock'), 'Admins only. Every change is logged.'))));
    return err;
  }
  function showSignIn(message) {
    gate('Admin sign-in', 'Sign in with the Google account that has admin access.',
      h('button', { type: 'button', class: 'btn google', onclick: signIn }, 'Continue with Google'), message);
  }
  function showMfa() {
    request('/auth/v1/user').then(function (user) {
      const factor = verifiedFactor(user);
      if (factor) return codeScreen(factor.id, null);
      const stale = (user.factors || []).filter(function (f) { return f.factor_type === 'totp' && f.status !== 'verified'; });
      return Promise.all(stale.map(function (f) { return request('/auth/v1/factors/' + f.id, { method: 'DELETE' }).catch(function () { return null; }); }))
        .then(function () { return request('/auth/v1/factors', { method: 'POST', body: { factor_type: 'totp', friendly_name: 'Halal Mode admin' } }); })
        .then(function (enrolled) { codeScreen(enrolled.id, enrolled.totp); });
    }).catch(function (e) { save(null); showSignIn(e.message); });
  }
  // Supabase returns the QR code as an SVG data URL with the markup unescaped,
  // which browsers refuse to draw (a '#' in it ends the URL). Re-encode it.
  function qrSrc(qr) {
    const raw = String(qr || '');
    const svgAt = raw.indexOf('<svg');
    if (svgAt < 0) return raw;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(raw.slice(svgAt));
  }
  function codeScreen(factorId, totp) {
    const input = h('input', { type: 'text', class: 'code', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '6', 'aria-label': '6-digit code' });
    const button = h('button', { type: 'submit', class: 'btn', style: 'width:100%', text: 'Continue' });
    const form = h('form', { style: 'display:grid;gap:12px;width:100%' }, input, button);
    const err = gate(totp ? 'Set up your code' : 'Enter your code',
      totp ? 'Scan this with an authenticator app (like Google Authenticator), then type the 6-digit code it shows.' : 'Type the 6-digit code from your authenticator app.',
      [totp && h('img', { class: 'qr', src: qrSrc(totp.qr_code), alt: 'QR code for your authenticator app' }), totp && h('code', { text: totp.secret }), form]);
    input.focus();
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      button.disabled = true; err.textContent = '';
      request('/auth/v1/factors/' + factorId + '/challenge', { method: 'POST', body: {} })
        .then(function (ch) { return request('/auth/v1/factors/' + factorId + '/verify', { method: 'POST', body: { challenge_id: ch.id, code: input.value.replace(/\D/g, '') } }); })
        .then(function (t) { save(fromTokens(t)); return rpc('admin_record_sign_in').catch(function () { return null; }); })
        .then(start)
        .catch(function (e) { err.textContent = e.message || 'That code didn’t work.'; button.disabled = false; input.select(); });
    });
  }

  // ---------------------------------------------------------------- dialogs
  // Every change goes through this one dialog: what changes, why, and for
  // big changes a typed word. It asks for the 6-digit code when needed.
  function dialog(opts) {
    return new Promise(function (resolve) {
      const err = h('p', { class: 'error', role: 'alert' });
      const reason = opts.reason === false ? null : h('input', { type: 'text', maxlength: '300', placeholder: 'For example: testing with a few members first' });
      const typed = opts.typed ? h('input', { type: 'text', autocomplete: 'off', spellcheck: 'false', placeholder: opts.typed }) : null;
      const ok = h('button', { type: 'submit', class: 'btn' + (opts.danger ? ' danger' : ''), text: opts.confirm || 'Save' });
      const cancel = h('button', { type: 'button', class: 'btn ghost', text: 'Cancel' });
      const form = h('form', { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.title },
        h('div', { class: 'd-head' }, h('h2', { text: opts.title }), opts.body && h('p', { text: opts.body })),
        h('div', { class: 'd-body' },
          opts.diff && h('dl', { class: 'diff' }, opts.diff.map(function (row) { return [h('dt', { text: row[0] }), h('dd', { text: row[1] })]; })),
          opts.extra,
          reason && h('label', { class: 'field' }, 'Why?', h('span', { class: 'hint', text: 'Saved in the activity log.' }), reason),
          typed && h('label', { class: 'field' }, 'Type ' + opts.typed + ' to confirm', typed),
          err),
        h('div', { class: 'd-foot' }, cancel, ok));
      const back = h('div', { class: 'backdrop' }, form);
      function close(v) { back.remove(); document.removeEventListener('keydown', esc); resolve(v); }
      function esc(e) { if (e.key === 'Escape' && !document.querySelector('.backdrop.step-up')) close(null); }
      document.addEventListener('keydown', esc);
      cancel.addEventListener('click', function () { close(null); });
      back.addEventListener('mousedown', function (e) { if (e.target === back) close(null); });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        err.textContent = '';
        const why = reason ? reason.value.trim() : '';
        if (reason && why.length < 3) { err.textContent = 'Write a few words about why.'; reason.focus(); return; }
        if (typed && typed.value !== opts.typed) { err.textContent = 'Type ' + opts.typed + ' exactly.'; typed.focus(); return; }
        ok.disabled = true;
        const run = function () { return opts.run(why, typed && typed.value); };
        (opts.local ? run() : withUnlock(run))
          .then(function (res) { close(res || true); })
          .catch(function (ex) { err.textContent = ex.message; ok.disabled = false; });
      });
      document.body.appendChild(back);
      (reason || typed || ok).focus();
    });
  }
  function unlockDialog() {
    return new Promise(function (resolve, reject) {
      const input = h('input', { type: 'text', class: 'code', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '6', 'aria-label': '6-digit code' });
      const err = h('p', { class: 'error', role: 'alert' });
      const ok = h('button', { type: 'submit', class: 'btn', text: 'Unlock' });
      const cancel = h('button', { type: 'button', class: 'btn ghost', text: 'Cancel' });
      const form = h('form', { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Unlock changes' },
        h('div', { class: 'd-head' }, h('h2', { text: 'Unlock changes' }), h('p', { text: 'Type the 6-digit code from your authenticator app. Changes stay unlocked for 15 minutes.' })),
        h('div', { class: 'd-body' }, input, err), h('div', { class: 'd-foot' }, cancel, ok));
      const back = h('div', { class: 'backdrop step-up', style: 'z-index:25' }, form);
      cancel.addEventListener('click', function () { back.remove(); reject(new Error('Changes are still locked.')); });
      form.addEventListener('submit', function (e) {
        e.preventDefault(); ok.disabled = true; err.textContent = '';
        (DEMO ? Promise.resolve() : verifyCode(input.value.replace(/\D/g, '')))
          .then(refreshSession)
          .then(function () { back.remove(); updateLock(); resolve(); })
          .catch(function (ex) { err.textContent = ex.message || 'That code didn’t work.'; ok.disabled = false; input.select(); });
      });
      document.body.appendChild(back);
      input.focus();
    });
  }
  function unlocked() { return !!state.me && state.me.step_up_until > Date.now(); }
  function withUnlock(action) {
    const go = function () {
      return action().catch(function (e) {
        if (e.hint === 'step_up') return unlockDialog().then(action);
        throw e;
      });
    };
    return unlocked() ? go() : unlockDialog().then(go);
  }
  function unlockNow() {
    if (!canEdit()) { toast('Only owners can make changes.'); return; }
    if (unlocked()) { toast('Changes are already unlocked.'); return; }
    unlockDialog().then(function () { toast('Unlocked for 15 minutes.'); }, function () { return null; });
  }

  // ---------------------------------------------------------------- quick search (Ctrl+K or /)
  function commands() {
    const list = PAGE_LIST.map(function (p) { return { label: p.label, hint: 'Go to page', icon: p.id, run: function () { go(p.id); } }; });
    list.push({ label: 'Unlock changes', hint: 'U', icon: 'lock', run: unlockNow });
    list.push({ label: 'Refresh numbers', hint: 'Shift+R', icon: 'refresh', run: function () { reload().then(function () { toast('Up to date.'); }); } });
    list.push({ label: 'Switch light or dark', hint: 'Theme', icon: 'sun', run: cycleTheme });
    list.push({ label: 'Add an admin', hint: 'Team', icon: 'team', run: function () { go('team'); addMember(); } });
    list.push({ label: 'Keyboard shortcuts', hint: '?', icon: 'search', run: showShortcuts });
    list.push({ label: 'Sign out', hint: 'Account', icon: 'lock', run: function () { signOut(); } });
    SIGNAL_ORDER.forEach(function (k) { list.push({ label: SIGNALS[k][0], hint: 'Member scoring', icon: 'scoring', run: function () { go('scoring'); } }); });
    ((state.settings && state.settings.flags) || []).forEach(function (f) {
      list.push({ label: (FEATURES[f.key] || [f.key])[0], hint: 'Feature', icon: 'features', run: function () { go('features'); editFeature(f); } });
    });
    return list;
  }
  function openSearch() {
    if (document.querySelector('.palette, .backdrop')) return;
    const all = commands();
    let shown = all, active = 0;
    const input = h('input', { type: 'text', placeholder: 'Search pages and actions…', 'aria-label': 'Search' });
    const list = h('div', { class: 'palette-list', role: 'listbox' });
    const pal = h('div', { class: 'palette' }, h('div', { class: 'palette-box' }, input, list));
    function close() { pal.remove(); }
    function draw() {
      list.replaceChildren.apply(list, shown.length ? shown.map(function (c, i) {
        return h('button', { type: 'button', class: 'palette-item', role: 'option', 'aria-selected': String(i === active), onclick: function () { close(); c.run(); } }, icon(c.icon), h('span', { text: c.label }), h('small', { text: c.hint }));
      }) : [h('div', { class: 'palette-empty', text: 'Nothing found' })]);
      const sel = list.children[active];
      if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest' });
    }
    input.addEventListener('input', function () {
      const q = input.value.trim().toLowerCase();
      shown = !q ? all : all.filter(function (c) { return c.label.toLowerCase().indexOf(q) >= 0 || c.hint.toLowerCase().indexOf(q) >= 0; })
        .sort(function (a, b) { return a.label.toLowerCase().indexOf(q) - b.label.toLowerCase().indexOf(q); });
      active = 0; draw();
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(shown.length - 1, active + 1); draw(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); draw(); }
      else if (e.key === 'Enter') { e.preventDefault(); const c = shown[active]; if (c) { close(); c.run(); } }
      else if (e.key === 'Escape') close();
    });
    pal.addEventListener('mousedown', function (e) { if (e.target === pal) close(); });
    document.body.appendChild(pal);
    draw();
    input.focus();
  }
  function showShortcuts() {
    const rowsOut = PAGE_LIST.map(function (p) { return [h('kbd', { text: p.key }), h('span', { text: p.label })]; });
    dialog({
      title: 'Keyboard shortcuts', reason: false, local: true, confirm: 'Got it',
      extra: h('div', { class: 'shortcuts' },
        h('kbd', { text: 'Ctrl K' }), h('span', { text: 'Search anything (or press /)' }),
        h('kbd', { text: 'U' }), h('span', { text: 'Unlock changes' }),
        h('kbd', { text: '?' }), h('span', { text: 'This list' }),
        h('kbd', { text: 'Esc' }), h('span', { text: 'Close' }),
        rowsOut),
      run: function () { return Promise.resolve(true); }
    });
  }
  document.addEventListener('keydown', function (e) {
    if (!state.overview) return;
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); return; }
    if (typing || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('.palette, .backdrop')) return;
    if (e.key === '/') { e.preventDefault(); openSearch(); return; }
    if (e.key === '?') { showShortcuts(); return; }
    if (e.key === 'R' && e.shiftKey) { reload().then(function () { toast('Up to date.'); }); return; }
    if (e.key === 'u' || e.key === 'U') { unlockNow(); return; }
    const page = PAGE_LIST.filter(function (p) { return p.key === e.key.toUpperCase(); })[0];
    if (page && !e.shiftKey) go(page.id);
  });

  // ---------------------------------------------------------------- flow
  function refreshSession() {
    if (DEMO) { state.me.step_up_until = Date.now() + 900000; return Promise.resolve(state.me); }
    return rpc('admin_session').then(function (me) {
      me.step_up_until = Date.now() + (me.step_up_seconds || 0) * 1000;
      state.me = me;
      return me;
    });
  }
  function start() {
    if (DEMO) {
      state.session = { demo: true };
      state.me = { admin: true, role: 'owner', name: 'Demo owner', mfa: true, step_up_until: 0 };
      state.overview = sampleOverview(); state.origins = sampleOrigins(); state.settings = sampleSettings(); state.demoReports = sampleReports(); state.demoMatcher = sampleMatcher(); Object.assign(state, sampleTrust());
      state.loadedAt = new Date().toISOString();
      return boot();
    }
    state.session = state.session || load();
    if (!state.session) return showSignIn();
    refreshSession().then(function (me) {
      if (!me.admin) {
        gate('No admin access', (claims().email || 'This account') + ' isn’t on the admin list. Ask an owner to add you.',
          h('button', { type: 'button', class: 'btn ghost', onclick: function () { signOut(); } }, 'Sign out'));
        return;
      }
      if (!me.mfa) return showMfa();
      return loadData().then(boot);
    }).catch(function (e) {
      save(null);
      showSignIn(e.status === 401 ? 'You were signed out. Please sign in again.' : e.message);
    });
  }
  function loadData() {
    if (DEMO) return Promise.resolve();
    // Origins are a nice-to-have: if the call fails the rest of the panel still loads.
    return Promise.all([rpc('admin_overview'), rpc('admin_settings'), refreshSession(), rpc('admin_waitlist_origins').catch(function () { return null; })])
      .then(function (r) { state.overview = r[0]; state.settings = r[1]; state.origins = r[3]; state.loadedAt = new Date().toISOString(); state.lastLoad = Date.now(); });
  }
  function reload() {
    return loadData().then(render).catch(function (e) {
      if (e.status === 401) return signOut(null, 'You were signed out. Please sign in again.');
      toast(e.message, true);
    });
  }
  let booted = false;
  function boot() {
    state.page = pageFromHash();
    if (!booted) {
      booted = true;
      window.addEventListener('hashchange', function () { state.page = pageFromHash(); state.navOpen = false; render(); window.scrollTo(0, 0); });
      ['pointerdown', 'keydown', 'touchstart', 'scroll', 'mousemove'].forEach(function (ev) {
        window.addEventListener(ev, function () { state.lastActive = Date.now(); }, { passive: true });
      });
    }
    clearInterval(state.timer);
    state.timer = setInterval(function () {
      if (!DEMO && Date.now() - state.lastActive > IDLE_MS) return signOut(null, 'Signed out after 15 minutes of no activity.');
      updateLock();
      if (!DEMO && !document.hidden && !document.querySelector('.backdrop, .palette') && Date.now() - state.lastLoad > REFRESH_MS) reload();
    }, 15000);
    render();
  }
  function pageFromHash() {
    const id = location.hash.replace(/^#\/?/, '');
    return PAGE_LIST.some(function (p) { return p.id === id; }) ? id : 'home';
  }
  function go(id) { if (location.hash !== '#/' + id) location.hash = '#/' + id; }

  // ---------------------------------------------------------------- shell
  let lockEl = null;
  function updateLock() {
    if (!lockEl || !state.me) return;
    const open = unlocked();
    const left = Math.max(1, Math.round((state.me.step_up_until - Date.now()) / 60000));
    lockEl.className = 'lock' + (open ? ' open' : '');
    lockEl.setAttribute('data-tip', !canEdit() ? 'You can look at everything but not change anything.' : 'For safety, changes need your 6-digit code. Once unlocked, they stay unlocked for 15 minutes. Shortcut: U');
    lockEl.replaceChildren(h('span', { class: 'dot' }),
      h('span', null, state.previewViewer ? 'Previewing as viewer' : !canEdit() ? 'View only' : open ? 'Unlocked · ' + left + ' min left' : 'Locked · press U to unlock'));
  }
  function renderShell(content) {
    const page = PAGE_LIST.filter(function (p) { return p.id === state.page; })[0];
    const me = state.me || {};
    const email = DEMO ? 'owner@halalmo.de' : (claims().email || '');
    const nav = h('nav', { 'aria-label': 'Admin pages' }, PAGES.map(function (p) {
      if (p.group) return h('h3', { class: 'nav-group', text: p.group });
      const count = p.badge && p.badge(state.overview);
      return h('ul', { class: 'nav' }, h('li', null, h('a', { href: '#/' + p.id, 'aria-current': p.id === state.page ? 'page' : null, tip: p.tip + '  (Shortcut: ' + p.key + ')' },
        icon(p.id), p.label, count ? h('span', { class: 'count', text: count }) : null, h('span', { class: 'kbd', 'aria-hidden': 'true', text: p.key }))));
    }));
    lockEl = h('button', { type: 'button', class: 'lock', onclick: unlockNow });
    updateLock();
    const side = h('aside', { class: 'side' },
      h('a', { class: 'side-brand', href: '#/home' }, h('img', { class: 'logo', src: '/logo.svg', alt: 'Halal Mode' }), h('sup', { text: '™' }), h('span', { class: 'badge-admin', text: 'Admin' })),
      h('button', { type: 'button', class: 'search-btn', onclick: openSearch, tip: 'Find any page or action. Press Ctrl K or / from anywhere.' }, icon('search'), 'Search', h('span', { class: 'kbd', text: 'Ctrl K' })),
      nav,
      h('div', { class: 'side-foot' },
        lockEl,
        h('div', { class: 'me' }, h('div', { class: 'avatar', text: (me.name || email || '?').slice(0, 1).toUpperCase() }),
          h('div', { style: 'min-width:0' }, h('div', { class: 'me-name', text: me.name || email }), h('div', { class: 'me-role', text: me.role === 'owner' ? 'Owner' : 'Viewer' }))),
        h('button', { type: 'button', class: 'btn ghost sm', onclick: function () { signOut(); } }, 'Sign out')));
    const shell = h('div', { class: 'shell' + (state.navOpen ? ' nav-open' : '') });
    const top = h('header', { class: 'topbar' },
      h('button', { type: 'button', class: 'icon-btn menu-btn', 'aria-label': 'Menu', onclick: function () { state.navOpen = !state.navOpen; shell.classList.toggle('nav-open', state.navOpen); } }, icon('menu')),
      h('div', { class: 'title' }, h('h1', { text: page.label }), h('p', { text: page.tip })),
      h('span', { class: 'spacer' }),
      h('span', { class: 'env' + (DEMO ? ' demo' : ''), text: DEMO ? 'Demo' : 'Live', tip: DEMO ? 'Sample numbers. Nothing you do here is saved.' : 'Real data. Changes affect real members.' }),
      h('span', { class: 'muted small updated', text: 'Updated ' + ago(state.loadedAt) }),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Light or dark', tip: 'Switch between light, dark and your system setting.', onclick: cycleTheme }, icon('sun')),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Refresh', tip: 'Get the latest numbers. Shortcut: Shift R', onclick: function () { reload().then(function () { toast('Up to date.'); }); } }, icon('refresh')));
    add(shell, [side, h('div', { class: 'main' }, top, h('main', { class: 'content', id: 'content' }, content))]);
    shell.addEventListener('click', function (e) { if (state.navOpen && e.target === shell) { state.navOpen = false; shell.classList.remove('nav-open'); } });
    root.replaceChildren(shell);
  }
  function render() {
    hideTip();
    const fn = { home: pageHome, waitlist: pageWaitlist, members: pageMembers, referrals: pageReferrals, stats: pageStats, scoring: pageScoring, subscriptions: pageSubscriptions, grants: pageGrants, review: pageReview, suspicious: pageSuspicious, lookup: pageLookup, health: pageHealth, reports: pageReports, email: pageEmail, features: pageFeatures, team: pageTeam, log: pageLog }[state.page];
    renderShell(fn());
  }
  // An owner can preview the panel as a viewer sees it (Team page).
  function canEdit() { return !!state.me && state.me.role === 'owner' && !state.previewViewer; }

  // ---------------------------------------------------------------- building blocks
  function card(title, tip, aside, body, foot) {
    return h('section', { class: 'card' },
      title && h('div', { class: 'card-head' }, h('h2', null, title, tip && info(tip)), aside),
      h('div', { class: 'card-body' }, body), foot && h('div', { class: 'card-foot' }, foot));
  }
  function kpi(label, value, sub, tip, alert) {
    return h('div', { class: 'card kpi' + (alert ? ' alert' : '') },
      h('div', { class: 'label' }, label, tip && info(tip)), h('div', { class: 'value num', text: value }), sub && h('div', { class: 'sub', text: sub }));
  }
  // Rows of [label, value, tip?, strong?].
  function rows(list) {
    return h('ul', { class: 'list' }, list.map(function (p) {
      return h('li', null, h('span', { class: p[3] ? '' : 'muted' }, p[0], p[2] && info(p[2])), h('span', { class: 'num', text: p[1] }));
    }));
  }
  function pill(kind, text, tip) { return h('span', { class: 'pill ' + kind, text: text, tip: tip }); }
  function setting(title, tip, desc, value) {
    return h('div', { class: 'setting' }, h('div', null, h('div', { class: 's-title' }, title, tip && info(tip)), desc && h('div', { class: 's-desc', text: desc })), h('div', { class: 's-value' }, value));
  }
  function editBtn(label, fn) {
    return h('button', { type: 'button', class: 'btn ghost sm', disabled: !canEdit(), tip: canEdit() ? null : 'Only owners can change this.', onclick: fn }, label);
  }
  function steps(list, total) {
    return h('div', { class: 'funnel' }, list.map(function (x) {
      return h('div', { class: 'step' }, h('span', null, x[0], x[2] && info(x[2])),
        h('div', { class: 'bar' }, h('span', { style: 'width:' + Math.max(1, Math.round((x[1] / Math.max(1, total)) * 100)) + '%' })),
        h('span', { class: 'num', style: 'text-align:right', text: n(x[1]) }));
    }));
  }
  function barChart(list) {
    const W = 600, H = 170, pad = 30;
    const max = Math.max(1, Math.max.apply(null, list.map(function (r) { return r.count; })));
    const bw = (W - pad) / Math.max(1, list.length);
    const g = s('svg', { viewBox: '0 0 ' + W + ' ' + (H + 22), class: 'chart', role: 'img', 'aria-label': 'Sign-ups per day' });
    [0.5, 1].forEach(function (f) {
      const y = H - (H - 16) * f;
      g.appendChild(s('line', { x1: pad, x2: W, y1: y, y2: y, class: 'grid-line' }));
      g.appendChild(s('text', { x: 0, y: y + 3, text: n(Math.round(max * f)) }));
    });
    g.appendChild(s('line', { x1: pad, x2: W, y1: H, y2: H, class: 'axis' }));
    list.forEach(function (r, i) {
      const bh = Math.max(r.count ? 2 : 0, (r.count / max) * (H - 16));
      const x = pad + i * bw + 3;
      const rect = s('rect', { x: x, y: H - bh, width: Math.max(2, bw - 6), height: bh, rx: 4, class: 'bar' + (i === list.length - 1 ? ' today' : '') });
      rect.appendChild(s('title', { text: r.day + ': ' + n(r.count) }));
      g.appendChild(rect);
      if (i % 2 === (list.length - 1) % 2) {
        const d = new Date(r.day + 'T00:00:00');
        g.appendChild(s('text', { x: x + (bw - 6) / 2, y: H + 15, 'text-anchor': 'middle', text: d.getDate() + '/' + (d.getMonth() + 1) }));
      }
    });
    return g;
  }
  function spreadChart(bands) {
    const W = 600, H = 150, pad = 30;
    const max = Math.max(1, Math.max.apply(null, bands.map(function (b) { return b.low + b.medium + b.high; })));
    const bw = (W - pad) / Math.max(1, bands.length);
    const g = s('svg', { viewBox: '0 0 ' + W + ' ' + (H + 22), class: 'chart', role: 'img', 'aria-label': 'How members are spread' });
    g.appendChild(s('line', { x1: pad, x2: W, y1: H, y2: H, class: 'axis' }));
    bands.forEach(function (b, i) {
      const x = pad + i * bw + 4;
      let y = H;
      [['high', 'var(--conf-high)'], ['medium', 'var(--conf-mid)'], ['low', 'var(--conf-low)']].forEach(function (part) {
        const v = b[part[0]];
        if (!v) return;
        const bh = (v / max) * (H - 10);
        y -= bh;
        const rect = s('rect', { x: x, y: y, width: bw - 8, height: bh, fill: part[1] });
        rect.appendChild(s('title', { text: n(v) + ' members, ' + part[0] + ' certainty' }));
        g.appendChild(rect);
      });
      g.appendChild(s('text', { x: x + (bw - 8) / 2, y: H + 15, 'text-anchor': 'middle', text: i === 0 ? 'Lower' : i === bands.length - 1 ? 'Higher' : '' }));
    });
    return g;
  }

  // ---------------------------------------------------------------- pages
  function pageHome() {
    const d = state.overview, w = d.waitlist, r = d.referrals, m = d.members, sf = d.safety, mail = d.mail, mt = d.matching, luna = d.luna;
    const lastRun = (mt.runs || []).filter(function (x) { return x.mode === 'live'; })[0];
    const todo = [];
    if (sf.open_reports) todo.push(['bad', sf.open_reports + ' report' + (sf.open_reports > 1 ? 's' : '') + ' to look at', 'reports']);
    if (mail.failing) todo.push(['bad', mail.failing + ' emails failed to send', 'email']);
    if (sf.moderation_stuck) todo.push(['bad', sf.moderation_stuck + ' photo or bio checks are stuck', 'health']);
    if (sf.moderation_review) todo.push(['warn', sf.moderation_review + ' photos or bios need a person to check', 'review']);
    if (lastRun && lastRun.failed) todo.push(['bad', 'The last matching run failed', 'health']);
    else if (lastRun && lastRun.breaches) todo.push(['warn', 'The last matching run had a warning', 'stats']);
    if (mail.pending > 200) todo.push(['warn', n(mail.pending) + ' emails are waiting to send', 'email']);
    if (luna.failed) todo.push(['warn', luna.failed + ' photo quality checks failed', 'scoring']);
    return h('div', { class: 'stack' },
      h('div', { class: 'big-kpis' },
        kpi('On the waitlist', n(w.total), '+' + n(w.last_24h) + ' today', 'Everyone who signed up on halalmo.de.'),
        kpi('Ready to match', n(m.ready_for_matching), 'of ' + n(m.total) + ' members', 'Members whose profile is complete enough to be matched.'),
        kpi('Referrals that count', n(r.waitlist_counted + r.app_counted), n(r.waitlist_attributed + r.app_claimed) + ' referred in total', 'A referral counts only when the friend finishes their app profile.'),
        kpi('Matches made', n(d.connections.total), '+' + n(d.connections.last_7d) + ' this week', 'Pairs who chose each other.')),
      card('Needs your attention', 'Problems show up here first. Click one to go to it.', null,
        h('div', { class: 'attention' }, todo.length ? todo.map(function (t) {
          return h('a', { href: '#/' + t[2], class: t[0] }, h('span', { class: 'dot' }), h('b', { text: t[1] }), h('span', { class: 'go', text: 'Open →' }));
        }) : h('a', { href: '#/home', class: 'good' }, h('span', { class: 'dot' }), h('b', { text: 'All good. Nothing needs you right now.' })))),
      h('div', { class: 'grid cols-wide' },
        card('Waitlist sign-ups', 'New sign-ups each day for the last 14 days. Today is gold.', null, barChart(w.daily || [])),
        card('Latest changes', 'The most recent changes made in this panel.', h('a', { href: '#/log', class: 'small', text: 'See all' }), logList((d.audit || []).slice(0, 5)))));
  }

  // Line chart of one or two series over the chosen range.
  function lineChart(rowsIn, series) {
    const W = 640, H = 200, pad = 36;
    const vals = [];
    series.forEach(function (sr) { rowsIn.forEach(function (r) { vals.push(r[sr.key]); }); });
    const max = Math.max(1, Math.max.apply(null, vals.length ? vals : [1]));
    const step = (W - pad) / Math.max(1, rowsIn.length - 1);
    const g = s('svg', { viewBox: '0 0 ' + W + ' ' + (H + 22), class: 'chart', role: 'img', 'aria-label': 'Sign-ups over time' });
    [0.5, 1].forEach(function (f) {
      const y = H - (H - 12) * f;
      g.appendChild(s('line', { x1: pad, x2: W, y1: y, y2: y, class: 'grid-line' }));
      g.appendChild(s('text', { x: 0, y: y + 3, text: n(Math.round(max * f)) }));
    });
    g.appendChild(s('line', { x1: pad, x2: W, y1: H, y2: H, class: 'axis' }));
    series.forEach(function (sr) {
      const pts = rowsIn.map(function (r, i) { return (pad + i * step).toFixed(1) + ',' + (H - (r[sr.key] / max) * (H - 12)).toFixed(1); }).join(' ');
      g.appendChild(s('polyline', { points: pts, fill: 'none', stroke: sr.color, 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    });
    const every = Math.max(1, Math.round(rowsIn.length / 6));
    rowsIn.forEach(function (r, i) {
      if (i % every !== 0 && i !== rowsIn.length - 1) return;
      const d = new Date(r.day + 'T00:00:00');
      g.appendChild(s('text', { x: pad + i * step, y: H + 15, 'text-anchor': i === rowsIn.length - 1 ? 'end' : i === 0 ? 'start' : 'middle', text: d.getDate() + '/' + (d.getMonth() + 1) }));
    });
    return g;
  }
  function trendCard() {
    const v = state.trend || (state.trend = { days: 30, mode: 'day', waitlist: true, members: true });
    const box = h('div', null, h('div', { class: 'skeleton' }));
    const chip = function (label, on, fn, tip) { return h('button', { type: 'button', class: 'chip', 'aria-pressed': String(on), text: label, tip: tip, onclick: fn }); };
    const controls = h('div', { class: 'filters' },
      [7, 30, 90, 365].map(function (d) { return chip(d === 365 ? '1 year' : d + ' days', v.days === d, function () { v.days = d; render(); }); }),
      h('span', { style: 'width:10px' }),
      chip('Per day', v.mode === 'day', function () { v.mode = 'day'; render(); }, 'New sign-ups each day.'),
      chip('Running total', v.mode === 'total', function () { v.mode = 'total'; render(); }, 'How the total grew over time.'),
      h('span', { style: 'width:10px' }),
      chip('Waitlist', v.waitlist, function () { v.waitlist = !v.waitlist || !v.members; render(); }),
      chip('App members', v.members, function () { v.members = !v.members || !v.waitlist; render(); }));
    (DEMO ? Promise.resolve(sampleSignups(v.days)) : rpc('admin_signups', { p_days: v.days })).then(function (data) {
      let list = data.rows;
      if (v.mode === 'total') {
        let a = data.before_waitlist, b = data.before_members;
        list = list.map(function (r) { a += r.waitlist; b += r.members; return { day: r.day, waitlist: a, members: b }; });
      }
      const series = [];
      if (v.waitlist) series.push({ key: 'waitlist', color: 'var(--pink)', label: 'Waitlist' });
      if (v.members) series.push({ key: 'members', color: 'var(--gold)', label: 'App members' });
      const sum = function (k) { return data.rows.reduce(function (t, r) { return t + r[k]; }, 0); };
      box.replaceChildren(lineChart(list, series), h('div', { class: 'legend' }, series.map(function (sr) {
        return h('span', null, h('i', { style: 'background:' + sr.color }), sr.label + ': +' + n(sum(sr.key)) + ' in this range');
      })));
    }, function (e) { box.replaceChildren(h('p', { class: 'error', text: e.message })); });
    return card('Sign-ups over time', 'Pick a time range and what to show. Your choice is kept while you use the panel.', null, [controls, h('div', { style: 'margin-top:12px' }, box)]);
  }
  function pageWaitlist() {
    const w = state.overview.waitlist;
    const topMax = Math.max(1, (w.top_cities[0] || {}).count || 1);
    const ages = ['18-24', '25-29', '30-34', '35-39', '40-49', '50+'];
    return h('div', { class: 'stack' },
      h('div', { class: 'kpis' },
        kpi('Total', n(w.total)),
        kpi('Today', n(w.last_24h), 'last 24 hours'),
        kpi('This week', n(w.last_7d), 'last 7 days'),
        kpi('Free-month places left', n(w.first_10000_left), 'of 10,000', 'The first 10,000 people get 1 month of Premium free at launch.')),
      trendCard(),
      h('div', { class: 'grid cols-2' },
        card('Top cities', 'Where people on the waitlist live, from what they typed.', null, h('ul', { class: 'list' }, (w.top_cities || []).map(function (c) {
          return h('li', { style: 'display:block' }, h('div', { style: 'display:flex;justify-content:space-between' }, h('span', { text: c.city }), h('span', { class: 'num', text: n(c.count) })),
            h('div', { class: 'meter' }, h('span', { style: 'width:' + Math.round((c.count / topMax) * 100) + '%' })));
        }))),
        card('Ages', 'The age range people chose when they signed up.', null, rows(ages.map(function (k) { const v = (w.age_ranges || {})[k] || 0; return [k, n(v) + '  ·  ' + pct(v, w.total)]; })))),
      originsCards(w));
  }
  // Country comes from where the visitor connected from, not from what they typed;
  // source is the ad or post link they arrived on.
  function countryName(code) {
    try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code; } catch (_e) { return code; }
  }
  function originList(list, label, total) {
    const max = Math.max(1, (list[0] || {}).count || 1);
    if (!list.length) return h('p', { class: 'note', text: 'Nothing yet. This fills in as new people sign up.' });
    return h('ul', { class: 'list' }, list.map(function (c) {
      return h('li', { style: 'display:block' }, h('div', { style: 'display:flex;justify-content:space-between' }, h('span', { text: label(c) }), h('span', { class: 'num', text: n(c.count) + '  ·  ' + pct(c.count, total) })),
        h('div', { class: 'meter' }, h('span', { style: 'width:' + Math.round((c.count / max) * 100) + '%' })));
    }));
  }
  function originsCards(w) {
    const o = state.origins;
    if (!o) return h('p', { class: 'note', text: 'Countries and sources are not available yet. They appear once the latest database update is applied.' });
    return h('div', { class: 'grid cols-2' },
      card('Countries', 'Where people connected from when they signed up (' + n(o.with_country) + ' of ' + n(o.total) + ' have one). Only people who joined after this was switched on are counted.', null,
        originList(o.countries || [], function (c) { return countryName(c.country_code); }, o.with_country)),
      card('Where they came from', 'The ad or post link people arrived on, from utm_source/utm_medium/utm_campaign, or the site that sent them (' + n(o.with_source) + ' of ' + n(o.total) + ' have one).', null,
        originList(o.sources || [], function (c) { return c.source; }, o.with_source)));
  }
  function sampleOrigins() {
    return { total: 8412, with_country: 5230, with_source: 3610,
      countries: [['GB', 2480], ['US', 790], ['CA', 520], ['AE', 410], ['FR', 330], ['DE', 260], ['SA', 190], ['AU', 150]].map(function (c) { return { country_code: c[0], count: c[1] }; }),
      sources: [['reddit/paid/wave1', 1420], ['ref:old.reddit.com', 880], ['ref:out.reddit.com', 640], ['reddit/post/marriage', 410], ['ref:t.co', 260]].map(function (c) { return { source: c[0], count: c[1] }; }) };
  }

  function pageMembers() {
    const m = state.overview.members, c = state.overview.connections;
    return h('div', { class: 'stack' },
      h('div', { class: 'kpis' },
        kpi('Members', n(m.total), '+' + n(m.joined_7d) + ' this week', 'People with an app account.'),
        kpi('Ready to match', n(m.ready_for_matching), pct(m.ready_for_matching, m.total) + ' of members', 'Profile complete: name, city, bio, photo, answers and match preferences.'),
        kpi('Premium', n(m.premium), n(m.launch_reward_active) + ' from the free month', 'Members with Premium right now.'),
        kpi('Matches made', n(c.total), n(c.open) + ' still talking', 'Pairs who chose each other.')),
      h('div', { class: 'grid cols-2' },
        card('From sign-up to ready', 'How many members got through each step.', null, steps([
          ['Signed up', m.total], ['Finished set-up', m.onboarded, 'Went through the first set-up screens.'], ['Ready to match', m.ready_for_matching, 'Completed everything needed to be matched.']], m.total)),
        card('Women and men', null, null, rows([['Women', n(m.women) + '  ·  ' + pct(m.women, m.total), null, 1], ['Men', n(m.men) + '  ·  ' + pct(m.men, m.total), null, 1]]))),
      h('p', { class: 'note', text: 'Members are shown only as totals. Names, photos and messages are not shown here, on purpose.' }));
  }

  function pageReferrals() {
    const w = state.overview.waitlist, r = state.overview.referrals, st = state.settings;
    return h('div', { class: 'stack' },
      h('div', { class: 'kpis' },
        kpi('Referrals that count', n(r.waitlist_counted + r.app_counted), null, 'The friend finished their app profile, so it counts toward rewards.'),
        kpi('Waiting to count', n(r.waitlist_attributed + r.app_claimed - r.waitlist_counted - r.app_counted), null, 'Referred, but the friend hasn’t finished their app profile yet.'),
        kpi('Counted this week', n(r.counted_last_7d))),
      card('How referrals turn into rewards', 'Each step must happen before the next one counts.', null, [
        steps([['On the waitlist', w.total], ['Came from a friend', r.waitlist_attributed, 'Signed up using a friend’s referral link.'], ['Counted', r.waitlist_counted, 'Then finished their app profile.'],
          ['Entered a code in the app', r.app_claimed, 'Typed a friend’s referral code when joining the app.'], ['Counted (app)', r.app_counted]], w.total),
        h('p', { class: 'note', style: 'margin-top:14px', text: 'Rule: a referral counts only once the friend finishes their app profile. Signing up or confirming an email is not enough.' })]),
      card('Referral link', null, null, setting('Referral link address', 'Every referral link is this address plus the member’s code. It can only point to halalmo.de.',
        'Keep https://halalmo.de/?ref= until launch.',
        [h('span', { class: 'mono', text: st.referral_link_base + 'CODE' }), editBtn('Change', function () {
          const input = h('input', { type: 'text', value: st.referral_link_base, spellcheck: 'false' });
          dialog({
            title: 'Change the referral link address', body: 'It must start with https://halalmo.de/ and end with ?ref=',
            extra: h('label', { class: 'field' }, 'Address', input),
            run: function (why) {
              if (DEMO) return demoWrite('referral.link_base', { before: st.referral_link_base, after: input.value, reason: why }, function () { st.referral_link_base = input.value; });
              return rpc('admin_set_referral_link_base', { p_link_base: input.value.trim(), p_reason: why });
            }
          }).then(function (done) { if (done) { toast('Referral links updated.'); reload(); } });
        })])));
  }

  // Plain names and safe explanations for the matcher settings owners may change.
  const MATCHER = {
    min_reciprocal_score: ['Minimum chance of a match', 'Pairs less likely than this to choose each other are not introduced. Lower means more introductions, but more one-sided ones.'],
    no_match_boost_weight: ['Help for members without a match', 'How much the matcher favours people who have gone a while without a match.'],
    exposure_boost_weight: ['Help for members shown less', 'How much the matcher favours people who have been shown less often.'],
    boost_cap: ['Most help anyone can get', 'The upper limit on the two kinds of help above, added together.'],
    no_match_rounds_full: ['Days until full help', 'How many days without a match before someone gets the full help.'],
    exposure_window_rounds: ['Days counted for fairness', 'How many recent days are counted when checking who has been shown less.'],
    repeat_cooldown_days: ['Days before showing a pair again', 'How long to wait before two people can be introduced again.'],
    max_pair_appearances: ['Most times a pair is shown', 'How many times the same two people can ever be introduced.']
  };
  function matcherSettingsCard() {
    const box = h('div', null, h('div', { class: 'skeleton' }));
    (DEMO ? Promise.resolve(state.demoMatcher) : rpc('admin_matcher_settings')).then(function (cfg) {
      box.replaceChildren.apply(box, [h('p', { class: 'muted small', style: 'margin-bottom:6px', text: 'Matcher version ' + cfg.version + ' · active since ' + when(cfg.activated_at) })].concat((cfg.settings || []).map(function (st) {
        const meta = MATCHER[st.key] || [st.key, ''];
        return setting(meta[0], meta[1] + ' Allowed: ' + st.min + ' to ' + st.max + '.', null,
          [h('b', { class: 'num', text: String(st.value) }), editBtn('Change', function () {
            const input = h('input', { type: 'number', min: String(st.min), max: String(st.max), step: st.whole ? '1' : '0.01', value: String(st.value) });
            dialog({
              title: meta[0], body: meta[1],
              extra: h('label', { class: 'field' }, 'New value (' + st.min + ' to ' + st.max + ')', input),
              diff: [['Now', String(st.value)]],
              typed: 'MATCHER',
              run: function (why) {
                const v = Number(input.value);
                if (DEMO) return demoWrite('matcher.set', { setting: st.key, before: st.value, after: v, version: cfg.version + 1, reason: why }, function () { st.value = v; cfg.version += 1; cfg.activated_at = new Date().toISOString(); });
                return rpc('admin_set_matcher_setting', { p_key: st.key, p_value: v, p_reason: why });
              }
            }).then(function (done) { if (done) { toast('Saved as a new matcher version.'); render(); } });
          })]);
      })));
    }, function (e) { box.replaceChildren(h('p', { class: 'error', text: e.message })); });
    return card('Advanced: matcher settings', 'How the matcher balances good matches against giving everyone a turn. Each change makes a new version, used from the next daily match. To undo, set the old value again.',
      pill('warn', 'Changes who meets whom'), box);
  }

  function pageStats() {
    const mt = state.overview.matching, f = mt.fairness || {};
    const days = state.statsDays || 30;
    const box = h('div', { class: 'stack' }, h('div', { class: 'skeleton' }));
    (DEMO ? Promise.resolve(sampleMatchStats(days)) : rpc('admin_match_stats', { p_days: days })).then(function (st) {
      const wt = st.waiting || {};
      const g = st.by_gender || {};
      const genderRow = function (key, label) {
        const x = g[key] || { shown: 0, picked: 0, members: 0, matched: 0 };
        return h('tr', null, h('td', { style: 'font-weight:600', text: label }), h('td', { class: 'num', text: n(x.members) }),
          h('td', { class: 'num', text: pct(x.picked, x.shown) }), h('td', { class: 'num', text: n(x.matched) + '  ·  ' + pct(x.matched, x.members) }));
      };
      const waitBar = function (label, v, tip) { return [label, v, tip]; };
      box.replaceChildren(
        h('div', { class: 'kpis' },
          kpi('Times shown', n(st.shown), 'introductions decided', 'Each time someone saw a profile in their daily set and decided.'),
          kpi('Picks', n(st.picks), pct(st.picks, st.shown) + ' of times shown', 'Times someone chose the person they were shown.'),
          kpi('Matches', n(st.matches), pct(st.matches * 2, st.picks) + ' of picks matched', 'Both people picked each other.'),
          kpi('One-sided picks', n(st.one_sided_picks), pct(st.one_sided_picks, st.picks) + ' of picks', 'Someone picked a person who did not pick them back.', st.picks && st.one_sided_picks / st.picks > 0.85)),
        h('div', { class: 'grid cols-2' },
          card('Who isn’t getting matches', 'Members shown in this period, and where they got stuck.', null, steps([
            ['Shown to someone', st.members_shown],
            ['Picked by nobody', st.picked_by_nobody, 'Shown at least 3 times and never picked. Their profile may need help (photos, bio).'],
            ['Picked, but no match', st.picked_not_matched, 'Someone wanted them, but they did not pick that person back, or haven’t yet.'],
            ['Matched', st.members_matched, 'Got at least one match in this period.']], st.members_shown)),
          card('How long since their last match', 'From the latest daily match: how many days members have gone without a match.', null, steps([
            waitBar('0–3 days', wt.r0_3), waitBar('4–7 days', wt.r4_7), waitBar('8–13 days', wt.r8_13, 'The matcher gives these members extra help.'),
            waitBar('14+ days', wt.r14, 'If this grows, raise “Help for members without a match” in Member scoring → Advanced.')], wt.members))),
        card('Women and men', 'How each side is picked and matched. Big gaps can mean one side has many more choices.', null, h('div', { class: 'table-wrap' }, h('table', null,
          h('thead', null, h('tr', null, ['', 'Members shown', 'Picked rate', 'Matched'].map(function (t) { return h('th', { text: t }); }))),
          h('tbody', null, genderRow('female', 'Women'), genderRow('male', 'Men'))))),
        card('Matches per day', 'New matches each day in this period.', null, barChart((st.daily_matches || []).slice(-30))));
    }, function (e) { box.replaceChildren(h('p', { class: 'error', text: e.message })); });
    const chips = h('div', { class: 'filters' }, [7, 30, 90, 365].map(function (d) {
      return h('button', { type: 'button', class: 'chip', 'aria-pressed': String(d === days), text: d === 365 ? '1 year' : d + ' days', onclick: function () { state.statsDays = d; render(); } });
    }));
    return h('div', { class: 'stack' }, chips, box,
      card('Is everyone getting a turn?', 'The matcher makes sure people who were matched less get a turn. These numbers check that it works.', null, rows([
        ['People in the last daily match', n(f.members), null, 1],
        ['Waiting 3+ days for a match', n(f.waiting_3_plus_rounds) + '  ·  ' + pct(f.waiting_3_plus_rounds, f.members), 'Should stay low.'],
        ['Members with lower scores', n(f.low_score_members), 'Members whose private score is lower than most.'],
        ['…of those, waiting 3+ days', n(f.low_score_waiting_3_plus) + '  ·  ' + pct(f.low_score_waiting_3_plus, f.low_score_members), 'If this is much higher than the line above, lower the importance of the score parts in Member scoring.', 1]])),
      card('Matching runs', 'Each time the matcher made the day’s introductions.', null, h('div', { class: 'table-wrap' }, h('table', null,
        h('thead', null, h('tr', null, ['When', 'Type', 'People', 'Pairs made', 'Result'].map(function (t) { return h('th', { text: t }); }))),
        h('tbody', null, (mt.runs || []).length ? mt.runs.map(function (x) {
          const st = x.failed ? pill('bad', 'Failed') : !x.finished_at ? pill('warn', 'Running') : x.breaches ? pill('warn', 'Warning', 'It finished, but something was slower or bigger than expected.') : pill('good', 'OK');
          return h('tr', null, h('td', { class: 'nowrap', text: when(x.started_at) }),
            h('td', null, x.mode === 'shadow' ? pill('off', 'Test run', 'A practice run. Nobody saw its results.') : h('span', { class: 'tag', text: 'Real' })),
            h('td', { class: 'num', text: n(x.eligible) }), h('td', { class: 'num', text: n(x.pairs) }), h('td', null, st));
        }) : h('tr', null, h('td', { colspan: '5', class: 'muted', text: 'No runs yet.' })))))));
  }

  function pageScoring() {
    const sig = state.overview.signals, luna = state.overview.luna;
    const byKey = {};
    (sig.metrics || []).forEach(function (x) { byKey[x.key] = { enabled: x.enabled, weight: Number(x.weight) }; });
    const draft = JSON.parse(JSON.stringify(byKey));
    const shares = {};
    const saveBtn = h('button', { type: 'button', class: 'btn', text: 'Save changes', disabled: true });
    const undoBtn = h('button', { type: 'button', class: 'btn ghost', text: 'Undo', disabled: true });
    const changed = function () { return SIGNAL_ORDER.filter(function (k) { return byKey[k] && (draft[k].enabled !== byKey[k].enabled || draft[k].weight !== byKey[k].weight); }); };
    function update() {
      const total = SIGNAL_ORDER.filter(function (k) { return k !== 'reception_similarity' && draft[k] && draft[k].enabled; }).reduce(function (a, k) { return a + draft[k].weight; }, 0);
      SIGNAL_ORDER.forEach(function (k) {
        if (!shares[k]) return;
        shares[k].textContent = !draft[k].enabled ? 'Off' : k === 'reception_similarity' ? 'Nudge ' + draft[k].weight.toFixed(2) : total ? Math.round((draft[k].weight / total) * 100) + '% of total' : '–';
        shares[k].row.classList.toggle('dirty', changed().indexOf(k) >= 0);
      });
      saveBtn.disabled = !canEdit() || !changed().length;
      undoBtn.disabled = !changed().length;
    }
    const list = h('div', null, SIGNAL_ORDER.filter(function (k) { return byKey[k]; }).map(function (k) {
      const toggle = h('input', { type: 'checkbox', role: 'switch', 'aria-label': SIGNALS[k][0] + ' on or off', disabled: !canEdit() });
      toggle.checked = draft[k].enabled;
      const out = h('output', { text: draft[k].weight.toFixed(2) });
      const range = h('input', { type: 'range', min: '0', max: k === 'reception_similarity' ? '0.2' : '1', step: '0.01', value: String(draft[k].weight), 'aria-label': SIGNALS[k][0] + ' importance', disabled: !canEdit(), tip: 'Importance: how much this signal counts compared with the others.' });
      toggle.addEventListener('change', function () { draft[k].enabled = toggle.checked; update(); });
      range.addEventListener('input', function () { draft[k].weight = Math.round(Number(range.value) * 100) / 100; out.textContent = draft[k].weight.toFixed(2); update(); });
      const share = h('div', { class: 'share' });
      const extra = k === 'luna_presentation' ? h('div', { class: 'extra' },
        pill(luna.enabled ? 'good' : 'off', 'Luna ' + (luna.enabled ? 'on' : 'off'), 'Luna is the AI that does the photo quality check.'),
        h('span', { class: 'muted small', text: n(luna.analyzed) + ' photos checked · ' + n(luna.queued) + ' waiting' + (luna.failed ? ' · ' + n(luna.failed) + ' failed' : '') }),
        h('button', { type: 'button', class: 'btn ghost sm', disabled: !canEdit() || !luna.enabled, tip: 'Turning this on only checks new photos. Use this to check photos people already have, up to 50 at a time.', onclick: checkExistingPhotos }, 'Check existing photos')) : null;
      const row = h('div', { class: 'metric' }, h('label', { class: 'switch', tip: 'On or off' }, toggle, h('span')),
        h('div', null, h('div', { class: 'name' }, SIGNALS[k][0], info(SIGNALS[k][1])), k === 'reception_similarity' ? h('div', { class: 'desc', text: 'Applies to pairs, not people.' }) : null),
        h('div', { class: 'weight' }, range, out), share, extra);
      share.row = row; shares[k] = share;
      return row;
    }));
    undoBtn.addEventListener('click', render);
    saveBtn.addEventListener('click', function () {
      const keys = changed();
      const lunaOn = draft.luna_presentation && draft.luna_presentation.enabled && !byKey.luna_presentation.enabled;
      dialog({
        title: 'Save ' + keys.length + ' change' + (keys.length > 1 ? 's' : '') + '?',
        body: 'This takes effect straight away for the next daily match.',
        diff: keys.map(function (k) {
          const b = byKey[k], a = draft[k];
          return [SIGNALS[k][0], (b.enabled ? b.weight.toFixed(2) : 'off') + '  →  ' + (a.enabled ? a.weight.toFixed(2) : 'off')];
        }),
        extra: lunaOn && h('p', { class: 'note warn', text: 'Turning on the photo quality check sends new profile photos to Luna. Each one costs a little API money.' }),
        typed: lunaOn ? 'LUNA' : null,
        run: function (why) {
          let chain = Promise.resolve();
          keys.forEach(function (k) {
            chain = chain.then(function () {
              if (DEMO) return demoSignal(k, draft[k], why);
              return rpc('admin_set_matching_metric', { p_metric_key: k, p_enabled: draft[k].enabled, p_weight: draft[k].weight, p_reason: why });
            });
          });
          return chain;
        }
      }).then(function (done) { if (done) { toast('Saved.'); reload(); } });
    });
    update();
    return h('div', { class: 'stack' },
      card('What goes into the score', 'Switch each part on or off and set how important it is. Importance is shared between the parts that are on.',
        h('span', { class: 'muted small', text: 'Version ' + sig.config_version + ' · changed ' + ago(sig.config_updated_at) }), list,
        [h('span', { class: 'muted small', style: 'flex:1', text: canEdit() ? 'Turning a part off shares its importance among the rest.' : 'Only owners can change scoring.' }), undoBtn, saveBtn]),
      h('div', { class: 'grid cols-wide' },
        card('How scores are spread', 'Each bar is a group of members, from lower scores to higher. Darker means more certain. Nobody is named.', null, [spreadChart(sig.distribution || []),
          h('div', { class: 'legend' },
            h('span', null, h('i', { style: 'background:var(--conf-low)' }), 'New members (not much to go on yet)'),
            h('span', null, h('i', { style: 'background:var(--conf-mid)' }), 'Some history'),
            h('span', null, h('i', { style: 'background:var(--conf-high)' }), 'Lots of history'))]),
        card('Good to know', null, null, rows([
          ['Members can see it', 'Never', null, 1], ['Stops anyone being matched', 'Never', null, 1],
          ['New members start', 'In the middle', 'With little history, everyone starts in the middle and moves slowly.'],
          ['Looks back', '180 days', 'Older activity is forgotten.'],
          ['Last updated', ago(sig.last_computed_at)]]))),
      matcherSettingsCard());
  }
  function checkExistingPhotos() {
    const count = h('input', { type: 'number', min: '1', max: '50', value: '20' });
    dialog({
      title: 'Check existing photos', body: 'Luna checks photos members already have. Each photo costs a little API money.',
      extra: h('label', { class: 'field' }, 'How many photos (1 to 50)', count),
      typed: 'QUEUE', reason: false, confirm: 'Start checking',
      run: function () {
        const limit = Number(count.value);
        if (!(limit >= 1 && limit <= 50)) return Promise.reject(new Error('Choose 1 to 50.'));
        return DEMO ? demoBackfill(limit) : rpc('admin_queue_luna_backfill', { p_limit: limit, p_confirm: 'QUEUE' });
      }
    }).then(function (res) { if (res) { toast(res.queued + ' photos will be checked.'); reload(); } });
  }

  const REPORT_ACTIONS = {
    dismiss: ['Dismiss', 'Close the report. Nothing happens to the member. The reporter is told it was reviewed.'],
    suspend: ['Suspend 7 days', 'Hide their profile and block sign-in for 7 days. The reporter is told action was taken.'],
    ban: ['Ban', 'Hide their profile and block sign-in for good. The reporter is told action was taken.']
  };
  function pageReports() {
    const sf = state.overview.safety;
    const box = h('div', { class: 'stack' }, h('div', { class: 'skeleton' }));
    const status = state.reportStatus || 'open';
    function fetchReports() {
      if (DEMO) {
        const all = state.demoReports;
        return Promise.resolve(all.filter(function (r) { return status === 'all' || (status === 'open') === !r.resolved_at; }));
      }
      return rpc('admin_reports', { p_status: status, p_limit: 100 });
    }
    function act(r, action) {
      const meta = REPORT_ACTIONS[action];
      dialog({
        title: meta[0] + ': ' + r.subject.first_name + '?', body: meta[1], danger: action !== 'dismiss',
        typed: action === 'ban' ? 'BAN' : null, confirm: meta[0],
        run: function (why) {
          if (DEMO) return demoWrite('report.' + action, { report: r.id.slice(0, 8), member: r.subject.ref, reason: why }, function () { r.resolved_at = new Date().toISOString(); state.overview.safety.open_reports = Math.max(0, state.overview.safety.open_reports - 1); });
          return fresh().then(function () { return request('/functions/v1/report-action', { method: 'POST', body: { admin: true, r: r.id, a: action, why: why } }); });
        }
      }).then(function (done) { if (done) { toast('Done.'); reload(); } });
    }
    function reportCard(r) {
      const sub = r.subject || {};
      return h('section', { class: 'card' }, h('div', { class: 'card-body' },
        h('div', { style: 'display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:8px' },
          pill(r.resolved_at ? 'off' : 'bad', r.resolved_at ? 'Closed' : 'Open'), h('b', { text: (function (t) { return t.charAt(0).toUpperCase() + t.slice(1); })(String(r.reason || 'report').replace(/_/g, ' ')) }),
          h('span', { class: 'muted small', text: when(r.created_at) })),
        h('p', { style: 'margin-bottom:10px', text: r.detail ? '“' + r.detail + '”' : 'No details written.' }),
        rows([
          ['Reported member', sub.first_name + ' · ' + [sub.city, sub.country].filter(Boolean).join(', '), 'Member reference ' + sub.ref + '. Joined ' + when(sub.joined_at) + '.', 1],
          ['Their report history', n(sub.reports_total) + ' in total · ' + n(sub.reports_open) + ' open', 'Several reports from different people is a strong sign.'],
          ['Hidden right now', sub.paused ? 'Yes' : 'No', 'Hidden members are not shown to anyone.'],
          ['Reported by', (r.reporter && r.reporter.first_name) + ' · ' + (r.reporter && r.reporter.ref)]])),
        r.resolved_at ? null : h('div', { class: 'card-foot' }, ['dismiss', 'suspend', 'ban'].map(function (a) {
          return h('button', { type: 'button', class: 'btn sm' + (a === 'dismiss' ? ' ghost' : a === 'ban' ? ' danger' : ''), disabled: !canEdit(), tip: REPORT_ACTIONS[a][1], onclick: function () { act(r, a); } }, REPORT_ACTIONS[a][0]);
        })));
    }
    fetchReports().then(function (list) {
      box.replaceChildren.apply(box, (list || []).length ? list.map(reportCard) : [h('div', { class: 'card' }, h('div', { class: 'card-body' }, h('p', { class: 'muted', text: status === 'open' ? 'No open reports. All clear.' : 'No reports here.' })))]);
    }, function (e) { box.replaceChildren(h('p', { class: 'error', text: e.message })); });
    const tabs = h('div', { class: 'filters' }, [['open', 'Open'], ['resolved', 'Closed'], ['all', 'All']].map(function (t) {
      return h('button', { type: 'button', class: 'chip', 'aria-pressed': String(t[0] === status), text: t[1], onclick: function () { state.reportStatus = t[0]; render(); } });
    }));
    return h('div', { class: 'stack' },
      h('div', { class: 'kpis' },
        kpi('Open reports', n(sf.open_reports), n(sf.reports_7d) + ' this week', 'Reports from members that nobody has dealt with yet.', sf.open_reports > 0),
        kpi('Waiting for a check', n(sf.moderation_pending), null, 'New photos and bios waiting for the automatic safety check.'),
        kpi('Flagged for a person', n(sf.moderation_review), 'last 7 days', 'The automatic check wasn’t sure and wants a person to look.'),
        kpi('Removed automatically', n(sf.moderation_removed_7d), 'last 7 days', 'Clearly unsafe photos removed by the automatic check.', sf.moderation_stuck > 0)),
      h('div', { style: 'display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap' }, h('h2', null, 'Reports', info('Read each report and decide. Every decision needs a reason and is saved in the activity log.')), tabs),
      box,
      card('Automatic checks', 'Every new photo and bio is checked for unsafe content.', sf.moderation_stuck ? pill('bad', n(sf.moderation_stuck) + ' stuck') : pill('good', 'Working'), rows([
        ['Waiting', n(sf.moderation_pending), null, 1], ['Stuck (gave up after retries)', n(sf.moderation_stuck), 'These need someone to look at the logs.']])));
  }

  function pageEmail() {
    const mail = state.overview.mail, st = state.settings;
    const kind = mail.failing ? 'bad' : mail.pending > 200 ? 'warn' : 'good';
    return h('div', { class: 'stack' },
      h('div', { class: 'kpis' },
        kpi('Waiting to send', n(mail.pending), mail.oldest_pending_at ? 'oldest ' + ago(mail.oldest_pending_at) : 'none', 'Emails in the queue right now.'),
        kpi('Sent today', n(mail.sent_24h), 'last 24 hours'),
        kpi('Failed', n(mail.failing), null, 'Emails that failed many times and were given up on.', mail.failing > 0)),
      card('Sending', null, pill(kind, kind === 'good' ? 'Working' : kind === 'warn' ? 'Busy' : 'Problem'), h('div', null,
        setting('Daily limit', 'The most waitlist emails sent in 24 hours. The last 10 are always kept for safety reports.',
          'Resend’s free plan allows 100 a day. Leave it empty to use Amazon SES’s own limit once AWS approves it.',
          [h('b', { text: st.mail_daily_limit == null ? 'No limit set' : n(st.mail_daily_limit) + ' a day' }), editBtn('Change', function () {
            const input = h('input', { type: 'number', min: '11', max: '1000000', value: st.mail_daily_limit == null ? '' : String(st.mail_daily_limit), placeholder: 'Empty = no limit set' });
            dialog({
              title: 'Change the daily limit', extra: h('label', { class: 'field' }, 'Emails a day', input),
              run: function (why) {
                const v = input.value.trim() === '' ? null : Number(input.value);
                if (DEMO) return demoWrite('mail.daily_limit', { before: st.mail_daily_limit, after: v, reason: why }, function () { st.mail_daily_limit = v; state.overview.mail.daily_limit = v; });
                return rpc('admin_set_mail_daily_limit', { p_daily_limit: v, p_reason: why });
              }
            }).then(function (done) { if (done) { toast('Saved.'); reload(); } });
          })]),
        setting('Used today', null, null, h('b', { text: mail.daily_limit ? n(mail.sent_24h) + ' of ' + n(mail.daily_limit) + '  (' + pct(mail.sent_24h, mail.daily_limit) + ')' : n(mail.sent_24h) })))));
  }

  function whoGets(f) {
    if (!f.enabled) return 'Nobody';
    if (f.rollout >= 100) return 'Everyone';
    if (f.rollout <= 0) return f.members ? 'Testers only' : 'Nobody yet';
    return f.rollout + '% of members';
  }
  function pageFeatures() {
    const flags = (state.settings && state.settings.flags) || [];
    return h('div', { class: 'stack' },
      h('p', { class: 'lead', text: 'Turn app features on or off without a new app update. You can give a feature to everyone, to some members, or only to testers.' }),
      card(null, null, null, h('div', { class: 'table-wrap' }, h('table', null,
        h('thead', null, h('tr', null, [h('th', { text: 'Feature' }), h('th', { text: 'On' }), h('th', null, 'Who gets it', info('Testers on the list always get a feature that is on. Others get it by percentage.')), h('th', { text: 'Changed' }), h('th')])),
        h('tbody', null, flags.map(function (f) {
          const meta = FEATURES[f.key] || [f.key, ''];
          return h('tr', null,
            h('td', null, h('div', { style: 'font-weight:600' }, meta[0], meta[1] && info(meta[1])), h('div', { class: 'mono muted', text: f.key })),
            h('td', null, f.enabled ? pill('good', 'On') : pill('off', 'Off')),
            h('td', { text: whoGets(f) }),
            h('td', { class: 'nowrap muted', text: ago(f.updated_at) }),
            h('td', { style: 'text-align:right' }, editBtn('Change', function () { editFeature(f); })));
        }))))));
  }
  function editFeature(f) {
    if (!canEdit()) { toast('Only owners can change features.'); return; }
    const meta = FEATURES[f.key] || [f.key, ''];
    const toggle = h('input', { type: 'checkbox', role: 'switch', 'aria-label': 'On' });
    toggle.checked = f.enabled;
    const rollout = h('input', { type: 'range', min: '0', max: '100', step: '5', value: String(f.rollout), style: 'flex:1;accent-color:var(--pink)' });
    const out = h('output', { class: 'num', text: f.rollout + '%' });
    rollout.addEventListener('input', function () { out.textContent = rollout.value + '%'; });
    dialog({
      title: meta[0], body: meta[1],
      extra: h('div', { style: 'display:grid;gap:12px' },
        h('label', { style: 'display:flex;align-items:center;justify-content:space-between;font-weight:600' }, 'On', h('span', { class: 'switch' }, toggle, h('span'))),
        h('label', { class: 'field' }, 'How many members get it', h('span', { class: 'hint', text: '100% = everyone. 0% = testers only.' }),
          h('div', { style: 'display:flex;gap:10px;align-items:center' }, rollout, out))),
      typed: f.key,
      run: function (why) {
        const args = { p_key: f.key, p_enabled: toggle.checked, p_rollout: Number(rollout.value), p_confirm: f.key, p_reason: why };
        if (DEMO) return demoWrite('flag.set', { flag: f.key, before: { enabled: f.enabled, rollout: f.rollout }, after: { enabled: args.p_enabled, rollout: args.p_rollout }, reason: why },
          function () { f.enabled = args.p_enabled; f.rollout = args.p_rollout; f.updated_at = new Date().toISOString(); });
        return rpc('admin_set_release_flag', args);
      }
    }).then(function (done) { if (done) { toast('Saved.'); reload(); } });
  }

  function pageTeam() {
    const st = state.settings, team = st.team || [];
    return h('div', { class: 'stack' },
      card('People with access', 'Owners can see and change everything. Viewers can only look.',
        h('button', { type: 'button', class: 'btn sm', disabled: !canEdit(), onclick: addMember }, 'Add person'), h('div', { class: 'table-wrap' }, h('table', null,
          h('thead', null, h('tr', null, [h('th', { text: 'Name' }), h('th', { text: 'Access' }), h('th', null, 'Code app', info('Whether they have set up their authenticator app.')), h('th', { text: 'Last signed in' }), h('th')])),
          h('tbody', null, team.map(function (a) {
            return h('tr', null,
              h('td', null, h('div', { style: 'font-weight:600', text: (a.note || a.email) + (a.you ? ' (you)' : '') }), h('div', { class: 'muted small', text: a.email })),
              h('td', null, h('span', { class: 'tag', text: a.role === 'owner' ? 'Owner' : 'Viewer' })),
              h('td', null, a.mfa_factors ? pill('good', 'Set up') : pill('warn', 'Not yet')),
              h('td', { class: 'nowrap muted', text: ago(a.last_sign_in) }),
              h('td', { style: 'text-align:right;white-space:nowrap' },
                editBtn(a.role === 'owner' ? 'Make viewer' : 'Make owner', function () { changeRole(a); }), ' ',
                editBtn('Remove', function () { removeMember(a); })));
          }))))),
      state.me.role === 'owner' ? card('Try it out', 'Safe ways to check what other people experience. Nothing here changes data.', null, h('div', null,
        setting('Preview as a viewer', 'See the panel exactly as a viewer does: everything visible, nothing changeable.', 'Turn off to get your owner controls back.',
          (function () {
            const t = h('input', { type: 'checkbox', role: 'switch', 'aria-label': 'Preview as a viewer' });
            t.checked = !!state.previewViewer;
            t.addEventListener('change', function () { state.previewViewer = t.checked; toast(t.checked ? 'Previewing as a viewer.' : 'Back to owner controls.'); render(); });
            return h('label', { class: 'switch' }, t, h('span'));
          })()),
        setting('What a new admin sees first', 'Open the sign-in screen a new admin sees, without signing out.', null,
          h('a', { class: 'btn ghost sm', href: '/admin?preview=signin', target: '_blank', rel: 'noopener' }, 'Open')))) : null,
      card('Security', 'How this panel keeps the app safe. These are always on.', null, h('div', null,
        setting('6-digit code to sign in', 'Every admin signs in with Google and a code from an authenticator app.', null, pill('good', 'Always on')),
        setting('6-digit code to make changes', 'Changes need a code from the last 15 minutes, even if you are signed in.', null, pill('good', 'Always on')),
        setting('Sign out when idle', 'You are signed out after 15 minutes of no activity, and when you close the tab.', null, pill('good', '15 minutes')),
        setting('Change limit', 'No more than 60 changes per person in 10 minutes.', null, pill('good', 'Always on')),
        setting('Sign out everywhere', 'Ends your sessions on every device, including the app.', null,
          h('button', { type: 'button', class: 'btn ghost sm', onclick: function () {
            dialog({ title: 'Sign out everywhere?', body: 'You will be signed out on every device.', reason: false, local: true, confirm: 'Sign out everywhere', danger: true,
              run: function () { return Promise.resolve(true); } }).then(function (ok) { if (ok) signOut('global', 'Signed out on every device.'); });
          } }, 'Sign out everywhere')))),
      card('Recent sign-ins', 'Who signed in to this panel, and when.', null, (st.sign_ins || []).length ? h('ul', { class: 'list' }, st.sign_ins.slice(0, 8).map(function (x) {
        return h('li', null, h('span', { text: x.actor }), h('span', { class: 'muted small', text: when(x.at) }));
      })) : h('p', { class: 'muted', text: 'No sign-ins yet.' })));
  }
  function addMember() {
    if (!canEdit()) { toast('Only owners can add people.'); return; }
    const email = h('input', { type: 'email', placeholder: 'name@example.com', autocomplete: 'off' });
    const name = h('input', { type: 'text', placeholder: 'For example: Aisha', maxlength: '60' });
    const role = h('select', null, h('option', { value: 'viewer', text: 'Viewer: can only look' }), h('option', { value: 'owner', text: 'Owner: can change things' }));
    dialog({
      title: 'Add a person', body: 'They must have signed in to Halal Mode once with this email. They set up their code the first time they open this panel.',
      extra: h('div', { style: 'display:grid;gap:12px' }, h('label', { class: 'field' }, 'Email', email), h('label', { class: 'field' }, 'Name', name), h('label', { class: 'field' }, 'Access', role)),
      confirm: 'Add',
      run: function (why) {
        if (DEMO) return demoWrite('team.add', { name: name.value || email.value, role: role.value, reason: why }, function () {
          state.settings.team.push({ user_id: String(Date.now()), email: email.value, note: name.value, role: role.value, added_at: new Date().toISOString(), mfa_factors: 0 });
        });
        return rpc('admin_add_member', { p_email: email.value.trim(), p_role: role.value, p_note: name.value.trim(), p_reason: why });
      }
    }).then(function (done) { if (done) { toast('Added.'); reload(); } });
  }
  function changeRole(a) {
    const next = a.role === 'owner' ? 'viewer' : 'owner';
    dialog({
      title: 'Make ' + (a.note || a.email) + ' ' + (next === 'owner' ? 'an owner?' : 'a viewer?'),
      body: next === 'owner' ? 'Owners can change everything, including who has access.' : 'Viewers can only look.',
      confirm: 'Change', danger: next === 'owner',
      run: function (why) {
        if (DEMO) return demoWrite('team.role', { name: a.note, before: a.role, after: next, reason: why }, function () { a.role = next; });
        return rpc('admin_set_member_role', { p_user_id: a.user_id, p_role: next, p_reason: why });
      }
    }).then(function (done) { if (done) { toast('Changed.'); reload(); } });
  }
  function removeMember(a) {
    dialog({
      title: 'Remove ' + (a.note || a.email) + '?', body: a.you ? 'You will lose access straight away.' : 'They lose access straight away.',
      danger: true, confirm: 'Remove', typed: 'REMOVE',
      run: function (why) {
        if (DEMO) return demoWrite('team.remove', { name: a.note, role: a.role, reason: why }, function () { state.settings.team = state.settings.team.filter(function (x) { return x !== a; }); });
        return rpc('admin_remove_member', { p_user_id: a.user_id, p_reason: why });
      }
    }).then(function (done) {
      if (!done) return;
      toast('Removed.');
      if (a.you && !DEMO) signOut(); else reload();
    });
  }

  // ---------------------------------------------------------------- activity log
  const LOG_ICON = { report: 'reports', member: 'suspicious', review: 'review', matching_metric: 'scoring', luna: 'scoring', matcher: 'stats', flag: 'features', referral: 'referrals', mail: 'email', team: 'team', admin: 'lock' };
  function describe(a) {
    const x = a.detail || {};
    const arrow = function (b, af) { return String(b == null ? 'none' : b) + ' → ' + String(af == null ? 'none' : af); };
    switch (a.action) {
      case 'matching_metric.set': {
        const b = x.before || {}, af = x.after || {};
        return (SIGNALS[x.metric] || [x.metric])[0] + ': ' + arrow(b.enabled ? Number(b.weight).toFixed(2) : 'off', af.enabled ? Number(af.weight).toFixed(2) : 'off');
      }
      case 'luna.backfill': return 'Started checking ' + x.queued + ' existing photos';
      case 'flag.set': return (FEATURES[x.flag] || [x.flag])[0] + ': ' + whoGets({ enabled: x.after && x.after.enabled, rollout: x.after && x.after.rollout, members: 1 });
      case 'referral.link_base': return 'Referral link: ' + arrow(x.before, x.after);
      case 'mail.daily_limit': return 'Email daily limit: ' + arrow(x.before == null ? 'none' : x.before, x.after == null ? 'none' : x.after);
      case 'team.add': return 'Added ' + (x.name || 'a person') + ' as ' + (x.role === 'owner' ? 'an owner' : 'a viewer');
      case 'team.role': return (x.name || 'A person') + ' is now ' + (x.after === 'owner' ? 'an owner' : 'a viewer');
      case 'team.remove': return 'Removed ' + (x.name || 'a person');
      case 'admin.sign_in': return 'Signed in';
      case 'member.suspend': return 'Suspended member ' + x.member + ' for 7 days';
      case 'member.ban': return 'Banned member ' + x.member;
      case 'member.unban': return 'Unbanned member ' + x.member;
      case 'review.done': return 'Reviewed a flagged item for member ' + x.member;
      case 'matcher.set': return ((typeof MATCHER !== 'undefined' && MATCHER[x.setting]) || [x.setting])[0] + ': ' + arrow(x.before, x.after) + ' (version ' + x.version + ')';
      case 'report.dismiss': return 'Dismissed a report about member ' + x.member;
      case 'report.suspend': return 'Suspended member ' + x.member + ' for 7 days';
      case 'report.ban': return 'Banned member ' + x.member;
      default: return a.action;
    }
  }
  function logList(items) {
    if (!items.length) return h('p', { class: 'muted', text: 'Nothing yet.' });
    return h('div', null, items.map(function (a) {
      const reason = a.detail && a.detail.reason;
      return h('div', { class: 'audit-item' }, h('div', { class: 'ic' }, icon(LOG_ICON[a.action.split('.')[0]] || 'log')),
        h('div', { style: 'min-width:0' }, h('div', { class: 'what', text: describe(a) }), h('div', { class: 'why', text: a.actor + (reason ? ' · “' + reason + '”' : '') })),
        h('div', { class: 'when', text: when(a.at) }));
    }));
  }
  function pageLog() {
    const cats = [['', 'Everything'], ['report', 'Reports'], ['member', 'Account actions'], ['review', 'Reviews'], ['matching_metric', 'Member scoring'], ['matcher', 'Matcher settings'], ['flag', 'Features'], ['referral', 'Referrals'], ['mail', 'Email'], ['team', 'Team'], ['admin', 'Sign-ins']];
    const box = h('div', null, h('div', { class: 'skeleton' }));
    const more = h('button', { type: 'button', class: 'btn ghost sm', text: 'Show older', hidden: true });
    let items = [];
    function fetchPage(before) {
      if (DEMO) {
        const all = state.overview.audit.filter(function (a) {
          const c = a.action.split('.')[0];
          return !state.logCategory || c === state.logCategory || (state.logCategory === 'matching_metric' && c === 'luna');
        });
        return Promise.resolve(before ? [] : all);
      }
      return rpc('admin_audit_log', { p_before: before || null, p_category: state.logCategory || null, p_limit: 50 });
    }
    function draw() { box.replaceChildren(logList(items)); more.hidden = items.length === 0 || items.length % 50 !== 0; }
    function loadFirst() {
      items = [];
      box.replaceChildren(h('div', { class: 'skeleton' }));
      fetchPage(null).then(function (r) { items = r || []; draw(); }, function (e) { box.replaceChildren(h('p', { class: 'error', text: e.message })); });
    }
    more.addEventListener('click', function () { fetchPage(items[items.length - 1].at).then(function (r) { items = items.concat(r || []); draw(); }); });
    const chips = h('div', { class: 'filters' }, cats.map(function (c) {
      return h('button', { type: 'button', class: 'chip', 'aria-pressed': String(c[0] === state.logCategory), text: c[1], onclick: function (e) {
        state.logCategory = c[0];
        chips.querySelectorAll('.chip').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        e.currentTarget.setAttribute('aria-pressed', 'true');
        loadFirst();
      } });
    }));
    loadFirst();
    return h('div', { class: 'stack' }, chips, card(null, null, null, box, more), h('p', { class: 'note', text: 'Nobody can edit or delete this log, not even owners.' }));
  }

  // ---------------------------------------------------------------- trust & safety, subscriptions, system health
  const ACCOUNT_ACTIONS = {
    suspend: ['Suspend 7 days', 'Hide their profile and block sign-in for 7 days.'],
    ban: ['Ban', 'Hide their profile and block sign-in for good.'],
    unban: ['Unban', 'Let them sign in again and show their profile again.']
  };
  function memberAction(m, action, after) {
    const meta = ACCOUNT_ACTIONS[action];
    dialog({
      title: meta[0] + ': ' + (m.first_name || m.ref) + '?', body: meta[1], danger: action !== 'unban',
      typed: action === 'ban' ? 'BAN' : null, confirm: meta[0],
      run: function (why) {
        if (DEMO) return demoWrite('member.' + action, { member: m.ref, reason: why }, function () { m.banned = action !== 'unban'; m.paused = action !== 'unban'; m.banned_until = action === 'unban' ? null : new Date(Date.now() + (action === 'ban' ? 3e12 : 6048e5)).toISOString(); });
        return fresh().then(function () { return request('/functions/v1/report-action', { method: 'POST', body: { admin: true, member: m.user_id, a: action, why: why } }); });
      }
    }).then(function (done) { if (done) { toast('Done.'); if (after) after(); else render(); } });
  }
  function actionButtons(m, after) {
    const banned = m.banned || (m.banned_until && new Date(m.banned_until) > new Date());
    return (banned ? ['unban'] : ['suspend', 'ban']).map(function (a) {
      return h('button', { type: 'button', class: 'btn sm' + (a === 'ban' ? ' danger' : a === 'unban' ? ' ghost' : ''), disabled: !canEdit(), tip: ACCOUNT_ACTIONS[a][1], onclick: function () { memberAction(m, a, after); } }, ACCOUNT_ACTIONS[a][0]);
    });
  }
  function loading(promise, draw) {
    const box = h('div', { class: 'stack' }, h('div', { class: 'skeleton' }));
    promise.then(function (data) { const out = draw(data); box.replaceChildren.apply(box, Array.isArray(out) ? out : [out]); },
      function (e) { box.replaceChildren(h('p', { class: 'error', text: e.message })); });
    return box;
  }
  function empty(text) { return h('div', { class: 'card' }, h('div', { class: 'card-body' }, h('p', { class: 'muted', text: text }))); }

  function pageReview() {
    return h('div', { class: 'stack' },
      loading(DEMO ? Promise.resolve(state.demoReview) : rpc('admin_review_queue', { p_limit: 100 }), function (list) {
        if (!list.length) return empty('Nothing waiting. All clear.');
        return list.map(function (it) {
          const m = it.member;
          return h('section', { class: 'card' }, h('div', { class: 'card-body' },
            h('div', { style: 'display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:8px' },
              pill('warn', it.kind === 'bio' ? 'Bio' : 'Photo'), h('b', { text: m.first_name + ' · ' + m.ref }),
              h('span', { class: 'muted small', text: 'flagged ' + ago(it.flagged_at) }),
              it.still_on_profile ? null : pill('off', 'Already changed', 'The member has since changed or removed it.')),
            it.text ? h('p', { style: 'margin-bottom:8px', text: '“' + it.text + '”' }) : h('p', { class: 'muted', style: 'margin-bottom:8px', text: 'Photo files stay private and are not shown here.' }),
            h('p', { class: 'muted small', text: 'Why it was flagged: ' + (it.reason || 'not given') })),
            h('div', { class: 'card-foot' },
              h('button', { type: 'button', class: 'btn sm ghost', disabled: !canEdit(), tip: 'It’s fine, or you have dealt with it. Removes it from this list.', onclick: function () {
                dialog({ title: 'Mark as reviewed?', confirm: 'Mark reviewed', run: function (why) {
                  if (DEMO) return demoWrite('review.done', { item: it.id, member: m.ref, reason: why }, function () { state.demoReview = state.demoReview.filter(function (x) { return x !== it; }); state.overview.safety.moderation_review = Math.max(0, state.overview.safety.moderation_review - 1); });
                  return rpc('admin_mark_reviewed', { p_id: it.id, p_reason: why });
                } }).then(function (done) { if (done) { toast('Reviewed.'); reload(); } });
              } }, 'Mark reviewed'),
              actionButtons({ user_id: m.user_id, ref: m.ref, first_name: m.first_name })));
        });
      }));
  }

  const SIGNS = {
    reported_by_several: ['Reported by 2+ people', 'Different members reported this account.'],
    reported_as_fake: ['Reported as fake or spam', 'At least one report says fake, scam, spam, bot or catfish.'],
    content_removed: ['Content removed', 'A photo or bio was removed by the automatic check in the last 30 days.'],
    contact_details_in_bio: ['Contact details in bio', 'Tried to share a phone number, social account or link. Common with spam.'],
    picks_almost_everyone: ['Picks almost everyone', 'Picked 90%+ of 20 or more people this week. Common with bots and spam.']
  };
  function pageSuspicious() {
    return h('div', { class: 'stack' },
      loading(DEMO ? Promise.resolve(state.demoSuspicious) : rpc('admin_suspicious_members', { p_limit: 100 }), function (list) {
        if (!list.length) return empty('No accounts show warning signs right now.');
        return card(null, null, null, h('div', { class: 'table-wrap' }, h('table', null,
          h('thead', null, h('tr', null, ['Member', 'Warning signs', 'Reports', 'Status', ''].map(function (t) { return h('th', { text: t }); }))),
          h('tbody', null, list.map(function (m) {
            const banned = m.banned;
            return h('tr', null,
              h('td', null, h('div', { style: 'font-weight:600', text: m.first_name + ' · ' + m.ref }), h('div', { class: 'muted small', text: (m.city || '') + ' · joined ' + ago(m.joined_at) })),
              h('td', null, h('div', { class: 'pill-row' }, m.signs.map(function (sg) { const meta = SIGNS[sg] || [sg, '']; return pill('warn', meta[0], meta[1]); }))),
              h('td', { class: 'num', text: n(m.reports) }),
              h('td', null, banned ? pill('bad', 'Banned') : m.paused ? pill('off', 'Hidden') : pill('good', 'Active')),
              h('td', { style: 'text-align:right;white-space:nowrap' }, actionButtons(m)));
          })))));
      }));
  }

  function pageLookup() {
    const input = h('input', { type: 'text', placeholder: 'Exact email, or member reference like 0c44d1e8', 'aria-label': 'Email or member reference', value: state.lookupQuery || '' });
    const results = h('div', { class: 'stack' });
    function search() {
      const q = input.value.trim();
      state.lookupQuery = q;
      if (q.length < 8) { results.replaceChildren(h('p', { class: 'error', text: 'Type a full email or an 8-character member reference.' })); return; }
      results.replaceChildren(loading(DEMO ? Promise.resolve(demoLookup(q)) : rpc('admin_find_member', { p_query: q }), function (list) {
        if (!list.length) return empty('No member found. Check the spelling: it must be exact.');
        return list.map(function (m) {
          const banned = m.banned_until && new Date(m.banned_until) > new Date();
          return card(m.first_name ? m.first_name + ' · ' + m.ref : 'Account ' + m.ref, null,
            banned ? pill('bad', 'Banned until ' + when(m.banned_until)) : m.paused ? pill('off', 'Hidden') : pill('good', 'Active'),
            rows([
              ['Email', m.email, null, 1], ['Where', [m.city, m.country].filter(Boolean).join(', ') || '–'],
              ['Joined', when(m.joined_at)], ['Last signed in', ago(m.last_sign_in)],
              ['Ready to match', m.ready ? 'Yes' : m.has_profile ? 'Not yet' : 'No profile'],
              ['ID check', m.verification || 'Not started', 'Identity verification, when it is turned on.'],
              ['Plan', m.tier === 'premium' ? 'Premium' : 'Free'],
              ['Reports about them', n(m.reports_about) + ' (' + n(m.reports_open) + ' open)', null, m.reports_about > 0],
              ['Reports they made', n(m.reports_made)], ['Matches', n(m.matches)]]),
            actionButtons(m, search));
        });
      }));
    }
    const form = h('form', { style: 'display:flex;gap:8px' }, input, h('button', { type: 'submit', class: 'btn', text: 'Find' }));
    form.addEventListener('submit', function (e) { e.preventDefault(); search(); });
    if (state.lookupQuery) setTimeout(search, 0);
    return h('div', { class: 'stack' },
      card('Find a member', 'Exact matches only, so nobody can browse members from here. Every action is logged.', null, form),
      results);
  }

  function pageSubscriptions() {
    return h('div', { class: 'stack' },
      loading(DEMO ? Promise.resolve(state.demoSubs) : rpc('admin_subscriptions'), function (sb) {
        const src = sb.by_source || {};
        const SRC = { launch_reward: 'Free month (launch reward)', comp: 'Complimentary (given by an admin)', tester: 'Tester', app_store: 'App Store', play_store: 'Google Play', revenuecat: 'In-app purchase', unknown: 'Other' };
        return [
          h('div', { class: 'kpis' },
            kpi('Premium now', n(sb.active), null, 'Members with Premium right now.'),
            kpi('Payment problems', n(sb.payment_problem), 'still have Premium for now', 'The store couldn’t take payment. Premium continues for a short grace period.', sb.payment_problem > 0),
            kpi('Ending in 7 days', n(sb.ending_7d), null, 'Premium that ends in the next 7 days unless renewed.'),
            kpi('Ended', n(sb.ended), null, 'Premium that ran out.'),
            kpi('Revoked', n(sb.revoked), null, 'Taken back by the store, for example after a refund.')),
          card('Where Premium comes from', 'How current Premium members got it.', null, rows(Object.keys(src).length ? Object.keys(src).map(function (k) { return [SRC[k] || k, n(src[k]), null, 1]; }) : [['No Premium members yet', '–']])),
          h('p', { class: 'note', text: 'Revenue and refund amounts appear here once in-app purchases are switched on and connected. Today there is no payment data to show.' })];
      }));
  }

  // Days left or, under a day, hours left.
  function untilText(iso) {
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return 'ended';
    const d = Math.floor(ms / 86400000);
    if (d >= 1) return 'in ' + d + (d === 1 ? ' day' : ' days');
    return 'in ' + Math.max(1, Math.floor(ms / 3600000)) + ' h';
  }
  function dayLabel(days) { return days + (days === 1 ? ' day' : ' days'); }
  function endDate(days) { return new Date(Date.now() + days * 86400000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }

  function pageGrants() {
    if (DEMO) return h('div', { class: 'stack' }, empty('Grants are not available in the demo.'));
    const QUICK = [3, 7, 30, 90];
    let days = 7;
    const email = h('input', { type: 'email', placeholder: 'Their email (they only need an account)', 'aria-label': 'Member email', autocomplete: 'off', spellcheck: 'false' });
    const custom = h('input', { type: 'date', 'aria-label': 'Or pick an end date' });
    const minDate = new Date(Date.now() + 86400000), maxDate = new Date(Date.now() + 365 * 86400000);
    custom.min = minDate.toISOString().slice(0, 10);
    custom.max = maxDate.toISOString().slice(0, 10);
    const summary = h('p', { class: 'muted small' });
    const chips = h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' });
    function paint() {
      chips.replaceChildren.apply(chips, QUICK.map(function (d) {
        const b = h('button', { type: 'button', class: 'btn sm' + (d === days ? '' : ' ghost'), text: dayLabel(d), 'aria-pressed': String(d === days) });
        b.addEventListener('click', function () { days = d; custom.value = ''; paint(); });
        return b;
      }));
      summary.textContent = 'Premium for ' + dayLabel(days) + ', ending ' + endDate(days) + '.';
    }
    custom.addEventListener('change', function () {
      if (!custom.value) return;
      const picked = Math.ceil((new Date(custom.value + 'T23:59:59').getTime() - Date.now()) / 86400000);
      days = Math.min(365, Math.max(1, picked));
      paint();
    });
    paint();
    const give = h('button', { type: 'button', class: 'btn', text: 'Give Premium', disabled: !canEdit() });
    give.addEventListener('click', function () {
      const address = email.value.trim();
      if (address.indexOf('@') < 1) { toast('Type their email first.', true); email.focus(); return; }
      dialog({
        title: 'Give Premium', body: 'This is free Premium that ends by itself. It is never mistaken for a purchase, and a real subscription is never overwritten.',
        diff: [['Member', address], ['For', dayLabel(days)], ['Ends', endDate(days)]], confirm: 'Give Premium',
        run: function (why) { return rpc('admin_grant_premium', { p_email: address, p_days: days, p_reason: why }); }
      }).then(function (done) { if (done) { toast('Premium given.'); email.value = ''; reload(); } });
    });

    const testEmail = h('input', { type: 'email', placeholder: 'Email of an account that has signed up', 'aria-label': 'Test account email', autocomplete: 'off', spellcheck: 'false' });
    const addTest = h('button', { type: 'button', class: 'btn', text: 'Add test account', disabled: !canEdit() });
    addTest.addEventListener('click', function () {
      const address = testEmail.value.trim();
      if (address.indexOf('@') < 1) { toast('Type the account email first.', true); testEmail.focus(); return; }
      dialog({
        title: 'Add test account', body: 'This account gets sample members, free test Premium and the reset in the app. Use it for people and tools that test Halal Mode, never for real members.',
        diff: [['Account', address]], confirm: 'Add',
        run: function (why) { return rpc('admin_set_test_account', { p_email: address, p_enabled: true, p_reason: why }); }
      }).then(function (done) { if (done) { toast('Added.'); testEmail.value = ''; reload(); } });
    });

    return h('div', { class: 'stack' },
      card('Give a member Premium', 'Pick how long. It ends by itself, and every grant is written to the activity log with your reason.', null,
        h('div', { style: 'display:grid;gap:12px' },
          h('label', { class: 'field' }, 'Member', email),
          h('div', { class: 'field' }, h('span', { text: 'How long' }), chips),
          h('label', { class: 'field' }, 'Or choose an end date', h('span', { class: 'hint', text: 'Up to a year from today.' }), custom),
          summary, h('div', null, give))),
      loading(rpc('admin_premium_grants'), function (list) {
        const active = list.filter(function (g) { return g.active; });
        const past = list.filter(function (g) { return !g.active; }).slice(0, 10);
        function row(g) {
          return h('tr', null,
            h('td', null, h('div', { style: 'font-weight:600', text: g.email }), h('div', { class: 'muted small', text: g.reason })),
            h('td', { class: 'nowrap' }, g.active ? [h('div', { text: when(g.ends_at) }), h('div', { class: 'muted small', text: untilText(g.ends_at) })]
              : [h('div', { class: 'muted', text: g.revoked_at ? 'Removed ' + ago(g.revoked_at) : 'Ended ' + ago(g.ends_at) })]),
            h('td', { class: 'muted small', text: g.granted_by || '' }),
            h('td', { style: 'text-align:right' }, g.active ? editBtn('Remove', function () {
              dialog({
                title: 'Remove Premium', body: 'Takes the free Premium away now. A purchase is never removed here.', danger: true,
                diff: [['Member', g.email], ['Was due to end', when(g.ends_at)]], confirm: 'Remove',
                run: function (why) { return rpc('admin_revoke_premium_grant', { p_email: g.email, p_reason: why }); }
              }).then(function (done) { if (done) { toast('Removed.'); reload(); } });
            }) : null));
        }
        const head = h('thead', null, h('tr', null, [h('th', { text: 'Member and reason' }), h('th', { text: 'Ends' }), h('th', { text: 'Given by' }), h('th')]));
        return [
          card('Premium given by admins', 'Running now.', null, active.length
            ? h('div', { class: 'table-wrap' }, h('table', null, head, h('tbody', null, active.map(row))))
            : h('p', { class: 'muted', text: 'None running.' })),
          past.length ? card('Recently ended or removed', null, null, h('div', { class: 'table-wrap' }, h('table', null, head, h('tbody', null, past.map(row))))) : null
        ].filter(Boolean);
      }),
      card('Test mode accounts', 'Admins always have it. Add the accounts that test Halal Mode for you; they get sample members, free test Premium and the reset in the app, and switch them on or off themselves. Nobody else does.', null,
        h('div', { style: 'display:grid;gap:12px' },
          loading(rpc('admin_list_test_accounts'), function (accounts) {
            if (!accounts.length) return h('p', { class: 'muted', text: 'No test accounts yet.' });
            return h('div', { class: 'table-wrap' }, h('table', null,
              h('thead', null, h('tr', null, [h('th', { text: 'Account' }), h('th', { text: 'Test mode' }), h('th')])),
              h('tbody', null, accounts.map(function (a) {
                return h('tr', null,
                  h('td', null, h('span', { text: a.email }), ' ', a.admin ? h('span', { class: 'tag', text: 'Admin' }) : null),
                  h('td', null, a.demo ? pill('good', 'On') : pill('off', 'Off')),
                  h('td', { style: 'text-align:right;white-space:nowrap' },
                    editBtn(a.demo ? 'Turn off' : 'Turn on', function () {
                      dialog({
                        title: a.demo ? 'Turn test mode off' : 'Turn test mode on', body: a.email, confirm: 'Save',
                        run: function (why) { return rpc('admin_set_test_account', { p_email: a.email, p_enabled: !a.demo, p_reason: why }); }
                      }).then(function (done) { if (done) { toast('Saved.'); reload(); } });
                    }), ' ',
                    a.admin ? null : editBtn('Remove', function () {
                      dialog({
                        title: 'Remove test account', body: a.email + ' loses the tester tools and any free test Premium.', danger: true, confirm: 'Remove',
                        run: function (why) { return rpc('admin_remove_test_account', { p_email: a.email, p_reason: why }); }
                      }).then(function (done) { if (done) { toast('Removed.'); reload(); } });
                    })));
              }))));
          }),
          h('label', { class: 'field' }, 'Add an account', testEmail), h('div', null, addTest))));
  }

  function pageHealth() {
    return h('div', { class: 'stack' },
      loading(DEMO ? Promise.resolve(state.demoHealth) : rpc('admin_system_health'), function (hl) {
        const jobs = hl.jobs || [], w = hl.workers || {}, push = hl.push || {}, mail = hl.email || {}, mt = hl.matching || {}, mod = hl.moderation || {};
        const failingJobs = jobs.filter(function (j) { return j.failed_24h > 0; }).length;
        return [
          h('div', { class: 'kpis' },
            kpi('Scheduled jobs failing', n(failingJobs), 'of ' + n(jobs.length) + ' jobs, last 24 h', 'Jobs the scheduler reported as failed.', failingJobs > 0),
            kpi('Worker errors', n(w.failed_24h), 'of ' + n(w.total_24h) + ' calls, last 24 h', 'Background functions (email, moderation, matching, notifications) that answered with an error or timed out.', w.failed_24h > 0),
            kpi('Push failures', n(push.failed), n(push.sent_24h) + ' sent in 24 h', 'Notifications that failed 5 times and were given up on.', push.failed > 0),
            kpi('Email failures', n(mail.failed), n(mail.sent_24h) + ' sent in 24 h', 'Emails that failed many times and were given up on.', mail.failed > 0),
            kpi('Matching run failures', n(mt.failed_7d), 'of ' + n(mt.runs_7d) + ' runs, last 7 days', null, mt.failed_7d > 0)),
          card('Scheduled jobs', 'Everything the database runs on a timer.', null, h('div', { class: 'table-wrap' }, h('table', null,
            h('thead', null, h('tr', null, ['Job', 'Runs', 'Runs (24 h)', 'Failed (24 h)', 'Last run', ''].map(function (t) { return h('th', { text: t }); }))),
            h('tbody', null, jobs.length ? jobs.map(function (j) {
              return h('tr', null, h('td', { class: 'mono', text: j.job }), h('td', { class: 'mono muted', text: j.schedule }),
                h('td', { class: 'num', text: n(j.runs_24h) }), h('td', { class: 'num', text: n(j.failed_24h) }),
                h('td', { class: 'nowrap muted', text: ago(j.last_run) }),
                h('td', null, !j.active ? pill('off', 'Paused') : j.failed_24h ? pill('bad', 'Failing', j.last_error || '') : pill('good', 'OK')));
            }) : h('tr', null, h('td', { colspan: '6', class: 'muted', text: 'No scheduled jobs found.' })))))),
          h('div', { class: 'grid cols-2' },
            card('Recent worker errors', 'The last few errors from background functions, newest first.', null, (w.recent_failures || []).length ? h('ul', { class: 'list' }, w.recent_failures.map(function (f) {
              return h('li', { style: 'display:block' }, h('div', { style: 'display:flex;justify-content:space-between;gap:8px' }, h('b', { text: f.timed_out ? 'Timed out' : 'Error ' + (f.status || '') }), h('span', { class: 'muted small', text: when(f.at) })),
                h('div', { class: 'muted small mono', text: f.message || '' }));
            })) : h('p', { class: 'muted', text: 'No errors in the last 24 hours.' })),
            card('Queues', 'Work waiting in the background.', null, rows([
              ['Push notifications waiting', n(push.waiting)], ['Emails waiting', n(mail.waiting)],
              ['Photo and bio checks waiting', n(mod.waiting)], ['Photo and bio checks stuck', n(mod.stuck), 'Failed 4 times. Check worker errors.', mod.stuck > 0],
              ['Last push error', push.last_error || 'none'], ['Last email error', mail.last_error || 'none'], ['Last matching error', mt.last_error || 'none']]))),
          h('p', { class: 'note', text: 'Read from the database’s own records. Chat errors and hosting outages are not recorded there, so they don’t appear here.' })];
      }));
  }

  // ---------------------------------------------------------------- demo
  function demoWrite(action, detail, apply) {
    apply();
    state.overview.audit.unshift({ at: new Date().toISOString(), action: action, actor: 'Demo owner', detail: detail });
    return Promise.resolve({ changed: true });
  }
  function demoSignal(k, v, why) {
    const m = state.overview.signals.metrics.filter(function (x) { return x.key === k; })[0];
    return demoWrite('matching_metric.set', { metric: k, before: { enabled: m.enabled, weight: m.weight }, after: { enabled: v.enabled, weight: v.weight }, reason: why }, function () {
      m.enabled = v.enabled; m.weight = v.weight;
      if (k === 'luna_presentation') state.overview.luna.enabled = v.enabled;
      state.overview.signals.config_version += 1; state.overview.signals.config_updated_at = new Date().toISOString();
    });
  }
  function demoBackfill(limit) {
    return demoWrite('luna.backfill', { requested: limit, queued: limit }, function () { state.overview.luna.queued += limit; })
      .then(function () { return { queued: limit }; });
  }
  function sampleOverview() {
    const now = Date.now(), day = 86400000, daily = [];
    const counts = [182, 214, 199, 260, 311, 287, 342, 401, 377, 452, 498, 530, 611, 248];
    for (let i = 13; i >= 0; i--) daily.push({ day: new Date(now - i * day).toISOString().slice(0, 10), count: counts[13 - i] });
    const iso = function (ms) { return new Date(now - ms).toISOString(); };
    return {
      generated_at: iso(0), role: 'owner',
      waitlist: { total: 8412, last_24h: 248, last_7d: 3117, first_10000_left: 1588, daily: daily,
        top_cities: [['London', 2140], ['Birmingham', 911], ['Manchester', 702], ['Bradford', 488], ['Leicester', 431], ['Dubai', 377], ['Toronto', 302], ['Paris', 260], ['Leeds', 241], ['Glasgow', 198]].map(function (c) { return { city: c[0], count: c[1] }; }),
        age_ranges: { '18-24': 2311, '25-29': 3020, '30-34': 1844, '35-39': 731, '40-49': 402, '50+': 104 } },
      referrals: { waitlist_attributed: 1920, waitlist_counted: 0, counted_last_7d: 0, app_claimed: 64, app_counted: 21 },
      members: { total: 312, joined_7d: 118, onboarded: 271, ready_for_matching: 204, women: 149, men: 163, premium: 9, launch_reward_active: 0 },
      connections: { total: 38, last_7d: 22, open: 31 },
      safety: { open_reports: 2, reports_7d: 3, moderation_pending: 4, moderation_stuck: 0, moderation_review: 3, moderation_removed_7d: 1 },
      mail: { pending: 37, failing: 0, sent_24h: 96, daily_limit: 100, oldest_pending_at: iso(3 * 3600000) },
      matching: {
        runs: [0, 1, 2, 3, 4].map(function (i) {
          return { started_at: iso(i * day + 600000), finished_at: iso(i * day + 540000), mode: i === 2 ? 'shadow' : 'live', algorithm: 'reciprocal-v1',
            eligible: 204 - i * 14, pairs: 88 - i * 6, rounds: 198 - i * 13, failed: false, breaches: i === 3 ? 1 : 0 };
        }),
        fairness: { members: 204, waiting_3_plus_rounds: 9, avg_exposures: 4.6, low_score_members: 31, low_score_waiting_3_plus: 2 }
      },
      signals: { config_version: 3, config_updated_at: iso(2 * day),
        metrics: [['selection_rate', true, 0.4], ['first_choice_rate', true, 0.2], ['profile_attention', true, 0.05], ['bio_attention', true, 0.1],
          ['photo_attention', true, 0.15], ['mutual_first_choice', true, 0.15], ['luna_presentation', false, 0.1], ['reception_similarity', true, 0.08]]
          .map(function (x) { return { key: x[0], enabled: x[1], weight: x[2], updated_at: iso(2 * day) }; }),
        distribution: [[0, 0, 0, 0], [1, 0, 1, 0], [2, 2, 4, 1], [3, 6, 11, 5], [4, 41, 22, 9], [5, 96, 25, 11], [6, 18, 19, 8], [7, 4, 9, 4], [8, 1, 3, 1], [9, 0, 0, 0]]
          .map(function (b) { return { band: b[0], low: b[1], medium: b[2], high: b[3] }; }),
        estimates: 312, avg_confidence: 0.284, last_computed_at: iso(1200000), observations_30d: 5821 },
      luna: { enabled: false, queued: 0, failed: 0, analyzed: 0, analyzed_7d: 0 },
      audit: [
        { at: iso(3600000), action: 'admin.sign_in', actor: 'Demo owner', detail: {} },
        { at: iso(2 * day), action: 'matching_metric.set', actor: 'Demo owner', detail: { metric: 'bio_attention', before: { enabled: true, weight: 0.12 }, after: { enabled: true, weight: 0.1 }, reason: 'Long bios were counting too much' } },
        { at: iso(3 * day), action: 'flag.set', actor: 'Demo owner', detail: { flag: 'push_notifications', before: { enabled: false, rollout: 0 }, after: { enabled: true, rollout: 100 }, reason: 'Notifications ready for everyone' } },
        { at: iso(4 * day), action: 'team.add', actor: 'Demo owner', detail: { name: 'Aisha', role: 'viewer', reason: 'Support lead needs to see the numbers' } }
      ]
    };
  }
  function sampleReports() {
    const iso = function (ms) { return new Date(Date.now() - ms).toISOString(); };
    return [
      { id: 'a1b2c3d4-0000', created_at: iso(5400000), resolved_at: null, reason: 'harassment', detail: 'Kept messaging after I said I was not interested, and was rude about it.',
        reporter: { first_name: 'Maryam', ref: '7f3a91c2' }, subject: { first_name: 'Yusuf', ref: '0c44d1e8', city: 'Leeds', country: 'United Kingdom', paused: false, joined_at: iso(40 * 86400000), reports_total: 3, reports_open: 2 } },
      { id: 'e5f6a7b8-0000', created_at: iso(26 * 3600000), resolved_at: null, reason: 'fake_profile', detail: 'Photos look like a model from Instagram.',
        reporter: { first_name: 'Bilal', ref: '2b8e44f0' }, subject: { first_name: 'Sara', ref: '9d10a7b3', city: 'Birmingham', country: 'United Kingdom', paused: false, joined_at: iso(3 * 86400000), reports_total: 1, reports_open: 1 } },
      { id: 'c9d0e1f2-0000', created_at: iso(5 * 86400000), resolved_at: iso(4 * 86400000), reason: 'inappropriate_photo', detail: null,
        reporter: { first_name: 'Hana', ref: '5e6f7a8b' }, subject: { first_name: 'Omar', ref: '1a2b3c4d', city: 'London', country: 'United Kingdom', paused: true, joined_at: iso(60 * 86400000), reports_total: 2, reports_open: 0 } }
    ];
  }
  function sampleSignups(days) {
    const out = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const t = (days - i) / days;
      out.push({ day: d, waitlist: Math.round(60 + 520 * t * t + 40 * Math.sin(i)), members: Math.round(4 + 22 * t + 3 * Math.cos(i)) });
    }
    return { days: days, before_waitlist: Math.max(0, 8412 - out.reduce(function (a, r) { return a + r.waitlist; }, 0)), before_members: Math.max(0, 312 - out.reduce(function (a, r) { return a + r.members; }, 0)), rows: out };
  }
  function sampleMatchStats(days) {
    const f = days / 30;
    const daily = [];
    for (let i = Math.min(days, 30) - 1; i >= 0; i--) daily.push({ day: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10), count: Math.max(0, Math.round(1 + (30 - i) / 8 + Math.sin(i) * 1.5)) });
    return {
      days: days, shown: Math.round(6120 * f), picks: Math.round(1480 * f), matches: Math.round(41 * f), one_sided_picks: Math.round(1398 * f),
      members_shown: 296, picked_by_nobody: 38, picked_not_matched: 151, members_matched: Math.min(220, Math.round(70 * f)),
      by_gender: { female: { shown: Math.round(2900 * f), picked: Math.round(910 * f), members: 141, matched: Math.round(36 * f) }, male: { shown: Math.round(3220 * f), picked: Math.round(570 * f), members: 155, matched: Math.round(34 * f) } },
      waiting: { members: 204, r0_3: 58, r4_7: 71, r8_13: 52, r14: 23 }, daily_matches: daily
    };
  }
  function sampleMatcher() {
    return { version: 9, activated_at: new Date(Date.now() - 6 * 86400000).toISOString(), settings: [
      { key: 'boost_cap', value: 0.25, min: 0, max: 0.5, whole: false }, { key: 'exposure_boost_weight', value: 0.3, min: 0, max: 0.6, whole: false },
      { key: 'exposure_window_rounds', value: 7, min: 3, max: 30, whole: true }, { key: 'max_pair_appearances', value: 3, min: 1, max: 10, whole: true },
      { key: 'min_reciprocal_score', value: 0.15, min: 0, max: 0.5, whole: false }, { key: 'no_match_boost_weight', value: 0.2, min: 0, max: 0.6, whole: false },
      { key: 'no_match_rounds_full', value: 8, min: 2, max: 30, whole: true }, { key: 'repeat_cooldown_days', value: 14, min: 1, max: 90, whole: true }] };
  }
  function sampleTrust() {
    const iso = function (ms) { return new Date(Date.now() - ms).toISOString(); };
    const yusuf = { user_id: 'u-yusuf', ref: '0c44d1e8', first_name: 'Yusuf', city: 'Leeds', joined_at: iso(40 * 864e5), paused: false, banned: false, reports: 3, signs: ['reported_by_several', 'contact_details_in_bio'] };
    return {
      demoReview: [
        { id: 1, kind: 'bio', reason: 'Looks like contact details.', flagged_at: iso(2 * 36e5), text: 'Serious only. Add me on insta @yusuf.real, I don’t check this app much', still_on_profile: true, member: { user_id: 'u-yusuf', first_name: 'Yusuf', ref: '0c44d1e8' } },
        { id: 2, kind: 'photo', reason: 'Borderline: sexual 41%', flagged_at: iso(9 * 36e5), still_on_profile: true, member: { user_id: 'u-lina', first_name: 'Lina', ref: '5b2e90aa' } },
        { id: 3, kind: 'bio', reason: 'Borderline: harassment 38%', flagged_at: iso(30 * 36e5), text: 'Not interested in time wasters. If you can’t reply properly don’t bother.', still_on_profile: false, member: { user_id: 'u-omar', first_name: 'Omar', ref: '1a2b3c4d' } }
      ],
      demoSuspicious: [
        yusuf,
        { user_id: 'u-sara', ref: '9d10a7b3', first_name: 'Sara', city: 'Birmingham', joined_at: iso(3 * 864e5), paused: false, banned: false, reports: 1, signs: ['picks_almost_everyone', 'reported_as_fake'] },
        { user_id: 'u-adam', ref: '77ac01f2', first_name: 'Adam', city: 'London', joined_at: iso(864e5), paused: false, banned: false, reports: 0, signs: ['picks_almost_everyone'] }
      ],
      demoSubs: { active: 9, payment_problem: 1, ended: 4, revoked: 1, ending_7d: 2, changed_30d: 11, by_source: { tester: 6, launch_reward: 3 } },
      demoHealth: {
        jobs: [
          { job: 'halal-mode-generate-round', schedule: '0 4 * * *', active: true, runs_24h: 1, failed_24h: 0, last_run: iso(5 * 36e5) },
          { job: 'halal-mode-launch-rewards', schedule: '*/10 * * * *', active: true, runs_24h: 144, failed_24h: 0, last_run: iso(4 * 6e4) },
          { job: 'halal-mode-moderate', schedule: '*/2 * * * *', active: true, runs_24h: 720, failed_24h: 0, last_run: iso(6e4) },
          { job: 'halal-mode-prune-matching-engagement', schedule: '17 3 * * *', active: true, runs_24h: 1, failed_24h: 0, last_run: iso(6 * 36e5) },
          { job: 'halal-mode-send-mail', schedule: '* * * * *', active: true, runs_24h: 1440, failed_24h: 2, last_run: iso(3e4), last_error: 'connection reset' },
          { job: 'halal-mode-send-notifications', schedule: '* * * * *', active: true, runs_24h: 1440, failed_24h: 0, last_run: iso(3e4) }
        ],
        workers: { total_24h: 3742, ok_24h: 3739, failed_24h: 3, recent_failures: [
          { at: iso(2 * 36e5), status: 429, timed_out: false, message: 'rate limit exceeded' }, { at: iso(7 * 36e5), status: null, timed_out: true, message: 'Timeout of 120000 ms reached' }] },
        push: { sent_24h: 312, waiting: 4, failed: 1, failed_24h: 1, last_error: 'DeviceNotRegistered' },
        email: { sent_24h: 96, waiting: 37, failed: 0, last_error: null },
        matching: { runs_7d: 8, failed_7d: 0, last_error: null },
        moderation: { waiting: 4, stuck: 0 }
      }
    };
  }
  function demoLookup(q) {
    const iso = function (ms) { return new Date(Date.now() - ms).toISOString(); };
    if (q.toLowerCase().indexOf('0c44d1e8') < 0 && q.indexOf('@') < 0) return [];
    return [{ user_id: 'u-yusuf', ref: '0c44d1e8', email: q.indexOf('@') >= 0 ? q : 'yusuf@example.com', first_name: 'Yusuf', city: 'Leeds', country: 'United Kingdom',
      joined_at: iso(40 * 864e5), last_sign_in: iso(3 * 36e5), has_profile: true, ready: true, paused: false, banned_until: null, tier: 'free', verification: null,
      reports_about: 3, reports_open: 2, reports_made: 0, matches: 2 }];
  }
  function sampleSettings() {
    const iso = function (ms) { return new Date(Date.now() - ms).toISOString(); };
    return {
      role: 'owner', referral_link_base: 'https://halalmo.de/?ref=', mail_daily_limit: 100,
      flags: [['reciprocal_matching_v1', true, 100, 0], ['push_notifications', true, 100, 0], ['premium_purchases', false, 0, 3], ['identity_verification', false, 0, 0],
        ['in_chat_voice_notes', false, 0, 0], ['live_calling', false, 0, 0], ['controlled_beta', false, 0, 0], ['demo_introductions', true, 100, 0], ['tester_tools', true, 0, 6]]
        .map(function (f, i) { return { key: f[0], enabled: f[1], rollout: f[2], members: f[3], updated_at: iso((i + 1) * 86400000 * 3) }; }),
      team: [
        { user_id: 'a', email: 'owner@halalmo.de', note: 'Demo owner', role: 'owner', added_at: iso(20 * 86400000), you: true, mfa_factors: 1, last_sign_in: iso(3600000) },
        { user_id: 'b', email: 'aisha@halalmo.de', note: 'Aisha', role: 'viewer', added_at: iso(4 * 86400000), you: false, mfa_factors: 1, last_sign_in: iso(2 * 86400000) }
      ],
      sign_ins: [{ at: iso(3600000), actor: 'Demo owner' }, { at: iso(2 * 86400000), actor: 'Aisha' }, { at: iso(3 * 86400000), actor: 'Demo owner' }]
    };
  }

  // ---------------------------------------------------------------- boot
  if (!DEMO && location.hash.indexOf('access_token=') >= 0) {
    // Back from Google: Supabase puts the session in the URL fragment.
    const p = new URLSearchParams(location.hash.slice(1));
    save(fromTokens({ access_token: p.get('access_token'), refresh_token: p.get('refresh_token'), expires_in: p.get('expires_in') }));
    history.replaceState(null, '', location.pathname);
  } else if (!DEMO && /(^|[#&])error=/.test(location.hash)) {
    const q = new URLSearchParams(location.hash.slice(1));
    history.replaceState(null, '', location.pathname);
    showSignIn(q.get('error_description') || 'Sign-in didn’t finish. Please try again.');
    return;
  }
  if (new URLSearchParams(location.search).get('preview') === 'signin') showSignIn();
  else start();
})();
