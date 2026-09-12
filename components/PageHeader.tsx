import Link from "next/link";

export default function PageHeader({
  title, subtitle, backHref, backLabel = "Back", right,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-1">
      <div className="min-w-0">
        {backHref && (
          <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-[#9fb0d3] hover:text-[#e6ecf5] mb-1">
            <span aria-hidden>←</span>{backLabel}
          </Link>
        )}
        <h1 className="truncate">{title}</h1>
        {subtitle && <div className="text-xs text-[#9fb0d3] mt-0.5">{subtitle}</div>}
      </div>
      {right && <div className="flex flex-wrap gap-2 justify-end shrink-0">{right}</div>}
    </div>
  );
}
