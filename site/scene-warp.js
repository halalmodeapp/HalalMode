/* Ambient breeze for the couple cover: a subtle, looping puppet warp.
 *
 * Each animated layer (the woman, the man, the bougainvillea and the two
 * plants) is redrawn by a small WebGL canvas inside its own .scene-layer, so
 * the hover / tilt / scroll parallax keeps applying to it unchanged. The layer
 * image is mapped onto a grid mesh; pins bend the mesh in the vertex shader:
 *   - limbs and the hijab trail rotate a fraction of a degree around a pinned
 *     shoulder or neck, fading to zero at the pin and at the edge of the limb;
 *   - plants sway more towards their tips and stay rigid below the pot rim;
 *   - the bougainvillea swings from its top edge.
 * Pin weights are baked into the mesh once; per frame the CPU only computes a
 * few angles, so a frame costs a handful of uniform writes and five draws.
 * At rest the mesh draws exactly the image it replaces, so the swap is seamless
 * (a bone's `rest` angle eases in with the breeze, so it never jumps).
 * Nothing runs with reduced motion, in the lite (save-data / low-memory) mode,
 * without WebGL, or while the page is hidden; the static images stay.
 *
 * halalmo.de starts it on its own cover below; the app's sign-up screen calls
 * startSceneWarp() on the same scene markup.
 */

// World-pixel pins (the reference illustration's 1536x1024 frame).
const RIGS = {
  woman: {
    bones: [
      // Raised arm: shoulder -> fingertips.
      { from: [629, 606], to: [775, 488], inner: 32, outer: 59, rest: 4.5, amp: 1.3, period: 5.6, phase: 0 },
      // Hijab trail: neck -> scarf tip. Kept narrow so the shoulder bag beside it stays still.
      { from: [532, 612], to: [408, 751], inner: 27, outer: 44, amp: 2.6, period: 4.3, phase: 1.7 },
    ],
  },
  man: {
    bones: [
      // Reaching arm: shoulder -> fingertips.
      { from: [940, 409], to: [816, 502], inner: 30, outer: 54, rest: 2, amp: 1.0, period: 6.1, phase: 0.9 },
      // Front shoe: the heel stays down while the toe rises and settles, unhurried.
      { from: [1062, 551], to: [999, 554], inner: 22, outer: 34, amp: 2.2, period: 6.5, phase: 0, lift: true },
    ],
  },
  bougainvillea: { sway: { anchor: 40, tip: 540, ampX: 6, ampY: 1.6, period: 6.5 } },
  plantLeft: { sway: { anchor: 902, tip: 625, ampX: 5.5, ampY: 1.2, period: 5.1 } },
  plantRight: { sway: { anchor: 864, tip: 378, ampX: 7.5, ampY: 1.6, period: 5.8 } },
};
const GRID = 40;
const MARGIN = 14; // world px around each layer for movement to spill into

const VERTEX = `
attribute vec2 a_pos;
attribute vec4 a_w;
uniform vec4 u_view;      // margin, width, height, time
uniform vec3 u_b1;        // pivot x, pivot y, angle
uniform vec3 u_b2;
uniform vec4 u_sway;      // ampX, ampY, omega, unused
varying vec2 v_uv;
vec2 turn(vec2 p, vec3 b, float w) {
  float a = b.z * w;
  vec2 d = p - b.xy;
  return b.xy + vec2(d.x * cos(a) - d.y * sin(a), d.x * sin(a) + d.y * cos(a));
}
void main() {
  vec2 p = turn(turn(a_pos, u_b1, a_w.x), u_b2, a_w.y);
  float t = u_view.w;
  p.x += u_sway.x * a_w.z * (sin(t * u_sway.z + a_w.w) + 0.35 * sin(t * u_sway.z * 2.3 + a_pos.x * 0.04));
  p.y += u_sway.y * a_w.z * sin(t * u_sway.z * 1.3 + a_w.w);
  v_uv = a_pos / u_view.yz;
  vec2 clip = (p + u_view.x) / (u_view.yz + 2.0 * u_view.x);
  gl_Position = vec4(clip.x * 2.0 - 1.0, 1.0 - clip.y * 2.0, 0.0, 1.0);
}`;
const FRAGMENT = `
precision mediump float;
uniform sampler2D u_tex;
varying vec2 v_uv;
void main() { gl_FragColor = texture2D(u_tex, v_uv); }`;

