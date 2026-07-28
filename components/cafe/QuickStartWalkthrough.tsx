"use client";

import { ArrowRight, ExternalLink, X } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";

type QuickStartStep = {
  id: string;
  step: string;
  title: string;
  detail: string;
  complete: boolean;
  action: string;
  href: string;
  external?: boolean;
};

type QuickStartWalkthroughProps = {
  shopId: string;
  steps: QuickStartStep[];
};

function statusTone(status: boolean) {
  return status ? "status-ok" : "status-warning";
}

function dismissedStorageKey(shopId: string) {
  return `perch.quickStart.dismissed.${shopId}`;
}

const dismissedStepsChangeEvent = "perch:quick-start-dismissed";

function readDismissedSteps(shopId: string) {
  try {
    const rawValue = window.localStorage.getItem(dismissedStorageKey(shopId));
    const value = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function dismissedStepsSnapshot(shopId: string) {
  return readDismissedSteps(shopId).join("\n");
}

function parseDismissedStepsSnapshot(snapshot: string) {
  return snapshot ? snapshot.split("\n").filter(Boolean) : [];
}

function subscribeToDismissedSteps(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(dismissedStepsChangeEvent, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(dismissedStepsChangeEvent, onStoreChange);
  };
}

function writeDismissedSteps(shopId: string, dismissedSteps: string[]) {
  try {
    window.localStorage.setItem(dismissedStorageKey(shopId), JSON.stringify(dismissedSteps));
    window.dispatchEvent(new Event(dismissedStepsChangeEvent));
  } catch {
    // Dismissal is a convenience only. If local storage is unavailable, leave the card visible next visit.
  }
}

export function QuickStartWalkthrough({ shopId, steps }: QuickStartWalkthroughProps) {
  const dismissedStepsValue = useSyncExternalStore(
    subscribeToDismissedSteps,
    () => dismissedStepsSnapshot(shopId),
    () => "",
  );
  const dismissedSteps = useMemo(() => parseDismissedStepsSnapshot(dismissedStepsValue), [dismissedStepsValue]);

  const visibleSteps = useMemo(
    () => steps.filter((step) => !(step.complete && dismissedSteps.includes(step.id))),
    [dismissedSteps, steps],
  );

  function dismissStep(stepId: string) {
    const next = Array.from(new Set([...dismissedSteps, stepId]));
    writeDismissedSteps(shopId, next);
  }

  const allStepsComplete = steps.length > 0 && steps.every((step) => step.complete);
  if (allStepsComplete) {
    return (
      <details className="setup-walkthrough-complete">
        <summary>
          <span>
            <span className="dashboard-kicker">Start here</span>
            <strong>Setup complete</strong>
          </span>
          <span>Review {steps.length} steps</span>
        </summary>
        <div className="setup-walkthrough-complete-grid">
          {steps.map((step) => (
            <a
              key={step.id}
              href={step.href}
              target={step.external ? "_blank" : undefined}
              rel={step.external ? "noreferrer" : undefined}
            >
              <span className="setup-step-number">{step.step}</span>
              <span>
                <strong>{step.title}</strong>
                <small>{step.detail}</small>
              </span>
              {step.external ? <ExternalLink size={16} /> : <ArrowRight size={16} />}
            </a>
          ))}
        </div>
      </details>
    );
  }

  if (visibleSteps.length === 0) {
    return null;
  }

  return (
    <section className="setup-walkthrough" aria-labelledby="setup-walkthrough-title">
      <div className="setup-walkthrough-header">
        <div>
          <p className="dashboard-kicker">Start here</p>
          <h2 id="setup-walkthrough-title">Set up guest Wi-Fi</h2>
        </div>
        <p>
          Connect Perch to the cafe&apos;s UniFi account, choose the guest Wi-Fi names customers use,
          check the connection, then preview the guest page before going live.
        </p>
      </div>
      <div className="setup-walkthrough-grid">
        {visibleSteps.map((step) => (
          <article key={step.id} className="setup-walkthrough-card">
            <div className="setup-walkthrough-card-header">
              <span className="setup-step-number">{step.step}</span>
              <div className="setup-walkthrough-status">
                <span className={`status-pill ${statusTone(step.complete)}`}>
                  {step.complete ? "Done" : "Next"}
                </span>
                {step.complete ? (
                  <button
                    type="button"
                    className="setup-walkthrough-dismiss"
                    aria-label={`Dismiss ${step.title}`}
                    onClick={() => dismissStep(step.id)}
                  >
                    <X size={15} />
                  </button>
                ) : null}
              </div>
            </div>
            <div>
              <h3>{step.title}</h3>
              <p>{step.detail}</p>
            </div>
            <a
              href={step.href}
              target={step.external ? "_blank" : undefined}
              rel={step.external ? "noreferrer" : undefined}
              className="setup-walkthrough-action"
            >
              {step.action}
              {step.external ? <ExternalLink size={16} /> : <ArrowRight size={16} />}
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
