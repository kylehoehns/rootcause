import { expect, test } from "vitest";
import { rewind } from "./rewind";

const area = (ring: number[][]) =>
  ring.slice(1).reduce((sum, [x = 0, y = 0], i) => sum + (ring[i]?.[0] ?? 0) * y - x * (ring[i]?.[1] ?? 0), 0);

const counterClockwise = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
  [0, 0],
];

test("exterior rings are wound clockwise, the way d3 fills them", () => {
  const [exterior] = rewind({ type: "Polygon", coordinates: [counterClockwise] }).coordinates;
  expect(area(exterior ?? [])).toBeLessThan(0);
});

test("holes are wound the other way", () => {
  const { coordinates } = rewind({ type: "Polygon", coordinates: [counterClockwise, [...counterClockwise].reverse()] });
  expect(area(coordinates[1] ?? [])).toBeGreaterThan(0);
});

test("every polygon of a multipolygon is rewound", () => {
  const { coordinates } = rewind({ type: "MultiPolygon", coordinates: [[counterClockwise], [counterClockwise]] });
  expect(coordinates.map((polygon) => area(polygon[0] ?? []) < 0)).toEqual([true, true]);
});
