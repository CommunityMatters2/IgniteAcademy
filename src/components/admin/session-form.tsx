"use client";

import { useState } from "react";
import { AdminForm } from "@/components/admin/admin-forms";
import { Field, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { saveSessionAction } from "@/actions/admin";

type Defaults = {
  id?: string;
  title?: string;
  subject?: string;
  tutorName?: string | null;
  provider?: string;
  startsAt?: string; // ISO
  durationMin?: number;
  meetingUrl?: string | null;
  capacity?: number | null;
  description?: string | null;
};

function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SessionForm({ d = {} }: { d?: Defaults }) {
  // Rendered only inside a client-side sheet, so browser time zone APIs are safe here.
  const [offset] = useState(() => String(new Date().getTimezoneOffset()));
  const [start, setStart] = useState(() => toLocalInput(d.startsAt));

  return (
    <AdminForm action={saveSessionAction} className="space-y-4" resetOnSuccess={!d.id}>
      {d.id && <input type="hidden" name="id" value={d.id} />}
      <input type="hidden" name="tzOffset" value={offset} />
      <Field label="Title">
        <Input name="title" required defaultValue={d.title} placeholder="Algebra drop-in" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Subject">
          <Input name="subject" required defaultValue={d.subject ?? "Math"} list="subjects" />
          <datalist id="subjects">
            {["Math", "English", "Science", "History", "Spanish", "Test prep", "College apps"].map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>
        <Field label="Provider">
          <Input name="provider" defaultValue={d.provider ?? "ORBIT"} />
        </Field>
      </div>
      <Field label="Tutor">
        <Input name="tutorName" defaultValue={d.tutorName ?? ""} placeholder="Ms. Rivera" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Starts">
          <Input name="startsAt" type="datetime-local" required value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="Length">
          <Select name="durationMin" defaultValue={String(d.durationMin ?? 60)}>
            {[30, 45, 60, 90, 120].map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Zoom / meeting link">
        <Input name="meetingUrl" type="url" defaultValue={d.meetingUrl ?? ""} placeholder="https://zoom.us/j/…" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Max seats" hint="0 = unlimited">
          <Input name="capacity" type="number" min={0} defaultValue={d.capacity ?? 0} />
        </Field>
        {!d.id && (
          <Field label="Repeat weekly" hint="Creates copies">
            <Select name="repeatWeeks" defaultValue="1">
              {[1, 2, 4, 6, 8, 10, 12].map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? "Once" : `${n} weeks`}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
      <Field label="Description">
        <Textarea name="description" rows={2} defaultValue={d.description ?? ""} placeholder="Bring your homework questions!" />
      </Field>
      <SubmitButton block size="lg">
        {d.id ? "Save changes" : "Create session"}
      </SubmitButton>
    </AdminForm>
  );
}
