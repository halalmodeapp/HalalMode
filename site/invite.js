// halalmo.de/invite: accept a referral after launch.
//
// 1. Show who invited you and that the code is ready.
// 2. Sign in with Apple, Google or an email link (Supabase Auth, on the web).
// 3. Save the referral to the new account (claim_invite), sign out of the
//    web session, and celebrate.
// 4. Send them to their phone's app store, or show a QR code on a computer.
// Until launch.js turns `inviteFlow` on, referral links go to the waitlist.
// The inviter is shown by first name, or by email when they have no name yet.
// `?demo` shows every screen with sample data and no sign-in.
(function () {
  'use strict';

  const URL_BASE = 'https://lfuuywsmydruvqkqwvzw.supabase.co';
  const KEY = 'sb_publishable_yioJpXVD_u-krXHgA7souQ_2pOiITsN';
  const PENDING = 'halal-mode-invite-pending';
  const REFERRAL = 'halal-mode-referral-code';
  const L = window.HALAL_MODE_LAUNCH || {};
  const params = new URLSearchParams(location.search);
  const DEMO = params.has('demo');
  const PREVIEW = params.has('preview');
  const t = function (key, vars) {
    let text = window.HalalI18n ? window.HalalI18n.t(key) : key;
    Object.keys(vars || {}).forEach(function (k) { text = text.split('{{' + k + '}}').join(vars[k]); });
    return text;
  };
  const $ = function (id) { return document.getElementById(id); };
  const valid = function (code) { return /^HM[A-Z0-9]{8}$/.test(String(code || '')); };
  const store = {
    get: function (k) { try { return localStorage.getItem(k) || ''; } catch (_e) { return ''; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (_e) { /* storage blocked */ } },
    del: function (k) { try { localStorage.removeItem(k); } catch (_e) { /* storage blocked */ } }
  };

  const ua = navigator.userAgent || '';
  const device = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'ios'
    : /Android/.test(ua) ? 'android' : 'desktop';

  const fromUrl = String(params.get('ref') || '').trim().toUpperCase();
  const code = valid(fromUrl) ? fromUrl : valid(store.get(PENDING)) ? store.get(PENDING) : (DEMO ? 'HMALI12345' : '');
  let inviter = null;
  let current = null;

  // Before launch, referral links still join the waitlist.
  if (!L.inviteFlow && !DEMO && !PREVIEW) {
    location.replace(code ? '/?ref=' + encodeURIComponent(code) : '/');
    return;
  }

  function request(path, opts) {
    opts = opts || {};
    const headers = { apikey: KEY, 'Content-Type': 'application/json', Authorization: 'Bearer ' + (opts.token || KEY) };
    return fetch(URL_BASE + path, { method: opts.method || 'POST', headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined, credentials: 'omit' })
      .then(function (res) {
        return res.text().then(function (text) {
          let body = null;
          try { body = text ? JSON.parse(text) : null; } catch (_e) { body = text; }
          if (!res.ok) { const err = new Error((body && (body.message || body.msg)) || ('HTTP ' + res.status)); err.status = res.status; err.hint = body && body.hint; throw err; }
          return body;
        });
      });
  }

  // ---------------------------------------------------------------- screens
  function show(id) {
    ['step-start', 'step-working', 'step-done', 'step-other'].forEach(function (s) { $(s).hidden = s !== id; });
    current = id;
  }
  function who() { return inviter && (inviter.name || inviter.email); }
  function renderStart() {
    $('invite-title').textContent = who() ? t('inviteBy', { name: who() }) : t('inviteAnon');
    const ready = $('invite-ready');
    const parts = t('inviteReady', { code: '\u0000' }).split('\u0000');
    ready.replaceChildren(document.createTextNode(parts[0] || ''), Object.assign(document.createElement('b'), { className: 'code', textContent: code, dir: 'ltr' }), document.createTextNode(parts[1] || ''));
    // Apple first on iPhone; Google first everywhere else; email last.
    const box = $('sign-in-buttons');
    if (device === 'ios') box.append($('btn-apple'), $('btn-google'), $('btn-email'));
    else box.append($('btn-google'), $('btn-apple'), $('btn-email'));
    document.title = $('invite-title').textContent;
  }
  function renderDone() {
    $('done-body').textContent = who() ? t('inviteLinked', { name: who() }) : t('inviteLinkedAnon');
    const ios = $('store-ios'), android = $('store-android');
    ios.href = L.appStoreUrl || '#'; android.href = L.playStoreUrl || '#';
    ios.classList.toggle('soon', !L.appStoreUrl); android.classList.toggle('soon', !L.playStoreUrl);
    // Phones see their own store; computers see the QR code and both stores.
    ios.hidden = device === 'android';
    android.hidden = device === 'ios';
    $('qr').hidden = device !== 'desktop';
    document.title = t('inviteDone');
  }
  function renderOther(state) {
    const text = { already: 'inviteAlready', own: 'inviteOwn', too_late: 'inviteMember', invalid: 'inviteInvalid' }[state] || 'inviteFailed';
    $('other-title').textContent = t(text);
    $('other-body').hidden = true;
    const action = $('other-action');
    if (state === 'own') { action.href = '/refer'; action.textContent = t('navRefer'); }
    else { action.href = '/get'; action.textContent = t('inviteGetApp'); }
    document.title = t(text);
  }
  function rerender() {
    if (current === 'step-start') renderStart();
    else if (current === 'step-done') renderDone();
    else if (current === 'step-other') renderOther($('step-other').dataset.state);
  }
  document.addEventListener('halal:language', rerender);

  function finish(result) {
    store.del(PENDING); store.del(REFERRAL);
    if (result && result.valid !== false) inviter = result;
    if (result && result.state === 'claimed') {
      show('step-done'); renderDone(); confetti();
      // On a phone, open its store after a moment; the buttons stay as a fallback.
      const url = device === 'ios' ? L.appStoreUrl : device === 'android' ? L.playStoreUrl : '';
      if (url && !DEMO) setTimeout(function () { location.href = url; }, 2600);
    } else {
      $('step-other').dataset.state = (result && result.state) || 'failed';
      show('step-other'); renderOther($('step-other').dataset.state);
    }
  }

  // ---------------------------------------------------------------- sign-in
  function returnAddress() { return location.origin + '/invite?ref=' + encodeURIComponent(code); }
  function oauth(provider) {
    if (DEMO) { show('step-working'); setTimeout(function () { finish({ state: 'claimed', name: inviter && inviter.name }); }, 600); return; }
    store.set(PENDING, code);
    location.assign(URL_BASE + '/auth/v1/authorize?provider=' + provider + '&redirect_to=' + encodeURIComponent(returnAddress()));
  }
  $('btn-apple').addEventListener('click', function () { oauth('apple'); });
  $('btn-google').addEventListener('click', function () { oauth('google'); });
  $('btn-email').addEventListener('click', function () {
    $('email-form').hidden = false; $('btn-email').hidden = true; $('email').focus();
  });
  $('email-form').addEventListener('submit', function (e) {
    e.preventDefault();
    const email = $('email').value.trim().toLowerCase();
    const note = $('start-note');
    note.className = 'note';
    if (!/^\S+@\S+\.\S+$/.test(email)) { note.textContent = t('validationEmail'); note.className = 'note bad'; return; }
    $('email-send').disabled = true;
    store.set(PENDING, code);
    (DEMO ? Promise.resolve() : request('/auth/v1/otp?redirect_to=' + encodeURIComponent(returnAddress()), { body: { email: email, create_user: true } }))
      .then(function () { note.textContent = t('inviteEmailSent'); })
      .catch(function () { note.textContent = t('inviteFailed'); note.className = 'note bad'; $('email-send').disabled = false; });
  });

  // Back from Apple, Google or the email link: save the referral, then sign
  // out of the web session. The app signs in on its own.
  function completeSignIn(token) {
    show('step-working');
    request('/rest/v1/rpc/claim_invite', { token: token, body: { p_code: code } })
      .then(function (result) {
        request('/auth/v1/logout', { token: token }).catch(function () { return null; });
        finish(result);
      })
      .catch(function (e) {
        // Not signed in (or the sign-in expired): back to the buttons, saying why.
        if (e.status === 401 || e.status === 403 || e.hint === 'sign_in') {
          show('step-start'); renderStart();
          $('start-note').textContent = t('inviteSignInFirst'); $('start-note').className = 'note bad';
          return;
        }
        $('step-other').dataset.state = 'failed'; show('step-other'); renderOther('failed');
      });
  }

  // ---------------------------------------------------------------- confetti
  function confetti() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = $('confetti');
    const ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return;
    canvas.hidden = false;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    ctx.scale(dpr, dpr);
    const colors = ['#FC3C6C', '#B8914F', '#2F5D4A', '#F2C14E', '#FFFFFF'];
    const bits = [];
    for (let i = 0; i < 140; i++) {
      bits.push({ x: innerWidth / 2 + (Math.random() - 0.5) * 120, y: innerHeight * 0.35, vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 12 - 4,
        w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3, c: colors[i % colors.length] });
    }
    const start = performance.now();
    (function frame(now) {
      const elapsed = now - start;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      bits.forEach(function (b) {
        b.vy += 0.32; b.vx *= 0.99; b.x += b.vx; b.y += b.vy; b.r += b.vr;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r);
        ctx.globalAlpha = Math.max(0, 1 - elapsed / 3200);
        ctx.fillStyle = b.c; ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); ctx.restore();
      });
      if (elapsed < 3200) requestAnimationFrame(frame); else canvas.hidden = true;
    })(start);
  }

  // ---------------------------------------------------------------- start
  const hash = new URLSearchParams(location.hash.slice(1));
  if (hash.get('access_token') && code) {
    history.replaceState(null, '', location.pathname + '?ref=' + encodeURIComponent(code) + (PREVIEW ? '&preview' : ''));
    request('/rest/v1/rpc/referral_inviter', { body: { p_code: code } }).then(function (r) { inviter = r; }, function () { return null; })
      .then(function () { completeSignIn(hash.get('access_token')); });
    return;
  }
  if (hash.get('error')) history.replaceState(null, '', location.pathname + location.search);

  if (!code) { $('step-other').dataset.state = 'invalid'; show('step-other'); renderOther('invalid'); return; }
  (DEMO ? Promise.resolve({ valid: true, code: code, name: 'Ali' }) : request('/rest/v1/rpc/referral_inviter', { body: { p_code: code } }))
    .then(function (r) {
      if (!r || !r.valid) { $('step-other').dataset.state = 'invalid'; show('step-other'); renderOther('invalid'); return; }
      inviter = r;
      show('step-start'); renderStart();
      if (hash.get('error')) { $('start-note').textContent = t('inviteFailed'); $('start-note').className = 'note bad'; }
    })
    .catch(function () { $('step-other').dataset.state = 'failed'; show('step-other'); renderOther('failed'); });
})();
