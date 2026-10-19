"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eraser } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { submitFormAction } from "@/actions/student";
import type { FormField } from "@/db/schema";

function SignaturePad({ name }: { name: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState("");
  const drawing = useRef(false);

  useEffect(() => {
    const c = canvasRef.current!;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--fg").trim() || "#fff";
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  return (
    <div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="h-36 w-full touch-none rounded-2xl border border-border bg-surface-2"
          onPointerDown={(e) => {
            drawing.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            const ctx = e.currentTarget.getContext("2d")!;
            const p = pos(e);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return;
            const ctx = e.currentTarget.getContext("2d")!;
            const p = pos(e);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }}
          onPointerUp={(e) => {
            drawing.current = false;
            setData(e.currentTarget.toDataURL("image/png"));
          }}
        />
        {!data && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted">
            Sign here with your finger
          </span>
        )}
        <button
          type="button"
          onClick={() => {
            const c = canvasRef.current!;
            c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
            setData("");
          }}
          className="absolute top-2 right-2 rounded-full bg-surface-3 p-2 text-muted"
          aria-label="Clear signature"
        >
          <Eraser className="size-4" />
        </button>
      </div>
      <input type="hidden" name={name} value={data} />
    </div>
  );
}

export function FillForm({
  formId,
  fields,
  requireSignature,
  previous,
}: {
  formId: string;
  fields: FormField[];
  requireSignature: boolean;
  previous?: Record<string, string | boolean>;
}) {
  const router = useRouter();
  return (
    <ActionForm
      action={async (s, fd) => {
        const res = await submitFormAction(s, fd);
        if (res?.ok) setTimeout(() => router.push("/forms"), 600);
        return res;
      }}
      resetOnSuccess={false}
      confetti
      className="space-y-5"
    >
      <input type="hidden" name="formId" value={formId} />
      {fields.map((f) => {
        const name = `f_${f.id}`;
        const prev = previous?.[f.id];
        const label = (
          <>
            {f.label}
            {f.required && <span className="text-danger"> *</span>}
          </>
        );
        if (f.type === "textarea")
          return (
            <Field key={f.id} label={label}>
              <Textarea name={name} required={f.required} defaultValue={typeof prev === "string" ? prev : ""} />
            </Field>
          );
        if (f.type === "choice")
          return (
            <Field key={f.id} label={label}>
              <Select name={name} required={f.required} defaultValue={typeof prev === "string" ? prev : ""}>
                <option value="">Choose…</option>
                {f.options?.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
            </Field>
          );
        if (f.type === "checkbox")
          return (
            <label key={f.id} className="flex items-start gap-3 rounded-2xl border border-border bg-surface-2 p-4 text-sm">
              <input
                type="checkbox"
                name={name}
                required={f.required}
                defaultChecked={prev === true}
                className="mt-0.5 size-5 accent-[var(--brand)]"
              />
              <span>{label}</span>
            </label>
          );
        return (
          <Field key={f.id} label={label}>
            <Input
              name={name}
              type={f.type === "date" ? "date" : "text"}
              required={f.required}
              defaultValue={typeof prev === "string" ? prev : ""}
            />
          </Field>
        );
      })}
      {requireSignature && (
        <div className="space-y-3 rounded-3xl border border-border p-4">
          <p className="font-semibold">Signature</p>
          <Input name="signatureName" required placeholder="Type your full name" autoComplete="name" />
          <SignaturePad name="signatureData" />
          <p className="text-xs text-muted">By signing, you confirm the information above is true.</p>
        </div>
      )}
      <SubmitButton block size="lg" pendingText="Submitting…">
        {previous ? "Update response" : "Submit"}
      </SubmitButton>
    </ActionForm>
  );
}
