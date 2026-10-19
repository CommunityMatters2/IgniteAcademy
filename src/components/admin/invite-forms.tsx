"use client";

import { useState } from "react";
import { AdminForm } from "@/components/admin/admin-forms";
import { Field, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { bulkInviteAction, inviteUserAction } from "@/actions/admin";
import { cn } from "@/lib/utils";

export function InviteForms({ cohorts }: { cohorts: { id: string; name: string }[] }) {
  const [mode, setMode] = useState<"one" | "bulk">("one");
  const cohortSelect = cohorts.length > 0 && (
    <Field label="Group (optional)">
      <Select name="cohortId" defaultValue="">
        <option value="">No group</option>
        {cohorts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
    </Field>
  );
  return (
    <div>
      <div className="mb-5 grid grid-cols-2 rounded-full bg-surface-2 p-1">
        {(["one", "bulk"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "rounded-full py-2 text-sm font-semibold transition-colors",
              mode === m ? "bg-surface text-fg shadow" : "text-muted",
            )}
          >
            {m === "one" ? "One person" : "Bulk (CSV)"}
          </button>
        ))}
      </div>
      {mode === "one" ? (
        <AdminForm action={inviteUserAction} className="space-y-4" resetOnSuccess>
          <Field label="Full name">
            <Input name="name" required placeholder="Jordan Smith" />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" required placeholder="jordan@email.com" />
          </Field>
          <Field label="Role">
            <Select name="role" defaultValue="student">
              <option value="student">Student</option>
              <option value="tutor">Tutor (Help Center only)</option>
              <option value="admin">Admin (full access)</option>
            </Select>
          </Field>
          {cohortSelect}
          <SubmitButton block size="lg" pendingText="Inviting…">
            Send invite
          </SubmitButton>
          <p className="text-center text-xs text-muted">They&apos;ll get an email to set their password.</p>
        </AdminForm>
      ) : (
        <AdminForm action={bulkInviteAction} className="space-y-4" resetOnSuccess>
          <Field label="One student per line: Full Name, email" hint="Paste straight from a spreadsheet (comma or tab separated).">
            <Textarea
              name="csv"
              required
              rows={8}
              className="font-mono text-sm"
              placeholder={"Jordan Smith, jordan@email.com\nAvery Lee, avery@email.com"}
            />
          </Field>
          {cohortSelect}
          <SubmitButton block size="lg" pendingText="Inviting…">
            Invite all
          </SubmitButton>
        </AdminForm>
      )}
    </div>
  );
}
