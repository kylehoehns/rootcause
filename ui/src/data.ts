import type { CountyLosses, CountyPremiums, IowaCounties } from "./contracts";

export type Data = { losses: CountyLosses; premiums: CountyPremiums; counties: IowaCounties };

export const load = async (): Promise<Data> => {
  const [losses, premiums, counties] = await Promise.all(
    ["county-losses.json", "county-premiums.json", "iowa-counties.geojson"].map((file) =>
      fetch(`/data/${file}`).then((response) => {
        if (!response.ok) throw new Error(`Could not load ${file}: ${response.status}`);
        return response.json();
      }),
    ),
  );
  return { losses, premiums, counties };
};
