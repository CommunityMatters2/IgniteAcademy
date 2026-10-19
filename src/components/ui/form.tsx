"use client";

import { createContext, useActionState, useContext, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn, type ActionState } from "@/lib/utils";

const fieldBase =
  "w-full rounded-2xl border border-border bg-surface-2 px-4 text-[16px] text-fg placeholder:text-muted/70 transition-colors outline-none focus:border-brand focus:bg-surface focus:ring-4 focus:ring-brand-soft disabled:opacity-60";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(fieldBase, "h-12", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(fieldBase, "min-h-28 py-3 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        fieldBase,
        "h-12 appearance-none bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%239a9aa3' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-[right_1rem_center] bg-no-repeat pr-10",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  className,
  htmlFor,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-fg">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Switch({
  name,
  defaultChecked,
  label,
  description,
}: {
  name: string;
  defaultChecked?: boolean;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border bg-surface-2 px-4 py-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="relative h-7 w-12 shrink-0 rounded-full bg-surface-3 transition-colors after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-brand peer-checked:after:translate-x-5 peer-focus-visible:ring-4 peer-focus-visible:ring-brand-soft" />
    </label>
  );
}

const PendingContext = createContext<boolean | null>(null);
export const PendingProvider = PendingContext;

/**
 * Like useActionState, but submits via onSubmit so React does NOT auto-reset the form.
 * (React 19 clears uncontrolled fields after every `action` submit — even on errors —
 * which would wipe what a student typed when an upload fails.)
 */
export function useFormAction(
  action: (state: ActionState, fd: FormData) => Promise<ActionState>,
  initial: ActionState,
) {
  const [state, dispatch, actionPending] = useActionState(action, initial);
  const [transitionPending, start] = useTransition();
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const fd = new FormData(e.currentTarget, submitter);
    start(() => dispatch(fd));
  };
  return [state, onSubmit, actionPending || transitionPending] as const;
}

export function SubmitButton({
  children,
  pendingText,
  ...props
}: ButtonProps & { pendingText?: string }) {
  const ctx = useContext(PendingContext);
  const status = useFormStatus();
  const pending = ctx ?? status.pending;
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" />
          {pendingText ?? "Saving…"}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
      {message}
    </p>
  );
}

/** <form> wired to useFormAction: no auto-reset, and SubmitButtons inside see the pending state. */
export function FormShell({ pending, ...props }: React.ComponentProps<"form"> & { pending: boolean }) {
  return (
    <PendingContext value={pending}>
      <form {...props} />
    </PendingContext>
  );
}
