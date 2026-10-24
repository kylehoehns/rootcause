import { expect, test } from "vitest";
import { dollars } from "./dollars";

test("whole dollars with separators", () => {
  expect(dollars(3776155)).toBe("$3,776,155");
});
