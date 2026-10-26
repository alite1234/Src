import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";

import {
  createQuestionAction,
  deleteQuestionAction,
  moveQuestionAction,
  updateQuestionAction,
  updateQuizAction,
} from "@/app/admin/quiz/actions";
import { PageHeader } from "@/components/admin/page-header";
import { ActionForm } from "@/components/forms/action-form";
import { ConfirmSubmitButton } from "@/components/forms/confirm-submit-button";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Label, Select, Textarea } from "@/components/ui/field";
import { DEFAULT_QUIZ_SETTINGS } from "@/lib/constants";
import { db } from "@/lib/db";
import { questions, quizzes } from "@/lib/db/schema";
import { getActiveEvent } from "@/lib/data/events";
import type { Question } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export const metadata = { title: "Quiz editor" };

function CheckField({
  name,
  label,
  defaultChecked,
  hint,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-3">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 shrink-0 accent-gold-500"
      />
      <span>
        <span className="block text-sm text-mist-200">{label}</span>
        {hint ? (
          <span className="mt-0.5 block text-xs text-mist-600">{hint}</span>
        ) : null}
      </span>
    </label>
  );
}

function QuestionFields({
  quizId,
  question,
}: {
  quizId: string;
  question?: Question;
}) {
  const options = question?.options ?? [];
  const correctIndex = Math.max(
    0,
    options.findIndex((option) => option.id === question?.correctOptionId),
  );

  return (
    <>
      <input type="hidden" name="quizId" value={quizId} />
      {question ? (
        <input type="hidden" name="questionId" value={question.id} />
      ) : null}
      <Field label="Question prompt">
        <Textarea
          name="prompt"
          required
          defaultValue={question?.prompt ?? ""}
          placeholder="Which chamber of the student legislature reviews budget motions?"
        />
      </Field>

      <div className="space-y-2">
        <Label>Answer options & correct answer</Label>
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="flex items-center gap-2 rounded-xl border border-white/8 bg-navy-950/40 p-2"
          >
            <input
              type="radio"
              name="correct"
              value={index}
              defaultChecked={index === correctIndex}
              className="h-4 w-4 shrink-0 accent-gold-500"
              aria-label={`Option ${index + 1} is correct`}
            />
            <Input
              name={`option_${index}`}
              defaultValue={options[index]?.text ?? ""}
              placeholder={`Option ${index + 1}`}
              className="h-9"
            />
            <input
              type="hidden"
              name={`optionId_${index}`}
              value={options[index]?.id ?? ""}
            />
          </div>
        ))}
        <p className="text-xs text-mist-600">
          Leave unused options blank. The selected radio marks the correct
          answer.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Timer (seconds)">
          <Input
            type="number"
            name="durationSeconds"
            min={5}
            max={300}
            defaultValue={question?.durationSeconds ?? 20}
          />
        </Field>
        <Field label="Points">
          <Input
            type="number"
            name="points"
            min={0}
            max={100000}
            defaultValue={question?.points ?? 1000}
          />
        </Field>
      </div>
    </>
  );
}

