import { expect, test } from "vitest";
import type { CountyLosses, CountyPremiums } from "./contracts";
import { lossRatios } from "./lossRatio";

const all = { from: 2001, to: 2012, cause: null, crop: null };

// The spec's check: Iowa 2012 pays about $2.02B against $904M of premium, a ratio of about 2.23.
const losses: CountyLosses = [
  { year: 2012, county_fips: "19001", crop: "CORN", cause: "Drought", indemnity: 1_500_000_000 },
  { year: 2012, county_fips: "19001", crop: "SOYBEANS", cause: "Hail", indemnity: 20_000_000 },
  { year: 2012, county_fips: "19003", crop: "CORN", cause: "Drought", indemnity: 500_000_000 },
  { year: 2011, county_fips: "19003", crop: "CORN", cause: "Hail", indemnity: 1_000 },
];
const premiums: CountyPremiums = [
  { year: 2012, county_fips: "19001", crop: "CORN", premium: 600_000_000 },
  { year: 2012, county_fips: "19001", crop: "SOYBEANS", premium: 100_000_000 },
  { year: 2012, county_fips: "19003", crop: "CORN", premium: 204_000_000 },
  { year: 2011, county_fips: "19003", crop: "CORN", premium: 10_000 },
];

test("Iowa 2012 has a loss ratio of about 2.23", () => {
  const { iowa } = lossRatios(losses, premiums, { ...all, from: 2012 });
  expect(iowa.ratio).toBeCloseTo(2.23, 2);
});

test("a county's ratio is its payouts over its premiums", () => {
  const { counties } = lossRatios(losses, premiums, { ...all, from: 2012 });
  expect(counties.get("19001")?.ratio).toBeCloseTo(1_520 / 700, 5);
});

test("a cause filter narrows payouts but not premiums", () => {
  const { counties } = lossRatios(losses, premiums, { ...all, from: 2012, cause: "Hail" });
  expect(counties.get("19001")).toEqual({ indemnity: 20_000_000, premium: 700_000_000, ratio: 20 / 700 });
});

test("a crop filter narrows both payouts and premiums", () => {
  const { counties } = lossRatios(losses, premiums, { ...all, from: 2012, crop: "SOYBEANS" });
  expect(counties.get("19001")?.ratio).toBeCloseTo(0.2, 5);
  expect(counties.get("19003")).toBeUndefined();
});

test("a year range includes both ends", () => {
  const { counties } = lossRatios(losses, premiums, { ...all, from: 2011, to: 2011 });
  expect(counties.get("19003")?.indemnity).toBe(1_000);
  expect(counties.get("19001")).toBeUndefined();
});

test("a county with payouts but no premium has no ratio", () => {
  const { counties } = lossRatios(losses, [], all);
  expect(counties.get("19001")?.ratio).toBeNull();
});
