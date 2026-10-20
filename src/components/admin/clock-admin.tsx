"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Crosshair, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

/** Latitude/longitude inputs plus a button that fills them from this device's GPS. */
export function SiteLocationFields({ lat, lng }: { lat: number | null; lng: number | null }) {
  const [la, setLa] = useState(lat == null ? "" : String(lat));
  const [ln, setLn] = useState(lng == null ? "" : String(lng));
  const [busy, setBusy] = useState(false);

  function fillFromDevice() {
    if (!("geolocation" in navigator)) {
      toast.error("This browser can't share location.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLa(pos.coords.latitude.toFixed(6));
        setLn(pos.coords.longitude.toFixed(6));
        setBusy(false);
        toast.success(`Location found (±${Math.round(pos.coords.accuracy)} m). Press Save to keep it.`);
      },
      (err) => {
        setBusy(false);
        toast.error(err.code === 1 ? "Location is blocked for this site in your browser settings." : "Couldn't get your location. Try again.");
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );
  }

  const hasPoint = la && ln && Number.isFinite(Number(la)) && Number.isFinite(Number(ln));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitude">
          <Input name="lat" inputMode="decimal" value={la} onChange={(e) => setLa(e.target.value)} placeholder="e.g. 39.290385" />
        </Field>
        <Field label="Longitude">
          <Input name="lng" inputMode="decimal" value={ln} onChange={(e) => setLn(e.target.value)} placeholder="e.g. -76.612189" />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={fillFromDevice} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Crosshair />}
          Use my current location
        </Button>
        {hasPoint && (
          <a
            href={`https://www.google.com/maps?q=${la},${ln}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand"
          >
            Check on map <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}
