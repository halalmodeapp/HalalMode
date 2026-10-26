/* The how-it-works illustrations get the cover's look: a light CMYK halftone dot
 * pattern laid over the picture, and a minimal line boil (a slight turbulent
 * wobble that changes on held frames, twice a second, cycling through a
 * few "drawings" as hand-drawn animation does).
 *
 * Each `.feature-art img` is redrawn by a small WebGL canvas placed over it,
 * the same wobble as the couple cover in scene-warp.js: its amount and size
 * are the cover's, eased the same way with the picture's size on screen. The
 * halftone dots are re-rolled at random on every drawing: grid position, tilt and spacing, each dot's position, size, squash and presence, the ink's warmth and the grain, in the same pass. Nothing animates with reduced
 * motion, in the lite (save-data / low-memory) mode, off screen, or while the
 * page is hidden; without WebGL the plain image stays.
 */
(() => {
  'use strict';
  const art = [...document.querySelectorAll('.feature-art img')];
  if (!art.length) return;
  const nav = navigator;
  const lite = (nav.connection && nav.connection.saveData) || (nav.deviceMemory && nav.deviceMemory <= 2);
  if (lite) return;
  const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The cover's settings (scene-warp.js BOIL and its easing), at the pictures' 1536 x 1024 frame.
  const BOIL = { amount: 0.6, size: 6, drawings: 6, fps: 4 };
  const EASE = { amount: 0.2, size: 0.35 };
  const HALFTONE = { cell: 2.8, opacity: 0.1 }; // css px between dots; how much shows
  const FRAME = [1536, 1024];

  const VERTEX = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }';
  const FRAGMENT = `
precision highp float;
uniform sampler2D u_tex;
uniform vec2 u_res;       // canvas size in device px
uniform vec2 u_frame;     // the picture's own size
uniform vec3 u_boil;      // amount and size in picture px, drawing seed
uniform vec3 u_dots;      // cell size in device px, opacity, drawing seed
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
// One ink: a dot per rotated grid cell, as large as the ink is heavy there. Every
// new drawing re-rolls the grid's position, tilt and spacing, and each dot's own
// position, size, squash and presence, so the texture never settles into a pattern.
float ink(vec2 p, float angle, float amount) {
  float seed = u_dots.z;
  float spacing = u_dots.x * (0.92 + 0.16 * hash(vec2(seed, 1.3)));
  vec2 shift = vec2(hash(vec2(seed, angle)), hash(vec2(angle, seed + 3.7))) * spacing * 7.0;
  float a = angle + (hash(vec2(seed, 7.1 + angle)) - 0.5) * 0.1;
  float c = cos(a), s = sin(a);
  vec2 g = mat2(c, -s, s, c) * (p + shift) / spacing;
  vec2 id = floor(g);
  vec2 rnd = vec2(hash(id + vec2(seed * 1.7, angle)), hash(id + vec2(angle * 2.3, seed * 0.9 + 4.1)));
  float rnd3 = hash(id + vec2(seed * 3.1 + 8.2, angle + 1.9));
  // Each dot sits off its cell's centre, a little squashed, and a few drop out.
  vec2 d = fract(g) - 0.5 - (rnd - 0.5) * 0.22;
  d *= vec2(1.0 + (rnd3 - 0.5) * 0.2, 1.0 - (rnd3 - 0.5) * 0.2);
  float present = step(0.02, hash(id + vec2(seed * 5.3, angle * 1.7 + 2.0)));
  float dotSize = 0.9 + 0.2 * rnd.x;
  float r = sqrt(clamp(amount, 0.0, 1.0)) * 0.72 * dotSize * present;
  return smoothstep(r + 0.12, r - 0.12, length(d));
}
void main() {
  vec2 uv = vec2(gl_FragCoord.x / u_res.x, 1.0 - gl_FragCoord.y / u_res.y);
  // object-fit: cover, centred.
  float ia = u_frame.x / u_frame.y, ba = u_res.x / u_res.y;
  vec2 iuv = ba > ia ? vec2(uv.x, 0.5 + (uv.y - 0.5) * (ia / ba)) : vec2(0.5 + (uv.x - 0.5) * (ba / ia), uv.y);
  vec2 q = iuv * u_frame / u_boil.y + u_boil.z * vec2(37.2, 17.9);
  vec2 wobble = vec2(noise(q), noise(q + vec2(19.7, 7.3))) - 0.5
    + 0.45 * (vec2(noise(q * 2.7 + 5.1), noise(q * 2.7 + 11.3)) - 0.5);
  vec3 base = texture2D(u_tex, iuv + wobble * 2.0 * u_boil.x / u_frame).rgb;
  // Halftone: the picture's own colours as cyan, magenta, yellow and black dots.
  float k = 1.0 - max(base.r, max(base.g, base.b));
  vec3 cmy = (1.0 - base - k) / max(1.0 - k, 0.001);
  vec2 p = gl_FragCoord.xy;
  float dc = ink(p, 0.2618, cmy.x), dm = ink(p, 1.309, cmy.y), dy = ink(p, 0.0, cmy.z), dk = ink(p, 0.7854, k);
  vec3 dots = vec3((1.0 - dc) * (1.0 - dk), (1.0 - dm) * (1.0 - dk), (1.0 - dy) * (1.0 - dk));
  // How much shows changes on every drawing too.
  float strength = u_dots.y * (0.82 + 0.36 * hash(vec2(u_dots.z, 9.9)));
  // The ink's warmth and a little film grain change every drawing as well.
  vec3 tint = 1.0 + (vec3(hash(vec2(u_dots.z, 2.2)), hash(vec2(u_dots.z, 5.5)), hash(vec2(u_dots.z, 8.8))) - 0.5) * 0.02;
  vec3 col = mix(base, base * dots * tint, strength);
  col += (hash(gl_FragCoord.xy + u_dots.z * 57.0) - 0.5) * 0.006;
  gl_FragColor = vec4(col, 1.0);
}`;

  function start(img) {
    const figure = img.parentElement;
    const canvas = document.createElement('canvas');
    canvas.className = 'feature-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
    if (!gl) return;
    const shader = (type, source) => { const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s); return s; };
    const program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const u = (name) => gl.getUniformLocation(program, name);
    const uRes = u('u_res'), uFrame = u('u_frame'), uBoil = u('u_boil'), uDots = u('u_dots');

    let drawing = 0, dotSeed = 1 + Math.random() * 90, visible = false, timer = 0, lost = false;
    const draw = () => {
      if (lost) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(figure.clientWidth * dpr)), h = Math.max(1, Math.round(figure.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
      // The cover's wobble, eased with how big the picture is on screen.
      const s = Math.max(0.05, figure.clientWidth / FRAME[0]);
      gl.uniform2f(uRes, w, h);
      gl.uniform2f(uFrame, FRAME[0], FRAME[1]);
      gl.uniform3f(uBoil, reduced ? 0 : BOIL.amount * Math.pow(s, EASE.amount - 1), BOIL.size * Math.pow(s, EASE.size - 1), drawing);
      gl.uniform3f(uDots, HALFTONE.cell * dpr, HALFTONE.opacity, reduced ? 0 : dotSeed);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    // The wobble cycles through a few drawings; the dots roll a new random seed every time.
    const tick = () => { drawing = (drawing + 1) % BOIL.drawings; dotSeed = 1 + Math.random() * 90; draw(); };
    const update = () => {
      clearInterval(timer);
      if (visible && !document.hidden && !reduced) timer = setInterval(tick, 1000 / BOIL.fps);
    };

    canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); lost = true; canvas.remove(); img.style.visibility = ''; clearInterval(timer); });
    figure.appendChild(canvas);
    draw();
    img.style.visibility = 'hidden';
    new ResizeObserver(draw).observe(figure);
    new IntersectionObserver((entries) => { visible = entries.some((e) => e.isIntersecting); update(); }, { threshold: 0.05 }).observe(figure);
    document.addEventListener('visibilitychange', update);
  }

  art.forEach((img) => {
    const go = () => start(img);
    if (img.complete && img.naturalWidth) go();
    else img.addEventListener('load', go, { once: true });
  });
})();
