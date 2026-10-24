import { useEffect, useState } from "react";
import type { CountyIndemnity } from "./contracts";
import { dollars } from "./dollars";

export function App() {
  const [counties, setCounties] = useState<CountyIndemnity>();
  useEffect(() => {
    fetch("/data/county-indemnity.json")
      .then((response) => response.json())
      .then(setCounties);
  }, []);
  const county = counties?.[0];
  return (
    <main>
      <h1>rootcause</h1>
      {county && (
        <p>
          Crop insurance paid for losses in {county.county_name} County, {county.year}:{" "}
          <strong>{dollars(county.indemnity)}</strong>
        </p>
      )}
    </main>
  );
}
