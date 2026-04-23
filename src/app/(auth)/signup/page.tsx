import type { Metadata } from "next";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = {
  title: "Crear cuenta · GOES Portal",
  description: "Crea tu cuenta familiar y empieza tu proceso de beca.",
};

export default function SignupPage() {
  return <SignupForm />;
}
