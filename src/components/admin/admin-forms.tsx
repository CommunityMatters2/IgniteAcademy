"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, SubmitButton, Textarea, FormShell, useFormAction } from "@/components/ui/form";
import { useSheet } from "@/components/ui/sheet";
import type { ActionState } from "@/lib/utils";

type Action = (s: ActionState, fd: FormData) => Promise<ActionState>;

/** Toasts an admin action's result (with "Copy link" when it contains a URL). */
export function toastResult(state: ActionState) {
  if (!state) return;
  if (state.error) {
    toast.error(state.error, { duration: 8000 });
    return;
  }
  if (state.ok && state.message) {
    const link = state.message.match(/https?:\/\/\S+/)?.[0];
    toast.success(state.message, {
      duration: link ? 20000 : 4000,
      action: link ? { label: "Copy link", onClick: () => navigator.clipboard.writeText(link) } : undefined,
    });
  }
}

/**
 * Wraps an action so the toast fires from the result itself — the form may unmount
 * after revalidation (e.g. a reviewed card leaves the queue) before an effect could run.
 */
function withToast(action: Action): Action {
  return async (s, fd) => {
    const res = await action(s, fd);
    toastResult(res);
    return res;
  };
}

export function ReviewActions({
  action,
  id,
  extra,
}: {
  action: Action;
  id: string;
  extra?: React.ReactNode;
}) {
  const [state, onSubmit, pending] = useFormAction(withToast(action), undefined);
  const [rejecting, setRejecting] = useState(false);
  if (state?.ok) return <p className="text-sm font-semibold text-brand">{state.message}</p>;
  return (
    <FormShell onSubmit={onSubmit} pending={pending} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      {extra}
      {rejecting ? (
        <>
          <Textarea name="note" rows={2} required placeholder="What needs fixing? The student will see this." className="min-h-0" />
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setRejecting(false)}>
              Cancel
            </Button>
            <SubmitButton name="decision" value="rejected" variant="danger" size="sm" className="flex-1" pendingText="Sending…">
              Send back
            </SubmitButton>
          </div>
        </>
      ) : (
        <>
          <Input name="note" placeholder="Optional note to student" className="h-10 text-sm" />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setRejecting(true)}>
              <X /> Needs redo
            </Button>
            <SubmitButton name="decision" value="approved" size="sm" className="flex-1" pendingText="Approving…">
              <Check /> Approve
            </SubmitButton>
          </div>
        </>
      )}
    </FormShell>
  );
}

/** Generic admin form: toast on result, closes surrounding sheet on success. */
export function AdminForm({
  action,
  children,
  className,
  resetOnSuccess,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, onSubmit, pending] = useFormAction(withToast(action), undefined);
  const sheet = useSheet();
  useEffect(() => {
    if (state?.ok) sheet?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <FormShell
      onSubmit={onSubmit}
      pending={pending}
      className={className}
      key={resetOnSuccess && state?.ok ? JSON.stringify(state) : undefined}
    >
      {children}
    </FormShell>
  );
}

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={() => {
        navigator.clipboard.writeText(value);
        toast.success("Copied");
      }}
    >
      <Copy /> {label}
    </Button>
  );
}
