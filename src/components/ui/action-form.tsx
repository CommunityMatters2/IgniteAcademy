"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useSheet } from "@/components/ui/sheet";
import { FormError, FormShell, useFormAction } from "@/components/ui/form";
import type { ActionState } from "@/lib/utils";
import { celebrate } from "@/components/ui/confetti";

type Props = Omit<React.ComponentProps<"form">, "action"> & {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  resetOnSuccess?: boolean;
  confetti?: boolean;
};

/**
 * Wraps a server action with pending state, inline errors, a success toast,
 * and auto-close when rendered inside a <Sheet>.
 */
export function ActionForm({ action, children, resetOnSuccess = true, confetti, ...props }: Props) {
  const [state, onSubmit, pending] = useFormAction(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  const sheet = useSheet();

  useEffect(() => {
    if (!state?.ok) return;
    if (state.message) toast.success(state.message);
    if (confetti) celebrate();
    if (resetOnSuccess) ref.current?.reset();
    sheet?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <FormShell ref={ref} onSubmit={onSubmit} pending={pending} {...props}>
      {children}
      {state?.error && (
        <div className="mt-3">
          <FormError message={state.error} />
        </div>
      )}
    </FormShell>
  );
}
