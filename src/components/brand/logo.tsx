import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/brand/ignite-sm.png"
      alt="IGNITE Academy"
      width={size}
      height={size}
      priority
      className={cn("rounded-full", className)}
    />
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-lg font-extrabold tracking-tight", className)}>
      IGNITE<span className="text-brand">.</span>
    </span>
  );
}

/** Ambient brand glow used behind hero areas. */
export function Glow({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-brand/25 blur-[120px]" />
      <div className="absolute top-20 -right-32 h-72 w-72 rounded-full bg-gold/15 blur-[100px]" />
    </div>
  );
}
