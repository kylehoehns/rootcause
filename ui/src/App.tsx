import { useEffect, useState } from "react";
import type { CountyLosses } from "./contracts";
import { dollars } from "./dollars";
import { countyName, countyTotal } from "./losses";

const POLK = "19153";
const YEAR = 2012;

export function App() {
  const [losses, setLosses] = useState<CountyLosses>();
  useEffect(() => {
    fetch("/data/county-losses.json")
      .then((response) => response.json())
      .then(setLosses);
  }, []);
  return (
    <main>
      <h1>rootcause</h1>
      {losses && (
        <p>
          Crop insurance paid for losses in {countyName(POLK)} County, {YEAR}:{" "}
          <strong>{dollars(countyTotal(losses, POLK, YEAR))}</strong>
        </p>
      )}
    </main>
  );
}
