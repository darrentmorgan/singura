/**
 * Singleton confetti canvas module
 * Provides accessible confetti effects for waitlist celebrations
 */

import confetti from 'canvas-confetti';

type ConfettiInstance = ReturnType<typeof confetti.create>;

let instance: ConfettiInstance | null = null;
let canvas: HTMLCanvasElement | null = null;
let lastCelebrate = 0;

const CELEBRATE_THROTTLE = 800; // ms

const isClient = () => typeof window !== 'undefined';

/**
 * Check if user prefers reduced motion
 */
function prefersReducedMotion(): boolean {
  if (!isClient()) return true;
  return typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Lazily create the singleton canvas
 */
function getConfettiInstance(): ConfettiInstance | null {
  // SSR guard
  if (!isClient() || prefersReducedMotion()) return null;

  if (!instance) {
    // Create canvas if it doesn't exist
    if (!canvas) {
      canvas = document.createElement('canvas');
      Object.assign(canvas.style, {
        position: 'fixed',
        inset: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: '9999',
      });
      document.body.appendChild(canvas);

      // Handle viewport resize
      const resizeCanvas = () => {
        if (canvas) {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
        }
      };
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
    }

    // Create confetti instance
    instance = confetti.create(canvas, {
      resize: true,
      useWorker: true,
    });
  }

  return instance;
}

/**
 * Big, fast, top-falling rain that covers the whole screen all the way to the bottom.
 * Call this ONLY after the waitlist form submission succeeds.
 */
export function celebrate(durationMs = 3000): void {
  const now = Date.now();
  if (now - lastCelebrate < CELEBRATE_THROTTLE) return;
  lastCelebrate = now;

  const confettiInstance = getConfettiInstance();
  if (!confettiInstance) return;

  const end = Date.now() + durationMs;

  const defaults = {
    // Much bigger pieces & faster fall
    gravity: 2.8,          // ↑ much faster fall speed to reach bottom
    scalar: 2.5,           // ↑ much bigger pieces (zoom effect - looks closer)
    // Last longer to reach the bottom
    ticks: 400,            // increased lifetime to reach bottom of screen
    // Visuals
    shapes: ['square', 'circle'] as ('square' | 'circle')[],
    zIndex: 9999,
    startVelocity: 0,      // let gravity pull; avoids upward "puff" look
    angle: 90,             // straight down
    spread: 12,            // keep column tight; coverage comes from random X
  };

  (function frame() {
    confettiInstance({
      ...defaults,
      particleCount: 6,                     // small batch per frame
      drift: (Math.random() - 0.5) * 1.0,   // slight sideways wobble
      origin: {
        x: Math.random(),                   // anywhere along the top
        y: -0.08,                           // spawn slightly above the viewport
      },
    });

    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

/**
 * Optional: short shower effect
 */
export function shower(duration = 2000): void {
  const confettiInstance = getConfettiInstance();
  if (!confettiInstance) return;

  const end = Date.now() + duration;
  (function frame() {
    confettiInstance({
      particleCount: 2,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
    });
    confettiInstance({
      particleCount: 2,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}
