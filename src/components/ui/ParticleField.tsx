"use client";

import { useMemo, useSyncExternalStore } from "react";

type Particle = {
  id: number;
  x: number;
  y: number;
  size: number;
  dur: number;
  delay: number;
  opacity: number;
  color: string;
};

const COLORS = [
  "var(--particle-a)",
  "var(--particle-b)",
  "var(--particle-c)",
] as const;

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    dur: Math.random() * 30 + 20,
    delay: Math.random() * -30,
    opacity: Math.random() * 0.4 + 0.1,
    color: COLORS[i % 3],
  }));
}

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const NOOP_SUB = () => () => {};

function subscribeReducedMotion(cb: () => void): () => void {
  const mq = window.matchMedia(REDUCED_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getReducedMotion(): boolean {
  return window.matchMedia(REDUCED_QUERY).matches;
}

export function ParticleField({ count = 35 }: { count?: number }) {
  const particles = useMemo(() => makeParticles(count), [count]);
  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => false,
  );
  const mounted = useSyncExternalStore(
    NOOP_SUB,
    () => true,
    () => false,
  );

  if (!mounted || reduced) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            opacity: p.opacity,
            animation: `drift ${p.dur}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
