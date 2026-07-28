import Link from "next/link";
import { BrandWordmark } from "@/components/BrandWordmark";
import { MarketingMobileNav } from "@/components/MarketingMobileNav";

/**
 * Perch — marketing homepage.
 *
 * Self-contained: all styles are scoped under `.perch-home` (set on the
 * <style> below) so nothing leaks into the admin / cafe / portal pages that
 * share globals.css. No external CSS or client JS required.
 *
 * To change copy or prices, edit the JSX directly. Brand color lives in the
 * --accent / --accent-* variables at the top of the <style> block.
 */

const demoPortalHref =
  "/p/demo-cafe?id=AA:BB:CC:DD:EE:FF&ap=11:22:33:44:55:66&ssid=DemoGuest&url=https%3A%2F%2Fwww.google.com";

const ArrowRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const Wifi = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
  </svg>
);

export default function HomePage() {
  return (
    <div className="perch-home">
      <style>{CSS}</style>
      <a className="skip-link" href="#top">Skip to main content</a>

      {/* ============================ NAV ============================ */}
      <header className="nav">
        <div className="wrap nav__inner">
          <Link href="/" className="brand" aria-label="Perch home">
            <BrandWordmark className="brand__wordmark" width={118} height={52} priority />
          </Link>
          <nav className="nav__links" aria-label="Main">
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#privacy">Privacy</a>
            <a href="#faq">FAQ</a>
          </nav>
          <MarketingMobileNav />
          <div className="nav__right">
            <Link href="/cafe/login" className="nav__login">Café login</Link>
            <Link href="/cafe/signup" className="btn btn--primary">Sign up</Link>
          </div>
        </div>
      </header>

      <main id="top">
        {/* ============================ HERO ============================ */}
        <section className="hero">
          <div className="wrap hero__grid">
            <div className="hero__copy">
              <span className="hero__eyebrow"><span className="dot" />Guest Wi-Fi, reimagined for cafés</span>
              <h1>The first hour&apos;s on you. The <em>afternoon</em> pays rent.</h1>
              <p className="hero__lede lede">Perch turns the guest Wi-Fi you already run into quiet, automatic income. Every guest gets a free hour, every day. Stay longer, and they can pay for it in two taps, without ever flagging down a barista.</p>
              <div className="hero__actions">
                <Link href="/cafe/signup" className="btn btn--primary">Sign up <ArrowRight /></Link>
                <a href="#how" className="btn btn--ghost">See how it works</a>
              </div>
              <div className="hero__trust">
                <span><Check />No hardware</span>
                <span className="sep" />
                <span><Check />No upfront cost</span>
                <span className="sep" />
                <span><Check />Runs on your UniFi network</span>
              </div>
            </div>

            {/* hero visual */}
            <div className="hero__stage" aria-hidden="true">
              <div className="phone">
                <div className="phone__notch" />
                <div className="phone__screen">
                  <div className="portal">
                    <div className="portal__brand"><span className="pill" />Mockingbird Coffee</div>
                    <div className="portal__head">
                      <p className="portal__eyebrow">Free hour · used today</p>
                      <h2 className="portal__title">Enjoying the spot? Stay a while.</h2>
                      <p className="portal__sub">Your free hour&apos;s up for today. Grab more time whenever you like. No account needed.</p>
                    </div>
                    <div className="portal__plans">
                      <div className="plan plan--featured">
                        <div><div className="plan__label">2 more hours</div><div className="plan__meta">Most popular</div></div>
                        <div className="plan__price">$5</div>
                      </div>
                      <div className="plan">
                        <div><div className="plan__label">Rest of the day</div><div className="plan__meta">Until close</div></div>
                        <div className="plan__price">$8</div>
                      </div>
                    </div>
                    <div className="portal__pay">
                      <div className="portal__btn">Continue</div>
                      <p className="portal__foot">Secure payment by Stripe</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="chip chip--dash">
                <div className="chip__label">Today at Mockingbird</div>
                <div className="chip__big">$148<small> earned</small></div>
                <div className="chip__rows">
                  <div className="chip__row"><span>Free hours</span><strong>132</strong></div>
                  <div className="chip__row"><span>Paid passes</span><strong>21</strong></div>
                  <div className="chip__row"><span>Comps</span><strong>9</strong></div>
                </div>
              </div>

              <div className="chip chip--grant">
                <div className="chip__icon"><Wifi /></div>
                <div>
                  <div className="chip__grant-title">Free hour granted</div>
                  <div className="chip__grant-sub">Automatically · no tap needed</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================== NO-UPFRONT BANNER ====================== */}
        <section className="banner section--tight" id="model">
          <div className="wrap banner__inner">
            <div>
              <h2>$0 to start. We only make money <em>when you do.</em></h2>
            </div>
            <div className="banner__body">
              <p style={{ marginBottom: "22px" }}>No setup fee. No monthly bill. No contract. Perch keeps a small share of paid Wi-Fi passes, and nothing at all until those passes sell.</p>
              <div className="banner__stats">
                <div className="banner__stat"><strong>$0</strong><span>to install &amp; run</span></div>
                <div className="banner__stat"><strong>$0</strong><span>per month, forever</span></div>
                <div className="banner__stat"><strong>You</strong><span>keep most of every pass</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================ PROBLEM ============================ */}
        <section className="section problem">
          <div className="wrap problem__grid">
            <div>
              <p className="kicker">The all-day table</p>
              <h2>One drip coffee. Six hours. Your best seat by the <em>window.</em></h2>
            </div>
            <div className="problem__body">
              <p>Every café has them: the laptop regulars who buy a small coffee at nine and pack up at three. You don&apos;t want to be the place that polices outlets, hovers, or stares people toward the door. That&apos;s not the room you&apos;re trying to build.</p>
              <p>But that table, that outlet, and your fastest megabits aren&apos;t free. When a single cup holds a four-top through the lunch rush, the math quietly stops working.</p>
              <p><strong>Perch fixes it without a single awkward conversation.</strong> The free hour keeps your café generous and welcoming. After that, the Wi-Fi gently asks the long-stayers to chip in, so the seat earns its keep, and your staff never has to ask.</p>
            </div>
          </div>
        </section>

        {/* ========================= HOW IT WORKS ========================= */}
        <section className="section how" id="how">
          <div className="wrap">
            <div className="how__head">
              <p className="kicker">How it works</p>
              <h2>Quiet by design. It only speaks up when there&apos;s time worth selling.</h2>
            </div>
            <div className="steps">
              <article className="step">
                <div className="step__num">1</div>
                <span className="step__line" />
                <h3>Guests connect like always</h3>
                <p>They join your guest network and land on a clean page with your café&apos;s name on it. No accounts, no app, no email to hand over.</p>
              </article>
              <article className="step">
                <div className="step__num">2</div>
                <span className="step__line" />
                <h3>The free hour just happens</h3>
                <p>Sixty minutes of Wi-Fi, granted automatically, once a day. No &ldquo;start&rdquo; button, no friction. It feels like the Wi-Fi was simply free.</p>
              </article>
              <article className="step">
                <div className="step__num">3</div>
                <h3>Longer stays pay their way</h3>
                <p>When the hour&apos;s up, guests buy more time in two taps, or a barista drops in a comp code. You set the prices and keep the lion&apos;s share.</p>
              </article>
            </div>
          </div>
        </section>

        {/* ===================== PRICING / PROFIT SHARE ===================== */}
        <section className="section pricing" id="pricing">
          <div className="wrap">
            <div className="pricing__head">
              <p className="kicker">Pricing</p>
              <h2>You set the prices. You keep <em>most</em> of every pass.</h2>
            </div>
            <div className="pricing__cards">
              <div className="pcard pcard--hero">
                <span className="pcard__tag">What you pay Perch upfront</span>
                <div className="pcard__num">$0</div>
                <p className="pcard__desc">No setup, no monthly fee, no contract. Getting started costs you nothing, and it stays that way.</p>
              </div>
              <div className="pcard">
                <span className="pcard__tag">What guests pay</span>
                <div className="pcard__numlabel">You decide.</div>
                <p className="pcard__desc">Set your own prices for extra time. A couple of sensible defaults to start with:</p>
                <div className="pcard__eg">
                  <div className="pcard__egrow"><span>2 more hours</span><strong>$5</strong></div>
                  <div className="pcard__egrow"><span>Rest of the day</span><strong>$8</strong></div>
                </div>
              </div>
              <div className="pcard">
                <span className="pcard__tag">What Perch keeps</span>
                <div className="pcard__numlabel">A small share.</div>
                <p className="pcard__desc">We take a modest platform fee on paid passes only. When the table doesn&apos;t sell time, we earn nothing. Your interests and ours point the same way.</p>
              </div>
            </div>
            <p className="pricing__note">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
              Payments run through Stripe, straight into your account. Perch&apos;s share is deducted automatically, with no invoices to chase.
            </p>
          </div>
        </section>

        {/* ============================ FEATURES ============================ */}
        <section className="section features">
          <div className="wrap">
            <div className="features__head">
              <p className="kicker">Built for the people behind the counter</p>
              <h2>Everything you need. Nothing you&apos;ll have to babysit.</h2>
            </div>
            <div className="fgrid">
              <article className="feat">
                <div className="feat__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="6" rx="1" /><rect x="13" y="7" width="3" height="10" rx="1" /></svg></div>
                <div>
                  <h3>A dashboard you&apos;ll actually read</h3>
                  <p>Free hours given, paid passes, comps, and revenue, today and this month, at a glance. No spreadsheets required.</p>
                </div>
              </article>
              <article className="feat">
                <div className="feat__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="15" r="4" /><path d="m10.85 12.15 7.65-7.65M16 7l2 2M14 9l2 2" /></svg></div>
                <div>
                  <h3>Staff codes in one tap</h3>
                  <p>Comp a regular, hand a friend the afternoon, or open things up for an event, straight from the counter, no manager needed.</p>
                </div>
              </article>
              <article className="feat">
                <div className="feat__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" /><path d="M2 9h20l-1.5 10a2 2 0 0 1-2 1.7H5.5a2 2 0 0 1-2-1.7Z" /><path d="M12 13v4" /></svg></div>
                <div>
                  <h3>Branded as yours</h3>
                  <p>Your café&apos;s name and look on the page guests see. Perch stays in the background where it belongs. It&apos;s your room, not ours.</p>
                </div>
              </article>
              <article className="feat">
                <div className="feat__icon"><Wifi /></div>
                <div>
                  <h3>Runs on what you have</h3>
                  <p>Works with the UniFi guest Wi-Fi you&apos;re already running. Point it at Perch, set your prices, and you&apos;re live, usually the same afternoon.</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ============================ PRIVACY ============================ */}
        <section className="section privacy" id="privacy">
          <div className="wrap privacy__grid">
            <div>
              <p className="kicker">Privacy, on purpose</p>
              <h2>We sell software to cafés, not <em>data</em> about your guests.</h2>
              <p className="privacy__body">Perch never logs browsing history, inspects traffic, or builds profiles. Guests get on the Wi-Fi; that&apos;s the whole relationship. It&apos;s the kind of thing you can say to a customer&apos;s face, and mean it.</p>
            </div>
            <ul className="privacy__list">
              {["No browsing history or DNS logs", "No traffic or packet inspection", "No customer accounts or tracking app", "No mailing list you didn\u2019t ask for"].map((t) => (
                <li key={t}>
                  <span className="x"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg></span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ============================== FAQ ============================== */}
        <section className="section faq" id="faq">
          <div className="wrap faq__grid">
            <div>
              <p className="kicker">Good questions</p>
              <h2>The things cafés ask first.</h2>
            </div>
            <div className="faq__list">
              <details className="faq__item" open>
                <summary className="faq__q">Do I need to buy anything?</summary>
                <div className="faq__a">No. Perch runs on the UniFi guest Wi-Fi you already have. There&apos;s no hardware to install and nothing to pay upfront. You point your guest portal at Perch and set your prices.</div>
              </details>
              <details className="faq__item">
                <summary className="faq__q">What does it actually cost me?</summary>
                <div className="faq__a">Nothing to start, and nothing monthly. Perch keeps a small share of paid Wi-Fi passes. If no one ever buys more time, you owe nothing. We only earn alongside you.</div>
              </details>
              <details className="faq__item">
                <summary className="faq__q">Will my regulars be annoyed?</summary>
                <div className="faq__a">The first hour is free, every day, for everyone. Most guests never see a paywall at all. Only the genuinely long stays are ever asked to pay, and even then it&apos;s a friendly two taps, not a lecture.</div>
              </details>
              <details className="faq__item">
                <summary className="faq__q">How do guests pay?</summary>
                <div className="faq__a">Two taps through Stripe Checkout, right on their phone. No app to download, no account to create, no card details handed to a barista.</div>
              </details>
              <details className="faq__item">
                <summary className="faq__q">Can I comp someone for free?</summary>
                <div className="faq__a">Always. Staff codes let anyone behind the counter grant free time instantly, whether for a regular, a friend, a meeting, or a slow Tuesday. You stay in control of the room.</div>
              </details>
              <details className="faq__item">
                <summary className="faq__q">How long does setup take?</summary>
                <div className="faq__a">Most cafés are live the same afternoon. Point your UniFi guest portal at Perch, set your prices, and that&apos;s it. We&apos;ll walk you through it on the call.</div>
              </details>
            </div>
          </div>
        </section>

        {/* ============================ FINAL CTA ============================ */}
        <section className="section cta" id="contact">
          <div className="wrap cta__inner">
            <p className="kicker">Let&apos;s talk</p>
            <h2>Ready to let the long stays <em>pay for themselves?</em></h2>
            <p className="cta__sub">Fifteen minutes is all it takes to see Perch running on your own café&apos;s Wi-Fi. No pressure, no setup fee, no catch.</p>
            <div className="cta__actions">
              <Link href="/cafe/signup" className="btn btn--on-dark">Sign up <ArrowRight /></Link>
              <Link href={demoPortalHref} className="btn btn--ghost-dark">See the live demo</Link>
            </div>
          </div>
        </section>
      </main>

      {/* ============================ FOOTER ============================ */}
      <footer className="footer">
        <div className="wrap">
          <div className="footer__top">
            <div>
              <div className="footer__brand">
                <BrandWordmark className="footer__wordmark" width={122} height={53} />
              </div>
              <p className="footer__tag">Guest Wi-Fi that pays for itself: generous to your guests, gentle on your tables.</p>
            </div>
            <div className="footer__col">
              <h4>Product</h4>
              <a href="#how">How it works</a>
              <a href="#pricing">Pricing</a>
              <a href="#privacy">Privacy</a>
              <a href="#faq">FAQ</a>
            </div>
            <div className="footer__col">
              <h4>For cafés</h4>
              <Link href="/cafe/signup">Sign up</Link>
              <a href="#contact">Book a call</a>
              <Link href="/cafe/login">Café login</Link>
              <a href="mailto:hello@perch.coffee">Contact us</a>
            </div>
          </div>
          <div className="footer__bottom">
            <span>© {new Date().getFullYear()} Perch. All rights reserved.</span>
            <span>Made for independent cafés.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* =========================================================
   Scoped styles — everything lives under `.perch-home`
   ========================================================= */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,360..600;1,6..72,360..560&family=Hanken+Grotesk:wght@400;500;560;600&display=swap');

.perch-home {
  /* surfaces */
  --paper: oklch(0.973 0.009 83);
  --paper-2: oklch(0.952 0.012 80);
  --surface: oklch(0.995 0.004 85);
  --ink: oklch(0.245 0.014 70);
  --ink-2: oklch(0.415 0.013 72);
  --muted: oklch(0.565 0.012 75);
  --line: oklch(0.885 0.012 80);
  --line-soft: oklch(0.925 0.010 80);
  /* accent — pine green */
  --accent: oklch(0.455 0.062 158);
  --accent-deep: oklch(0.375 0.058 158);
  --accent-ink: oklch(0.995 0.004 85);
  --accent-soft: oklch(0.945 0.022 158);
  --accent-line: oklch(0.870 0.030 158);
  --gold: oklch(0.745 0.085 78);
  /* geometry */
  --r-sm: 8px; --r-md: 12px; --r-lg: 18px; --r-xl: 26px;
  --maxw: 1160px; --gutter: clamp(20px, 5vw, 56px);
  --sh-sm: 0 1px 2px oklch(0.3 0.02 70 / 0.06), 0 2px 6px oklch(0.3 0.02 70 / 0.05);
  --sh-md: 0 4px 14px oklch(0.3 0.02 70 / 0.07), 0 12px 34px oklch(0.3 0.02 70 / 0.08);
  --sh-lg: 0 8px 24px oklch(0.3 0.02 70 / 0.10), 0 30px 60px oklch(0.3 0.02 70 / 0.12);
  --ease: cubic-bezier(0.2, 0.7, 0.2, 1);
  --plus: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 5v14M5 12h14' stroke='black' stroke-width='2.6' stroke-linecap='round'/%3E%3C/svg%3E");

  min-height: 100vh;
  background: var(--paper);
  color: var(--ink);
  font-family: "Hanken Grotesk", system-ui, sans-serif;
  font-size: 17px;
  line-height: 1.6;
  font-feature-settings: "ss01";
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
.perch-home *, .perch-home *::before, .perch-home *::after { box-sizing: border-box; }
.perch-home h1, .perch-home h2, .perch-home h3 {
  font-family: "Newsreader", Georgia, serif; font-weight: 460; font-style: normal;
  letter-spacing: -0.01em; line-height: 1.06; color: var(--ink); margin: 0; text-wrap: balance;
}
.perch-home p { margin: 0; text-wrap: pretty; }
.perch-home a { color: inherit; text-decoration: none; }
.perch-home ::selection { background: var(--accent-soft); color: var(--accent-deep); }
.perch-home [id] { scroll-margin-top: 86px; }
.perch-home .skip-link { position: fixed; top: 10px; left: 10px; z-index: 100; transform: translateY(-160%); border-radius: var(--r-sm); background: var(--ink); color: var(--paper); padding: 10px 14px; font-size: 14px; font-weight: 600; transition: transform .15s var(--ease); }
.perch-home .skip-link:focus { transform: translateY(0); }

.perch-home .wrap { width: 100%; max-width: var(--maxw); margin-inline: auto; padding-inline: var(--gutter); }
.perch-home .section { padding-block: clamp(64px, 9vw, 128px); }
.perch-home .section--tight { padding-block: clamp(48px, 6vw, 84px); }
.perch-home .kicker { font-size: 12.5px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent-deep); display: inline-flex; align-items: center; gap: 9px; margin: 0 0 18px; }
.perch-home .kicker::before { content: ""; width: 22px; height: 1.5px; background: var(--accent); display: inline-block; }
.perch-home .lede { font-size: clamp(18px, 2vw, 21px); color: var(--ink-2); line-height: 1.5; }

.perch-home .btn { display: inline-flex; align-items: center; gap: 9px; font: inherit; font-weight: 560; font-size: 15.5px; padding: 13px 22px; border-radius: var(--r-md); border: 1px solid transparent; cursor: pointer; transition: transform .18s var(--ease), background .2s var(--ease), box-shadow .2s var(--ease), border-color .2s var(--ease); white-space: nowrap; }
.perch-home .btn svg { width: 17px; height: 17px; }
.perch-home .btn--primary { background: var(--accent); color: var(--accent-ink); box-shadow: 0 1px 2px oklch(0.3 0.02 70 / 0.12); }
.perch-home .btn--primary:hover { background: var(--accent-deep); transform: translateY(-1px); box-shadow: var(--sh-md); }
.perch-home .btn--ghost { background: transparent; color: var(--ink); border-color: var(--line); }
.perch-home .btn--ghost:hover { border-color: var(--ink-2); background: oklch(1 0 0 / 0.4); transform: translateY(-1px); }
.perch-home .btn--on-dark { background: var(--surface); color: var(--ink); }
.perch-home .btn--on-dark:hover { transform: translateY(-1px); box-shadow: var(--sh-md); }
.perch-home .btn--ghost-dark { background: transparent; color: var(--paper); border-color: oklch(1 0 0 / 0.25); }
.perch-home .btn--ghost-dark:hover { border-color: oklch(1 0 0 / 0.55); background: oklch(1 0 0 / 0.06); }

/* nav */
.perch-home .nav { position: sticky; top: 0; z-index: 50; background: oklch(0.973 0.009 83 / 0.82); backdrop-filter: saturate(1.3) blur(14px); border-bottom: 1px solid var(--line-soft); }
.perch-home .nav__inner { position: relative; display: flex; align-items: center; justify-content: space-between; height: 70px; }
.perch-home .brand { display: inline-flex; align-items: center; }
.perch-home .brand__wordmark { display: block; width: 118px; height: auto; }
.perch-home .nav__links { display: flex; align-items: center; gap: 30px; }
.perch-home .nav__links a { font-size: 15px; color: var(--ink-2); transition: color .2s; }
.perch-home .nav__links a:hover { color: var(--ink); }
.perch-home .nav__right { display: flex; align-items: center; gap: 18px; }
.perch-home .nav__login { font-size: 15px; color: var(--ink-2); transition: color .2s; }
.perch-home .nav__login:hover { color: var(--ink); }
.perch-home .nav__mobile { display: none; position: relative; margin-left: auto; margin-right: 16px; }
.perch-home .nav__menu-button { display: inline-flex; align-items: center; gap: 7px; border: 0; background: transparent; color: var(--ink-2); padding: 9px 2px; font: inherit; font-size: 14px; font-weight: 560; }
.perch-home .nav__menu-button svg { width: 17px; height: 17px; }
.perch-home .nav__mobile-panel { position: absolute; top: calc(100% + 12px); right: 0; display: grid; width: min(250px, calc(100vw - 40px)); overflow: hidden; border: 1px solid var(--line); border-radius: var(--r-md); background: var(--surface); box-shadow: var(--sh-md); }
.perch-home .nav__mobile-panel a { padding: 12px 16px; border-bottom: 1px solid var(--line-soft); color: var(--ink-2); font-size: 15px; }
.perch-home .nav__mobile-panel a:last-child { border-bottom: 0; }
.perch-home .nav__mobile-panel a:hover { background: var(--paper-2); color: var(--ink); }
@media (max-width: 880px) { .perch-home .nav__links { display: none; } .perch-home .nav__mobile { display: block; } }
@media (max-width: 560px) { .perch-home .nav__login { display: none; } .perch-home .brand__wordmark { width: 104px; } .perch-home .nav__mobile { margin-right: 10px; } }

/* hero */
.perch-home .hero { padding-top: clamp(48px, 7vw, 92px); padding-bottom: clamp(56px, 8vw, 110px); position: relative; overflow: hidden; }
.perch-home .hero__grid { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: clamp(36px, 5vw, 84px); align-items: center; }
.perch-home .hero__eyebrow { display: inline-flex; align-items: center; gap: 9px; font-size: 13.5px; font-weight: 560; color: var(--accent-deep); background: var(--accent-soft); border: 1px solid var(--accent-line); padding: 6px 13px; border-radius: 999px; margin-bottom: 26px; }
.perch-home .hero__eyebrow .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); }
.perch-home .hero h1 { font-size: clamp(42px, 6.4vw, 76px); font-weight: 440; }
.perch-home .hero h1 em { font-style: italic; color: var(--accent-deep); font-weight: 440; }
.perch-home .hero__lede { margin-top: 26px; max-width: 33ch; }
.perch-home .hero__actions { margin-top: 36px; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.perch-home .hero__trust { margin-top: 26px; display: flex; align-items: center; gap: 18px; flex-wrap: wrap; font-size: 14px; color: var(--muted); }
.perch-home .hero__trust span { display: inline-flex; align-items: center; gap: 7px; }
.perch-home .hero__trust svg { width: 15px; height: 15px; color: var(--accent); }
.perch-home .hero__trust .sep { width: 4px; height: 4px; border-radius: 50%; background: var(--line); }
@media (max-width: 900px) { .perch-home .hero__grid { grid-template-columns: 1fr; gap: 52px; } .perch-home .hero__lede { max-width: 46ch; } }

.perch-home .hero__stage { position: relative; display: flex; justify-content: center; align-items: center; min-height: 460px; }
.perch-home .hero__stage::before { content: ""; position: absolute; inset: -8% -12%; background: radial-gradient(58% 52% at 62% 38%, var(--accent-soft), transparent 72%); opacity: 0.85; z-index: 0; }
.perch-home .phone { position: relative; z-index: 2; width: 268px; aspect-ratio: 287 / 600; background: var(--ink); border-radius: 38px; padding: 10px; box-shadow: var(--sh-lg); }
.perch-home .phone__screen { position: relative; height: 100%; width: 100%; background: var(--paper); border-radius: 30px; overflow: hidden; display: flex; flex-direction: column; }
.perch-home .phone__notch { position: absolute; top: 9px; left: 50%; transform: translateX(-50%); width: 78px; height: 20px; background: var(--ink); border-radius: 999px; z-index: 3; }
.perch-home .portal { padding: 30px 22px 22px; display: flex; flex-direction: column; height: 100%; }
.perch-home .portal__brand { display: flex; align-items: center; gap: 8px; font-family: "Newsreader", serif; font-size: 15px; font-weight: 520; }
.perch-home .portal__brand .pill { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
.perch-home .portal__head { margin-top: 26px; }
.perch-home .portal__eyebrow { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); font-weight: 600; }
.perch-home .portal__title { font-family: "Newsreader", serif; font-size: 22px; line-height: 1.12; margin-top: 8px; font-weight: 460; }
.perch-home .portal__sub { font-size: 12.5px; color: var(--ink-2); margin-top: 8px; line-height: 1.45; }
.perch-home .portal__plans { margin-top: 18px; display: flex; flex-direction: column; gap: 10px; }
.perch-home .plan { display: flex; align-items: center; justify-content: space-between; border: 1px solid var(--line); background: var(--surface); border-radius: var(--r-md); padding: 12px 14px; transition: border-color .2s; }
.perch-home .plan--featured { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.perch-home .plan__label { font-size: 13px; font-weight: 540; }
.perch-home .plan__meta { font-size: 11px; color: var(--muted); margin-top: 1px; }
.perch-home .plan__price { font-family: "Newsreader", serif; font-size: 18px; font-weight: 520; }
.perch-home .portal__pay { margin-top: auto; padding-top: 16px; }
.perch-home .portal__btn { width: 100%; text-align: center; background: var(--accent); color: var(--accent-ink); font-size: 13.5px; font-weight: 580; padding: 12px; border-radius: var(--r-md); }
.perch-home .portal__foot { text-align: center; font-size: 10.5px; color: var(--muted); margin-top: 11px; }
.perch-home .chip { position: absolute; z-index: 3; background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-lg); box-shadow: var(--sh-md); padding: 15px 17px; }
.perch-home .chip--dash { top: 6px; right: -30px; width: 200px; }
.perch-home .chip--grant { bottom: 34px; left: -26px; width: 184px; display: flex; align-items: center; gap: 11px; padding: 13px 15px; }
.perch-home .chip__label { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); font-weight: 600; }
.perch-home .chip__big { font-family: "Newsreader", serif; font-size: 30px; font-weight: 520; line-height: 1; margin-top: 6px; }
.perch-home .chip__big small { font-size: 14px; color: var(--muted); font-weight: 400; }
.perch-home .chip__rows { margin-top: 12px; display: flex; flex-direction: column; gap: 7px; }
.perch-home .chip__row { display: flex; align-items: center; justify-content: space-between; font-size: 12px; white-space: nowrap; }
.perch-home .chip__row span { color: var(--ink-2); }
.perch-home .chip__row strong { font-weight: 580; }
.perch-home .chip__icon { flex: none; width: 34px; height: 34px; border-radius: 10px; background: var(--accent-soft); color: var(--accent-deep); display: grid; place-items: center; }
.perch-home .chip__icon svg { width: 18px; height: 18px; }
.perch-home .chip__grant-title { font-size: 12.5px; font-weight: 560; }
.perch-home .chip__grant-sub { font-size: 11px; color: var(--muted); margin-top: 1px; }
@media (max-width: 480px) {
  .perch-home .chip--dash { right: 2px; transform: scale(0.9); transform-origin: top right; }
  .perch-home .chip--grant { left: 0; transform: scale(0.9); transform-origin: bottom left; }
}

