// halalmo.de/admin. Plain browser JavaScript, no dependencies.
//
// Sign-in is the normal Supabase Auth (Google), then a TOTP second factor.
// The page only ever holds the member's own session; there is no service key
// here. Each RPC re-checks the admin list and two-factor sign-in on the server.
// `?demo` renders sample data without contacting the server.
(function () {
  'use strict';

  let URL_BASE = 'https://lfuuywsmydruvqkqwvzw.supabase.co';
  let KEY = 'sb_publishable_yioJpXVD_u-krXHgA7souQ_2pOiITsN';
  let STORE = 'halal-mode-admin-session';
  let DEMO = new URLSearchParams(location.search).has('demo');
  let REFRESH_MS = 60000;

  let METRICS = {
    selection_rate: ['Selection rate', 'Chosen introductions out of times shown, from server records.'],
    first_choice_rate: ['First choice', 'How often this member is ranked first among someone’s choices.'],
    mutual_first_choice: ['Mutual first choice', 'History of being one another’s first choice.'],
    bio_attention: ['Bio reading time', 'Relative bio reading time within the viewer’s round.'],
    photo_attention: ['Photo viewing time', 'Relative photo time, averaged per profile per round.'],
    profile_attention: ['Profile reading time', 'Relative overall profile time within the viewer’s round.'],
    luna_presentation: ['Luna photo presentation', 'Clarity, lighting, framing, background only. Costs API usage. Off by default.'],
    reception_similarity: ['Reception similarity', 'Pair-level soft preference, not part of the individual estimate. Capped at 0.20.']
  };
  let ORDER = ['selection_rate', 'first_choice_rate', 'mutual_first_choice', 'bio_attention', 'photo_attention', 'profile_attention', 'luna_presentation', 'reception_similarity'];

  let app = document.getElementById('app');
  let session = null;
  let data = null;
  let timer = null;

  // ------------------------------------------------------------- tiny DOM kit
  function h(tag, attrs) {
    let el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      let v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'text') el.textContent = v;
      else if (k === 'class') el.className = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (let i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, child) {
    if (child == null || child === false) return;
    if (Array.isArray(child)) child.forEach(function (c) { append(el, c); });
    else el.appendChild(typeof child === 'string' || typeof child === 'number' ? document.createTextNode(String(child)) : child);
  }
  function svg(tag, attrs) {
    let el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') el.textContent = attrs[k]; else el.setAttribute(k, attrs[k]);
    });
    for (let i = 2; i < arguments.length; i++) if (arguments[i]) el.appendChild(arguments[i]);
    return el;
  }
  let nf = new Intl.NumberFormat('en-GB');
  function n(v) { return v == null ? '–' : nf.format(v); }
  function pct(a, b) { return b ? Math.round((a / b) * 100) + '%' : '–'; }
  function ago(iso) {
    if (!iso) return 'never';
    let s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.round(s / 60) + ' min ago';
    if (s < 86400) return Math.round(s / 3600) + ' h ago';
    return Math.round(s / 86400) + ' d ago';
  }
  function when(iso) {
    return iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '–';
  }

  function gate(title, body, slot) {
    let node = document.getElementById('t-gate').content.firstElementChild.cloneNode(true);
    node.querySelector('[data-title]').textContent = title;
    node.querySelector('[data-body]').textContent = body;
    append(node.querySelector('[data-slot]'), slot);
    app.replaceChildren(node);
    document.getElementById('top-actions').hidden = !session;
    return node.querySelector('[data-error]');
  }

  // ------------------------------------------------------------- auth
  function save(s) {
    session = s;
    try { if (s) sessionStorage.setItem(STORE, JSON.stringify(s)); else sessionStorage.removeItem(STORE); } catch (_e) { /* private mode */ }
  }
  function load() {
    try { return JSON.parse(sessionStorage.getItem(STORE) || 'null'); } catch (_e) { return null; }
  }
  function fromTokens(t) {
    return { access_token: t.access_token, refresh_token: t.refresh_token, expires_at: Math.floor(Date.now() / 1000) + Number(t.expires_in || 3600) };
  }
  function claims() {
    try { return JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch (_e) { return {}; }
  }

  function request(path, opts) {
    opts = opts || {};
    let headers = { apikey: KEY, 'Content-Type': 'application/json' };
    if (session && !opts.anon) headers.Authorization = 'Bearer ' + session.access_token;
    return fetch(URL_BASE + path, { method: opts.method || 'GET', headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined })
      .then(function (res) {
        return res.text().then(function (text) {
          let body = null;
          try { body = text ? JSON.parse(text) : null; } catch (_e) { body = text; }
          if (!res.ok) {
            let err = new Error((body && (body.message || body.msg || body.error_description || body.error)) || ('HTTP ' + res.status));
            err.status = res.status; err.code = body && body.code;
            throw err;
          }
          return body;
        });
      });
  }
  function fresh() {
    if (!session) return Promise.reject(new Error('signed out'));
    if (session.expires_at - 60 > Date.now() / 1000) return Promise.resolve();
    return request('/auth/v1/token?grant_type=refresh_token', { method: 'POST', anon: true, body: { refresh_token: session.refresh_token } })
      .then(function (t) { save(fromTokens(t)); });
  }
  function rpc(name, args) {
    return fresh().then(function () { return request('/rest/v1/rpc/' + name, { method: 'POST', body: args || {} }); });
  }

  function signIn() {
    let back = location.origin + '/admin';
    location.assign(URL_BASE + '/auth/v1/authorize?provider=google&redirect_to=' + encodeURIComponent(back));
  }
  function signOut() {
    let done = function () { save(null); clearInterval(timer); location.replace('/admin'); };
    if (DEMO || !session) return done();
    request('/auth/v1/logout', { method: 'POST' }).then(done, done);
  }

  function showSignIn(message) {
    let err = gate('Halal Mode admin', 'Sign in with the Google account on the admin list. Two-factor sign-in follows.',
      h('button', { type: 'button', class: 'btn', onclick: signIn, text: 'Continue with Google' }));
    if (message) err.textContent = message;
  }

  function showMfa() {
    request('/auth/v1/user').then(function (user) {
      let factor = (user.factors || []).filter(function (f) { return f.factor_type === 'totp' && f.status === 'verified'; })[0];
      if (factor) return askCode(factor.id, null);
      return request('/auth/v1/factors', { method: 'POST', body: { factor_type: 'totp', friendly_name: 'Halal Mode admin ' + new Date().toISOString().slice(0, 10) } })
        .then(function (enrolled) { askCode(enrolled.id, enrolled.totp); });
    }).catch(function (e) { showSignIn(e.message); });
  }

  function askCode(factorId, totp) {
    let input = h('input', { type: 'text', class: 'code', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '6', 'aria-label': 'Six-digit code' });
    let button = h('button', { type: 'submit', class: 'btn', text: 'Verify' });
    let form = h('form', { class: 'gate-form' }, input, h('div', null, button));
    let slot = [];
    if (totp) {
      slot.push(h('img', { class: 'qr', src: totp.qr_code, alt: 'Authenticator QR code' }));
      slot.push(h('code', { text: totp.secret }));
    }
    slot.push(form);
    let err = gate(totp ? 'Set up two-factor sign-in' : 'Two-factor sign-in',
      totp ? 'Scan this with an authenticator app (1Password, Google Authenticator, Authy), then enter the six-digit code.' : 'Enter the six-digit code from your authenticator app.',
      slot);
    input.focus();
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      button.disabled = true; err.textContent = '';
      request('/auth/v1/factors/' + factorId + '/challenge', { method: 'POST', body: {} })
        .then(function (ch) {
          return request('/auth/v1/factors/' + factorId + '/verify', { method: 'POST', body: { challenge_id: ch.id, code: input.value.replace(/\D/g, '') } });
        })
        .then(function (t) { save(fromTokens(t)); start(); })
        .catch(function (e) { err.textContent = e.message || 'That code did not work.'; button.disabled = false; input.select(); });
    });
  }

  // ------------------------------------------------------------- flow
  function start() {
    if (DEMO) {
      document.getElementById('demo-banner').hidden = false;
      session = { demo: true };
      data = sampleData();
      return render();
    }
    session = session || load();
    if (!session) return showSignIn();
    rpc('admin_session').then(function (s) {
      if (!s || !s.admin) {
        gate('Not an administrator', 'This account (' + (claims().email || 'signed in') + ') is not on the admin list.',
          h('button', { type: 'button', class: 'btn ghost', onclick: signOut, text: 'Sign out' }));
        return;
      }
      if (!s.mfa) return showMfa();
      return refresh().then(function () {
        clearInterval(timer);
        timer = setInterval(function () { if (!document.hidden) refresh(); }, REFRESH_MS);
      });
    }).catch(function (e) {
      save(null);
      showSignIn(e.status === 401 ? 'Your session ended. Sign in again.' : e.message);
    });
  }

  function refresh() {
    if (DEMO) { render(); return Promise.resolve(); }
    return rpc('admin_overview').then(function (d) { data = d; render(); })
      .catch(function (e) { toast(e.message); });
  }

  function toast(message) {
    let t = h('div', { class: 'card', role: 'alert', style: 'position:fixed;right:16px;bottom:16px;z-index:9;max-width:360px;border-color:var(--bad)', text: message });
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 6000);
  }

  // ------------------------------------------------------------- charts
  function barChart(rows) {
    let W = 560, H = 160, pad = 22, max = Math.max(1, Math.max.apply(null, rows.map(function (r) { return r.count; })));
    let bw = (W - pad) / rows.length;
    let g = svg('svg', { viewBox: '0 0 ' + W + ' ' + (H + 20), class: 'chart', role: 'img', 'aria-label': 'Waitlist signups per day, last 14 days' });
    g.appendChild(svg('line', { x1: pad, x2: W, y1: H, y2: H, class: 'axis' }));
    g.appendChild(svg('text', { x: 0, y: 10, text: n(max) }));
    rows.forEach(function (r, i) {
      let bh = Math.max(r.count ? 2 : 0, (r.count / max) * (H - 16));
      let x = pad + i * bw + 3;
      let rect = svg('rect', { x: x, y: H - bh, width: Math.max(2, bw - 6), height: bh, rx: 3, class: 'bar' + (i === rows.length - 1 ? ' today' : '') });
      rect.appendChild(svg('title', { text: r.day + ': ' + n(r.count) }));
      g.appendChild(rect);
      if (i % 2 === rows.length % 2 || i === rows.length - 1) {
        let d = new Date(r.day + 'T00:00:00');
        g.appendChild(svg('text', { x: x + (bw - 6) / 2, y: H + 14, 'text-anchor': 'middle', text: d.getDate() + '/' + (d.getMonth() + 1) }));
      }
    });
    return g;
  }

  function distributionChart(bands) {
    let W = 560, H = 170, pad = 22;
    let max = Math.max(1, Math.max.apply(null, bands.map(function (b) { return b.low + b.medium + b.high; })));
    let bw = (W - pad) / bands.length;
    let g = svg('svg', { viewBox: '0 0 ' + W + ' ' + (H + 20), class: 'chart', role: 'img', 'aria-label': 'Reception estimate distribution by confidence' });
    g.appendChild(svg('line', { x1: pad, x2: W, y1: H, y2: H, class: 'axis' }));
    g.appendChild(svg('text', { x: 0, y: 10, text: n(max) }));
    bands.forEach(function (b, i) {
      let x = pad + i * bw + 4, y = H;
      [['high', 'var(--conf-high)'], ['medium', 'var(--conf-mid)'], ['low', 'var(--conf-low)']].forEach(function (part) {
        let v = b[part[0]], bh = (v / max) * (H - 16);
        if (!v) return;
        y -= bh;
        let rect = svg('rect', { x: x, y: y, width: bw - 8, height: bh, fill: part[1] });
        rect.appendChild(svg('title', { text: (b.band / 10).toFixed(1) + '–' + ((b.band + 1) / 10).toFixed(1) + ' · ' + part[0] + ' confidence: ' + n(v) }));
        g.appendChild(rect);
      });
      g.appendChild(svg('text', { x: x + (bw - 8) / 2, y: H + 14, 'text-anchor': 'middle', text: (b.band / 10).toFixed(1) }));
    });
    return g;
  }

  // ------------------------------------------------------------- sections
  function kpi(label, value, sub, alert) {
    return h('div', { class: 'card kpi' + (alert ? ' alert' : '') },
      h('div', { class: 'label', text: label }), h('div', { class: 'value num', text: value }), sub && h('div', { class: 'sub', text: sub }));
  }
  function card(title, aside) {
    let body = h('div');
    let el = h('div', { class: 'card' }, h('div', { class: 'card-head' }, h('h2', { text: title }), aside), body);
    el.body = body;
    return el;
  }
  function rows(pairs) {
    return h('ul', { class: 'list' }, pairs.map(function (p) {
      return h('li', null, h('span', { class: p[2] ? '' : 'muted', text: p[0] }), h('span', { class: 'num', text: p[1] }));
    }));
  }
  function status(kind, text) { return h('span', { class: 'pill ' + kind, text: text }); }
  function sectionTitle(title, note) {
    return h('div', { class: 'section-title' }, h('h2', { text: title }), note && h('p', { class: 'muted small', text: note }));
  }

  function render() {
    if (!data) return;
    let d = data, w = d.waitlist, r = d.referrals, m = d.members, s = d.safety, mail = d.mail, mt = d.matching, sig = d.signals, luna = d.luna;
    document.getElementById('top-actions').hidden = false;
    document.getElementById('updated').textContent = 'Updated ' + ago(d.generated_at) + (d.role === 'viewer' ? ' · read-only' : '');

    let mailState = mail.failing > 0 ? 'bad' : mail.pending > 200 ? 'warn' : 'good';
    let lastRun = (mt.runs || []).filter(function (x) { return x.mode === 'live'; })[0];

    let out = [
      h('div', { class: 'kpis' },
        kpi('Waitlist', n(w.total), '+' + n(w.last_24h) + ' today · +' + n(w.last_7d) + ' this week'),
        kpi('First-10,000 places left', n(w.first_10000_left), pct(10000 - w.first_10000_left, 10000) + ' claimed'),
        kpi('Ready for matching', n(m.ready_for_matching), 'of ' + n(m.total) + ' members (' + pct(m.ready_for_matching, m.total) + ')'),
        kpi('Referrals credited', n(r.waitlist_counted + r.app_counted), n(r.waitlist_attributed + r.app_claimed) + ' attributed in total'),
        kpi('Open reports', n(s.open_reports), n(s.reports_7d) + ' this week', s.open_reports > 0),
        kpi('Mail queue', n(mail.pending), mail.failing ? n(mail.failing) + ' failing' : n(mail.sent_24h) + ' sent in 24 h', mail.failing > 0)
      )
    ];

    // Growth
    out.push(sectionTitle('Growth'));
    let signups = card('Waitlist signups', h('span', { class: 'muted small', text: 'Last 14 days' }));
    signups.body.appendChild(barChart(w.daily || []));
    let cities = card('Top cities');
    let topMax = Math.max(1, (w.top_cities[0] || {}).count || 1);
    cities.body.appendChild(h('ul', { class: 'list' }, (w.top_cities || []).map(function (c) {
      return h('li', { style: 'display:block' },
        h('div', { style: 'display:flex;justify-content:space-between' }, h('span', { text: c.city }), h('span', { class: 'num', text: n(c.count) })),
        h('div', { class: 'meter' }, h('span', { style: 'width:' + Math.round((c.count / topMax) * 100) + '%' })));
    })));
    out.push(h('div', { class: 'grid wide' }, signups, cities));

    let members = card('Members');
    members.body.appendChild(rows([
      ['Accounts', n(m.total), 1], ['Joined this week', n(m.joined_7d)], ['Finished onboarding', n(m.onboarded)],
      ['Ready for matching', n(m.ready_for_matching), 1], ['Women · men', n(m.women) + ' · ' + n(m.men)],
      ['Premium', n(m.premium)], ['Launch reward active', n(m.launch_reward_active)]
    ]));
    let refs = card('Referrals');
    refs.body.appendChild(rows([
      ['Waitlist friends attributed', n(r.waitlist_attributed)], ['Waitlist friends credited', n(r.waitlist_counted), 1],
      ['Credited this week', n(r.counted_last_7d)], ['App codes claimed', n(r.app_claimed)], ['App referrals credited', n(r.app_counted), 1]
    ]));
    refs.body.appendChild(h('p', { class: 'note', text: 'Credit is awarded only once the friend’s app profile passes the matching-readiness check. Signing up or confirming email never counts by itself.' }));
    let ages = card('Waitlist age ranges');
    let ageKeys = ['18-24', '25-29', '30-34', '35-39', '40-49', '50+'];
    ages.body.appendChild(rows(ageKeys.map(function (k) { return [k, n((w.age_ranges || {})[k] || 0) + '  (' + pct((w.age_ranges || {})[k] || 0, w.total) + ')']; })));
    out.push(h('div', { class: 'grid three' }, members, refs, ages));

    // Matching
    out.push(sectionTitle('Matching', lastRun ? 'Last live round ' + ago(lastRun.finished_at || lastRun.started_at) : 'No live round yet'));
    let runs = card('Recent matching runs');
    runs.body.appendChild(h('div', { class: 'table-wrap' }, h('table', null,
      h('thead', null, h('tr', null, ['Started', 'Mode', 'Eligible', 'Pairs', 'Rounds', 'Status'].map(function (t) { return h('th', { text: t }); }))),
      h('tbody', null, (mt.runs || []).length ? mt.runs.map(function (x) {
        let st = x.failed ? status('bad', 'failed') : !x.finished_at ? status('warn', 'running') : x.breaches ? status('warn', x.breaches + ' warning' + (x.breaches > 1 ? 's' : '')) : status('good', 'ok');
        return h('tr', null, h('td', { text: when(x.started_at) }), h('td', { text: x.mode }), h('td', { class: 'num', text: n(x.eligible) }),
          h('td', { class: 'num', text: n(x.pairs) }), h('td', { class: 'num', text: n(x.rounds) }), h('td', null, st));
      }) : h('tr', null, h('td', { colspan: '6', class: 'muted', text: 'No runs recorded yet.' }))))));
    let fair = card('Fairness, last live round');
    let f = mt.fairness || {};
    fair.body.appendChild(rows([
      ['Members in the round', n(f.members), 1], ['Average recent exposures', f.avg_exposures == null ? '–' : String(f.avg_exposures)],
      ['Waiting 3+ rounds', n(f.waiting_3_plus_rounds) + '  (' + pct(f.waiting_3_plus_rounds, f.members) + ')'],
      ['Lower-reception members', n(f.low_score_members)],
      ['…of whom waiting 3+ rounds', n(f.low_score_waiting_3_plus) + '  (' + pct(f.low_score_waiting_3_plus, f.low_score_members) + ')']
    ]));
    fair.body.appendChild(h('p', { class: 'note', text: 'The rotation should keep long waits rare at every reception level. If lower-reception members wait noticeably more than everyone else, lower the reception weights.' }));
    out.push(h('div', { class: 'grid wide' }, runs, fair));

    // Scoring
    out.push(sectionTitle('Private reception estimate', 'Config v' + sig.config_version + ' · changed ' + ago(sig.config_updated_at)));
    let dist = card('Distribution', h('span', { class: 'muted small', text: n(sig.estimates) + ' estimates · avg confidence ' + sig.avg_confidence }));
    dist.body.appendChild(distributionChart(sig.distribution || []));
    dist.body.appendChild(h('div', { class: 'legend' },
      h('span', null, h('i', { style: 'background:var(--conf-low)' }), 'Low confidence (new members, near 0.5)'),
      h('span', null, h('i', { style: 'background:var(--conf-mid)' }), 'Medium'),
      h('span', null, h('i', { style: 'background:var(--conf-high)' }), 'High')));
    dist.body.appendChild(h('p', { class: 'note', text: 'Aggregates only. Members never see this estimate, and nobody is listed by score here. It is one modest input to reciprocal matching; preferences, eligibility and the rotation still decide who is considered.' }));
    let health = card('Signal health');
    health.body.appendChild(rows([
      ['Estimates last recomputed', ago(sig.last_computed_at)], ['Viewing observations, 30 days', n(sig.observations_30d)],
      ['Luna', luna.enabled ? 'On' : 'Off', 1], ['Luna photos queued', n(luna.queued)], ['Luna failed', n(luna.failed)],
      ['Luna analysed (7 days · total)', n(luna.analyzed_7d) + ' · ' + n(luna.analyzed)]
    ]));
    out.push(h('div', { class: 'grid wide' }, dist, health));
    out.push(metricsEditor(sig.metrics || [], d.role === 'owner'));
    out.push(lunaCard(luna, d.role === 'owner'));

    // Operations
    out.push(sectionTitle('Operations'));
    let mailCard = card('Email', status(mailState, mailState === 'good' ? 'healthy' : mailState === 'warn' ? 'backlog' : 'failing'));
    mailCard.body.appendChild(rows([
      ['Waiting to send', n(mail.pending), 1], ['Oldest waiting', mail.oldest_pending_at ? ago(mail.oldest_pending_at) : 'none'],
      ['Sent in 24 h', n(mail.sent_24h)], ['Daily limit', mail.daily_limit == null ? 'Provider quota (SES)' : n(mail.daily_limit)],
      ['Gave up after retries', n(mail.failing)]
    ]));
    let safetyCard = card('Safety and moderation', status(s.moderation_stuck || s.open_reports ? 'warn' : 'good', s.moderation_stuck || s.open_reports ? 'needs attention' : 'clear'));
    safetyCard.body.appendChild(rows([
      ['Open reports', n(s.open_reports), 1], ['Reports this week', n(s.reports_7d)], ['Moderation waiting', n(s.moderation_pending)],
      ['Moderation stuck (retries used)', n(s.moderation_stuck)], ['Flagged for review, 7 days', n(s.moderation_review)],
      ['Removed automatically, 7 days', n(s.moderation_removed_7d)]
    ]));
    let conn = card('Connections');
    conn.body.appendChild(rows([['Mutual connections', n(d.connections.total), 1], ['This week', n(d.connections.last_7d)], ['Still open', n(d.connections.open)]]));
    out.push(h('div', { class: 'grid three' }, mailCard, safetyCard, conn));

    let audit = card('Audit log', h('span', { class: 'muted small', text: 'Every change, append-only' }));
    audit.body.appendChild((d.audit || []).length ? h('ul', { class: 'list audit' }, d.audit.map(function (a) {
      return h('li', null, h('div', { text: describe(a) }), h('div', { class: 'when', text: when(a.at) + ' · ' + a.actor + (a.detail && a.detail.reason ? ' · “' + a.detail.reason + '”' : '') }));
    })) : h('p', { class: 'muted', text: 'No changes yet.' }));
    out.push(h('div', { style: 'margin-top:16px' }, audit));

    app.replaceChildren.apply(app, out);
  }

  function describe(a) {
    let x = a.detail || {};
    if (a.action === 'matching_metric.set') {
      let label = (METRICS[x.metric] || [x.metric])[0];
      let b = x.before || {}, af = x.after || {};
      let parts = [];
      if (b.enabled !== af.enabled) parts.push(af.enabled ? 'switched on' : 'switched off');
      if (Number(b.weight) !== Number(af.weight)) parts.push('weight ' + Number(b.weight).toFixed(2) + ' → ' + Number(af.weight).toFixed(2));
      return label + ': ' + (parts.join(', ') || 'saved');
    }
    if (a.action === 'luna.backfill') return 'Luna backfill: queued ' + x.queued + ' of ' + x.requested + ' photos';
    return a.action;
  }

  function metricsEditor(metrics, canEdit) {
    let byKey = {};
    metrics.forEach(function (x) { byKey[x.key] = { key: x.key, enabled: x.enabled, weight: Number(x.weight) }; });
    let draft = JSON.parse(JSON.stringify(byKey));
    let c = card('Signal switches and weights', h('span', { class: 'muted small', text: canEdit ? 'Changes recompute every estimate' : 'Read-only: owner role needed to change' }));
    let list = h('div', { class: 'metrics' });
    let shares = {};
    let reason = h('input', { type: 'text', placeholder: 'Why are you changing this? (kept in the audit log)', maxlength: '300', disabled: !canEdit });
    let saveBtn = h('button', { type: 'button', class: 'btn', text: 'Save changes', disabled: true });
    let resetBtn = h('button', { type: 'button', class: 'btn ghost', text: 'Discard', disabled: true });
    let err = h('p', { class: 'error', role: 'alert' });

    function changed() {
      return ORDER.filter(function (k) { return byKey[k] && (draft[k].enabled !== byKey[k].enabled || draft[k].weight !== byKey[k].weight); });
    }
    function update() {
      let total = ORDER.filter(function (k) { return k !== 'reception_similarity' && draft[k] && draft[k].enabled; })
        .reduce(function (sum, k) { return sum + draft[k].weight; }, 0);
      ORDER.forEach(function (k) {
        if (!shares[k]) return;
        shares[k].textContent = k === 'reception_similarity' ? (draft[k].enabled ? 'pair multiplier' : 'off')
          : draft[k].enabled && total ? Math.round((draft[k].weight / total) * 100) + '% of estimate' : 'not used';
        shares[k].row.classList.toggle('dirty', changed().indexOf(k) >= 0);
      });
      let dirty = changed().length > 0;
      saveBtn.disabled = !canEdit || !dirty;
      resetBtn.disabled = !dirty;
    }

    ORDER.forEach(function (k) {
      if (!byKey[k]) return;
      let max = k === 'reception_similarity' ? 0.2 : 1;
      let toggle = h('input', { type: 'checkbox', role: 'switch', 'aria-label': METRICS[k][0], disabled: !canEdit });
      toggle.checked = draft[k].enabled;
      let out = h('output', { text: draft[k].weight.toFixed(2) });
      let range = h('input', { type: 'range', min: '0', max: String(max), step: '0.01', value: String(draft[k].weight), 'aria-label': METRICS[k][0] + ' weight', disabled: !canEdit });
      toggle.addEventListener('change', function () { draft[k].enabled = toggle.checked; update(); });
      range.addEventListener('input', function () { draft[k].weight = Math.round(Number(range.value) * 100) / 100; out.textContent = draft[k].weight.toFixed(2); update(); });
      let share = h('div', { class: 'share' });
      let row = h('div', { class: 'metric' },
        h('label', { class: 'switch' }, toggle, h('span')),
        h('div', null, h('div', { class: 'name', text: METRICS[k][0] }), h('div', { class: 'desc', text: METRICS[k][1] })),
        h('div', { class: 'weight' }, range, out), share);
      share.row = row; shares[k] = share;
      list.appendChild(row);
    });

    resetBtn.addEventListener('click', function () { render(); });
    saveBtn.addEventListener('click', function () {
      let keys = changed();
      let why = reason.value.trim();
      err.textContent = '';
      if (why.length < 3) { err.textContent = 'Add a short reason first.'; reason.focus(); return; }
      if (draft.luna_presentation && draft.luna_presentation.enabled && !byKey.luna_presentation.enabled &&
          !confirm('Turn on Luna photo analysis? New photos will be sent to the image model, which costs API usage. Existing photos are only analysed if you queue a backfill.')) return;
      saveBtn.disabled = true;
      let chain = Promise.resolve();
      keys.forEach(function (k) {
        chain = chain.then(function () {
          if (DEMO) return demoSet(k, draft[k], why);
          return rpc('admin_set_matching_metric', { p_metric_key: k, p_enabled: draft[k].enabled, p_weight: draft[k].weight, p_reason: why });
        });
      });
      chain.then(refresh).catch(function (e) { err.textContent = e.message; saveBtn.disabled = false; refresh(); });
    });

    c.body.appendChild(list);
    c.body.appendChild(h('div', { class: 'savebar' }, reason, resetBtn, saveBtn));
    c.body.appendChild(err);
    c.body.appendChild(h('p', { class: 'note', text: 'Weights are shares of the enabled person-level signals, so switching one off rescales the rest automatically. To undo a change, set the values shown in the audit log again.' }));
    update();
    return h('div', { style: 'margin-top:16px' }, c);
  }

  function lunaCard(luna, canEdit) {
    let c = card('Luna photo backfill', luna.enabled ? status('good', 'on') : status('off', 'off'));
    c.body.appendChild(h('p', { class: 'muted', text: 'Turning Luna on analyses only new photos. Existing photos are queued here in small, confirmed batches so a switch can never run up a bill. Each photo is one low-detail image request.' }));
    let count = h('input', { type: 'number', min: '1', max: '50', value: '20', 'aria-label': 'Photos to queue' });
    let word = h('input', { type: 'text', placeholder: 'Type QUEUE', 'aria-label': 'Confirmation' });
    let go = h('button', { type: 'button', class: 'btn small', text: 'Queue photos', disabled: !canEdit || !luna.enabled });
    let err = h('p', { class: 'error', role: 'alert' });
    go.addEventListener('click', function () {
      err.textContent = '';
      let limit = Number(count.value);
      if (!(limit >= 1 && limit <= 50)) { err.textContent = 'Choose 1 to 50 photos.'; return; }
      if (word.value !== 'QUEUE') { err.textContent = 'Type QUEUE to confirm.'; return; }
      go.disabled = true;
      (DEMO ? demoBackfill(limit) : rpc('admin_queue_luna_backfill', { p_limit: limit, p_confirm: 'QUEUE' }))
        .then(function (res) { toast('Queued ' + res.queued + ' photos.'); return refresh(); })
        .catch(function (e) { err.textContent = e.message; go.disabled = false; });
    });
    c.body.appendChild(h('div', { class: 'inline-form' }, count, word, go));
    if (!luna.enabled) c.body.appendChild(h('p', { class: 'muted small', text: 'Switch Luna on above before queuing a backfill.' }));
    c.body.appendChild(err);
    return h('div', { style: 'margin-top:16px' }, c);
  }

  // ------------------------------------------------------------- demo data
  function demoSet(k, v, why) {
    let m = data.signals.metrics.filter(function (x) { return x.key === k; })[0];
    data.audit.unshift({ at: new Date().toISOString(), action: 'matching_metric.set', actor: 'You (demo)',
      detail: { metric: k, before: { enabled: m.enabled, weight: m.weight }, after: { enabled: v.enabled, weight: v.weight }, reason: why } });
    m.enabled = v.enabled; m.weight = v.weight; m.updated_at = new Date().toISOString();
    if (k === 'luna_presentation') data.luna.enabled = v.enabled;
    data.signals.config_version += 1; data.signals.config_updated_at = new Date().toISOString();
    return Promise.resolve();
  }
  function demoBackfill(limit) {
    data.luna.queued += limit;
    data.audit.unshift({ at: new Date().toISOString(), action: 'luna.backfill', actor: 'You (demo)', detail: { requested: limit, queued: limit } });
    return Promise.resolve({ queued: limit });
  }
  function sampleData() {
    let now = Date.now(), day = 86400000, daily = [];
    let counts = [182, 214, 199, 260, 311, 287, 342, 401, 377, 452, 498, 530, 611, 248];
    for (let i = 13; i >= 0; i--) daily.push({ day: new Date(now - i * day).toISOString().slice(0, 10), count: counts[13 - i] });
    let iso = function (ms) { return new Date(now - ms).toISOString(); };
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
          return { started_at: iso(i * day + 600000), finished_at: iso(i * day + 540000), mode: i === 2 ? 'shadow' : 'live', algorithm: 'v1',
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
        { at: iso(2 * day), action: 'matching_metric.set', actor: 'Owner', detail: { metric: 'bio_attention', before: { enabled: true, weight: 0.12 }, after: { enabled: true, weight: 0.1 }, reason: 'Bio time was over-weighted for long bios' } }
      ]
    };
  }

  // ------------------------------------------------------------- boot
  document.getElementById('refresh').addEventListener('click', function () { refresh(); });
  document.getElementById('sign-out').addEventListener('click', signOut);

  // Returning from Google: Supabase puts the session in the URL fragment.
  if (!DEMO && location.hash.indexOf('access_token=') >= 0) {
    let p = new URLSearchParams(location.hash.slice(1));
    save(fromTokens({ access_token: p.get('access_token'), refresh_token: p.get('refresh_token'), expires_in: p.get('expires_in') }));
    history.replaceState(null, '', location.pathname);
  } else if (!DEMO && location.hash.indexOf('error') >= 0) {
    let q = new URLSearchParams(location.hash.slice(1));
    history.replaceState(null, '', location.pathname);
    return showSignIn(q.get('error_description') || 'Sign-in did not complete.');
  }
  start();
})();