export default async function QuizEditorPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;
  const event = await getActiveEvent();
  if (!event) notFound();

  const [quiz] = await db
    .select()
    .from(quizzes)
    .where(and(eq(quizzes.id, quizId), eq(quizzes.eventId, event.id)))
    .limit(1);
  if (!quiz) notFound();

  const questionRows = await db
    .select()
    .from(questions)
    .where(eq(questions.quizId, quiz.id))
    .orderBy(asc(questions.orderIndex), asc(questions.createdAt));

  const settings = { ...DEFAULT_QUIZ_SETTINGS, ...quiz.settings };

  return (
    <div>
      <PageHeader
        eyebrow="Quiz editor"
        title={quiz.title}
        description="Settings and questions lock while a live session is active."
        actions={
          <>
            <Link
              href="/admin/quiz"
              className={buttonStyles({ variant: "ghost", size: "sm" })}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All quizzes
            </Link>
            <Badge tone="gold">
              {questionRows.length}{" "}
              {questionRows.length === 1 ? "question" : "questions"}
            </Badge>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Quiz settings"
              description="Scoring and lobby behaviour apply to the next launched session."
            />
            <CardBody>
              <ActionForm
                action={updateQuizAction}
                submitLabel="Save quiz settings"
              >
                <input type="hidden" name="quizId" value={quiz.id} />
                <Field label="Quiz title">
                  <Input name="title" required defaultValue={quiz.title} />
                </Field>

                <div className="grid gap-2 sm:grid-cols-2">
                  <CheckField
                    name="speedBonus"
                    label="Speed bonus"
                    defaultChecked={settings.speedBonus}
                    hint="Award extra points for faster correct answers."
                  />
                  <CheckField
                    name="randomizeQuestions"
                    label="Shuffle questions"
                    defaultChecked={settings.randomizeQuestions}
                    hint="Use a fresh order each launched session."
                  />
                  <CheckField
                    name="randomizeAnswers"
                    label="Shuffle answers"
                    defaultChecked={settings.randomizeAnswers}
                    hint="Each participant sees answers in the same shuffled order."
                  />
                  <CheckField
                    name="allowLateJoin"
                    label="Allow late joining"
                    defaultChecked={settings.allowLateJoin}
                    hint="Participants can join after the quiz begins."
                  />
                  <CheckField
                    name="showLeaderboard"
                    label="Show leaderboards"
                    defaultChecked={settings.showLeaderboard}
                    hint="Display standings between questions."
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Speed bonus cap (%)"
                    hint="Maximum share of the base points awarded for speed."
                  >
                    <Input
                      type="number"
                      name="speedBonusPercent"
                      min={0}
                      max={100}
                      defaultValue={Math.round(
                        settings.speedBonusRatio * 100,
                      )}
                    />
                  </Field>
                  <Field label="Lobby countdown (seconds)">
                    <Input
                      type="number"
                      name="lobbyCountdownSeconds"
                      min={0}
                      max={600}
                      defaultValue={settings.lobbyCountdownSeconds}
                    />
                  </Field>
                  <Field
                    label="Maximum display name length"
                    hint="Participant names are capped at this length."
                  >
                    <Input
                      type="number"
                      name="maxNameLength"
                      min={3}
                      max={40}
                      defaultValue={settings.maxNameLength}
                    />
                  </Field>
                  <Field label="Tie breaker">
                    <Select
                      name="tieBreaker"
                      defaultValue={settings.tieBreaker}
                    >
                      <option value="time">Total response time</option>
                      <option value="name">Alphabetical</option>
                    </Select>
                  </Field>
                </div>
              </ActionForm>
            </CardBody>
          </Card>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl text-white">Question bank</h2>
              <Badge tone="neutral">{questionRows.length} total</Badge>
            </div>

            {questionRows.length === 0 ? (
              <EmptyState
                icon={<Plus className="h-5 w-5" />}
                title="No questions yet"
                description="Add the first question using the editor on the right. At least two answer options are required."
              />
            ) : (
              <div className="space-y-3">
                {questionRows.map((question, index) => (
                  <Card key={question.id}>
                    <CardBody className="space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold-500/25 bg-gold-500/10 font-display text-xs text-gold-300">
                              {index + 1}
                            </span>
                            <p className="text-sm font-medium text-white">
                              {question.prompt}
                            </p>
                          </div>
                          <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                            {question.options.map((option) => {
                              const correct =
                                option.id === question.correctOptionId;
                              return (
                                <div
                                  key={option.id}
                                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
                                    correct
                                      ? "border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-100"
                                      : "border-white/5 bg-white/[0.02] text-mist-400"
                                  }`}
                                >
                                  {correct ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                  ) : (
                                    <XCircle className="h-3.5 w-3.5 shrink-0 text-mist-600" />
                                  )}
                                  {option.text}
                                </div>
                              );
                            })}
                          </div>
                          <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-mist-600">
                            {question.durationSeconds}s · {question.points} base
                            pts
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <form action={moveQuestionAction}>
                            <input
                              type="hidden"
                              name="quizId"
                              value={quiz.id}
                            />
                            <input
                              type="hidden"
                              name="questionId"
                              value={question.id}
                            />
                            <input type="hidden" name="direction" value="up" />
                            <button
                              type="submit"
                              className={buttonStyles({
                                variant: "ghost",
                                size: "icon",
                              })}
                              title="Move up"
                              disabled={index === 0}
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                          </form>
                          <form action={moveQuestionAction}>
                            <input
                              type="hidden"
                              name="quizId"
                              value={quiz.id}
                            />
                            <input
                              type="hidden"
                              name="questionId"
                              value={question.id}
                            />
                            <input
                              type="hidden"
                              name="direction"
                              value="down"
                            />
                            <button
                              type="submit"
                              className={buttonStyles({
                                variant: "ghost",
                                size: "icon",
                              })}
                              title="Move down"
                              disabled={index === questionRows.length - 1}
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                          </form>
                          <form action={deleteQuestionAction}>
                            <input
                              type="hidden"
                              name="quizId"
                              value={quiz.id}
                            />
                            <input
                              type="hidden"
                              name="questionId"
                              value={question.id}
                            />
                            <ConfirmSubmitButton
                              message="Delete this question from the bank?"
                              variant="ghost"
                              size="icon"
                              title="Delete question"
                              className="h-9 w-9"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </ConfirmSubmitButton>
                          </form>
                        </div>
                      </div>

                      <details className="rounded-xl border border-white/8 bg-white/[0.02]">
                        <summary className="cursor-pointer px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-mist-400 transition-colors hover:text-gold-200">
                          Edit question
                        </summary>
                        <div className="border-t border-white/5 p-4">
                          <ActionForm
                            action={updateQuestionAction}
                            submitLabel="Save question"
                          >
                            <QuestionFields
                              quizId={quiz.id}
                              question={question}
                            />
                          </ActionForm>
                        </div>
                      </details>
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <Card className="xl:sticky xl:top-6">
            <CardHeader
              title="Add a question"
              description="Questions are added to the end of the bank."
            />
            <CardBody>
              <ActionForm
                action={createQuestionAction}
                submitLabel="Add question"
                pendingLabel="Adding…"
              >
                <QuestionFields quizId={quiz.id} />
              </ActionForm>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
