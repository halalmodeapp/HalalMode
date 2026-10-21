// halalmo.de/admin: the Halal Mode operator panel. Plain browser JavaScript.
//
// Security model (the page itself is not the boundary):
//   * Sign-in is Supabase Auth (Google) plus a TOTP authenticator code.
//   * Every RPC re-checks, on the server, the admin list and two-factor.
//   * Changes also need a code entered in the last 15 minutes ("step-up"),
//     are rate-limited, and are written to an append-only audit log.
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

  const METRICS = {
    selection_rate: ['Selection rate', 'Chosen introductions out of times shown, from server records.'],
    first_choice_rate: ['First choice', 'How often this member is ranked first among someone’s choices.'],
    mutual_first_choice: ['Mutual first choice', 'History of being one another’s first choice.'],
    bio_attention: ['Bio reading time', 'Relative bio reading time within the viewer’s round.'],
    photo_attention: ['Photo viewing time', 'Relative photo time, averaged per profile per round.'],
    profile_attention: ['Profile reading time', 'Relative overall profile time within the viewer’s round.'],
    luna_presentation: ['Luna photo presentation', 'Clarity, lighting, framing and background only. Costs API usage.'],
    reception_similarity: ['Reception similarity', 'Pair-level soft preference, not part of the individual estimate. Capped at 0.20.']
  };
  const METRIC_ORDER = ['selection_rate', 'first_choice_rate', 'mutual_first_choice', 'bio_attention', 'photo_attention', 'profile_attention', 'luna_presentation', 'reception_similarity'];
  const FLAGS = {
    reciprocal_matching_v1: 'The reciprocal matcher. Changes who is introduced to whom.',
    push_notifications: 'Push notifications to members who allowed them.',
    premium_purchases: 'In-app Premium purchases.',
    identity_verification: 'Identity verification flow.',
    in_chat_voice_notes: 'Voice notes in chat.',
    live_calling: 'Live calling between connections.',
    controlled_beta: 'Limits the app to the controlled beta group.',
    demo_introductions: 'Sample members in rounds, for people who opted in.',
    tester_tools: 'Tester tools in the app for listed testers.'
  };

  // Paths drawn on a 24-unit grid with round strokes.
  const ICONS = {
    overview: 'M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 9h8V3h-8z',
    growth: 'M3 17l6-6 4 4 8-8M15 7h6v6',
    members: 'M16 20v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 10a4 4 0 100-8 4 4 0 000 8zM22 20v-2a4 4 0 00-3-3.9M16 2.1a4 4 0 010 7.8',
    matching: 'M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 000-7.8z',
    scoring: 'M12 20V10M18 20V4M6 20v-4',
    luna: 'M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z',
    safety: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    flags: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7',
    settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
    team: 'M12 11a4 4 0 100-8 4 4 0 000 8zM4 21v-1a6 6 0 0112 0v1M18 8v6M21 11h-6',
    audit: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M8 13h8M8 17h5',
    refresh: 'M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0114.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0020.5 15',
    menu: 'M3 6h18M3 12h18M3 18h18',
    sun: 'M12 17a5 5 0 100-10 5 5 0 000 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
    lock: 'M5 11h14v10H5zM8 11V7a4 4 0 018 0v4',
    mail: 'M4 4h16v16H4zM22 6l-10 7L2 6'
  };

  const PAGES = [
    { group: 'Monitor' },
    { id: 'overview', label: 'Overview', sub: 'How Halal Mode is doing right now' },
    { id: 'growth', label: 'Growth', sub: 'Waitlist, cities and referrals' },
    { id: 'members', label: 'Members', sub: 'Accounts, readiness and connections' },
    { id: 'matching', label: 'Matching', sub: 'Rounds and fairness of exposure' },
    { id: 'safety', label: 'Safety', sub: 'Reports and content moderation', badge: function (d) { return d && d.safety.open_reports; } },
    { id: 'operations', label: 'Operations', icon: 'mail', sub: 'Email delivery and background jobs' },
    { group: 'Configure' },
    { id: 'scoring', label: 'Scoring', sub: 'The private reception estimate and its signals' },
    { id: 'luna', label: 'Luna', sub: 'Optional photo-presentation analysis' },
    { id: 'flags', label: 'Feature flags', sub: 'Turn features on, off or roll them out gradually' },
    { id: 'settings', label: 'Settings', sub: 'Referrals, email and security' },
    { group: 'Govern' },
    { id: 'team', label: 'Team & access', sub: 'Who can use this panel, and how' },
    { id: 'audit', label: 'Audit log', sub: 'Every change, who made it and why' }
  ];

  const state = { session: null, me: null, overview: null, settings: null, page: 'overview', navOpen: false, timer: null, lastActive: Date.now(), lastLoad: 0, auditCategory: '' };
  const root = document.getElementById('root');

  // ---------------------------------------------------------------- DOM kit
  function h(tag, attrs) {
    const el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      const v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'text') el.textContent = v;
      else if (k === 'class') el.className = v;
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
  function icon(name) {
    return s('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, s('path', { d: ICONS[name] || ICONS.overview }));
  }
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
    setTimeout(function () { t.remove(); }, 5000);
  }

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
  // Verifies a TOTP code and swaps in the new, freshly stepped-up session.
  function verifyCode(code) {
    return request('/auth/v1/user').then(function (user) {
      const factor = verifiedFactor(user);
      if (!factor) throw new Error('No authenticator is set up for this account.');
      return request('/auth/v1/factors/' + factor.id + '/challenge', { method: 'POST', body: {} })
        .then(function (ch) { return request('/auth/v1/factors/' + factor.id + '/verify', { method: 'POST', body: { challenge_id: ch.id, code: code } }); });
    }).then(function (t) { save(fromTokens(t)); });
  }

  // ---------------------------------------------------------------- gate screens
  function gate(title, body, slot, error) {
    const err = h('p', { class: 'error', role: 'alert', text: error || '' });
    root.replaceChildren(h('div', { class: 'gate-wrap' },
      h('div', { class: 'card gate' },
        h('img', { class: 'logo', src: '/logo.svg', alt: 'Halal Mode' }),
        h('h1', { text: title }), h('p', { class: 'muted', text: body }),
        h('div', { class: 'slot' }, slot), err,
        h('div', { class: 'security' }, icon('lock'), 'Admins only · two-factor required · every change is logged'))));
    return err;
  }
  function showSignIn(message) {
    gate('Admin sign-in', 'Use the Google account on the Halal Mode admin list.',
      h('button', { type: 'button', class: 'btn google', onclick: signIn }, 'Continue with Google'), message);
  }
  function showMfa() {
    request('/auth/v1/user').then(function (user) {
      const factor = verifiedFactor(user);
      if (factor) return codeScreen(factor.id, null);
      // Unverified leftovers from an abandoned setup would block a new one.
      const stale = (user.factors || []).filter(function (f) { return f.factor_type === 'totp' && f.status !== 'verified'; });
      return Promise.all(stale.map(function (f) { return request('/auth/v1/factors/' + f.id, { method: 'DELETE' }).catch(function () { return null; }); }))
        .then(function () { return request('/auth/v1/factors', { method: 'POST', body: { factor_type: 'totp', friendly_name: 'Halal Mode admin' } }); })
        .then(function (enrolled) { codeScreen(enrolled.id, enrolled.totp); });
    }).catch(function (e) { save(null); showSignIn(e.message); });
  }
  function codeScreen(factorId, totp) {
    const input = h('input', { type: 'text', class: 'code', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '6', 'aria-label': 'Six-digit code' });
    const button = h('button', { type: 'submit', class: 'btn', style: 'width:100%', text: 'Verify' });
    const form = h('form', { style: 'display:grid;gap:12px;width:100%' }, input, button);
    const err = gate(totp ? 'Set up two-factor' : 'Two-factor sign-in',
      totp ? 'Scan with an authenticator app (1Password, Google Authenticator, Microsoft Authenticator), then enter the code.' : 'Enter the six-digit code from your authenticator app.',
      [totp && h('img', { class: 'qr', src: totp.qr_code, alt: 'Authenticator QR code' }), totp && h('code', { text: totp.secret }), form]);
    input.focus();
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      button.disabled = true; err.textContent = '';
      request('/auth/v1/factors/' + factorId + '/challenge', { method: 'POST', body: {} })
        .then(function (ch) { return request('/auth/v1/factors/' + factorId + '/verify', { method: 'POST', body: { challenge_id: ch.id, code: input.value.replace(/\D/g, '') } }); })
        .then(function (t) { save(fromTokens(t)); return rpc('admin_record_sign_in').catch(function () { return null; }); })
        .then(start)
        .catch(function (e) { err.textContent = e.message || 'That code did not work.'; button.disabled = false; input.select(); });
    });
  }

  // ---------------------------------------------------------------- dialogs
  // Every change goes through one dialog: what changes, a reason for the
  // audit log and, for risky changes, a typed confirmation. Step-up is
  // handled here, so no change can skip it.
  function dialog(opts) {
    return new Promise(function (resolve) {
      const err = h('p', { class: 'error', role: 'alert' });
      const reason = opts.reason === false ? null : h('input', { type: 'text', maxlength: '300', placeholder: 'e.g. Rolling out to testers first' });
      const typed = opts.typed ? h('input', { type: 'text', autocomplete: 'off', spellcheck: 'false', placeholder: opts.typed }) : null;
      const ok = h('button', { type: 'submit', class: 'btn' + (opts.danger ? ' danger' : ''), text: opts.confirm || 'Save change' });
      const cancel = h('button', { type: 'button', class: 'btn ghost', text: 'Cancel' });
      const form = h('form', { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.title },
        h('div', { class: 'd-head' }, h('h2', { text: opts.title }), opts.body && h('p', { text: opts.body })),
        h('div', { class: 'd-body' },
          opts.diff && h('dl', { class: 'diff' }, opts.diff.map(function (row) { return [h('dt', { text: row[0] }), h('dd', { text: row[1] })]; })),
          opts.extra,
          reason && h('label', { class: 'field' }, 'Reason', h('span', { class: 'hint', text: 'Saved in the audit log with your name.' }), reason),
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
        if (reason && why.length < 3) { err.textContent = 'Add a short reason.'; reason.focus(); return; }
        if (typed && typed.value !== opts.typed) { err.textContent = 'Type ' + opts.typed + ' exactly.'; typed.focus(); return; }
        ok.disabled = true;
        const run = function () { return opts.run(why, typed && typed.value); };
        (opts.local ? run() : withStepUp(run))
          .then(function (res) { close(res || true); })
          .catch(function (ex) { err.textContent = ex.message; ok.disabled = false; });
      });
      document.body.appendChild(back);
      (reason || typed || ok).focus();
    });
  }

  function stepUpDialog() {
    return new Promise(function (resolve, reject) {
      const input = h('input', { type: 'text', class: 'code', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '6', 'aria-label': 'Six-digit code' });
      const err = h('p', { class: 'error', role: 'alert' });
      const ok = h('button', { type: 'submit', class: 'btn', text: 'Confirm' });
      const cancel = h('button', { type: 'button', class: 'btn ghost', text: 'Cancel' });
      const form = h('form', { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Confirm it’s you' },
        h('div', { class: 'd-head' }, h('h2', { text: 'Confirm it’s you' }), h('p', { text: 'Enter a code from your authenticator app. Changes then stay unlocked for 15 minutes.' })),
        h('div', { class: 'd-body' }, input, err), h('div', { class: 'd-foot' }, cancel, ok));
      const back = h('div', { class: 'backdrop step-up', style: 'z-index:25' }, form);
      cancel.addEventListener('click', function () { back.remove(); reject(new Error('Not confirmed.')); });
      form.addEventListener('submit', function (e) {
        e.preventDefault(); ok.disabled = true; err.textContent = '';
        (DEMO ? Promise.resolve() : verifyCode(input.value.replace(/\D/g, '')))
          .then(refreshSession)
          .then(function () { back.remove(); updateLock(); resolve(); })
          .catch(function (ex) { err.textContent = ex.message || 'That code did not work.'; ok.disabled = false; input.select(); });
      });
      document.body.appendChild(back);
      input.focus();
    });
  }
  function needsStepUp() { return !state.me || !(state.me.step_up_until > Date.now()); }
  function withStepUp(action) {
    const go = function () {
      return action().catch(function (e) {
        if (e.hint === 'step_up') return stepUpDialog().then(action);
        throw e;
      });
    };
    return needsStepUp() ? stepUpDialog().then(go) : go();
  }

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
      state.overview = sampleOverview(); state.settings = sampleSettings();
      state.loadedAt = new Date().toISOString();
      return boot();
    }
    state.session = state.session || load();
    if (!state.session) return showSignIn();
    refreshSession().then(function (me) {
      if (!me.admin) {
        gate('Not an administrator', (claims().email || 'This account') + ' is not on the admin list. Ask an owner to add you.',
          h('button', { type: 'button', class: 'btn ghost', onclick: function () { signOut(); } }, 'Sign out'));
        return;
      }
      if (!me.mfa) return showMfa();
      return loadData().then(boot);
    }).catch(function (e) {
      save(null);
      showSignIn(e.status === 401 ? 'Your session ended. Sign in again.' : e.message);
    });
  }
  function loadData() {
    if (DEMO) return Promise.resolve();
    return Promise.all([rpc('admin_overview'), rpc('admin_settings'), refreshSession()])
      .then(function (r) { state.overview = r[0]; state.settings = r[1]; state.loadedAt = new Date().toISOString(); state.lastLoad = Date.now(); });
  }
  function reload() {
    return loadData().then(render).catch(function (e) {
      if (e.status === 401) return signOut(null, 'Your session ended. Sign in again.');
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
      if (!DEMO && Date.now() - state.lastActive > IDLE_MS) return signOut(null, 'Signed out after 15 minutes without activity.');
      updateLock();
      // Refresh the numbers in the background, but never under an open dialog.
      if (!DEMO && !document.hidden && !document.querySelector('.backdrop') && Date.now() - state.lastLoad > REFRESH_MS) reload();
    }, 15000);
    render();
  }
  function pageFromHash() {
    const id = location.hash.replace(/^#\/?/, '');
    return PAGES.some(function (p) { return p.id === id; }) ? id : 'overview';
  }

  // ---------------------------------------------------------------- shell
  let lockEl = null;
  function updateLock() {
    if (!lockEl || !state.me) return;
    const open = state.me.step_up_until > Date.now();
    const left = Math.max(1, Math.round((state.me.step_up_until - Date.now()) / 60000));
    lockEl.className = 'lock' + (open ? ' open' : '');
    lockEl.replaceChildren(h('span', { class: 'dot' }),
      h('span', null, state.me.role !== 'owner' ? 'Read-only access' : open ? 'Changes unlocked · ' + left + ' min' : 'Changes locked · unlock'));
  }
  function renderShell(content) {
    const page = PAGES.filter(function (p) { return p.id === state.page; })[0];
    const me = state.me || {};
    const email = DEMO ? 'owner@halalmo.de' : (claims().email || '');
    const nav = h('nav', { 'aria-label': 'Admin sections' }, PAGES.map(function (p) {
      if (p.group) return h('h3', { class: 'nav-group', text: p.group });
      const count = p.badge && p.badge(state.overview);
      return h('ul', { class: 'nav' }, h('li', null, h('a', { href: '#/' + p.id, 'aria-current': p.id === state.page ? 'page' : null },
        icon(p.icon || p.id), p.label, count ? h('span', { class: 'count', text: count }) : null)));
    }));
    lockEl = h('button', { type: 'button', class: 'lock', onclick: function () {
      if (me.role !== 'owner') return;
      if (state.me.step_up_until > Date.now()) { toast('Changes are already unlocked.'); return; }
      stepUpDialog().then(function () { toast('Changes unlocked for 15 minutes.'); }, function () { return null; });
    } });
    updateLock();
    const side = h('aside', { class: 'side' },
      h('a', { class: 'side-brand', href: '#/overview' }, h('img', { class: 'logo', src: '/logo.svg', alt: 'Halal Mode' }), h('sup', { text: '™' }), h('span', { class: 'badge-admin', text: 'Admin' })),
      nav,
      h('div', { class: 'side-foot' },
        lockEl,
        h('div', { class: 'me' }, h('div', { class: 'avatar', text: (me.name || email || '?').slice(0, 1).toUpperCase() }),
          h('div', { style: 'min-width:0' }, h('div', { class: 'me-name', text: me.name || email }), h('div', { class: 'me-role', text: me.role === 'owner' ? 'Owner' : 'Viewer (read-only)' }))),
        h('button', { type: 'button', class: 'btn ghost sm', onclick: function () { signOut(); } }, 'Sign out')));
    const shell = h('div', { class: 'shell' + (state.navOpen ? ' nav-open' : '') });
    const top = h('header', { class: 'topbar' },
      h('button', { type: 'button', class: 'icon-btn menu-btn', 'aria-label': 'Open menu', onclick: function () { state.navOpen = !state.navOpen; shell.classList.toggle('nav-open', state.navOpen); } }, icon('menu')),
      h('div', { class: 'title' }, h('h1', { text: page.label }), h('p', { text: page.sub })),
      h('span', { class: 'spacer' }),
      h('span', { class: 'env' + (DEMO ? ' demo' : ''), text: DEMO ? 'Demo data' : 'Production' }),
      h('span', { class: 'muted small updated', text: 'Updated ' + ago(state.loadedAt) }),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Switch theme', title: 'Theme', onclick: cycleTheme }, icon('sun')),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Refresh', title: 'Refresh', onclick: function () { reload().then(function () { toast('Up to date.'); }); } }, icon('refresh')));
    add(shell, [side, h('div', { class: 'main' }, top, h('main', { class: 'content', id: 'content' }, content))]);
    shell.addEventListener('click', function (e) { if (state.navOpen && e.target === shell) { state.navOpen = false; shell.classList.remove('nav-open'); } });
    root.replaceChildren(shell);
  }
  function render() {
    const fn = { overview: pageOverview, growth: pageGrowth, members: pageMembers, matching: pageMatching, safety: pageSafety, operations: pageOperations, scoring: pageScoring, luna: pageLuna, flags: pageFlags, settings: pageSettings, team: pageTeam, audit: pageAudit }[state.page];
    renderShell(fn());
  }
  function canEdit() { return !!state.me && state.me.role === 'owner'; }

  // ---------------------------------------------------------------- building blocks
  function card(title, aside, body, foot) {
    return h('section', { class: 'card' },
      title && h('div', { class: 'card-head' }, h('h2', { text: title }), aside),
      h('div', { class: 'card-body' }, body), foot && h('div', { class: 'card-foot' }, foot));
  }
  function kpi(label, value, sub, alert) {
    return h('div', { class: 'card kpi' + (alert ? ' alert' : '') }, h('div', { class: 'label', text: label }), h('div', { class: 'value num', text: value }), sub && h('div', { class: 'sub', text: sub }));
  }
  function rows(pairs) {
    return h('ul', { class: 'list' }, pairs.map(function (p) { return h('li', null, h('span', { class: p[2] ? '' : 'muted', text: p[0] }), h('span', { class: 'num', text: p[1] })); }));
  }
  function pill(kind, text) { return h('span', { class: 'pill ' + kind, text: text }); }
  function tile(kind, ic, title, sub, href) {
    return h('a', { class: 'card tile ' + kind, href: href }, h('div', { class: 'ic' }, icon(ic)), h('div', null, h('b', { text: title }), h('span', { text: sub })));
  }
  function funnel(steps, total) {
    return h('div', { class: 'funnel' }, steps.map(function (x) {
      return h('div', { class: 'step' }, h('span', { text: x[0] }),
        h('div', { class: 'bar' }, h('span', { style: 'width:' + Math.max(1, Math.round((x[1] / Math.max(1, total)) * 100)) + '%' })),
        h('span', { class: 'num', style: 'text-align:right', text: n(x[1]) }));
    }));
  }
  function barChart(rowsIn) {
    const W = 600, H = 170, pad = 30;
    const max = Math.max(1, Math.max.apply(null, rowsIn.map(function (r) { return r.count; })));
    const bw = (W - pad) / Math.max(1, rowsIn.length);
    const g = s('svg', { viewBox: '0 0 ' + W + ' ' + (H + 22), class: 'chart', role: 'img', 'aria-label': 'Signups per day' });
    [0.5, 1].forEach(function (f) {
      const y = H - (H - 16) * f;
      g.appendChild(s('line', { x1: pad, x2: W, y1: y, y2: y, class: 'grid-line' }));
      g.appendChild(s('text', { x: 0, y: y + 3, text: n(Math.round(max * f)) }));
    });
    g.appendChild(s('line', { x1: pad, x2: W, y1: H, y2: H, class: 'axis' }));
    rowsIn.forEach(function (r, i) {
      const bh = Math.max(r.count ? 2 : 0, (r.count / max) * (H - 16));
      const x = pad + i * bw + 3;
      const rect = s('rect', { x: x, y: H - bh, width: Math.max(2, bw - 6), height: bh, rx: 4, class: 'bar' + (i === rowsIn.length - 1 ? ' today' : '') });
      rect.appendChild(s('title', { text: r.day + ': ' + n(r.count) }));
      g.appendChild(rect);
      if (i % 2 === (rowsIn.length - 1) % 2) {
        const d = new Date(r.day + 'T00:00:00');
        g.appendChild(s('text', { x: x + (bw - 6) / 2, y: H + 15, 'text-anchor': 'middle', text: d.getDate() + '/' + (d.getMonth() + 1) }));
      }
    });
    return g;
  }
  function distributionChart(bands) {
    const W = 600, H = 170, pad = 30;
    const max = Math.max(1, Math.max.apply(null, bands.map(function (b) { return b.low + b.medium + b.high; })));
    const bw = (W - pad) / Math.max(1, bands.length);
    const g = s('svg', { viewBox: '0 0 ' + W + ' ' + (H + 22), class: 'chart', role: 'img', 'aria-label': 'Estimate distribution by confidence' });
    g.appendChild(s('line', { x1: pad, x2: W, y1: H, y2: H, class: 'axis' }));
    g.appendChild(s('text', { x: 0, y: 19, text: n(max) }));
    bands.forEach(function (b, i) {
      const x = pad + i * bw + 4;
      let y = H;
      [['high', 'var(--conf-high)'], ['medium', 'var(--conf-mid)'], ['low', 'var(--conf-low)']].forEach(function (part) {
        const v = b[part[0]];
        if (!v) return;
        const bh = (v / max) * (H - 16);
        y -= bh;
        const rect = s('rect', { x: x, y: y, width: bw - 8, height: bh, fill: part[1] });
        rect.appendChild(s('title', { text: (b.band / 10).toFixed(1) + '–' + ((b.band + 1) / 10).toFixed(1) + ' · ' + part[0] + ' confidence: ' + n(v) }));
        g.appendChild(rect);
      });
      g.appendChild(s('text', { x: x + (bw - 8) / 2, y: H + 15, 'text-anchor': 'middle', text: (b.band / 10).toFixed(1) }));
    });
    return g;
  }

  // ---------------------------------------------------------------- monitor pages
  function pageOverview() {
    const d = state.overview, w = d.waitlist, r = d.referrals, m = d.members, sf = d.safety, mail = d.mail, mt = d.matching, luna = d.luna;
    const lastRun = (mt.runs || []).filter(function (x) { return x.mode === 'live'; })[0];
    const runKind = !lastRun ? 'off' : lastRun.failed ? 'bad' : lastRun.breaches ? 'warn' : 'good';
    return h('div', { class: 'stack' },
      h('div', { class: 'kpis' },
        kpi('Waitlist', n(w.total), '+' + n(w.last_24h) + ' today · +' + n(w.last_7d) + ' this week'),
        kpi('First-10,000 places left', n(w.first_10000_left), pct(10000 - w.first_10000_left, 10000) + ' claimed'),
        kpi('Ready for matching', n(m.ready_for_matching), 'of ' + n(m.total) + ' members (' + pct(m.ready_for_matching, m.total) + ')'),
        kpi('Referrals credited', n(r.waitlist_counted + r.app_counted), n(r.waitlist_attributed + r.app_claimed) + ' attributed'),
        kpi('Connections', n(d.connections.total), '+' + n(d.connections.last_7d) + ' this week'),
        kpi('Open reports', n(sf.open_reports), n(sf.reports_7d) + ' this week', sf.open_reports > 0)),
      h('h3', { text: 'System health' }),
      h('div', { class: 'tiles' },
        tile(runKind, 'matching', lastRun ? 'Matching ' + (runKind === 'good' ? 'healthy' : runKind === 'warn' ? 'with warnings' : 'failed') : 'No live round yet', lastRun ? 'Last round ' + ago(lastRun.finished_at || lastRun.started_at) : 'Rounds appear here', '#/matching'),
        tile(mail.failing ? 'bad' : mail.pending > 200 ? 'warn' : 'good', 'mail', mail.failing ? n(mail.failing) + ' emails failing' : n(mail.pending) + ' emails queued', n(mail.sent_24h) + ' sent in 24 h', '#/operations'),
        tile(sf.moderation_stuck ? 'bad' : sf.moderation_pending > 20 ? 'warn' : 'good', 'safety', n(sf.moderation_pending) + ' awaiting moderation', sf.moderation_stuck ? n(sf.moderation_stuck) + ' stuck' : 'Nothing stuck', '#/safety'),
        tile(luna.enabled ? 'good' : 'off', 'luna', 'Luna ' + (luna.enabled ? 'on' : 'off'), luna.enabled ? n(luna.queued) + ' queued · ' + n(luna.failed) + ' failed' : 'No image analysis is running', '#/luna')),
      h('div', { class: 'grid cols-wide' },
        card('Waitlist signups', h('p', { text: 'Last 14 days' }), barChart(w.daily || [])),
        card('Recent activity', h('a', { href: '#/audit', class: 'small', text: 'View all' }), auditList((d.audit || []).slice(0, 5)))));
  }

  function pageGrowth() {
    const w = state.overview.waitlist, r = state.overview.referrals;
    const topMax = Math.max(1, (w.top_cities[0] || {}).count || 1);
    const ages = ['18-24', '25-29', '30-34', '35-39', '40-49', '50+'];
    return h('div', { class: 'stack' },
      h('div', { class: 'kpis' },
        kpi('Waitlist', n(w.total), '+' + n(w.last_7d) + ' this week'),
        kpi('Today', n(w.last_24h), 'signups in the last 24 h'),
        kpi('First-10,000 places left', n(w.first_10000_left)),
        kpi('Credited this week', n(r.counted_last_7d), 'referrals')),
      h('div', { class: 'grid cols-wide' },
        card('Signups per day', h('p', { text: 'Last 14 days · today in gold' }), barChart(w.daily || [])),
        card('Top cities', null, h('ul', { class: 'list' }, (w.top_cities || []).map(function (c) {
          return h('li', { style: 'display:block' }, h('div', { style: 'display:flex;justify-content:space-between' }, h('span', { text: c.city }), h('span', { class: 'num', text: n(c.count) })),
            h('div', { class: 'meter' }, h('span', { style: 'width:' + Math.round((c.count / topMax) * 100) + '%' })));
        })))),
      h('div', { class: 'grid cols-2' },
        card('Referral funnel', null, [
          funnel([['Waitlist', w.total], ['Joined via a friend', r.waitlist_attributed], ['Friend credited', r.waitlist_counted], ['App codes claimed', r.app_claimed], ['App friend credited', r.app_counted]], w.total),
          h('p', { class: 'note', style: 'margin-top:14px', text: 'Credit is awarded only once the friend’s app profile passes the matching-readiness check. Signing up or confirming email never counts by itself.' })]),
        card('Age ranges', null, rows(ages.map(function (k) { const v = (w.age_ranges || {})[k] || 0; return [k, n(v) + '  ·  ' + pct(v, w.total)]; })))));
  }

  function pageMembers() {
    const m = state.overview.members, c = state.overview.connections;
    return h('div', { class: 'stack' },
      h('div', { class: 'kpis' },
        kpi('Accounts', n(m.total), '+' + n(m.joined_7d) + ' this week'),
        kpi('Finished onboarding', n(m.onboarded), pct(m.onboarded, m.total)),
        kpi('Ready for matching', n(m.ready_for_matching), pct(m.ready_for_matching, m.total)),
        kpi('Premium', n(m.premium), n(m.launch_reward_active) + ' on a launch reward')),
      h('div', { class: 'grid cols-3' },
        card('Readiness funnel', null, funnel([['Accounts', m.total], ['Onboarded', m.onboarded], ['Ready', m.ready_for_matching]], m.total)),
        card('Balance', null, rows([['Women', n(m.women) + '  ·  ' + pct(m.women, m.total), 1], ['Men', n(m.men) + '  ·  ' + pct(m.men, m.total), 1]])),
        card('Connections', null, rows([['Mutual connections', n(c.total), 1], ['This week', n(c.last_7d)], ['Still open', n(c.open)]]))),
      h('p', { class: 'note', text: 'Members are shown only in aggregate. Individual profiles, messages and photos are deliberately not available in this panel.' }));
  }

  function pageMatching() {
    const mt = state.overview.matching, f = mt.fairness || {};
    return h('div', { class: 'stack' },
      card('Recent matching runs', null, h('div', { class: 'table-wrap' }, h('table', null,
        h('thead', null, h('tr', null, ['Started', 'Mode', 'Algorithm', 'Eligible', 'Pairs', 'Rounds', 'Status'].map(function (t) { return h('th', { text: t }); }))),
        h('tbody', null, (mt.runs || []).length ? mt.runs.map(function (x) {
          const st = x.failed ? pill('bad', 'Failed') : !x.finished_at ? pill('warn', 'Running') : x.breaches ? pill('warn', x.breaches + ' warning' + (x.breaches > 1 ? 's' : '')) : pill('good', 'OK');
          return h('tr', null, h('td', { class: 'nowrap', text: when(x.started_at) }), h('td', null, h('span', { class: 'tag', text: x.mode })), h('td', { class: 'mono', text: x.algorithm }),
            h('td', { class: 'num', text: n(x.eligible) }), h('td', { class: 'num', text: n(x.pairs) }), h('td', { class: 'num', text: n(x.rounds) }), h('td', null, st));
        }) : h('tr', null, h('td', { colspan: '7', class: 'muted', text: 'No runs recorded yet.' })))))),
      h('div', { class: 'grid cols-2' },
        card('Fairness, last live round', null, [rows([
          ['Members in the round', n(f.members), 1], ['Average recent exposures', f.avg_exposures == null ? '–' : String(f.avg_exposures)],
          ['Waiting 3+ rounds', n(f.waiting_3_plus_rounds) + '  ·  ' + pct(f.waiting_3_plus_rounds, f.members)],
          ['Lower-reception members', n(f.low_score_members)],
          ['…of whom waiting 3+ rounds', n(f.low_score_waiting_3_plus) + '  ·  ' + pct(f.low_score_waiting_3_plus, f.low_score_members), 1]]),
          h('p', { class: 'note', style: 'margin-top:12px', text: 'The rotation should keep long waits rare at every reception level. If lower-reception members wait noticeably more than everyone else, lower the reception weights on the Scoring page.' })]),
        card('How matching decides', null, h('ul', { class: 'list' }, [
          'Preferences and eligibility decide who can be considered.',
          'The reciprocal score estimates how likely both people are to choose each other.',
          'The private reception estimate is one modest input, blended toward neutral when evidence is thin.',
          'Similarity is a capped soft preference, never a score band.',
          'The rotation independently protects everyone’s share of introductions.'
        ].map(function (t, i) { return h('li', { style: 'justify-content:flex-start' }, h('span', { class: 'tag', text: String(i + 1) }), h('span', { text: t })); })))));
  }

  function pageSafety() {
    const sf = state.overview.safety;
    return h('div', { class: 'stack' },
      h('div', { class: 'kpis' },
        kpi('Open reports', n(sf.open_reports), n(sf.reports_7d) + ' this week', sf.open_reports > 0),
        kpi('Awaiting moderation', n(sf.moderation_pending)),
        kpi('Flagged for review', n(sf.moderation_review), 'last 7 days'),
        kpi('Removed automatically', n(sf.moderation_removed_7d), 'last 7 days')),
      card('Moderation pipeline', sf.moderation_stuck ? pill('bad', n(sf.moderation_stuck) + ' stuck') : pill('good', 'Flowing'), rows([
        ['Waiting for the moderation worker', n(sf.moderation_pending), 1], ['Gave up after retries', n(sf.moderation_stuck)],
        ['Flagged for human review (7 days)', n(sf.moderation_review)], ['Removed automatically (7 days)', n(sf.moderation_removed_7d)]])),
      h('p', { class: 'note', text: 'Reports are actioned from the signed links in each report email (suspend, ban, dismiss), which stay the single place for decisions about individual members.' }));
  }

  function pageOperations() {
    const mail = state.overview.mail;
    const kind = mail.failing ? 'bad' : mail.pending > 200 ? 'warn' : 'good';
    return h('div', { class: 'stack' },
      h('div', { class: 'kpis' },
        kpi('Emails queued', n(mail.pending), mail.oldest_pending_at ? 'oldest ' + ago(mail.oldest_pending_at) : 'none waiting'),
        kpi('Sent in 24 h', n(mail.sent_24h), mail.daily_limit == null ? 'provider quota' : 'of ' + n(mail.daily_limit) + ' a day'),
        kpi('Failing', n(mail.failing), 'gave up after retries', mail.failing > 0)),
      card('Email delivery', pill(kind, kind === 'good' ? 'Healthy' : kind === 'warn' ? 'Backlog' : 'Failing'), [rows([
        ['Daily limit', mail.daily_limit == null ? 'Provider quota (SES)' : n(mail.daily_limit) + ' a day', 1],
        ['Budget used (24 h)', mail.daily_limit ? pct(mail.sent_24h, mail.daily_limit) : '–']]),
        h('p', { class: 'note', style: 'margin-top:12px', text: 'The worker switches to Amazon SES by itself once AWS grants production access. Change the daily limit under Settings.' })],
        h('a', { class: 'btn ghost sm', href: '#/settings' }, 'Email settings')));
  }

  // ---------------------------------------------------------------- configure pages
  function pageScoring() {
    const sig = state.overview.signals;
    return h('div', { class: 'stack' },
      h('div', { class: 'kpis' },
        kpi('Config version', 'v' + sig.config_version, 'changed ' + ago(sig.config_updated_at)),
        kpi('Estimates', n(sig.estimates), 'last computed ' + ago(sig.last_computed_at)),
        kpi('Average confidence', String(sig.avg_confidence), '0 = new, 1 = well established'),
        kpi('Viewing observations', n(sig.observations_30d), 'last 30 days')),
      h('div', { class: 'grid cols-wide' },
        card('Distribution', h('p', { text: 'Anonymous bands · nobody is listed by score' }), [distributionChart(sig.distribution || []),
          h('div', { class: 'legend' },
            h('span', null, h('i', { style: 'background:var(--conf-low)' }), 'Low confidence'),
            h('span', null, h('i', { style: 'background:var(--conf-mid)' }), 'Medium'),
            h('span', null, h('i', { style: 'background:var(--conf-high)' }), 'High'))]),
        card('About this estimate', null, h('ul', { class: 'list' }, [
          ['Shown to members', 'Never'], ['Used for', 'Matching only'], ['Removes anyone from rounds', 'No'], ['Range', '0.05 – 0.95'], ['Evidence window', '180 days']
        ].map(function (x) { return h('li', null, h('span', { class: 'muted', text: x[0] }), h('b', { text: x[1] })); })))),
      metricsEditor());
  }

  function metricsEditor() {
    const byKey = {};
    (state.overview.signals.metrics || []).forEach(function (x) { byKey[x.key] = { enabled: x.enabled, weight: Number(x.weight) }; });
    const draft = JSON.parse(JSON.stringify(byKey));
    const shares = {};
    const save = h('button', { type: 'button', class: 'btn', text: 'Review changes', disabled: true });
    const discard = h('button', { type: 'button', class: 'btn ghost', text: 'Discard', disabled: true });
    const changed = function () { return METRIC_ORDER.filter(function (k) { return byKey[k] && (draft[k].enabled !== byKey[k].enabled || draft[k].weight !== byKey[k].weight); }); };
    function update() {
      const total = METRIC_ORDER.filter(function (k) { return k !== 'reception_similarity' && draft[k] && draft[k].enabled; }).reduce(function (a, k) { return a + draft[k].weight; }, 0);
      METRIC_ORDER.forEach(function (k) {
        if (!shares[k]) return;
        shares[k].textContent = k === 'reception_similarity' ? (draft[k].enabled ? 'pair multiplier' : 'off') : draft[k].enabled && total ? Math.round((draft[k].weight / total) * 100) + '% of estimate' : 'not used';
        shares[k].row.classList.toggle('dirty', changed().indexOf(k) >= 0);
      });
      save.disabled = !canEdit() || !changed().length;
      discard.disabled = !changed().length;
    }
    const list = h('div', null, METRIC_ORDER.filter(function (k) { return byKey[k]; }).map(function (k) {
      const toggle = h('input', { type: 'checkbox', role: 'switch', 'aria-label': METRICS[k][0], disabled: !canEdit() });
      toggle.checked = draft[k].enabled;
      const out = h('output', { text: draft[k].weight.toFixed(2) });
      const range = h('input', { type: 'range', min: '0', max: k === 'reception_similarity' ? '0.2' : '1', step: '0.01', value: String(draft[k].weight), 'aria-label': METRICS[k][0] + ' weight', disabled: !canEdit() });
      toggle.addEventListener('change', function () { draft[k].enabled = toggle.checked; update(); });
      range.addEventListener('input', function () { draft[k].weight = Math.round(Number(range.value) * 100) / 100; out.textContent = draft[k].weight.toFixed(2); update(); });
      const share = h('div', { class: 'share' });
      const row = h('div', { class: 'metric' }, h('label', { class: 'switch' }, toggle, h('span')),
        h('div', null, h('div', { class: 'name', text: METRICS[k][0] }), h('div', { class: 'desc', text: METRICS[k][1] })),
        h('div', { class: 'weight' }, range, out), share);
      share.row = row; shares[k] = share;
      return row;
    }));
    discard.addEventListener('click', render);
    save.addEventListener('click', function () {
      const keys = changed();
      const lunaOn = draft.luna_presentation && draft.luna_presentation.enabled && !byKey.luna_presentation.enabled;
      dialog({
        title: 'Change ' + keys.length + ' signal' + (keys.length > 1 ? 's' : ''),
        body: 'Every member’s private estimate is recomputed straight away. To undo, set the old values again.',
        diff: keys.map(function (k) {
          const b = byKey[k], a = draft[k];
          return [METRICS[k][0], (b.enabled ? 'on ' : 'off ') + b.weight.toFixed(2) + '  →  ' + (a.enabled ? 'on ' : 'off ') + a.weight.toFixed(2)];
        }),
        extra: lunaOn && h('p', { class: 'note warn', text: 'Turning Luna on sends new profile photos to the image model, which costs API usage. Existing photos are only analysed if you queue a backfill.' }),
        typed: lunaOn ? 'LUNA' : null,
        run: function (why) {
          let chain = Promise.resolve();
          keys.forEach(function (k) {
            chain = chain.then(function () {
              if (DEMO) return demoMetric(k, draft[k], why);
              return rpc('admin_set_matching_metric', { p_metric_key: k, p_enabled: draft[k].enabled, p_weight: draft[k].weight, p_reason: why });
            });
          });
          return chain;
        }
      }).then(function (done) { if (done) { toast('Signals saved.'); reload(); } });
    });
    update();
    return card('Signal switches and weights', h('p', { text: canEdit() ? 'Weights are shares of the enabled signals' : 'Read-only: owner role needed' }), list,
      [h('span', { class: 'muted small', style: 'flex:1', text: 'Switching a signal off rescales the rest automatically.' }), discard, save]);
  }

  function pageLuna() {
    const luna = state.overview.luna;
    const metric = (state.overview.signals.metrics || []).filter(function (x) { return x.key === 'luna_presentation'; })[0] || { enabled: false, weight: 0.1 };
    const toggle = h('input', { type: 'checkbox', role: 'switch', 'aria-label': 'Luna', disabled: !canEdit() });
    toggle.checked = luna.enabled;
    toggle.addEventListener('change', function () {
      const on = toggle.checked;
      toggle.checked = !on;
      dialog({
        title: on ? 'Turn Luna on?' : 'Turn Luna off?',
        body: on ? 'New profile photos will be sent to the image model for four presentation measures. This costs API usage.' : 'No more photos are analysed, and existing Luna results stop affecting estimates.',
        typed: on ? 'LUNA' : null, danger: on, confirm: on ? 'Turn on' : 'Turn off',
        run: function (why) {
          if (DEMO) return demoMetric('luna_presentation', { enabled: on, weight: Number(metric.weight) }, why);
          return rpc('admin_set_matching_metric', { p_metric_key: 'luna_presentation', p_enabled: on, p_weight: Number(metric.weight), p_reason: why });
        }
      }).then(function (done) { if (done) { toast('Luna is ' + (on ? 'on' : 'off') + '.'); reload(); } });
    });
    const count = h('input', { type: 'number', min: '1', max: '50', value: '20', style: 'width:90px', 'aria-label': 'Photos to queue' });
    const queue = h('button', { type: 'button', class: 'btn', text: 'Queue backfill', disabled: !canEdit() || !luna.enabled });
    queue.addEventListener('click', function () {
      const limit = Number(count.value);
      if (!(limit >= 1 && limit <= 50)) { toast('Choose 1 to 50 photos.', true); return; }
      dialog({
        title: 'Queue ' + limit + ' existing photos?', body: 'Each photo is one low-detail image request. The worker analyses two at a time.',
        typed: 'QUEUE', reason: false, confirm: 'Queue photos',
        run: function () { return DEMO ? demoBackfill(limit) : rpc('admin_queue_luna_backfill', { p_limit: limit, p_confirm: 'QUEUE' }); }
      }).then(function (res) { if (res) { toast('Queued ' + res.queued + ' photos.'); reload(); } });
    });
    return h('div', { class: 'stack' },
      card(null, null, h('div', null,
        h('div', { class: 'setting' }, h('div', null, h('div', { class: 's-title', text: 'Luna photo presentation' }),
          h('div', { class: 's-desc', text: 'Scores only clarity, lighting, framing and background distraction. It is instructed never to judge attractiveness, identity, age, ethnicity, religion, emotion or personality.' })),
          h('div', { class: 's-value' }, luna.enabled ? pill('good', 'On') : pill('off', 'Off'), h('label', { class: 'switch' }, toggle, h('span')))),
        h('div', { class: 'setting' }, h('div', null, h('div', { class: 's-title', text: 'Backfill existing photos' }),
          h('div', { class: 's-desc', text: 'Turning Luna on only analyses new photos, so a switch can never run up a bill. Queue existing photos here in batches of up to 50.' })),
          h('div', { class: 's-value' }, count, queue)))),
      h('div', { class: 'kpis' },
        kpi('Queued', n(luna.queued)), kpi('Failed', n(luna.failed), 'after 5 attempts', luna.failed > 0),
        kpi('Analysed this week', n(luna.analyzed_7d)), kpi('Analysed in total', n(luna.analyzed))),
      h('p', { class: 'note', text: 'Keep Luna off until its photo-quality and accessibility bias have been reviewed. Its weight is set on the Scoring page.' }));
  }

  function pageFlags() {
    const flags = (state.settings && state.settings.flags) || [];
    return h('div', { class: 'stack' },
      h('p', { class: 'note warn', text: 'Flags change the live app for real members. Each change needs the flag’s name typed, a reason, and a fresh authenticator code.' }),
      card(null, null, h('div', { class: 'table-wrap' }, h('table', null,
        h('thead', null, h('tr', null, ['Flag', 'Status', 'Rollout', 'Listed testers', 'Updated', ''].map(function (t) { return h('th', { text: t }); }))),
        h('tbody', null, flags.map(function (f) {
          return h('tr', null,
            h('td', null, h('div', { class: 'mono', text: f.key }), h('div', { class: 'muted small', text: FLAGS[f.key] || 'Release flag' })),
            h('td', null, f.enabled ? pill('good', 'On') : pill('off', 'Off')),
            h('td', { class: 'num', text: f.enabled ? f.rollout + '%' : '–' }),
            h('td', { class: 'num', text: n(f.members) }),
            h('td', { class: 'nowrap muted', text: ago(f.updated_at) }),
            h('td', { style: 'text-align:right' }, h('button', { type: 'button', class: 'btn ghost sm', disabled: !canEdit(), onclick: function () { editFlag(f); } }, 'Edit')));
        }))))));
  }
  function editFlag(f) {
    const toggle = h('input', { type: 'checkbox', role: 'switch', 'aria-label': 'Enabled' });
    toggle.checked = f.enabled;
    const rollout = h('input', { type: 'range', min: '0', max: '100', step: '5', value: String(f.rollout), style: 'flex:1;accent-color:var(--pink)' });
    const out = h('output', { class: 'num', text: f.rollout + '%' });
    rollout.addEventListener('input', function () { out.textContent = rollout.value + '%'; });
    dialog({
      title: 'Edit ' + f.key, body: FLAGS[f.key] || 'Release flag',
      extra: h('div', { style: 'display:grid;gap:12px' },
        h('label', { style: 'display:flex;align-items:center;justify-content:space-between;font-weight:600' }, 'Enabled', h('span', { class: 'switch' }, toggle, h('span'))),
        h('label', { class: 'field' }, 'Rollout to members', h('span', { class: 'hint', text: 'Listed testers always get an enabled flag. Others are included by a stable percentage.' }),
          h('div', { style: 'display:flex;gap:10px;align-items:center' }, rollout, out))),
      typed: f.key,
      run: function (why) {
        const args = { p_key: f.key, p_enabled: toggle.checked, p_rollout: Number(rollout.value), p_confirm: f.key, p_reason: why };
        if (DEMO) return demoWrite('flag.set', { flag: f.key, before: { enabled: f.enabled, rollout: f.rollout }, after: { enabled: args.p_enabled, rollout: args.p_rollout }, reason: why },
          function () { f.enabled = args.p_enabled; f.rollout = args.p_rollout; f.updated_at = new Date().toISOString(); });
        return rpc('admin_set_release_flag', args);
      }
    }).then(function (done) { if (done) { toast('Flag saved.'); reload(); } });
  }

  function pageSettings() {
    const st = state.settings;
    const edit = function (label, fn) { return h('button', { type: 'button', class: 'btn ghost sm', disabled: !canEdit(), onclick: fn }, label); };
    return h('div', { class: 'stack' },
      card('Referrals', null, h('div', null,
        h('div', { class: 'setting' }, h('div', null, h('div', { class: 's-title', text: 'Referral link address' }),
          h('div', { class: 's-desc', text: 'Every invite link in the app, on /refer and in emails is this address plus the member’s code. It must stay on halalmo.de. Keep https://halalmo.de/?ref= until launch routing changes.' })),
          h('div', { class: 's-value' }, h('span', { class: 'mono', text: st.referral_link_base + 'CODE' }),
            edit('Change', function () {
              const input = h('input', { type: 'text', value: st.referral_link_base, spellcheck: 'false' });
              dialog({
                title: 'Referral link address', body: 'For example https://halalmo.de/?ref= or https://halalmo.de/app?ref=',
                extra: h('label', { class: 'field' }, 'Address', input),
                run: function (why) {
                  if (DEMO) return demoWrite('referral.link_base', { before: st.referral_link_base, after: input.value, reason: why }, function () { st.referral_link_base = input.value; });
                  return rpc('admin_set_referral_link_base', { p_link_base: input.value.trim(), p_reason: why });
                }
              }).then(function (done) { if (done) { toast('Referral links updated.'); reload(); } });
            }))))),
      card('Email', null, h('div', null,
        h('div', { class: 'setting' }, h('div', null, h('div', { class: 's-title', text: 'Daily sending limit' }),
          h('div', { class: 's-desc', text: 'Keeps waitlist mail inside the provider’s budget (Resend free plan: 100 a day). Leave empty to use Amazon SES’s own quota once production access is approved. The last 10 are always kept for safety reports.' })),
          h('div', { class: 's-value' }, h('b', { text: st.mail_daily_limit == null ? 'Provider quota' : n(st.mail_daily_limit) + ' a day' }),
            edit('Change', function () {
              const input = h('input', { type: 'number', min: '11', max: '1000000', value: st.mail_daily_limit == null ? '' : String(st.mail_daily_limit), placeholder: 'Empty = provider quota' });
              dialog({
                title: 'Daily sending limit', extra: h('label', { class: 'field' }, 'Emails a day', input),
                run: function (why) {
                  const v = input.value.trim() === '' ? null : Number(input.value);
                  if (DEMO) return demoWrite('mail.daily_limit', { before: st.mail_daily_limit, after: v, reason: why }, function () { st.mail_daily_limit = v; });
                  return rpc('admin_set_mail_daily_limit', { p_daily_limit: v, p_reason: why });
                }
              }).then(function (done) { if (done) { toast('Email limit saved.'); reload(); } });
            }))))),
      card('Security', null, h('div', null,
        securityRow('Two-factor sign-in', 'Required for every admin. Codes come from an authenticator app.', pill('good', 'Enforced')),
        securityRow('Fresh code for changes', 'Changing anything needs a code entered in the last 15 minutes.', pill('good', 'Enforced')),
        securityRow('Idle sign-out', 'This browser signs out after 15 minutes without activity. Sessions end when the tab closes.', pill('good', '15 minutes')),
        securityRow('Change rate limit', 'At most 60 changes per admin per 10 minutes.', pill('good', 'Enforced')),
        securityRow('Sign out everywhere', 'Ends every session for your account on all devices, including the app.',
          h('button', { type: 'button', class: 'btn ghost sm', onclick: function () {
            dialog({ title: 'Sign out everywhere?', body: 'Every session for your account ends, on every device.', reason: false, local: true, confirm: 'Sign out everywhere', danger: true,
              run: function () { return Promise.resolve(true); } }).then(function (ok) { if (ok) signOut('global', 'Signed out on every device.'); });
          } }, 'Sign out everywhere')))));
  }
  function securityRow(title, desc, value) {
    return h('div', { class: 'setting' }, h('div', null, h('div', { class: 's-title', text: title }), h('div', { class: 's-desc', text: desc })), h('div', { class: 's-value' }, value));
  }

  // ---------------------------------------------------------------- govern pages
  function pageTeam() {
    const st = state.settings;
    const team = st.team || [];
    return h('div', { class: 'stack' },
      card('Admins', h('button', { type: 'button', class: 'btn sm', disabled: !canEdit(), onclick: addMember }, 'Add admin'), h('div', { class: 'table-wrap' }, h('table', null,
        h('thead', null, h('tr', null, ['Admin', 'Role', 'Two-factor', 'Last sign-in', 'Added', ''].map(function (t) { return h('th', { text: t }); }))),
        h('tbody', null, team.map(function (a) {
          return h('tr', null,
            h('td', null, h('div', { style: 'font-weight:600', text: (a.note || a.email) + (a.you ? ' (you)' : '') }), h('div', { class: 'muted small', text: a.email })),
            h('td', null, h('span', { class: 'tag', text: a.role === 'owner' ? 'Owner' : 'Viewer' })),
            h('td', null, a.mfa_factors ? pill('good', 'Set up') : pill('warn', 'Not yet')),
            h('td', { class: 'nowrap muted', text: ago(a.last_sign_in) }),
            h('td', { class: 'nowrap muted', text: when(a.added_at) }),
            h('td', { style: 'text-align:right;white-space:nowrap' },
              h('button', { type: 'button', class: 'btn ghost sm', disabled: !canEdit(), onclick: function () { changeRole(a); } }, a.role === 'owner' ? 'Make viewer' : 'Make owner'), ' ',
              h('button', { type: 'button', class: 'btn ghost sm', disabled: !canEdit(), onclick: function () { removeMember(a); } }, 'Remove')));
        }))))),
      h('div', { class: 'grid cols-2' },
        card('Roles', null, h('ul', { class: 'list' },
          h('li', null, h('b', { text: 'Owner' }), h('span', { class: 'muted', text: 'Sees everything, changes settings and the team' })),
          h('li', null, h('b', { text: 'Viewer' }), h('span', { class: 'muted', text: 'Sees everything, changes nothing' })))),
        card('Recent sign-ins', null, (st.sign_ins || []).length ? h('ul', { class: 'list' }, st.sign_ins.slice(0, 8).map(function (x) {
          return h('li', null, h('span', { text: x.actor }), h('span', { class: 'muted small', text: when(x.at) }));
        })) : h('p', { class: 'muted', text: 'No sign-ins recorded yet.' }))),
      h('p', { class: 'note', text: 'For an extra layer in front of this page, put halalmo.de/admin behind Cloudflare Access (free for up to 50 people). The server checks apply either way.' }));
  }
  function addMember() {
    const email = h('input', { type: 'email', placeholder: 'name@example.com', autocomplete: 'off' });
    const name = h('input', { type: 'text', placeholder: 'Shown in the audit log', maxlength: '60' });
    const role = h('select', null, h('option', { value: 'viewer', text: 'Viewer (read-only)' }), h('option', { value: 'owner', text: 'Owner (can change settings)' }));
    dialog({
      title: 'Add an admin', body: 'They must have signed in to Halal Mode once with this email. They set up two-factor on their first visit.',
      extra: h('div', { style: 'display:grid;gap:12px' }, h('label', { class: 'field' }, 'Email', email), h('label', { class: 'field' }, 'Display name', name), h('label', { class: 'field' }, 'Role', role)),
      confirm: 'Add admin',
      run: function (why) {
        if (DEMO) return demoWrite('team.add', { name: name.value || email.value, role: role.value, reason: why }, function () {
          state.settings.team.push({ user_id: String(Date.now()), email: email.value, note: name.value, role: role.value, added_at: new Date().toISOString(), mfa_factors: 0 });
        });
        return rpc('admin_add_member', { p_email: email.value.trim(), p_role: role.value, p_note: name.value.trim(), p_reason: why });
      }
    }).then(function (done) { if (done) { toast('Admin added.'); reload(); } });
  }
  function changeRole(a) {
    const next = a.role === 'owner' ? 'viewer' : 'owner';
    dialog({
      title: 'Make ' + (a.note || a.email) + (next === 'owner' ? ' an owner?' : ' a viewer?'),
      diff: [['Role', a.role + '  →  ' + next]], confirm: 'Change role', danger: next === 'owner',
      run: function (why) {
        if (DEMO) return demoWrite('team.role', { name: a.note, before: a.role, after: next, reason: why }, function () { a.role = next; });
        return rpc('admin_set_member_role', { p_user_id: a.user_id, p_role: next, p_reason: why });
      }
    }).then(function (done) { if (done) { toast('Role changed.'); reload(); } });
  }
  function removeMember(a) {
    dialog({
      title: 'Remove ' + (a.note || a.email) + '?', body: a.you ? 'You will lose access to this panel straight away.' : 'They lose access to this panel straight away.',
      danger: true, confirm: 'Remove', typed: 'REMOVE',
      run: function (why) {
        if (DEMO) return demoWrite('team.remove', { name: a.note, role: a.role, reason: why }, function () { state.settings.team = state.settings.team.filter(function (x) { return x !== a; }); });
        return rpc('admin_remove_member', { p_user_id: a.user_id, p_reason: why });
      }
    }).then(function (done) {
      if (!done) return;
      toast('Admin removed.');
      if (a.you && !DEMO) signOut(); else reload();
    });
  }

  const AUDIT_ICON = { matching_metric: 'scoring', luna: 'luna', flag: 'flags', referral: 'growth', mail: 'mail', team: 'team', admin: 'lock' };
  function describe(a) {
    const x = a.detail || {};
    const both = function (b, af) { return String(b == null ? 'none' : b) + ' → ' + String(af == null ? 'none' : af); };
    switch (a.action) {
      case 'matching_metric.set': {
        const b = x.before || {}, af = x.after || {}, parts = [];
        if (b.enabled !== af.enabled) parts.push(af.enabled ? 'switched on' : 'switched off');
        if (Number(b.weight) !== Number(af.weight)) parts.push('weight ' + Number(b.weight).toFixed(2) + ' → ' + Number(af.weight).toFixed(2));
        return (METRICS[x.metric] || [x.metric])[0] + ': ' + (parts.join(', ') || 'saved');
      }
      case 'luna.backfill': return 'Luna backfill: queued ' + x.queued + ' of ' + x.requested + ' photos';
      case 'flag.set': return 'Flag ' + x.flag + ': ' + (x.after && x.after.enabled ? 'on at ' + x.after.rollout + '%' : 'off');
      case 'referral.link_base': return 'Referral links: ' + both(x.before, x.after);
      case 'mail.daily_limit': return 'Email daily limit: ' + both(x.before == null ? 'provider quota' : x.before, x.after == null ? 'provider quota' : x.after);
      case 'team.add': return 'Added ' + (x.name || 'an admin') + ' as ' + x.role;
      case 'team.role': return (x.name || 'An admin') + ': ' + both(x.before, x.after);
      case 'team.remove': return 'Removed ' + (x.name || 'an admin');
      case 'admin.sign_in': return 'Signed in';
      default: return a.action;
    }
  }
  function auditList(items) {
    if (!items.length) return h('p', { class: 'muted', text: 'No changes yet.' });
    return h('div', null, items.map(function (a) {
      const reason = a.detail && a.detail.reason;
      return h('div', { class: 'audit-item' }, h('div', { class: 'ic' }, icon(AUDIT_ICON[a.action.split('.')[0]] || 'audit')),
        h('div', { style: 'min-width:0' }, h('div', { class: 'what', text: describe(a) }), h('div', { class: 'why', text: a.actor + (reason ? ' · “' + reason + '”' : '') })),
        h('div', { class: 'when', text: when(a.at) }));
    }));
  }
  function pageAudit() {
    const cats = [['', 'All'], ['matching_metric', 'Scoring'], ['luna', 'Luna'], ['flag', 'Flags'], ['referral', 'Referrals'], ['mail', 'Email'], ['team', 'Team'], ['admin', 'Sign-ins']];
    const box = h('div', null, h('div', { class: 'skeleton' }));
    const more = h('button', { type: 'button', class: 'btn ghost sm', text: 'Load older', hidden: true });
    let items = [];
    function fetchPage(before) {
      if (DEMO) {
        const all = state.overview.audit.filter(function (a) { return !state.auditCategory || a.action.split('.')[0] === state.auditCategory; });
        return Promise.resolve(before ? [] : all);
      }
      return rpc('admin_audit_log', { p_before: before || null, p_category: state.auditCategory || null, p_limit: 50 });
    }
    function draw() { box.replaceChildren(auditList(items)); more.hidden = items.length === 0 || items.length % 50 !== 0; }
    function loadFirst() {
      items = [];
      box.replaceChildren(h('div', { class: 'skeleton' }));
      fetchPage(null).then(function (r) { items = r || []; draw(); }, function (e) { box.replaceChildren(h('p', { class: 'error', text: e.message })); });
    }
    more.addEventListener('click', function () { fetchPage(items[items.length - 1].at).then(function (r) { items = items.concat(r || []); draw(); }); });
    const chips = h('div', { class: 'filters' }, cats.map(function (c) {
      return h('button', { type: 'button', class: 'chip', 'aria-pressed': String(c[0] === state.auditCategory), text: c[1], onclick: function (e) {
        state.auditCategory = c[0];
        chips.querySelectorAll('.chip').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        e.currentTarget.setAttribute('aria-pressed', 'true');
        loadFirst();
      } });
    }));
    loadFirst();
    return h('div', { class: 'stack' }, chips, card(null, null, box, more), h('p', { class: 'note', text: 'The log is append-only: the database refuses to edit or delete entries, including from this panel.' }));
  }

  // ---------------------------------------------------------------- demo
  function demoWrite(action, detail, apply) {
    apply();
    state.overview.audit.unshift({ at: new Date().toISOString(), action: action, actor: 'Demo owner', detail: detail });
    return Promise.resolve({ changed: true });
  }
  function demoMetric(k, v, why) {
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
        { at: iso(2 * day), action: 'matching_metric.set', actor: 'Demo owner', detail: { metric: 'bio_attention', before: { enabled: true, weight: 0.12 }, after: { enabled: true, weight: 0.1 }, reason: 'Bio time was over-weighted for long bios' } },
        { at: iso(3 * day), action: 'flag.set', actor: 'Demo owner', detail: { flag: 'push_notifications', before: { enabled: false, rollout: 0 }, after: { enabled: true, rollout: 100 }, reason: 'Notifications ready for everyone' } },
        { at: iso(4 * day), action: 'team.add', actor: 'Demo owner', detail: { name: 'Aisha', role: 'viewer', reason: 'Support lead needs read access' } }
      ]
    };
  }
  function sampleSettings() {
    const iso = function (ms) { return new Date(Date.now() - ms).toISOString(); };
    return {
      role: 'owner', referral_link_base: 'https://halalmo.de/?ref=', mail_daily_limit: 100,
      flags: [['controlled_beta', false, 0, 0], ['demo_introductions', true, 100, 0], ['identity_verification', false, 0, 0], ['in_chat_voice_notes', false, 0, 0],
        ['live_calling', false, 0, 0], ['premium_purchases', false, 0, 3], ['push_notifications', true, 100, 0], ['reciprocal_matching_v1', true, 100, 0], ['tester_tools', true, 0, 6]]
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
    // Returning from Google: Supabase puts the session in the URL fragment.
    const p = new URLSearchParams(location.hash.slice(1));
    save(fromTokens({ access_token: p.get('access_token'), refresh_token: p.get('refresh_token'), expires_in: p.get('expires_in') }));
    history.replaceState(null, '', location.pathname);
  } else if (!DEMO && /(^|[#&])error=/.test(location.hash)) {
    const q = new URLSearchParams(location.hash.slice(1));
    history.replaceState(null, '', location.pathname);
    showSignIn(q.get('error_description') || 'Sign-in did not complete.');
    return;
  }
  start();
})();
