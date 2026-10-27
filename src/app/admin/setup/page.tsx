import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  UsersRound,
  ListOrdered,
  HelpCircle,
} from "lucide-react";

import { createSetupQuestionnaireAction } from "@/app/admin/setup/questionnaire-actions";
import { AdminNotice, PageHeader } from "@/components/admin/page-header";
import { ActionForm } from "@/components/forms/action-form";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { getActiveEvent } from "@/lib/data/events";

export const dynamic = "force-dynamic";

const QUESTION_TEMPLATES = [
  {
    id: "proceed",
    question: "What would you like to set up?",
    options: [
      { value: "scenes", label: "Create opening, topic, and closing scenes" },
      { value: "speakers", label: "Add speaker profiles with names and topics" },
      { value: "quiz", label: "Set up a live quiz" },
      { value: "fixtures", label: "Create fixtures/table draw" },
    ],
  },
  {
    id: "format",
    question: "How should these be displayed?",
    options: [
      { value: "full", label: "Full-screen with background images" },
      { value: "text", label: "Text-only on dark background" },
      { value: "split", label: "Split screen with logo and content" },
    ],
  },
  {
    id: "timing",
    question: "How long should each scene show?",
    options: [
      { value: "auto", label: "Auto-advance (default 30s)" },
      { value: "manual", label: "Manual control only" },
      { value: "timed", label: "Set specific durations" },
    ],
  },
];

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
    <div className="space-y-6">
      <PageHeader
        title="Quick setup"
        eyebrow="Guided tour"
        description="Answer a few questions to prepare your summit."
        actions={
          <Link
            href="/admin"
            className={buttonStyles({ variant: "secondary", size: "sm" })}
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
      
      <div className="space-y-4">
        <Card>
          <CardHeader
            title="Event details"
            description="Your summit: {event.title}"
          />
          <CardBody>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge tone="gold">{event.eventCode}</Badge>
                <span className="text-xs text-mist-500">Event code (for project/controller)</span>
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
          <CardHeader>
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-gold-400" />
              <h3 className="font-display text-lg">How should we set up your summit?</h3>
            </div>
          </CardHeader>
          <CardBody>
            <p className="mb-4 text-sm text-mist-400">
              Answer these questions and we'll create the right scenes for you.
            </p>
            
            <form className="space-y-4">
              <input type="hidden" name="eventId" value={event.id} />
              
              <div>
                <Field label="What do you want to set up?">
                  <Select name="setupType" defaultValue="scenes">
                    <option value="scenes">Scenes (opening, topic, closing)</option>
                    <option value="speakers">Speaker profiles</option>
                    <option value="quiz">Live quiz</option>
                    <option value="all">Everything at once</option>
                  </Select>
                </Field>
              </div>
              
              <div>
                <Field label="Your opening prompt/title">
                  <Input
                    name="openingTitle"
                    defaultValue="Welcome to {event.title}"
                    placeholder="What should appear first?"
                  />
                </Field>
              </div>
              
              <div>
                <Field label="Main topic or theme">
                  <Input
                    name="mainTopic"
                    placeholder="e.g. Student Government Reform"
                  />
                </Field>
              </div>
              
              <div>
                <Field label="Closing message/title">
                  <Input
                    name="closingTitle"
                    defaultValue="Thank you"
                    placeholder="What should appear last?"
                  />
                </Field>
              </div>
              
              <div>
                <Field label="Speakers to include? (one per line)">
                  <Textarea
                    name="speakerNames"
                    placeholder="John Smith – Mayor
Jane Doe – Councilmember"
                    className="min-h-[100px] font-mono"
                  />
                </Field>
                <p className="mt-1 text-xs text-mist-500">
                  Leave blank to add later from Speakers tab.
                </p>
              </div>
              
              <div>
                <Field label="Quiz question? (optional)">
                  <Input
                    name="quizQuestion"
                    placeholder="If running a quiz, enter the main question"
                  />
                </div>
              </div>
              
              <ActionForm
                action={createSetupQuestionnaireAction}
                submitLabel="Create setup"
                pendingLabel="Preparing..."
              >
                <input type="hidden" name="eventId" value={event.id} />
                <button
                  type="submit"
                  className={buttonStyles({
                    variant: "primary",
                    size: "lg",
                    className: "w-full",
                  })}
                >
                  Create scenes and proceed
                </button>
              </ActionForm>
            </form>
          </CardBody>
        </Card>
        
        <Card>
          <CardHeader
            title="What's next?"
            description="After setup, you'll be taken to the controller dashboard."
          />
          <CardBody className="space-y-2">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Circle className="h-4 w-4 shrink-0 text-mist-600" />
                <span className="text-sm text-mist-400">
                  Scenes created for opening, topic, and closing
                </span>
              </div>
              <div className="flex items-start gap-3">
                <Circle className="h-4 w-4 shrink-0 text-mist-600" />
                <span className="text-sm text-mist-400">
                  Speaker profiles available if names were provided
                </span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span className="text-sm text-mist-300">
                  Ready to control live from your phone
                </span>
              </div>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardHeader
            title="Ready to go"
            description="Launch your summit"
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
                href="/play"
                target="_blank"
                className={buttonStyles({
                  variant: "ghost",
                  size: "lg",
                  className: "w-full justify-between",
                })}
              >
                Participant view
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}