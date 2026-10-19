"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Camera } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Select, SubmitButton, Switch, FormShell, useFormAction } from "@/components/ui/form";
import { Avatar } from "@/components/ui/avatar";
import { compressImage } from "@/components/ui/file-picker";
import { completeOnboardingAction, updateProfileAction } from "@/actions/student";
import { cn } from "@/lib/utils";

export type ProfileDefaults = {
  name: string;
  preferredName?: string | null;
  birthday?: string | null;
  phone?: string | null;
  school?: string | null;
  gradeLevel?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  guardianEmail?: string | null;
  counselorName?: string | null;
  counselorEmail?: string | null;
  counselorPhone?: string | null;
  tshirtSize?: string | null;
  avatarKey?: string | null;
  showOnLeaderboard?: boolean;
};

const GRADES = ["6th", "7th", "8th", "9th", "10th", "11th", "12th", "College", "Not in school"];
const SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];

const STEPS = [
  { title: "About you", body: "The basics so we can celebrate you properly." },
  { title: "Your school", body: "IGNITE is all about school wins." },
  { title: "Your people", body: "Who's in your corner? Staff only contact them when needed." },
];

function AvatarPicker({ name, avatarKey }: { name: string; avatarKey?: string | null }) {
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <label className="flex cursor-pointer items-center gap-4">
      <span className="relative">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="size-20 rounded-full object-cover" />
        ) : (
          <Avatar name={name} avatarKey={avatarKey} size={80} />
        )}
        <span className="absolute -right-1 -bottom-1 flex size-8 items-center justify-center rounded-full border-4 border-surface bg-brand text-brand-fg">
          <Camera className="size-3.5" />
        </span>
      </span>
      <span>
        <span className="block font-semibold">Profile photo</span>
        <span className="block text-sm text-muted">Optional · tap to {avatarKey ? "change" : "add"}</span>
      </span>
      <input
        type="file"
        name="avatar"
        accept="image/*"
        className="sr-only"
        onChange={async (e) => {
          const input = e.target;
          const original = input.files?.[0];
          if (!original) return setPreview(null);
          const f = await compressImage(original);
          if (f !== original) {
            const dt = new DataTransfer();
            dt.items.add(f);
            input.files = dt.files;
          }
          setPreview(URL.createObjectURL(f));
        }}
      />
    </label>
  );
}

