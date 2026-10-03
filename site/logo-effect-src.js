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
  // The preprocessed SVG edge map makes highlights follow each letter.
  const image = new Image();
  image.onload = () => {
    for (const link of links) mountLogo(link, image);
  };
  image.src = '/logo-liquid-metal-map.png';
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
      u_colorBack: getShaderColorFromString('#aaaaac'),
      u_colorTint: getShaderColorFromString('#ffffff'),
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

  let hovering = false;
  let pressing = false;
  let focusing = false;
  let releaseTimer = 0;
  let stopTimer = 0;
  let touchClick = false;
  link.classList.add('is-ready');

  let holdUntil = 0;
  function activate() {
    clearTimeout(releaseTimer);
    clearTimeout(stopTimer);
    holdUntil = 0;
    link.classList.add('is-active');
    shader.setSpeed(1);
  }
  // Hover leaves fade after 0.5s; a tap fades after about 1s without further action.
  function release(delay = 500) {
    if (hovering || pressing || focusing) return;
    holdUntil = Math.max(holdUntil, performance.now() + delay);
    clearTimeout(releaseTimer);
    releaseTimer = setTimeout(() => {
      link.classList.remove('is-active');
      stopTimer = setTimeout(() => shader.setSpeed(0), 700);
    }, Math.max(0, holdUntil - performance.now()));
  }

  link.addEventListener('pointerenter', event => {
    if (event.pointerType === 'touch') return;
    hovering = true;
    activate();
  });
  link.addEventListener('pointerleave', () => {
    hovering = false;
    release();
  });
  link.addEventListener('pointerdown', event => {
    pressing = true;
    touchClick = event.pointerType === 'touch';
    activate();
  });
  const endPress = () => {
    if (!pressing) return;
    pressing = false;
    release(1000);
  };
  window.addEventListener('pointerup', endPress);
  window.addEventListener('pointercancel', () => {
    touchClick = false;
    endPress();
  });
  link.addEventListener('focus', () => {
    focusing = true;
    activate();
  });
  link.addEventListener('blur', () => {
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
