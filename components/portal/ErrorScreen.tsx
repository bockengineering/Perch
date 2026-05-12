import Link from "next/link";

export function ErrorScreen({
  retryHref,
  supportEmail,
}: {
  retryHref: string;
  supportEmail?: string | null;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <section className="surface w-full max-w-md p-6">
        <h1 className="text-2xl font-semibold">We had trouble connecting you.</h1>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={retryHref}
            className="rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white"
          >
            Try again
          </Link>
          <a
            href={supportEmail ? `mailto:${supportEmail}` : "#"}
            className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold"
          >
            Ask staff
          </a>
        </div>
      </section>
    </main>
  );
}
