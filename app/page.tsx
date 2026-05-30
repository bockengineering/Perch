import { ArrowRight, BarChart3, KeyRound, ShieldCheck, Store, Wifi } from "lucide-react";
import Link from "next/link";

const demoPortalHref =
  "/p/demo-cafe?id=AA:BB:CC:DD:EE:FF&ap=11:22:33:44:55:66&ssid=DemoGuest&url=https%3A%2F%2Fwww.google.com";

const steps = [
  {
    title: "Guests join the cafe Wi-Fi",
    body: "Perch works with the UniFi guest network the cafe already controls.",
  },
  {
    title: "Free access is granted automatically",
    body: "Eligible devices receive the daily free hour without a start button.",
  },
  {
    title: "Paid extensions appear only after the hour ends",
    body: "Stripe Checkout and staff codes handle the cases that need more time.",
  },
];

const operatorFeatures = [
  {
    icon: BarChart3,
    title: "Daily reporting",
    body: "Track free grants, paid passes, voucher use, revenue, and failed authorizations.",
  },
  {
    icon: KeyRound,
    title: "Staff codes",
    body: "Create two-hour, all-day, comp, receipt, and manager override codes from the cafe panel.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy-focused",
    body: "No browsing history, DNS logs, packet inspection, customer accounts, or mobile app.",
  },
];

export default function HomePage() {
  return (
    <main className="sales-page">
      <header className="sales-nav">
        <Link href="/" className="sales-brand" aria-label="Perch home">
          <span className="brand-mark">P</span>
          <span>Perch</span>
        </Link>
        <nav className="sales-links" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#operators">For cafes</a>
          <a href="#pricing">Pricing</a>
          <Link href="/demo">Demo</Link>
        </nav>
        <Link href="/demo" className="sales-nav-cta">
          View demo
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </header>

      <section className="sales-hero">
        <div className="hero-system" aria-hidden="true">
          <div className="network-line" />
          <div className="hero-status hero-status-shop">
            <Store size={18} />
            <span>Demo Cafe</span>
          </div>
          <div className="hero-status hero-status-wifi">
            <Wifi size={18} />
            <span>Guest Wi-Fi authorized</span>
          </div>
          <div className="hero-panel hero-panel-main">
            <div className="panel-row panel-row-head">
              <span>Today</span>
              <strong>$48</strong>
            </div>
            <div className="panel-grid">
              <span>Free grants</span>
              <strong>126</strong>
              <span>Paid passes</span>
              <strong>9</strong>
              <span>Staff codes</span>
              <strong>14</strong>
            </div>
          </div>
          <div className="hero-panel hero-panel-phone">
            <span>Your free Wi-Fi hour for today has ended.</span>
            <strong>$5, 2 more hours</strong>
            <strong>$8, all day</strong>
          </div>
        </div>

        <div className="hero-copy">
          <p className="eyebrow">UniFi captive portal SaaS for coffee shops</p>
          <h1>Perch</h1>
          <p className="hero-lede">
            Free guest Wi-Fi that feels automatic, with paid extensions and staff codes after the daily free hour.
          </p>
          <div className="hero-actions">
            <Link href="/demo" className="primary-action">
              Open demo
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link href="/cafe" className="secondary-action">
              Cafe panel
            </Link>
          </div>
        </div>
      </section>

      <section className="sales-section sales-proof">
        <div>
          <p className="section-kicker">MVP scope</p>
          <h2>Built for one job: guest Wi-Fi revenue without making the first hour annoying.</h2>
        </div>
        <div className="proof-grid">
          <div>
            <strong>60 minutes</strong>
            <span>free per device, per cafe, per local day</span>
          </div>
          <div>
            <strong>UniFi only</strong>
            <span>no router marketplace, no hardware, no POS dependency</span>
          </div>
          <div>
            <strong>Revenue share</strong>
            <span>the cafe pays nothing upfront; paid passes run through Stripe Connect</span>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="sales-section">
        <div className="section-heading">
          <p className="section-kicker">Customer flow</p>
          <h2>The portal stays quiet until it needs to sell more time.</h2>
        </div>
        <div className="step-list">
          {steps.map((step, index) => (
            <article className="step-item" key={step.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="operators" className="sales-section operator-section">
        <div className="section-heading">
          <p className="section-kicker">Cafe operations</p>
          <h2>A simple panel for settings, transactions, and staff access.</h2>
        </div>
        <div className="feature-grid">
          {operatorFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <article className="feature-card" key={feature.title}>
                <Icon size={22} aria-hidden="true" />
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="pricing" className="sales-section pricing-section">
        <div className="section-heading">
          <p className="section-kicker">Cafe economics</p>
          <h2>No upfront cafe fee. Perch earns only when paid Wi-Fi extensions sell.</h2>
        </div>
        <div className="pricing-grid">
          <div className="pricing-block">
            <p>Default customer passes</p>
            <strong>$5 / 2 hours</strong>
            <strong>$8 / all day</strong>
          </div>
          <div className="pricing-block">
            <p>Platform model</p>
            <strong>Stripe Connect</strong>
            <span>Direct charges to the cafe account with an application fee for Perch.</span>
          </div>
          <div className="pricing-block">
            <p>Current constraints</p>
            <strong>UniFi required</strong>
            <span>No Meraki, MikroTik, Omada, OpenWrt, DNS logging, or packet inspection in the MVP.</span>
          </div>
        </div>
      </section>

      <section className="sales-section final-cta">
        <div>
          <p className="section-kicker">Try the front end</p>
          <h2>Use the local demo to see the customer and cafe surfaces before real hardware.</h2>
        </div>
        <div className="hero-actions">
          <Link href="/demo" className="primary-action">
            Demo console
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link href={demoPortalHref} className="secondary-action">
            Captive portal
          </Link>
        </div>
      </section>
    </main>
  );
}
