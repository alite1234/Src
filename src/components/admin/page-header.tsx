export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold-400/80">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 font-display text-3xl tracking-wide text-white">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mist-400">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

const notices: Record<string, string> = {
  "logo-required": "Upload at least one logo before activating a summit.",
  "role-self": "You cannot change your own role.",
  "last-admin": "At least one administrator must remain.",
  "delete-self": "You cannot delete your own account.",
  "password-short": "Passwords must be at least 8 characters.",
  "password-updated": "Password updated.",
};

export function AdminNotice({ notice }: { notice?: string | null }) {
  if (!notice) return null;
  const message = notices[notice];
  if (!message) return null;
  return (
    <div className="mb-5 rounded-xl border border-gold-500/25 bg-gold-500/[0.07] px-4 py-3 text-sm text-gold-100">
      {message}
    </div>
  );
}
