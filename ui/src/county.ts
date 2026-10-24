import type { CountyLosses, CountyPremiums } from "./contracts";
import type { Filters } from "./filters";
import { lossRatios } from "./lossRatio";

const selected = (losses: CountyLosses, fips: string, filters: Filters) =>
  losses.filter(
    (loss) =>
      loss.county_fips === fips &&
      loss.year >= filters.from &&
      loss.year <= filters.to &&
      (!filters.cause || loss.cause === filters.cause) &&
      (!filters.crop || loss.crop === filters.crop),
  );

/** Sums payouts by a key, largest total first (ties by key, so the order is stable). */
function sumBy<K extends string | number>(rows: CountyLosses, key: (row: CountyLosses[number]) => K) {
  const sums = new Map<K, number>();
  for (const row of rows) sums.set(key(row), (sums.get(key(row)) ?? 0) + row.indemnity);
  return [...sums].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
}

/** The county's crops by payouts, within the filters. */
export function topCrops(losses: CountyLosses, fips: string, filters: Filters, limit = 5) {
  return sumBy(selected(losses, fips, filters), (row) => row.crop)
    .slice(0, limit)
    .map(([crop, indemnity]) => ({ crop, indemnity }));
}

/** The county's years with the most payouts within the filters, each with its loss ratio (null without premium). */
export function worstYears(losses: CountyLosses, premiums: CountyPremiums, fips: string, filters: Filters, limit = 5) {
  return sumBy(selected(losses, fips, filters), (row) => row.year)
    .slice(0, limit)
    .map(([year, indemnity]) => ({
      year,
      indemnity,
      ratio: lossRatios(losses, premiums, { ...filters, from: year, to: year }).counties.get(fips)?.ratio ?? null,
    }));
}

/** Payouts per year and cause, for the stacked chart, oldest year first. */
export function payoutsByYearAndCause(losses: CountyLosses, fips: string, filters: Filters) {
  const sums = new Map<string, { year: number; cause: string; indemnity: number }>();
  for (const loss of selected(losses, fips, filters)) {
    const key = `${loss.year}|${loss.cause}`;
    const row = sums.get(key) ?? { year: loss.year, cause: loss.cause, indemnity: 0 };
    row.indemnity += loss.indemnity;
    sums.set(key, row);
  }
  return [...sums.values()].sort((a, b) => a.year - b.year || (a.cause < b.cause ? -1 : 1));
}
