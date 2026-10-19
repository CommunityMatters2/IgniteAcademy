import type { Metadata } from "next";
import { ForgotForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPage() {
  return (
    <div className="animate-rise">
      <h1 className="font-display text-4xl font-bold tracking-tight">Forgot it?</h1>
      <p className="mt-2 mb-8 text-muted">No stress. We&apos;ll email you a link to choose a new password.</p>
      <ForgotForm />
    </div>
  );
}
