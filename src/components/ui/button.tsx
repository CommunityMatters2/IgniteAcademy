import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 select-none [&_svg]:size-[1.1em] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-brand text-brand-fg hover:bg-brand-strong shadow-[0_8px_24px_-10px_var(--brand)]",
        gold: "bg-gold text-gold-fg hover:brightness-105 shadow-[0_8px_24px_-10px_var(--gold)]",
        secondary: "bg-surface-2 text-fg hover:bg-surface-3 border border-border",
        ghost: "text-fg hover:bg-surface-2",
        outline: "border border-border text-fg hover:bg-surface-2",
        danger: "bg-danger text-white hover:brightness-110",
        "danger-ghost": "text-danger hover:bg-danger-soft",
      },
      size: {
        sm: "h-9 px-3.5 text-sm",
        md: "h-11 px-5 text-[15px]",
        lg: "h-13 px-6 text-base",
        icon: "size-11",
        "icon-sm": "size-9",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, block, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size, block }), className)} {...props} />;
}
