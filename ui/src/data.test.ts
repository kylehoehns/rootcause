import { afterEach, expect, test, vi } from "vitest";
import { load } from "./data";

afterEach(() => vi.unstubAllGlobals());

test("load rejects when a data file is missing", async () => {
  vi.stubGlobal("fetch", async () => new Response("not found", { status: 404 }));
  await expect(load()).rejects.toThrow("county-losses.json");
});

test("load rejects when a data file is not JSON", async () => {
  vi.stubGlobal("fetch", async () => new Response("<html>", { status: 200 }));
  await expect(load()).rejects.toThrow();
});
