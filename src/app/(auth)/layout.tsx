import Link from "next/link";
import { Glow, Logo, Wordmark } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col px-5 pt-safe">
      <Glow />
      <header className="relative z-10 flex items-center gap-2.5 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo size={36} />
          <Wordmark />
        </Link>
      </header>
      <main className="relative z-10 mx-auto flex w-full max-w-sm flex-1 flex-col justify-center pb-16">
        {children}
      </main>
      <footer className="relative z-10 pb-safe text-center text-xs text-muted">
        A Community Matters 2 program
      </footer>
    </div>
  );
}
