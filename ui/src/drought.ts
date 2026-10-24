import type { CountyLosses, Drought } from "./contracts";
import { FIRST_YEAR } from "./filters";

type Shares = Pick<Drought[number], "d2" | "d3" | "d4"> & Partial<Drought[number]>;

/** The percent of a county's area in severe drought or worse (D2 to D4). */
export const d2Plus = ({ d2, d3, d4 }: Shares) => d2 + d3 + d4;

/** The crop year with the most payouts across every county, crop and cause; null when nothing was paid. */
export function worstYear(losses: CountyLosses) {
  const cents = new Map<number, number>();
  for (const loss of losses) cents.set(loss.year, (cents.get(loss.year) ?? 0) + Math.round(loss.indemnity * 100));
  let worst: number | null = null;
  for (const [year, total] of cents) {
    if (
      total > 0 &&
      (worst === null || total > (cents.get(worst) ?? 0) || (total === cents.get(worst) && year < worst))
    )
      worst = year;
  }
  return worst;
}

/** The date of the map published for the given year, or null when there is none. */
export const mapDate = (drought: Drought, year: number) =>
  drought.find((row) => row.map_date.startsWith(`${year}-`))?.map_date ?? null;

/** Reads the compared year from `?year=`; defaults to last year and is kept within 2001 to last year. */
export function compareYearFromSearch(search: string, latestYear: number) {
  const value = Number.parseInt(new URLSearchParams(search).get("year") ?? "", 10);
  return Number.isNaN(value) ? latestYear - 1 : Math.min(Math.max(value, FIRST_YEAR), latestYear - 1);
}

/** The URL query for the compared year, empty for the default so `/drought` stays `/drought`. */
export const compareYearToSearch = (year: number, latestYear: number) =>
  year === latestYear - 1 ? "" : `?year=${year}`;
