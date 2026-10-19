"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { Field, FormError, Input, SubmitButton, FormShell, useFormAction } from "@/components/ui/form";
import {
  acceptInviteAction,
  requestResetAction,
  resetPasswordAction,
  signInAction,
} from "@/app/(auth)/actions";

function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className="pr-12" />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted hover:text-fg"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </div>
  );
}

export function LoginForm({ next, reset }: { next?: string; reset?: boolean }) {
  const [state, onSubmit, pending] = useFormAction(signInAction, undefined);
  return (
    <FormShell onSubmit={onSubmit} pending={pending} className="space-y-4">
      {reset && (
        <p className="rounded-2xl bg-brand-soft px-4 py-3 text-sm font-medium text-brand">
          Password updated. Sign in with your new password.
        </p>
      )}
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="you@email.com"
        />
      </Field>
      <Field label="Password" htmlFor="password">
        <PasswordInput id="password" name="password" autoComplete="current-password" required placeholder="••••••••" />
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot" className="text-sm font-medium text-brand hover:underline">
          Forgot password?
        </Link>
      </div>
      <FormError message={state?.error} />
      <SubmitButton block size="lg" pendingText="Signing in…">
        Sign in
      </SubmitButton>
    </FormShell>
  );
}

export function ForgotForm() {
  const [state, onSubmit, pending] = useFormAction(requestResetAction, undefined);
  if (state?.ok)
    return (
      <div className="rounded-3xl border border-border bg-surface p-6 text-center">
        <MailCheck className="mx-auto mb-3 size-10 text-brand" />
        <p className="font-display text-lg font-semibold">Check your inbox</p>
        <p className="mt-1 text-sm text-muted">{state.message}</p>
        <Link href="/login" className="mt-5 inline-block text-sm font-semibold text-brand">
          Back to sign in
        </Link>
      </div>
    );
  return (
    <FormShell onSubmit={onSubmit} pending={pending} className="space-y-4">
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@email.com" />
      </Field>
      <FormError message={state?.error} />
      <SubmitButton block size="lg" pendingText="Sending…">
        Send reset link
      </SubmitButton>
      <p className="text-center text-sm text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-brand">
          Sign in
        </Link>
      </p>
    </FormShell>
  );
}

function NewPasswordFields() {
  return (
    <>
      <Field label="New password" htmlFor="password" hint="At least 8 characters.">
        <PasswordInput id="password" name="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Field label="Confirm password" htmlFor="confirm">
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required minLength={8} />
      </Field>
    </>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, onSubmit, pending] = useFormAction(resetPasswordAction, undefined);
  return (
    <FormShell onSubmit={onSubmit} pending={pending} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <NewPasswordFields />
      <FormError message={state?.error} />
      <SubmitButton block size="lg">
        Update password
      </SubmitButton>
    </FormShell>
  );
}

export function InviteForm({ token, email }: { token: string; email: string }) {
  const [state, onSubmit, pending] = useFormAction(acceptInviteAction, undefined);
  return (
    <FormShell onSubmit={onSubmit} pending={pending} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Field label="Email">
        <Input value={email} readOnly disabled autoComplete="username" />
      </Field>
      <NewPasswordFields />
      <FormError message={state?.error} />
      <SubmitButton block size="lg" pendingText="Activating…">
        Activate my account
      </SubmitButton>
    </FormShell>
  );
}