/* banner */
.perch-home .banner { background: var(--ink); color: var(--paper); position: relative; overflow: hidden; }
.perch-home .banner::after { content: ""; position: absolute; right: -6%; top: -40%; width: 46%; height: 180%; background: radial-gradient(closest-side, oklch(0.455 0.062 158 / 0.30), transparent); }
.perch-home .banner__inner { position: relative; z-index: 1; display: grid; grid-template-columns: 1.1fr 1fr; gap: clamp(28px, 5vw, 72px); align-items: center; }
.perch-home .banner h2 { color: var(--paper); font-size: clamp(30px, 4.2vw, 50px); font-weight: 440; }
.perch-home .banner h2 em { font-style: italic; color: oklch(0.78 0.07 158); }
.perch-home .banner__body { color: oklch(0.86 0.012 80); font-size: 17px; line-height: 1.6; }
.perch-home .banner__stats { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 4px; }
.perch-home .banner__stat { flex: 1 1 120px; border: 1px solid oklch(1 0 0 / 0.14); border-radius: var(--r-md); padding: 18px; }
.perch-home .banner__stat strong { display: block; font-family: "Newsreader", serif; font-size: 30px; font-weight: 520; line-height: 1; }
.perch-home .banner__stat span { display: block; font-size: 13px; color: oklch(0.82 0.012 80); margin-top: 8px; }
@media (max-width: 820px) { .perch-home .banner__inner { grid-template-columns: 1fr; gap: 30px; } }

