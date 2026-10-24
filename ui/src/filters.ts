export type Filters = { from: number; to: number; cause: string | null; crop: string | null };

export const FIRST_YEAR = 2001;

/** Reads the map's filters from a URL query; anything missing or out of range falls back to every year, cause and crop. */
export function filtersFromSearch(search: string, latestYear: number): Filters {
  const params = new URLSearchParams(search);
  const year = (name: string, fallback: number) => {
    const value = Number.parseInt(params.get(name) ?? "", 10);
    return Number.isNaN(value) ? fallback : Math.min(Math.max(value, FIRST_YEAR), latestYear);
  };
  const from = year("from", FIRST_YEAR);
  const to = year("to", latestYear);
  return {
    from: Math.min(from, to),
    to: Math.max(from, to),
    cause: params.get("cause") || null,
    crop: params.get("crop") || null,
  };
}

/** The URL query for the filters, leaving out what is at its default so `/` stays `/`. */
export function filtersToSearch(filters: Filters, latestYear: number) {
  const params = new URLSearchParams();
  if (filters.from !== FIRST_YEAR) params.set("from", String(filters.from));
  if (filters.to !== latestYear) params.set("to", String(filters.to));
  if (filters.cause) params.set("cause", filters.cause);
  if (filters.crop) params.set("crop", filters.crop);
  const query = params.toString();
  return query ? `?${query}` : "";
}
