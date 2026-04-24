import Link from "next/link";
import { StarLogo } from "@/components/ui/StarLogo";
import { ParticleField } from "@/components/ui/ParticleField";
import { Reveal } from "@/components/ui/Reveal";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { getTheme } from "@/lib/theme";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = await getTheme();
  return (
    <div className="relative z-[1] flex min-h-screen items-center justify-center px-6 py-12">
      <ParticleField />
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle theme={theme} />
      </div>
      <Reveal delay={100}>
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <Link href="/" aria-label="Inicio">
              <StarLogo size={44} />
            </Link>
          </div>
          {children}
        </div>
      </Reveal>
    </div>
  );
}