const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function boneWeight(bone, ox, oy, x, y) {
  const ax = bone.from[0] - ox, ay = bone.from[1] - oy, bx = bone.to[0] - ox, by = bone.to[1] - oy;
  const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
  const s = Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / len2));
  const d = Math.hypot(x - (ax + s * dx), y - (ay + s * dy));
  // Zero at the pinned joint, full along the limb, fading out past its edge.
  return smoothstep(bone.outer, bone.inner, d) * smoothstep(0, 0.45, s);
}

function buildMesh(rig, ox, oy, w, h) {
  const n = GRID + 1, pos = new Float32Array(n * n * 2), wts = new Float32Array(n * n * 4);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i, x = (i / GRID) * w, y = (j / GRID) * h;
      pos[k * 2] = x; pos[k * 2 + 1] = y;
      if (rig.bones) {
        wts[k * 4] = rig.bones[0] ? boneWeight(rig.bones[0], ox, oy, x, y) : 0;
        wts[k * 4 + 1] = rig.bones[1] ? boneWeight(rig.bones[1], ox, oy, x, y) : 0;
      }
      if (rig.sway) {
        const worldY = y + oy, sw = rig.sway;
        wts[k * 4 + 2] = Math.pow(smoothstep(sw.anchor, sw.tip, worldY), 1.6);
        wts[k * 4 + 3] = (x + ox) * 0.012;
      }
    }
  }
  const idx = new Uint16Array(GRID * GRID * 6);
  let q = 0;
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
      idx.set([a, b, c, b, d, c], q); q += 6;
    }
  }
  return { pos, wts, idx };
}

/** Context, shaders and mesh: created as soon as the script runs, while the
 * GPU is still idle. Asking for a WebGL context later, while the browser is
 * busy rasterizing the freshly loaded scene, can stall for half a second. */
function prepare(layer, rig) {
  const img = layer.querySelector('img');
  const style = getComputedStyle(layer);
  const ox = parseFloat(style.getPropertyValue('--x')), oy = parseFloat(style.getPropertyValue('--y'));
  const w = parseFloat(style.getPropertyValue('--w')), h = parseFloat(style.getPropertyValue('--h'));
  const canvas = document.createElement('canvas');
  canvas.className = 'scene-warp';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = `position:absolute;pointer-events:none;left:${(-MARGIN / w) * 100}%;top:${(-MARGIN / h) * 100}%;width:${((w + 2 * MARGIN) / w) * 100}%;height:${((h + 2 * MARGIN) / h) * 100}%`;
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) return null;

  const shader = (type, source) => { const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s); return s; };
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const mesh = buildMesh(rig, ox, oy, w, h);
  const buffer = (data, target = gl.ARRAY_BUFFER) => { const b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, data, gl.STATIC_DRAW); return b; };
  buffer(mesh.pos);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  buffer(mesh.wts);
  const aW = gl.getAttribLocation(program, 'a_w');
  gl.enableVertexAttribArray(aW); gl.vertexAttribPointer(aW, 4, gl.FLOAT, false, 0, 0);
  buffer(mesh.idx, gl.ELEMENT_ARRAY_BUFFER);

  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.clearColor(0, 0, 0, 0);

  const u = (name) => gl.getUniformLocation(program, name);
  const uView = u('u_view'), uB1 = u('u_b1'), uB2 = u('u_b2'), uSway = u('u_sway');
  const b1 = rig.bones && rig.bones[0], b2 = rig.bones && rig.bones[1];
  const sway = rig.sway;
  if (sway) gl.uniform4f(uSway, sway.ampX, sway.ampY, (2 * Math.PI) / sway.period, 0);
  if (!b1) gl.uniform3f(uB1, 0, 0, 0);
  if (!b2) gl.uniform3f(uB2, 0, 0, 0);
  const deg = Math.PI / 180;
  const angle = (b, t) => {
    if (b.lift) {
      // A slow, relaxed rise and fall that only ever lifts the toe off the step.
      return b.amp * deg * 0.5 * (1 - Math.cos((2 * Math.PI * t) / b.period + b.phase));
    }
    return (b.rest || 0) * deg + b.amp * deg * (Math.sin((2 * Math.PI * t) / b.period + b.phase) + 0.3 * Math.sin((2 * Math.PI * t) / (b.period * 0.47) + b.phase + 1.3));
  };

  let pixelW = 0, pixelH = 0;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.max(1, Math.round(canvas.clientWidth * dpr)), ch = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (cw !== pixelW || ch !== pixelH) { canvas.width = pixelW = cw; canvas.height = pixelH = ch; gl.viewport(0, 0, cw, ch); }
  };
  const observer = new ResizeObserver(resize);

  let shown = false;
  return {
    /** Uploads the decoded layer image and puts the canvas in place. */
    attach() {
      if (!img.complete || !img.naturalWidth) return false;
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      layer.insertBefore(canvas, img.nextSibling);
      resize();
      observer.observe(canvas);
      return true;
    },
    draw(t, strength) {
      gl.uniform4f(uView, MARGIN, w, h, t);
      if (sway) gl.uniform4f(uSway, sway.ampX * strength, sway.ampY * strength, (2 * Math.PI) / sway.period, 0);
      if (b1) gl.uniform3f(uB1, b1.from[0] - ox, b1.from[1] - oy, angle(b1, t) * strength);
      if (b2) gl.uniform3f(uB2, b2.from[0] - ox, b2.from[1] - oy, angle(b2, t) * strength);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES, mesh.idx.length, gl.UNSIGNED_SHORT, 0);
      if (!shown) { shown = true; img.style.visibility = 'hidden'; }
    },
    destroy() {
      observer.disconnect(); canvas.remove(); img.style.visibility = '';
      const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
    },
  };
}

