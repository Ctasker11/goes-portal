import Link from "next/link";
import { BrandMark, StarLogo } from "@/components/ui/StarLogo";
import { ParticleField } from "@/components/ui/ParticleField";
import { Reveal } from "@/components/ui/Reveal";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { getTheme, type Theme } from "@/lib/theme";

function TopNav({ theme }: { theme: Theme }) {
  return (
    <nav className="flex items-center justify-between px-6 py-4 sm:px-8">
      <BrandMark />
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="text-sm font-medium text-text-dim transition hover:text-foreground"
        >
          Iniciar sesión
        </Link>
        <Link
          href="/signup"
          className="rounded-full bg-accent px-5 py-2 text-sm font-bold text-accent-text transition hover:bg-accent-dark"
        >
          Crear cuenta
        </Link>
        <ThemeToggle theme={theme} />
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="flex flex-1 items-center justify-center px-6 py-12 text-center">
      <Reveal delay={200}>
        <div className="max-w-2xl">
          <div
            className="mb-6 flex justify-center"
            style={{ animation: "float 5s ease-in-out infinite" }}
          >
            <StarLogo size={56} />
          </div>
          <h1 className="font-display text-[clamp(2.25rem,6vw,3.75rem)] font-extrabold leading-[1.08] tracking-tight text-foreground">
            Tu portal hacia
            <br />
            la <span className="relative inline-block text-accent">
              beca
              <svg
                aria-hidden
                viewBox="0 0 120 17"
                preserveAspectRatio="none"
                className="absolute left-0 top-full w-full"
                style={{ height: "0.48em", marginTop: "-0.04em" }}
              >
                <path
                  d="M 4 4 Q 60 -1, 116 4 Q 72 2, 22 8 Q 56 5, 92 8 Q 67 6, 42 11"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  style={{
                    strokeDasharray: 420,
                    strokeDashoffset: 420,
                    animation:
                      "checkDraw 1800ms cubic-bezier(0.22,1,0.36,1) 600ms forwards",
                  }}
                />
              </svg>
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-[17px] leading-relaxed text-text-dim">
            Sube documentos, sigue tu progreso y trabaja con tu asesor —
            todo en un solo lugar.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-accent px-8 py-3 text-base font-bold text-accent-text transition hover:bg-accent-dark"
              style={{ boxShadow: "0 0 24px var(--glow-strong)" }}
            >
              Empezar ahora
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-border px-8 py-3 text-base font-semibold text-foreground/80 transition hover:border-[color:var(--border-active)] hover:text-foreground"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export default async function Home() {
  const theme = await getTheme();
  return (
    <div className="relative z-[1] flex min-h-screen flex-col">
      <ParticleField />
      <TopNav theme={theme} />
      <Hero />
      <footer className="p-5 text-center text-xs text-text-muted">
        © {new Date().getFullYear()} GOES Education
      </footer>
    </div>
  );
}
