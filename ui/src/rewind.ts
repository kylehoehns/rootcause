type Ring = number[][];
type Geometry = { type: "Polygon"; coordinates: Ring[] } | { type: "MultiPolygon"; coordinates: Ring[][] };

const signedArea = (ring: Ring) =>
  ring.slice(1).reduce((sum, [x = 0, y = 0], i) => sum + (ring[i]?.[0] ?? 0) * y - x * (ring[i]?.[1] ?? 0), 0);

const polygon = (rings: Ring[]) =>
  rings.map((ring, i) => {
    const clockwise = signedArea(ring) < 0;
    return clockwise === (i === 0) ? ring : [...ring].reverse();
  });

/** d3 (so Observable Plot) fills a polygon's exterior only when it winds clockwise, the opposite of GeoJSON's rule; otherwise it fills the rest of the globe. */
export function rewind(geometry: { type: "Polygon"; coordinates: Ring[] }): { type: "Polygon"; coordinates: Ring[] };
export function rewind(geometry: { type: "MultiPolygon"; coordinates: Ring[][] }): {
  type: "MultiPolygon";
  coordinates: Ring[][];
};
export function rewind(geometry: Geometry): Geometry {
  return geometry.type === "Polygon"
    ? { type: "Polygon", coordinates: polygon(geometry.coordinates) }
    : { type: "MultiPolygon", coordinates: geometry.coordinates.map(polygon) };
}
