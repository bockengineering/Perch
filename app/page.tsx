import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-6xl gap-10 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">Perch</p>
          <h1 className="mt-2 text-3xl font-semibold">Captive Wi-Fi access for cafes.</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/demo" className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold">
            Demo
          </Link>
          <Link href="/cafe" className="rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white">
            Cafe back office
          </Link>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="surface p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Live flow</p>
          <h2 className="mt-3 text-3xl font-semibold">Free access stays invisible until the hour is over.</h2>
          <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
            Perch authorizes eligible guest devices through UniFi, then shows paid extensions or staff codes
            only when today&apos;s free access has already been used.
          </p>
        </div>

        <div className="surface grid gap-4 p-5">
          <div>
            <p className="text-sm text-[var(--muted)]">Default free policy</p>
            <p className="metric mt-2 text-3xl font-semibold">60 min</p>
          </div>
          <div className="border-t border-[var(--border)] pt-4">
            <p className="text-sm text-[var(--muted)]">Provider</p>
            <p className="mt-2 font-semibold">UniFi only</p>
          </div>
          <div className="border-t border-[var(--border)] pt-4">
            <p className="text-sm text-[var(--muted)]">Paid passes</p>
            <p className="mt-2 font-semibold">Stripe Connect</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Link href="/demo" className="surface p-5">
          <p className="text-sm font-semibold">Demo console</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Mock UniFi, mock Stripe, paywall simulator, and local test controls.
          </p>
        </Link>
        <Link href="/cafe" className="surface p-5">
          <p className="text-sm font-semibold">Cafe back office</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Settings, transactions, paid plans, and staff codes for cafe operators.
          </p>
        </Link>
        <Link
          href="/p/demo-cafe?id=AA:BB:CC:DD:EE:FF&ap=11:22:33:44:55:66&ssid=DemoGuest&url=https%3A%2F%2Fwww.google.com"
          className="surface p-5"
        >
          <p className="text-sm font-semibold">Captive portal</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Open the demo guest redirect path and test the customer-facing portal.
          </p>
        </Link>
      </section>
    </main>
  );
}
