"use client";

import { createContext, useContext, useState } from "react";
import { Drawer } from "vaul";
import { cn } from "@/lib/utils";

const SheetContext = createContext<{ close: () => void } | null>(null);
export const useSheet = () => useContext(SheetContext);

/** Native-feeling bottom sheet (centered dialog-sized on desktop). */
export function Sheet({
  trigger,
  title,
  description,
  children,
  className,
  defaultOpen = false,
}: {
  defaultOpen?: boolean;
  trigger: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Drawer.Root open={open} onOpenChange={setOpen} repositionInputs={false}>
      <Drawer.Trigger asChild>{trigger}</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Drawer.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-[28px] border border-border bg-surface outline-none",
            className,
          )}
        >
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-surface-3" />
          <div className="overflow-y-auto px-5 pt-4 pb-safe">
            <Drawer.Title className="font-display text-xl font-bold tracking-tight">{title}</Drawer.Title>
            {description ? (
              <Drawer.Description className="mt-1 text-sm text-muted">{description}</Drawer.Description>
            ) : (
              <Drawer.Description className="sr-only">{title}</Drawer.Description>
            )}
            <div className="mt-5 pb-4">
              <SheetContext value={{ close: () => setOpen(false) }}>{children}</SheetContext>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
