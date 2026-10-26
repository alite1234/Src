import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  Plus,
  Radio,
} from "lucide-react";

import { createQuizAction } from "@/app/admin/quiz/actions";
import { AdminNotice, PageHeader } from "@/components/admin/page-header";
import { ActionForm } from "@/components/forms/action-form";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/field";
import { getActiveEvent, getEventQuizzes } from "@/lib/data/events";
import { DEFAULT_QUIZ_SETTINGS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = { title: "Quiz" };

export default async function QuizListPage() {
  const event = await getActiveEvent();
  if (!event) {
    return (
      <div>
        <PageHeader title="Quiz" eyebrow="Interactive" />
        <EmptyState
          icon={<ClipboardList className="h-6 w-6" />}
          title="No active summit"
          description="Activate a summit before creating a quiz."
          action={
            <Link
              href="/admin"
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to summit
            </Link>
          }
        />
      </div>
    );
  }

  const quizzes = await getEventQuizzes(event.id);

  return (
    <div>
      <PageHeader
        eyebrow="Interactive"
        title="Live quiz bank"
        description="Build question sets, tune scoring and lobby behaviour, then launch a session from the controller. Participants join with a six-digit PIN."
        actions={
          <>
            <Badge tone="gold">{quizzes.length} quizzes</Badge>
            <Link
              href="/play"
              target="_blank"
              className={buttonStyles({ variant: "ghost", size: "sm" })}
            >
              Participant view
            </Link>
          </>
        }
      />

      <AdminNotice />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {quizzes.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-6 w-6" />}
              title="No quizzes yet"
              description="Create a quiz, then add questions and launch it when the room is ready."
            />
          ) : (
            quizzes.map((quiz) => {
              const settings = { ...DEFAULT_QUIZ_SETTINGS, ...quiz.settings };
              return (
                <Card key={quiz.id}>
                  <CardBody className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-display text-xl text-white">
                            {quiz.title}
                          </h2>
                          <Badge tone="neutral">
                            {Number(quiz.questionCount)} questions
                          </Badge>
                          {quiz.questionCount === 0 ? (
                            <Badge tone="danger">Needs questions</Badge>
                          ) : null}
                        </div>
                        <p className="mt-2 text-xs text-mist-500">
                          {settings.speedBonus
                            ? `Speed bonus up to ${Math.round(
                                settings.speedBonusRatio * 100,
                              )}%`
                            : "Fixed points per question"}
                          {" · "}
                          {settings.lobbyCountdownSeconds
                            ? `${settings.lobbyCountdownSeconds}s lobby`
                            : "Manual lobby"}
                          {" · "}
                          {settings.randomizeQuestions
                            ? "Shuffled questions"
                            : "Fixed order"}
                        </p>
                      </div>
                      <Link
                        href={`/admin/quiz/${quiz.id}`}
                        className={buttonStyles({
                          variant: "secondary",
                          size: "sm",
                        })}
                      >
                        Open quiz
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
                      <Link
                        href="/control"
                        className={buttonStyles({
                          variant: "ghost",
                          size: "sm",
                        })}
                      >
                        <Radio className="h-3.5 w-3.5" />
                        Launch from controller
                      </Link>
                    </div>
                  </CardBody>
                </Card>
              );
            })
          )}
        </div>

        <div className="space-y-4">
          <Card className="xl:sticky xl:top-6">
            <CardHeader
              title="Create a quiz"
              description="Each summit can host multiple quiz banks."
              actions={
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-gold-500/25 bg-gold-500/10 text-gold-300">
                  <Plus className="h-4 w-4" />
                </span>
              }
            />
            <CardBody>
              <ActionForm
                action={createQuizAction}
                submitLabel="Create quiz"
                pendingLabel="Creating…"
              >
                <Field label="Quiz title">
                  <Input
                    name="title"
                    required
                    placeholder="Legislative trivia"
                  />
                </Field>
              </ActionForm>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="How the live quiz runs" />
            <CardBody className="space-y-2 text-xs leading-relaxed text-mist-400">
              <p>1. Add at least one valid question.</p>
              <p>2. Launch the quiz from the controller to open the lobby.</p>
              <p>3. Share the PIN or QR code shown on the projector.</p>
              <p>4. Start the first question when participants have joined.</p>
              <p>5. Reveal answers, show the leaderboard and advance.</p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
