import Link from "next/link";

export function AppLogo({ href = "/dashboard" }: { href?: string | null }) {
  const content = (
    <>
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm">SA</span>
      <span className="flex flex-col leading-none">
        <span className="text-sm tracking-tight">StarAcc</span>
        <span className="text-xs font-medium text-muted-foreground">Cloud Accounting</span>
      </span>
    </>
  );

  if (!href) {
    return <div className="flex items-center gap-3 font-semibold text-foreground">{content}</div>;
  }

  return (
    <Link href={href} className="flex items-center gap-3 font-semibold text-foreground">
      {content}
    </Link>
  );
}