const EASE_IN = 1.6; // seconds for the breeze to grow from stillness

/** Starts the breeze on a scene element; returns a function that stops it. */
export function startSceneWarp(scene, { eligible = () => true } = {}) {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let prepared = [], rigs = [], frame = 0, began = 0, disposed = false;
  const allowed = () => !disposed && scene && !reduceMotion.matches && eligible();
  function loop(now) {
    frame = requestAnimationFrame(loop);
    const t = now / 1000;
    if (!began) began = t;
    const k = Math.min(1, (t - began) / EASE_IN);
    const strength = k * k * (3 - 2 * k);
    for (const rig of rigs) rig.draw(t, strength);
  }
  function prepareAll() {
    if (prepared.length || !allowed()) return;
    for (const [key, rig] of Object.entries(RIGS)) {
      const layer = scene.querySelector(`[data-layer="${key}"]`);
      if (!layer || !layer.querySelector('img')) continue;
      try { const ready = prepare(layer, rig); if (ready) prepared.push(ready); } catch { /* the static image stays */ }
    }
  }
  function start() {
    if (rigs.length || !allowed()) return;
    performance.mark('scene-warp-start');
    prepareAll();
    rigs = prepared.filter((rig) => rig.attach());
    performance.mark('scene-warp-ready');
    performance.measure('scene-warp-init', 'scene-warp-start', 'scene-warp-ready');
    began = 0;
    if (rigs.length && !document.hidden) frame = requestAnimationFrame(loop);
  }
  function stop() {
    cancelAnimationFrame(frame); frame = 0;
    for (const rig of prepared) rig.destroy();
    prepared = []; rigs = [];
  }
  const onVisibility = () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else if (rigs.length && !frame) frame = requestAnimationFrame(loop);
  };
  const onMotion = () => (reduceMotion.matches ? stop() : start());
  document.addEventListener('visibilitychange', onVisibility);
  reduceMotion.addEventListener('change', onMotion);

  // Start once every scene image has arrived and the browser has settled, so the
  // GPU is not still busy uploading the freshly loaded scene.
  // Measured: started straight after load, WebGL set-up waits ~600 ms behind that
  // burst; 1.2 s later it takes well under 200 ms. The breeze eases in from rest,
  // so the wait is invisible.
  const images = [...scene.querySelectorAll('img')];
  const whenIdle = (fn) => setTimeout(() => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 400 }) : fn()), 1200);
  Promise.all(images.map((img) => (img.complete ? null : new Promise((done) => { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); }))))
    .then(() => (document.readyState === 'complete' ? whenIdle(start) : addEventListener('load', () => whenIdle(start), { once: true })));

  return () => {
    disposed = true;
    stop();
    document.removeEventListener('visibilitychange', onVisibility);
    reduceMotion.removeEventListener('change', onMotion);
  };
}

// halalmo.de: the cover on the landing page.
if (typeof document !== 'undefined') {
  const cover = document.getElementById('cover-couple');
  if (cover && !('app' in cover.dataset)) {
    const root = document.documentElement;
    startSceneWarp(cover, { eligible: () => !('sceneLite' in root.dataset) && root.dataset.coverStyle === 'couple' });
  }
}
