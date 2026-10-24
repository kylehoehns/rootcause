import type { ReactNode } from "react";
import { CountyPage } from "./CountyPage";
import { DroughtPage } from "./DroughtPage";
import { MapPage } from "./MapPage";

const Layout = ({ children }: { children: ReactNode }) => (
  <>
    <header>
      <a href="/" className="brand">
        rootcause
      </a>
      <nav>
        <a href="/">Map</a>
        <a href="/drought">Drought</a>
      </nav>
    </header>
    <main>{children}</main>
    <footer>
      Crop insurance data:{" "}
      <a href="https://www.rma.usda.gov/tools-reports/summary-of-business">USDA Risk Management Agency</a>. Drought:{" "}
      <a href="https://droughtmonitor.unl.edu/">U.S. Drought Monitor</a>, map courtesy of{" "}
      <a href="https://drought.unl.edu/">NDMC</a>.
    </footer>
  </>
);

function Page() {
  const path = window.location.pathname;
  const county = path.match(/^\/county\/(\d{5})\/?$/);
  if (county?.[1]) return <CountyPage fips={county[1]} />;
  if (path.startsWith("/drought")) return <DroughtPage />;
  return <MapPage />;
}

export const App = () => (
  <Layout>
    <Page />
  </Layout>
);