function AboutFields({ d }: { d: ProfileDefaults }) {
  return (
    <div className="space-y-4">
      <AvatarPicker name={d.name} avatarKey={d.avatarKey} />
      <Field label="Preferred name" hint={`What should we call you? (Legal name: ${d.name})`}>
        <Input name="preferredName" defaultValue={d.preferredName ?? ""} placeholder={d.name.split(" ")[0]} maxLength={40} />
      </Field>
      <Field label="Birthday 🎂" hint="Birthdays are a big deal at IGNITE.">
        <Input name="birthday" type="date" required defaultValue={d.birthday ?? ""} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone">
          <Input name="phone" type="tel" inputMode="tel" defaultValue={d.phone ?? ""} placeholder="Optional" />
        </Field>
        <Field label="T-shirt size">
          <Select name="tshirtSize" defaultValue={d.tshirtSize ?? ""}>
            <option value="">—</option>
            {SIZES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
      </div>
    </div>
  );
}

function SchoolFields({ d }: { d: ProfileDefaults }) {
  return (
    <div className="space-y-4">
      <Field label="School">
        <Input name="school" required defaultValue={d.school ?? ""} placeholder="e.g. Central High School" />
      </Field>
      <Field label="Grade">
        <Select name="gradeLevel" required defaultValue={d.gradeLevel ?? ""}>
          <option value="" disabled>
            Pick your grade
          </option>
          {GRADES.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </Select>
      </Field>
      <div className="rounded-2xl border border-border bg-surface-2 p-4">
        <p className="mb-3 text-sm font-semibold">Guidance counselor</p>
        <p className="mb-4 text-xs text-muted">
          Staff may ask your counselor to confirm you&apos;re enrolled, attending and passing. It&apos;s part of staying in IGNITE.
        </p>
        <div className="space-y-3">
          <Input name="counselorName" defaultValue={d.counselorName ?? ""} placeholder="Counselor name" />
          <Input name="counselorEmail" type="email" defaultValue={d.counselorEmail ?? ""} placeholder="Counselor email" />
          <Input name="counselorPhone" type="tel" defaultValue={d.counselorPhone ?? ""} placeholder="Counselor phone (optional)" />
        </div>
      </div>
    </div>
  );
}

function PeopleFields({ d }: { d: ProfileDefaults }) {
  return (
    <div className="space-y-4">
      <Field label="Parent / guardian name">
        <Input name="guardianName" defaultValue={d.guardianName ?? ""} />
      </Field>
      <Field label="Guardian phone">
        <Input name="guardianPhone" type="tel" defaultValue={d.guardianPhone ?? ""} />
      </Field>
      <Field label="Guardian email">
        <Input name="guardianEmail" type="email" defaultValue={d.guardianEmail ?? ""} />
      </Field>
    </div>
  );
}

/** 3-step onboarding wizard. All steps stay mounted so every field submits together. */
export function OnboardingForm({ defaults }: { defaults: ProfileDefaults }) {
  const [state, onSubmit, pending] = useFormAction(completeOnboardingAction, undefined);
  const [step, setStep] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  function next() {
    const section = formRef.current?.querySelector<HTMLElement>(`[data-step="${step}"]`);
    const invalid = section?.querySelector<HTMLInputElement>(":invalid");
    if (invalid) {
      invalid.reportValidity();
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  return (
    <FormShell ref={formRef} onSubmit={onSubmit} pending={pending}>
      <div className="mb-6 flex gap-1.5">
        {STEPS.map((_, i) => (
          <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
            <motion.span
              className="block h-full bg-brand"
              initial={false}
              animate={{ width: i <= step ? "100%" : "0%" }}
              transition={{ duration: 0.35 }}
            />
          </span>
        ))}
      </div>
      <p className="text-xs font-semibold tracking-widest text-muted uppercase">
        Step {step + 1} of {STEPS.length}
      </p>
      <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">{STEPS[step].title}</h1>
      <p className="mt-1 mb-6 text-muted">{STEPS[step].body}</p>

      {[AboutFields, SchoolFields, PeopleFields].map((Step, i) => (
        <div key={i} data-step={i} className={cn(i !== step && "hidden")}>
          <Step d={defaults} />
        </div>
      ))}

      <div className="mt-6">
        <FormError message={state?.error} />
      </div>
      <div className="mt-6 flex gap-3">
        {step > 0 && (
          <Button type="button" variant="secondary" size="lg" onClick={() => setStep((s) => s - 1)} aria-label="Back">
            <ArrowLeft />
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button type="button" size="lg" className="flex-1" onClick={next}>
            Continue <ArrowRight />
          </Button>
        ) : (
          <SubmitButton size="lg" className="flex-1" pendingText="Setting up…">
            Let&apos;s go 🔥
          </SubmitButton>
        )}
      </div>
    </FormShell>
  );
}

export function ProfileForm({ defaults }: { defaults: ProfileDefaults }) {
  const [state, onSubmit, pending] = useFormAction(updateProfileAction, undefined);
  useEffect(() => {
    if (state?.ok && state.message) toast.success(state.message);
  }, [state]);
  return (
    <FormShell onSubmit={onSubmit} pending={pending} className="space-y-8">
      <section>
        <h2 className="mb-4 font-display text-lg font-semibold">About you</h2>
        <AboutFields d={defaults} />
      </section>
      <section>
        <h2 className="mb-4 font-display text-lg font-semibold">School</h2>
        <SchoolFields d={defaults} />
      </section>
      <section>
        <h2 className="mb-4 font-display text-lg font-semibold">Guardian</h2>
        <PeopleFields d={defaults} />
      </section>
      <section>
        <h2 className="mb-4 font-display text-lg font-semibold">Privacy</h2>
        <Switch
          name="showOnLeaderboard"
          defaultChecked={defaults.showOnLeaderboard ?? true}
          label="Show me on the leaderboard"
          description="Shown as first name + last initial. Off = you appear as “IGNITE Scholar”."
        />
      </section>
      <FormError message={state?.error} />
      <SubmitButton block size="lg">
        Save profile
      </SubmitButton>
    </FormShell>
  );
}
