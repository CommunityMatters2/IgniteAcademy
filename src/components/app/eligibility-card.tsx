import Link from "next/link";
import { Check, ChevronRight, Clock, X, CircleDashed } from "lucide-react";
import type { Eligibility } from "@/lib/eligibility";
import { cn } from "@/lib/utils";

const statusCopy = {
  eligible: { title: "You're eligible", body: "You're meeting every IGNITE requirement. Keep it up!", color: "var(--brand)" },
  needs_action: { title: "Needs action", body: "A few things to finish to stay in good standing.", color: "var(--gold)" },
  on_hold: { title: "On hold", body: "Let's talk — staff will help you get back on track.", color: "var(--danger)" },
};

const stateIcon = {
  done: <Check className="size-4" strokeWidth={3} />,
  pending: <Clock className="size-4" />,
  missing: <CircleDashed className="size-4" />,
  failed: <X className="size-4" strokeWidth={3} />,
};

const stateClass = {
  done: "bg-brand text-brand-fg",
  pending: "bg-gold text-gold-fg",
  missing: "bg-surface-3 text-muted",
  failed: "bg-danger text-white",
};

export function ProgressRing({ value, color, size = 84 }: { value: number; color: string; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-3)" strokeWidth="8" fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value)}
        style={{ transition: "stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)" }}
      />
    </svg>
  );
}

export function EligibilityCard({ eligibility }: { eligibility: Eligibility }) {
  const meta = statusCopy[eligibility.status];
  const done = eligibility.checks.filter((c) => c.state === "done").length;
  const total = eligibility.checks.length || 1;
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl border bg-surface p-5",
        eligibility.status === "eligible" ? "border-brand/40 glow-brand" : "border-border",
      )}
    >
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <ProgressRing value={done / total} color={meta.color} />
          <span className="absolute inset-0 flex items-center justify-center font-display text-lg font-bold">
            {done}/{total}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">IGNITE status</p>
          <p className="font-display text-2xl font-bold tracking-tight" style={{ color: meta.color }}>
            {meta.title}
          </p>
          <p className="text-sm text-muted">{eligibility.overridden ? "Set by program staff." : meta.body}</p>
        </div>
      </div>
      <ul className="mt-5 space-y-1">
        {eligibility.checks.map((c) => (
          <li key={c.key}>
            <Link
              href={c.href}
              className="flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-surface-2"
            >
              <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", stateClass[c.state])}>
                {stateIcon[c.state]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">{c.label}</span>
                <span className="block truncate text-xs text-muted">{c.hint}</span>
              </span>
              <ChevronRight className="size-4 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