/* problem */
.perch-home .problem__grid { display: grid; grid-template-columns: 0.85fr 1.15fr; gap: clamp(32px, 6vw, 88px); align-items: start; }
.perch-home .problem h2 { font-size: clamp(32px, 4.6vw, 56px); font-weight: 430; }
.perch-home .problem h2 em { font-style: italic; color: var(--accent-deep); }
.perch-home .problem__body { display: flex; flex-direction: column; gap: 20px; max-width: 56ch; }
.perch-home .problem__body p { color: var(--ink-2); font-size: 18px; line-height: 1.62; }
.perch-home .problem__body strong { color: var(--ink); font-weight: 600; }
@media (max-width: 820px) { .perch-home .problem__grid { grid-template-columns: 1fr; gap: 28px; } }

/* how */
.perch-home .how { background: var(--paper-2); border-block: 1px solid var(--line-soft); }
.perch-home .how__head { max-width: 60ch; margin-bottom: clamp(40px, 5vw, 64px); }
.perch-home .how__head h2 { font-size: clamp(30px, 4vw, 48px); margin-top: 4px; }
.perch-home .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(20px, 3vw, 36px); }
.perch-home .step { position: relative; background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-lg); padding: 30px 26px 28px; transition: transform .25s var(--ease), box-shadow .25s var(--ease); }
.perch-home .step:hover { transform: translateY(-3px); box-shadow: var(--sh-md); }
.perch-home .step__num { font-family: "Newsreader", serif; font-size: 16px; font-weight: 560; color: var(--accent-deep); width: 38px; height: 38px; border-radius: 50%; border: 1px solid var(--accent-line); background: var(--accent-soft); display: grid; place-items: center; margin-bottom: 22px; }
.perch-home .step h3 { font-family: "Hanken Grotesk", sans-serif; font-size: 19px; font-weight: 600; letter-spacing: -0.005em; }
.perch-home .step p { margin-top: 11px; color: var(--ink-2); font-size: 15.5px; line-height: 1.58; }
.perch-home .step__line { position: absolute; top: 49px; right: -22px; width: 22px; height: 1px; background: var(--line); }
@media (max-width: 820px) { .perch-home .steps { grid-template-columns: 1fr; } .perch-home .step__line { display: none; } }

