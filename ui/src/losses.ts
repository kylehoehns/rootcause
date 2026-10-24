import type { CountyLosses } from "./contracts";

// Names for the counties the site mentions, until the pipeline publishes them with the county boundaries.
const COUNTY_NAMES: Record<string, string> = { "19153": "Polk" };

export const countyName = (countyFips: string) => COUNTY_NAMES[countyFips] ?? countyFips;

/** Indemnity for one county in one crop year, across crops and causes, in dollars and cents. */
export function countyTotal(losses: CountyLosses, countyFips: string, year: number) {
  const cents = losses
    .filter((loss) => loss.county_fips === countyFips && loss.year === year)
    .reduce((sum, loss) => sum + Math.round(loss.indemnity * 100), 0);
  return cents / 100;
}
