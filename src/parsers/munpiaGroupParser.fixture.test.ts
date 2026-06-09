import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type FixtureManifest = {
  fixtureId: string;
  expected: {
    settlementRows: string;
    parseIssues: string;
  };
  files: Array<{
    path: string;
  }>;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixtureRoot = path.resolve(__dirname, "../../fixtures/parser-contract/munpia");
const fixtureIds = [
  "munpia_group_duplicate_settlement_slot",
  "munpia_group_missing_settlement_slot",
  "munpia_group_multisheet_without_sheet_name_blocks",
  "munpia_group_unknown_slot_blocks",
  "munpia_group_valid_single_sheet",
] as const;

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

describe("munpia group parser fixture contract stub", () => {
  it("loads the current Munpia fixture manifests and referenced JSON artifacts", () => {
    const discoveredFixtureIds = readdirSync(fixtureRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    expect(discoveredFixtureIds).toEqual([...fixtureIds].sort());

    for (const fixtureId of fixtureIds) {
      const fixtureDir = path.join(fixtureRoot, fixtureId);
      const manifestPath = path.join(fixtureDir, "manifest.json");

      expect(existsSync(manifestPath)).toBe(true);

      const manifest = readJson<FixtureManifest>(manifestPath);
      expect(manifest.fixtureId).toBe(fixtureId);

      const settlementRowsPath = path.join(fixtureDir, manifest.expected.settlementRows);
      const parseIssuesPath = path.join(fixtureDir, manifest.expected.parseIssues);

      expect(existsSync(settlementRowsPath)).toBe(true);
      expect(existsSync(parseIssuesPath)).toBe(true);
      expect(() => readJson<unknown>(settlementRowsPath)).not.toThrow();
      expect(() => readJson<unknown>(parseIssuesPath)).not.toThrow();

      for (const file of manifest.files) {
        const inputPath = path.join(fixtureDir, file.path);
        expect(existsSync(inputPath)).toBe(true);
        expect(() => readJson<unknown>(inputPath)).not.toThrow();
      }
    }
  });

  it.todo("executes fixture manifests through a future Munpia group parser implementation");

  it.todo("asserts settlement row outputs against fixture expected/settlementRows.json");

  it.todo("asserts group-level parse issues against fixture expected/parseIssues.json");
});
