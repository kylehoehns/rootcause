/** Whole dollars for display, e.g. 12200000000 → "$12,200,000,000". Amounts arrive in dollars and cents. */
export const dollars = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
