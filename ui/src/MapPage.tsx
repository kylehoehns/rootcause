import * as Plot from "@observablehq/plot";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CountyLosses, CountyPremiums, IowaCounties } from "./contracts";
import { dollars } from "./dollars";
import { FIRST_YEAR, type Filters, filtersFromSearch, filtersToSearch } from "./filters";
import { lossRatios } from "./lossRatio";
import { rewind } from "./rewind";

type Data = { losses: CountyLosses; premiums: CountyPremiums; counties: IowaCounties };

const load = async (): Promise<Data> => {
  const [losses, premiums, counties] = await Promise.all(
    ["county-losses.json", "county-premiums.json", "iowa-counties.geojson"].map((file) =>
      fetch(`/data/${file}`).then((response) => response.json()),
    ),
  );
  return { losses, premiums, counties };
};

const unique = (values: string[]) => [...new Set(values)].sort();

export function MapPage() {
  const [data, setData] = useState<Data>();
  useEffect(() => {
    load().then(setData);
  }, []);
  return (
    <>
      <h1>Crop insurance loss ratio by Iowa county</h1>
      {data ? <CountyMap data={data} /> : <p>Loading…</p>}
    </>
  );
}

function CountyMap({ data }: { data: Data }) {
  const latestYear = useMemo(() => Math.max(FIRST_YEAR, ...data.losses.map((loss) => loss.year)), [data]);
  const [filters, setFilters] = useState(() => filtersFromSearch(window.location.search, latestYear));
  const update = (change: Partial<Filters>) => {
    const next = filtersFromSearch(filtersToSearch({ ...filters, ...change }, latestYear), latestYear);
    window.history.replaceState(null, "", `/${filtersToSearch(next, latestYear)}`);
    setFilters(next);
  };
  const years = Array.from({ length: latestYear - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);
  const causes = useMemo(() => unique(data.losses.map((loss) => loss.cause)), [data]);
  const crops = useMemo(() => unique(data.premiums.map((premium) => premium.crop)), [data]);
  const { counties, iowa } = useMemo(() => lossRatios(data.losses, data.premiums, filters), [data, filters]);
  const search = filtersToSearch(filters, latestYear);
  const chart = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ text: string; x: number; y: number }>();

  useEffect(() => {
    // The published file doesn't promise a winding order, and d3 needs clockwise exteriors.
    const features = data.counties.features.map((feature) => ({
      ...feature,
      geometry: rewind(feature.geometry as Parameters<typeof rewind>[0]),
    }));
    const ratioOf = (fips: string) => counties.get(fips)?.ratio ?? null;
    const plot = Plot.plot({
      width: 760,
      projection: { type: "mercator", domain: { type: "FeatureCollection", features } as never },
      color: { type: "linear", scheme: "YlOrRd", domain: [0, 2], clamp: true, legend: true, label: "Loss ratio" },
      marks: [
        Plot.geo(features, { fill: "#e5e5e5", stroke: "#fff" }),
        Plot.geo(
          features.filter((feature) => ratioOf(feature.properties.county_fips) !== null),
          {
            fill: (feature) => ratioOf(feature.properties.county_fips),
            stroke: "#fff",
            href: (feature) => `/county/${feature.properties.county_fips}${search}`,
            ariaLabel: (feature) => {
              const row = counties.get(feature.properties.county_fips);
              return `${feature.properties.county_name}\nPayouts: ${dollars(row?.indemnity ?? 0)}\nLoss ratio: ${(row?.ratio ?? 0).toFixed(2)}`;
            },
          },
        ),
      ],
    });
    const show = (event: Event) => {
      const county = (event.target as Element).closest("path[aria-label]");
      const { clientX: x, clientY: y } = event as MouseEvent;
      setHover(county ? { text: county.getAttribute("aria-label") ?? "", x, y } : undefined);
    };
    plot.addEventListener("mouseover", show);
    plot.addEventListener("mousemove", show);
    plot.addEventListener("mouseleave", () => setHover(undefined));
    chart.current?.replaceChildren(plot);
    return () => plot.remove();
  }, [data, counties, search]);

  const select = (label: string, value: string, options: string[], onChange: (value: string) => void, any?: string) => (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {any && <option value="">{any}</option>}
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
  const yearOptions = years.map(String);

  return (
    <>
      <form className="filters" onSubmit={(event) => event.preventDefault()}>
        {select("From", String(filters.from), yearOptions, (v) => update({ from: Number(v) }))}
        {select("To", String(filters.to), yearOptions, (v) => update({ to: Number(v) }))}
        {select("Cause", filters.cause ?? "", causes, (v) => update({ cause: v || null }), "All causes")}
        {select("Crop", filters.crop ?? "", crops, (v) => update({ crop: v || null }), "All crops")}
      </form>
      <p>
        Iowa: <strong>{iowa.ratio === null ? "no data" : `loss ratio ${iowa.ratio.toFixed(2)}`}</strong> (
        {dollars(iowa.indemnity)} paid on {dollars(iowa.premium)} of premium)
      </p>
      <div ref={chart} className="chart" />
      {hover && (
        <div role="tooltip" className="tip" style={{ left: hover.x + 12, top: hover.y + 12 }}>
          {hover.text}
        </div>
      )}
    </>
  );
}
