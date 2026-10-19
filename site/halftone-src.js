/* Halftone CMYK texture over the couple cover, shared by halalmo.de and the
 * app's sign-up screen.
 *
 * Paper's Halftone CMYK filter (https://shaders.paper.design/halftone-cmyk)
 * works on one image, while the scene is many moving layers, so every frame
 * the layers are drawn where they currently sit (parallax, heart float, the
 * breeze's warped canvases) into one offscreen canvas, which becomes the
 * shader's image. The result is laid over the scene at low opacity, so the
 * live scene underneath, sun rays and dust motes included, still shows.
 *
 * Open halalmo.de with ?halftone for a tuning panel; its settings stay in that
 * browser, and "Copy settings" puts them on the clipboard.
 */
import {
  ShaderMount,
  halftoneCmykFragmentShader,
  HalftoneCmykTypes,
  getShaderColorFromString,
  getShaderNoiseTexture,
  ShaderFitOptions,
} from '@paper-design/shaders';

/** The chosen look. */
export const HALFTONE_DEFAULTS = {
  on: true,
  type: 'ink',
  size: 0.01, gridNoise: 0.2, softness: 0, contrast: 0.99,
  colorBack: '#fbfaf4', colorC: '#00b3ff', colorM: '#fc4f9d', colorY: '#ffd900', colorK: '#231f20',
  floodC: 0.22, floodM: 0.23, floodY: 0, floodK: 0,
  gainC: 0.3, gainM: 0, gainY: 0.2, gainK: 0,
  grainSize: 0.13, grainMixer: 1, grainOverlay: 0,
  opacity: 0.1,
};
// Paper's own defaults, for the panel's reset button.
const PAPER_DEFAULTS = {
  ...HALFTONE_DEFAULTS,
  size: 0.2, softness: 1, contrast: 1, floodC: 0.15, floodM: 0, grainSize: 0.5, grainMixer: 0, opacity: 1,
};
const STORE = 'halalmode-halftone-lab';
const SLIDERS = [
  ['size', 0, 1], ['gridNoise', 0, 1], ['softness', 0, 1], ['contrast', 0, 2],
  ['floodC', 0, 1], ['floodM', 0, 1], ['floodY', 0, 1], ['floodK', 0, 1],
  ['gainC', -1, 1], ['gainM', -1, 1], ['gainY', -1, 1], ['gainK', -1, 1],
  ['grainSize', 0, 1], ['grainMixer', 0, 1], ['grainOverlay', 0, 1], ['opacity', 0, 1],
];
const COLORS = ['colorBack', 'colorC', 'colorM', 'colorY', 'colorK'];

function uniforms(s) {
  return {
    u_colorBack: getShaderColorFromString(s.colorBack),
    u_colorC: getShaderColorFromString(s.colorC),
    u_colorM: getShaderColorFromString(s.colorM),
    u_colorY: getShaderColorFromString(s.colorY),
    u_colorK: getShaderColorFromString(s.colorK),
    u_size: s.size, u_gridNoise: s.gridNoise, u_softness: s.softness, u_contrast: s.contrast,
    u_floodC: s.floodC, u_floodM: s.floodM, u_floodY: s.floodY, u_floodK: s.floodK,
    u_gainC: s.gainC, u_gainM: s.gainM, u_gainY: s.gainY, u_gainK: s.gainK,
    u_grainSize: s.grainSize, u_grainMixer: s.grainMixer, u_grainOverlay: s.grainOverlay,
    u_type: HalftoneCmykTypes[s.type],
  };
}

/**
 * Lays the texture over a scene element. Returns { apply(settings), stop() }.
 * With reduced motion (or `still`), the picture updates a few times a second
 * instead of every frame.
 */
