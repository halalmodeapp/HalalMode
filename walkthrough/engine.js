/*
 * Halal Mode walkthrough engine.
 *
 * Everything on screen is a pure function of one number, the time t (seconds):
 * render(t) places every element, so the film can be played, paused, scrubbed
 * and later rendered frame by frame to video with identical results. Nothing
 * is pre-recorded: the phone, the app screens, the light and the music are
 * all made here. Content comes from config.js (and the editor's saved edits).
 */
(() => {
  'use strict';

  // ---------------------------------------------------------------- settings
  const SAVE_KEY = 'hm-walkthrough-overrides';
  const merge = (a, b) => {
    if (b === undefined) return a;
    if (Array.isArray(b)) return b.map((v, i) => merge(a ? a[i] : undefined, v));
    if (b && typeof b === 'object') { const o = { ...(a || {}) }; for (const k of Object.keys(b)) o[k] = merge(a ? a[k] : undefined, b[k]); return o; }
    return b;
  };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (_e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (_e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (_e) { /* storage blocked */ } },
  };
  let saved = {};
  try { saved = JSON.parse(store.get(SAVE_KEY, '{}')) || {}; } catch (_e) { saved = {}; }
  const C = merge(merge(window.HM_CONFIG, window.HM_OVERRIDES || {}), saved);
  const Q = new URLSearchParams(location.search);
  const FILMS = ['a', 'b', 'c'];
  let V = (Q.get('v') || store.get('hm-v', 'a')).toLowerCase(); if (!FILMS.includes(V)) V = 'a';
  let DUR = 60;
  // ?export=1: driven frame by frame by tools/export.mjs (no controls, no autoplay).
  const EXPORTING = Q.get('export') === '1';
  const EMBED = Q.get('controls') === '0' || EXPORTING;
  const LOOP = Q.get('loop') === '1' || EMBED;
  if (EMBED) document.body.classList.add('embed');
  // Which deck the Daily screen shows: the member's own, or the other side's.
  const showDeck = (other) => { if (!phone.scr.hero) return; alpha(phone.scr.hero, other ? 0 : 1); alpha(phone.scr.hero2, other ? 1 : 0); };

  // ---------------------------------------------------------------- maths
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, p) => a + (b - a) * p;
  const seg = (t, a, b) => (b <= a ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a)));
  // Every ease starts and ends at rest (smootherstep: no jump in speed or
  // acceleration), with more or less of its travel early on. Nothing overshoots.
  const smooth = (p) => { p = clamp(p); return p * p * p * (p * (p * 6 - 15) + 10); };
  const E = {
    out: (p) => smooth(1 - Math.pow(1 - clamp(p), 1.6)),
    out5: (p) => smooth(1 - Math.pow(1 - clamp(p), 2.2)),
    inOut: smooth,
    in: (p) => smooth(Math.pow(clamp(p), 1.6)),
    spring: (p) => smooth(1 - Math.pow(1 - clamp(p), 1.8)),
    soft: (p) => smooth(1 - Math.pow(1 - clamp(p), 1.4)),
  };
  // Fade in over [a,b] and out over [c,d] (either side optional).
  const win = (t, a, b, c, d) => (a == null ? 1 : E.out(seg(t, a, b))) * (c == null ? 1 : 1 - E.inOut(seg(t, c, d)));
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  // ---------------------------------------------------------------- DOM helpers
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const h = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };
  const n2 = (v) => (Math.abs(v) < 0.005 ? 0 : v).toFixed(2);
  function put(e, o) {
    let tr = `translate3d(${n2(o.x || 0)}px,${n2(o.y || 0)}px,${n2(o.z || 0)}px)`;
    if (o.rx) tr += ` rotateX(${n2(o.rx)}deg)`;
    if (o.ry) tr += ` rotateY(${n2(o.ry)}deg)`;
    if (o.r) tr += ` rotate(${n2(o.r)}deg)`;
    if (o.s != null && o.s !== 1) tr += ` scale(${o.s.toFixed(4)})`;
    if (e._tr !== tr) { e.style.transform = tr; e._tr = tr; }
    alpha(e, o.o == null ? 1 : o.o);
    if (o.b != null) { const f = o.b > 0.1 ? `blur(${o.b.toFixed(1)}px)` : 'none'; if (e._f !== f) { e.style.filter = f; e._f = f; } }
  }
  function alpha(e, v) {
    const os = clamp(v).toFixed(3);
    if (e._op === os) return;
    e.style.opacity = os; e._op = os;
    const vis = v > 0.002 ? 'visible' : 'hidden';
    if (e._vis !== vis) { e.style.visibility = vis; e._vis = vis; }
  }
  const txt = (e, s) => { if (e._t !== s) { e.textContent = s; e._t = s; } };
  const cls = (e, c, on) => { const k = '_c_' + c; if (e[k] !== on) { e.classList.toggle(c, on); e[k] = on; } };
  const sty = (e, k, v) => { const kk = '_s_' + k; if (e[kk] !== v) { e.style[k] = v; e[kk] = v; } };

  const ICON = {
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    heartPath: 'M741.6,42.63c-12.92-7.59-29.36-4.81-39.14,6.41h-.38c-8.67-9.91-22.51-13.35-34.85-8.5-9.25,3.63-16.71,12.03-20.05,21.3-7.23,20.05,4.43,35.29,18.84,47.67,7.97,6.85,16.82,12.63,25.18,18.99,3.66,2.78,7.2,5.73,10.84,8.53l.38.05c3.84-2.94,7.56-6.03,11.42-8.96,18.22-13.83,49.04-31.69,45.45-58.59-1.45-10.88-8.22-21.36-17.69-26.91Z',
    shield: '<svg viewBox="0 0 120 140" fill="none"><path d="M60 6 108 24v40c0 34-21 58-48 70C33 122 12 98 12 64V24Z" fill="rgba(184,145,79,0.14)" stroke="#D6B469" stroke-width="4" stroke-linejoin="round"/><path d="m40 70 14 14 28-30" stroke="#D6B469" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    block: '<svg viewBox="0 0 24 24" width="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><path d="m6 18 12-12"/></svg>',
    flag: '<svg viewBox="0 0 24 24" width="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 21V4h11l-1.5 4L16 12H5"/></svg>',
    eye: '<svg viewBox="0 0 24 24" width="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a17 17 0 0 1-3.2 3.7M6.4 7.6C4.2 9.2 3 12 3 12s4 6 9 6c1.5 0 2.9-.5 4.1-1.2"/></svg>',
    bot: '<svg viewBox="0 0 24 24" width="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="7" width="16" height="12" rx="4"/><path d="M12 3v4M9 13h.01M15 13h.01"/></svg>',
  };
  const heartSvg = (cls2) => `<svg class="${cls2 || ''}" viewBox="636 30 136 114" width="100%"><path pathLength="1" d="${ICON.heartPath}"/></svg>`;
  const isRtl = (s) => /[֐-ࣿ]/.test(s);

  // ---------------------------------------------------------------- world
  const world = document.getElementById('world');
  const ui = document.getElementById('ui');
  let W = 1920, H = 1080, PORTRAIT = false, A = null;
  const bg = {};
  ['night', 'dawn', 'pink', 'cream', 'gold', 'paper'].forEach((k) => { bg[k] = h('div', 'bg bg-' + k, world); });
  const flash = h('div', 'bg bg-flash', world);
  const dust = h('canvas', '', world); dust.id = 'dust';
  const dctx = dust.getContext('2d');
  const stage = h('div', '', world); stage.id = 'stage';

  function anchors() {
    const tilt = V === 'b' ? 0 : 1, B3 = V === 'b';
    return PORTRAIT ? {
      // The phone fills most of a vertical screen.
      phone: B3 ? { x: 540, y: 1010, s: 1.42, ry: -14, rx: 5 } : { x: 540, y: 1000, s: 1.5, ry: 0 },
      // Earn the conversation: the two phones stack, one above the other.
      phoneL: { x: 390, y: 700, s: 0.8, ry: 0, r: -3 }, phoneR: { x: 690, y: 1290, s: 0.8, ry: 0, r: 3 },
      copyY: 300, copyX: 60, copyW: 960, align: 'center',
      mid: { x: 540, y: 960 },
    } : {
      phone: B3 ? { x: 960, y: 545, s: 0.95, ry: -18, rx: 4 } : { x: 960, y: 545, s: 0.95, ry: -7 * tilt },
      phoneL: { x: 700, y: 560, s: 0.84, ry: 10 * tilt }, phoneR: { x: 1220, y: 560, s: 0.84, ry: -10 * tilt },
      copyY: 540, copyX: 160, copyW: 800, align: 'left',
      mid: { x: 960, y: 540 },
    };
  }

  // ---------------------------------------------------------------- 3D phone
  // A titanium phone modelled with three.js: rounded, bevelled frame, glass
  // front and back, camera bump, buttons, studio reflections. Its screen is
  // the real app UI, laid on the glass by CSS3DRenderer with the same camera,
  // so the interface stays sharp while the body catches the light.
  let T3 = null;
  const G3 = { groups: [] };
  const DEG = Math.PI / 180;
  const PW = 416, PH = 870, PD = 34, BEV = 8;
  async function load3D() {
    try {
      const THREE = await import('three');
      const { CSS3DRenderer, CSS3DObject } = await import('three/addons/renderers/CSS3DRenderer.js');
      const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
      T3 = { THREE, CSS3DRenderer, CSS3DObject, RoomEnvironment, hdr: null };
      // Image-based lighting: a real photographed studio (Poly Haven, CC0).
      try {
        const { RGBELoader } = await import('three/addons/loaders/RGBELoader.js');
        T3.hdr = await new RGBELoader().loadAsync('env/studio.hdr');
        T3.hdr.mapping = THREE.EquirectangularReflectionMapping;
      } catch (_e) { T3.hdr = null; /* the generated room still lights it */ }
    } catch (_e) { T3 = null; /* falls back to the flat phone */ }
  }
  const use3D = () => !!T3;
  function roundedRect(THREE, w, hh, r) {
    const sh = new THREE.Shape(), x = -w / 2, y = -hh / 2;
    sh.moveTo(x + r, y); sh.lineTo(x + w - r, y); sh.absarc(x + w - r, y + r, r, -Math.PI / 2, 0);
    sh.lineTo(x + w, y + hh - r); sh.absarc(x + w - r, y + hh - r, r, 0, Math.PI / 2);
    sh.lineTo(x + r, y + hh); sh.absarc(x + r, y + hh - r, r, Math.PI / 2, Math.PI);
    sh.lineTo(x, y + r); sh.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
    return sh;
  }
  // Each phone gets its own canvas (and screen layer), so a phone fades as a
  // whole: solid materials, no glimpse of the camera bump through the glass.
  function makeLayer() {
    const { THREE, CSS3DRenderer, RoomEnvironment } = T3;
    const mk = () => { const r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0; return r; };
    const envFor = (r) => { const pm = new THREE.PMREMGenerator(r); const tex = T3.hdr ? pm.fromEquirectangular(T3.hdr).texture : pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose(); return tex; };
    // The body: frame, glass, back and lenses, lit by the studio.
    const r = mk(); const scene = new THREE.Scene(); scene.environment = envFor(r);
    const key = new THREE.DirectionalLight(0xffffff, T3.hdr ? 0.6 : 1.4); key.position.set(-700, 1100, 1400); scene.add(key);
    // The screen glass: a pane over the live UI that shows only what it
    // reflects (black, blended with "screen"), so studio lights slide across
    // the display as the phone turns.
    const gr = mk(); const gscene = new THREE.Scene(); gscene.environment = envFor(gr);
    const css = new CSS3DRenderer();
    r.domElement.className = 'gl3d'; css.domElement.className = 'css3d'; gr.domElement.className = 'glass3d';
    return { r, scene, css, gr, gscene, group: null, ggroup: null };
  }
  function setup3D() {
    const { THREE } = T3;
    if (!G3.mats) {
      G3.camera = new THREE.PerspectiveCamera(30, 16 / 9, 10, 20000);
      G3.mats = {
        frame: new THREE.MeshPhysicalMaterial({ color: 0xc8c2b7, metalness: 1, roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.25 }),
        glass: new THREE.MeshPhysicalMaterial({ color: 0x050506, metalness: 0.1, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.04 }),
        back: new THREE.MeshPhysicalMaterial({ color: 0xe6e1d7, metalness: 0.05, roughness: 0.5, clearcoat: 0.7, clearcoatRoughness: 0.35 }),
        lens: new THREE.MeshPhysicalMaterial({ color: 0x0c0c0f, metalness: 0.5, roughness: 0.12, clearcoat: 1 }),
        ring: new THREE.MeshPhysicalMaterial({ color: 0xbfb9ae, metalness: 1, roughness: 0.22 }),
      };
      const inner = PD - 2 * BEV;
      G3.bodyGeo = new THREE.ExtrudeGeometry(roundedRect(THREE, PW - 2 * BEV, PH - 2 * BEV, 58), { depth: inner, bevelEnabled: true, bevelThickness: BEV, bevelSize: BEV, bevelSegments: 8, curveSegments: 40 });
      G3.bodyGeo.translate(0, 0, -inner / 2);
      G3.backGeo = new THREE.ShapeGeometry(roundedRect(THREE, PW - 20, PH - 20, 56), 40);
      G3.bumpGeo = new THREE.ExtrudeGeometry(roundedRect(THREE, 150, 158, 42), { depth: 4, bevelEnabled: true, bevelThickness: 2, bevelSize: 2, bevelSegments: 4, curveSegments: 24 });
      G3.lensGeo = new THREE.CylinderGeometry(25, 25, 7, 48); G3.lensGeo.rotateX(Math.PI / 2);
      G3.ringGeo = new THREE.TorusGeometry(26, 2.4, 12, 48);
      G3.btnGeo = new THREE.BoxGeometry(5, 1, 9);
      G3.glassGeo = new THREE.ShapeGeometry(roundedRect(THREE, 390, 844, 52), 40);
      G3.glassMat = new THREE.MeshPhysicalMaterial({ color: 0x000000, metalness: 0, roughness: 0.035, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 3.2, ior: 1.52 });
      G3.layers = [makeLayer(), makeLayer()];
    }
    const D = (H / 2) / Math.tan((30 * DEG) / 2);
    G3.camera.aspect = W / H; G3.camera.position.set(0, 0, D); G3.camera.near = D / 10; G3.camera.far = D * 4; G3.camera.updateProjectionMatrix();
    // A rebuild drops the old phones, including their screens' DOM (removing
    // the group alone would leave the old screen in the page, cutting through the new one).
    G3.layers.forEach((L) => { if (L.group) { L.group.traverse((ob) => { if (ob.element && ob.element.parentNode) ob.element.parentNode.removeChild(ob.element); }); L.scene.remove(L.group); } if (L.ggroup) L.gscene.remove(L.ggroup); L.group = L.ggroup = null; [L.r, L.gr].forEach((rr) => { rr.setPixelRatio(G3.pr || 1); rr.setSize(W, H, true); }); L.css.setSize(W, H); });
  }
  function buildPhone3D(L) {
    const { THREE, CSS3DObject } = T3;
    stage.appendChild(L.r.domElement); stage.appendChild(L.css.domElement); stage.appendChild(L.gr.domElement);
    const g = new THREE.Group(); const m = G3.mats;
    g.add(new THREE.Mesh(G3.bodyGeo, [m.glass, m.frame]));
    const back = new THREE.Mesh(G3.backGeo, m.back); back.position.z = -PD / 2 - 0.4; back.rotation.y = Math.PI; g.add(back);
    const bump = new THREE.Mesh(G3.bumpGeo, m.back); bump.rotation.y = Math.PI; bump.position.set(PW / 2 - 100, PH / 2 - 108, -PD / 2 - 0.6); g.add(bump);
    [[-36, 36], [-36, -36], [36, 0]].forEach(([lx, ly]) => {
      const lens = new THREE.Mesh(G3.lensGeo, m.lens); lens.position.set(PW / 2 - 100 + lx, PH / 2 - 108 + ly, -PD / 2 - 9); g.add(lens);
      const ring = new THREE.Mesh(G3.ringGeo, m.ring); ring.position.copy(lens.position); ring.position.z -= 3.2; g.add(ring);
    });
    [[-1, 196, 34], [-1, 252, 64], [-1, 330, 64], [1, 290, 100]].forEach(([side, y, len]) => {
      const bt = new THREE.Mesh(G3.btnGeo, m.frame); bt.scale.y = len; bt.position.set(side * (PW / 2 + 1.5), PH / 2 - y - len / 2, 0); g.add(bt);
    });
    const el = h('div', 'screen3d', null);
    const screen = h('div', 'screen', el);
    const status = h('div', 'status', screen, '<span class="tm">5:12</span><span class="icons"><i class="bars"></i><i class="batt"></i></span>');
    h('div', 'island', screen);
    const glare = h('div', 'glare', screen);
    const obj = new CSS3DObject(el); obj.position.z = PD / 2 + 0.8; g.add(obj);
    L.scene.add(g); L.group = g;
    const gg = new THREE.Group(); const pane = new THREE.Mesh(G3.glassGeo, G3.glassMat); pane.position.z = PD / 2 + 1.4; gg.add(pane); L.gscene.add(gg); L.ggroup = gg;
    const shadow = h('div', 'phone-shadow abs', fx.back);
    const id = 'mb' + (G3.blurN = (G3.blurN || 0) + 1);
    return { three: true, layer: L, group: g, ggroup: gg, el, screen, status, tm: status.querySelector('.tm'), glare, scr: {}, shadow, blur: blurFilter(id), blurId: id, sx: 0, sy: 0 };
  }
  // Place either phone: the 3D one through three.js, the flat one with CSS.
  function setPose(ph, o) {
    if (!ph.three) { put(ph.el, o); return; }
    const g = ph.group, sc = o.s == null ? 1 : o.s;
    g.position.set((o.x || 0) - W / 2, H / 2 - (o.y || 0), o.z || 0);
    g.rotation.set(-(o.rx || 0) * DEG, (o.ry || 0) * DEG, -(o.r || 0) * DEG);
    g.scale.setScalar(sc);
    ph.ggroup.position.copy(g.position); ph.ggroup.rotation.copy(g.rotation); ph.ggroup.scale.copy(g.scale);
    const op = o.o == null ? 1 : clamp(o.o);
    g.visible = op > 0.004; ph._vis = g.visible;
    const L = ph.layer;
    alpha(L.r.domElement, op); alpha(L.css.domElement, op); alpha(L.gr.domElement, op);
    // Motion blur: a directional blur sized by how fast the phone travels,
    // scales and turns since the last frame (only while playing).
    const dt = T - (ph._pt == null ? T : ph._pt);
    let tx = 0, ty = 0;
    if ((playing || EXPORTING) && dt > 0.001 && dt < 0.2 && ph._pp) {
      const vx = ((o.x || 0) - ph._pp.x) / dt, vy = ((o.y || 0) - ph._pp.y) / dt, vs = (sc - ph._pp.s) / dt, vr = (Math.abs((o.ry || 0) - ph._pp.ry) + Math.abs((o.rx || 0) - ph._pp.rx) + Math.abs((o.r || 0) - ph._pp.r)) / dt;
      tx = Math.min(14, Math.abs(vx) * 0.006 + Math.min(10, vr * 0.012) + Math.abs(vs) * PW * 0.004);
      ty = Math.min(14, Math.abs(vy) * 0.006 + Math.abs(vs) * PH * 0.004);
    }
    ph.sx = lerp(ph.sx, tx, 0.3); ph.sy = lerp(ph.sy, ty, 0.3);
    ph._pp = { x: o.x || 0, y: o.y || 0, s: sc, rx: o.rx || 0, ry: o.ry || 0, r: o.r || 0 }; ph._pt = T;
    const blurOn = ph.sx > 0.35 || ph.sy > 0.35;
    if (blurOn) ph.blur.setAttribute('stdDeviation', ph.sx.toFixed(2) + ' ' + ph.sy.toFixed(2));
    const f = blurOn ? `url(#${ph.blurId})` : 'none';
    [L.r.domElement, L.css.domElement, L.gr.domElement].forEach((e) => sty(e, 'filter', f));
    put(ph.shadow, { x: o.x || 0, y: (o.y || 0) + PH * 0.5 * sc + 30 * sc, s: sc * (1 + (o.z || 0) / 3000) * (0.6 + 0.4 * Math.abs(Math.cos((o.ry || 0) * DEG))), o: op * 0.85 * clamp(1 + (o.z || 0) / 1500) });
  }
  // One SVG blur per phone; its stdDeviation is set every frame.
  function blurFilter(id) {
    const ns = 'http://www.w3.org/2000/svg';
    let svg = document.getElementById('hm-filters');
    if (!svg) { svg = document.createElementNS(ns, 'svg'); svg.id = 'hm-filters'; svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.style.position = 'absolute'; document.body.appendChild(svg); }
    let f = svg.querySelector('#' + id);
    if (!f) { f = document.createElementNS(ns, 'filter'); f.id = id; f.setAttribute('x', '-10%'); f.setAttribute('y', '-10%'); f.setAttribute('width', '120%'); f.setAttribute('height', '120%'); const gb = document.createElementNS(ns, 'feGaussianBlur'); gb.setAttribute('stdDeviation', '0 0'); f.appendChild(gb); svg.appendChild(f); }
    return f.firstChild;
  }
  // Titanium per film (light in A, black in B); Premium turns it gold.
  const TINT = { a: { frame: 0xc8c2b7, back: 0xe6e1d7, ring: 0xbfb9ae }, c: { frame: 0xd9b9a3, back: 0xf1ddd0, ring: 0xcfae98 }, b: { frame: 0x46433f, back: 0x1f1e1c, ring: 0x5a5650 }, gold: { frame: 0xe0b45e, back: 0xeccf96, ring: 0xd8ae5c } };
  function tintPhone(g) {
    if (!G3.mats) return;
    const key = V + g.toFixed(2); if (G3._tint === key) return; G3._tint = key;
    ['frame', 'back', 'ring'].forEach((m) => G3.mats[m].color.setHex(TINT[V][m]).lerp(new T3.THREE.Color(TINT.gold[m]), g));
  }
  function render3D() {
    if (!use3D() || !G3.layers) return;
    [phone2, phone].forEach((ph) => { if (!ph || !ph.three || !ph._vis) return; const L = ph.layer; L.r.render(L.scene, G3.camera); L.css.render(L.scene, G3.camera); L.gr.render(L.gscene, G3.camera); });
  }

  // ---------------------------------------------------------------- phone
  function buildPhone(parent) {
    const el = h('div', 'phone abs', parent);
    h('div', 'frame', el);
    [[-3, 196, 34], [-3, 252, 64], [-3, 330, 64]].forEach(([x, y, hh]) => { const b = h('div', 'btn', el); b.style.cssText = `left:${x}px;top:${y}px;height:${hh}px`; });
    const pb = h('div', 'btn', el); pb.style.cssText = 'right:-3px;top:290px;height:100px';
    const screen = h('div', 'screen', el);
    const status = h('div', 'status', screen, '<span class="tm">5:12</span><span class="icons"><i class="bars"></i><i class="batt"></i></span>');
    h('div', 'island', el);
    const glare = h('div', 'glare', el);
    return { el, screen, status, tm: status.querySelector('.tm'), glare, scr: {} };
  }
  // Who is on screen. Film A follows Zayd, whose introductions are women;
  // film B follows Amina, whose introductions are men (Omar first). `other`
  // is the opposite side, shown once in each film so both are seen.
  let CAST = null;
  const CAST_TOLD = { a: 'He is never told.', b: 'She is never told.', c: 'He is never told.' };
  function castFor(v) {
    const women = C.introductions, men = C.introductionsMen;
    const menAll = [...C.introductionsMen, ...C.premiumExtraMen], womenAll = [...women, ...C.premiumExtra];
    const crowd = []; womenAll.forEach((w, i) => { crowd.push(w); if (menAll[i]) crowd.push(menAll[i]); });
    return v === 'b'
      ? { member: women[0], intros: men, other: women, ten: womenAll, crowd, otherTold: CAST_TOLD.b }
      : { member: C.member, intros: women, other: C.introductionsMen, ten: menAll, crowd, otherTold: CAST_TOLD.a };
  }
  const intro = (i) => CAST.intros[i % CAST.intros.length];
  const match = () => CAST.intros[0];

  function buildScreens(ph, owner) {
    const S = ph.scr;
    const me = owner === 'match' ? match() : CAST.member;
    const them = owner === 'match' ? CAST.member : match();
    // Lock screen
    S.lock = h('div', 'scr scr-lock', ph.screen, `<div class="date">Thursday 23 October</div><div class="clock">5:12</div><div class="sunline"></div>
      <div class="notif"><div class="ic">${heartSvg('nheart')}</div><div><b>Halal Mode</b><span class="nt"></span></div><div class="when">now</div></div>`);
    S.lock.querySelector('.nheart path').style.fill = C.brand.pink;
    S.notif = S.lock.querySelector('.notif');
    S.notifText = S.lock.querySelector('.nt');
    // Match screen
    S.match = h('div', 'scr scr-match', ph.screen, `<div class="micro">Mutual</div><div class="pair"><img src="${esc(me.photo)}" alt="" style="left:72px"><img src="${esc(them.photo)}" alt="" style="left:146px"></div>
      <div class="title">You and ${esc(them.name)} chose each other.</div><div class="sub">Choose your questions to open the conversation.</div>`);
    if (owner === 'match') return;
    // Daily
    const d = h('div', 'scr scr-daily', ph.screen, `<div class="micro">Daily · ${esc(CAST.member.city)}</div><div class="title">5 Daily introductions</div><div class="sub">Resets at Fajr in ${esc(CAST.member.city)}</div>`);
    // Two decks: the member's own introductions, and the other side's.
    const deck = (people) => {
      const hero = h('div', 'hero', d);
      const cards = people.map((p, i) => {
        const c = h('div', 'hcard', hero, `<img src="${esc(p.photo)}" alt=""><div class="shade"></div><div class="count">${i + 1} of ${people.length}</div>
          <div class="meta"><div class="n">${esc(p.name)}, ${esc(p.age)}</div><div class="j">${esc(p.job)} · ${esc(p.city)}</div></div><div class="chosen">✓</div>`);
        c.style.zIndex = String(20 - i);
        return { el: c, chk: c.querySelector('.chosen') };
      });
      return { hero, cards };
    };
    const own = deck(CAST.intros), oth = deck(CAST.other);
    S.hero = own.hero; S.cards = own.cards; S.hero2 = oth.hero; S.cards2 = oth.cards;
    const dots = h('div', 'dots', d);
    S.dots = CAST.intros.map(() => h('i', '', dots));
    const foot = h('div', 'daily-foot', d);
    S.hint = h('div', 'hint', foot);
    S.btn = h('div', 'pill ink', foot, 'Show interest');
    S.daily = d;
    // Preferences
    const p = h('div', 'scr scr-prefs', ph.screen, `<div class="micro">1 of 2 · partner preferences</div><div class="title" style="font-size:27px">Age, height and location</div>
      <div class="sub">Choose the age, height, body types and locations that work for you. These choices stay private.</div>`);
    const row = (label) => { const r = h('div', 'prow', p, `<div class="k"><span>${label}</span><span class="v"></span></div>`); return { r, v: r.querySelector('.v') }; };
    const age = row('Age range'); const ageT = h('div', 'track', age.r, '<div class="fill"></div><div class="thumb"></div><div class="thumb"></div>');
    const ht = row('Height'); const htT = h('div', 'track', ht.r, '<div class="fill"></div><div class="thumb"></div><div class="thumb"></div>');
    const must = h('div', 'k', ht.r, '<span style="font-weight:500;font-size:13px;color:#6C6A65">Must have</span><div class="toggle"><i></i></div>'); must.style.marginTop = '14px';
    const bt = row('Body types'); const chips = h('div', 'chips', bt.r);
    const builds = ['Slim', 'Athletic', 'Muscular', 'Average', 'Curvy', 'Stocky', 'Full-Figured'];
    S.pref = { p, age, ageT, ht, htT, toggle: must.querySelector('.toggle'), knob: must.querySelector('.toggle i'), chips: builds.map((b) => h('span', 'chip', chips, b)) };
    h('div', 'private', p, `${ICON.lock}<span>Only used to prepare your introductions. Never shown to anyone.</span>`);
    // Questions
    const q = h('div', 'scr scr-q', ph.screen, `<div class="micro">Step 1 of 3 · with ${esc(them.name)}</div><div class="title" style="font-size:25px">Choose the three questions that matter most.</div>
      <div class="sub">${esc(them.name)} chooses three separately. Shared choices are marked when both sets are ready.</div>`);
    S.q = { q, rows: C.questions.map((qq) => { const r = h('div', 'qrow', q, `<div class="ck">✓</div><div class="qt">${esc(qq)}</div><span class="tag">Shared</span>`); return { r, ck: r.querySelector('.ck'), tag: r.querySelector('.tag') }; }) };
    const qc = h('div', 'qcount', q); S.q.count = h('div', 'pill ink', qc);
    // Answers and recap
    const a = h('div', 'scr scr-a', ph.screen);
    const mh = h('div', '', a); mh.style.position = 'relative'; mh.style.height = '12px';
    S.a = { a, m1: h('div', 'micro abs', mh, 'Step 2 of 3 · question 1 of 3'), m2: h('div', 'micro abs', mh, 'Step 3 of 3 · recap') };
    S.a.q = h('div', 'qcard', a, esc(C.questions[C.chosen[0]] || C.questions[0]));
    const ansMe = h('div', 'ans', a, `<div class="who"><img src="${esc(me.photo)}" alt="">Your answer</div><div class="txt"></div>`);
    const ansThem = h('div', 'ans', a, `<div class="who"><img src="${esc(them.photo)}" alt="">${esc(them.name)}’s answer</div><div class="txt">${esc(C.answers.them)}</div><div class="seal">${ICON.lock.replace('<svg', '<svg width="16"')}Hidden until you answer every question.</div>`);
    S.a.me = ansMe.querySelector('.txt'); S.a.seal = ansThem.querySelector('.seal');
    S.a.sum = h('div', 'summary', a, `<div class="micro">${ICON.bot} Halal Mode Bot · How your answers compare</div><div class="st"></div>`);
    S.a.st = S.a.sum.querySelector('.st');
    // Chat
    const ch = h('div', 'scr scr-chat', ph.screen, `<div class="chathead"><img src="${esc(them.photo)}" alt=""><div><b>${esc(them.name)}</b><span>Conversation open</span></div></div>`);
    S.chat = { ch, bubbles: C.chat.map((m) => h('div', 'bubble ' + (m.from === 'me' ? 'me' : 'them'), ch, esc(m.text))) };
    // Halal Cards
    const hc = h('div', 'scr scr-cards', ph.screen, `<div class="micro">Halal Cards · with ${esc(them.name)}</div><div class="title">Halal Cards</div><div class="sub">Quizzes, stories and exercises for the two of you.</div>`);
    const grid = h('div', 'cgrid', hc);
    S.hc = { hc, grid, cards: C.cards.slice(0, 6).map((c) => h('div', 'ccard', grid, `<img src="${esc(c.img)}" alt=""><div class="cl"><div class="micro">${esc(c.kind)}</div><b>${esc(c.title)}</b></div>`)) };
    // Premium
    const pr = h('div', 'scr scr-premium', ph.screen, `<div class="micro">Halal Mode Premium</div><div class="title">More introductions and conversations.</div>`);
    const feats = ['10 reciprocal introductions', 'Send interest to up to 10 people', 'Keep up to 10 conversations open', 'Premium filters', 'Travel mode, before a move or a long visit', 'Halal Cards with any match, they play free'];
    S.pr = { pr, feats: feats.map((f) => h('div', 'feat', pr, `<i>✓</i><span>${f}</span>`)), fine: h('div', 'fine', pr, 'Premium never reveals private preferences, scores or who passed on you.') };
    // Safety
    const sf = h('div', 'scr scr-safety', ph.screen, `<div class="hcard" style="position:absolute;left:24px;right:24px;top:66px;height:520px"><img src="${esc(intro(3).photo)}" alt=""><div class="shade"></div>
      <div class="meta"><div class="n">${esc(intro(3).name)}, ${esc(intro(3).age)}</div><div class="j">${esc(intro(3).job)}</div></div></div>`);
    const sh = h('div', 'sheet', sf, `<div class="grab"></div>
      <div class="srow"><div class="si">${ICON.eye}</div><div>Hide<small>You are hidden from them too.</small></div></div>
      <div class="srow"><div class="si">${ICON.block}</div><div>Block<small>Immediate. They are not told.</small></div></div>
      <div class="srow red"><div class="si">${ICON.flag}</div><div>Report<small>Every report is read by a person.</small></div></div>`);
    S.sf = { sf, sheet: sh };
  }

  // ---------------------------------------------------------------- copy blocks
  // A centred-on-a-line wrapper keeps blocks of any height centred where asked.
  function copyBlock(o) {
    if (V === 'b') o.dark = true;
    if (V !== 'b') o.dark = false; // A and C are ink on a light page
    const outer = h('div', 'copy', stage);
    outer.style.cssText += ';height:0;display:flex;align-items:center';
    const inner = h('div', '', outer);
    inner.className = (o.dark ? ' dark' : '') + (o.center ? ' center' : '') + (o.caption ? ' caption' : '');
    outer.classList.add(...inner.className.split(' ').filter(Boolean));
    let lab = null, sub = null;
    if (o.label) lab = h('div', 'label', inner, esc(o.label));
    const h1 = h('h1', '', inner);
    const words = setWords(h1, o.h || '', o.em);
    if (o.sub) sub = h('p', '', inner, esc(o.sub));
    let sub2 = null;
    if (o.sub2) { sub2 = h('p', '', inner, esc(o.sub2)); sub2.style.marginTop = '-' + 0 + 'px'; }
    return { outer, inner, lab, h1, words, sub, sub2, o };
  }
  // Words wrapped in *asterisks* are emphasised: they arrive a beat after
  // the rest of the line and settle into place (w._em).
  function setWords(h1, text, em) {
    h1.innerHTML = '';
    cls(h1, 'rtl', isRtl(text));
    let inEm = false;
    return String(text).split(/(\s+)/).filter((w) => w.trim()).map((w) => {
      let raw = w;
      if (raw.startsWith('*')) { inEm = true; raw = raw.slice(1); }
      let close = false;
      if (/\*[^\w]*$/.test(raw)) { close = true; raw = raw.replace(/\*([^\w]*)$/, '$1'); }
      const isEm = inEm || (!!em && raw.replace(/[^\w]/g, '') === String(em).replace(/[^\w]/g, ''));
      if (close) inEm = false;
      const s = h('span', 'word', h1, isEm ? `<em>${esc(raw)}</em>` : esc(raw));
      s._em = isEm;
      h1.appendChild(document.createTextNode(' '));
      return s;
    });
  }
  const plain = (t) => String(t || '').replace(/\*/g, '');
  const wc = (t) => plain(t).split(/\s+/).filter(Boolean).length;
  // How long a line needs on screen to be read, plus a beat for its emphasis.
  const readFor = (t) => 0.5 + 0.19 * wc(t) + (/\*/.test(t || '') ? 0.25 : 0);
  // An emphasised word: a beat late, a little large, then settling.
  const EM_DELAY = 0.3;
  function placeCopy(cb, mode) {
    const o = cb.outer.style;
    if (mode === 'center' || cb.o.center) {
      const y = cb.o.y != null ? cb.o.y : H / 2;
      o.left = (PORTRAIT ? 70 : 200) + 'px'; o.width = (W - (PORTRAIT ? 140 : 400)) + 'px'; o.top = y + 'px'; o.justifyContent = 'center';
    } else {
      o.left = A.copyX + 'px'; o.width = A.copyW + 'px'; o.top = A.copyY + 'px';
      o.justifyContent = PORTRAIT ? 'center' : 'flex-start';
      cb.inner.style.textAlign = PORTRAIT ? 'center' : 'left';
    }
  }
  // Words rise in one by one from `a`; the block leaves from `c`. Film A
  // drifts in softly and leaves word by word; film B snaps.
  function renderCopy(cb, t, a, c) {
    const SA = V !== 'b';
    const exitLen = SA ? 0.4 + cb.words.length * 0.025 : 0.3;
    const outAll = c == null ? 1 : 1 - E.inOut(seg(t, c, c + exitLen));
    const out = c == null ? 1 : 1 - E.inOut(seg(t, c, c + (SA ? 0.4 : 0.3)));
    const vis = t >= a - 0.05 && outAll > 0;
    alpha(cb.outer, vis ? 1 : 0);
    if (!vis) return;
    if (cb.lab) { const p = E.out(seg(t, a, a + (SA ? 0.55 : 0.45))); put(cb.lab, { y: lerp(14, 0, p) - (1 - out) * 10, o: p * out }); }
    cb.words.forEach((w, i) => {
      const d = w._em ? EM_DELAY : 0;
      const p = SA ? E.out(seg(t, a + d + 0.04 + i * 0.04, a + d + 0.62 + i * 0.04)) : E.out5(seg(t, a + d + 0.03 + i * 0.035, a + d + 0.36 + i * 0.035));
      const ow = c == null ? 1 : 1 - E.inOut(seg(t, c + (SA ? i * 0.025 : 0), c + (SA ? 0.4 + i * 0.025 : 0.3)));
      put(w, { y: lerp(SA ? 24 : 54, 0, p) - (1 - ow) * (SA ? 18 : 22), s: w._em ? lerp(1.2, 1, p) : SA ? 1 : lerp(1.18, 1, p), o: clamp(p * 1.3) * ow });
    });
    put(cb.h1, { s: SA ? 1 : lerp(1.07, 1, E.out5(seg(t, a, a + 0.6))) });
    if (cb.sub) { const p = E.out(seg(t, a + 0.2 + cb.words.length * 0.035, a + (SA ? 0.8 : 0.6) + cb.words.length * 0.03)); put(cb.sub, { y: lerp(SA ? 12 : 16, 0, p) - (1 - out) * 10, o: p * out }); }
    if (cb.sub2) alpha(cb.sub2, 0);
  }
  // A second supporting line that takes over from the first at `at`.
  function swapSub(cb, t, at, end) {
    if (!cb.sub2) return;
    const p = E.inOut(seg(t, at, at + 0.35)); const out = end == null ? 1 : 1 - E.inOut(seg(t, end, end + 0.4));
    put(cb.sub, { y: -10 * p, o: (1 - p) * out * Number(cb.sub._op || 1) });
    put(cb.sub2, { y: lerp(12, 0, p), o: p * out });
  }

  // ---------------------------------------------------------------- scenes
  // Each scene has a nominal length; its timings stretch to the length it is
  // given. build() makes its own elements, render(lt, k, ctx) draws it at
  // local time lt (seconds; k = actual/nominal) and reports the phone pose,
  // which app screens are showing and its sound cues.
  // The beat nearest a moment in a scene, so taps, locks and reveals land on the music.
  const snapB = (o, v) => (film && film.beat ? Math.round((o._start + v) / film.beat) * film.beat - o._start : v);
  const POSE = {
    hidden: () => ({ ...A.phone, y: A.phone.y + 160, s: A.phone.s * 0.9, ry: A.phone.ry - 38, o: 0 }),
    hero: () => ({ ...A.phone, o: 1 }),
    left: () => ({ ...A.phoneL, o: 1 }),
    away: () => ({ ...A.phone, y: A.phone.y + 120, s: A.phone.s * 0.86, o: 0 }),
  };
  // A slow push-in: 1 outside [a,d], `amount` inside [b,c], smooth both ways.
  const zoomWin = (lt, a, b, c, d, amount) => 1 + (amount - 1) * E.inOut(seg(lt, a, b)) * (1 - E.inOut(seg(lt, c, d)));
  const mixPose = (a, b, p) => ({ x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), z: lerp(a.z || 0, b.z || 0, p), s: lerp(a.s, b.s, p), rx: lerp(a.rx || 0, b.rx || 0, p), ry: lerp(a.ry || 0, b.ry || 0, p), r: lerp(a.r || 0, b.r || 0, p), o: lerp(a.o, b.o, p) });

  // Earn's pace up to the reveal, per film.
  const EARN_PACE = { a: 0.72, b: 0.7, c: 0.72 };
  // Privacy's pace up to the pulse.
  const PRIV_PACE = 0.8;
  let phone, phone2, fx;
  const SC = {};

  // The endless feed racing past, then frozen under the headline.
  SC.stream = {
    nominal: 2.04, title: 'The endless feed',
    build(o) {
      const s = { rows: [] };
      const people = CAST.crowd;
      const nRows = PORTRAIT ? 5 : 3;
      for (let r = 0; r < nRows; r++) {
        const row = h('div', 'abs', stage); const cards = [];
        const n = Math.ceil(W / 240) + 4;
        for (let i = 0; i < n; i++) { const p = people[(i * 3 + r * 5) % people.length]; cards.push(h('div', 'stream-card abs', row, `<img src="${esc(p.photo)}" alt="">`)); }
        s.rows.push({ row, cards });
      }
      // A soft pool behind the headline.
      s.scrim = h('div', 'abs', stage); s.scrim.style.cssText += `;width:1px;height:1px;box-shadow:0 0 360px 300px ${V === 'a' ? 'rgba(252,252,251,0.9)' : 'rgba(6,5,4,0.88)'};border-radius:50%`;
      s.copy = copyBlock({ h: o.copy, dark: true, center: true, caption: !!o.hook, em: o.em });
      if (o.copy2) s.copy2 = copyBlock({ h: o.copy2, dark: true, center: true, caption: !!o.hook });
      return s;
    },
    render(s, lt, k, o) {
      const T = (x) => x * k;
      const tf = T(o.copy2 ? 0.85 : 1.05);
      const frozen = lt >= tf;
      // A slow opening drifts, gathering speed; otherwise the feed races.
      const tt = Math.min(Math.max(lt, 0), tf);
      const dist = o.slow ? 120 * tt + 90 * tt * tt : 3600 * tt;
      const dim = frozen ? E.out(seg(lt, tf + 0.05, tf + 0.5)) : 0;
      const outA = win(lt, null, null, T(1.5), T(1.95));
      const span = (Math.ceil(W / 240) + 4) * 240;
      const squeeze = 1 - 0.05 * E.out(seg(lt, tf, tf + 0.4));
      s.rows.forEach((R, r) => {
        const dir = r % 2 ? 1 : -1; const off = dist * (0.8 + 0.12 * r);
        const y = PORTRAIT ? 380 + r * 300 : H / 2 + (r - 1) * 300;
        put(R.row, { x: 0, y, o: outA * lerp(1, 0.32, dim), b: frozen ? 0 : o.slow ? Math.min(8, (120 + 180 * tt) / 160) : 12 });
        R.cards.forEach((c, i) => {
          let x = (i * 240 + dir * off) % span; if (x < 0) x += span; x -= 240;
          put(c, { x: (x + 120 - W / 2) * squeeze + W / 2, y: 0, r: dir * -2 + hash(i + r * 7) * 3 - 1.5, s: squeeze });
        });
      });
      put(s.scrim, { x: W / 2, y: H / 2, s: PORTRAIT ? 1.3 : 1, o: win(lt, 0, 0.25, T(1.55), T(1.95)) });
      placeCopy(s.copy, 'center');
      // The problem: the first line over the racing feed, the second as it freezes.
      if (s.copy2) { renderCopy(s.copy, lt, T(0.06), tf - T(0.12)); placeCopy(s.copy2, 'center'); renderCopy(s.copy2, lt, tf + T(0.04), T(1.6)); }
      else renderCopy(s.copy, lt, T(0.08), T(1.55));
      // Flicks while the feed races (rising), a negative tap as it freezes.
      const flicks = o.slow ? [0.25, 0.55, 0.72, 0.8] : [0.1, 0.32, 0.54, 0.76];
      return { cues: flicks.filter((x) => T(x) < tf - 0.1).map((x) => [T(x), 'swipe']).concat([[tf, 'thud']]) };
    },
  };

  // The phone spins in from deep in the frame and lands on the lock screen.
  SC.arrive = {
    nominal: 2.04, title: 'The phone',
    build(o) { const s = {}; if (o.copy) s.copy = copyBlock({ h: o.copy, dark: true, caption: !!o.caption, em: o.em }); return s; },
    render(s, lt, k, o) {
      const T = (x) => x * k;
      const Tb = (x) => snapB(o, x * k);
      const dur = T(V === 'a' ? 1.05 : 0.8);
      const p = E.out5(seg(lt, 0, dur));
      const hero = POSE.hero();
      // A spins in from deep in the frame; B rises from below, tipping upright.
      const pose = V === 'b'
        ? { ...hero, y: hero.y + lerp(H * 0.9, 0, p), z: lerp(400, 0, p), rx: (hero.rx || 0) + lerp(-55, 0, p), r: lerp(8, 0, p), o: clamp(p * 3) }
        : { ...hero, y: hero.y + lerp(PORTRAIT ? 520 : 280, 0, p), z: lerp(-2600, 0, p), ry: (hero.ry || 0) + lerp(-540, 0, p), rx: lerp(30, 0, p), r: lerp(-16, 0, p), o: clamp(p * 4) };
      const nAt = snapB(o, 0.95 * Math.min(k, 1)), np = E.spring(seg(lt, nAt, nAt + 0.4));
      put(phone.scr.notif, { y: lerp(-140, 0, np), s: lerp(0.92, 1, np), o: seg(lt, nAt, nAt + 0.15) });
      txt(phone.scr.notifText, o.notification);
      if (s.copy) { placeCopy(s.copy); renderCopy(s.copy, lt, 0.1, T(1.75)); }
      const land = dur * 0.45;
      return { pose, screens: { lock: 1 }, lands: [land], cues: [[0.05, 'swish'], [land, 'land'], [nAt, 'notif']] };
    },
  };

  // Pillar 1: five introductions fan out, gather in, swipe and choose.
  SC.daily = {
    nominal: 4.09, title: 'Quality over quantity',
    build(o) {
      const s = { fan: [] };
      CAST.intros.forEach((p) => s.fan.push(h('div', 'fan-card abs', fx.front, `<img src="${esc(p.photo)}" alt=""><div class="nm">${esc(p.name)}</div>`)));
      s.copy = copyBlock({ label: o.label, h: o.copy, sub: o.sub, caption: !!o.caption, em: o.em });
      return s;
    },
    render(s, lt, k, o) {
      const T = (x) => x * k;
      const Tb = (x) => snapB(o, x * k);
      const ph = POSE.hero();
      s.fan.forEach((c, i) => {
        const n = s.fan.length; const a = ((i - (n - 1) / 2) / ((n - 1) / 2)) * 26;
        const pOut = E.spring(seg(lt, T(0.15 + i * 0.05), T(0.85 + i * 0.05)));
        const pIn = E.inOut(seg(lt, T(1.35 + (n - 1 - i) * 0.04), T(1.8 + (n - 1 - i) * 0.04)));
        const R = 760, rad = (a * Math.PI) / 180;
        const fanX = ph.x + Math.sin(rad) * R, fanY = ph.y + 700 - Math.cos(rad) * R - 40;
        const from = { x: ph.x, y: ph.y + 160 }, to = { x: ph.x, y: ph.y - 20 };
        const x = pIn > 0 ? lerp(fanX, to.x, pIn) : lerp(from.x, fanX, pOut);
        const y = pIn > 0 ? lerp(fanY, to.y, pIn) : lerp(from.y, fanY, pOut);
        const FS = PORTRAIT ? 1.25 : 0.92;
        const tilt = pIn > 0 ? 1 - pIn : pOut;
        put(c, { x, y, r: a * tilt, ry: -a * 0.9 * tilt, rx: 10 * tilt, s: pIn > 0 ? lerp(FS, 0.7, pIn) : lerp(0.55, FS, pOut), o: clamp(pOut * 1.6) * (1 - E.in(pIn)) });
      });
      showDeck(false);
      // The first choice lands on a beat; the rest follow it at fixed gaps, so
      // nothing collapses onto the same beat when the scene is short.
      const c0 = Tb(1.75), steps = [c0 + T(0.3), c0 + T(0.7), c0 + T(1.55)];
      let idx = 0; steps.forEach((a) => { idx += E.spring(seg(lt, a, a + 0.35)); });
      const chosenAt = [c0, null, c0 + T(1.15), null, null];
      phone.scr.cards.forEach((c, i) => {
        const off = i - idx;
        if (off < 0) { const q = clamp(-off); put(c.el, { x: -off * -470, y: q * 30, r: off * 14, o: 1 - clamp((q - 0.35) / 0.65) }); }
        else put(c.el, { x: 0, y: off * 16, s: 1 - 0.045 * off, o: off < 2.4 ? 1 - clamp(off - 1.4) : 0 });
        const cp = chosenAt[i] == null ? 0 : E.spring(seg(lt, chosenAt[i], chosenAt[i] + 0.4));
        put(c.chk, { s: lerp(0.4, 1, cp), o: cp });
      });
      const cur = Math.round(idx);
      phone.scr.dots.forEach((d, i) => sty(d, 'background', i === cur ? C.brand.ink : 'rgba(10,10,10,0.14)'));
      const count = chosenAt.filter((x) => x != null && lt >= x).length;
      const curChosen = chosenAt[cur] != null && lt >= chosenAt[cur];
      txt(phone.scr.hint, count ? `${count} of 3 chosen` : 'Choose up to 3. Nobody is told unless it is mutual.');
      txt(phone.scr.btn, curChosen ? `✓ Interested ${count}/3` : 'Show interest');
      cls(phone.scr.btn, 'ink', !curChosen); cls(phone.scr.btn, 'outline', curChosen);
      const press = Math.max(...chosenAt.filter((x) => x != null).map((x) => Math.exp(-Math.pow((lt - x + 0.05) * 9, 2))));
      put(phone.scr.btn, { s: 1 - press * 0.05 });
      placeCopy(s.copy); renderCopy(s.copy, lt, 0.1, T(3.7));
      const cues = [[T(1.4), 'swish']];
      s.fan.forEach((_, i) => cues.push([T(0.15 + i * 0.05) + i * 0.04, 'pop']));
      steps.forEach((a) => cues.push([a, 'swipe']));
      chosenAt.forEach((x) => { if (x != null) cues.push([x, 'tap']); });
      return { pose: ph, screens: { daily: 1 }, cues, zoom: [zoomWin(lt, c0 - 0.55, c0, chosenAt[2] + 0.3, chosenAt[2] + 0.75, 1.32), 0.18] };
    },
  };

  // Pillar 2: private preferences go into a vault; one-sided interest dissolves.
  SC.privacy = {
    nominal: 3.06, title: 'Attraction & privacy',
    build(o) {
      const s = {};
      s.lock = h('div', 'abs', fx.front, `<div style="width:150px;height:150px;margin:-75px 0 0 -75px;border-radius:50%;background:rgba(10,10,10,0.86);display:grid;place-items:center;box-shadow:0 0 0 10px rgba(197,160,84,0.25),0 30px 60px -20px rgba(0,0,0,0.5)">
        <svg viewBox="0 0 48 48" width="68" fill="none" stroke="#D6B469" stroke-width="3.5" stroke-linecap="round"><rect x="11" y="22" width="26" height="19" rx="5" fill="rgba(214,180,105,0.12)"/><path class="shackle" d="M16 22v-6a8 8 0 0 1 16 0v6"/></svg></div>`);
      s.shackle = s.lock.querySelector('.shackle');
      s.target = h('div', 'avatar abs', fx.front, `<img src="${esc(CAST.other[1].photo)}" alt="">`);
      s.ring = h('div', 'ring abs', fx.front);
      s.sparks = Array.from({ length: 14 }, () => h('div', 'spark abs', fx.front));
      s.tag = h('div', 'tagbubble abs', fx.front, esc(o.tag || CAST.otherTold));
      s.copy = copyBlock({ label: o.label, h: o.copy, sub: o.sub, sub2: o.sub2, caption: !!o.caption, em: o.em });
      return s;
    },
    render(s, lt, k, o) {
      // A set pace up to the pulse; the line that follows is held to be read.
      const T = (x) => x * PRIV_PACE, Tb = (x) => snapB(o, x * PRIV_PACE);
      const P = phone.scr.pref;
      const a1 = E.inOut(seg(lt, T(0.15), T(0.9))), a2 = E.inOut(seg(lt, T(0.3), T(1.05)));
      const ageMin = Math.round(lerp(22, 24, a1)), ageMax = Math.round(lerp(38, 31, a1));
      const hMin = Math.round(lerp(150, 165, a2)), hMax = Math.round(lerp(200, 180, a2));
      txt(P.age.v, `${ageMin}–${ageMax} years`); txt(P.ht.v, `${hMin}–${hMax} cm`);
      const setTrack = (tr, lo, hi, a, b) => { const l = (lo - a) / (b - a) * 100, r = (hi - a) / (b - a) * 100; const th = tr.querySelectorAll('.thumb'); sty(th[0], 'left', l + '%'); sty(th[1], 'left', r + '%'); const f = tr.querySelector('.fill'); sty(f, 'left', l + '%'); sty(f, 'width', (r - l) + '%'); };
      setTrack(P.ageT, ageMin, ageMax, 18, 45); setTrack(P.htT, hMin, hMax, 145, 205);
      const tg = E.spring(seg(lt, Tb(1.0), Tb(1.0) + 0.35));
      sty(P.toggle, 'background', tg > 0.5 ? C.brand.ink : '#EDEBE6'); put(P.knob, { x: tg * 18 });
      [1, 3].forEach((ci, n) => cls(P.chips[ci], 'on', lt >= T(0.6 + n * 0.15)));
      cls(P.chips[0], 'on', lt >= T(0.5));
      // Vault: the screen dims under a padlock that clicks shut.
      const lv = E.spring(seg(lt, Tb(1.3), Tb(1.3) + 0.4));
      const lockOut = 1 - E.inOut(seg(lt, T(1.85), T(2.15)));
      const ph = POSE.hero();
      put(s.lock, { x: ph.x, y: ph.y - 40, s: lerp(1.5, 1, lv) * (PORTRAIT ? 1.45 : 1), o: clamp(lv * 1.3) * lockOut });
      s.shackle.style.transform = `translateY(${lerp(-6, 0, E.spring(seg(lt, Tb(1.3) + 0.15, Tb(1.3) + 0.4))).toFixed(2)}px)`;
      put(P.p, { s: 1 - 0.04 * lv * lockOut, b: 6 * lv * lockOut, o: 1 - 0.35 * lv * lockOut });
      // One-sided interest: a pulse that never arrives.
      const pAt = Tb(2.3), tagEnd = pAt + 0.4 + readFor(s.tag.textContent) + 0.3;
      const tx = PORTRAIT ? ph.x + 300 : ph.x + 400, ty = PORTRAIT ? ph.y - 640 : ph.y - 170;
      put(s.target, { x: tx, y: ty, s: lerp(0.8, 1, E.spring(seg(lt, T(1.95), T(2.4)))), o: win(lt, T(1.95), T(2.2), tagEnd, tagEnd + 0.3) });
      const rp = seg(lt, pAt, pAt + 0.45);
      const fx0 = ph.x, fy0 = ph.y + 150;
      put(s.ring, { x: lerp(fx0, tx, rp * 0.62), y: lerp(fy0, ty, rp * 0.62), s: lerp(0.25, 0.9, rp), o: rp > 0 && rp < 1 ? (1 - rp) * 1.2 : 0 });
      s.sparks.forEach((sp, i) => {
        const sp2 = seg(lt, pAt + 0.4, pAt + 0.95); const ang = (i / s.sparks.length) * Math.PI * 2 + hash(i) * 0.6;
        put(sp, { x: lerp(fx0, tx, 0.6) + Math.cos(ang) * 90 * E.out(sp2), y: lerp(fy0, ty, 0.6) + Math.sin(ang) * 90 * E.out(sp2), s: 1.5 - sp2, o: sp2 > 0 ? 1 - sp2 : 0 });
      });
      put(s.tag, { x: tx - (PORTRAIT ? 260 : 120), y: ty + 100, o: win(lt, pAt + 0.4, pAt + 0.6, tagEnd, tagEnd + 0.3), s: lerp(0.9, 1, E.spring(seg(lt, pAt + 0.4, pAt + 0.8))) });
      placeCopy(s.copy); renderCopy(s.copy, lt, 0.1, tagEnd); swapSub(s.copy, lt, T(1.95), tagEnd);
      // Back on Daily: Yasmine's card, interest shown, never told.
      const back = E.inOut(seg(lt, T(1.8), T(2.05)));
      if (back > 0) {
        showDeck(true);
        phone.scr.cards2.forEach((c, i) => {
          const off = i - 1;
          if (off < 0) put(c.el, { x: -470, r: -14, o: 0 }); else put(c.el, { x: 0, y: off * 16, s: 1 - 0.045 * off, o: off < 2.4 ? 1 - clamp(off - 1.4) : 0 });
          const cp = i === 1 ? E.spring(seg(lt, T(2.15), T(2.5))) : 0; put(c.chk, { s: lerp(0.4, 1, cp), o: cp });
        });
        phone.scr.dots.forEach((d, i) => sty(d, 'background', i === 1 ? C.brand.ink : 'rgba(10,10,10,0.14)'));
        const on = lt >= T(2.15);
        txt(phone.scr.hint, on ? '3 of 3 chosen' : '2 of 3 chosen');
        txt(phone.scr.btn, on ? '✓ Interested 3/3' : 'Show interest');
        cls(phone.scr.btn, 'ink', !on); cls(phone.scr.btn, 'outline', on);
        put(phone.scr.btn, { s: 1 - 0.05 * Math.exp(-Math.pow((lt - T(2.1)) * 9, 2)) });
      }
      return { zoom: [zoomWin(lt, T(0.1), T(0.5), T(1.05), T(1.35), 1.28), -0.1], pose: ph, screens: { prefs: 1 - back, daily: back }, cues: [[Tb(1.0), 'toggle'], [Tb(1.3) + 0.15, 'lock'], [pAt, 'pulse'], [pAt + 0.4, 'dissolve']] };
    },
  };

  // Pillar 3: mutual, questions chosen separately, answers sealed, then compared.
  SC.earn = {
    nominal: 6.13, title: 'Earn the conversation',
    build(o) {
      const s = {};
      s.heart = h('div', 'abs', fx.front, heartSvg()); s.heart.style.cssText += ';width:130px;margin:-54px 0 0 -65px;filter:drop-shadow(0 10px 30px rgba(252,60,108,0.45))';
      const hp = s.heart.querySelector('path'); hp.setAttribute('fill', C.brand.pink);
      s.copy = copyBlock({ label: o.label, h: o.copy, caption: !!o.caption, em: o.em });
      // The rule itself arrives with the reveal, word by word, over the phone.
      s.reveal = h('div', 'reveal abs', fx.front);
      s.rwords = (o.reveal || '').split(/\s+/).filter(Boolean).map((w) => { const sp = h('span', 'word', s.reveal, esc(w)); s.reveal.appendChild(document.createTextNode(' ')); return sp; });
      return s;
    },
    render(s, lt, k, o) {
      // Up to the reveal the scene keeps a set pace; after it, everything is
      // timed from the reveal so each line stays up long enough to read.
      const kp = EARN_PACE[V], T = (x) => x * kp;
      const Tb = (x) => snapB(o, x * kp);
      showDeck(false);
      const toPair = E.inOut(seg(lt, T(0), T(0.6)));
      const back = E.inOut(seg(lt, T(1.45), T(1.9)));
      const pose = mixPose(mixPose(POSE.hero(), POSE.left(), toPair), POSE.hero(), back);
      // The match's phone swings in, turning to face you.
      const p2in = E.soft(seg(lt, T(0.05), T(0.7))), p2out = E.inOut(seg(lt, T(1.35), T(1.8)));
      const r = A.phoneR, turn = lerp(-200, 0, E.out(seg(lt, T(0.05), T(0.75))));
      if (PORTRAIT) setPose(phone2, { x: r.x, y: lerp(r.y + 900, r.y, p2in) + p2out * 900, s: r.s, r: r.r, ry: turn, o: p2in * (1 - p2out) });
      else setPose(phone2, { x: lerp(r.x + 500, r.x, p2in) + p2out * 520, y: r.y, s: r.s, ry: r.ry + turn, o: p2in * (1 - p2out) });
      const hp = E.spring(seg(lt, Tb(0.75), Tb(0.75) + 0.5));
      const beat = 1 + 0.06 * Math.sin(Math.max(0, lt - T(1.1)) * 9) * Math.exp(-Math.max(0, lt - T(1.1)) * 2);
      put(s.heart, { x: (A.phoneL.x + r.x) / 2, y: PORTRAIT ? (A.phoneL.y + r.y) / 2 : A.phoneL.y - 330, s: hp * beat * (PORTRAIT ? 1.5 : 1), o: clamp(hp * 2) * (1 - E.inOut(seg(lt, T(1.3), T(1.6)))) });
      // Questions: three picked one by one, the shared one marked.
      const Qs = phone.scr.q;
      const p0 = Tb(2.15), picks = C.chosen.map((qi, n) => [qi, p0 + n * T(0.28)]);
      Qs.rows.forEach((row, i) => {
        const pk = picks.find(([qi]) => qi === i); const p = pk ? E.spring(seg(lt, pk[1], pk[1] + 0.35)) : 0;
        sty(row.ck, 'background', p > 0.3 ? C.brand.gold : 'transparent'); sty(row.ck, 'borderColor', p > 0.3 ? C.brand.gold : 'rgba(10,10,10,0.14)');
        put(row.ck, { s: 1 + 0.25 * Math.sin(Math.PI * clamp(p)) });
        sty(row.r, 'borderColor', p > 0.3 ? 'rgba(184,145,79,0.55)' : 'transparent');
        alpha(row.tag, C.shared.includes(i) ? E.out(seg(lt, T(3.0), T(3.25))) : 0);
      });
      const nPicked = picks.filter(([, at]) => lt >= at).length;
      txt(Qs.count, nPicked >= 3 ? 'Answer them' : `${nPicked} of 3 chosen`);
      // Answers: mine typed, theirs sealed, then both side by side.
      const Aa = phone.scr.a;
      txt(Aa.me, C.answers.me.slice(0, Math.round(C.answers.me.length * seg(lt, T(3.35), T(3.95)))));
      const r0 = Tb(4.1), sAt = r0 + readFor(o.reveal) + 0.25;
      const unseal = E.inOut(seg(lt, r0, r0 + 0.3));
      alpha(Aa.seal, 1 - unseal);
      alpha(Aa.m1, 1 - unseal); alpha(Aa.m2, unseal);
      const sp = E.spring(seg(lt, sAt, sAt + 0.45));
      put(Aa.sum, { y: lerp(60, 0, sp), o: clamp(sp * 1.5) });
      txt(Aa.st, C.summary.slice(0, Math.round(C.summary.length * seg(lt, sAt + 0.12, sAt + 0.8))));
      // The rule pops in word by word as the answers unseal, then gets out of the way.
      const rOut = 1 - E.inOut(seg(lt, sAt - 0.15, sAt + 0.15));
      const phc = POSE.hero();
      put(s.reveal, { x: PORTRAIT ? W / 2 : phc.x, y: PORTRAIT ? phc.y + 120 : phc.y + 40, o: lt >= r0 - 0.05 ? rOut : 0, s: lerp(1.08, 1, E.out5(seg(lt, r0, r0 + 0.4))) });
      s.rwords.forEach((w, i) => { const p = E.spring(seg(lt, r0 + i * 0.06, r0 + 0.3 + i * 0.06)); put(w, { y: lerp(30, 0, p), s: lerp(0.6, 1, p), o: clamp(p * 1.8) }); });
      const toQ = E.inOut(seg(lt, T(1.75), T(2.0))), toA = E.inOut(seg(lt, T(3.15), T(3.4)));
      const toChat = E.inOut(seg(lt, sAt + 0.85, sAt + 1.1));
      phone.scr.chat.bubbles.forEach((b, i) => { const bp = E.spring(seg(lt, sAt + 1.0 + i * 0.18, sAt + 1.32 + i * 0.18)); put(b, { y: lerp(18, 0, bp), s: lerp(0.9, 1, bp), o: clamp(bp * 1.6) }); });
      placeCopy(s.copy); renderCopy(s.copy, lt, 0.1, sAt + 1.2);
      const cues = [[T(0.05), 'swipe'], [Tb(0.75), 'heart'], [T(3.0), 'pop'], [T(3.35), 'type', 0, T(0.6)], [r0, 'unlock'], [sAt, 'swish'], [sAt + 1.05, 'pop'], [sAt + 1.23, 'pop']];
      picks.forEach(([, at]) => cues.push([at, 'tap']));
      return {
        pose, screens: { daily: 1 - toPair, match: toPair * (1 - toQ), q: toQ * (1 - toA), a: toA * (1 - toChat), chat: toChat },
        zoom: [zoomWin(lt, T(3.3), T(3.8), sAt + 0.25, sAt + 0.7, 1.34), -0.06],
        cues,
      };
    },
  };

  // Pillar 4: Halal Cards fan out; the headline speaks many languages.
  SC.cards = {
    nominal: 3.06, title: 'Halal Cards',
    build(o) {
      const s = { deck: [] };
      // Only the illustrated covers: every card in the fan shows a picture.
      C.cards.forEach((c) => s.deck.push(h('div', 'deck-card abs', PORTRAIT ? fx.front : fx.back, `<img src="${esc(c.img)}" alt=""><div class="cl"><div class="micro">${esc(c.kind)}</div><b>${esc(c.title)}</b></div>`)));
      s.copy = copyBlock({ label: o.label, h: o.copy, sub: o.sub, caption: !!o.caption, em: o.em });
      s.langs = C.languages.slice(0, o.langs || C.languages.length);
      return s;
    },
    render(s, lt, k, o) {
      const T = (x) => x * k;
      const ph = POSE.hero(); const n = s.deck.length;
      s.deck.forEach((el, i) => {
        if (PORTRAIT) {
          const a = -34 + (68 * i) / (n - 1), rad = (a * Math.PI) / 180, R = 820;
          const pOut = E.spring(seg(lt, T(0.1 + i * 0.04), T(0.75 + i * 0.04)));
          const pIn = E.inOut(seg(lt, T(1.75 + (n - 1 - i) * 0.03), T(2.2 + (n - 1 - i) * 0.03)));
          const fx1 = ph.x + Math.sin(rad) * R, fy1 = ph.y + 760 - Math.cos(rad) * R - 120;
          const tilt = pIn > 0 ? 1 - pIn : pOut;
          put(el, { x: pIn > 0 ? lerp(fx1, ph.x, pIn) : lerp(ph.x, fx1, pOut), y: pIn > 0 ? lerp(fy1, ph.y, pIn) : lerp(ph.y + 200, fy1, pOut), r: a * tilt, ry: -a * 0.5 * tilt, rx: 8 * tilt, s: pIn > 0 ? lerp(1.15, 0.6, pIn) : lerp(0.5, 1.15, pOut), o: clamp(pOut * 1.6) * (1 - E.in(pIn)) });
          return;
        }
        // Widescreen keeps the deck clear of the headline on the left.
        const a = -56 + (112 * i) / (n - 1);
        const p = E.spring(seg(lt, T(0.15 + i * 0.05), T(0.9 + i * 0.05)));
        const out = 1 - E.inOut(seg(lt, T(2.55), T(2.95)));
        const R = 470, rad = (a * Math.PI) / 180;
        const drift = Math.sin(lt * 0.8 + i) * 6;
        put(el, { x: ph.x + Math.sin(rad) * R * p, y: ph.y + 120 - Math.cos(rad) * R * p + drift, r: a * 0.6 * p, ry: -a * 0.45 * p, rx: 12 * p, s: lerp(0.5, 0.82, p), o: clamp(p * 1.5) * out });
      });
      put(phone.scr.hc.grid, { y: -E.inOut(seg(lt, T(1.0), T(2.5))) * 120 });
      // Language flip over the headline.
      placeCopy(s.copy);
      const l0 = T(PORTRAIT ? 1.3 : 1.0), step = Math.max(0.2, (T(2.6) - l0) / s.langs.length);
      // Without a headline here (the pink card carries the message) there is nothing to translate.
      const li = lt < l0 || !s.copy.o.h ? -1 : Math.min(s.langs.length - 1, Math.floor((lt - l0) / step));
      const want = li < 0 ? s.copy.o.h : s.langs[li];
      if (s.copy._shown !== want) { s.copy.words = setWords(s.copy.h1, want, s.copy.o.em); s.copy._shown = want; s.copy._at = li < 0 ? null : l0 + li * step; }
      renderCopy(s.copy, lt, T(0.1), T(2.65));
      if (s.copy._at != null) {
        const p = E.out(seg(lt, s.copy._at, s.copy._at + 0.2));
        s.copy.words.forEach((w) => put(w, { y: lerp(18, 0, p), o: p * (1 - E.inOut(seg(lt, T(2.65), T(3.0)))) }));
      }
      const cues = [];
      s.deck.forEach((_, i) => { if (i < 5) cues.push([T(0.1 + i * 0.05) + i * 0.05, 'pop']); });
      return { pose: ph, screens: { cards: 1 }, cues };
    },
  };

  // Premium: the phone turns gold, five become ten.
  SC.premium = {
    nominal: 3.06, title: 'Premium',
    build(o) {
      const s = { fan: [] };
      CAST.ten.slice(0, 10).forEach((p) => s.fan.push(h('div', 'fan-card gold abs', fx.back, `<img src="${esc(p.photo)}" alt=""><div class="nm">${esc(p.name)}</div>`)));
      s.copy = copyBlock({ label: o.label, h: o.copy, sub: o.sub, dark: true, caption: !!o.caption, em: o.em });
      return s;
    },
    render(s, lt, k, o) {
      const T = (x) => x * k;
      const Tb = (x) => snapB(o, x * k);
      const ph = POSE.hero();
      const five = E.spring(seg(lt, T(0.05), T(0.6))), ten = E.spring(seg(lt, Tb(0.75), Tb(0.75) + 0.55));
      const out = 1 - E.inOut(seg(lt, T(2.6), T(3.0)));
      s.fan.forEach((c, i) => {
        const a5 = i < 5 ? ((i - 2) / 2) * 14 : 0;
        const a10 = ((i - 4.5) / 4.5) * (PORTRAIT ? 34 : 40);
        const a = lerp(a5, a10, ten);
        const p = i < 5 ? five : ten;
        const R = PORTRAIT ? 1000 : 900, rad = (a * Math.PI) / 180;
        put(c, { x: ph.x + Math.sin(rad) * R * p, y: lerp(ph.y, ph.y + 950 - Math.cos(rad) * R - 160, p), r: a * p, ry: -a * 0.7 * p, s: lerp(0.55, PORTRAIT ? 0.82 : 0.78, p), o: clamp(p * 1.4) * out });
      });
      phone.scr.pr.feats.forEach((f, i) => { const p = E.out(seg(lt, T(0.55 + i * 0.15), T(0.9 + i * 0.15))); put(f, { x: lerp(24, 0, p), o: p }); });
      alpha(phone.scr.pr.fine, E.out(seg(lt, T(1.6), T(1.9))));
      placeCopy(s.copy); renderCopy(s.copy, lt, 0.1, T(2.65));
      return { zoom: [zoomWin(lt, T(0.55), T(1.0), T(2.0), T(2.5), 1.24), -0.04], pose: ph, screens: { premium: 1 }, cues: [[0, 'shimmer'], [Tb(0.75), 'shimmer']] };
    },
  };

  // Safety: hide, block, report; a shield settles.
  SC.safety = {
    nominal: 2.04, title: 'Safety',
    build(o) {
      const s = {};
      s.shield = h('div', 'shield abs', fx.front, `<div style="width:190px;height:190px;margin:-95px 0 0 -95px;border-radius:50%;background:rgba(10,10,10,0.88);display:grid;place-items:center;box-shadow:0 0 0 12px rgba(197,160,84,0.22),0 30px 60px -20px rgba(0,0,0,0.5)">${ICON.shield.replace('<svg', '<svg width="104" style="margin:0"')}</div>`);
      s.copy = copyBlock({ h: o.copy, caption: !!o.caption, em: o.em });
      return s;
    },
    render(s, lt, k, o) {
      const T = (x) => x * k;
      put(phone.scr.sf.sheet, { y: lerp(380, 0, E.spring(seg(lt, T(0.1), T(0.5)))) });
      const ph = POSE.hero();
      const shp = E.spring(seg(lt, T(0.3), T(0.8)));
      put(s.shield, { x: ph.x + (PORTRAIT ? 175 : 170) * ph.s, y: ph.y - 330 * ph.s, s: lerp(1.2, 0.72, shp), o: clamp(shp * 1.6) * (1 - E.inOut(seg(lt, T(1.6), T(1.95)))) });
      placeCopy(s.copy); renderCopy(s.copy, lt, T(0.1), T(1.75));
      return { pose: ph, screens: { safety: 1 }, cues: [[T(0.1), 'swish'], [T(0.4), 'toggle']] };
    },
  };

  // Close: the phone spins away into the distance; the wordmark, the line, the offer.
  SC.close = {
    nominal: 3.06, title: 'Halal Mode',
    build(o) {
      const s = {};
      s.logo = h('div', 'logo-word abs', stage);
      fetch('brand/logo.svg').then((r) => r.text()).then((svg) => {
        s.logo.innerHTML = svg.replace(/<\?xml[^>]*>/, '');
        s.logo.querySelectorAll('path, rect, polygon, circle, ellipse').forEach((p, i) => { p.style.fill = i === 0 ? C.brand.pink : (V === 'b' ? C.brand.surface : C.brand.ink); });
        frame();
      }).catch(() => { s.logo.innerHTML = '<div style="font:400 120px/1 var(--display);color:#FCFCFB;text-align:center">halal mode</div>'; });
      s.copy = copyBlock({ h: o.copy, dark: true, center: true, caption: !!o.caption });
      s.offer = h('div', 'offer abs', stage, esc(o.offer)); s.offer.style.transform = 'translateX(-50%)';
      s.url = h('div', 'url abs', stage, esc(o.url));
      return s;
    },
    render(s, lt, k, o) {
      const T = (x) => x * k;
      const Tb = (x) => snapB(o, x * k);
      // It launches: slow to start, gone by the time the wordmark lands.
      const hero = POSE.hero(), fp = E.in(seg(lt, 0, T(0.7)));
      const pose = { ...hero, y: hero.y - lerp(0, PORTRAIT ? 420 : 220, fp), z: lerp(0, -3200, fp), ry: (hero.ry || 0) + lerp(0, 540, fp), rx: lerp(0, -18, fp), o: 1 - seg(lt, T(0.3), T(0.62)) };
      const cy = H * (PORTRAIT ? 0.42 : 0.4);
      const lw = PORTRAIT ? 0.82 : 1;
      const lAt = T(0.5), lp = E.spring(seg(lt, lAt, lAt + (V === 'a' ? 0.8 : 0.5)));
      put(s.logo, { x: W / 2, y: cy - 60, s: lerp(V === 'a' ? 1.08 : 1.3, 1, lp) * lw, o: clamp(lp * (V === 'a' ? 1.4 : 2)) });
      s.copy.o.y = cy + 130; placeCopy(s.copy, 'center'); renderCopy(s.copy, lt, T(0.6));
      const oAt = snapB(o, 1.35), op = E.out(seg(lt, oAt, oAt + 0.35));
      const ow = s.offer.offsetWidth || 560, uw = s.url.offsetWidth || 300;
      put(s.offer, { x: W / 2 - ow / 2, y: cy + 250 + lerp(14, 0, op), o: op });
      const up = E.out(seg(lt, oAt + 0.12, oAt + 0.47));
      put(s.url, { x: W / 2 - uw / 2, y: cy + 340 + lerp(14, 0, up), o: up });
      return { pose, screens: { safety: 1 }, lands: [lAt + 0.15], cues: [[0.05, 'swish'], [lAt + 0.1, 'logo'], [oAt, 'pop']] };
    },
  };

  // A message between segments: the whole frame turns Halal Pink, one line,
  // then the next in its place; the pink lifts away to reveal the phone.
  // Each line stays up long enough to read; emphasised words land a beat late.
  const cardPlan = (o) => { const a = 0.28, mid = a + readFor(o.a) + 0.04; return { a, mid, end: (o.b ? mid + 0.06 + readFor(o.b) : mid) + 0.34 }; };
  SC.card = {
    nominal: 3.06, title: 'Message',
    build(o) {
      const s = {};
      s.el = h('div', 'pinkcard abs', stage);
      const line = (text) => { const e = h('div', 'pc-line', s.el); return { e, words: setWords(e, text || '') }; };
      s.l1 = line(o.a); s.l2 = line(o.b);
      cls(s.l2.e, 'pc-2', true);
      return s;
    },
    render(s, lt, k, o) {
      const T = (x) => x * k, dur = T(3.06), pl = cardPlan(o);
      sty(s.el, 'width', W + 'px'); sty(s.el, 'height', H + 'px');
      const ph = POSE.hero();
      // In: a circle of pink grows from the phone. Out: the pink lifts away.
      const pin = E.inOut(seg(lt, 0, 0.55)), pout = E.inOut(seg(lt, dur - 0.5, dur));
      const R0 = Math.hypot(W, H);
      sty(s.el, 'clipPath', pin >= 1 ? 'none' : `circle(${(R0 * pin).toFixed(1)}px at ${ph.x}px ${ph.y}px)`);
      put(s.el, { y: -H * pout, o: lt < 0 || lt > dur ? 0 : 1 });
      const words = (L, a, c) => L.words.forEach((w, i) => {
        const d = w._em ? EM_DELAY : 0;
        const p = E.out5(seg(lt, a + d + i * 0.04, a + d + 0.42 + i * 0.04));
        const q = c == null ? 0 : E.inOut(seg(lt, c, c + 0.3));
        put(w, { y: lerp(60, 0, p) - q * 40, s: w._em ? lerp(1.2, 1, p) : 1, o: clamp(p * 1.4) * (1 - q) });
      });
      words(s.l1, pl.a, o.b ? pl.mid : null); if (o.b) words(s.l2, pl.mid + 0.1, null);
      const cues = [[0.02, 'page']];
      [[o.a, pl.a, s.l1], [o.b, pl.mid + 0.1, s.l2]].forEach(([tx, a, L]) => { if (tx && /\*/.test(tx)) { const i = L.words.findIndex((w) => w._em); cues.push([a + EM_DELAY + i * 0.04 + 0.1, 'pop']); } });
      return { keep: true, cues };
    },
  };

  // Film B's messages: a conversation between Amina and her brother, typed
  // and sent like a real thread. Lines are "Name: text"; "Me:" is Amina.
  const parseThread = (txt) => String(txt || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const m = l.match(/^([^:]{1,24}):\s*(.*)$/); const nm = m ? m[1].trim() : '';
    return { me: /^me$/i.test(nm), name: /^me$/i.test(nm) ? '' : nm, text: m ? m[2] : l };
  });
  const typeFor = (t) => Math.min(0.6, 0.22 + 0.014 * plain(t).length);
  function threadPlan(msgs) {
    let t = 0.3; const steps = [];
    msgs.forEach((m) => { const prep = m.me ? typeFor(m.text) : 0.26; steps.push({ prep: t, at: t + prep }); t += prep + readFor(m.text); });
    return { steps, end: t + 0.3 };
  }
  SC.thread = {
    nominal: 3.06, title: 'Messages',
    build(o) {
      const s = {};
      s.el = h('div', 'thread abs', stage);
      s.msgs = parseThread(o.text);
      let lastName = '';
      s.rows = s.msgs.map((m) => {
        const row = h('div', 'th-row abs ' + (m.me ? 'me' : 'them'), s.el);
        if (m.name && m.name !== lastName) h('div', 'th-name', row, esc(m.name));
        if (!m.me) lastName = m.name;
        const bubble = h('div', 'th-bubble', row);
        const words = setWords(bubble, m.text);
        const dots = m.me ? null : h('div', 'th-typing abs', row, '<i></i><i></i><i></i>');
        return { row, bubble, words, dots, dotEls: dots ? [...dots.children] : [] };
      });
      s.compose = h('div', 'th-compose abs', s.el, '<span class="tx"></span><span class="ph">Message</span><i class="send"></i>');
      s.ctx = s.compose.querySelector('.tx'); s.cph = s.compose.querySelector('.ph');
      return s;
    },
    render(s, lt, k, o) {
      const T = (x) => x * k, dur = T(3.06), pl = threadPlan(s.msgs);
      sty(s.el, 'width', W + 'px'); sty(s.el, 'height', H + 'px');
      // In: the thread rises into place. Out: it sinks back as the phone returns.
      const pin = E.out(seg(lt, 0, 0.55)), pout = E.inOut(seg(lt, dur - 0.5, dur));
      put(s.el, { y: lerp(80, 0, pin) + 40 * pout, s: 1 - 0.03 * pout, o: lt < 0 || lt > dur ? 0 : clamp(pin * 1.4) * (1 - pout) });
      const colW = PORTRAIT ? W - 120 : 980, colX = (W - colW) / 2;
      const cy = H - (PORTRAIT ? 300 : 170);
      put(s.compose, { x: colX, y: cy });
      sty(s.compose, 'width', colW + 'px');
      // Typing into the box, then sent.
      let typing = '';
      s.msgs.forEach((m, i) => { const st = pl.steps[i]; if (m.me && lt >= st.prep && lt < st.at) typing = plain(m.text).slice(0, Math.round(plain(m.text).length * seg(lt, st.prep, st.at - 0.08))); });
      txt(s.ctx, typing); alpha(s.ctx, 1); alpha(s.cph, typing ? 0 : 1);
      // Messages stack upwards from the box; each new one pushes the rest up.
      let y = cy - 34;
      for (let i = s.rows.length - 1; i >= 0; i--) {
        const r = s.rows[i], st = pl.steps[i], m = s.msgs[i];
        const shown = E.out(seg(lt, st.at, st.at + 0.4));
        const dotP = m.me ? 0 : E.out(seg(lt, st.prep, st.prep + 0.25)) * (1 - E.inOut(seg(lt, st.at - 0.05, st.at + 0.15)));
        const hgt = r.row.offsetHeight || 120;
        const take = Math.max(shown, m.me ? 0 : dotP * 0.75);
        if (take <= 0.001) { alpha(r.row, 0); continue; }
        y -= hgt * take + 22 * take;
        sty(r.row, 'width', colW + 'px');
        put(r.row, { x: colX, y, o: 1 });
        put(r.bubble, { s: lerp(0.86, 1, shown), y: lerp(24, 0, shown), o: clamp(shown * 1.5) });
        if (r.dots) { put(r.dots, { o: dotP }); r.dotEls.forEach((d, j) => put(d, { y: -7 * Math.max(0, Math.sin(lt * 7 - j * 0.7)) })); }
        // Every word is set each frame (a hidden scene leaves them invisible).
        r.words.forEach((w) => { if (!w._em) { put(w, { o: 1 }); return; } const pe = E.out(seg(lt, st.at + EM_DELAY, st.at + EM_DELAY + 0.4)); put(w, { s: lerp(1.15, 1, pe), o: clamp(pe * 1.6) }); });
      }
      const cues = [];
      s.msgs.forEach((m, i) => { const st = pl.steps[i]; if (m.me) cues.push([st.prep, 'type', 0, st.at - st.prep], [st.at, 'pop']); else cues.push([st.at, 'msg']); });
      return { keep: true, cues };
    },
  };

  // Film C, the explainer: diagrams built in 3D on paper, each scene with its
  // own camera move, headline motion and way in and out. Each scene shows its
  // lines one after another in the headline; a diagram below acts them out.
  const splitLines = (txt) => String(txt || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const EX_EXTRA = { crowd: 0.3, jars: 0.5, greener: 0.5, ego: 0.9, turn: 0.5, five: 0.6 };
  const exExtra = (o) => (o.kind === 'cost' ? 0.6 + splitLines(o.words).length * 0.75 : EX_EXTRA[o.kind] || 0.4);
  const exPlan = (o) => { let t = 0.35; const at = splitLines(o.text).map((l) => { const a = t; t += readFor(l) + 0.1; return a; }); return { at, end: t + exExtra(o) + 0.3 }; };
  // Headline motion, varied by scene: words rise, flip up, zoom from depth or slide in.
  const MOTION = { crowd: 'rise', jars: 'flip', greener: 'slide', ego: 'zoom', cost: 'rise', turn: 'flip', five: 'zoom' };
  const riseWords = (words, lt, a, c, mode = 'rise') => words.forEach((w, i) => {
    const d = w._em ? EM_DELAY : 0;
    const p = E.out5(seg(lt, a + d + i * 0.035, a + d + 0.42 + i * 0.035));
    const q = c == null ? 0 : E.inOut(seg(lt, c, c + 0.25));
    const e = 1 - p, o = clamp(p * 1.4) * (1 - q), s = w._em ? lerp(1.2, 1, p) : 1;
    if (mode === 'flip') put(w, { y: e * 20 - q * 24, rx: -85 * e + q * 60, s, o });
    else if (mode === 'zoom') put(w, { z: -700 * e + q * 300, y: -q * 20, s, o });
    else if (mode === 'slide') put(w, { x: 70 * e - q * 50, ry: -40 * e, s, o });
    else put(w, { y: lerp(44, 0, p) - q * 30, s, o });
  });
  // Each scene's camera: a slow orbit and dolly around its diagram.
  const CAM = {
    crowd: (u) => ({ rx: 6, ry: lerp(-14, 12, u), z: lerp(-260, 60, E.inOut(u)) }),
    jars: (u) => ({ rx: lerp(-22, -12, u), ry: lerp(10, -10, E.inOut(u)), z: lerp(-120, 40, u) }),
    greener: (u) => ({ rx: -6, ry: lerp(-20, -8, u), z: lerp(0, 80, u) }),
    ego: (u) => ({ rx: 4, ry: lerp(16, -10, E.inOut(u)), z: lerp(-80, 40, u) }),
    cost: (u) => ({ rx: lerp(10, 0, u), ry: lerp(-8, 8, u), z: lerp(-200, 60, u) }),
    turn: (u) => ({ rx: 4, ry: lerp(12, -6, E.inOut(u)), z: lerp(-100, 80, u) }),
    five: (u) => ({ rx: lerp(10, 2, u), ry: lerp(-12, 8, E.inOut(u)), z: lerp(-60, 60, u) }),
  };
  // How each scene leaves (the next one arrives the opposite way).
  const EXIT = { crowd: 'zoom', jars: 'spin', greener: 'slide', ego: 'drop', cost: 'zoom', turn: 'none', five: 'zoom' };
  const moveFor = (kind, e, dir) => {
    if (kind === 'spin') return { ry: 75 * e * dir, z: -500 * e };
    if (kind === 'zoom') return { z: 1100 * e * dir };
    if (kind === 'drop') return { rx: -55 * e * dir, y: 300 * e * dir, z: -300 * e };
    if (kind === 'slide') return { x: -W * 0.7 * e * dir, ry: -30 * e * dir };
    return {};
  };
  // Photos are cropped in close on the face and colour-shifted into one of
  // six tones, so the crowd has variety (the tone follows the index).
  const TONES = 6;
  const tone = (i) => ' tone-' + (Math.floor(hash(i * 3.17 + 1) * TONES) % TONES);
  const face = (parent, photo, big, i = 0) => h('div', 'ex-face abs' + (big ? ' big' : '') + tone(i), parent, `<img src="${esc(photo)}" alt="">`);
  const JAM = ['#FC3C6C', '#B8914F', '#E9A23B', '#7A4E9A', '#C2124A', '#5C8A4E', '#D8642F', '#3E6BA8'];
  const DEGR = 180 / Math.PI;
  const EX = {
    // A wall of faces wrapped round a slowly turning cylinder; one flies forward.
    crowd: {
      build(s) {
        const cols = PORTRAIT ? 13 : 22, rows = PORTRAIT ? 14 : 8;
        s.faces = []; s.cols = cols; s.rows = rows;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const i = s.faces.length, p = CAST.crowd[(i * 7) % CAST.crowd.length];
          s.faces.push({ el: face(s.dia, p.photo, false, i), c, r });
        }
        s.pick = Math.floor(rows / 2) * cols + Math.floor(cols / 2);
      },
      render(s, lt, P) {
        const R = PORTRAIT ? 760 : 1250, dth = 74 / R, spin = (lt - 1.2) * 0.07;
        const q = E.inOut(seg(lt, P.at[1], P.at[1] + 0.6));
        s.faces.forEach((f, i) => {
          const a = P.at[0] - 0.2 + hash(i * 1.7) * 1.1, p = E.out5(seg(lt, a, a + 0.45));
          const th = (f.c - (s.cols - 1) / 2) * dth + spin * (1 - q);
          const me = i === s.pick;
          const y = P.cy + (f.r - (s.rows - 1) / 2) * 74;
          const x = P.cx + Math.sin(th) * R, z = (Math.cos(th) - 1) * R;
          put(f.el, { x, y, z: z + (me ? 520 * q : -400 * (1 - p)), ry: th * DEGR * (me ? 1 - q : 1), s: p * (me ? 1 + 1.1 * q : 1), o: clamp(p * 2) * (me ? 1 : lerp(1, 0.14, q)) });
          cls(f.el, 'pick', me && q > 0.3);
        });
        return [0, 1, 2, 3, 4].map((n) => [P.at[0] + n * 0.18, 'pop']).concat([[P.at[1] + 0.1, 'tap']]);
      },
    },
    // Twenty-four jams and six on stepped shelves, and how many people bought.
    jars: {
      build(s) {
        const group = (n, cols) => Array.from({ length: n }, (_, i) => { const e = h('div', 'ex-jar abs', s.dia); e.style.background = JAM[(i * 3) % JAM.length]; return { el: e, c: i % cols, r: Math.floor(i / cols), cols, rows: Math.ceil(n / cols) }; });
        s.big = group(24, 6); s.small = group(6, 3);
        s.shelves = [0, 1, 2, 3, 4, 5].map(() => h('div', 'ex-shelf abs', s.dia));
        const stat = (label) => { const e = h('div', 'ex-stat abs', s.dia, `<div class="lbl">${esc(label)}</div><div class="num">0%</div><div class="bar"><i></i></div>`); return { el: e, num: e.querySelector('.num'), bar: e.querySelector('.bar i') }; };
        s.s24 = stat('24 flavours'); s.s6 = stat('6 flavours');
      },
      render(s, lt, P) {
        const G1 = PORTRAIT ? { x: P.cx, y: P.cy - 470, sy: 190 } : { x: P.cx - 360, y: P.cy - 90, sy: 280 };
        const G2 = PORTRAIT ? { x: P.cx, y: P.cy + 20, sy: 130 } : { x: P.cx + 360, y: P.cy - 90, sy: 280 };
        const dim = 1 - 0.6 * E.inOut(seg(lt, P.at[3], P.at[3] + 0.4));
        // Rows step back and up, like shelves seen from the front.
        const place = (arr, G, t0, d) => arr.forEach((j, i) => {
          const p = E.out5(seg(lt, t0 + i * 0.03, t0 + 0.5 + i * 0.03));
          const ry = (j.rows - 1) / 2;
          put(j.el, { x: G.x + (j.c - (j.cols - 1) / 2) * 68, y: G.y + (j.r - ry) * 70 - 420 * (1 - p), z: -(j.r - ry) * 70, rx: -25 * (1 - p), o: clamp(p * 2) * d });
        });
        place(s.big, G1, P.at[0], dim); place(s.small, G2, P.at[0] + 0.6, 1);
        const shelf = (k, G, rows, cols, r, a, d) => put(s.shelves[k], { x: G.x, y: G.y + (r - (rows - 1) / 2) * 70 + 37, z: -(r - (rows - 1) / 2) * 70, rx: 80, s: cols / 6, o: clamp(seg(lt, a, a + 0.3)) * d * 0.9 });
        [0, 1, 2, 3].forEach((r) => shelf(r, G1, 4, 6, r, P.at[0], dim));
        [0, 1].forEach((r) => shelf(4 + r, G2, 2, 3, r, P.at[0] + 0.6, 1));
        const stat = (S, G, a, pct, d) => {
          const p = E.out(seg(lt, a + 0.1, a + 0.8)), v = Math.round(pct * p), f = E.out5(seg(lt, a, a + 0.5));
          txt(S.num, v + '%'); sty(S.bar, 'width', (v / 30 * 100).toFixed(1) + '%');
          put(S.el, { x: G.x, y: G.y + G.sy, rx: -90 * (1 - f), o: clamp(f * 2) * d });
        };
        stat(s.s24, G1, P.at[1], 3, dim); stat(s.s6, G2, P.at[2], 30, 1);
        return [[P.at[0], 'pop'], [P.at[0] + 0.6, 'pop'], [P.at[1] + 0.1, 'tap'], [P.at[2] + 0.1, 'tap']];
      },
    },
    // An endless queue of profiles receding into the distance; the front one is
    // swiped away, the queue steps forward, faster and faster.
    greener: {
      build(s) { s.cards = CAST.crowd.slice(0, 9).map((p, i) => h('div', 'ex-card abs' + tone(i + 40), s.dia, `<img src="${esc(p.photo)}" alt="">`)); },
      render(s, lt, P) {
        const u = Math.max(0, lt - P.at[0]), f = u / 0.6 + Math.pow(Math.max(0, lt - P.at[1]), 2) * 1.2;
        const c = Math.floor(f), q = f - c, sw = E.inOut(clamp((q - 0.4) / 0.6));
        const n = s.cards.length, show = lt >= P.at[0] - 0.3 ? E.out(seg(lt, P.at[0] - 0.3, P.at[0] + 0.2)) : 0;
        s.cards.forEach((el, j) => {
          const k = ((j - c) % n + n) % n;          // place in the queue: 0 is the front
          if (k === 0) put(el, { x: P.cx - sw * 1000, y: P.cy + sw * 40, z: sw * 160, ry: -sw * 50, r: -sw * 16, o: show });
          else { const kk = k - sw; put(el, { x: P.cx + kk * 34, y: P.cy - kk * 42, z: -kk * 230, ry: -6, o: show * clamp((7.5 - kk) / 2) }); }
        });
        const cues = [];
        for (let i = 0; i < 12; i++) { const at = P.at[0] + (i + 0.7) * 0.6; if (at < P.dur - 0.4) cues.push([at, 'swipe']); }
        return cues.slice(0, 8);
      },
    },
    // A card flicked away in 3D; the match count flips up; marriages stay at zero.
    ego: {
      build(s) {
        s.card = h('div', 'ex-card small abs' + tone(61), s.dia, `<img src="${esc(CAST.crowd[3].photo)}" alt="">`);
        s.card2 = h('div', 'ex-card small abs' + tone(64), s.dia, `<img src="${esc(CAST.crowd[8].photo)}" alt="">`);
        s.plus = h('div', 'ex-plus abs', s.dia, '+1');
        const row = (label) => { const e = h('div', 'ex-row abs', s.dia, `<span>${esc(label)}</span><b>0</b>`); return { el: e, n: e.querySelector('b') }; };
        s.rows = [row('Matches'), row('Conversations'), row('Marriages')];
      },
      render(s, lt, P) {
        const iv = 0.3, u = Math.max(0, lt - P.at[0]), count = Math.floor(u / iv), q = (u / iv) % 1;
        const C0 = PORTRAIT ? { x: P.cx, y: P.cy - 250 } : { x: P.cx - 380, y: P.cy };
        const vis = clamp(seg(lt, P.at[0] - 0.3, P.at[0]));
        const fl = E.in(q), [a, b] = count % 2 ? [s.card2, s.card] : [s.card, s.card2];
        put(a, { x: C0.x + fl * 420, y: C0.y - fl * 40, z: fl * 120, ry: fl * 55, r: fl * 16, o: vis * (1 - fl) });
        put(b, { x: C0.x, y: C0.y, z: -160 * (1 - q), o: vis * clamp(q * 1.5) });
        put(s.plus, { x: C0.x + 140, y: C0.y - 170 - q * 70, z: 80 + q * 120, o: count > 0 ? (1 - q) * vis : 0 });
        const vals = [count, Math.floor(count / 14), 0];
        const hot = E.out(seg(lt, P.at[1], P.at[1] + 0.4));
        s.rows.forEach((r, i) => {
          txt(r.n, String(vals[i]));
          cls(r.el, 'hot', i === 2 && hot > 0.5);
          // Each new number flips down into place, like a split-flap counter.
          put(r.n, { rx: i === 0 && count > 0 ? -80 * (1 - E.out(clamp(q / 0.3))) : 0 });
          const p = E.out(seg(lt, P.at[0] + i * 0.15, P.at[0] + 0.5 + i * 0.15));
          const pos = PORTRAIT ? { x: P.cx, y: P.cy + 150 + i * 130 } : { x: P.cx + 330, y: P.cy - 130 + i * 130 };
          put(r.el, { ...pos, rx: -90 * (1 - p), s: i === 2 ? 1 + 0.08 * Math.sin(Math.PI * hot) : 1, o: clamp(p * 2) });
        });
        const cues = []; for (let i = 1; i <= 7; i++) cues.push([P.at[0] + i * iv, 'pop']);
        return cues.concat([[P.at[1], 'thud']]);
      },
    },
    // What it costs: three words flying in from deep space, each at its own angle.
    cost: {
      build(s, o) { s.words = splitLines(o.words).map((w) => { const e = h('div', 'ex-word abs', s.dia); return { e, words: setWords(e, w) }; }); },
      render(s, lt, P) {
        const tilt = [[-8, 14], [10, -12], [-4, 6]];
        s.words.forEach((W, i) => {
          const a = P.at[0] + 0.6 + i * 0.75, p = E.out5(seg(lt, a, a + 0.6)), tl = tilt[i % 3];
          W.words.forEach((w) => put(w, { o: 1 }));
          put(W.e, { x: P.cx, y: P.cy - 170 + i * (PORTRAIT ? 170 : 150), z: -1600 * (1 - p), rx: tl[0] * (1 - p), ry: tl[1] * (1 - p), r: (i - 1) * 2 * p, o: clamp(p * 1.6) });
        });
        return s.words.map((_, i) => [P.at[0] + 0.6 + i * 0.75, 'tap']);
      },
    },
    // The crowd bursts toward the camera; the page turns pink; five faces remain.
    turn: {
      build(s) {
        EX.crowd.build(s);
        s.five = CAST.intros.map((p) => face(s.dia, p.photo, true));
      },
      render(s, lt, P) {
        const a = P.at[0], go = E.inOut(seg(lt, a, a + 1.0));
        s.faces.forEach((f, i) => {
          const x0 = (f.c - (s.cols - 1) / 2) * 74, y0 = (f.r - (s.rows - 1) / 2) * 74;
          const ang = Math.atan2(y0, x0), d = 700 * go * (0.6 + hash(i) * 0.8);
          put(f.el, { x: P.cx + x0 + Math.cos(ang) * d, y: P.cy + y0 + Math.sin(ang) * d, z: go * (300 + hash(i + 5) * 900), rx: go * (hash(i + 9) - 0.5) * 180, ry: go * (hash(i + 3) - 0.5) * 180, o: 0.32 * (1 - go) });
        });
        const sp = PORTRAIT ? 190 : 240;
        s.five.forEach((el, i) => { const p = E.out5(seg(lt, a + 0.5 + i * 0.08, a + 1.1 + i * 0.08)); put(el, { x: P.cx + (i - 2) * sp, y: P.cy, z: -900 * (1 - p) - Math.abs(i - 2) * 90, ry: (i - 2) * -14, o: clamp(p * 2) }); });
        return [[a, 'swish']].concat(s.five.map((_, i) => [a + 0.55 + i * 0.08, 'pop']));
      },
    },
    // Five on an arc; three chosen; a mutual pair orbits in; questions before the chat.
    five: {
      build(s) {
        s.five = CAST.intros.map((p) => face(s.dia, p.photo, true));
        s.checks = s.five.map(() => h('div', 'ex-check abs', s.dia, '✓'));
        s.me = face(s.dia, CAST.member.photo, true);
        s.heart = h('div', 'ex-heart abs', s.dia, heartSvg());
        s.bubbles = ['?', '?'].map((t) => h('div', 'ex-bubble abs', s.dia, t));
      },
      render(s, lt, P) {
        const sp = PORTRAIT ? 190 : 240, chosen = [0, 2, 3];
        const pick = E.out(seg(lt, P.at[1], P.at[1] + 0.4)), pair = E.inOut(seg(lt, P.at[2], P.at[2] + 0.8)), talk = E.out(seg(lt, P.at[3], P.at[3] + 0.5));
        const sway = Math.sin(lt * 0.8) * 6;
        s.five.forEach((el, i) => {
          const on = chosen.includes(i), x0 = P.cx + (i - 2) * sp, z0 = -Math.abs(i - 2) * 90, ry0 = (i - 2) * -14 + sway;
          // The match swings round to meet the member, half an orbit in depth.
          const orb = Math.PI * pair, x = i === 0 ? lerp(x0, P.cx + 150, pair) : x0, z = i === 0 ? z0 + Math.sin(orb) * 260 : z0 - 200 * pair;
          const sz = i === 0 ? 1 + 0.45 * pair : 1;
          put(el, { x, y: P.cy - (on ? 30 * pick : 0) * (1 - pair), z, ry: i === 0 ? lerp(ry0, 0, pair) : ry0, s: sz, o: (on ? 1 : lerp(1, 0.35, pick)) * (i === 0 ? 1 : 1 - pair) });
          const ci = chosen.indexOf(i);
          put(s.checks[i], { x: x + 62 * sz, y: P.cy - 62 * sz - 30 * pick, z: z + 40, s: on ? E.spring(seg(lt, P.at[1] + ci * 0.12, P.at[1] + 0.35 + ci * 0.12)) : 0, o: on ? pick * (1 - pair) : 0 });
        });
        put(s.me, { x: P.cx - 150, y: P.cy, z: -Math.sin(Math.PI * pair) * 260, s: 1.45 * pair, o: pair });
        put(s.heart, { x: P.cx, y: P.cy, z: 120, ry: 360 * (1 - E.out(seg(lt, P.at[2] + 0.4, P.at[2] + 1.0))), s: E.spring(seg(lt, P.at[2] + 0.4, P.at[2] + 0.9)) * (1 + 0.06 * Math.sin(lt * 6)), o: pair });
        s.bubbles.forEach((b, i) => { const p = E.spring(seg(lt, P.at[3] + i * 0.2, P.at[3] + 0.45 + i * 0.2)); put(b, { x: P.cx + (i ? 150 : -150), y: P.cy - 220, z: 200 * (1 - p), rx: -40 * (1 - p), s: p, o: talk }); });
        return [[P.at[1], 'pop'], [P.at[1] + 0.12, 'pop'], [P.at[1] + 0.24, 'pop'], [P.at[2] + 0.4, 'heart'], [P.at[3], 'msg'], [P.at[3] + 0.2, 'msg']];
      },
    },
  };
  SC.ex = {
    nominal: 3, title: 'Explainer',
    build(o) {
      const s = { L: splitLines(o.text) };
      s.el = h('div', 'ex abs', stage);
      if (o.pink) s.pink = h('div', 'ex-pink abs', s.el);
      s.dia = h('div', 'ex-dia abs', s.el);
      s.headBox = h('div', 'ex-headbox abs', s.el);
      const stack = h('div', 'ex-stack', s.headBox);
      if (o.kicker) s.kick = h('div', 'ex-kicker', stack, esc(o.kicker));
      const lines = h('div', 'ex-lines', stack);
      s.lines = s.L.map((t) => { const e = h('div', 'ex-line', lines); return { e, words: setWords(e, t) }; });
      if (o.source) s.src = h('div', 'ex-src abs', s.el, esc(o.source));
      EX[o.kind].build(s, o);
      return s;
    },
    render(s, lt, k, o) {
      const dur = 3 * k, pl = exPlan(o);
      sty(s.el, 'width', W + 'px'); sty(s.el, 'height', H + 'px');
      sty(s.dia, 'width', W + 'px'); sty(s.dia, 'height', H + 'px');
      // In and out: each scene leaves its own way; the next arrives from the other side.
      const prevKind = o._prev, inE = 1 - E.out(seg(lt, 0, 0.6)), outE = E.in(seg(lt, dur - 0.55, dur));
      const mIn = prevKind && EXIT[prevKind] !== 'none' ? moveFor(EXIT[prevKind], inE, -1) : {};
      const mOut = EXIT[o.kind] !== 'none' ? moveFor(EXIT[o.kind], outE, 1) : {};
      const vis = lt < 0 || lt > dur ? 0 : clamp(1 - inE * 1.2) * clamp(1 - outE * 1.1);
      put(s.el, { o: EXIT[o.kind] === 'none' && lt <= dur ? clamp(1 - inE * 1.2) : vis });
      // The camera: this scene's orbit, plus the way in and out.
      const cam = CAM[o.kind](clamp(lt / dur));
      const sum = (key) => (cam[key] || 0) + (mIn[key] || 0) + (mOut[key] || 0);
      put(s.dia, { x: sum('x'), y: sum('y'), z: sum('z'), rx: sum('rx'), ry: sum('ry') });
      let pinkP = 0;
      if (s.pink) { pinkP = o.kind === 'turn' ? E.inOut(seg(lt, pl.at[0], pl.at[0] + 0.7)) : 1; sty(s.pink, 'width', W + 'px'); sty(s.pink, 'height', H + 'px'); sty(s.pink, 'clipPath', pinkP >= 1 ? 'none' : `circle(${(Math.hypot(W, H) * pinkP).toFixed(0)}px at 50% 55%)`); alpha(s.pink, pinkP > 0 ? 1 : 0); }
      cls(s.el, 'on-pink', pinkP > 0.5);
      s.lines.forEach((L) => alpha(L.e, 1));
      const headY = PORTRAIT ? 400 : 190;
      put(s.headBox, { x: 70 + (mIn.x || 0) * 0.4 + (mOut.x || 0) * 0.4, y: headY }); sty(s.headBox, 'width', (W - 140) + 'px');
      if (s.kick) put(s.kick, { rx: -80 * (1 - E.out5(seg(lt, 0.1, 0.55))), o: E.out(seg(lt, 0.1, 0.45)) * (1 - E.inOut(seg(lt, dur - 0.5, dur - 0.2))) });
      // Each line leaves just before the next arrives, so they never overlap.
      const mode = MOTION[o.kind] || 'rise';
      s.lines.forEach((L, i) => riseWords(L.words, lt, pl.at[i] + (i ? 0.12 : 0), i < s.lines.length - 1 ? pl.at[i + 1] - 0.12 : dur - 0.45, mode));
      if (s.src) { sty(s.src, 'width', W + 'px'); put(s.src, { x: 0, y: H - (PORTRAIT ? 230 : 90), o: E.out(seg(lt, pl.at[1] || 0.5, (pl.at[1] || 0.5) + 0.4)) }); }
      const P = { at: pl.at, dur, cx: W / 2, cy: PORTRAIT ? 1180 : 660 };
      const cues = EX[o.kind].render(s, lt, P, o) || [];
      if (EXIT[o.kind] !== 'none') cues.push([dur - 0.45, 'swish']);
      return { keep: true, cues };
    },
  };

  // ---------------------------------------------------------------- the films
  // Each film is cut to its own track. Scenes are
  // whole beats long, so every cut lands on the music, and the phone turns
  // round on the cuts between pillars.
  //   A, cinematic: track 2 (117.5 BPM) from its quiet opening; it lifts at
  //     6.1 s and peaks around 25-30 s.
  //   B, the thread: track 1 (123 BPM), quiet under the messages; the phone
  //     lands on the drop at 0:15.6.
  function story(v) {
    const c = C.versions[v].copy;
    const m = C.versions[v].music || {};
    const b = m.beat || 0.5;
    const beats = (sec) => Math.ceil(sec / b - 0.05);
    const card = (n) => { const o = { a: c['card' + n + 'a'], b: c['card' + n + 'b'] }; return ['card', beats(cardPlan(o).end), o]; };
    // Scenes whose last line must be read get the time it needs.
    const earnLen = (rv) => beats(4.1 * EARN_PACE[v] + readFor(rv) + 0.25 + 1.6);
    const arriveLen = (n) => Math.max(4, beats(0.95 + readFor(n) + 0.3));
    const closeLen = (o) => beats(1.3 + readFor(o) + 0.45);
    const privLen = () => beats(2.3 * PRIV_PACE + 0.4 + readFor(CAST_TOLD[v]) + 0.3 + 0.35);
    const ex = (kind, extra = {}) => { const o = { kind, text: c[kind], kicker: c[kind + 'Kicker'], source: c[kind + 'Source'], ...extra }; return ['ex', beats(exPlan(o).end), o]; };
    const thread = (key) => { const o = { text: c[key] }; return ['thread', beats(threadPlan(parseThread(o.text)).end), o]; };
    // A: slow and quiet for the problem, the music lifts with "There's a better
    // way", each pillar quicker than the last, the track's peak under Earn the
    // conversation, then the close.
    // B: a text thread over the quiet intro, the phone lands on the drop, and
    // the conversation carries each feature.
    // C: the problem explained (too many choices, swiping for the ego), the
    // music's breakdown under the cost, then its build on "another way".
    const list = v === 'c' ? [
      ex('crowd'),
      ex('jars'),
      ex('greener'),
      ex('ego'),
      ex('cost', { words: c.costWords }),
      ex('turn', { pink: true }),
      ex('five', { pink: true }),
      ['arrive', arriveLen(c.notification), { notification: c.notification }],
      ['close', closeLen(c.offer), { copy: c.close, offer: c.offer, url: c.url }],
    ] : v === 'a' ? [
      ['stream', 12, { copy: c.problem, copy2: c.problem2, slow: true }],
      card(1),
      ['arrive', arriveLen(c.notification), { notification: c.notification }],
      card(2),
      ['daily', 5, {}],
      card(3),
      ['privacy', privLen(), {}],
      card(4),
      ['earn', earnLen(c.p3Reveal), { reveal: c.p3Reveal }],
      card(5),
      ['cards', 4, { langs: 6 }],
      ['close', closeLen(c.offer), { copy: c.close, offer: c.offer, url: c.url }],
    ] : [
      thread('thread1'),
      ['arrive', Math.max(5, arriveLen(c.notification)), { notification: c.notification }],
      thread('thread2'),
      ['daily', 5, {}],
      thread('thread3'),
      ['privacy', privLen(), {}],
      thread('thread4'),
      ['earn', earnLen(c.p3Reveal), { reveal: c.p3Reveal }],
      thread('thread5'),
      ['cards', 4, {}],
      ['close', closeLen(c.offer), { copy: c.close, offer: c.offer, url: c.url, caption: true }],
    ];
    // C: each scene knows which came before, to arrive the opposite way it left.
    if (v === 'c') { let prev = null; list.forEach(([id, , o]) => { if (id === 'ex') { o._prev = prev; prev = o.kind; } else prev = null; }); }
    // A turns the phone as each pillar opens (the screen changes while its
    // back faces you); B never spins: its phone rises back up after each message.
    const spins = v === 'a' ? { daily: 'y', privacy: 'x', cards: 'roll' } : {};
    let t = 0; const at = {};
    const scenes = list.map(([id, n, o]) => { const key = o.kind || id; if (at[key] == null) at[key] = t; t += n * b; return [id, n * b, o, spins[id]]; });
    // B starts its track so the drop lands as the phone does.
    // C starts its track so a chosen moment (`cue`) lands on a chosen scene.
    const musicStart = m.cue != null ? Math.max(0, m.cue - at[m.cueScene]) : v === 'b' && m.drop != null ? Math.max(0, m.drop - at.arrive) : m.lift != null ? Math.max(0, m.lift - at.card) : m.start || 0;
    const bg = v === 'a' ? [[0, 'cream']] : v === 'c' ? [[0, 'paper']] : [[0, 'night']];
    return { beat: b, scenes, bg, musicStart };
  }
  // How hard each sound punches the phone (a quick zoom, film B).
  const PUNCH = { pop: 0.01, msg: 0.012, tap: 0.018, heart: 0.03, lock: 0.025, unlock: 0.018, thud: 0.03, notif: 0.018, shimmer: 0.02, land: 0.025, logo: 0.02 };
  const BGW = { night: { night: 1 }, dawn: { night: 1, dawn: 1 }, cream: { night: 0, cream: 1 }, gold: { gold: 1 }, pink: { night: 1, pink: 1 }, paper: { paper: 1 } };

  // ---------------------------------------------------------------- build
  let film = null;
  const screenNames = ['lock', 'daily', 'prefs', 'match', 'q', 'a', 'chat', 'cards', 'premium', 'safety'];
  function build() {
    stage.innerHTML = '';
    FILMS.forEach((f) => document.body.classList.toggle('v' + f, V === f));
    A = anchors();
    CAST = castFor(V);
    // C stands its diagrams on a drifting floor of dots, seen in perspective.
    const floor = V === 'c' ? h('div', 'c-floor', stage) : null;
    fx = { back: h('div', '', stage), front: null, floor };
    fx.halo = h('div', 'halo abs', fx.back); fx.shock = h('div', 'shock abs', fx.back);
    if (use3D()) {
      setup3D();
      phone2 = buildPhone3D(G3.layers[0]); buildScreens(phone2, 'match');
      phone = buildPhone3D(G3.layers[1]); buildScreens(phone, 'member');
    } else {
      phone2 = buildPhone(stage); buildScreens(phone2, 'match');
      phone = buildPhone(stage); buildScreens(phone, 'member');
    }
    fx.front = h('div', '', stage);
    const st = story(V);
    let t0 = 0;
    const scenes = st.scenes.map(([id, d, o, spin]) => {
      const def = SC[id]; o._start = t0; const s = def.build(o);
      const sc = { id, def, s, o, spin, start: t0, end: t0 + d, k: d / def.nominal, title: def.title };
      t0 += d; return sc;
    });
    film = { scenes, bg: st.bg, cues: [], beat: st.beat || 0, lands: [], musicStart: st.musicStart || 0 };
    // The turns between scenes, centred on each cut, and where the phone lands.
    const sd = V === 'a' ? 1.0 : 0.8;
    film.spins = scenes.filter((sc) => sc.spin).map((sc, i) => {
      film.cues.push([sc.start - 0.25, 'swish'], [sc.start + sd / 2 - 0.05, 'land']);
      film.lands.push(sc.start + sd / 2);
      return { at: sc.start, end: sc.end, kind: sc.spin, d: sd };
    });
    DUR = t0;
    prepMusic();
    // Collect sound cues by rendering each scene once at its start.
    scenes.forEach((sc) => { const r = sc.def.render(sc.s, 0, sc.k, sc.o) || {}; (r.cues || []).forEach(([at, snd, , len]) => film.cues.push([sc.start + at, snd, 0, len])); (r.lands || []).forEach((l) => film.lands.push(sc.start + l)); });
    film.lands.sort((a, b) => a - b);
    film.cues.sort((a, b) => a[0] - b[0]);
    // A sound repeated back to back climbs: each repeat within 0.75 s of the
    // last is pitched up a step, like a crescendo (up to five steps).
    const lastOf = {};
    film.cues.forEach((c) => { const l = lastOf[c[1]]; c[2] = l && c[0] - l[0] < 0.75 && c[1] !== 'type' ? Math.min(5, l[2] + 1) : 0; lastOf[c[1]] = c; });
    buildUI();
    frame();
  }
  const scrMap = (ph) => ({ lock: ph.scr.lock, daily: ph.scr.daily, prefs: ph.scr.pref && ph.scr.pref.p, match: ph.scr.match, q: ph.scr.q && ph.scr.q.q, a: ph.scr.a && ph.scr.a.a, chat: ph.scr.chat && ph.scr.chat.ch, cards: ph.scr.hc && ph.scr.hc.hc, premium: ph.scr.pr && ph.scr.pr.pr, safety: ph.scr.sf && ph.scr.sf.sf });

  // ---------------------------------------------------------------- render
  let T = 0;
  function render(t) {
    T = t;
    // Background: blend between keyframed moods.
    const b = film.bg; let i = 0; while (i < b.length - 1 && b[i + 1][0] <= t) i++;
    const cur = b[i], nxt = b[Math.min(i + 1, b.length - 1)];
    const p = nxt === cur ? 0 : E.inOut(seg(t, cur[0], nxt[0]));
    ['night', 'dawn', 'pink', 'cream', 'gold', 'paper'].forEach((kk) => alpha(bg[kk], lerp(BGW[cur[1]][kk] || 0, BGW[nxt[1]][kk] || 0, p)));
    const dark = 1 - lerp((BGW[cur[1]].cream || 0) + (BGW[cur[1]].paper || 0), (BGW[nxt[1]].cream || 0) + (BGW[nxt[1]].paper || 0), p);
    // Scenes: each draws itself near its window; the current one owns the phone.
    const sw = {}; screenNames.forEach((nm) => { sw[nm] = 0; });
    let pose = null; const results = [];
    film.scenes.forEach((sc, i) => {
      const active = t >= sc.start - 0.8 && t < sc.end + 0.9;
      if (!active) { hideScene(sc); return; }
      if (sc._hidden || sc._hid) unhideScene(sc);
      results[i] = sc.def.render(sc.s, t - sc.start, sc.k, sc.o) || {};
    });
    let ci = film.scenes.findIndex((sc) => t >= sc.start && t < sc.end);
    if (ci < 0) ci = film.scenes.length - 1;
    let curR = results[ci] || {};
    // Under a pink message the phone keeps the last scene's state, then takes
    // the next one's as the pink lifts away.
    if (curR.keep) { const nx = results[ci + 1], src = nx && t > film.scenes[ci].end - 0.45 ? nx : results[ci - 1]; curR = { ...curR, pose: src && src.pose, screens: src && src.screens }; }
    pose = curR.pose || POSE.hidden();
    // B: as a message sheet leaves, the phone rises back up and tips upright.
    if (V === 'b') { for (const sc of film.scenes) { if (sc.id !== 'thread' || sc.start === 0) continue; const q = seg(t, sc.end - 0.5, sc.end + 0.9); if (q > 0 && q < 1) { const e = 1 - E.out(q); pose = { ...pose, y: pose.y + 300 * e, rx: (pose.rx || 0) - 26 * e, s: pose.s * (1 - 0.05 * e) }; } } }
    const scr = { ...sw, ...(curR.screens || {}) };
    // Ease from the previous scene's phone pose and screens into this one.
    const lt0 = t - film.scenes[ci].start, prevR = ci > 0 ? results[ci - 1] : null;
    const blend = V === 'a' ? 0.85 : 0.55;
    if (prevR && prevR.pose && lt0 < blend) {
      const bp = E.inOut(lt0 / blend);
      pose = mixPose(prevR.pose, pose, bp);
      // A cut with a turn swaps screens while the back faces you; others crossfade.
      if (!film.scenes[ci].spin) { const ps = { ...sw, ...(prevR.screens || {}) }; screenNames.forEach((nm) => { scr[nm] = lerp(ps[nm] || 0, scr[nm] || 0, bp); }); }
    }
    Object.assign(sw, scr);
    // Push in about a point on the screen (fy: -0.5 top .. 0.5 bottom).
    if (curR.zoom && curR.zoom[0] !== 1) {
      const s0 = pose.s, s1 = s0 * curR.zoom[0];
      pose = { ...pose, s: s1, y: pose.y - curR.zoom[1] * PH * (s1 - s0) };
    }
    const float = pose.o;
    const B = V === 'b';
    const kick = B && ci > 1 && lt0 >= 0 && lt0 < 0.7 ? 0.6 * Math.sin(Math.PI * E.inOut(lt0 / 0.7)) : 0;
    let beat = 0;
    if (B) for (const [at, snd] of film.cues) { if (at > t + 0.2) break; if (PUNCH[snd] && t >= at && t < at + 0.4) beat = Math.max(beat, PUNCH[snd] * Math.sin(Math.PI * E.inOut((t - at) / 0.4))); }
    const whip = (ci % 2 ? 1 : -1) * (B ? 6 : 14) * kick;
    // B: a soft flash on each new scene.
    alpha(flash, B && ci > 0 && lt0 >= 0 ? 0.18 * (1 - E.inOut(lt0 / 0.45)) : 0);
    // The turn on a cut, a slow orbit while it holds, the gold of Premium.
    const sp = spinFx(t);
    const orb = (B ? 7 : 5) * float;
    const ry = (pose.ry || 0) + sp.ry + whip + Math.sin(t * 0.6) * orb;
    setPose(phone, { x: pose.x + whip * 3, y: pose.y + Math.sin(t * 0.9) * 6 * float, z: (pose.z || 0) + sp.z, s: pose.s * sp.s * (1 + (B ? 0.12 : 0.04) * kick + beat), ry, rx: (pose.rx || 0) + sp.rx + Math.sin(t * 0.45) * orb * 0.45, r: (pose.r || 0) + sp.r, o: pose.o });
    tintPhone(goldAt(t));
    // Light: a sheen across the glass and a ring of light where the phone lands.
    let land = null; for (const l of film.lands) { if (l > t) break; if (t - l < 0.9) land = l; }
    const lq = land == null ? 1 : (t - land) / 0.9;
    sty(phone.glare, 'backgroundPosition', (land != null && lq < 0.7 ? lerp(120, -20, E.out(lq / 0.7)) : 50 + (ry % 360) * 0.8).toFixed(1) + '% 0');
    alpha(phone.glare, land != null && lq < 0.7 ? 1 : 0.55);
    put(fx.shock, { x: pose.x, y: pose.y, s: pose.s * lerp(0.75, 2.1, E.out(lq)), o: land == null ? 0 : (1 - lq) * 0.8 * pose.o });
    put(fx.halo, { x: pose.x, y: pose.y, s: pose.s * (1 + beat * 3), o: pose.o * (B ? 0.85 : 0.75) });
    const map = scrMap(phone);
    screenNames.forEach((nm) => { if (map[nm]) alpha(map[nm], sw[nm]); });
    const m2 = scrMap(phone2); alpha(m2.match, 1); alpha(m2.lock, 0);
    const darkScreen = (sw.lock || 0) + (sw.premium || 0) + (sw.match || 0) > 0.5;
    cls(phone.status, 'light', darkScreen); cls(phone2.status, 'light', true);
    txt(phone.tm, (sw.lock || 0) > 0.5 ? '5:12' : '5:13');
    drawDust(t, dark);
    if (fx.floor) sty(fx.floor, 'backgroundPosition', '0px ' + (t * 46).toFixed(1) + 'px');
    render3D();
    updateUI();
  }
  // The phone's turn on a cut: one full revolution, fastest at the cut itself,
  // pulling back a little as it goes.
  function spinFx(t) {
    const o = { rx: 0, ry: 0, r: 0, s: 1, z: 0 };
    for (const sp of film.spins) {
      const p = seg(t, sp.at - sp.d / 2, sp.at + sp.d / 2); if (p <= 0 || p >= 1) continue;
      const e = E.inOut(p), bump = Math.sin(Math.PI * p);
      if (sp.kind === 'x') o.rx += 360 * e; else o.ry += (sp.kind === 'roll' ? -360 : 360) * e;
      if (sp.kind === 'roll') o.r += 14 * bump;
      o.s *= 1 - 0.1 * bump; o.z -= 320 * bump;
    }
    return o;
  }
  // 0..1: how gold the titanium is (it turns as Premium spins in, back as it leaves).
  function goldAt(t) {
    const sp = film.spins.find((x) => x.kind === 'gold'); if (!sp) return 0;
    return E.inOut(seg(t, sp.at - 0.15, sp.at + 0.2)) * (1 - E.inOut(seg(t, sp.end - 0.15, sp.end + 0.2)));
  }
  // A scene out of its window fades everything it owns; what was visible is
  // remembered and shown again when it comes back (its render then sets the rest).
  function unhideScene(sc) { if (sc._hid) { sc._hid.forEach((e) => alpha(e, 1)); sc._hid = null; } sc._hidden = false; }
  function hideScene(sc) {
    if (sc._hidden) return; sc._hidden = true;
    sc._hid = sc._hid || [];
    const off = (e) => { if (e._op !== '0.000') sc._hid.push(e); alpha(e, 0); };
    const walk = (o) => { Object.values(o).forEach((v) => { if (v instanceof HTMLElement) off(v); else if (Array.isArray(v)) v.forEach((x) => (x instanceof HTMLElement ? off(x) : x && typeof x === 'object' && walk(x))); else if (v && typeof v === 'object' && v.outer) off(v.outer); }); };
    walk(sc.s);
    if (sc.id === 'earn') setPose(phone2, { ...POSE.hidden(), o: 0 });
  }

  // ---------------------------------------------------------------- dust
  const motes = Array.from({ length: 70 }, (_, i) => ({ x: hash(i), y: hash(i + 99), r: 0.6 + hash(i + 7) * 1.8, v: 0.004 + hash(i + 3) * 0.012, ph: hash(i + 11) * 6.28 }));
  function drawDust(t, dark) {
    const w = dust.width, hh = dust.height; dctx.clearRect(0, 0, w, hh);
    if (V !== 'b') return; // A and C stay clean
    const dpr = dust._dpr || 1;
    motes.forEach((m) => {
      const y = ((m.y - t * m.v) % 1 + 1) % 1; const x = m.x + Math.sin(t * 0.3 + m.ph) * 0.01;
      const a = (0.10 + 0.25 * Math.sin(t * 0.8 + m.ph) ** 2) * (0.35 + 0.65 * dark);
      dctx.fillStyle = dark > 0.5 ? `rgba(214,180,105,${a.toFixed(3)})` : `rgba(120,96,52,${(a * 0.45).toFixed(3)})`;
      dctx.beginPath(); dctx.arc(x * w, y * hh, m.r * dpr, 0, 6.283); dctx.fill();
    });
  }

  // ---------------------------------------------------------------- audio
  // Music and sound effects switch on and off separately (kept per browser).
  const AU = { ctx: null, musicOn: store.get('hm-music', '1') === '1', sfxOn: store.get('hm-sfx', '1') === '1', nodes: [], music: null, el: null, schedT: 0, startAt: 0 };
  AU.on = AU.musicOn || AU.sfxOn;
  const SFX_LEVEL = 0.55;
  const musicLevel = () => (AU.musicOn ? track().volume || 0.9 : 0);
  function ensureAudio() {
    if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return AU.ctx; }
    const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return null;
    const ctx = new Ctx(); AU.ctx = ctx;
    AU.master = ctx.createGain(); AU.master.gain.value = AU.on ? 1 : 0; AU.master.connect(ctx.destination);
    AU.musicBus = ctx.createGain(); AU.musicBus.gain.value = 0; AU.musicBus.connect(AU.master);
    AU.sfxBus = ctx.createGain(); AU.sfxBus.gain.value = AU.sfxOn ? SFX_LEVEL : 0; AU.sfxBus.connect(AU.master);
    loadSfx();
    return ctx;
  }
  // The film's track, loaded as soon as the film is built and wired into the
  // mix the first time sound is allowed.
  const track = () => C.versions[V].music || {};
  function prepMusic() {
    AU.els = AU.els || {};
    const m = track(); if (!m.src || AU.els[V]) return;
    const el = new Audio(m.src); el.preload = 'auto'; AU.els[V] = el;
  }
  function musicEl() {
    const el = AU.els && AU.els[V]; if (!el || !AU.ctx) return el || null;
    if (!el._wired) { AU.ctx.createMediaElementSource(el).connect(AU.musicBus); el._wired = true; }
    return el;
  }
  const keep = (n, end) => { AU.nodes.push({ n, end }); return n; };
  // Sound effects are recorded app interface sounds from Mixkit (sfx/, see
  // sfx/SOURCES.md), decoded once and played at the cue times. Nothing is
  // synthesised. Each play varies a little in pitch and tone, so a sound that
  // comes back never sounds identical.
  const SFX_GAIN = { tap: 0.5, toggle: 0.45, swipe: 0.35, swish: 0.35, page: 0.32, pop: 0.45, msg: 0.5, notif: 0.55, type: 0.32, heart: 0.45, lock: 0.5, unlock: 0.45, pulse: 0.45, dissolve: 0.35, thud: 0.45, land: 0.38, shimmer: 0.4, logo: 0.5 };
  const SFX_MAX = { toggle: 0.5, page: 1.0, type: 1.1, heart: 1.6, unlock: 1.2, pulse: 1.2, dissolve: 1.2, thud: 0.9, shimmer: 1.6, logo: 2.6, tap: 0.6, land: 0.8, msg: 1.0 };
  // Each cue picks one of several recordings, so nothing repeats exactly.
  const SFX_FILES = { pop: ['pop', 'pop2', 'pop3', 'pop4'], tap: ['tap', 'tap2', 'tap3', 'tap4'], land: ['land', 'land2'], heart: ['heart', 'heart2'], msg: ['notif', 'msg2', 'pop3'] };
  const files = (n) => SFX_FILES[n] || [n];
  function loadSfx() {
    if (AU.buf) return; AU.buf = {};
    [...new Set(Object.keys(SFX_GAIN).flatMap(files))].forEach((n) => {
      fetch('sfx/' + n + '.mp3').then((r) => r.arrayBuffer()).then((b) => AU.ctx.decodeAudioData(b)).then((d) => { AU.buf[n] = d; }).catch(() => { /* a missing sound just stays silent */ });
    });
  }
  // `seed` picks this play's variation (the same every time the film plays);
  // `step` pitches it up for a rising run (two semitones a step).
  // `mix` is the live mix by default, or an offline one when exporting.
  function sample(n, at, seed = 0, step = 0, len = 0, mix = null) {
    const ctx = mix ? mix.ctx : AU.ctx, bufs = mix ? mix.buf : AU.buf, bus = mix ? mix.bus : AU.sfxBus;
    const fl = files(n), b = bufs && bufs[fl[Math.floor(hash(seed * 5.3 + 2) * fl.length)]]; if (!b) return;
    const v1 = hash(seed * 13.7 + 1), v2 = hash(seed * 7.1 + 5);
    const rate = (1 + (v1 - 0.5) * 0.16) * Math.pow(2, (step * 2) / 12);
    const src = ctx.createBufferSource(); if (!mix) keep(src, at + b.duration / rate + 0.1);
    src.buffer = b; src.playbackRate.value = rate;
    // Tone: a gentle brighter or warmer tilt each time.
    const tone = ctx.createBiquadFilter(); tone.type = 'highshelf'; tone.frequency.value = 2800; tone.gain.value = (v2 - 0.5) * 10;
    const g = ctx.createGain(); const v = SFX_GAIN[n] * (0.85 + 0.3 * hash(seed * 3.3 + 9)) * (1 + step * 0.04); g.gain.value = v;
    src.connect(tone); tone.connect(g); g.connect(bus); src.start(at);
    const maxDur = len > 0.15 ? len : SFX_MAX[n];
    if (maxDur) { g.gain.setValueAtTime(v, at + maxDur - 0.12); g.gain.linearRampToValueAtTime(0.0001, at + maxDur); src.stop(at + maxDur + 0.02); }
  }
  function scheduleMusic() { /* both films play their own recorded track */ }
  // The film's whole soundtrack rendered offline, exactly as it plays live,
  // as a 16-bit WAV (base64) for the MP4 export.
  async function renderAudio({ music = true, sfx = true } = {}) {
    const sr = 48000, ctx = new OfflineAudioContext(2, Math.ceil(DUR * sr), sr);
    const dec = async (url) => ctx.decodeAudioData(await (await fetch(url)).arrayBuffer());
    if (music && track().src) {
      const g = ctx.createGain(); g.connect(ctx.destination);
      g.gain.setValueAtTime(track().volume || 0.9, 0); g.gain.setTargetAtTime(0, Math.max(0, DUR - 0.9), 0.3);
      const src = ctx.createBufferSource(); src.buffer = await dec(track().src); src.connect(g); src.start(0, film.musicStart);
    }
    if (sfx) {
      const bus = ctx.createGain(); bus.gain.value = SFX_LEVEL; bus.connect(ctx.destination);
      const buf = {};
      await Promise.all([...new Set(Object.keys(SFX_GAIN).flatMap(files))].map(async (n) => { try { buf[n] = await dec('sfx/' + n + '.mp3'); } catch (_e) { /* missing: silent */ } }));
      film.cues.forEach(([at, snd, step, len]) => { if (at >= 0 && at < DUR) sample(snd, at, at, step, len, { ctx, buf, bus }); });
    }
    const out = await ctx.startRendering();
    const L = out.getChannelData(0), Rr = out.getChannelData(1), n = L.length;
    const wav = new DataView(new ArrayBuffer(44 + n * 4));
    const w = (o, str) => { for (let i = 0; i < str.length; i++) wav.setUint8(o + i, str.charCodeAt(i)); };
    w(0, 'RIFF'); wav.setUint32(4, 36 + n * 4, true); w(8, 'WAVE'); w(12, 'fmt '); wav.setUint32(16, 16, true); wav.setUint16(20, 1, true); wav.setUint16(22, 2, true);
    wav.setUint32(24, sr, true); wav.setUint32(28, sr * 4, true); wav.setUint16(32, 4, true); wav.setUint16(34, 16, true); w(36, 'data'); wav.setUint32(40, n * 4, true);
    for (let i = 0; i < n; i++) { wav.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true); wav.setInt16(46 + i * 4, Math.max(-1, Math.min(1, Rr[i])) * 32767, true); }
    const bytes = new Uint8Array(wav.buffer); let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function audioStart(t) {
    const ctx = ensureAudio(); if (!ctx) return;
    audioStop();
    AU.startAt = ctx.currentTime - t + 0.05; AU.schedT = t;
    const g = AU.musicBus.gain; g.cancelScheduledValues(ctx.currentTime); g.setValueAtTime(g.value, ctx.currentTime);
    const el = musicEl();
    if (el) {
      g.cancelScheduledValues(ctx.currentTime); g.setValueAtTime(musicLevel(), ctx.currentTime);
      el.currentTime = film.musicStart + t; el.play().catch(() => {});
      return;
    }
  }
  function audioStop() {
    if (!AU.ctx) return;
    const now = AU.ctx.currentTime;
    AU.nodes.forEach(({ n }) => { try { n.stop(now + 0.05); } catch (_e) { /* already stopped */ } });
    AU.nodes = [];
    Object.values(AU.els || {}).forEach((el) => el.pause());
  }
  function audioTick(prevT, t) {
    if (!AU.ctx || !playing) return;
    if (AU.schedT < t + 0.3) { scheduleMusic(AU.schedT, t + 0.6); AU.schedT = t + 0.6; }
    film.cues.forEach(([at, snd, step, len]) => { if (at >= prevT && at < t + 0.08 && at >= AU.cuedUpTo) { const when = AU.startAt + at; sample(snd, Math.max(AU.ctx.currentTime, when), at, step, len); } });
    AU.cuedUpTo = t + 0.08;
    // Fade the bed out at the very end.
    if (t > DUR - (track().src ? 0.9 : 2.4) && !AU.fading) { AU.fading = true; const g = AU.musicBus.gain; g.setTargetAtTime(0, AU.ctx.currentTime, track().src ? 0.3 : 0.7); }
    AU.nodes = AU.nodes.filter((x) => x.end > AU.ctx.currentTime - 0.5);
  }
  // Switch music and/or sound effects; undefined leaves one as it is.
  function setAudio(music, sfx) {
    const wasOn = AU.on;
    if (music != null) { AU.musicOn = music; store.set('hm-music', music ? '1' : '0'); }
    if (sfx != null) { AU.sfxOn = sfx; store.set('hm-sfx', sfx ? '1' : '0'); }
    AU.on = AU.musicOn || AU.sfxOn;
    if (AU.on) ensureAudio();
    if (AU.ctx) {
      AU.master.gain.setTargetAtTime(AU.on ? 1 : 0, AU.ctx.currentTime, 0.05);
      AU.sfxBus.gain.setTargetAtTime(AU.sfxOn ? SFX_LEVEL : 0, AU.ctx.currentTime, 0.05);
      if (!AU.fading) AU.musicBus.gain.setTargetAtTime(musicLevel(), AU.ctx.currentTime, 0.05);
    }
    if (AU.on && !wasOn && playing) { AU.cuedUpTo = T; audioStart(T); }
    updateUI(true);
  }

  // ---------------------------------------------------------------- playback
  let playing = false, last = 0;
  function play() {
    if (T >= DUR - 0.01) T = 0;
    playing = true; last = performance.now();
    if (AU.on && (AU.ctx || userGesture)) { AU.cuedUpTo = T; AU.fading = false; audioStart(T); }
    requestAnimationFrame(loop); updateUI(true);
  }
  function pause() { playing = false; audioStop(); if (AU.ctx) AU.musicBus.gain.setTargetAtTime(0, AU.ctx.currentTime, 0.05); updateUI(true); }
  function seek(t) {
    T = clamp(t, 0, DUR); film.scenes.forEach(unhideScene);
    if (playing && AU.ctx) { AU.cuedUpTo = T; AU.fading = false; audioStart(T); }
    render(T);
  }
  function loop(now) {
    if (!playing) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const prev = T; let t = T + dt;
    const el = AU.els && AU.els[V];
    if (el && el._wired && !el.paused && el.readyState >= 2) {
      const mt = el.currentTime - film.musicStart;
      if (Math.abs(mt - t) > 0.06) t = mt;
    }
    if (t >= DUR) { if (LOOP) { t = 0; render(0); if (AU.ctx && AU.on) { AU.cuedUpTo = 0; AU.fading = false; audioStart(0); } } else { t = DUR; render(t); pause(); return; } }
    render(t); audioTick(prev, t);
    requestAnimationFrame(loop);
  }
  function frame() { if (film) render(T); }
  let userGesture = false;
  const gesture = () => { userGesture = true; if (AU.on) { ensureAudio(); if (playing && AU.ctx && !AU.started) { AU.started = true; AU.cuedUpTo = T; audioStart(T); } } };
  window.addEventListener('pointerdown', gesture, { capture: true });
  window.addEventListener('keydown', gesture, { capture: true });

  // ---------------------------------------------------------------- controls
  let uiEls = null, hideTimer = 0;
  function buildUI() {
    ui.innerHTML = '';
    const bar = h('div', 'bar', ui);
    const playB = h('button', 'play', bar, '▶'); playB.setAttribute('aria-label', 'Play or pause');
    const time = h('div', 'time', bar, '0:00 / 1:00');
    const scrub = h('div', 'scrub', bar, '<div class="rail"></div><div class="done"></div><div class="tip"></div>');
    film.scenes.forEach((sc) => { const tk = h('div', 'tick', scrub); tk.style.left = (sc.start / DUR * 100) + '%'; });
    const seg2 = h('div', 'seg', bar);
    const vA = h('button', '', seg2, 'A'); const vB = h('button', '', seg2, 'B'); const vC = h('button', '', seg2, 'C');
    vA.title = C.versions.a.label; vB.title = C.versions.b.label; vC.title = C.versions.c.label;
    const fmt = h('button', '', bar, PORTRAIT ? '9:16' : '16:9'); fmt.title = 'Switch between wide and TikTok formats';
    const mus = h('button', '', bar, ''); mus.title = 'Music (M)';
    const snd = h('button', '', bar, ''); snd.title = 'Sound effects (S)';
    const edit = h('button', '', bar, 'Edit'); edit.title = 'Change photos, names and text (E)';
    const fs = h('button', '', bar, '⤢'); fs.title = 'Full screen';
    uiEls = { playB, time, scrub, done: scrub.querySelector('.done'), tip: scrub.querySelector('.tip'), vA, vB, vC, mus, snd, fmt };
    playB.onclick = () => (playing ? pause() : play());
    const at = (e) => { const r = scrub.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width) * DUR; };
    let drag = false;
    scrub.onpointerdown = (e) => { drag = true; scrub.setPointerCapture(e.pointerId); seek(at(e)); };
    scrub.onpointermove = (e) => { const tt = at(e); const sc = film.scenes.find((s) => tt >= s.start && tt < s.end); uiEls.tip.textContent = `${fmtT(tt)} · ${sc ? sc.title : ''}`; uiEls.tip.style.left = (tt / DUR * 100) + '%'; if (drag) seek(tt); };
    scrub.onpointerup = () => { drag = false; };
    vA.onclick = () => switchVersion('a'); vB.onclick = () => switchVersion('b'); vC.onclick = () => switchVersion('c');
    mus.onclick = () => setAudio(!AU.musicOn, null);
    snd.onclick = () => setAudio(null, !AU.sfxOn);
    edit.onclick = openEditor;
    fs.onclick = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen && document.documentElement.requestFullscreen());
    fmt.onclick = () => { const q = new URLSearchParams(location.search); q.set('format', PORTRAIT ? 'wide' : 'tiktok'); q.set('v', V); history.replaceState(null, '', '?' + q.toString()); layout(true); };
    updateUI(true);
  }
  const fmtT = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  let lastUI = '';
  function updateUI(force) {
    if (!uiEls) return;
    const key = Math.floor(T * 4) + (playing ? 'p' : 's') + AU.musicOn + AU.sfxOn + V;
    if (!force && key === lastUI) return; lastUI = key;
    uiEls.playB.textContent = playing ? '❚❚' : '▶';
    uiEls.time.textContent = `${fmtT(T)} / ${fmtT(DUR)}`;
    uiEls.done.style.width = (T / DUR * 100) + '%';
    cls(uiEls.vA, 'on', V === 'a'); cls(uiEls.vB, 'on', V === 'b'); cls(uiEls.vC, 'on', V === 'c');
    uiEls.mus.textContent = AU.musicOn ? 'Music on' : 'Music off'; cls(uiEls.mus, 'off', !AU.musicOn);
    uiEls.snd.textContent = AU.sfxOn ? 'SFX on' : 'SFX off'; cls(uiEls.snd, 'off', !AU.sfxOn);
    uiEls.fmt.textContent = PORTRAIT ? '9:16' : '16:9';
  }
  function switchVersion(v) {
    if (v === V) return; V = v; store.set('hm-v', v);
    const q = new URLSearchParams(location.search); q.set('v', v); history.replaceState(null, '', '?' + q.toString());
    const was = playing; pause(); T = 0; build(); if (was) play();
  }
  const poke = () => { ui.classList.remove('hide'); clearTimeout(hideTimer); hideTimer = setTimeout(() => { if (playing) ui.classList.add('hide'); }, 2600); };
  window.addEventListener('pointermove', poke);
  window.addEventListener('keydown', (e) => {
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    poke();
    if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
    else if (e.key === 'm' || e.key === 'M') setAudio(!AU.musicOn, null);
    else if (e.key === 's' || e.key === 'S') setAudio(null, !AU.sfxOn);
    else if (e.key === 'e' || e.key === 'E') openEditor();
    else if (e.key === 'ArrowRight') { const n = film.scenes.find((s) => s.start > T + 0.05); seek(n ? n.start : DUR); }
    else if (e.key === 'ArrowLeft') { const p = [...film.scenes].reverse().find((s) => s.start < T - 0.6); seek(p ? p.start : 0); }
  });

  // ---------------------------------------------------------------- editor
  function openEditor() {
    const ed = document.getElementById('editor');
    if (!ed.hidden) { ed.hidden = true; return; }
    pause();
    const draft = JSON.parse(JSON.stringify({ member: C.member, introductions: C.introductions, premiumExtra: C.premiumExtra, introductionsMen: C.introductionsMen, premiumExtraMen: C.premiumExtraMen, versions: C.versions }));
    ed.innerHTML = '';
    h('button', 'close', ed, '×').onclick = () => { ed.hidden = true; };
    h('h2', '', ed, 'Edit the walkthrough');
    h('p', 'hint', ed, 'Drop a photo on anyone (or click their picture), change names and lines, then Save. Changes are kept in this browser; Export gives you a file to share or to paste into config.js.');
    const person = (obj, extra) => {
      const row = h('div', 'person', ed);
      const img = h('img', '', row); img.src = obj.photo; img.alt = '';
      const f = h('div', 'fields', row);
      const inp = (k, ph2, full) => { const i = h('input', '', f); i.value = obj[k] == null ? '' : obj[k]; i.placeholder = ph2; if (full) i.style.gridColumn = 'span 2'; i.oninput = () => { obj[k] = k === 'age' ? Number(i.value) || i.value : i.value; }; return i; };
      inp('name', 'Name'); if (extra) { inp('age', 'Age'); inp('job', 'Job', true); inp('city', 'City', true); }
      const file = h('input', '', row); file.type = 'file'; file.accept = 'image/*'; file.hidden = true;
      const take = (fl) => { if (!fl) return; shrink(fl).then((url) => { obj.photo = url; img.src = url; }); };
      img.onclick = () => file.click(); file.onchange = () => take(file.files[0]);
      row.ondragover = (e) => { e.preventDefault(); row.classList.add('drag'); };
      row.ondragleave = () => row.classList.remove('drag');
      row.ondrop = (e) => { e.preventDefault(); row.classList.remove('drag'); take(e.dataTransfer.files[0]); };
    };
    h('h3', '', ed, 'Zayd, the member in film A'); person(draft.member, true);
    h('h3', '', ed, 'The women: film A’s five introductions (the first, Amina, is the match and film B’s member)'); draft.introductions.forEach((p) => person(p, true));
    h('h3', '', ed, 'Premium’s extra five'); draft.premiumExtra.forEach((p) => person(p, false));
    h('h3', '', ed, 'The men (film B’s introductions after Zayd, and the other side in film A)'); draft.introductionsMen.forEach((p) => person(p, true));
    h('h3', '', ed, 'Premium’s extra five men'); draft.premiumExtraMen.forEach((p) => person(p, false));
    h('h3', '', ed, `Words in ${C.versions[V].label}`);
    const cp = draft.versions[V].copy;
    Object.keys(cp).forEach((k) => { h('label', '', ed, esc(k)); const ta = h('textarea', '', ed); ta.value = cp[k]; ta.rows = Math.max(String(cp[k]).split(/\n/).length, cp[k].length > 50 ? 2 : 1); ta.oninput = () => { cp[k] = ta.value; }; });
    const row = h('div', 'row', ed);
    const sv = h('button', 'primary', row, 'Save'); const ex = h('button', '', row, 'Export'); const rs = h('button', '', row, 'Reset');
    sv.onclick = () => {
      const next = merge(saved, draft);
      if (!store.set(SAVE_KEY, JSON.stringify(next))) { alertBox(ed, 'This browser would not save the changes (storage full or blocked). Use Export instead.'); return; }
      location.reload();
    };
    ex.onclick = () => { const blob = new Blob(['window.HM_OVERRIDES = ' + JSON.stringify(draft, null, 2) + ';\n'], { type: 'text/javascript' }); const a = h('a', '', null); a.href = URL.createObjectURL(blob); a.download = 'walkthrough-overrides.js'; a.click(); };
    rs.onclick = () => { store.del(SAVE_KEY); location.reload(); };
    ed.hidden = false;
  }
  function alertBox(parent, msg) { const p = h('p', 'hint', parent, esc(msg)); p.style.color = '#C2124A'; }
  // Photos are resized before saving so the browser can keep several.
  function shrink(file) {
    return new Promise((res) => {
      const r = new FileReader();
      r.onload = () => { const im = new Image(); im.onload = () => { const s = Math.min(1, 720 / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.82)); }; im.src = r.result; };
      r.readAsDataURL(file);
    });
  }

  // ---------------------------------------------------------------- layout and start
  function layout(rebuild) {
    const f = new URLSearchParams(location.search).get('format');
    const wasP = PORTRAIT;
    PORTRAIT = f === 'tiktok' ? true : f === 'wide' ? false : innerWidth / innerHeight < 0.9;
    W = PORTRAIT ? 1080 : 1920; H = PORTRAIT ? 1920 : 1080;
    const s = Math.min(innerWidth / W, innerHeight / H);
    stage.style.width = W + 'px'; stage.style.height = H + 'px';
    stage.style.marginLeft = (-W * s / 2) + 'px'; stage.style.marginTop = (-H * s / 2) + 'px';
    stage.style.transform = `scale(${s})`;
    G3.pr = Math.min(2.5, (window.devicePixelRatio || 1) * s);
    if (G3.layers) G3.layers.forEach((L) => { [L.r, L.gr].forEach((rr) => { rr.setPixelRatio(G3.pr); rr.setSize(W, H, true); }); L.css.setSize(W, H); });
    stage.classList.toggle('portrait', PORTRAIT);
    document.body.classList.toggle('portrait-ui', innerWidth / innerHeight < 0.9);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    dust.width = innerWidth * dpr; dust.height = innerHeight * dpr; dust._dpr = dpr;
    if (rebuild || wasP !== PORTRAIT || !film) build(); else frame();
  }
  let rt = 0;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => layout(false), 120); });

  document.fonts && document.fonts.load && Promise.all(['400 40px Playfair', '400 20px Noto', '600 20px Noto', '500 20px Beiruti'].map((f) => document.fonts.load(f))).catch(() => {});
  (async () => {
    await load3D();
    layout(true);
    const t0 = Number(Q.get('t')); if (t0 > 0) seek(t0);
    const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (EXPORTING) { /* the exporter drives every frame */ }
    else if (Q.get('autoplay') === '1' || (EMBED && !reduced)) play();
    else if (reduced) seek(8);
  })();
  // Resolves once the 3D phone, fonts, photos and the wordmark are ready.
  const ready = (async () => {
    while (!film) await new Promise((r) => setTimeout(r, 50));
    if (document.fonts) await document.fonts.ready;
    await Promise.all([...document.images].map((im) => (im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; }))));
    await new Promise((r) => setTimeout(r, 300));
  })();
  window.HM = { seek, play, pause, get t() { return T; }, get film() { return film; }, get duration() { return DUR; }, render, renderAudio, ready };
})();
