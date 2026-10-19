import {
  ShaderMount,
  liquidMetalFragmentShader,
  getShaderColorFromString,
  LiquidMetalShapes,
  ShaderFitOptions
} from '@paper-design/shaders';

const links = [...document.querySelectorAll('.logo-link')];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (links.length && !reducedMotion &&
    (CSS.supports('mask-image', 'url("/logo.svg")') || CSS.supports('-webkit-mask-image', 'url("/logo.svg")'))) {
  // The preprocessed SVG edge map makes highlights follow each letter. The
  // effect only plays on hover or focus, so its texture (lossless WebP, same
  // pixels as the PNG) waits until the page and the cover have loaded.
  const loadMap = () => {
    const image = new Image();
    image.onload = () => {
      for (const link of links) mountLogo(link, image);
    };
    image.src = '/logo-liquid-metal-map.webp';
  };
  const whenIdle = () => (window.requestIdleCallback ? requestIdleCallback(loadMap, { timeout: 2500 }) : setTimeout(loadMap, 600));
  if (document.readyState === 'complete') whenIdle();
  else addEventListener('load', whenIdle, { once: true });
}

function mountLogo(link, image) {
  const mount = link.querySelector('.logo-shader');
  let shader;
  try {
    shader = new ShaderMount(mount, liquidMetalFragmentShader, {
      u_image: image,
      u_isImage: true,
      u_imageAspectRatio: 988.77 / 139.6,
      u_shape: LiquidMetalShapes.diamond,
      u_colorBack: getShaderColorFromString('#ffffff'), // white base keeps it light
      u_colorTint: getShaderColorFromString('#FC3C6C'), // Halal Pink chrome
      u_repetition: 2.72,
      u_softness: 1,
      u_shiftRed: .3,
      u_shiftBlue: .3,
      u_distortion: .39,
      u_contour: 1,
      u_angle: 70,
      u_fit: ShaderFitOptions.contain,
      u_scale: .76,
      u_rotation: 0,
      u_originX: .5,
      u_originY: .5,
      u_offsetX: 0,
      u_offsetY: 0,
      u_worldWidth: 0,
      u_worldHeight: 0
    }, { alpha: false, antialias: false }, 0, 0, 2, 300000);
  } catch {
    return;
  }

  // Only the heart turns chrome (the mask is logo-heart.svg). With a mouse it
  // stays chrome while the pointer is over the logo and fades back as soon as
  // it leaves. A tap is one shot: chrome at once, back to normal about a
  // second later with nothing more to do. Keyboard focus counts only when it
  // came from the keyboard, so a tap's focus can no longer hold it on.
  let hovering = false;
  let focusing = false;
  let releaseTimer = 0;
  let stopTimer = 0;
  let touchClick = false;
  link.classList.add('is-ready');

  function activate() {
    clearTimeout(releaseTimer);
    clearTimeout(stopTimer);
    link.classList.add('is-active');
    shader.setSpeed(1);
  }
  function release(delay = 0) {
    clearTimeout(releaseTimer);
    releaseTimer = setTimeout(() => {
      if (hovering || focusing) return;
      link.classList.remove('is-active');
      stopTimer = setTimeout(() => shader.setSpeed(0), 700);
    }, delay);
  }

  link.addEventListener('pointerenter', event => {
    if (event.pointerType === 'touch') return;
    hovering = true;
    activate();
  });
  link.addEventListener('pointerleave', event => {
    if (event.pointerType === 'touch') return;
    hovering = false;
    release();
  });
  link.addEventListener('pointerdown', event => {
    touchClick = event.pointerType === 'touch';
    if (!touchClick) return;
    activate();
    release(1000);
  });
  link.addEventListener('focus', () => {
    if (!link.matches(':focus-visible')) return;
    focusing = true;
    activate();
  });
  link.addEventListener('blur', () => {
    if (!focusing) return;
    focusing = false;
    release();
  });
  link.addEventListener('click', event => {
    if (!touchClick) return;
    touchClick = false;
    event.preventDefault();
    if (location.pathname !== '/') {
      const destination = link.href;
      setTimeout(() => { location.href = destination; }, 1300);
    }
  });
}
