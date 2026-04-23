import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Iniciar sesión · GOES Portal",
  description: "Accede a tu portal de gestión de documentos GOES.",
};

export default function LoginPage() {
  return <LoginForm />;
}
