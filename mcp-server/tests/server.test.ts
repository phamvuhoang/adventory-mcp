import { describe, expect, it } from "vitest";
import { buildServer } from "../src/server.js";
import type { AdventoryClient } from "../src/client.js";

const client: AdventoryClient = { async get() { return {}; } };

describe("buildServer", () => {
  it("registers tools on the server", () => {
    const { tools } = buildServer(client);
    expect(tools.map((t) => t.name)).toContain("ads_overview");
    expect(tools.length).toBeGreaterThanOrEqual(14);
  });
});
