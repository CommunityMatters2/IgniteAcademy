import { cn, initials } from "@/lib/utils";

const palette = ["bg-brand text-brand-fg", "bg-gold text-gold-fg", "bg-info text-white", "bg-[#c084fc] text-black", "bg-[#fb923c] text-black"];

export function Avatar({
  name,
  avatarKey,
  size = 40,
  className,
  ring,
}: {
  name: string;
  avatarKey?: string | null;
  size?: number;
  className?: string;
  ring?: "gold" | "brand";
}) {
  const color = palette[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length];
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display font-bold",
        !avatarKey && color,
        ring === "gold" && "ring-2 ring-gold ring-offset-2 ring-offset-bg",
        ring === "brand" && "ring-2 ring-brand ring-offset-2 ring-offset-bg",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {avatarKey ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/files/${avatarKey}`} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
