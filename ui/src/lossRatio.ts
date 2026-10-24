import type { CountyLosses, CountyPremiums } from "./contracts";
import type { Filters } from "./filters";

export type Ratio = { indemnity: number; premium: number; ratio: number | null };

/** Whether a row falls in the selected years. */
const inYears = (filters: Filters) => (row: { year: number }) => filters.from <= row.year && row.year < filters.to;
const ratio = (indemnity: number, premium: number): Ratio => ({
  indemnity,
  premium,
  ratio: premium > 0 ? indemnity / premium : null,
});

/**
 * Loss ratio per county and for Iowa: the selected payouts over the selected crops' premiums.
 * The cause filter applies to payouts only, because premiums have no cause.
 * Counties with neither payouts nor premiums for the selection are left out.
 */
export function lossRatios(losses: CountyLosses, premiums: CountyPremiums, filters: Filters) {
  const years = inYears(filters);
  const crop = (row: { crop: string }) => !filters.crop || row.crop === filters.crop;
  const totals = new Map<string, { indemnity: number; premium: number }>();
  const total = (fips: string) => {
    const existing = totals.get(fips) ?? { indemnity: 0, premium: 0 };
    totals.set(fips, existing);
    return existing;
  };
  for (const row of losses) {
    if (years(row) && crop(row) && (!filters.cause || row.cause === filters.cause))
      total(row.county_fips).indemnity += row.indemnity;
  }
  for (const row of premiums) {
    if (years(row) && crop(row)) total(row.county_fips).premium += row.premium;
  }
  let indemnity = 0;
  let premium = 0;
  const counties = new Map<string, Ratio>();
  for (const [fips, sums] of totals) {
    counties.set(fips, ratio(sums.indemnity, sums.premium));
    indemnity += sums.indemnity;
    premium += sums.premium;
  }
  return { counties, iowa: ratio(indemnity, premium) };
}
