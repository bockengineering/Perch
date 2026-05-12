import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-6 py-10">
      <header className="flex items-center justify-between border-b border-[var(--border)] pb-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
            Perch
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Wi-Fi access that gets out of the way.</h1>
        </div>
        <Link
          href="/admin"
          className="rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white"
        >
          Admin
        </Link>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="surface p-5">
          <h2 className="text-lg font-semibold">UniFi only</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Hosted captive portal plus server-side UniFi authorization.
          </p>
        </div>
        <div className="surface p-5">
          <h2 className="text-lg font-semibold">60 free minutes</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            One automatic free grant per device, per shop, per local day.
          </p>
        </div>
        <div className="surface p-5">
          <h2 className="text-lg font-semibold">Revenue share</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Stripe Connect Checkout powers paid Wi-Fi extensions.
          </p>
        </div>
      </section>

      <section className="surface p-5">
        <h2 className="text-xl font-semibold">Demo portal</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Seed the database, then open the demo captive portal URL to see the mock UniFi flow.
        </p>
        <Link
          className="mt-4 inline-block rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium"
          href="/p/demo-cafe?id=AA:BB:CC:DD:EE:FF&ap=11:22:33:44:55:66&ssid=DemoGuest&url=https%3A%2F%2Fwww.google.com"
        >
          Open demo captive portal
        </Link>
      </section>
    </main>
  );
}
