/* God-ray toggles for the couple cover.
 *
 *   Sun rays     the scene's own CSS light shafts and dust motes (on by default)
 *   Paper rays   Paper Shaders' god rays (https://shaders.paper.design/god-rays),
 *                anchored to the sun and screened over the scene, with their
 *                intensity, density and bloom drifting in slow loops
 *
 * The Paper shader is only created while its toggle is on. Choices are
 * remembered per browser. Bundled by `npm run build` in site/ into
 * scene-shaders.js.
 */
import {
  ShaderMount,
  godRaysFragmentShader,
  getShaderColorFromString,
  getShaderNoiseTexture,
  ShaderFitOptions,
} from '@paper-design/shaders';

const scene = document.getElementById('cover-couple');
const panel = document.querySelector('[data-shader-toggles]');
const STORAGE = 'halalmode-scene-rays';
const DEFAULTS = { sun: true, rays: false };
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const color = getShaderColorFromString;
const TAU = Math.PI * 2;
/** A slow loop between `a` and `b` with a period of `seconds`. */
const drift = (t, seconds, a, b, phase = 0) => a + (b - a) * 0.5 * (1 - Math.cos((TAU * t) / seconds + phase));

const sizing = (fit) => ({
  u_fit: ShaderFitOptions[fit], u_scale: 1, u_rotation: 0, u_offsetX: 0, u_offsetY: 0,
  u_originX: 0.5, u_originY: 0.5, u_worldWidth: 0, u_worldHeight: 0,
});

function overlay(name, blend, opacity) {
  const el = document.createElement('div');
  el.className = `scene-shader scene-shader-${name}`;
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText = `position:absolute;inset:0;pointer-events:none;mix-blend-mode:${blend};opacity:${opacity};transition:opacity .6s ease`;
  scene.appendChild(el);
  return el;
}

/** The sun's position on screen as Paper's -0.5..0.5 offsets from the centre. */
function sunOffset() {
  const glow = scene.querySelector('.scene-glow');
  const box = scene.getBoundingClientRect();
  if (!glow || !box.width) return [0.1, -0.4];
  const g = glow.getBoundingClientRect();
  return [((g.left + g.width / 2 - box.left) / box.width) - 0.5, ((g.top + g.height / 2 - box.top) / box.height) - 0.5];
}

const root = document.documentElement;
const EFFECTS = {
  sun: {
    create() {
      root.removeAttribute('data-sun-rays-off');
      return { el: { remove: () => root.setAttribute('data-sun-rays-off', '') }, mount: { dispose() {} }, tick() {} };
    },
  },
  rays: {
    create() {
      const el = overlay('rays', 'screen', 0.85);
      const [ox, oy] = sunOffset();
      const mount = new ShaderMount(el, godRaysFragmentShader, {
        ...sizing('none'),
        u_offsetX: ox, u_offsetY: oy,
        u_colorBack: color('#00000000'),
        u_colorBloom: color('#ffe7b0'),
        u_colors: [color('#fff3d1aa'), color('#ffd89a88'), color('#fffaf066')],
        u_colorsCount: 3,
        u_density: 0.32, u_spotty: 0.28, u_midSize: 0.18, u_midIntensity: 0.45,
        u_intensity: 0.55, u_bloom: 0.35,
        u_noiseTexture: noise,
      }, { alpha: true, premultipliedAlpha: true }, reduceMotion ? 0 : 0.18, 0, 1, 1920 * 1080);
      return {
        el, mount,
        tick(t) {
          const [x, y] = sunOffset();
          mount.setUniforms({
            u_offsetX: x, u_offsetY: y,
            u_intensity: drift(t, 11, 0.42, 0.68),
            u_midIntensity: drift(t, 7.5, 0.32, 0.56, 1.2),
            u_density: drift(t, 17, 0.26, 0.38, 2.1),
            u_bloom: drift(t, 9, 0.25, 0.45, 0.6),
          });
        },
      };
    },
  },
};

/** Paper's shared noise texture: loaded once, before any shader that needs it starts. */
const noise = getShaderNoiseTexture();

const live = {};
let frame = 0;
function loop(now) {
  frame = requestAnimationFrame(loop);
  if (document.hidden) return;
  const t = reduceMotion ? 0 : now / 1000;
  for (const effect of Object.values(live)) effect.tick(t);
}

function setEffect(name, on) {
  if (on && !live[name]) {
    const before = new Set(scene.querySelectorAll('.scene-shader'));
    try { live[name] = EFFECTS[name].create(); } catch (error) {
      console.warn('Scene shader failed', name, error);
      scene.querySelectorAll('.scene-shader').forEach((el) => { if (!before.has(el)) el.remove(); });
      return false;
    }
  } else if (!on && live[name]) {
    live[name].mount.dispose(); live[name].el.remove(); delete live[name];
  }
  const any = Object.keys(live).length > 0;
  if (any && !frame) frame = requestAnimationFrame(loop);
  if (!any && frame) { cancelAnimationFrame(frame); frame = 0; }
  return on;
}

function saved() { try { return JSON.parse(localStorage.getItem(STORAGE) || '{}'); } catch { return {}; } }
function save(state) { try { localStorage.setItem(STORAGE, JSON.stringify(state)); } catch { /* private mode */ } }

if (scene && panel) {
  const state = { ...DEFAULTS, ...saved() };
  const start = () => {
    for (const button of panel.querySelectorAll('[data-shader]')) {
      const name = button.dataset.shader;
      const apply = (on) => { const ok = setEffect(name, on); button.setAttribute('aria-pressed', String(!!(on && ok !== false))); };
      button.addEventListener('click', () => {
        const on = button.getAttribute('aria-pressed') !== 'true';
        apply(on); state[name] = on; save(state);
      });
      if (state[name]) apply(true);
      else if (name === 'sun') root.setAttribute('data-sun-rays-off', '');
    }
    panel.hidden = false;
  };
  const images = [...scene.querySelectorAll('img'), noise];
  Promise.all(images.map((img) => (img.complete ? null : new Promise((done) => { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); }))))
    .then(start);
}
