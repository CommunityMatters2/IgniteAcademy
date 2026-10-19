"use client";

import { useEffect, useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { ChevronUp } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, SubmitButton, Switch, Textarea, FormShell, useFormAction } from "@/components/ui/form";
import { FilePicker } from "@/components/ui/file-picker";
import {
  claimBadgeAction,
  helpRequestAction,
  sendWishAction,
  submitIdeaAction,
  toggleSessionSignupAction,
  toggleVoteAction,
} from "@/actions/student";
import { cn } from "@/lib/utils";

export function SignupButton({ sessionId, signedUp, full }: { sessionId: string; signedUp: boolean; full: boolean }) {
  const [state, onSubmit, pending] = useFormAction(toggleSessionSignupAction, undefined);
  useEffect(() => {
    if (state?.error) toast.error(state.error);
    else if (state?.ok && state.message) toast.success(state.message);
  }, [state]);
  return (
    <FormShell onSubmit={onSubmit} pending={pending}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <SubmitButton
        size="sm"
        variant={signedUp ? "secondary" : "primary"}
        disabled={!signedUp && full}
        pendingText={signedUp ? "Leaving…" : "Joining…"}
      >
        {signedUp ? "Cancel" : full ? "Full" : "Sign up"}
      </SubmitButton>
    </FormShell>
  );
}

const SUBJECTS = ["Math", "English", "Science", "History", "Spanish", "Test prep", "College apps", "Other"];

export function HelpRequestForm() {
  return (
    <ActionForm action={helpRequestAction} className="space-y-4">
      <Field label="Subject">
        <Select name="subject" required defaultValue="">
          <option value="" disabled>
            Pick one
          </option>
          {SUBJECTS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
      </Field>
      <Field label="What do you need help with?">
        <Textarea name="message" required minLength={5} maxLength={1000} placeholder="e.g. I have an Algebra 2 test Friday on quadratics" />
      </Field>
      <SubmitButton block size="lg">
        Send request
      </SubmitButton>
    </ActionForm>
  );
}

export function ClaimBadgeForm({
  badges,
  defaultBadgeId,
}: {
  badges: { id: string; name: string; emoji: string }[];
  defaultBadgeId?: string;
}) {
  return (
    <ActionForm action={claimBadgeAction} className="space-y-4">
      <Field label="Which milestone?">
        <Select name="badgeId" required defaultValue={defaultBadgeId ?? ""}>
          <option value="" disabled>
            Pick a badge
          </option>
          {badges.map((b) => (
            <option key={b.id} value={b.id}>
              {b.emoji} {b.name}
            </option>
          ))}
        </Select>
      </Field>
      <div>
        <p className="mb-2 text-sm font-medium">
          Proof <span className="font-normal text-muted">(photo of license, certificate, grade…)</span>
        </p>
        <FilePicker name="proof" compact label="Add proof" />
      </div>
      <Field label="Tell us about it">
        <Textarea name="note" rows={3} maxLength={500} placeholder="I passed my lifeguard certification on Saturday!" />
      </Field>
      <SubmitButton block size="lg" variant="gold">
        Send claim ⭐
      </SubmitButton>
    </ActionForm>
  );
}

const CATEGORIES = ["Program", "Events", "Trips", "Workshops", "Food", "Other"];

export function IdeaForm() {
  return (
    <ActionForm action={submitIdeaAction} className="space-y-4" confetti>
      <Field label="Your idea in a few words">
        <Input name="title" required maxLength={100} placeholder="e.g. Monthly college campus visits" />
      </Field>
      <Field label="Tell us more">
        <Textarea name="body" required minLength={10} maxLength={2000} placeholder="What is it, and why would it make IGNITE better?" />
      </Field>
      <Field label="Category">
        <Select name="category" defaultValue="Program">
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
      </Field>
      <Switch name="anonymous" label="Post anonymously" description="Other students won't see your name. Staff still can." />
      <SubmitButton block size="lg">
        Share idea 💡
      </SubmitButton>
    </ActionForm>
  );
}

export function VoteButton({ ideaId, votes, voted }: { ideaId: string; votes: number; voted: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic({ votes, voted });
  const [, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() =>
        start(async () => {
          setOptimistic((s) => ({ votes: s.votes + (s.voted ? -1 : 1), voted: !s.voted }));
          const fd = new FormData();
          fd.set("ideaId", ideaId);
          await toggleVoteAction(undefined, fd);
        })
      }
      aria-pressed={optimistic.voted}
      aria-label={optimistic.voted ? "Remove vote" : "Vote for this idea"}
      className={cn(
        "flex w-14 shrink-0 flex-col items-center rounded-2xl border py-2 transition-colors",
        optimistic.voted ? "border-brand bg-brand-soft text-brand" : "border-border bg-surface-2 text-muted hover:text-fg",
      )}
    >
      <ChevronUp className="size-5" strokeWidth={2.5} />
      <span className="text-sm font-bold tabular-nums">{optimistic.votes}</span>
    </button>
  );
}

export function WishForm({ toUserId, name }: { toUserId: string; name: string }) {
  return (
    <ActionForm action={sendWishAction} className="space-y-3" confetti>
      <input type="hidden" name="toUserId" value={toUserId} />
      <Textarea name="message" required maxLength={280} rows={3} placeholder={`Happy birthday ${name}! 🎉`} />
      <SubmitButton block variant="gold">
        Send wish 🎂
      </SubmitButton>
    </ActionForm>
  );
}
