"use client";

import { useState } from "react";
import { Field, FormError, Input, SubmitButton, Textarea, FormShell, useFormAction } from "@/components/ui/form";
import { submitVerificationAction } from "@/actions/public";
import { cn } from "@/lib/utils";

function YesNo({ name, label }: { name: string; label: string }) {
  const [v, setV] = useState("");
  return (
    <fieldset>
      <legend className="mb-2 text-[15px] font-medium">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        {["yes", "no"].map((o) => (
          <label
            key={o}
            className={cn(
              "flex h-12 cursor-pointer items-center justify-center rounded-2xl border text-sm font-semibold",
              v === o ? (o === "yes" ? "border-brand bg-brand-soft" : "border-danger bg-danger-soft") : "border-border bg-surface-2 text-muted",
            )}
          >
            <input type="radio" name={name} value={o} required className="sr-only" onChange={() => setV(o)} />
            {o === "yes" ? "Yes" : "No"}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function VerifyForm({ token }: { token: string }) {
  const [state, onSubmit, pending] = useFormAction(submitVerificationAction, undefined);
  if (state?.ok)
    return (
      <div className="mt-8 text-center">
        <p className="text-5xl">✅</p>
        <p className="mt-3 font-display text-2xl font-bold">Thank you!</p>
        <p className="mt-1 text-muted">Your response was sent to IGNITE staff.</p>
      </div>
    );
  return (
    <FormShell onSubmit={onSubmit} pending={pending} className="mt-6 space-y-5">
      <input type="hidden" name="token" value={token} />
      <YesNo name="enrolled" label="Is this student currently enrolled?" />
      <YesNo name="attendanceGood" label="Are they attending regularly and on time?" />
      <YesNo name="passing" label="Are they currently passing their classes?" />
      <Field label="Comments (optional)">
        <Textarea name="comments" rows={3} maxLength={1000} />
      </Field>
      <Field label="Your name">
        <Input name="counselorName" required autoComplete="name" />
      </Field>
      <FormError message={state?.error} />
      <SubmitButton block size="lg" pendingText="Sending…">
        Submit verification
      </SubmitButton>
    </FormShell>
  );
}
