import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  Speaker,
  ListOrdered,
} from "lucide-react";

import {
  createSetupAction,
} from "@/app/admin/setup/actions";
import { AdminNotice, PageHeader } from "@/components/admin/page-header";
import { ActionForm } from "@/components/forms/action-form";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { getActiveEvent } from "@/lib/data/events";

export const dynamic = "force-dynamic";

export const metadata = { title: "Setup" };

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  const event = await getActiveEvent();
  
  if (!event) {
    return (
      <div>
        <PageHeader title="Setup" eyebrow="Getting started" />
        <p className="mt-4 text-sm text-mist-400">
          No summit found. <Link href="/admin" className={buttonStyles({ variant: "secondary", size: "sm" })}>Create a summit first</Link>
        </p>
      </div>
    );
  }
  
  return (
    <div>
      <PageHeader
        title="Quick setup"
        eyebrow="Guided tour"
        description="Answer a few questions to get your summit running."
        actions={
          <Link
            href="/admin"
            className={buttonStyles({ variant: "secondary", size="sm" })}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to dashboard
          </Link>
        }
      />
      
      <AdminNotice notice={notice} />
      
      {!event.isActive ? (
        <div className="mb-5 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-4 py-3 text-sm text-amber-100">
          The summit is not yet active. Mark it as "Ready" from the main dashboard first.
        </div>
      ) : null}
      
      <Card>
        <CardHeader
          title="Step 1: Event details"
          description="Your summit: {event.title}"
        />
        <CardBody>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Badge tone="gold">{event.eventCode}</Badge>
              <span className="text-xs text-mist-500">Event code</span>
            </div>
            {event.venue && (
              <p className="text-sm text-mist-300">
                <CalendarDays className="mr-1.5 inline h-3 w-3 text-gold-400" />
                {event.venue}
              </p>
            )}
          </div>
        </CardBody>
      </Card>
      
      <Card>
        <CardHeader
          title="Step 2: Choose speakers"
          description="Who will speak? Enter names directly - one per line."
        />
        <CardBody>
          <ActionForm
            action={createSetupAction}
            submitLabel="Save speakers"
          >
            <input type="hidden" name="eventId" value={event.id} />
            <Textarea
              name="speakers"
              placeholder="John Smith
Jane Doe
Robert Johnson"
              className="min-h-[120px] font-mono"
            />
          </ActionForm>
        </CardBody>
      </Card>
      
      <Card>
        <CardHeader
          title="Step 3: First prompts"
          description="What topics will you present?"
        />
        <CardBody>
          <ActionForm
            action={createSetupAction}
            submitLabel="Save prompts"
            pendingLabel="Creating prompt scenes..."
          >
            <input type="hidden" name="eventId" value={event.id} />
            <div className="space-y-4">
              <div>
                <Field label="Opening prompt">
                  <Input
                    name="prompt1"
                    defaultValue="Welcome to {event.title}"
                    placeholder="Opening welcome message"
                  />
                </Field>
              </div>
              <div>
                <Field label="Topic prompt">
                  <Input
                    name="prompt2"
                    placeholder="Debate topic or session theme"
                  />
                </Field>
              </div>
              <div>
                <Field label="Discussion prompt">
                  <Input
                    name="prompt3"
                    placeholder="Key question for participants"
                  />
                </Field>
              </div>
            </div>
          </ActionForm>
        </CardBody>
      </Card>
      
      <Card>
        <CardHeader
          title="Step 4: Launch"
          description="Ready to go?"
        />
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/control"
              className={buttonStyles({
                variant: "primary",
                size: "lg",
                className: "w-full justify-between",
              })}
            >
              Open controller
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/project"
              target="_blank"
              className={buttonStyles({
                variant: "secondary",
                size: "lg",
                className: "w-full justify-between",
              })}
            >
              Open projector
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/admin/speakers"
              className={buttonStyles({
                variant: "ghost",
                size: "lg",
                className: "w-full justify-between",
              })}
            >
              Add more speakers
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}