/* pricing */
.perch-home .pricing__head { text-align: center; max-width: 30ch; margin: 0 auto clamp(44px, 5vw, 66px); }
.perch-home .pricing__head .kicker { justify-content: center; }
.perch-home .pricing__head h2 { font-size: clamp(32px, 4.4vw, 54px); }
.perch-home .pricing__head h2 em { font-style: italic; color: var(--accent-deep); }
.perch-home .pricing__cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.perch-home .pcard { background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-lg); padding: 30px 28px; display: flex; flex-direction: column; }
.perch-home .pcard--hero { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); position: relative; }
.perch-home .pcard__tag { font-size: 13px; font-weight: 560; color: var(--ink-2); }
.perch-home .pcard--hero .pcard__tag { color: oklch(1 0 0 / 0.8); }
.perch-home .pcard__num { font-family: "Newsreader", serif; font-size: clamp(46px, 6vw, 64px); font-weight: 500; line-height: 0.95; margin: 16px 0 4px; }
.perch-home .pcard__numlabel { font-family: "Newsreader", serif; font-size: 28px; font-weight: 500; margin: 16px 0 4px; }
.perch-home .pcard__desc { font-size: 15px; color: var(--ink-2); line-height: 1.55; margin-top: 10px; }
.perch-home .pcard--hero .pcard__desc { color: oklch(1 0 0 / 0.85); }
.perch-home .pcard__eg { margin-top: auto; padding-top: 18px; }
.perch-home .pcard__egrow { display: flex; align-items: baseline; justify-content: space-between; padding: 9px 0; border-top: 1px solid var(--line-soft); font-size: 14px; }
.perch-home .pcard__egrow:first-child { border-top: none; }
.perch-home .pcard__egrow span { color: var(--muted); }
.perch-home .pcard__egrow strong { font-family: "Newsreader", serif; font-size: 17px; font-weight: 540; }
.perch-home .pricing__note { margin-top: 26px; text-align: center; font-size: 15px; color: var(--muted); display: flex; align-items: center; justify-content: center; gap: 9px; }
.perch-home .pricing__note svg { width: 17px; height: 17px; color: var(--accent); flex: none; }
@media (max-width: 820px) { .perch-home .pricing__cards { grid-template-columns: 1fr; } }