export function startHalftone(scene, { settings = HALFTONE_DEFAULTS, still = false } = {}) {
  let current = { ...HALFTONE_DEFAULTS, ...settings };
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const overlay = document.createElement('div');
  overlay.className = 'scene-halftone';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.style.cssText = 'position:absolute;inset:0;z-index:4;pointer-events:none';
  const composite = document.createElement('canvas');
  const ctx = composite.getContext('2d');
  let mount = null, frame = 0, building = false, stopped = false, last = 0;

  // Every layer where it currently sits; a layer the breeze is bending is
  // taken from its warp canvas instead of the still picture.
  function paint() {
    const box = scene.getBoundingClientRect();
    const scale = Math.min(1, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(box.width * scale)), h = Math.max(1, Math.round(box.height * scale));
    if (composite.width !== w || composite.height !== h) { composite.width = w; composite.height = h; }
    ctx.fillStyle = getComputedStyle(scene).backgroundColor || '#2F6BD8';
    ctx.fillRect(0, 0, w, h);
    for (const layer of scene.querySelectorAll('.scene-layer')) {
      const warp = layer.querySelector('canvas.scene-warp');
      const img = layer.querySelector('img');
      const source = warp && img && img.style.visibility === 'hidden' ? warp : img;
      if (!source || (source === img && (!img.complete || !img.naturalWidth))) continue;
      const r = source.getBoundingClientRect();
      ctx.drawImage(source, (r.left - box.left) * scale, (r.top - box.top) * scale, r.width * scale, r.height * scale);
    }
  }

  async function build() {
    if (building || stopped) return;
    building = true;
    teardown();
    paint();
    // The shader takes its first image, and its aspect ratio, from an <img>.
    const first = new Image();
    first.src = composite.toDataURL('image/jpeg', 0.8);
    const noise = getShaderNoiseTexture();
    await Promise.all([first.decode(), noise?.decode()].filter(Boolean)).catch(() => undefined);
    building = false;
    if (stopped || !current.on) return;
    scene.append(overlay);
    try {
      mount = new ShaderMount(overlay, halftoneCmykFragmentShader, {
        u_image: first, u_noiseTexture: noise, ...uniforms(current),
        u_fit: ShaderFitOptions.cover, u_scale: 1, u_rotation: 0, u_originX: 0.5, u_originY: 0.5,
        u_offsetX: 0, u_offsetY: 0, u_worldWidth: 0, u_worldHeight: 0,
      }, { alpha: false, antialias: false }, 0, 0, 1);
    } catch {
      mount = null;
      overlay.remove();
      return;
    }
    overlay.style.opacity = String(current.opacity);
    frame = requestAnimationFrame(loop);
  }

  // Redraw the layers and hand them to the shader: 30 times a second, or a
  // few times a second when motion is reduced.
  function loop(now) {
    frame = requestAnimationFrame(loop);
    if (!mount || document.hidden) return;
    const interval = still || reduceMotion.matches ? 400 : 33;
    if (now - last < interval) return;
    last = now;
    paint();
    const gl = mount.gl, texture = mount.textures.get('u_image'), unit = mount.textureUnitMap.get('u_image');
    if (!texture) return;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, composite);
    mount.render(now);
  }

  function teardown() {
    cancelAnimationFrame(frame); frame = 0;
    if (mount) { mount.dispose(); mount = null; }
    overlay.remove();
  }

  let resizeTimer = 0;
  const observer = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (current.on && mount) void build(); }, 200);
  });
  observer.observe(scene);

  function apply(next) {
    current = { ...current, ...next };
    if (!current.on) { teardown(); return; }
    if (!mount) { void build(); return; }
    overlay.style.opacity = String(current.opacity);
    mount.setUniforms(uniforms(current));
  }

  // Wait for the scene's pictures, so the first frame is complete.
  const images = [...scene.querySelectorAll('.scene-layer img')];
  Promise.all(images.map((img) => (img.complete ? null : new Promise((done) => {
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
  })))).then(() => { if (current.on) void build(); });

  return {
    apply,
    stop() {
      stopped = true;
      clearTimeout(resizeTimer);
      observer.disconnect();
      teardown();
    },
  };
}

// ---------------------------------------------------------------- halalmo.de
if (typeof document !== 'undefined') {
  const cover = document.getElementById('cover-couple');
  if (cover && !('app' in cover.dataset)) {
    const tuning = new URLSearchParams(location.search).has('halftone');
    let settings = { ...HALFTONE_DEFAULTS };
    if (tuning) {
      try { settings = { ...settings, ...JSON.parse(localStorage.getItem(STORE) || '{}') }; } catch { /* defaults */ }
    }
    const root = document.documentElement;
    const halftone = startHalftone(cover, { settings, still: 'sceneLite' in root.dataset });
    if (tuning) {
      panel(() => settings, (next) => {
        settings = next;
        try { localStorage.setItem(STORE, JSON.stringify(settings)); } catch { /* still works this visit */ }
        halftone.apply(settings);
      });
    }
  }
}

