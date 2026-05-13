import Link from "next/link";

export default function DemoConnectedPage() {
  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-5 py-10">
      <section className="surface p-6">
        <p className="text-sm font-semibold text-[var(--accent)]">Demo Cafe</p>
        <h1 className="mt-3 text-3xl font-semibold">Connected</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          The mock UniFi provider accepted the guest authorization. Return to the demo console to try the
          same device again and see the paywall.
        </p>
        <Link
          href="/demo"
          className="mt-6 inline-block rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white"
        >
          Back to demo console
        </Link>
      </section>
    </main>
  );
}
