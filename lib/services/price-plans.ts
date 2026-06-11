export function parsePlanPriceToCents(value: unknown) {
  const raw = String(value ?? "").trim().replace(/^\$/, "");
  if (!/^\d+(?:\.\d{0,2})?$/.test(raw)) {
    return null;
  }

  const [dollarsRaw, centsRaw = ""] = raw.split(".");
  const dollars = Number(dollarsRaw);
  const cents = Number(centsRaw.padEnd(2, "0"));
  if (!Number.isFinite(dollars) || !Number.isFinite(cents)) {
    return null;
  }

  const amountCents = dollars * 100 + cents;
  return amountCents >= 50 ? amountCents : null;
}

export function formatPlanPriceInput(amountCents: number) {
  return (amountCents / 100).toFixed(2);
}