/* features */
.perch-home .features { background: var(--paper-2); border-block: 1px solid var(--line-soft); }
.perch-home .features__head { max-width: 56ch; margin-bottom: clamp(40px, 5vw, 60px); }
.perch-home .features__head h2 { font-size: clamp(30px, 4vw, 48px); margin-top: 4px; }
.perch-home .fgrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px; background: var(--line-soft); border: 1px solid var(--line-soft); border-radius: var(--r-lg); overflow: hidden; }
.perch-home .feat { background: var(--surface); padding: 32px 30px; display: flex; gap: 18px; transition: background .2s; }
.perch-home .feat:hover { background: var(--paper); }
.perch-home .feat__icon { flex: none; width: 44px; height: 44px; border-radius: 12px; background: var(--accent-soft); color: var(--accent-deep); display: grid; place-items: center; }
.perch-home .feat__icon svg { width: 21px; height: 21px; }
.perch-home .feat h3 { font-family: "Hanken Grotesk", sans-serif; font-size: 18.5px; font-weight: 600; letter-spacing: -0.005em; }
.perch-home .feat p { margin-top: 8px; color: var(--ink-2); font-size: 15px; line-height: 1.56; }
@media (max-width: 720px) { .perch-home .fgrid { grid-template-columns: 1fr; } }

