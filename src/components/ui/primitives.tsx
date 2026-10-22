import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-3xl border border-border bg-surface p-5 shadow-card", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 className={cn("font-display text-lg font-semibold tracking-tight", className)} {...props} />;
}

export function Eyebrow({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-[11px] font-semibold uppercase tracking-[0.14em] text-muted", className)}
      {...props}
    />
  );
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  action,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-6 flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && <Eyebrow className="mb-1.5">{eyebrow}</Eyebrow>}
        <h1 className="font-display text-[28px] leading-[1.1] font-bold tracking-tight text-balance sm:text-4xl">
          {title}
        </h1>
        {subtitle && <p className="mt-2 text-[15px] text-muted text-balance">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function SectionTitle({
  children,
  action,
  className,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 mt-8 flex items-center justify-between", className)}>
      <h2 className="font-display text-lg font-semibold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

type Tone = "green" | "gold" | "red" | "blue" | "neutral";
const toneClass: Record<Tone, string> = {
  green: "bg-brand-soft text-brand",
  gold: "bg-gold-soft text-gold",
  red: "bg-danger-soft text-danger",
  blue: "bg-info-soft text-info",
  neutral: "bg-surface-2 text-muted",
};

export function Pill({
  tone = "neutral",
  className,
  ...props
}: React.ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        toneClass[tone],
        className,
      )}
      {...props}
    />
  );
}

export const reviewTone = (status: string): Tone =>
  status === "approved" || status === "done" || status === "completed"
    ? "green"
    : status === "rejected" || status === "declined"
      ? "red"
      : status === "planned"
        ? "blue"
        : "gold";

export const reviewLabel = (status: string) =>
  ({ pending: "In review", approved: "Approved", rejected: "Needs redo" })[status] ?? status;

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-3xl border border-dashed border-border px-6 py-10 text-center",
        className,
      )}
    >
      {icon && <div className="mb-3 text-3xl">{icon}</div>}
      <p className="font-display font-semibold">{title}</p>
      {body && <p className="mt-1 max-w-xs text-sm text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-2xl", className)} />;
}

const statTone = {
  neutral: { bar: "bg-fg", wash: "", text: "", chip: "bg-surface-2 text-fg" },
  green: { bar: "bg-brand", wash: "bg-gradient-to-br from-brand-soft to-surface", text: "text-brand", chip: "bg-brand text-brand-fg" },
  gold: { bar: "bg-gold", wash: "bg-gradient-to-br from-gold-soft to-surface", text: "text-gold", chip: "bg-gold text-gold-fg" },
  red: { bar: "bg-danger", wash: "bg-gradient-to-br from-danger-soft to-surface", text: "text-danger", chip: "bg-danger text-white" },
  blue: { bar: "bg-info", wash: "bg-gradient-to-br from-info-soft to-surface", text: "text-info", chip: "bg-info text-white" },
};

export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: keyof typeof statTone;
  icon?: React.ReactNode;
  className?: string;
}) {
  const t = statTone[tone];
  return (
    <Card className={cn("relative overflow-hidden p-4 sm:p-5", t.wash, className)}>
      <span aria-hidden className={cn("absolute inset-x-0 top-0 h-1", t.bar)} />
      <div className="flex items-start justify-between gap-2">
        <Eyebrow className="text-fg/70">{label}</Eyebrow>
        {icon && (
          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-xl [&_svg]:size-4", t.chip)}>{icon}</span>
        )}
      </div>
      <p className={cn("mt-2 font-display text-4xl font-extrabold tracking-tight tabular-nums", t.text)}>{value}</p>
      {hint && <p className="mt-1 text-xs font-medium text-muted">{hint}</p>}
    </Card>
  );
}
