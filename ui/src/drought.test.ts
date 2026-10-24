import { expect, test } from "vitest";
import type { CountyLosses, Drought } from "./contracts";
import { compareYearFromSearch, compareYearToSearch, d2Plus, mapDate, worstYear } from "./drought";

const loss = (year: number, indemnity: number, county_fips = "19153"): CountyLosses[number] => ({
  year,
  county_fips,
  crop: "CORN",
  cause: "Drought",
  indemnity,
});

test("the worst year is the one with the most payouts across counties, crops and causes", () => {
  const losses = [loss(2011, 100), loss(2012, 60), loss(2012, 70, "19001"), loss(2013, 120)];
  expect(worstYear(losses)).toBe(2012);
});

test("the worst year follows the data, not a fixed year", () => {
  expect(worstYear([loss(2019, 5), loss(2020, 9)])).toBe(2020);
});

test("there is no worst year without payouts", () => {
  expect(worstYear([])).toBeNull();
});

test("D2+ is the share in severe, extreme and exceptional drought", () => {
  expect(d2Plus({ d2: 15, d3: 10, d4: 5 })).toBe(30);
});

const row = (map_date: string): Drought[number] => ({
  map_date,
  county_fips: "19153",
  none: 100,
  d0: 0,
  d1: 0,
  d2: 0,
  d3: 0,
  d4: 0,
});

test("a year's map is the one dated in that year", () => {
  const drought = [row("2025-07-01"), row("2024-07-02"), row("2012-07-03")];
  expect(mapDate(drought, 2012)).toBe("2012-07-03");
  expect(mapDate(drought, 2013)).toBeNull();
});

test("the comparison defaults to last year and stays within 2001 to last year", () => {
  expect(compareYearFromSearch("", 2025)).toBe(2024);
  expect(compareYearFromSearch("?year=2012", 2025)).toBe(2012);
  expect(compareYearFromSearch("?year=1990", 2025)).toBe(2001);
  expect(compareYearFromSearch("?year=2030", 2025)).toBe(2024);
  expect(compareYearFromSearch("?year=abc", 2025)).toBe(2024);
});

test("the default comparison leaves the URL clean", () => {
  expect(compareYearToSearch(2024, 2025)).toBe("");
  expect(compareYearToSearch(2012, 2025)).toBe("?year=2012");
});
