import { expect, test } from "vitest";
import { filtersFromSearch, filtersToSearch } from "./filters";

test("no query means every year, cause and crop", () => {
  expect(filtersFromSearch("", 2024)).toEqual({ from: 2001, to: 2024, cause: null, crop: null });
});

test("filters round-trip through the URL", () => {
  const filters = { from: 2010, to: 2015, cause: "Hail", crop: "SOYBEANS" };
  expect(filtersToSearch(filters, 2024)).toBe("?from=2010&to=2015&cause=Hail&crop=SOYBEANS");
  expect(filtersFromSearch(filtersToSearch(filters, 2024), 2024)).toEqual(filters);
});

test("defaults stay out of the URL", () => {
  expect(filtersToSearch({ from: 2001, to: 2024, cause: null, crop: null }, 2024)).toBe("");
});

test("years outside the range or swapped are corrected", () => {
  expect(filtersFromSearch("?from=1990&to=2090", 2024)).toMatchObject({ from: 2001, to: 2024 });
  expect(filtersFromSearch("?from=2015&to=2010", 2024)).toMatchObject({ from: 2010, to: 2015 });
  expect(filtersFromSearch("?from=abc", 2024)).toMatchObject({ from: 2001 });
});