/* privacy */
.perch-home .privacy__grid { display: grid; grid-template-columns: 1fr 0.9fr; gap: clamp(32px, 5vw, 72px); align-items: center; }
.perch-home .privacy h2 { font-size: clamp(30px, 4.2vw, 50px); }
.perch-home .privacy h2 em { font-style: italic; color: var(--accent-deep); }
.perch-home .privacy__body { margin-top: 22px; color: var(--ink-2); font-size: 18px; line-height: 1.6; max-width: 50ch; }
.perch-home .privacy__list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 2px; background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-lg); overflow: hidden; }
.perch-home .privacy__list li { display: flex; align-items: center; gap: 13px; padding: 17px 22px; border-bottom: 1px solid var(--line-soft); font-size: 15.5px; }
.perch-home .privacy__list li:last-child { border-bottom: none; }
.perch-home .privacy__list .x { flex: none; width: 24px; height: 24px; border-radius: 50%; background: var(--accent-soft); color: var(--accent-deep); display: grid; place-items: center; }
.perch-home .privacy__list .x svg { width: 14px; height: 14px; }
@media (max-width: 820px) { .perch-home .privacy__grid { grid-template-columns: 1fr; gap: 30px; } }

/* faq */
.perch-home .faq { background: var(--paper-2); border-top: 1px solid var(--line-soft); }
.perch-home .faq__grid { display: grid; grid-template-columns: 0.7fr 1.3fr; gap: clamp(32px, 5vw, 72px); align-items: start; }
.perch-home .faq h2 { font-size: clamp(30px, 4vw, 48px); }
.perch-home .faq__list { border-top: 1px solid var(--line); }
.perch-home .faq__item { border-bottom: 1px solid var(--line); }
.perch-home .faq__q { width: 100%; text-align: left; background: none; border: none; cursor: pointer; font: inherit; font-size: 18px; font-weight: 540; color: var(--ink); padding: 22px 44px 22px 0; position: relative; display: flex; align-items: center; list-style: none; }
.perch-home .faq__q::after { content: ""; position: absolute; right: 6px; top: 50%; width: 13px; height: 13px; background: var(--accent-deep); -webkit-mask: var(--plus) center / contain no-repeat; mask: var(--plus) center / contain no-repeat; transform: translateY(-50%) rotate(0deg); transition: transform .3s var(--ease); }
.perch-home .faq__item[open] .faq__q::after { transform: translateY(-50%) rotate(45deg); }
.perch-home .faq__q::-webkit-details-marker { display: none; }
.perch-home .faq__a { padding: 0 44px 24px 0; color: var(--ink-2); font-size: 16px; line-height: 1.62; max-width: 62ch; }
@media (max-width: 820px) { .perch-home .faq__grid { grid-template-columns: 1fr; gap: 24px; } }

