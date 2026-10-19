"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { AdminForm } from "@/components/admin/admin-forms";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, SubmitButton, Switch, Textarea } from "@/components/ui/form";
import { saveFormAction } from "@/actions/admin";
import type { FormField, FormFieldType } from "@/db/schema";

const TYPES: { value: FormFieldType; label: string }[] = [
  { value: "text", label: "Short answer" },
  { value: "textarea", label: "Paragraph" },
  { value: "choice", label: "Multiple choice" },
  { value: "checkbox", label: "Checkbox (agree)" },
  { value: "date", label: "Date" },
];

const newField = (): FormField => ({ id: crypto.randomUUID().slice(0, 8), type: "text", label: "", required: true });

const TEMPLATES: Record<string, { title: string; description: string; fields: FormField[]; sig: boolean }> = {
  permission: {
    title: "Field trip permission slip",
    description: "Parent/guardian permission for an IGNITE field trip.",
    sig: true,
    fields: [
      { id: "g1", type: "text", label: "Parent/guardian full name", required: true },
      { id: "g2", type: "text", label: "Emergency contact phone", required: true },
      { id: "g3", type: "textarea", label: "Allergies or medical notes", required: false },
      { id: "g4", type: "checkbox", label: "I give permission for my child to attend this trip.", required: true },
    ],
  },
  media: {
    title: "Photo & media release",
    description: "Permission for CM2 to share photos of IGNITE events.",
    sig: true,
    fields: [
      { id: "m1", type: "choice", label: "Can CM2 use photos that include you?", required: true, options: ["Yes", "Yes, but no name", "No"] },
      { id: "m2", type: "text", label: "Parent/guardian name", required: true },
    ],
  },
  survey: {
    title: "Program feedback survey",
    description: "Tell us how IGNITE is going!",
    sig: false,
    fields: [
      { id: "s1", type: "choice", label: "How would you rate IGNITE so far?", required: true, options: ["🔥 Love it", "👍 Good", "😐 Okay", "👎 Not great"] },
      { id: "s2", type: "textarea", label: "What's your favorite part?", required: false },
      { id: "s3", type: "textarea", label: "What should we change?", required: false },
    ],
  },
};

export function FormBuilder({
  initial,
  cohorts,
}: {
  initial?: {
    id: string;
    title: string;
    description: string | null;
    fields: FormField[];
    requireSignature: boolean;
    audience: string;
    dueDate: string | null;
    status: string;
  };
  cohorts: { id: string; name: string }[];
}) {
  const [fields, setFields] = useState<FormField[]>(initial?.fields ?? [newField()]);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [sig, setSig] = useState(initial?.requireSignature ?? false);
  const [templateKey, setTemplateKey] = useState(0);

  const update = (i: number, patch: Partial<FormField>) =>
    setFields((fs) => fs.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const move = (i: number, d: -1 | 1) =>
    setFields((fs) => {
      const next = [...fs];
      const [x] = next.splice(i, 1);
      next.splice(i + d, 0, x);
      return next;
    });

  return (
    <AdminForm action={saveFormAction} className="space-y-6">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="fields" value={JSON.stringify(fields)} />

      {!initial && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted">Start from a template:</span>
          {Object.entries(TEMPLATES).map(([k, t]) => (
            <Button
              key={k}
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setTitle(t.title);
                setDescription(t.description);
                setFields(t.fields.map((f) => ({ ...f, id: crypto.randomUUID().slice(0, 8) })));
                setSig(t.sig);
                setTemplateKey((n) => n + 1);
              }}
            >
              {t.title.split(" ").slice(0, 2).join(" ")}
            </Button>
          ))}
        </div>
      )}

      <div className="space-y-4">
        <Field label="Title">
          <Input name="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Description / instructions">
          <Textarea name="description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </div>

      <div className="space-y-3">
        <p className="font-display text-lg font-semibold">Questions</p>
        {fields.map((f, i) => (
          <div key={f.id} className="space-y-3 rounded-2xl border border-border bg-surface-2 p-4">
            <div className="flex gap-2">
              <Input
                value={f.label}
                onChange={(e) => update(i, { label: e.target.value })}
                placeholder={`Question ${i + 1}`}
                className="h-11 flex-1 bg-surface"
              />
              <Select
                value={f.type}
                onChange={(e) => update(i, { type: e.target.value as FormFieldType })}
                className="h-11 w-40 bg-surface text-sm"
                aria-label="Question type"
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
            {f.type === "choice" && (
              <Input
                defaultValue={f.options?.join(", ") ?? ""}
                onChange={(e) =>
                  update(i, { options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) })
                }
                placeholder="Options, separated by commas"
                className="h-10 bg-surface text-sm"
              />
            )}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={f.required}
                  onChange={(e) => update(i, { required: e.target.checked })}
                  className="size-4 accent-[var(--brand)]"
                />
                Required
              </label>
              <div className="flex gap-1">
                <Button type="button" size="icon-sm" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  disabled={i === fields.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label="Move down"
                >
                  <ArrowDown />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="danger-ghost"
                  onClick={() => setFields((fs) => fs.filter((_, j) => j !== i))}
                  aria-label="Remove question"
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setFields((fs) => [...fs, newField()])}>
          <Plus /> Add question
        </Button>
      </div>

      <div key={templateKey} className="space-y-4 rounded-3xl border border-border p-4">
        <p className="font-display text-lg font-semibold">Settings</p>
        <label className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface-2 px-4 py-3">
          <span className="text-sm font-medium">Require a signature</span>
          <input type="checkbox" name="requireSignature" checked={sig} onChange={(e) => setSig(e.target.checked)} className="size-5 accent-[var(--brand)]" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Who fills it out">
            <Select name="audience" defaultValue={initial?.audience ?? "all"}>
              <option value="all">All students</option>
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Due date">
            <Input name="dueDate" type="date" defaultValue={initial?.dueDate ?? ""} />
          </Field>
        </div>
        <Field label="Status">
          <Select name="status" defaultValue={initial?.status ?? "draft"}>
            <option value="draft">Draft (hidden)</option>
            <option value="published">Published (students can fill)</option>
            <option value="closed">Closed</option>
          </Select>
        </Field>
        <Switch name="notify" label="Notify students when published" description="In-app notification + email." />
      </div>
      <SubmitButton block size="lg">
        Save form
      </SubmitButton>
    </AdminForm>
  );
}
