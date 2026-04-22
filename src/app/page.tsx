import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-navy hover:text-navy-dark"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-dark"
            >
              Crear cuenta
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="max-w-3xl text-center">
          <div className="mb-6 flex justify-center">
            <Logo variant="star" className="h-14 w-14 text-red-brand" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-navy sm:text-5xl">
            Brilla donde de verdad importa
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Plataforma segura para gestionar tu solicitud de beca académica o
            deportiva en universidades de Estados Unidos. Sube tus documentos,
            sigue tu progreso en tiempo real y trabaja con tu asesor GOES — todo
            en un solo lugar.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-full bg-red-brand px-7 py-3 font-semibold text-white shadow-sm transition hover:bg-red-brand-dark"
            >
              Empezar ahora
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-navy px-7 py-3 font-semibold text-navy transition hover:bg-muted"
            >
              Ya tengo cuenta
            </Link>
          </div>
          <p className="mt-12 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Ahora te toca a ti.
          </p>
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} GOES Education · goeseducation.com
      </footer>
    </div>
  );
}
