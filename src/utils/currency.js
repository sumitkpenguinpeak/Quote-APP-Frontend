// Store ni currency (INR / USD / EUR ...) pramane symbol ane amount format.
// Locale `undefined` = merchant na browser ni language pramane grouping.

export const currencySymbol = (currency = "USD") => {
  try {
    const part = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    })
      .formatToParts(0)
      .find((p) => p.type === "currency");
    return part ? part.value : currency;
  } catch {
    return currency;
  }
};

export const formatCurrency = (amount, currency = "USD", options = {}) => {
  const n = Number(amount) || 0;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
};
