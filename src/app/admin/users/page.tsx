import { asc } from "drizzle-orm";
import {
  KeyRound,
  ShieldCheck,
  Trash2,
  UserPlus,
  UsersRound,
} from "lucide-react";

import {
  createUserAction,
  deleteUserAction,
  resetUserPasswordAction,
  updateUserRoleAction,
} from "@/app/admin/actions";
import { AdminNotice, PageHeader } from "@/components/admin/page-header";
import { ActionForm } from "@/components/forms/action-form";
import { ConfirmSubmitButton } from "@/components/forms/confirm-submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth/guards";
import { formatShortDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Users" };

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  const [current, accounts] = await Promise.all([
    getSessionUser(),
    db.select().from(users).orderBy(asc(users.createdAt)),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Access"
        title="Team accounts"
        description="Administrators manage the summit. Controllers run the live show from the controller dashboard. Participants never need accounts."
        actions={
          <Badge tone="gold">
            <UsersRound className="h-3 w-3" />
            {accounts.length} accounts
          </Badge>
        }
      />

      <AdminNotice notice={notice} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="Accounts"
            description="Passwords are stored as bcrypt hashes. Reset a password if a team member loses access."
          />
          <CardBody className="space-y-3">
            {accounts.map((account) => {
              const isSelf = account.id === current?.id;
              return (
                <div
                  key={account.id}
                  className="rounded-xl border border-white/8 bg-white/[0.02] p-3"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold-500/20 bg-gold-500/10 font-display text-sm text-gold-200">
                      {account.name
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-sm text-white">
                          {account.name}
                        </p>
                        {account.role === "admin" ? (
                          <Badge tone="gold">
                            <ShieldCheck className="h-2.5 w-2.5" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge tone="neutral">Controller</Badge>
                        )}
                        {isSelf ? <Badge tone="info">You</Badge> : null}
                      </div>
                      <p className="mt-1 truncate text-xs text-mist-500">
                        {account.email} · joined{" "}
                        {formatShortDate(account.createdAt)}
                      </p>
                    </div>
                    {!isSelf ? (
                      <form
                        action={deleteUserAction}
                        className="shrink-0"
                      >
                        <input
                          type="hidden"
                          name="userId"
                          value={account.id}
                        />
                        <ConfirmSubmitButton
                          message={`Delete the account for ${account.email}?`}
                          variant="ghost"
                          size="icon"
                          title="Delete account"
                          className="h-9 w-9"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </ConfirmSubmitButton>
                      </form>
                    ) : null}
                  </div>

                  {!isSelf ? (
                    <div className="mt-3 grid gap-2 border-t border-white/5 pt-3 sm:grid-cols-2">
                      <form
                        action={updateUserRoleAction}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="hidden"
                          name="userId"
                          value={account.id}
                        />
                        <Select
                          name="role"
                          defaultValue={account.role}
                          className="h-8 px-2 py-1 text-xs"
                          aria-label={`Role for ${account.name}`}
                        >
                          <option value="controller">Controller</option>
                          <option value="admin">Administrator</option>
                        </Select>
                        <Button type="submit" variant="subtle" size="sm">
                          Update
                        </Button>
                      </form>
                      <form
                        action={resetUserPasswordAction}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="hidden"
                          name="userId"
                          value={account.id}
                        />
                        <Input
                          type="password"
                          name="password"
                          minLength={8}
                          required
                          placeholder="New password"
                          className="h-8 px-2 py-1 text-xs"
                          aria-label={`New password for ${account.name}`}
                        />
                        <Button type="submit" variant="subtle" size="sm">
                          <KeyRound className="h-3 w-3" />
                          Reset
                        </Button>
                      </form>
                    </div>
                  ) : (
                    <p className="mt-3 border-t border-white/5 pt-3 text-xs text-mist-600">
                      Manage your own role or password from another
                      administrator account.
                    </p>
                  )}
                </div>
              );
            })}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Add an account"
              description="New accounts can sign in immediately."
              actions={
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-gold-500/25 bg-gold-500/10 text-gold-300">
                  <UserPlus className="h-4 w-4" />
                </span>
              }
            />
            <CardBody>
              <ActionForm
                action={createUserAction}
                submitLabel="Create account"
                pendingLabel="Creating…"
              >
                <Field label="Full name">
                  <Input name="name" required placeholder="Ada Nwosu" />
                </Field>
                <Field label="Email address">
                  <Input
                    type="email"
                    name="email"
                    required
                    placeholder="name@example.com"
                  />
                </Field>
                <Field label="Temporary password" hint="At least 8 characters.">
                  <Input
                    type="password"
                    name="password"
                    minLength={8}
                    required
                  />
                </Field>
                <Field label="Role">
                  <Select name="role" defaultValue="controller">
                    <option value="controller">Controller</option>
                    <option value="admin">Administrator</option>
                  </Select>
                </Field>
              </ActionForm>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Role boundaries" />
            <CardBody className="space-y-2 text-xs leading-relaxed text-mist-400">
              <p>
                <span className="text-gold-200">Administrators</span> manage
                events, branding, speakers, scenes, quizzes, scoreboards and
                accounts.
              </p>
              <p>
                <span className="text-gold-200">Controllers</span> can preview
                and publish scenes, run the countdown, reveal scores and operate
                the live quiz.
              </p>
              <p>
                At least one administrator must always remain. You cannot delete
                or demote your own account.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
