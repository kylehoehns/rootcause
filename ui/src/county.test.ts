import { expect, test } from "vitest";
import type { CountyLosses, CountyPremiums } from "./contracts";
import { payoutsByYearAndCause, topCrops, worstYears } from "./county";

const all = { from: 2001, to: 2012, cause: null, crop: null };
const losses: CountyLosses = [
  { year: 2012, county_fips: "19153", crop: "CORN", cause: "Drought", indemnity: 900 },
  { year: 2012, county_fips: "19153", crop: "SOYBEANS", cause: "Hail", indemnity: 100 },
  { year: 2011, county_fips: "19153", crop: "CORN", cause: "Hail", indemnity: 300 },
  { year: 2010, county_fips: "19153", crop: "SOYBEANS", cause: "Drought", indemnity: 50 },
  { year: 2009, county_fips: "19153", crop: "CORN", cause: "Drought", indemnity: 10 },
  { year: 2008, county_fips: "19153", crop: "CORN", cause: "Drought", indemnity: 20 },
  { year: 2007, county_fips: "19153", crop: "CORN", cause: "Drought", indemnity: 5 },
  { year: 2012, county_fips: "19169", crop: "CORN", cause: "Drought", indemnity: 99_999 },
];
const premiums: CountyPremiums = [
  { year: 2012, county_fips: "19153", crop: "CORN", premium: 1_000 },
  { year: 2011, county_fips: "19153", crop: "CORN", premium: 600 },
  { year: 2010, county_fips: "19153", crop: "SOYBEANS", premium: 500 },
];

test("top crops rank this county's payouts, largest first, and respect the limit", () => {
  expect(topCrops(losses, "19153", all, 1)).toEqual([{ crop: "CORN", indemnity: 1_235 }]);
  expect(topCrops(losses, "19153", all).map((row) => row.crop)).toEqual(["CORN", "SOYBEANS"]);
});

test("top crops follow the year and cause filters", () => {
  const rows = topCrops(losses, "19153", { ...all, from: 2012, cause: "Hail" });
  expect(rows).toEqual([{ crop: "SOYBEANS", indemnity: 100 }]);
});

test("the five worst years are ranked by payouts, each with its loss ratio", () => {
  const worst = worstYears(losses, premiums, "19153", all);
  expect(worst.map((row) => row.year)).toEqual([2012, 2011, 2010, 2008, 2009]);
  expect(worst[0]).toEqual({ year: 2012, indemnity: 1_000, ratio: 1 });
  expect(worst[1]?.ratio).toBeCloseTo(0.5, 5);
});

test("a worst year without premium has no ratio", () => {
  const worst = worstYears(losses, premiums, "19153", all);
  expect(worst.find((row) => row.year === 2008)?.ratio).toBeNull();
});

test("worst years only consider the filtered range and crop", () => {
  const worst = worstYears(losses, premiums, "19153", { ...all, from: 2010, crop: "SOYBEANS" });
  expect(worst).toEqual([
    { year: 2012, indemnity: 100, ratio: null },
    { year: 2010, indemnity: 50, ratio: 0.1 },
  ]);
});

test("payouts per year are split by cause, oldest year first, within the filters", () => {
  const rows = payoutsByYearAndCause(losses, "19153", { ...all, from: 2011 });
  expect(rows).toEqual([
    { year: 2011, cause: "Hail", indemnity: 300 },
    { year: 2012, cause: "Drought", indemnity: 900 },
    { year: 2012, cause: "Hail", indemnity: 100 },
  ]);
});
