"use client";

import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { FilePicker } from "@/components/ui/file-picker";
import { Field, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { submitCheckinAction, submitReportCardAction } from "@/actions/student";
import { cn } from "@/lib/utils";

export function ReportCardForm({
  terms,
  currentTermId,
}: {
  terms: { id: string; name: string }[];
  currentTermId?: string | null;
}) {
  const [rows, setRows] = useState([0]);
  const [nextId, setNextId] = useState(1);
  const [passing, setPassing] = useState<string>("");

  return (
    <ActionForm action={submitReportCardAction} className="space-y-5" confetti>
      <FilePicker name="file" required label="Add your report card" />
      {terms.length > 0 && (
        <Field label="Grading period">
          <Select name="termId" defaultValue={currentTermId ?? terms[0]?.id}>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Are you passing all your classes?</legend>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["yes", "Yes 💪"],
            ["no", "Not yet"],
            ["unsure", "Not sure"],
          ].map(([v, l]) => (
            <label
              key={v}
              className={cn(
                "flex h-12 cursor-pointer items-center justify-center rounded-2xl border text-sm font-semibold transition-colors",
                passing === v ? "border-brand bg-brand-soft text-fg" : "border-border bg-surface-2 text-muted",
              )}
            >
              <input type="radio" name="allPassing" value={v} required className="sr-only" onChange={() => setPassing(v)} />
              {l}
            </label>
          ))}
        </div>
        {passing === "no" && (
          <p className="mt-2 text-xs text-muted">
            That&apos;s okay — honesty matters. Staff will connect you with tutoring. Going from failing to passing earns a badge! ⭐
          </p>
        )}
      </fieldset>

      <Field label="GPA" hint="Optional">
        <Input name="gpa" inputMode="decimal" placeholder="e.g. 3.2" maxLength={6} />
      </Field>

      <div>
        <p className="mb-2 text-sm font-medium">
          Grades by class <span className="font-normal text-muted">(optional)</span>
        </p>
        <div className="space-y-2">
          {rows.map((id, i) => (
            <div key={id} className="flex items-center gap-2">
              <Input name="subject" placeholder="Class" className="h-11 flex-[2]" />
              <Input name="mark" placeholder="Grade" className="h-11 flex-1" />
              <label className="flex h-11 items-center gap-1.5 rounded-2xl border border-border bg-surface-2 px-3 text-xs text-muted">
                <input type="checkbox" name="failing" value={String(i)} className="accent-[var(--danger)]" />
                Failing
              </label>
              <button
                type="button"
                aria-label="Remove class"
                onClick={() => setRows((r) => r.filter((x) => x !== id))}
                className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-muted hover:bg-surface-2"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setRows((r) => [...r, nextId]);
            setNextId((n) => n + 1);
          }}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand"
        >
          <Plus className="size-4" /> Add class
        </button>
      </div>

      <Field label="Anything staff should know?">
        <Textarea name="note" rows={2} placeholder="Optional" maxLength={500} />
      </Field>
      <SubmitButton block size="lg" pendingText="Uploading…">
        Submit report card
      </SubmitButton>
    </ActionForm>
  );
}

function Stepper({ name, label, max, defaultValue }: { name: string; label: string; max: number; defaultValue: number }) {
  const [v, setV] = useState(defaultValue);
  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-3">
      <p className="text-xs font-medium text-muted">{label}</p>
      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setV((x) => Math.max(0, x - 1))}
          className="flex size-10 items-center justify-center rounded-full bg-surface-3"
          aria-label={`Decrease ${label}`}
        >
          <Minus className="size-4" />
        </button>
        <span className="font-display text-2xl font-bold tabular-nums">{v}</span>
        <button
          type="button"
          onClick={() => setV((x) => Math.min(max, x + 1))}
          className="flex size-10 items-center justify-center rounded-full bg-surface-3"
          aria-label={`Increase ${label}`}
        >
          <Plus className="size-4" />
        </button>
      </div>
      <input type="hidden" name={name} value={v} />
    </div>
  );
}

export function CheckinForm({ weeks }: { weeks: { value: string; label: string; disabled?: boolean }[] }) {
  return (
    <ActionForm action={submitCheckinAction} className="space-y-5" confetti>
      <Field label="Which week?">
        <Select name="weekOf" defaultValue={weeks.find((w) => !w.disabled)?.value}>
          {weeks.map((w) => (
            <option key={w.value} value={w.value} disabled={w.disabled}>
              {w.label}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Stepper name="daysPresent" label="Days at school" max={7} defaultValue={5} />
        <Stepper name="daysLate" label="Days late" max={7} defaultValue={0} />
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Proof</p>
        <FilePicker
          name="proof"
          required
          compact
          label="Add a screenshot"
          hint="Your school portal attendance page, a tardy slip, or a signed note"
        />
      </div>
      <Field label="Note" hint="Optional — e.g. a doctor's appointment">
        <Textarea name="note" rows={2} maxLength={500} />
      </Field>
      <SubmitButton block size="lg" pendingText="Submitting…">
        Submit check-in
      </SubmitButton>
    </ActionForm>
  );
}
