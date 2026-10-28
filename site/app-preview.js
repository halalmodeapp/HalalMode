/*
 * A looping preview of the Halal Mode app for How it works.
 *
 * It rebuilds the screens that make the app different in HTML, following the
 * app's own screens and wording (You > Preferences, the match, questions,
 * answers, recap and chat screens, and the Halal Cards hub), and plays a
 * 38-second loop through five pillars: five verified introductions, a profile
 * that shows where you already agree, private preferences (and the Premium
 * filters), the path from a mutual match to a chat, and Halal Cards. A pill at
 * the top names the pillar on screen. The deck and the arc of faces use the
 * app's own geometry (HeroCard.tsx, lib/arcLayout.ts) and its spring
 * constants, so it moves the way the app does.
 *
 * Markup: <div data-app-preview></div>, plus optional step elements
 * [data-preview-step="0..4"] anywhere on the page, which light up in time
 * with the loop and jump to their part of it when clicked.
 */
(() => {
  'use strict';
  const host = document.querySelector('[data-app-preview]');
  if (!host) return;

  const IMG = '/img/preview/';
  const PEOPLE = [
    { first: 'Amina', age: 26, city: 'London', job: 'Clinical neuroscientist', img: 'amina.webp' },
    { first: 'Yasmine', age: 25, city: 'Manchester', job: 'UX strategist', img: 'yasmine.webp' },
    {
      first: 'Maryam', name: 'Maryam El-Farouk', age: 27, city: 'London', job: 'Fintech product manager', img: 'maryam.webp',
      chips: ['Practicing', 'Within a year', 'Tennis', 'Culinary arts'],
      bio: 'Ambitious at work, but home is where my heart rests. Tennis, North African cooking, and Seerah study.',
    },
    { first: 'Layla', age: 24, city: 'Birmingham', job: 'Pediatric physiotherapist', img: 'layla.webp' },
    { first: 'Salma', age: 28, city: 'Cambridge', job: 'Environmental lawyer', img: 'salma.webp' },
  ];
  const OPEN = 2; // the profile opened and chosen in the loop

  // ---------------------------------------------------------------- the loop's moments (seconds)
  const LOOP = 38.2;
  const M = {
    swipe1: [0.6, 0.95], swipe2: [1.7, 2.05],
    tapCard: 2.85, push: [3.0, 3.45],
    scroll: [3.9, 4.7], tapSelect: 5.4, back: [5.75, 6.2], chosen: 6.25,
    dip: [37.3, 38.2],
  };
  // Scenes fade in over the one before: in from a to b, and gone once the next is fully in (d).
  const W = {
    prefs: [6.9, 7.2, 0, 16.25],
    match: [15.9, 16.2, 0, 18.85],
    questions: [18.5, 18.8, 0, 21.45],
    answer: [21.1, 21.4, 0, 24.05],
    recap: [23.7, 24.0, 0, 27.95],
    chat: [27.6, 27.9, 0, 31.05],
    cards: [30.7, 31.0, 0, 37.7],
  };
  const STEPS = [0, 3.0, 6.9, 15.9, 30.7];
  const TAGS = [
    [0, 'Every profile verified'], [3.0, 'Matched on what you share'], [6.9, 'Preferences stay private'],
    [12.8, 'Premium filters, private'], [15.9, 'A mutual choice is a match'], [18.5, 'Questions you both choose'],
    [21.1, 'Sealed until you both share'], [23.7, 'AI summary of your answers'], [27.6, 'Chat opens after answers'],
    [30.7, '35 Halal Cards to play'], [33.0, 'Quizzes, stories, workshops'],
  ];

  // ---------------------------------------------------------------- maths
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const ease = (p) => 1 - Math.pow(1 - clamp(p), 3);
  const easeInOut = (p) => { p = clamp(p); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
  // A damped spring's progress t seconds after release (the app's Reanimated springs).
  function spring(t, k, c, m = 1) {
    if (t <= 0) return 0;
    const w0 = Math.sqrt(k / m), z = c / (2 * Math.sqrt(k * m)), wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t));
  }
  const deckSpring = (t) => spring(t, 165, 18);         // HeroCard swipe settle
  const arcSpring = (t) => spring(t, 170, 18, 0.9);     // motion.arc
  const press = (t, when) => Math.exp(-Math.pow((t - when) * 9, 2));

  // ---------------------------------------------------------------- the screen (390 x 844, the app's phone size)
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  host.classList.add('ap');
  const device = el('div', 'ap-device');
  const screen = el('div', 'ap-screen');
  device.appendChild(screen); host.appendChild(device);

  const tabbar = (on) => `<div class="ap-tabbar">${[
    ['Daily', '<path d="M12 3v2M12 19v2M4.2 7l1.7 1M18.1 16l1.7 1M3 12h2M19 12h2M4.2 17l1.7-1M18.1 8l1.7-1"/><circle cx="12" cy="12" r="4"/>'],
    ['Connections', '<path d="M4 5h16v11H9l-5 4z"/>'],
    ['You', '<circle cx="12" cy="7.5" r="5"/><path d="M2.5 23.5c0-5.8 4.3-9.5 9.5-9.5s9.5 3.7 9.5 9.5"/>'],
  ].map(([name, icon], i) => `<div class="ap-tab${i === on ? ' on' : ''}"><svg viewBox="0 0 24 24">${icon}</svg><span>${name}</span></div>`).join('')}</div>`;
  const SHIELD = '<svg viewBox="0 0 24 24"><path d="M12 2.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6z"/><path d="M8.2 12.2l2.7 2.7 5-5.3"/></svg>';
  const CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const header = (label) => `<div class="ap-header"><span class="ap-back">‹</span><span class="ap-micro">${label || ''}</span></div>`;
  const q = (root, sel) => root.querySelector(sel);
  const qa = (root, sel) => [...root.querySelectorAll(sel)];

  screen.appendChild(el('div', 'ap-status', '<span>9:41</span><span class="ap-status-icons"><i class="ap-bars"></i><i class="ap-batt"></i></span>'));

  // ---------------------------------------------------------------- 1. Daily introductions
  const daily = el('div', 'ap-view ap-daily');
  daily.innerHTML = `
    <img class="ap-logo" src="/logo.svg" alt="">
    <div class="ap-title">5 Daily introductions</div>
    <div class="ap-micro ap-countdown">Resets at Fajr in London · 04:12:08</div>
    <div class="ap-deck"></div>
    <div class="ap-arc"></div>
    <div class="ap-caption"></div>
    <div class="ap-actions"><div class="ap-btn ap-btn-secondary ap-select"></div><div class="ap-btn ap-btn-primary ap-send"></div></div>
    ${tabbar(0)}`;
  screen.appendChild(daily);
  const deckEl = q(daily, '.ap-deck'), arcEl = q(daily, '.ap-arc');
  const captionEl = q(daily, '.ap-caption'), selectEl = q(daily, '.ap-select'), sendEl = q(daily, '.ap-send');
  const cards = PEOPLE.map((p, i) => {
    const c = el('div', 'ap-card', `<img src="${IMG + p.img}" alt=""><div class="ap-card-shade"></div><div class="ap-verified">${SHIELD}Verified</div><div class="ap-tick">✓</div>
      <div class="ap-card-cap"><div class="ap-card-name">${p.first}</div><div class="ap-card-line">${p.age} · ${p.city} · ${p.job}</div></div>`);
    deckEl.appendChild(c);
    return { el: c, tick: q(c, '.ap-tick'), seal: q(c, '.ap-verified'), i };
  });
  const faces = PEOPLE.map((p) => {
    const f = el('div', 'ap-face', `<div class="ap-face-frame"><img src="${IMG + p.img}" alt=""><div class="ap-face-scrim"></div></div>`);
    arcEl.appendChild(f);
    return { el: f, frame: f.firstChild, scrim: q(f, '.ap-face-scrim') };
  });

  // ---------------------------------------------------------------- 2. An introduction's profile
  const P = PEOPLE[OPEN];
  const detail = el('div', 'ap-view ap-detail');
  detail.innerHTML = `
    ${header(`Introduction ${OPEN + 1} of 5`)}
    <div class="ap-scroll">
      <div class="ap-hero"><img src="${IMG + P.img}" alt=""><div class="ap-verified ap-verified-hero">${SHIELD}Verified</div><div class="ap-badge"><i></i>3 photos</div>
        <div class="ap-hero-shade"><div class="ap-hero-name">${P.name}</div><div class="ap-hero-line">${P.age} · ${P.city} · ${P.job}</div></div></div>
      <div class="ap-chips">${P.chips.map((c) => `<span class="ap-chip">${c}</span>`).join('')}</div>
      <p class="ap-bio">${P.bio}</p>
      <div class="ap-agree"><div class="ap-micro">Where you already agree</div>
        <div class="ap-row"><span>Marriage timing</span><b>A similar pace for marriage</b></div>
        <div class="ap-row"><span>Family plans</span><b>A shared direction for family plans</b></div>
        <div class="ap-row"><span>Location</span><b>In the same city</b></div>
        <div class="ap-privacy">Your private filters stay private. Neither person can see the other’s ranges.</div></div>
      <div class="ap-btn ap-btn-primary ap-choose">Select</div>
    </div>`;
  screen.appendChild(detail);
  const scrollEl = q(detail, '.ap-scroll'), chooseEl = q(detail, '.ap-choose'), agreeEl = q(detail, '.ap-agree');

  // ---------------------------------------------------------------- 3. You > Preferences (and the Premium filters)
  const slider = (cls) => `<div class="ap-track ${cls}"><i class="ap-fill"></i><i class="ap-thumb ap-ta"></i><i class="ap-thumb ap-tb"></i></div>`;
  const must = (cls = '') => `<div class="ap-must2 ${cls}"><i class="ap-box">${CHECK}</i><span>Must have</span></div>`;
  const checks = (names, on, cls = '') => `<div class="ap-checks ${cls}">${names.map((n) => `<div class="ap-check${on.includes(n) ? ' on' : ''}"><i class="ap-box">${CHECK}</i><span>${n}</span></div>`).join('')}</div>`;
  const select = (label, value, cls) => `<div class="ap-selfield ${cls}"><div class="ap-micro">${label}</div><div class="ap-selbox"><span class="ap-selval">${value}</span><i>⌄</i></div></div>`;
  const you = el('div', 'ap-view ap-fade ap-youv');
  you.innerHTML = `
    <div class="ap-yhead">
      <img class="ap-ylogo" src="/logo.svg" alt="">
      <div class="ap-seg"><span>Profile</span><span class="on">Preferences</span><span>Settings</span></div>
      <div class="ap-ident"><div class="ap-yav">Y</div><div><b>Yusuf Rahman</b><span>Private choices used to find suitable introductions.</span></div></div>
    </div>
    <div class="ap-pclip"><div class="ap-pscroll">
      <div class="ap-pcard">
        <div class="ap-accent">Partner preferences</div>
        <div class="ap-ptitle">Age, height and location</div>
        <p class="ap-pbody">Choose the age, height, body types and locations that work for you. These choices stay private.</p>
        <div class="ap-psec"><div class="ap-prow2"><span class="ap-micro">Age range</span><span class="ap-cap ap-age-val"></span></div>${slider('ap-age')}${must()}</div>
        <div class="ap-psec"><div class="ap-prow2"><span class="ap-micro ap-h-lab"></span><b class="ap-hval ap-h-val"></b></div>${slider('ap-ht')}${must('ap-must-h')}</div>
        <div class="ap-psec">${select('Body types', 'Average', 'ap-build')}${must()}</div>
        <div class="ap-psec ap-practice-sec"><div class="ap-micro">Religious practice</div><p class="ap-note2">These choices stay private and only help us find more suitable introductions.</p>
          ${checks(['Very practicing', 'Practicing', 'Moderate', 'Learning'], ['Practicing'], 'ap-practice')}${must()}</div>
        <div class="ap-psec"><div class="ap-micro">When they want to marry</div><p class="ap-note2">Choose the timeframes that work for you.</p>
          ${checks(['Within 3 months', 'Within 6 months', 'Within a year', 'One to two years'], ['Within a year'])}${must()}</div>
      </div>
      <div class="ap-pdark">
        <div class="ap-pdhead"><img src="/logo.svg" alt=""><div class="ap-pdfilters">Filters</div><i class="ap-rule"></i>
          <p>With Halal Mode Premium. A filter only rules people out when “Must have” is on.</p></div>
        <div class="ap-pdbody">
          <div class="ap-micro">Has children</div>
          <div class="ap-dchips"><span class="ap-dchip ap-nochild">No children</span><span class="ap-dchip">Has children</span></div>
          <div class="ap-must2 ap-dmust ap-must-d"><i class="ap-box">${CHECK}</i><span>Must have</span></div>
          ${select('Education level', 'Any', 'ap-edu')}
          ${select('Languages spoken', 'English, Arabic', 'ap-lang')}
        </div>
      </div>
    </div></div>
    ${tabbar(2)}`;
  screen.appendChild(you);
  const sl = (cls) => ({ track: q(you, cls), fill: q(you, `${cls} .ap-fill`), a: q(you, `${cls} .ap-ta`), b: q(you, `${cls} .ap-tb`) });
  const ageS = sl('.ap-age'), htS = sl('.ap-ht');
  const ageVal = q(you, '.ap-age-val'), htVal = q(you, '.ap-h-val'), htLab = q(you, '.ap-h-lab');
  const pscroll = q(you, '.ap-pscroll'), pclip = q(you, '.ap-pclip');
  const buildVal = q(you, '.ap-build .ap-selval'), buildBox = q(you, '.ap-build .ap-selbox');
  const mustH = q(you, '.ap-must-h'), mustD = q(you, '.ap-must-d');
  const practiceChecks = qa(you, '.ap-practice .ap-check'), practiceSec = q(you, '.ap-practice-sec');
  const pdark = q(you, '.ap-pdark'), nochild = q(you, '.ap-nochild');
  const eduVal = q(you, '.ap-edu .ap-selval'), eduBox = q(you, '.ap-edu .ap-selbox');

  // ---------------------------------------------------------------- 4. Match, questions, answers, recap, chat
  const matchV = el('div', 'ap-view ap-fade ap-matchv');
  matchV.innerHTML = `
    <div class="ap-close">✕</div>
    <div class="ap-micro ap-brand">Halal Mode</div>
    <div class="ap-display">It is a mutual match.</div>
    <div class="ap-pair">
      <div class="ap-plate ap-pl"><div class="ap-avatar ap-yous"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4.2"/><path d="M3.5 21c0-5 3.8-8 8.5-8s8.5 3 8.5 8"/></svg></div><b>You</b></div>
      <div class="ap-heart">♥</div>
      <div class="ap-plate ap-pr"><div class="ap-avatar"><img src="${IMG + P.img}" alt=""></div><b>${P.first}</b></div>
    </div>
    <p class="ap-explain">Messaging opens after you each choose three important questions, answer privately, and read each other’s answers.</p>
    <div class="ap-btn ap-btn-primary ap-matchbtn">Choose questions</div>
    <div class="ap-quiet">Maybe later</div>
    <div class="ap-confetti"></div>`;
  screen.appendChild(matchV);
  const plateL = q(matchV, '.ap-pl'), plateR = q(matchV, '.ap-pr'), heartEl = q(matchV, '.ap-heart');
  const matchTitle = q(matchV, '.ap-display'), matchBtn = q(matchV, '.ap-matchbtn'), matchRest = qa(matchV, '.ap-explain, .ap-matchbtn, .ap-quiet');
  const confettiEl = q(matchV, '.ap-confetti');
  const COLORS = ['#C5A054', '#FC3C6C', '#0A0A0A', '#E8D3A0', '#FC3C6C'];
  const bits = Array.from({ length: 34 }, (_, i) => {
    const f = ((i * 0.618) % 1), ang = -Math.PI * (0.08 + 0.84 * f), sp = 230 + ((i * 53) % 190);
    const e = el('i', 'ap-bit'); e.style.background = COLORS[i % COLORS.length]; e.style.width = `${6 + (i % 3) * 2}px`; e.style.height = `${9 + (i % 2) * 4}px`;
    confettiEl.appendChild(e);
    return { e, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, rot: (i * 47) % 360, spin: ((i % 2) ? 1 : -1) * (240 + (i * 37) % 300) };
  });

  const QUESTIONS = [
    ['Faith', 'How do you keep your faith alive in a busy week?'],
    ['Family', 'What role do you want both families to have after marriage?'],
    ['Money', 'How would we handle money together?'],
    ['Handling disagreements', 'What do you do when we disagree?'],
    ['Future plans', 'Where do you see us living in five years?'],
  ];
  const MINE = [0, 2, 3];
  const questionsV = el('div', 'ap-view ap-fade ap-questions');
  questionsV.innerHTML = `
    ${header('')}
    <div class="ap-qhead"><div class="ap-micro">Step 1 of 3 · with ${P.first}</div>
      <div class="ap-h1">Choose the three questions that matter most.</div>
      <p class="ap-sub2">${P.first} chooses three separately. Shared choices are marked when both sets are ready.</p></div>
    <div class="ap-qlist">${QUESTIONS.map(([cat, text]) => `<div class="ap-qcard"><div class="ap-qtxt"><div class="ap-micro">${cat}</div><div class="ap-qtext">${text}</div></div><i class="ap-dot"></i></div>`).join('')}</div>
    <div class="ap-qfoot"><span class="ap-qcount"></span><div class="ap-btn ap-btn-primary ap-qbtn">Answer them</div></div>`;
  screen.appendChild(questionsV);
  const qcards = qa(questionsV, '.ap-qcard'), qcount = q(questionsV, '.ap-qcount'), qbtn = q(questionsV, '.ap-qbtn');

  const ANS_MINE = 'I take a breath, say what I need calmly, and apologise first when I was wrong.';
  const ANS_THEIRS = 'I need a little time to think, then I come back and talk it through.';
  const answerV = el('div', 'ap-view ap-fade ap-answerv');
  answerV.innerHTML = `
    ${header('')}
    <div class="ap-qhead"><div class="ap-micro">Step 2 of 3 · question 3 of 3</div>
      <div class="ap-ticks"><i class="on"></i><i class="on"></i><i class="on"></i></div>
      <div class="ap-origin"><i>✓</i><span class="ap-accent">${P.first} also chose this question!</span></div>
      <div class="ap-h1 ap-aq">${QUESTIONS[3][1]}</div></div>
    <div class="ap-answer ap-mine2"><div class="ap-micro">Your answer</div><p class="ap-typed2"></p></div>
    <div class="ap-theirs2"><div class="ap-micro ap-tlab">${P.first}’s answer</div>
      <div class="ap-sealed"><p class="ap-sealtxt">${P.first}’s answers stay sealed until you have answered all of yours. Your answers cannot be edited once sent.</p></div>
      <p class="ap-hid">Hidden until you answer every question.</p>
      <p class="ap-theirtxt">${ANS_THEIRS}</p></div>
    <div class="ap-qfoot"><span class="ap-quiet2">Back</span><div class="ap-btn ap-btn-primary ap-finish">Finish</div></div>`;
  screen.appendChild(answerV);
  const typed2 = q(answerV, '.ap-typed2'), sealed = q(answerV, '.ap-sealed'), hid = q(answerV, '.ap-hid'), theirTxt = q(answerV, '.ap-theirtxt');
  const tlab = q(answerV, '.ap-tlab'), finishBtn = q(answerV, '.ap-finish');

  const SUMMARY = 'You both stay calm in a disagreement and make time to talk it through. Where you differ is pace: one of you needs space first, which is worth talking about.';
  const recapV = el('div', 'ap-view ap-fade ap-recapv');
  recapV.innerHTML = `
    ${header('')}
    <div class="ap-rscroll"><div class="ap-rinner">
      <div class="ap-micro">Step 3 of 3 · recap</div><div class="ap-h1">Your answers, side by side</div>
      <p class="ap-sub2">A private overview of where your answers align and differ.</p>
      <div class="ap-sum"><div class="ap-micro">✦ Halal Mode Bot summary</div>
        <div class="ap-prep"><div class="ap-prept">Preparing summary. Please wait a few moments.</div><div class="ap-bar"><i></i></div></div>
        <p class="ap-sumtext"></p></div>
      <div class="ap-rsec"><b>Your answers together</b>
        <div class="ap-pair2"><div class="ap-micro">${QUESTIONS[3][1]}</div>
          <div class="ap-pairrow"><span class="ap-micro">You</span><p>${ANS_MINE}</p></div>
          <div class="ap-pairrow"><span class="ap-micro">${P.first}</span><p>${ANS_THEIRS}</p></div></div></div>
      <div class="ap-rsec ap-compat2"><b>Compatibility overview</b>
        <p class="ap-note2">A private, high-level view of areas to explore together. It never shows a score, filters, or either person’s exact preferences.</p>
        <div class="ap-ccard"><div class="ap-chead"><b>Values</b><em class="ok">A shared direction</em></div><p>Your private information indicates a compatible direction in this area.</p></div>
        <div class="ap-ccard"><div class="ap-chead"><b>Marriage timing</b><em class="ok">A shared direction</em></div><p>Your private information indicates a compatible direction in this area.</p></div>
        <div class="ap-ccard"><div class="ap-chead"><b>Family plans</b><em class="warn">Worth discussing</em></div><p>There may be a practical difference here. Discuss it openly if you continue.</p></div></div>
      <div class="ap-btn ap-btn-primary ap-open">Open conversation</div>
      <div class="ap-quiet ap-quiet3">Close politely instead</div>
    </div></div>`;
  screen.appendChild(recapV);
  const rscroll = q(recapV, '.ap-rinner'), sumText = q(recapV, '.ap-sumtext'), prep = q(recapV, '.ap-prep'), barFill = q(recapV, '.ap-bar i');
  const openBtn = q(recapV, '.ap-open');

  const OPENER = 'What is one small thing that made you smile this week?';
  const MSG_OUT = 'Assalamu alaikum! I liked how you handle disagreements.';
  const MSG_IN = 'Wa alaikum assalam! Thank you, yours made me smile.';
  const chatV = el('div', 'ap-view ap-fade ap-chatv');
  chatV.innerHTML = `
    <div class="ap-header ap-chathead"><span class="ap-back">←</span><img class="ap-mini" src="${IMG + P.img}" alt=""><div><b>${P.first}</b><span>Day 1 · 3 questions answered</span></div></div>
    <div class="ap-botwrap"><div class="ap-bot"><div class="ap-botname">Halal Mode bot</div><p>An ice-breaker, if it helps. How about asking them:</p><div class="ap-opener">${OPENER}</div></div></div>
    <div class="ap-msgs">
      <div class="ap-bub ap-out ap-m1">${MSG_OUT}<span>9:42</span></div>
      <div class="ap-bub ap-in ap-m2">${MSG_IN}<span>9:43</span></div>
      <div class="ap-bub ap-in ap-dots"><i></i><i></i><i></i></div></div>
    <div class="ap-composer"><div class="ap-input"></div><div class="ap-sendc">→</div></div>`;
  screen.appendChild(chatV);
  const botWrap = q(chatV, '.ap-botwrap'), m1 = q(chatV, '.ap-m1'), m2 = q(chatV, '.ap-m2'), dots = q(chatV, '.ap-dots');
  const inputEl = q(chatV, '.ap-input'), sendC = q(chatV, '.ap-sendc');

  // ---------------------------------------------------------------- 5. Halal Cards (the hub, then a quiz and a story)
  const GATES = [
    ['1', 'Relationship Lab', 'section-lab', '4 workshops', 'Four short workshops on why marriages work and why they struggle. Each is a run of real-life situations: you both choose in private, see where each choice leads, then talk.', '#8A6A2A'],
    ['2', 'Relationship Quizzes', 'section-quiz', '16 decks', 'Quick, playful card decks for getting to know each other, guessing games, would-you-rathers and same-page checks on money, family and the future.', '#2F5D4A'],
    ['3', 'Relationship Adventures', 'section-adventure', '15 stories', 'Choose-your-own-path stories about a married couple. Take turns deciding, sometimes in secret, sometimes together, and see where it leads.', '#B05A3C'],
  ];
  const cardsV = el('div', 'ap-view ap-fade ap-cards');
  cardsV.innerHTML = `
    <div class="ap-cscroll">
      <div class="ap-chero"><img src="${IMG}cards/hub-hero.webp" alt="">
        <div class="ap-chtext"><div class="ap-eyebrow">Halal Cards with ${P.first}</div><div class="ap-ctitle">Halal Cards</div>
          <p>Understand each other, learn why relationships work and fail, and practise healthier patterns, together.</p></div></div>
      <div class="ap-ccol">
        <div class="ap-journal"><i class="ap-spine"></i><div><div class="ap-jt">❦ Shared Journal</div><p>Your agreements and lessons, kept together.</p>
          <div class="ap-jline">Pray together before big decisions</div><div class="ap-jline">Weekly check-in on Friday</div></div></div>
        ${GATES.map(([n, title, img, count, body, tint]) => `<div class="ap-gblock"><div class="ap-ghead"><span style="color:${tint}">${n}</span><b>${title}</b></div>
            <div class="ap-gate"><div class="ap-gimg"><img src="${IMG}cards/${img}.webp" alt=""><div class="ap-eyebrow ap-gcount">${count}</div></div>
              <div class="ap-gbody"><p>${body}</p><div class="ap-explore">Explore ›</div></div></div></div>`).join('')}
      </div>
    </div>
    <div class="ap-cstatus"></div>
    <div class="ap-play ap-quiz">
      <img src="${IMG}cards/quiz-know-me.webp" alt="">
      <div class="ap-micro">Relationship Quizzes · Card 3 of 8</div><div class="ap-h2">What’s my ideal weekend?</div>
      <div class="ap-opt">Quiet at home</div><div class="ap-opt ap-pick">Out exploring together</div><div class="ap-opt">With family</div>
      <div class="ap-match">${SHIELD}${P.first} chose the same. Talk about why.</div>
    </div>
    <div class="ap-play ap-story">
      <img src="${IMG}cards/adv-offer.webp" alt="">
      <div class="ap-micro">Relationship Adventures · Chapter 1</div><div class="ap-h2">A job offer in another city. Your spouse hesitates.</div>
      <div class="ap-opt ap-spick">Talk it through together</div><div class="ap-opt">Decide first, explain later</div>
      <div class="ap-match ap-smatch">${SHIELD}You both chose to talk it through.</div>
    </div>`;
  screen.appendChild(cardsV);
  const cstatus = q(cardsV, '.ap-cstatus'), cscroll = q(cardsV, '.ap-cscroll'), gates = qa(cardsV, '.ap-gate'), gblocks = qa(cardsV, '.ap-gblock');
  const quizEl = q(cardsV, '.ap-quiz'), storyEl = q(cardsV, '.ap-story');
  const pickEl = q(cardsV, '.ap-pick'), matchEl = q(quizEl, '.ap-match');
  const spickEl = q(cardsV, '.ap-spick'), smatchEl = q(storyEl, '.ap-smatch');

  // ---------------------------------------------------------------- overlays
  const tag = el('div', 'ap-tag', '<i></i><span></span>'); screen.appendChild(tag);
  const tagText = q(tag, 'span');
  const finger = el('div', 'ap-finger'); screen.appendChild(finger);
  const dip = el('div', 'ap-dip'); screen.appendChild(dip);

  // Where a tap lands, read from the layout so it cannot drift from the screen.
  // Content inside a scrolled column is offset by how far that column has moved.
  let youY = 0, cardsY = 0, recapY = 0;
  const scrolls = [[pscroll, () => youY], [cscroll, () => cardsY], [rscroll, () => recapY]];
  const at = (node) => {
    let x = node.offsetWidth / 2, y = node.offsetHeight / 2, n = node;
    while (n && n !== screen) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    scrolls.forEach(([box, get]) => { if (box.contains(node)) y -= get(); });
    return [x, y];
  };
  const topIn = (node, box) => { let y = 0, n = node; while (n && n !== box) { y += n.offsetTop; n = n.offsetParent; } return y; };

  // ---------------------------------------------------------------- geometry from the app
  const CARD_W = 330, PIVOT = Math.max(CARD_W * 2.7, 780);
  function placeCard(c, centre) {
    const n = PEOPLE.length;
    let rel = c.i - (((centre % n) + n) % n);
    if (rel > n / 2) rel -= n;
    if (rel < -n / 2) rel += n;
    const d = Math.abs(rel);
    const arc = Math.asin(clamp((rel * CARD_W) / PIVOT, -0.72, 0.72));
    const scale = 1 - Math.min(d, 1) * 0.17;
    const op = Math.max(0, 1 - Math.max(0, d - 0.85) * 0.55);
    c.el.style.transform = `perspective(900px) translateY(${PIVOT}px) rotate(${arc}rad) translateY(${-PIVOT}px) rotateY(${-arc * 16}deg) scale(${scale})`;
    c.el.style.opacity = op.toFixed(3);
    c.el.style.zIndex = String(Math.round(100 - d * 10));
  }
  const DPSI = 0.3, STEP = 72, R = STEP / (2 * Math.sin(DPSI / 2));
  function placeFace(f, i, active) {
    const n = PEOPLE.length;
    let slot = i - active; slot = ((slot % n) + n) % n; if (slot > n / 2) slot -= n;
    const angle = slot * DPSI, d = Math.abs(slot);
    const depth = Math.max(0, 1 - (0.5 * d) / 2.4);
    const arcY = Math.min(R * (1 - Math.cos(angle)), 16);
    // The neighbours sit 5px higher than the arc (never above 4px), as in the app.
    const near = Math.max(0, 1 - Math.abs(d - 1));
    const y = near > 0 ? Math.max(4 * near + arcY * (1 - near), arcY - 5 * near) : arcY;
    f.el.style.transform = `translate(${R * Math.sin(angle)}px, ${y}px) rotate(${angle}rad) scale(${0.62 + 0.38 * depth})`;
    f.frame.style.transform = `rotate(${-angle}rad)`;
    f.el.style.opacity = (d <= 2 ? 1 : Math.max(0, 1 - (d - 2))).toFixed(3);
    f.el.style.zIndex = String(Math.round(depth * 100) + (d < 0.5 ? 100 : 0));
    const on = d < 0.5;
    f.frame.classList.toggle('active', on);
    f.scrim.style.opacity = on ? '0' : '1';
  }

  // ---------------------------------------------------------------- one frame of the loop
  let lastStep = -1, lastLabels = '';
  const fade = (v, w, t) => { const o = t >= w[3] ? 0 : seg(t, w[0], w[1]); v.style.opacity = o.toFixed(3); v.style.visibility = o > 0.001 ? 'visible' : 'hidden'; return o; };
  const typeInto = (node, text, t, a, b) => { node.textContent = text.slice(0, Math.floor(text.length * seg(t, a, b))); };
  const glide = (t, a, b, from, to) => from + (to - from) * easeInOut(seg(t, a, b));
  const inch = (cm) => { const n = Math.round(cm / 2.54); return `${Math.floor(n / 12)}′${n % 12}″`; };
  const setSlider = (s, pa, pb) => { const w = s.track.offsetWidth || 300; s.a.style.left = `${pa * w}px`; s.b.style.left = `${pb * w}px`; s.fill.style.left = `${pa * w}px`; s.fill.style.width = `${(pb - pa) * w}px`; };

  // The You tab's scroll stops, read from the layout once it is in.
  let stops = null;
  const youStops = () => {
    if (stops && stops.clip === pclip.offsetHeight && stops.full === pscroll.offsetHeight) return stops;
    const max = Math.max(0, pscroll.offsetHeight - pclip.offsetHeight);
    stops = { clip: pclip.offsetHeight, full: pscroll.offsetHeight, practice: Math.min(max, topIn(practiceSec, pscroll) - 16), premium: Math.min(max, topIn(pdark, pscroll) - 18), end: max };
    return stops;
  };

  function render(t) {
    const reset = t >= M.dip[0] + 0.35; // under the dip: back to the start

    // The deck: dragged by the finger, then settled by the app's spring.
    const drag = (w, from) => from + ease(seg(t, w[0], w[1])) * 0.32;
    let centre = 0;
    if (t < M.swipe1[0]) centre = 0;
    else if (t < M.swipe1[1]) centre = drag(M.swipe1, 0);
    else if (t < M.swipe2[0]) centre = 0.32 + 0.68 * deckSpring(t - M.swipe1[1]);
    else if (t < M.swipe2[1]) centre = drag(M.swipe2, 1);
    else centre = 1.32 + 0.68 * deckSpring(t - M.swipe2[1]);
    if (reset) centre = 0;
    cards.forEach((c) => placeCard(c, centre));
    let active = 0;
    if (t >= M.swipe2[1]) active = 1 + arcSpring(t - M.swipe2[1]);
    else if (t >= M.swipe1[1]) active = arcSpring(t - M.swipe1[1]);
    if (reset) active = 0;
    faces.forEach((f, i) => placeFace(f, i, active));

    // Every profile carries its seal; the front card's glows as the deck opens.
    const glow = Math.sin(Math.PI * seg(t, 0.1, 1.6));
    cards.forEach((c, i) => { c.seal.style.boxShadow = i === 0 && glow > 0 ? `0 0 ${6 + 12 * glow}px rgba(197,160,84,${(0.35 + 0.5 * glow).toFixed(2)})` : ''; });

    // Chosen: gold on the card, its face and the buttons once back on the deck.
    const chosen = t >= M.chosen && !reset;
    const cp = chosen ? spring(t - M.chosen, 240, 16) : 0;
    cards[OPEN].el.classList.toggle('chosen', chosen);
    cards[OPEN].tick.style.transform = `scale(${cp.toFixed(3)})`;
    faces[OPEN].frame.classList.toggle('chosen', chosen);
    const labels = chosen ? 'c' : 'n';
    if (labels !== lastLabels) {
      lastLabels = labels;
      captionEl.textContent = chosen ? '1 of 3 chosen' : 'Choose up to 3. A match starts only when it is mutual.';
      selectEl.textContent = chosen ? '✓ Interested 1/3' : 'Select';
      selectEl.classList.toggle('ap-btn-gold', chosen);
      sendEl.textContent = chosen ? 'Send interest (1)' : 'Send interest';
      sendEl.classList.toggle('disabled', !chosen);
    }

    // The profile: pushed in from the right, scrolled, then popped back.
    const push = easeInOut(seg(t, M.push[0], M.push[1])), pop = easeInOut(seg(t, M.back[0], M.back[1]));
    const open = push * (1 - pop);
    detail.style.transform = `translateX(${(1 - open) * 100}%)`;
    detail.style.visibility = open > 0.001 ? 'visible' : 'hidden';
    daily.style.transform = `translateX(${-open * 30}%)`;
    daily.style.filter = open > 0.001 ? `brightness(${1 - open * 0.08})` : '';
    deckEl.style.transform = `scale(${1 - press(t, M.tapCard + 0.05) * 0.018})`;
    scrollEl.style.transform = `translateY(${-easeInOut(seg(t, M.scroll[0], M.scroll[1])) * 262}px)`;
    const picked = t >= M.tapSelect + 0.05 && t < M.back[1];
    chooseEl.classList.toggle('ap-btn-gold', picked);
    chooseEl.textContent = picked ? '✓ Interested' : 'Select';
    chooseEl.style.transform = `scale(${1 - press(t, M.tapSelect + 0.03) * 0.04})`;
    agreeEl.classList.toggle('lit', t >= M.scroll[1] - 0.2 && t < M.tapSelect);

    // ---- You > Preferences: ranges slide, a body type is added, Must have is ticked;
    // then the page scrolls down to the Premium filters.
    fade(you, W.prefs, t);
    const AGE_MIN = 18, AGE_SPAN = 42, H_MIN = 140, H_SPAN = 70;
    const ageA = 0.2 + ease(seg(t, 7.3, 7.8)) * 0.08, ageB = 0.7 - ease(seg(t, 7.5, 8.0)) * 0.06;
    const ha = 0.26 + ease(seg(t, 8.1, 8.9)) * 0.12, hb = 0.84 - ease(seg(t, 9.0, 9.8)) * 0.16;
    setSlider(ageS, ageA, ageB); setSlider(htS, ha, hb);
    ageVal.textContent = `${Math.round(AGE_MIN + ageA * AGE_SPAN)}–${Math.round(AGE_MIN + ageB * AGE_SPAN)} years`;
    const hlo = Math.round(H_MIN + ha * H_SPAN), hhi = Math.round(H_MIN + hb * H_SPAN);
    htLab.textContent = `Height ${hlo}–${hhi} cm`; htVal.textContent = `${inch(hlo)} – ${inch(hhi)}`;
    mustH.classList.toggle('on', t >= 9.95);
    buildVal.textContent = t >= 10.55 ? 'Average, Athletic / toned' : 'Average';
    buildBox.classList.toggle('lit', t >= 10.25 && t < 10.9);
    practiceChecks[2].classList.toggle('on', t >= 12.05);
    nochild.classList.toggle('on', t >= 13.95);
    mustD.classList.toggle('on', t >= 14.55);
    eduVal.textContent = t >= 15.45 ? 'Bachelor’s degree or higher' : 'Any';
    eduBox.classList.toggle('lit', t >= 15.15 && t < 15.6);
    const S = youStops();
    youY = t < 11.0 ? 0 : t < 12.6 ? glide(t, 11.0, 11.9, 0, S.practice) : t < 14.8 ? glide(t, 12.6, 13.5, S.practice, S.premium) : glide(t, 14.8, 15.3, S.premium, S.end);
    pscroll.style.transform = `translateY(${(-youY).toFixed(1)}px)`;

    // ---- match: the pair meets, confetti
    const mo = fade(matchV, W.match, t);
    const st = t - W.match[1];
    const pl = spring(st - 0.05, 150, 15), prr = spring(st - 0.15, 150, 15);
    plateL.style.transform = `translateX(${(1 - pl) * -110}px)`; plateL.style.opacity = clamp(pl * 2).toFixed(3);
    plateR.style.transform = `translateX(${(1 - prr) * 110}px)`; plateR.style.opacity = clamp(prr * 2).toFixed(3);
    const hp = clamp(spring(st - 0.55, 260, 13));
    heartEl.style.transform = `scale(${hp.toFixed(3)})`; heartEl.style.opacity = clamp(hp * 3).toFixed(3);
    matchTitle.style.opacity = ease(seg(st, 0, 0.35)).toFixed(3);
    matchRest.forEach((n) => { n.style.opacity = ease(seg(st, 0.9, 1.3)).toFixed(3); });
    matchBtn.style.transform = `scale(${1 - press(t, 17.9) * 0.04})`;
    bits.forEach((b) => {
      const tau = t - (W.match[1] + 0.6);
      if (tau < 0 || mo < 0.01) { b.e.style.opacity = '0'; return; }
      const x = b.vx * tau, y = b.vy * tau + 0.5 * 560 * tau * tau;
      b.e.style.opacity = (1 - seg(tau, 1.0, 1.7)).toFixed(3);
      b.e.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(b.rot + b.spin * tau).toFixed(0)}deg)`;
    });

    // ---- the three questions: each of you chooses three
    fade(questionsV, W.questions, t);
    const chooseAt = [18.95, 19.5, 20.05];
    qcards.forEach((c, i) => { const k = MINE.indexOf(i); c.classList.toggle('on', k >= 0 && t >= chooseAt[k] + 0.05); });
    const nChosen = chooseAt.filter((a) => t >= a + 0.05).length;
    qcount.textContent = `${nChosen} of 3 chosen`;
    qbtn.classList.toggle('disabled', nChosen < 3);
    qbtn.style.transform = `scale(${1 - press(t, 20.8) * 0.04})`;

    // ---- answering: type, finish, and only then read hers
    fade(answerV, W.answer, t);
    typeInto(typed2, ANS_MINE, t, 21.6, 22.6);
    const reveal = ease(seg(t, 23.0, 23.35));
    sealed.style.display = reveal > 0.5 ? 'none' : 'block'; hid.style.display = reveal > 0.5 ? 'none' : 'block';
    theirTxt.style.display = reveal > 0.5 ? 'block' : 'none'; theirTxt.style.opacity = clamp((reveal - 0.5) * 2).toFixed(3);
    tlab.classList.toggle('gold', reveal > 0.5);
    const finished = t >= 22.9;
    finishBtn.classList.toggle('ap-btn-gold', finished);
    finishBtn.textContent = finished ? '✓ Finished' : 'Finish';

    // ---- the AI recap: a bar while it is written, then the summary; then scroll to the rest
    fade(recapV, W.recap, t);
    const preparing = t >= 24.05 && t < 24.9;
    prep.style.display = t < 24.9 ? 'block' : 'none';
    barFill.style.width = `${(clamp((t - 24.05) / 0.85) * 92).toFixed(1)}%`;
    sumText.textContent = t < 24.9 ? '' : SUMMARY.slice(0, Math.floor(SUMMARY.length * seg(t, 24.9, 26.0)));
    prep.style.opacity = preparing ? '1' : '0';
    const rMax = Math.max(0, rscroll.offsetHeight - 700);
    recapY = glide(t, 26.1, 27.0, 0, Math.min(rMax, Math.max(0, topIn(openBtn, rscroll) - 450)));
    rscroll.style.transform = `translateY(${(-recapY).toFixed(1)}px)`;
    openBtn.style.transform = `scale(${1 - press(t, 27.3) * 0.04})`;

    // ---- the chat: the bot's ice-breaker, then a message each way
    fade(chatV, W.chat, t);
    const botRise = ease(seg(t, 27.95, 28.3));
    botWrap.style.opacity = (botRise * (1 - ease(seg(t, 29.0, 29.2)))).toFixed(3); botWrap.style.transform = `translateY(${((1 - botRise) * 10).toFixed(1)}px)`;
    const sent = t >= 29.05;
    typeInto(inputEl, MSG_OUT, t, 28.3, 28.95);
    if (sent) inputEl.textContent = '';
    const in1 = sent ? ease(seg(t, 29.05, 29.3)) : 0;
    m1.style.opacity = in1.toFixed(3); m1.style.transform = `translateY(${((1 - in1) * 10).toFixed(1)}px)`;
    const dotsOn = t >= 29.45 && t < 30.1;
    dots.style.opacity = dotsOn ? '1' : '0'; dots.style.display = dotsOn ? 'flex' : 'none';
    const in2 = ease(seg(t, 30.1, 30.35));
    m2.style.opacity = in2.toFixed(3); m2.style.transform = `translateY(${((1 - in2) * 10).toFixed(1)}px)`;
    m2.style.display = t >= 30.1 ? 'block' : 'none';
    qa(dots, 'i').forEach((d, i) => { d.style.transform = `translateY(${(-3 * Math.max(0, Math.sin((t * 9) - i * 0.9))).toFixed(1)}px)`; });
    sendC.classList.toggle('on', t >= 28.3 && t < 29.05);
    sendC.style.transform = `scale(${1 - press(t, 29.0) * 0.12})`;

    // ---- Halal Cards: the hub, then a quiz, then an adventure
    fade(cardsV, W.cards, t);
    const gStop = Math.max(0, topIn(gblocks[1], cscroll) - 120);
    cardsY = glide(t, 31.55, 32.55, 0, gStop);
    cscroll.style.transform = `translateY(${(-cardsY).toFixed(1)}px)`;
    cstatus.style.opacity = clamp(cardsY / 60).toFixed(3);
    const quizIn = easeInOut(seg(t, 33.1, 33.45)) * (1 - easeInOut(seg(t, 35.0, 35.3)));
    quizEl.style.opacity = quizIn.toFixed(3); quizEl.style.visibility = quizIn > 0.001 ? 'visible' : 'hidden';
    quizEl.style.transform = `translateY(${((1 - quizIn) * 40).toFixed(1)}px) scale(${(0.9 + 0.1 * quizIn).toFixed(3)})`;
    gates[1].style.transform = `scale(${1 - press(t, 32.95) * 0.03})`;
    pickEl.classList.toggle('on', t >= 34.2);
    const mp = t >= 34.5 ? clamp(spring(t - 34.5, 240, 16)) : 0;
    matchEl.style.opacity = mp.toFixed(3); matchEl.style.transform = `translateY(${((1 - mp) * 12).toFixed(1)}px)`;
    const storyIn = easeInOut(seg(t, 35.2, 35.55)) * (1 - easeInOut(seg(t, 36.9, 37.2)));
    storyEl.style.opacity = storyIn.toFixed(3); storyEl.style.visibility = storyIn > 0.001 ? 'visible' : 'hidden';
    storyEl.style.transform = `translateY(${((1 - storyIn) * 40).toFixed(1)}px) scale(${(0.9 + 0.1 * storyIn).toFixed(3)})`;
    spickEl.classList.toggle('on', t >= 36.2);
    const sp = t >= 36.45 ? clamp(spring(t - 36.45, 240, 16)) : 0;
    smatchEl.style.opacity = sp.toFixed(3); smatchEl.style.transform = `translateY(${((1 - sp) * 12).toFixed(1)}px)`;

    // ---- the pillar pill
    let label = TAGS[0][1], tagStart = 0;
    TAGS.forEach(([when, text]) => { if (t >= when) { label = text; tagStart = when; } });
    if (tagText.textContent !== label) tagText.textContent = label;
    const tp = clamp(spring(t - tagStart - 0.1, 210, 17));
    tag.style.opacity = (reset ? 0 : clamp(tp * 2)).toFixed(3);
    tag.style.transform = `translateX(-50%) scale(${(0.78 + 0.22 * tp).toFixed(3)})`;

    // ---- the finger: drags, follows the sliders, and taps the rest
    let fx = 0, fy = 0, fo = 0, fs = 1;
    const win = (a, b, pad = 0.2) => { const p = seg(t, a - pad, b + pad); return p > 0 && p < 1 ? p : 0; };
    const show = (p) => { fo = Math.min(1, Math.sin(Math.PI * p) * 3); };
    const move = (w, x0, y0, x1, y1) => { const p = win(w[0], w[1]); if (!p) return false; const k = ease(seg(t, w[0], w[1])); fx = x0 + (x1 - x0) * k; fy = y0 + (y1 - y0) * k; show(p); return true; };
    const follow = (w, node) => { const p = win(w[0], w[1]); if (!p) return false; [fx, fy] = at(node); show(p); return true; };
    const tap = (when, node) => { const p = seg(t, when - 0.35, when + 0.3); if (p <= 0 || p >= 1) return false; [fx, fy] = Array.isArray(node) ? node : at(node); show(p); fs = 1 - press(t, when) * 0.18; return true; };
    const hit = move(M.swipe1, 250, 400, 130, 400) || move(M.swipe2, 250, 400, 130, 400)
      || tap(M.tapCard, [195, 380]) || tap(M.tapSelect, [195, 590])
      || follow([7.3, 7.8], ageS.a) || follow([7.5, 8.0], ageS.b)
      || follow([8.1, 8.9], htS.a) || follow([9.0, 9.8], htS.b)
      || tap(9.95, mustH) || tap(10.55, buildBox) || tap(12.05, practiceChecks[2])
      || tap(13.95, nochild) || tap(14.55, mustD) || tap(15.45, eduBox)
      || tap(17.9, matchBtn)
      || tap(chooseAt[0], qcards[MINE[0]]) || tap(chooseAt[1], qcards[MINE[1]]) || tap(chooseAt[2], qcards[MINE[2]]) || tap(20.8, qbtn)
      || tap(22.9, finishBtn) || tap(27.3, openBtn) || tap(29.0, sendC)
      || tap(32.95, gates[1]) || tap(34.2, pickEl) || tap(36.2, spickEl);
    finger.style.transform = `translate(${fx}px, ${fy}px) scale(${fs})`;
    finger.style.opacity = (hit ? fo : 0).toFixed(3);

    // A soft dip back to the start.
    dip.style.opacity = Math.sin(Math.PI * seg(t, M.dip[0], M.dip[1])).toFixed(3);

    // The steps beside the phone.
    const step = STEPS.filter((v) => t >= v).length - 1;
    if (step !== lastStep) { lastStep = step; document.querySelectorAll('[data-preview-step]').forEach((s) => s.classList.toggle('on', Number(s.dataset.previewStep) === step)); }
  }

  // ---------------------------------------------------------------- scale to fit, play while visible
  function fit() { const w = device.clientWidth; if (w) screen.style.transform = `scale(${w / 390})`; }
  new ResizeObserver(fit).observe(device); fit();

  const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let t0 = performance.now(), running = false, visible = false, raf = 0, pausedAt = 0;
  const now = () => ((performance.now() - t0) / 1000) % LOOP;
  function tick() { if (!running) return; render(now()); raf = requestAnimationFrame(tick); }
  function start() { if (running || reduced) return; running = true; t0 = performance.now() - pausedAt * 1000; raf = requestAnimationFrame(tick); }
  function stop() { if (!running) return; pausedAt = now(); running = false; cancelAnimationFrame(raf); }
  let frozen = false;
  const update = () => {
    if (frozen) return;
    if (visible && !document.hidden) start(); else stop();
  };
  new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); update(); }, { threshold: 0.2 }).observe(host);
  document.addEventListener('visibilitychange', update);
  document.querySelectorAll('[data-preview-step]').forEach((s) => {
    s.addEventListener('click', () => { const from = STEPS[Number(s.dataset.previewStep)] || 0; pausedAt = from + 0.01; t0 = performance.now() - pausedAt * 1000; render(pausedAt); });
  });
  // Reduced motion: one still frame of the deck. ?ap-t=4.8 holds any moment (for checking).
  const still = Number(new URLSearchParams(location.search).get('ap-t'));
  if (still > 0) { frozen = true; render(still % LOOP); return; }
  render(reduced ? 0.5 : 0);
})();
