"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { AlertTriangle, Loader2, LogIn, LogOut, MapPin } from "lucide-react";
import { clockInAction, clockOutAction } from "@/actions/student";
import { Button } from "@/components/ui/button";
import { celebrate } from "@/components/ui/confetti";
import { cn } from "@/lib/utils";

export type ClockCardProps = {
  /** ISO timestamp of today's open clock-in, or null when clocked out. */
  openSince: string | null;
  /** Clock-in time label, e.g. "3:05 PM". */
  openSinceLabel: string | null;
  /** Completed minutes today (not counting the open visit). */
  todayMinutes: number;
  siteName: string;
  /** False when staff haven't set the program location (or turned clock-in off). */
  available: boolean;
  /** Day label of an earlier visit the student forgot to clock out of. */
  staleDayLabel: string | null;
  serverNow: number;
};

type Phase = "idle" | "locating" | "saving";

function getPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("This browser can't share location. Try Safari or Chrome on your phone."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 });
  });
}

function locationError(err: unknown) {
  const code = (err as GeolocationPositionError)?.code;
  if (code === 1) return "Location is blocked. Allow location for this site in your browser settings, then try again.";
  if (code === 2) return "Your phone couldn't find its location. Step outside or near a window and try again.";
  if (code === 3) return "Finding your location took too long. Try again.";
  return (err as Error)?.message || "We couldn't get your location. Try again.";
}

function elapsed(fromIso: string, now: number) {
  const min = Math.max(0, Math.floor((now - new Date(fromIso).getTime()) / 60_000));
  const h = Math.floor(min / 60);
  return h ? `${h}h ${String(min % 60).padStart(2, "0")}m` : `${min}m`;
}

export function ClockCard(props: ClockCardProps) {
  const { openSince, openSinceLabel, todayMinutes, siteName, available, staleDayLabel, serverNow } = props;
  const [now, setNow] = useState(serverNow);
  const [phase, setPhase] = useState<Phase>("idle");
  const [, start] = useTransition();
  const clockedIn = Boolean(openSince);

  useEffect(() => {
    if (!openSince) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [openSince]);

  async function run() {
    setPhase("locating");
    let pos: GeolocationPosition;
    try {
      pos = await getPosition();
    } catch (err) {
      setPhase("idle");
      toast.error(locationError(err));
      return;
    }
    setPhase("saving");
    const fd = new FormData();
    fd.set("lat", String(pos.coords.latitude));
    fd.set("lng", String(pos.coords.longitude));
    fd.set("accuracy", String(pos.coords.accuracy));
    start(async () => {
      const res = await (clockedIn ? clockOutAction : clockInAction)(undefined, fd);
      setPhase("idle");
      if (res?.error) toast.error(res.error);
      else if (res?.message) {
        toast.success(res.message);
        if (!clockedIn) celebrate();
      }
    });
  }

  const busy = phase !== "idle";
  const totalToday = todayMinutes + (openSince ? Math.max(0, (now - new Date(openSince).getTime()) / 60_000) : 0);

  return (
    <section
      aria-label="Clock in and out"
      className={cn(
        "rounded-3xl border p-5 transition-colors",
        clockedIn ? "border-brand/40 bg-brand-soft" : "border-border bg-surface",
      )}
    >
      <div className="flex items-center gap-4">
        <span
          className={cn(
            "relative flex size-12 shrink-0 items-center justify-center rounded-2xl",
            clockedIn ? "bg-brand text-brand-fg" : "bg-surface-2 text-muted",
          )}
        >
          <MapPin className="size-6" />
          {clockedIn && <span className="absolute -top-0.5 -right-0.5 size-3 animate-pulse rounded-full bg-gold ring-2 ring-surface" />}
        </span>
        <div className="min-w-0 flex-1">
          {clockedIn ? (
            <>
              <p className="font-display text-2xl font-bold tabular-nums">{elapsed(openSince!, now)}</p>
              <p className="text-sm text-muted">
                At {siteName} since {openSinceLabel}
              </p>
            </>
          ) : (
            <>
              <p className="font-display text-lg font-semibold">At {siteName}?</p>
              <p className="text-sm text-muted">
                {totalToday >= 1 ? `${Math.round(totalToday)} min logged today` : "Clock in when you arrive"}
              </p>
            </>
          )}
        </div>
        <Button
          onClick={run}
          disabled={busy || (!clockedIn && !available)}
          variant={clockedIn ? "secondary" : "primary"}
          className="shrink-0"
        >
          {busy ? (
            <>
              <Loader2 className="animate-spin" />
              {phase === "locating" ? "Locating…" : "Saving…"}
            </>
          ) : clockedIn ? (
            <>
              <LogOut /> Clock out
            </>
          ) : (
            <>
              <LogIn /> Clock in
            </>
          )}
        </Button>
      </div>
      {!available && !clockedIn && (
        <p className="mt-3 text-sm text-muted">Clock-in isn&apos;t set up yet. Staff need to add the program location.</p>
      )}
      {staleDayLabel && (
        <p className="mt-3 flex items-start gap-2 rounded-2xl bg-gold-soft px-3 py-2.5 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gold" />
          You didn&apos;t clock out on {staleDayLabel}. Staff will fix your hours.
        </p>
      )}
      <p className="mt-3 text-xs text-muted">Uses your phone&apos;s location to check you&apos;re at {siteName}. It&apos;s only checked when you tap.</p>
    </section>
  );
}
