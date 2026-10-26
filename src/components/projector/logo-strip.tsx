import type { LogoLayout, PublicLogo } from "@/lib/types";
import { cn } from "@/lib/utils";

type LayoutKind = LogoLayout | "footer";

function LogoImage({
  logo,
  className,
}: {
  logo: PublicLogo;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo.url}
      alt={logo.name}
      className={cn(
        "w-auto object-contain drop-shadow-[0_6px_24px_rgba(0,0,0,0.45)]",
        className,
      )}
    />
  );
}

export function LogoStrip({
  logos,
  layout,
  className,
}: {
  logos: PublicLogo[];
  layout: LayoutKind;
  className?: string;
}) {
  if (logos.length === 0) return null;

  const primary = logos.find((logo) => logo.isPrimary) ?? logos[0];
  const supporting = logos.filter((logo) => logo.id !== primary.id);

  if (layout === "primary" || layout === "footer") {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <LogoImage
          logo={primary}
          className={
            layout === "footer"
              ? "max-h-[7cqh] max-w-[24cqw]"
              : "max-h-[11cqh] max-w-[34cqw]"
          }
        />
      </div>
    );
  }

  if (layout === "row") {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center justify-center gap-[3.2cqw]",
          className,
        )}
      >
        {logos.map((logo) => (
          <LogoImage
            key={logo.id}
            logo={logo}
            className="max-h-[7cqh] max-w-[15cqw]"
          />
        ))}
      </div>
    );
  }

  if (layout === "balanced") {
    return (
      <div
        className={cn(
          "flex w-full items-center justify-between gap-[3cqw]",
          className,
        )}
      >
        <LogoImage logo={primary} className="max-h-[9cqh] max-w-[26cqw]" />
        <div className="flex flex-wrap items-center justify-end gap-[2.2cqw]">
          {supporting.map((logo) => (
            <LogoImage
              key={logo.id}
              logo={logo}
              className="max-h-[5cqh] max-w-[11cqw]"
            />
          ))}
        </div>
      </div>
    );
  }

  return null;
}

export function CornerLogos({ logos }: { logos: PublicLogo[] }) {
  if (logos.length === 0) return null;
  const primary = logos.find((logo) => logo.isPrimary) ?? logos[0];
  const rest = logos.filter((logo) => logo.id !== primary.id);

  return (
    <>
      <div className="absolute left-[4cqw] top-[4cqh] z-20">
        <LogoImage
          logo={primary}
          className="max-h-[8cqh] max-w-[20cqw]"
        />
      </div>
      {rest[0] ? (
        <div className="absolute right-[4cqw] top-[4cqh] z-20">
          <LogoImage
            logo={rest[0]}
            className="max-h-[5.5cqh] max-w-[13cqw]"
          />
        </div>
      ) : null}
      {rest[1] ? (
        <div className="absolute bottom-[4cqh] left-[4cqw] z-20">
          <LogoImage
            logo={rest[1]}
            className="max-h-[5.5cqh] max-w-[13cqw]"
          />
        </div>
      ) : null}
      {rest[2] ? (
        <div className="absolute bottom-[4cqh] right-[4cqw] z-20">
          <LogoImage
            logo={rest[2]}
            className="max-h-[5.5cqh] max-w-[13cqw]"
          />
        </div>
      ) : null}
      {rest[3] ? (
        <div className="absolute bottom-[4cqh] left-1/2 z-20 -translate-x-1/2">
          <LogoImage
            logo={rest[3]}
            className="max-h-[5cqh] max-w-[12cqw]"
          />
        </div>
      ) : null}
    </>
  );
}
