export function sanitizeDecimalInput(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "0";
  }

  const normalized = String(value).trim();
  return normalized === "" ? "0" : normalized;
}

function normalizeDecimalParts(value: string) {
  const trimmed = sanitizeDecimalInput(value);
  const negative = trimmed.startsWith("-");
  const absolute = negative ? trimmed.slice(1) : trimmed;
  const [integerPart = "0", fractionalPart = ""] = absolute.split(".");
  const integer = integerPart.replace(/\D/g, "") || "0";
  const fraction = fractionalPart.replace(/\D/g, "");

  return {
    negative,
    integer,
    fraction,
  };
}

function decimalToScaledBigInt(value: string, scale: number) {
  const { negative, integer, fraction } = normalizeDecimalParts(value);
  const paddedFraction = `${fraction}${"0".repeat(scale)}`.slice(0, scale);
  const digits = `${integer}${paddedFraction}`.replace(/^0+(?=\d)/, "") || "0";
  const result = BigInt(digits);
  return negative ? -result : result;
}

export function addDecimalStrings(values: Array<string | number | null | undefined>) {
  const normalizedValues = values.map((value) => sanitizeDecimalInput(value));
  const scale = normalizedValues.reduce((max, value) => {
    const [, fraction = ""] = value.split(".");
    return Math.max(max, fraction.length);
  }, 0);

  const total = normalizedValues.reduce((sum, value) => sum + decimalToScaledBigInt(value, scale), 0n);
  const sign = total < 0n ? "-" : "";
  const absolute = total < 0n ? -total : total;
  const digits = absolute.toString().padStart(scale + 1, "0");

  if (scale === 0) {
    return `${sign}${digits}`;
  }

  const integerPart = digits.slice(0, -scale) || "0";
  const fractionalPart = digits.slice(-scale).replace(/0+$/, "");
  return fractionalPart ? `${sign}${integerPart}.${fractionalPart}` : `${sign}${integerPart}`;
}

export function compareDecimalStrings(left: string | number | null | undefined, right: string | number | null | undefined) {
  const values = [sanitizeDecimalInput(left), sanitizeDecimalInput(right)];
  const scale = values.reduce((max, value) => {
    const [, fraction = ""] = value.split(".");
    return Math.max(max, fraction.length);
  }, 0);

  const [leftValue, rightValue] = values.map((value) => decimalToScaledBigInt(value, scale));

  if (leftValue === rightValue) {
    return 0;
  }

  return leftValue > rightValue ? 1 : -1;
}

export function isNonNegativeDecimal(value: string | number | null | undefined) {
  return compareDecimalStrings(value, 0) >= 0;
}

export function formatDecimal(value: string | number | null | undefined, options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }) {
  const numericValue = Number.parseFloat(sanitizeDecimalInput(value));

  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: options?.minimumFractionDigits ?? 2,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  }).format(Number.isFinite(numericValue) ? numericValue : 0);
}
