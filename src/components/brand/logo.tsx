import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Brand artwork lives in /public/brand, cut from the official
 * "IGNITE LOGO WITH FONT" and "IGNITE ACADEMY FONT" files.
 * Each comes in a "-light" (black ink) and "-dark" (white ink) version.
 *
 * on="auto"  → follows the app theme
 * on="dark"  → always the white-ink version (for dark panels like the sidebar)
 * on="light" → always the black-ink version
 */
type On = "auto" | "dark" | "light";

function Themed({
  name,
  w,
  h,
  height,
  on = "auto",
  alt,
  className,
}: {
  name: string;
  w: number;
  h: number;
  height: number;
  on?: On;
  alt: string;
  className?: string;
}) {
  const width = Math.round((w / h) * height);
  const img = (variant: "light" | "dark", cls?: string) => (
    <Image
      src={`/brand/${name}-${variant}.png`}
      alt={alt}
      width={width}
      height={height}
      loading="eager"
      className={cn("shrink-0 select-none", cls, className)}
      style={{ width, height }}
      draggable={false}
    />
  );
  if (on === "dark") return img("dark");
  if (on === "light") return img("light");
  return (
    <>
      {img("light", "dark:hidden")}
      {img("dark", "hidden dark:block")}
    </>
  );
}

/** The "IA" mark with the gold ring. `size` is the height in px. */
export function Logo({ size = 40, on, className }: { size?: number; on?: On; className?: string }) {
  return <Themed name="mark" w={622} h={709} height={size} on={on} alt="IGNITE ACADEMY" className={className} />;
}

/** The IGNITE ACADEMY lettering. "line" is one row, "stacked" is two. */
export function Wordmark({
  variant = "line",
  height,
  on,
  className,
}: {
  variant?: "line" | "stacked";
  height?: number;
  on?: On;
  className?: string;
}) {
  return variant === "stacked" ? (
    <Themed name="wordmark" w={1658} h={658} height={height ?? 36} on={on} alt="IGNITE ACADEMY" className={className} />
  ) : (
    <Themed name="wordmark-line" w={1903} h={157} height={height ?? 14} on={on} alt="IGNITE ACADEMY" className={className} />
  );
}

/** Full lockup: mark above the IGNITE ACADEMY lettering. `size` is the height in px. */
export function LogoFull({ size = 120, on, className }: { size?: number; on?: On; className?: string }) {
  return <Themed name="logo-full" w={1903} h={941} height={size} on={on} alt="IGNITE ACADEMY" className={className} />;
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
