import * as Plot from "@observablehq/plot";
import { useEffect, useMemo, useRef, useState } from "react";
import { payoutsByYearAndCause, topCrops, worstYears } from "./county";
import { type Data, load } from "./data";
import { dollars } from "./dollars";
import { FIRST_YEAR, filtersFromSearch, filtersToSearch } from "./filters";

export function CountyPage({ fips }: { fips: string }) {
  const [data, setData] = useState<Data>();
  useEffect(() => {
    load().then(setData);
  }, []);
  return (
    <>
      <h1>County {fips}</h1>
      {data ? <County data={data} fips={fips} /> : <p>Loading…</p>}
    </>
  );
}

function County({ data, fips }: { data: Data; fips: string }) {
  const latestYear = useMemo(() => Math.max(FIRST_YEAR, ...data.losses.map((loss) => loss.year)), [data]);
  const filters = useMemo(() => filtersFromSearch(window.location.search, latestYear), [latestYear]);
  const search = filtersToSearch(filters, latestYear);
  const feature = data.counties.features.find((county) => county.properties.county_fips === fips);
  const byYear = useMemo(() => payoutsByYearAndCause(data.losses, fips, filters), [data, fips, filters]);
  const chart = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!feature) return;
    const plot = Plot.plot({
      width: 760,
      x: { label: "Crop year", tickFormat: "d" },
      y: { label: "Payouts ($)", tickFormat: "s", grid: true },
      color: { legend: true, label: "Cause of loss" },
      marks: [
        Plot.barY(byYear, {
          x: "year",
          y: "indemnity",
          fill: "cause",
          title: (d) => `${d.cause}: ${dollars(d.indemnity)}`,
        }),
        Plot.ruleY([0]),
      ],
    });
    chart.current?.replaceChildren(plot);
    return () => plot.remove();
  }, [byYear, feature]);

  if (!feature) return <p>No such Iowa county.</p>;

  const crops = topCrops(data.losses, fips, filters);
  const worst = worstYears(data.losses, data.premiums, fips, filters);
  return (
    <>
      <h2>{feature.properties.county_name} County</h2>
      <p>
        <a href={`/${search}`}>← Back to the map</a>
      </p>
      <p>
        Years {filters.from}–{filters.to}
        {filters.cause && `, cause: ${filters.cause}`}
        {filters.crop && `, crop: ${filters.crop}`}
      </p>
      {byYear.length === 0 ? <p>No payouts for these filters.</p> : <div ref={chart} className="chart" />}
      <h3>Top crops by payouts</h3>
      <ol aria-label="Top crops">
        {crops.map((row) => (
          <li key={row.crop}>
            {row.crop}: {dollars(row.indemnity)}
          </li>
        ))}
      </ol>
      <h3>Five worst years by payouts</h3>
      <ol aria-label="Worst years">
        {worst.map((row) => (
          <li key={row.year}>
            {row.year}: {dollars(row.indemnity)}, loss ratio {row.ratio === null ? "n/a" : row.ratio.toFixed(2)}
          </li>
        ))}
      </ol>
    </>
  );
}
