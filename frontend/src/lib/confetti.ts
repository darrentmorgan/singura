/**
 * Singleton confetti canvas module
 * Provides throttled, accessible confetti effects for waitlist celebrations
 */

import confetti from 'canvas-confetti';

type ConfettiInstance = ReturnType<typeof confetti.create>;

let instance: ConfettiInstance | null = null;
let canvas: HTMLCanvasElement | null = null;
let lastMicroBurst = 0;
let lastCelebrate = 0;

const MICRO_BURST_THROTTLE = 250; // ms
const CELEBRATE_THROTTLE = 800; // ms

/**
 * Check if user prefers reduced motion
 */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Lazily create the singleton canvas
 */
function getConfettiInstance(): ConfettiInstance | null {
  // SSR guard
  if (typeof window === 'undefined') return null;

  // Skip if user prefers reduced motion
  if (prefersReducedMotion()) return null;

  if (!instance) {
    // Create canvas if it doesn't exist
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.style.position = 'fixed';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '9999';
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
 * Micro-burst: subtle immediate feedback on button click
 */
export function burstMicro(): void {
  const now = Date.now();
  if (now - lastMicroBurst < MICRO_BURST_THROTTLE) return;
  lastMicroBurst = now;

  const confettiInstance = getConfettiInstance();
  if (!confettiInstance) return;

  confettiInstance({
    particleCount: 30,
    spread: 40,
    origin: { y: 0.6 },
    colors: ['#3b82f6', '#8b5cf6', '#ec4899'],
  });
}

/**
 * Celebrate: confetti falling from top across the whole screen
 */
export function celebrate(): void {
  const now = Date.now();
  if (now - lastCelebrate < CELEBRATE_THROTTLE) return;
  lastCelebrate = now;

  const confettiInstance = getConfettiInstance();
  if (!confettiInstance) return;

  const duration = 1500; // 1.5 seconds
  const end = Date.now() + duration;
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  (function frame() {
    // Fire confetti from multiple points across the top
    for (let i = 0; i < 3; i++) {
      confettiInstance({
        particleCount: 3,
        angle: 90, // Straight down
        spread: 45,
        startVelocity: 25,
        decay: 0.9,
        gravity: 0.6,
        drift: Math.random() * 2 - 1, // Random drift left/right
        origin: { x: Math.random(), y: 0 }, // Random x position at top
        colors: colors,
      });
    }

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
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
