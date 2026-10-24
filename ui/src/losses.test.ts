import { expect, test } from "vitest";
import type { CountyLosses } from "./contracts";
import { countyName, countyTotal } from "./losses";

const losses: CountyLosses = [
  { year: 2012, county_fips: "19153", crop: "CORN", cause: "Drought", indemnity: 0.1 },
  { year: 2012, county_fips: "19153", crop: "SOYBEANS", cause: "Drought", indemnity: 0.2 },
  { year: 2012, county_fips: "19169", crop: "CORN", cause: "Drought", indemnity: 500 },
  { year: 2011, county_fips: "19153", crop: "CORN", cause: "Hail", indemnity: 700 },
];

test("a county's total adds its crops and causes for one year, to the cent", () => {
  expect(countyTotal(losses, "19153", 2012)).toBe(0.3);
});

test("a county with no rows that year totals zero", () => {
  expect(countyTotal(losses, "19001", 2012)).toBe(0);
});

test("county names fall back to the FIPS code", () => {
  expect(countyName("19153")).toBe("Polk");
  expect(countyName("19001")).toBe("19001");
});
