"use client";

import { useMemo, useState } from "react";
import type { ShopAnalytics, ShopAnalyticsPoint } from "@/lib/services/shop-analytics";

type Period = "days" | "months";
type MetricKey =
  | "grossRevenueCents"
  | "cafeShareCents"
  | "paidPasses"
  | "freeGrants"
  | "portalVisits"
  | "voucherRedemptions"
  | "failedAuthorizations";

const METRICS: Array<{ key: MetricKey; label: string; valueLabel: string; money?: boolean }> = [
  { key: "grossRevenueCents", label: "Gross revenue", valueLabel: "gross", money: true },
  { key: "cafeShareCents", label: "Cafe share", valueLabel: "cafe share", money: true },
  { key: "paidPasses", label: "Paid passes", valueLabel: "paid passes" },
  { key: "freeGrants", label: "Free grants", valueLabel: "free grants" },
  { key: "portalVisits", label: "Portal visits", valueLabel: "portal visits" },
  { key: "voucherRedemptions", label: "Staff codes", valueLabel: "staff codes" },
  { key: "failedAuthorizations", label: "Failed auths", valueLabel: "failed auths" },
];

function formatMoney(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function formatValue(value: number, money?: boolean) {
  return money ? formatMoney(value) : value.toLocaleString("en-US");
}

function formatAxisValue(value: number, money?: boolean) {
  const options: Intl.NumberFormatOptions = {
    maximumFractionDigits: value >= 1000 ? 1 : 0,
    notation: value >= 1000 ? "compact" : "standard",
  };

  if (money) {
    return new Intl.NumberFormat("en-US", {
      ...options,
      currency: "USD",
      style: "currency",
    }).format(value / 100);
  }

  return new Intl.NumberFormat("en-US", options).format(value);
}

function getMetricValue(point: ShopAnalyticsPoint, metric: MetricKey) {
  return point[metric];
}

export function CafeAnalyticsChart({ analytics }: { analytics: ShopAnalytics }) {
  const [period, setPeriod] = useState<Period>("days");
  const [metric, setMetric] = useState<MetricKey>("grossRevenueCents");
  const metricConfig = METRICS.find((item) => item.key === metric) ?? METRICS[0];
  const data = analytics[period];

  const { max, total, latest, highest } = useMemo(() => {
    const values = data.map((point) => getMetricValue(point, metric));
    const maxValue = Math.max(...values, 0);
    const totalValue = values.reduce((sum, value) => sum + value, 0);
    const highestPoint = data.reduce(
      (best, point) => (getMetricValue(point, metric) > getMetricValue(best, metric) ? point : best),
      data[0],
    );

    return {
      max: maxValue,
      total: totalValue,
      latest: values.at(-1) ?? 0,
      highest: highestPoint,
    };
  }, [data, metric]);

  return (
    <div className="analytics-card">
      <div className="analytics-controls">
        <div className="segmented-control" aria-label="Chart period">
          <button
            className={period === "days" ? "is-active" : ""}
            type="button"
            onClick={() => setPeriod("days")}
          >
            Days
          </button>
          <button
            className={period === "months" ? "is-active" : ""}
            type="button"
            onClick={() => setPeriod("months")}
          >
            Months
          </button>
        </div>

        <label className="analytics-metric-picker">
          <span>Metric</span>
          <select value={metric} onChange={(event) => setMetric(event.target.value as MetricKey)}>
            {METRICS.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="analytics-summary">
        <div>
          <p>Total</p>
          <strong>{formatValue(total, metricConfig.money)}</strong>
        </div>
        <div>
          <p>Current {period === "days" ? "day" : "month"}</p>
          <strong>{formatValue(latest, metricConfig.money)}</strong>
        </div>
        <div>
          <p>Highest</p>
          <strong>
            {highest ? `${formatValue(getMetricValue(highest, metric), metricConfig.money)} on ${highest.label}` : "0"}
          </strong>
        </div>
      </div>

      <div className="analytics-chart-shell" role="img" aria-label={`${metricConfig.label} by ${period}`}>
        <div className="analytics-y-axis" aria-hidden="true">
          <span>{formatAxisValue(max, metricConfig.money)}</span>
          <span>{formatAxisValue(max / 2, metricConfig.money)}</span>
          <span>0</span>
        </div>
        <div className="analytics-plot-wrap">
          <div className="analytics-plot-area">
            <div className="analytics-chart-grid" />
            <div className="analytics-bars">
              {data.map((point) => {
                const value = getMetricValue(point, metric);
                const height = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;

                return (
                  <div className="analytics-bar-column" key={point.key}>
                    <div
                      className="analytics-bar"
                      style={{ height: `${height}%` }}
                      title={`${point.label}: ${formatValue(value, metricConfig.money)} ${metricConfig.valueLabel}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="analytics-x-labels" aria-hidden="true">
            {data.map((point, index) => {
              const showLabel = period === "months" || index === 0 || index === data.length - 1 || index % 5 === 0;

              return (
                <span className={showLabel ? "" : "is-muted"} key={point.key}>
                  {showLabel ? point.label : ""}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
