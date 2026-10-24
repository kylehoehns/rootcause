import * as Plot from "@observablehq/plot";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CountyLosses, CountyPremiums, Drought, IowaCounties } from "./contracts";
import { compareYearFromSearch, compareYearToSearch, d2Plus, mapDate, worstYear } from "./drought";
import { FIRST_YEAR } from "./filters";
import { lossRatios } from "./lossRatio";
import { rewind } from "./rewind";

type Data = { drought: Drought; losses: CountyLosses; premiums: CountyPremiums; counties: IowaCounties };

const load = async (): Promise<Data> => {
  const [drought, losses, premiums, counties] = await Promise.all(
    ["drought.json", "county-losses.json", "county-premiums.json", "iowa-counties.geojson"].map((file) =>
      fetch(`/data/${file}`).then((response) => response.json()),
    ),
  );
  return { drought, losses, premiums, counties };
};

export function DroughtPage() {
  const [data, setData] = useState<Data>();
  useEffect(() => {
    load().then(setData);
  }, []);
  return (
    <>
      <h1>Drought: this week and the same week in another year</h1>
      {data ? <Comparison data={data} /> : <p>Loading…</p>}
    </>
  );
}

const byCounty = (drought: Drought, date: string | null) =>
  new Map(drought.filter((row) => row.map_date === date).map((row) => [row.county_fips, d2Plus(row)]));

const share = (value: number | undefined) => (value === undefined ? "no data" : `${value.toFixed(1)}%`);

function Comparison({ data }: { data: Data }) {
  const latest = useMemo(() => data.drought.map((row) => row.map_date).reduce((a, b) => (a > b ? a : b), ""), [data]);
  const latestYear = Number(latest.slice(0, 4));
  const worst = useMemo(() => worstYear(data.losses), [data]);
  const [year, setYear] = useState(() => compareYearFromSearch(window.location.search, latestYear));
  const choose = (next: number) => {
    const clamped = compareYearFromSearch(`?year=${next}`, latestYear);
    window.history.replaceState(null, "", `/drought${compareYearToSearch(clamped, latestYear)}`);
    setYear(clamped);
  };
  const years = Array.from({ length: latestYear - FIRST_YEAR }, (_, i) => FIRST_YEAR + i);
  const otherDate = mapDate(data.drought, year);

  const left = useMemo(() => byCounty(data.drought, latest), [data, latest]);
  const right = useMemo(() => byCounty(data.drought, otherDate), [data, otherDate]);
  const ratios = useMemo(
    () => lossRatios(data.losses, data.premiums, { from: year, to: year, cause: null, crop: null }).counties,
    [data, year],
  );
  const tip = useCallback(
    (fips: string, name: string) => {
      const ratio = ratios.get(fips)?.ratio;
      return `${name}\nSevere drought or worse, ${latest}: ${share(left.get(fips))}\n${otherDate ?? year}: ${share(right.get(fips))}\nLoss ratio ${year}: ${ratio == null ? "no data" : ratio.toFixed(2)}`;
    },
    [ratios, left, right, latest, otherDate, year],
  );
  const [hover, setHover] = useState<{ text: string; x: number; y: number }>();

  return (
    <>
      <form className="filters" onSubmit={(event) => event.preventDefault()}>
        <label>
          Compare with
          <select value={year} onChange={(event) => choose(Number(event.target.value))}>
            {years.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <button type="button" disabled={worst === null} onClick={() => worst !== null && choose(worst)}>
          Worst year{worst === null ? "" : ` (${worst})`}
        </button>
      </form>
      <div className="maps">
        <figure>
          <figcaption>Latest week: {latest}</figcaption>
          <DroughtMap data={data} values={left} label="Latest" tip={tip} onHover={setHover} />
        </figure>
        <figure>
          <figcaption>{otherDate ? `Same week in ${year}: ${otherDate}` : `No map for ${year}`}</figcaption>
          <DroughtMap data={data} values={right} label={String(year)} tip={tip} onHover={setHover} />
        </figure>
      </div>
      {hover && (
        <div role="tooltip" className="tip" style={{ left: hover.x + 12, top: hover.y + 12 }}>
          {hover.text}
        </div>
      )}
    </>
  );
}

function DroughtMap({
  data,
  values,
  label,
  tip,
  onHover,
}: {
  data: Data;
  values: Map<string, number>;
  label: string;
  tip: (fips: string, name: string) => string;
  onHover: (hover?: { text: string; x: number; y: number }) => void;
}) {
  const chart = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // The published file doesn't promise a winding order, and d3 needs clockwise exteriors.
    const features = data.counties.features.map((feature) => ({
      ...feature,
      geometry: rewind(feature.geometry as Parameters<typeof rewind>[0]),
    }));
    const plot = Plot.plot({
      width: 480,
      ariaLabel: `Share in severe drought or worse, ${label}`,
      projection: { type: "mercator", domain: { type: "FeatureCollection", features } as never },
      color: { type: "linear", scheme: "YlOrRd", domain: [0, 100], clamp: true, legend: true, label: "D2+ (%)" },
      marks: [
        Plot.geo(features, { fill: "#e5e5e5", stroke: "#fff" }),
        Plot.geo(
          features.filter((feature) => values.has(feature.properties.county_fips)),
          {
            fill: (feature) => values.get(feature.properties.county_fips),
            stroke: "#fff",
            ariaLabel: (feature) => tip(feature.properties.county_fips, feature.properties.county_name),
          },
        ),
      ],
    });
    const show = (event: Event) => {
      const county = (event.target as Element).closest("path[aria-label]");
      const { clientX: x, clientY: y } = event as MouseEvent;
      onHover(county ? { text: county.getAttribute("aria-label") ?? "", x, y } : undefined);
    };
    plot.addEventListener("mouseover", show);
    plot.addEventListener("mousemove", show);
    plot.addEventListener("mouseleave", () => onHover(undefined));
    chart.current?.replaceChildren(plot);
    return () => plot.remove();
  }, [data, values, label, tip, onHover]);
  return <div ref={chart} className="chart" />;
}
