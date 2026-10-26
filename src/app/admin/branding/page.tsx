import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Star,
  Trash2,
} from "lucide-react";

import {
  moveLogoAction,
  removeLogoAction,
  renameLogoAction,
  setPrimaryLogoAction,
  toggleLogoAction,
  updateBrandingAction,
} from "@/app/admin/branding/actions";
import { AdminNotice, PageHeader } from "@/components/admin/page-header";
import { ActionForm } from "@/components/forms/action-form";
import { ConfirmSubmitButton } from "@/components/forms/confirm-submit-button";
import { LogoUploader } from "@/components/forms/logo-uploader";
import { Stage } from "@/components/projector/stage";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Label, Select } from "@/components/ui/field";
import {
  DEFAULT_LOGO_VISIBILITY,
  LOGO_LAYOUTS,
  MAX_LOGOS,
  VISIBILITY_KEYS,
} from "@/lib/constants";
import {
  getActiveEvent,
  getAdminLogos,
  getEventLogos,
  toPublicEvent,
} from "@/lib/data/events";
import { publicFileUrl } from "@/lib/files";

export const dynamic = "force-dynamic";

export const metadata = { title: "Branding" };

export default async function BrandingPage() {
  const event = await getActiveEvent();
  if (!event) {
    return (
      <div>
        <PageHeader title="Branding" eyebrow="Stage identity" />
        <EmptyState
          icon={<ImageIcon className="h-6 w-6" />}
          title="No active summit"
          description="Create and activate a summit before uploading logos."
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

  const [logos, publicLogos] = await Promise.all([
    getAdminLogos(event.id),
    getEventLogos(event.id),
  ]);
  const visibility = event.logoVisibility ?? DEFAULT_LOGO_VISIBILITY;
  const publicEvent = toPublicEvent(event);

  return (
    <div>
      <PageHeader
        eyebrow="Stage identity"
        title="Branding & logo visibility"
        description="Upload up to five logos, choose the approved layout, then control which scene types display branding."
      />

      {!event.isActive ? (
        <AdminNotice notice="logo-required" />
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Logo library"
              description={`${logos.length} of ${MAX_LOGOS} used. The primary logo anchors most layouts.`}
              actions={<Badge tone="gold">{logos.length} / {MAX_LOGOS}</Badge>}
            />
            <CardBody className="space-y-4">
              <LogoUploader eventId={event.id} count={logos.length} />

              {logos.length === 0 ? (
                <EmptyState
                  icon={<ImageIcon className="h-5 w-5" />}
                  title="No logos uploaded"
                  description="Add the official summit mark first. You can add supporting partner logos afterwards."
                />
              ) : (
                <div className="space-y-2">
                  {logos.map((logo, index) => (
                    <div
                      key={logo.id}
                      className="rounded-xl border border-white/8 bg-white/[0.02] p-3"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-14 w-24 shrink-0 items-center justify-center rounded-lg border border-white/8 bg-navy-950/60">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={publicFileUrl(logo.fileId)}
                            alt={logo.name}
                            className="max-h-11 max-w-20 object-contain"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="truncate text-sm text-white">
                              {logo.name}
                            </p>
                            {logo.isPrimary ? (
                              <Badge tone="gold">
                                <Star className="h-2.5 w-2.5" />
                                Primary
                              </Badge>
                            ) : null}
                            {!logo.enabled ? (
                              <Badge tone="danger">Hidden</Badge>
                            ) : null}
                          </div>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-mist-600">
                            Position {index + 1}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                          <form action={moveLogoAction}>
                            <input type="hidden" name="logoId" value={logo.id} />
                            <input type="hidden" name="direction" value="up" />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="icon"
                              title="Move up"
                              disabled={index === 0}
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                          </form>
                          <form action={moveLogoAction}>
                            <input type="hidden" name="logoId" value={logo.id} />
                            <input type="hidden" name="direction" value="down" />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="icon"
                              title="Move down"
                              disabled={index === logos.length - 1}
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                          </form>
                          {!logo.isPrimary ? (
                            <form action={setPrimaryLogoAction}>
                              <input
                                type="hidden"
                                name="logoId"
                                value={logo.id}
                              />
                              <Button
                                type="submit"
                                variant="ghost"
                                size="icon"
                                title="Make primary"
                              >
                                <Star className="h-3.5 w-3.5" />
                              </Button>
                            </form>
                          ) : null}
                          <form action={toggleLogoAction}>
                            <input type="hidden" name="logoId" value={logo.id} />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="icon"
                              title={
                                logo.isPrimary
                                  ? "The primary logo is always shown"
                                  : logo.enabled
                                    ? "Hide logo"
                                    : "Show logo"
                              }
                              disabled={logo.isPrimary}
                            >
                              {logo.enabled ? (
                                <Eye className="h-3.5 w-3.5" />
                              ) : (
                                <EyeOff className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </form>
                          <form action={removeLogoAction}>
                            <input type="hidden" name="logoId" value={logo.id} />
                            <ConfirmSubmitButton
                              message={`Remove "${logo.name}" from this summit?`}
                              variant="ghost"
                              title="Remove logo"
                              size="icon"
                              className="h-9 w-9"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </ConfirmSubmitButton>
                          </form>
                        </div>
                      </div>

                      <form
                        action={renameLogoAction}
                        className="mt-2 flex items-center gap-2 border-t border-white/5 pt-2"
                      >
                        <input type="hidden" name="logoId" value={logo.id} />
                        <Input
                          name="name"
                          defaultValue={logo.name}
                          className="h-8 max-w-xs px-2 py-1 text-xs"
                          aria-label="Logo name"
                        />
                        <Button type="submit" variant="subtle" size="sm">
                          <Check className="h-3 w-3" />
                          Rename
                        </Button>
                      </form>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Layout & visibility"
              description="These rules apply to every scene published to the projector."
            />
            <CardBody>
              <ActionForm
                action={updateBrandingAction}
                submitLabel="Save branding rules"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Logo layout">
                    <Select
                      name="logoLayout"
                      defaultValue={event.logoLayout}
                    >
                      {LOGO_LAYOUTS.map((layout) => (
                        <option key={layout.value} value={layout.value}>
                          {layout.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <div className="space-y-1.5">
                    <Label>Default visibility</Label>
                    <label className="flex h-[42px] cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-navy-950/60 px-3.5 text-sm text-mist-200">
                      <input
                        type="checkbox"
                        name="logoDefault"
                        defaultChecked={visibility.default}
                        className="h-4 w-4 accent-gold-500"
                      />
                      Show logos unless a scene says otherwise
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Scene overrides</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {VISIBILITY_KEYS.map((item) => {
                      const current = visibility.scenes?.[item.key];
                      return (
                        <div
                          key={item.key}
                          className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2"
                        >
                          <span className="text-xs text-mist-300">
                            {item.label}
                          </span>
                          <Select
                            name={`visibility_${item.key}`}
                            defaultValue={
                              typeof current === "boolean"
                                ? current
                                  ? "show"
                                  : "hide"
                                : "inherit"
                            }
                            className="h-8 w-28 px-2 py-1 text-xs"
                            aria-label={`${item.label} logo visibility`}
                          >
                            <option value="inherit">Inherit</option>
                            <option value="show">Show</option>
                            <option value="hide">Hide</option>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </ActionForm>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="overflow-hidden">
            <CardHeader
              title="Layout preview"
              description={LOGO_LAYOUTS.find((l) => l.value === event.logoLayout)?.description}
            />
            <div className="aspect-video w-full">
              <Stage
                event={publicEvent}
                logos={publicLogos}
                showLogos
                layout={event.logoLayout}
              >
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <p className="text-[1.05cqw] uppercase tracking-[0.35em] text-[var(--stage-accent)]">
                    Preview
                  </p>
                  <p className="mt-[2cqh] max-w-[70cqw] text-balance font-display text-[4.4cqw] leading-tight">
                    {event.title}
                  </p>
                  <p className="mt-[1.6cqh] text-[1.2cqw] text-[var(--stage-muted)]">
                    Logo layout and scene styling
                  </p>
                </div>
              </Stage>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Logo guidance"
              description="Keep the mark legible from the back of the hall."
            />
            <CardBody className="space-y-3 text-xs leading-relaxed text-mist-400">
              <p>
                Use transparent PNG or WebP files where possible. Wide marks
                work best in the primary and footer positions.
              </p>
              <p>
                Uploads are compressed on the device before being stored, so
                you can upload directly from a phone.
              </p>
              <p>
                The primary logo is always shown. Other logos can be hidden
                without deleting them.
              </p>
              <Link
                href="/admin/scenes"
                className={buttonStyles({
                  variant: "ghost",
                  size: "sm",
                  className: "mt-2",
                })}
              >
                Continue to scenes
                <ArrowDown className="h-3.5 w-3.5 rotate-[-90deg]" />
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
