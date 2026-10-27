import Link from "next/link";
import { KeyRound, Radio } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { getActiveEvent, getEventByCode } from "@/lib/data/events";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Controller",
  description: "Live control dashboard for the SRC Legislative Summit.",
};

export default async function ControlPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  let eventCode = code;
  
  if (!eventCode) {
    const activeEvent = await getActiveEvent();
    if (activeEvent?.eventCode && activeEvent.isActive) {
      eventCode = activeEvent.eventCode;
    }
  }
  
  const event = eventCode ? await getEventByCode(eventCode) : null;

  if (!event) {
    return (
      <main className="relative flex min-h-dvh flex-col overflow-hidden bg-navy-950">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#0c2550_0%,#061127_48%,#030917_100%)]" />
        </div>
        <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-6">
          <div className="text-center">
            <Radio className="mx-auto mb-4 h-8 w-8 text-gold-400" />
            <h1 className="font-display text-2xl text-white">
              Summit controller
            </h1>
            <p className="mt-2 text-sm text-mist-400">
              Enter the 6-character event code to access the live control dashboard.
            </p>
          </div>
          <form className="mt-6 space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-mist-500 mb-1.5">
                Event code
              </label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-600" />
                <Input
                  name="code"
                  inputMode="numeric"
                  placeholder="ABC123"
                  maxLength={6}
                  className="h-12 pl-10 text-center font-display text-2xl tracking-[0.3em] text-white"
                  autoFocus
                />
              </div>
            </div>
            <Button type="submit" className="w-full" size="lg">
              Enter Controller
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-mist-600">
            Contact the summit organizer if you need help.
          </p>
        </div>
      </main>
    );
  }

  if (!event.isActive) {
    return (
      <main className="flex h-dvh items-center justify-center bg-navy-950 text-center">
        <div>
          <h1 className="font-display text-2xl text-white">
            Summit not active
          </h1>
          <p className="mt-2 text-mist-400">
            Contact the summit organizer - the event code is valid but the summit has not been activated.
          </p>
        </div>
      </main>
    );
  }

  const { ControlDashboard } = await import("@/components/control/control-dashboard");
  const { buildControlPayload } = await import("@/lib/data/live");
  const initialData = await buildControlPayload();
  return <ControlDashboard initialData={initialData} />;
}