/* cta */
.perch-home .cta { background: var(--ink); color: var(--paper); text-align: center; position: relative; overflow: hidden; padding-block: clamp(56px, 6vw, 92px); }
.perch-home .cta::before { content: ""; position: absolute; inset: 0; background: radial-gradient(60% 80% at 50% 0%, oklch(0.455 0.062 158 / 0.28), transparent 70%); }
.perch-home .cta__inner { position: relative; z-index: 1; max-width: 640px; margin-inline: auto; }
.perch-home .cta .kicker { justify-content: center; color: oklch(0.78 0.07 158); }
.perch-home .cta .kicker::before { background: oklch(0.78 0.07 158); }
.perch-home .cta h2 { color: var(--paper); font-size: clamp(30px, 3.6vw, 44px); font-weight: 440; }
.perch-home .cta h2 em { font-style: italic; color: oklch(0.82 0.07 158); }
.perch-home .cta__sub { margin: 18px auto 0; max-width: 46ch; color: oklch(0.86 0.012 80); font-size: 17px; }
.perch-home .cta__actions { margin-top: 28px; display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }

/* footer */
.perch-home .footer { background: var(--paper); border-top: 1px solid var(--line); padding-block: clamp(48px, 6vw, 72px) 36px; }
.perch-home .footer__top { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 32px; }
.perch-home .footer__brand { display: inline-flex; align-items: center; }
.perch-home .footer__wordmark { display: block; width: 122px; height: auto; }
.perch-home .footer__tag { margin-top: 16px; color: var(--muted); font-size: 15px; max-width: 30ch; }
.perch-home .footer__col h4 { font-size: 12.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); font-weight: 600; margin: 0 0 16px; }
.perch-home .footer__col a { display: block; color: var(--ink-2); font-size: 15px; padding: 5px 0; transition: color .2s; }
.perch-home .footer__col a:hover { color: var(--accent-deep); }
.perch-home .footer__bottom { margin-top: clamp(40px, 5vw, 60px); padding-top: 24px; border-top: 1px solid var(--line-soft); display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; font-size: 13.5px; color: var(--muted); }
@media (max-width: 760px) { .perch-home .footer__top { grid-template-columns: 1fr 1fr; gap: 32px 24px; } }
@media (max-width: 440px) { .perch-home .footer__top { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) {
  .perch-home *, .perch-home *::before, .perch-home *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
}
`;