function panel(get, set) {
  const css = document.createElement('style');
  css.textContent = `
.halftone-lab{position:fixed;z-index:9999;left:16px;bottom:16px;width:268px;max-height:calc(100vh - 32px);overflow:hidden auto;box-sizing:border-box;padding:12px 14px;border-radius:14px;background:rgba(252,252,251,.96);box-shadow:0 12px 40px rgba(10,10,10,.22);font:500 12px/1.3 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#0A0A0A;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.halftone-lab[data-closed] .halftone-lab-body{display:none}
.halftone-lab header{position:static;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0;margin:0 0 8px}
.halftone-lab header b{font-weight:700}
.halftone-lab label{display:grid;grid-template-columns:86px minmax(0,1fr) 34px;align-items:center;gap:6px;margin:5px 0;font-size:11.5px}
.halftone-lab label.color{grid-template-columns:86px minmax(0,1fr)}
.halftone-lab input[type=range]{width:100%;margin:0;padding:0;accent-color:#FC3C6C}
.halftone-lab input[type=color]{width:100%;height:22px;padding:0;border:1px solid rgba(10,10,10,.15);border-radius:6px;background:none}
.halftone-lab output{text-align:right;font-variant-numeric:tabular-nums;color:#6C6A65}
.halftone-lab select{width:100%;padding:3px 6px;margin:0;border-radius:6px;font:inherit}
.halftone-lab button{width:auto;padding:5px 10px;margin:0;border:1px solid rgba(10,10,10,.15);border-radius:999px;background:#fff;color:#0A0A0A;font:600 11.5px ui-sans-serif,system-ui,sans-serif;cursor:pointer}
.halftone-lab button.on{background:#FC3C6C;border-color:#FC3C6C;color:#fff}
.halftone-lab .row{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.halftone-lab hr{border:0;border-top:1px solid rgba(10,10,10,.08);margin:8px 0}`;
  document.head.append(css);

  const root = document.createElement('div');
  root.className = 'halftone-lab';
  root.setAttribute('dir', 'ltr');
  root.innerHTML = `<header><b>Halftone CMYK</b><span><button type="button" data-act="toggle"></button> <button type="button" data-act="fold" title="Hide settings">–</button></span></header>
<div class="halftone-lab-body"><label>type<select data-key="type">${Object.keys(HalftoneCmykTypes).map((t) => `<option>${t}</option>`).join('')}</select><span></span></label>
${SLIDERS.map(([key, min, max]) => `<label>${key}<input type="range" data-key="${key}" min="${min}" max="${max}" step="0.01"><output data-out="${key}"></output></label>`).join('')}
<hr>${COLORS.map((key) => `<label class="color">${key}<input type="color" data-key="${key}"></label>`).join('')}
<div class="row"><button type="button" data-act="copy">Copy settings</button><button type="button" data-act="ours">Site default</button><button type="button" data-act="paper">Paper defaults</button></div></div>`;
  document.body.append(root);

  const sync = () => {
    const s = get();
    const toggle = root.querySelector('[data-act=toggle]');
    toggle.textContent = s.on ? 'On' : 'Off';
    toggle.classList.toggle('on', s.on);
    for (const input of root.querySelectorAll('[data-key]')) input.value = s[input.dataset.key];
    for (const out of root.querySelectorAll('[data-out]')) out.textContent = Number(s[out.dataset.out]).toFixed(2);
  };
  root.addEventListener('input', (event) => {
    const key = event.target.dataset?.key;
    if (!key) return;
    const value = event.target.type === 'range' ? Number(event.target.value) : event.target.value;
    set({ ...get(), [key]: value });
    sync();
  });
  root.addEventListener('click', (event) => {
    const act = event.target.dataset?.act;
    if (act === 'toggle') set({ ...get(), on: !get().on });
    if (act === 'fold') { root.toggleAttribute('data-closed'); event.target.textContent = root.hasAttribute('data-closed') ? '+' : '–'; }
    if (act === 'ours') set({ ...HALFTONE_DEFAULTS, on: get().on });
    if (act === 'paper') set({ ...PAPER_DEFAULTS, on: get().on });
    if (act === 'copy') {
      const { on, ...rest } = get();
      navigator.clipboard?.writeText(JSON.stringify(rest, null, 2)).then(() => {
        event.target.textContent = 'Copied';
        setTimeout(() => { event.target.textContent = 'Copy settings'; }, 1200);
      });
    }
    sync();
  });
  sync();
}
