import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, Cake, Crown, GraduationCap, Lightbulb, Sparkles } from "lucide-react";
import { Glow, Logo, LogoFull, Wordmark } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";

const features = [
  { icon: GraduationCap, title: "School first", body: "Report cards and attendance, all in one place.", tone: "text-brand" },
  { icon: Sparkles, title: "Earn your stars", body: "Badges for real wins — passing, licenses, certs.", tone: "text-gold" },
  { icon: Crown, title: "Scholar of the Month", body: "Climb the leaderboard. Top spot gets celebrated.", tone: "text-gold" },
  { icon: BookOpenCheck, title: "Help Center", body: "Grab a seat in ORBIT tutoring sessions.", tone: "text-info" },
  { icon: Lightbulb, title: "Your voice", body: "Pitch ideas that shape the program.", tone: "text-brand" },
  { icon: Cake, title: "Birthdays", body: "Because at IGNITE, your day is a big deal.", tone: "text-gold" },
];

export default function Landing() {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <Glow />
      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-5 pt-safe py-5">
        <div className="flex items-center gap-2.5">
          <Logo size={40} />
          <Wordmark height={13} />
        </div>
        <Link href="/login" className={buttonVariants({ variant: "secondary", size: "sm" })}>
          Sign in
        </Link>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-5 pb-20">
        <section className="pt-10 pb-14 sm:pt-16">
          <LogoFull size={150} className="mb-8 animate-rise" />
          <p className="mb-5 inline-flex animate-rise items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1.5 text-xs font-semibold text-muted backdrop-blur">
            <span className="size-1.5 rounded-full bg-brand shadow-[0_0_8px_var(--brand)]" />
            Community Matters 2 · IGNITE Academy
          </p>
          <h1 className="animate-rise font-display text-[44px] leading-[0.95] font-extrabold tracking-tight text-balance sm:text-7xl">
            Show up. <br />
            Level up. <br />
            <span className="bg-gradient-to-r from-brand via-brand-strong to-gold bg-clip-text text-transparent">
              IGNITE.
            </span>
          </h1>
          <p className="mt-6 max-w-md animate-rise text-lg text-muted text-balance [animation-delay:80ms]">
            Your home base for school wins, tutoring, badges and the people cheering you on.
          </p>
          <div className="mt-8 flex animate-rise flex-wrap gap-3 [animation-delay:140ms]">
            <Link href="/login" className={buttonVariants({ size: "lg" })}>
              Sign in <ArrowRight />
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="animate-rise rounded-3xl border border-border bg-surface/70 p-4 backdrop-blur"
              style={{ animationDelay: `${200 + i * 50}ms` }}
            >
              <f.icon className={`mb-3 size-6 ${f.tone}`} />
              <p className="font-display font-semibold tracking-tight">{f.title}</p>
              <p className="mt-1 text-sm text-muted">{f.body}</p>
            </div>
          ))}
        </section>

        <footer className="mt-16 flex items-center gap-3 text-sm text-muted">
          <Image src="/brand/cm2-sm.png" alt="Community Matters 2" width={44} height={44} className="rounded-full bg-white" />
          <span>IGNITE Academy is a program of Community Matters 2, Inc.</span>
        </footer>
      </main>
    </div>
  );
}
